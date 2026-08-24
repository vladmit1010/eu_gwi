/**
 * Smoke tests for Million Engine explore + country drill + splash click-through.
 * Run: node tests/smoke.mjs
 * Requires: server on http://127.0.0.1:8766 and playwright-core + Chrome.
 */

import { chromium } from "playwright-core";
import { createRequire } from "module";

const BASE = process.env.ME_URL || "http://127.0.0.1:8766/index.html";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const require = createRequire(import.meta.url);
let chromiumLaunch = chromium;
try {
  // Prefer local node_modules if present
  chromiumLaunch = require("playwright-core").chromium;
} catch {
  /* use import */
}

const results = [];
function ok(name, pass, detail = "") {
  results.push({ name, pass, detail });
  const mark = pass ? "PASS" : "FAIL";
  console.log(`${mark}  ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  const browser = await chromiumLaunch.launch({
    headless: true,
    executablePath: CHROME,
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const pageErrors = [];
  const failed = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));
  page.on("requestfailed", (r) => {
    const u = r.url();
    if (u.includes("favicon")) return;
    failed.push(`${u} ${r.failure()?.errorText || ""}`);
  });

  await page.goto(BASE, { waitUntil: "networkidle", timeout: 45000 });
  ok("boot loads", await page.title().then((t) => /Million Engine/i.test(t)));

  // Splash → explore
  await page.click("#splashSkip");
  await page.waitForTimeout(1200);
  const afterSplash = await page.evaluate(() => ({
    splashOn: document.documentElement.classList.contains("splash-on"),
    whoPe: getComputedStyle(document.querySelector(".explore-group-who")).pointerEvents,
    hit: (() => {
      const chip = document.querySelector('.aud-chip[data-theme="genz"]');
      const r = chip.getBoundingClientRect();
      return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.className;
    })(),
  }));
  ok("splash dismissed", !afterSplash.splashOn);
  ok("Who not blocked by splash", afterSplash.whoPe === "auto" && String(afterSplash.hit).includes("aud-chip"), afterSplash.hit);

  await page.click('.aud-chip[data-theme="genz"]');
  await page.waitForTimeout(200);
  const whoOn = await page.evaluate(() =>
    document.querySelector('.aud-chip[data-theme="genz"]')?.classList.contains("on")
  );
  ok("Who Gen Z clickable", whoOn === true);

  await page.click('.passion-chip[data-passion="running"]');
  await page.waitForTimeout(200);
  const passion = await page.evaluate(() => ({
    on: document.querySelector('.passion-chip[data-passion="running"]')?.classList.contains("on"),
    note: document.getElementById("passionsNote")?.textContent || "",
  }));
  ok("Running sponsorship clickable", passion.on === true);
  ok(
    "Sponsorship note is not placeholder",
    passion.note.length > 0 && !/placeholder/i.test(passion.note),
    passion.note.slice(0, 60)
  );

  await page.click('.passion-chip[data-passion="f1"]');
  await page.waitForTimeout(300);
  const lands = await page.locator("path.land.live").count();
  ok("Map has live markets", lands >= 6, `lands=${lands}`);

  // Country → landing
  await page.locator('path.land.live[data-code="RO"]').click({ force: true });
  await page.waitForTimeout(600);
  const landing = await page.evaluate(() => ({
    open: document.getElementById("bubbleOverlay")?.classList.contains("open"),
    title: document.getElementById("bubbleTitle")?.textContent,
    snapshot: /Cultural snapshot|What matters|How they show up/i.test(
      document.getElementById("bubbleSide")?.innerText || ""
    ),
    placeholder: /Placeholder —/i.test(document.getElementById("bubbleSide")?.innerText || ""),
    audiences: document.querySelectorAll(".bubble-audience").length,
    sideLen: (document.getElementById("bubbleSide")?.innerText || "").length,
  }));
  ok("Country opens overlay", landing.open === true, landing.title);
  ok("Cultural snapshot visible", landing.snapshot === true, `sideLen=${landing.sideLen}`);
  ok("No Placeholder — in prose", landing.placeholder === false);
  ok("Affluent + Gen Z circles", landing.audiences === 2, `n=${landing.audiences}`);

  // Mini-menu
  await page.locator(".bubble-audience").filter({ hasText: "Gen Z" }).click();
  await page.waitForTimeout(400);
  const menu = await page.evaluate(() => ({
    items: [...document.querySelectorAll(".bubble-mini-menu-item")].map((b) => b.textContent.trim()),
    head: document.querySelector(".bubble-mini-menu-head")?.textContent,
  }));
  ok("Mini-menu opens", menu.items.length >= 5, menu.items.join(" | "));
  ok(
    "Theme labels present",
    ["Interests", "Sports followed", "Music", "Social Network usage", "Media Touchpoints"].every((l) =>
      menu.items.includes(l)
    )
  );

  await page.locator(".bubble-mini-menu-item", { hasText: "Interests" }).click();
  await page.waitForTimeout(500);
  const answers = await page.evaluate(() => ({
    level: document.getElementById("bubbleOverlay")?.classList.contains("level-answers"),
    nodes: document.querySelectorAll("#bubbleStage .bubble-node").length,
  }));
  ok("Theme drills to answer bubbles", answers.nodes >= 3, `nodes=${answers.nodes}`);

  await page.click("#bubbleClose");
  await page.waitForTimeout(300);

  // Tutorial exit unlocks
  await page.click("#tutorialBtn");
  await page.waitForTimeout(400);
  const tutOn = await page.evaluate(() => document.documentElement.classList.contains("tutorial-on"));
  ok("Tutorial starts", tutOn === true);
  await page.click("#tutorialSkip");
  await page.waitForTimeout(400);
  const afterTut = await page.evaluate(() => ({
    on: document.documentElement.classList.contains("tutorial-on"),
    whoPe: getComputedStyle(document.querySelector(".explore-group-who")).pointerEvents,
    passPe: getComputedStyle(document.querySelector(".explore-group-passions")).pointerEvents,
  }));
  ok("Tutorial exit clears tutorial-on", afterTut.on === false);
  ok("Who/passions clickable after tutorial", afterTut.whoPe === "auto" && afterTut.passPe === "auto");

  ok("No page JS errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  ok(
    "No critical request failures",
    failed.filter((f) => /gwi|markets|geojson|app\.js|tutorial/i.test(f)).length === 0,
    failed.slice(0, 3).join(" | ")
  );

  await browser.close();

  const failedCount = results.filter((r) => !r.pass).length;
  console.log("\n———");
  console.log(`${results.length - failedCount}/${results.length} passed`);
  process.exit(failedCount ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

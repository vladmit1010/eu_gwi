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

  await page.click("#splashSkip");
  await page.waitForTimeout(1200);
  const afterSplash = await page.evaluate(() => ({
    splashOn: document.documentElement.classList.contains("splash-on"),
    compare: document.documentElement.classList.contains("map-view-compare"),
    explore: !!document.getElementById("exploreBar"),
    who: document.querySelectorAll("#audiences .aud-chip").length,
    passions: document.querySelectorAll("#passions .passion-chip").length,
    pies: document.querySelectorAll(".dist-pie").length,
  }));
  ok("splash dismissed", !afterSplash.splashOn);
  ok("Compare mode default", afterSplash.compare === true);
  ok("Explore Who + Sponsorships", afterSplash.explore && afterSplash.who >= 2 && afterSplash.passions >= 3, `who=${afterSplash.who} passions=${afterSplash.passions}`);
  ok("No mix pies in Compare", afterSplash.pies === 0, `pies=${afterSplash.pies}`);

  await page.click('[data-view="mix"]');
  await page.waitForTimeout(400);
  const mix = await page.evaluate(() => ({
    on: document.documentElement.classList.contains("map-view-mix"),
    pies: document.querySelectorAll(".dist-pie").length,
  }));
  ok("Mix mode selectable", mix.on === true);
  ok("Distribution pies on map", mix.pies >= 6, `pies=${mix.pies}`);

  await page.click('[data-lens="social"]');
  await page.waitForTimeout(300);
  const social = await page.evaluate(() => ({
    on: document.querySelector('[data-lens="social"]')?.classList.contains("on"),
    chips: document.getElementById("modeLegend")?.querySelectorAll(".mode-chip").length || 0,
  }));
  ok("Social lens selectable", social.on === true);
  ok("Social legend chips", social.chips >= 4, `chips=${social.chips}`);

  await page.click('[data-aud="genz"]');
  await page.waitForTimeout(300);
  ok(
    "Gen Z audience selectable",
    await page.evaluate(() =>
      document.querySelector('[data-aud="genz"]')?.classList.contains("on")
    )
  );

  await page.click('[data-view="compare"]');
  await page.waitForTimeout(200);
  await page.click('[data-passion="f1"]');
  await page.waitForTimeout(200);

  const lands = await page.locator("path.land.live").count();
  ok("Map has live markets", lands >= 6, `lands=${lands}`);

  await page.locator('path.land.live[data-code="RO"]').click({ force: true });
  await page.waitForTimeout(600);
  const landing = await page.evaluate(() => ({
    open: document.getElementById("bubbleOverlay")?.classList.contains("open"),
    title: document.getElementById("bubbleTitle")?.textContent,
    audiences: document.querySelectorAll(".bubble-audience").length,
    total: document.querySelector(".bubble-total-num")?.textContent || "",
    piesHidden: document.querySelectorAll(".dist-pie").length === 0,
  }));
  ok("Country opens overlay", landing.open === true, landing.title);
  ok("Affluent + Gen Z circles", landing.audiences === 2, `n=${landing.audiences}`);
  ok("Total people shown", /^\d/.test(landing.total.replace(",", "")), landing.total);
  ok("Pies hide while in country", landing.piesHidden === true);

  await page.locator(".bubble-audience").filter({ hasText: "Gen Z" }).click();
  await page.waitForTimeout(450);
  const menu = await page.evaluate(() => ({
    sponsors: document.querySelectorAll(".bubble-sponsor").length,
    fields: document.querySelectorAll(".bubble-field").length,
  }));
  ok("Sponsorship circles open", menu.sponsors === 3, `n=${menu.sponsors}`);
  ok("Field circles open", menu.fields >= 5, `n=${menu.fields}`);

  await page.locator(".bubble-field", { hasText: "Interests" }).click();
  await page.waitForTimeout(500);
  const answers = await page.evaluate(
    () => document.querySelectorAll("#bubbleStage .bubble-node").length
  );
  ok("Theme drills to answer bubbles", answers >= 3, `nodes=${answers}`);

  await page.click("#bubbleClose");
  await page.waitForTimeout(400);
  await page.click('[data-view="mix"]');
  await page.waitForTimeout(400);
  const afterClose = await page.evaluate(
    () => document.querySelectorAll(".dist-pie").length
  );
  ok("Pies return in Mix after close", afterClose >= 6, `pies=${afterClose}`);

  await page.click("#tutorialBtn");
  await page.waitForTimeout(400);
  ok(
    "Tutorial starts",
    await page.evaluate(() => document.documentElement.classList.contains("tutorial-on"))
  );
  await page.click("#tutorialSkip");
  await page.waitForTimeout(400);
  ok(
    "Tutorial exit clears tutorial-on",
    await page.evaluate(() => !document.documentElement.classList.contains("tutorial-on"))
  );

  ok("No page JS errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  ok(
    "No critical request failures",
    failed.filter((f) => /gwi|markets|geojson|app\.js|distributions|tutorial/i.test(f)).length ===
      0,
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

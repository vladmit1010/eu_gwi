/**
 * Smoke tests for 3-level presentation deck (client table schema).
 * Run: npm start (port 8766) then npm test
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
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
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

  await page.click("#splashStart");
  await page.waitForTimeout(800);
  const afterSplash = await page.evaluate(() => ({
    splashOn: document.documentElement.classList.contains("splash-on"),
    levelMap: document.documentElement.classList.contains("level-map"),
    lands: document.querySelectorAll("#mapwrap path.land.live").length,
    explore: !!document.getElementById("exploreBar"),
  }));
  ok("splash dismissed", !afterSplash.splashOn);
  ok("L1 map level", afterSplash.levelMap === true);
  ok("Erste markets on map", afterSplash.lands >= 8, `lands=${afterSplash.lands}`);
  ok("No explore chrome", !afterSplash.explore);

  await page.locator("#mapwrap").locator('path.land.live[data-code="RO"]').click({ force: true });
  await page.waitForTimeout(400);
  const l2 = await page.evaluate(() => ({
    country: document.documentElement.classList.contains("level-country"),
    title: document.getElementById("countryTitle")?.textContent,
    cards: document.querySelectorAll(".topic-card").length,
    chips: document.querySelectorAll("#baseStrip .metric-chip").length,
  }));
  ok("L2 country opens", l2.country === true, l2.title);
  ok("Base metric chips", l2.chips >= 5, `n=${l2.chips}`);
  ok("Hobby cards", l2.cards >= 6, `n=${l2.cards}`);

  await page.locator(".topic-card").first().click();
  await page.waitForTimeout(300);
  const l3 = await page.evaluate(() => ({
    offer: document.documentElement.classList.contains("level-offer"),
    title: document.getElementById("offerTitle")?.textContent || "",
    bars: document.querySelectorAll("#offerChartBars .offer-chart-col").length,
    yearCells: document.querySelectorAll("#yearPctRow td").length,
  }));
  ok("L3 offer opens", l3.offer === true, l3.title);
  ok("10-year chart", l3.bars >= 10, `bars=${l3.bars}`);
  ok("Year growth row", l3.yearCells >= 10, `cells=${l3.yearCells}`);

  await page.click("#offerBack");
  await page.waitForTimeout(200);
  ok(
    "Back to L2",
    await page.evaluate(() => document.documentElement.classList.contains("level-country"))
  );

  await page.click("#countryBack");
  await page.waitForTimeout(200);
  ok(
    "Back to L1",
    await page.evaluate(() => document.documentElement.classList.contains("level-map"))
  );

  ok("No page JS errors", pageErrors.length === 0, pageErrors.slice(0, 3).join(" | "));
  ok(
    "No critical request failures",
    failed.filter((f) => /presentation|geojson|app\.js/i.test(f)).length === 0,
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

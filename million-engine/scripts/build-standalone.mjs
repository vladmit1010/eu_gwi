#!/usr/bin/env node
/**
 * Bundle modular deck → single-file Million-Engine.html (email / file://).
 *
 *   npm run build-standalone
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as esbuild from "esbuild";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outPath = path.join(ROOT, "Million-Engine.html");

function read(rel) {
  return fs.readFileSync(path.join(ROOT, rel), "utf8");
}

/** Embed JS as data-URL so HTML/IDE never parse source (SheetJS XML, etc.). */
function scriptDataUrl(src) {
  const b64 = Buffer.from(src, "utf8").toString("base64");
  return `<script src="data:text/javascript;base64,${b64}"></script>`;
}

async function main() {
  const css = read("css/deck-app.css");
  const shell = read("index.html");

  // Bundle deck ESM → one IIFE that calls initDeck
  const bundle = await esbuild.build({
    absWorkingDir: ROOT,
    entryPoints: [path.join(ROOT, "js/deck/main.js")],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["es2018"],
    write: false,
    // offerings.json is fetched at runtime in modular mode; for standalone embed it
    loader: { ".json": "json" },
    define: {},
    plugins: [
      {
        name: "embed-offerings-fetch",
        setup(build) {
          // Rewrite loadOfferings to use inlined JSON when bundling
        },
      },
    ],
  });

  let appJs = bundle.outputFiles[0].text;

  // Inline offerings: patch fetch path by injecting global before app
  const offerings = read("data/client/offerings.json");
  const offeringsInject = `window.__DECK_OFFERINGS__ = ${offerings};\n`;

  // Make offerings.js use window fallback — already fetch; inject override in IIFE preamble
  const preamble = `${offeringsInject}
// Prefer inlined offerings when present (standalone build)
if (typeof window !== "undefined" && window.__DECK_OFFERINGS__) {
  const _fetch = window.fetch.bind(window);
  window.fetch = function(input, init) {
    const url = String(input);
    if (url.indexOf("offerings.json") >= 0) {
      return Promise.resolve(new Response(JSON.stringify(window.__DECK_OFFERINGS__), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }));
    }
    return _fetch(input, init);
  };
}
`;

  const xlsxTag = scriptDataUrl(read("js/vendor/xlsx.full.min.js"));
  const dropTag = scriptDataUrl(read("js/excel-drop-standalone.js"));
  const appTag = scriptDataUrl(preamble + appJs);

  // Strip modular script tags from shell; inject inlined assets
  let body = shell
    .replace(/<link rel="stylesheet"[^>]*>/, `<style>\n${css}\n</style>`)
    .replace(/<!-- SheetJS inlined -->\s*/g, "")
    .replace(/<script src="js\/vendor\/xlsx\.full\.min\.js"><\/script>\s*/g, "")
    .replace(/<script src="js\/excel-drop-standalone\.js"><\/script>\s*/g, "")
    .replace(
      /<script type="module" src="js\/deck\/main\.js"><\/script>/,
      `${xlsxTag}\n${dropTag}\n${appTag}`
    );

  fs.writeFileSync(outPath, body, "utf8");
  const mb = (fs.statSync(outPath).size / (1024 * 1024)).toFixed(2);
  console.log(`Wrote Million-Engine.html (${mb} MB)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

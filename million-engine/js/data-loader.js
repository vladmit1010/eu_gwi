import { normalizeData } from "./model.js";

export async function loadInitialData(fallback) {
  const candidates = ["./data/markets.json", "./data/gwi.json"];
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) continue;
      const raw = await res.json();
      /* gwi.json is nested audiences — skip, markets.json is the app feed */
      if (raw.markets && raw.themes) return normalizeData(raw);
    } catch {
      /* try next */
    }
  }
  return normalizeData(fallback);
}

export function parseFileText(text) {
  return normalizeData(JSON.parse(text));
}

export function wireImport({ onLoad, dropEl, fileInput, button }) {
  button.onclick = () => fileInput.click();

  fileInput.addEventListener("change", (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        onLoad(parseFileText(r.result));
      } catch (err) {
        alert(`Could not read file:\n${err.message}`);
      }
    };
    r.readAsText(f);
    fileInput.value = "";
  });

  ["dragenter", "dragover"].forEach((ev) =>
    document.addEventListener(ev, (e) => {
      e.preventDefault();
      dropEl.classList.add("on");
    })
  );

  document.addEventListener("dragleave", (e) => {
    if (e.clientX === 0 && e.clientY === 0) dropEl.classList.remove("on");
  });

  document.addEventListener("drop", (e) => {
    e.preventDefault();
    dropEl.classList.remove("on");
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        onLoad(parseFileText(r.result));
      } catch (err) {
        alert(`Could not read file:\n${err.message}`);
      }
    };
    r.readAsText(f);
  });
}

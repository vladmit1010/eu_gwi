/** Deck entry — npm start → http://127.0.0.1:8766/ */
import { initDeck } from "./app.js";

initDeck().catch((err) => {
  console.error(err);
  const t = document.getElementById("importToast");
  if (t) {
    t.textContent = "Boot failed: " + (err.message || err);
    t.classList.add("on");
  }
});

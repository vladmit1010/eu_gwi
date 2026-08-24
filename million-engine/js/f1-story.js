/** Formula 1 story beats — the only narrative beat in the tutorial. */

export const F1_STORY_BEATS = [
  {
    id: "thesis",
    code: null,
    autoMs: 7500,
    kicker: "Formula 1 · Erste markets",
    title: "Nicht ob — sondern wo",
    body: "12,3 Mio. Menschen in den sechs Märkten folgen Motorsport. Ihr braucht 1 Mio. Kund:innen — jede zwölfte Person schaut also ohnehin schon zu.",
    caption: "12,3 Mio. folgen Motorsport — 1 Mio. Ziel. Jede zwölfte Person schaut schon zu.",
  },
  {
    id: "AT",
    code: "AT",
    autoMs: 7000,
    kicker: "Austria · Zuhause",
    title: "Hier gewinnt man nur über Zugehörigkeit",
    body: "Höchster Index (117). Red Bull Ring bis 2041. Alles im Free-TV. F1 ist hier kein Event — es ist Alltag und Identität.",
    caption: "AT — Zuhause. Index 117 · Red Bull Ring · Free-TV.",
  },
  {
    id: "HU",
    code: "HU",
    autoMs: 7500,
    kicker: "Hungary · Mythos",
    title: "Ein Ereignis, das Gen Z nie erlebt hat — und trotzdem liebt",
    body: "1986 fuhr F1 hinter den Eisernen Vorhang. 200.000 Zuschauer. 2026: das 40. Jubiläum. Höchster Gen-Z-Index im ganzen Set (118).",
    caption: "HU — Mythos. 1986 · 40 Jahre · Gen-Z Index 118.",
  },
  {
    id: "RO",
    code: "RO",
    autoMs: 8000,
    kicker: "Romania · Masse + Uhr",
    title: "Die größte Audience — und eine tickende Uhr",
    body: "3,56 Mio. Follower, fast 30 % eurer Million. Aktuell gratis bei Antena — ab 2027 hinter der VOYO-Paywall. Und an genau diesem Wochenende: die erste Rumänin in der F1 Academy.",
    caption: "RO — Masse. 3,56 Mio. · Paywall 2027 · erste Rumänin in der F1 Academy.",
  },
  {
    id: "CZ",
    code: "CZ",
    autoMs: 7000,
    kicker: "Czechia · Widerstand",
    title: "Sieht schwach aus — ist Zugangsproblem",
    body: "Pay-TV-only seit 2024. Eishockey hat dort Index 280. Wenig F1 in den Zahlen heißt nicht wenig Interesse — heißt wenig Zugang.",
    caption: "CZ — Widerstand. Pay-TV seit 2024 · Eishockey Index 280.",
  },
  {
    id: "HR",
    code: "HR",
    autoMs: 7000,
    kicker: "Croatia · Kipppunkt",
    title: "Die Zahlen sind älter als der Moment",
    body: "2026 wechselten die Rechte von Sport Klub (Pay) zu RTL (frei). Eure GWI-Zahlen stammen von vor diesem Wechsel — der Markt ist gerade offen.",
    caption: "HR — Kipppunkt. 2026: Pay → RTL Free-TV. GWI ist älter als dieser Wechsel.",
  },
  {
    id: "RS",
    code: "RS",
    autoMs: 7000,
    kicker: "Serbia · Romantik",
    title: "Die schwächsten Zahlen — die stärkste Erinnerung",
    body: "Belgrad-GP 1939 am Kalemegdan: 100.000 Zuschauer, ein Viertel der Stadt. Nuvolaris letzter Sieg. Wenig Reichweite heute — aber eine Geschichte, die man erzählen kann.",
    caption: "RS — Romantik. Belgrad 1939 · 100.000 · Nuvolaris letzter Sieg.",
  },
  {
    id: "close",
    code: null,
    autoMs: 5500,
    kicker: "Formula 1 · Chance",
    title: "Sechs Märkte. Sechs Bedeutungen.",
    body: "F1 ist überall anders groß — und genau darin liegt die Chance. Als Nächstes: ein Markt, in dem ihr lokal aktiviert.",
    caption: "F1 ist überall anders groß — und wir wissen wo. Als Nächstes: Markt wählen.",
  },
];


export function createF1Story() {
  let index = 0;

  function beat() {
    return F1_STORY_BEATS[index] || null;
  }

  function reset() {
    index = 0;
    return beat();
  }

  /** Advance inside the story. Returns false when story is finished (leave step). */
  function next() {
    if (index >= F1_STORY_BEATS.length - 1) return false;
    index += 1;
    return true;
  }

  function progressLabel() {
    return `${index + 1} / ${F1_STORY_BEATS.length}`;
  }

  return {
    reset,
    next,
    beat,
    progressLabel,
    get index() {
      return index;
    },
    get length() {
      return F1_STORY_BEATS.length;
    },
  };
}

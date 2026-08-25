/** Sponsor stories for the tutorial.
 *  EDIT TEXTS HERE — `SPONSOR_STORIES` for f1 / running / live_music.
 *  Each story: thesis → AT → HU → RO → CZ → HR → RS → close
 */

export const SPONSOR_STORIES = {
  f1: {
    id: "f1",
    label: "Formula 1",
    short: "F1",
    beats: [
      {
        id: "thesis",
        code: null,
        autoMs: 7500,
        kicker: "Formula 1 · Erste markets",
        title: "Nicht ob — sondern wo",
        body: "12,3 Mio. Menschen in den sechs Märkten folgen Motorsport. Ihr braucht 1 Mio. Kund:innen — jede zwölfte Person schaut also ohnehin schon zu.",
      },
      {
        id: "AT",
        code: "AT",
        autoMs: 7000,
        kicker: "Austria · Zuhause",
        title: "Hier gewinnt man nur über Zugehörigkeit",
        body: "Höchster Index (117). Red Bull Ring bis 2041. Alles im Free-TV. F1 ist hier kein Event — es ist Alltag und Identität.",
      },
      {
        id: "HU",
        code: "HU",
        autoMs: 7500,
        kicker: "Hungary · Mythos",
        title: "Ein Ereignis, das Gen Z nie erlebt hat — und trotzdem liebt",
        body: "1986 fuhr F1 hinter den Eisernen Vorhang. 200.000 Zuschauer. 2026: das 40. Jubiläum. Höchster Gen-Z-Index im ganzen Set (118).",
      },
      {
        id: "RO",
        code: "RO",
        autoMs: 8000,
        kicker: "Romania · Masse + Uhr",
        title: "Die größte Audience — und eine tickende Uhr",
        body: "3,56 Mio. Follower, fast 30 % eurer Million. Aktuell gratis bei Antena — ab 2027 hinter der VOYO-Paywall. Und an genau diesem Wochenende: die erste Rumänin in der F1 Academy.",
      },
      {
        id: "CZ",
        code: "CZ",
        autoMs: 7000,
        kicker: "Czechia · Widerstand",
        title: "Sieht schwach aus — ist Zugangsproblem",
        body: "Pay-TV-only seit 2024. Eishockey hat dort Index 280. Wenig F1 in den Zahlen heißt nicht wenig Interesse — heißt wenig Zugang.",
      },
      {
        id: "HR",
        code: "HR",
        autoMs: 7000,
        kicker: "Croatia · Kipppunkt",
        title: "Die Zahlen sind älter als der Moment",
        body: "2026 wechselten die Rechte von Sport Klub (Pay) zu RTL (frei). Eure GWI-Zahlen stammen von vor diesem Wechsel — der Markt ist gerade offen.",
      },
      {
        id: "RS",
        code: "RS",
        autoMs: 7000,
        kicker: "Serbia · Romantik",
        title: "Die schwächsten Zahlen — die stärkste Erinnerung",
        body: "Belgrad-GP 1939 am Kalemegdan: 100.000 Zuschauer, ein Viertel der Stadt. Nuvolaris letzter Sieg. Wenig Reichweite heute — aber eine Geschichte, die man erzählen kann.",
      },
      {
        id: "close",
        code: null,
        autoMs: 5500,
        kicker: "Formula 1 · Chance",
        title: "Sechs Märkte. Sechs Bedeutungen.",
        body: "F1 ist überall anders groß — und genau darin liegt die Chance. Als Nächstes: ein Markt, in dem ihr lokal aktiviert.",
      },
    ],
  },

  running: {
    id: "running",
    label: "Running & fitness",
    short: "Running",
    beats: [
      {
        id: "thesis",
        code: null,
        autoMs: 7500,
        kicker: "Running · Erste markets",
        title: "Disziplin, die man sehen kann",
        body: "11,6 Mio. Menschen in den sechs Märkten interessieren sich für Fitness & Exercise. Running ist kein Spektakel — es ist Alltag, Status und Selbstkontrolle. Genau dort lässt sich Mastercard × Erste glaubwürdig andocken.",
      },
      {
        id: "AT",
        code: "AT",
        autoMs: 7000,
        kicker: "Austria · Vorsprung",
        title: "Hier ist Running schon Identität",
        body: "Stärkster Affluent-Index (137) und größte Affluent-Reichweite (~1,15 Mio.). Laufkultur, Clubs, Stadtmarathons — wer hier aktiviert, spricht mit Menschen, die Disziplin bereits leben.",
      },
      {
        id: "HU",
        code: "HU",
        autoMs: 7000,
        kicker: "Hungary · Craft",
        title: "Weniger Show — mehr Handwerk",
        body: "Affluent-Index eher zurückhaltend (81) — Running wirkt hier als Craft und Routine, nicht als Event-Hype. Aktivierung über Training, Fortschritt und Peer-Kreise statt Tribünen.",
      },
      {
        id: "RO",
        code: "RO",
        autoMs: 7500,
        kicker: "Romania · Masse in Bewegung",
        title: "Große Reichweite — sichtbarer Aufstieg",
        body: "Fast 0,93 Mio. Affluent allein bei Fitness & Exercise. Running und Health treffen Ambition: Fortschritt, den man postet — und eine Bank-/Card-Story, die Aufstieg begleitet.",
      },
      {
        id: "CZ",
        code: "CZ",
        autoMs: 7000,
        kicker: "Czechia · Unterschätzte Tür",
        title: "Sicherer Einstieg neben dem Eishockey-Mythos",
        body: "Wo Motorsport an Zugang hängt, bleibt Running sozial sicher: understated Prestige, peer-komfortabel, ohne Paywall-Drama. Eine Tür, die Affluent und Gen Z gemeinsam öffnen.",
      },
      {
        id: "HR",
        code: "HR",
        autoMs: 7000,
        kicker: "Croatia · Social energy",
        title: "Fashion-forward, outdoor, teilbar",
        body: "Affluent-Index 112 — Running trifft hier auf Social Proof: Körper, Look, Crew. Passt zu einer Generation, die Status öffentlich zeigt — und zu Aktivierungen mit sichtbarer Energie.",
      },
      {
        id: "RS",
        code: "RS",
        autoMs: 7000,
        kicker: "Serbia · Crew & Abenteuer",
        title: "Community schlägt Rohzahl",
        body: "Index 107 bei Affluent — Running trägt Hospitality und Abenteuer. Crews, Challenges, Stadtläufe: Narrative, die man weitererzählt — auch wenn die Media-Zahlen weicher wirken.",
      },
      {
        id: "close",
        code: null,
        autoMs: 5500,
        kicker: "Running · Chance",
        title: "Sechs Märkte. Eine gemeinsame Sprache: Fortschritt.",
        body: "Running skaliert über Ritual, nicht über Rechtefenster. Als Nächstes: ein Markt, in dem ihr lokal mit Fitness & Everyday Status aktiviert.",
      },
    ],
  },

  live_music: {
    id: "live_music",
    label: "Live music",
    short: "Live music",
    beats: [
      {
        id: "thesis",
        code: null,
        autoMs: 7500,
        kicker: "Live music · Erste markets",
        title: "Nächte, die man beweist",
        body: "12,9 Mio. Menschen in den sechs Märkten interessieren sich für Live Events & Festivals. Live music ist Peer-Energie, Social Proof und der Moment, in dem Zugehörigkeit öffentlich wird — ideal für sichtbare Aktivierung.",
      },
      {
        id: "AT",
        code: "AT",
        autoMs: 7000,
        kicker: "Austria · Bühne neben dem Ring",
        title: "Dieselbe Peer-Welt — eine andere Nacht",
        body: "Neben F1-Alltag ist Live music der Social-Proof-Layer: Festivalnächte, Clubs, geteilte Momente. Affluent Reach stark (~0,86 Mio.) — Aktivierung über Erlebnis, nicht nur über Sportmythos.",
      },
      {
        id: "HU",
        code: "HU",
        autoMs: 7000,
        kicker: "Hungary · Kultur-Meilenstein",
        title: "Wenn die Nacht sich wie Geschichte anfühlt",
        body: "Live music wirkt hier, wenn sie kultureller Meilenstein ist — nicht Pop-up. Gen Z schreibt den Mythos in der Gegenwart neu: Bühne, Pride, sharebarer Beweis.",
      },
      {
        id: "RO",
        code: "RO",
        autoMs: 7500,
        kicker: "Romania · Größte Live-Audience",
        title: "Öffentliche Energie in der Masse",
        body: "Über 1,09 Mio. Affluent bei Live Events — größte Live-Reichweite im Set. Sichtbarer Erfolg, große Nächte, öffentliche Beweise: dieselbe Aufstiegsenergie wie bei Sport — nur auf der Festivalbühne.",
      },
      {
        id: "CZ",
        code: "CZ",
        autoMs: 7000,
        kicker: "Czechia · Sichere Tür",
        title: "Peer-komfortabel, ohne Gatekeeping",
        body: "Wo Motorsport an Zugang scheitert, bleibt Live music ein offener Raum: unterstated, social, ohne Paywall-Frust. Ein On-Ramp für Affluent und Gen Z in denselben Abend.",
      },
      {
        id: "HR",
        code: "HR",
        autoMs: 7000,
        kicker: "Croatia · Höchster Index",
        title: "Fashion-forward und sofort teilbar",
        body: "Stärkster Affluent-Index (121). Festivals und Live-Nächte matchen Social-, Fashion- und Challenge-Energie — Gen Z tippt hier über Nacht. Aktivierung, solange die Bühne offen ist.",
      },
      {
        id: "RS",
        code: "RS",
        autoMs: 7000,
        kicker: "Serbia · Gastfreundschaft & Nacht",
        title: "Mythos trifft Hospitality",
        body: "Affluent-Index 121 — Live music trägt Abenteuer und Gastfreundschaft. Schwächere Media-Zahlen ersetzen sich durch Nächte, die man erzählt: lokal, romantisch, weitererzählbar.",
      },
      {
        id: "close",
        code: null,
        autoMs: 5500,
        kicker: "Live music · Chance",
        title: "Sechs Märkte. Sechs Festival-Bedeutungen.",
        body: "Live music ist überall anders groß — aber immer öffentlich. Als Nächstes: ein Markt, in dem ihr die Nacht lokal aktiviert.",
      },
    ],
  },
};

export function createSponsorStory() {
  let sponsorId = "f1";
  let index = 0;

  function story() {
    return SPONSOR_STORIES[sponsorId] || SPONSOR_STORIES.f1;
  }

  function beats() {
    return story().beats || [];
  }

  function beat() {
    return beats()[index] || null;
  }

  function reset(id = sponsorId) {
    sponsorId = SPONSOR_STORIES[id] ? id : "f1";
    index = 0;
    return beat();
  }

  /** Advance inside the story. Returns false when story is finished. */
  function next() {
    if (index >= beats().length - 1) return false;
    index += 1;
    return true;
  }

  function progressLabel() {
    return `${index + 1} / ${beats().length}`;
  }

  return {
    reset,
    next,
    beat,
    progressLabel,
    get sponsorId() {
      return sponsorId;
    },
    get label() {
      return story().label;
    },
    get short() {
      return story().short;
    },
    get index() {
      return index;
    },
    get length() {
      return beats().length;
    },
  };
}

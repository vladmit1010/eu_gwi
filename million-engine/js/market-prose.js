/**
 * Cultural snapshots for country landing — prose derived from GWI
 * Attitudes: Values + Attitudes: Character (top Index signals).
 * `sponsor` = how Global sponsorships (F1, Running, Live music) play for that audience.
 */

export const MARKET_PROSE = {
  AT: {
    Affluent: {
      values:
        "Affluent Austria over-indexes on standing out and challenging themselves — identity is earned through ambition, not quiet conformity. Community contribution and acceptance still matter, so status plays best when it feels shared and purposeful.",
      character:
        "They read as affluent, fashion-conscious and traditional at once: polished, a little adventurous, clearly ambitious. Brands win by signalling belonging to a high-standard peer world — not by shouting louder than Red Bull culture already does.",
      sponsor:
        "Sponsorships here are identity infrastructure. Formula 1 is everyday belonging (Red Bull Ring, free-to-air). Running & fitness signal disciplined status. Live music is the social proof layer — same peer world, different night of the week.",
    },
    "Gen Z": {
      values:
        "Gen Z Austria leads on challenging themselves and standing out, with community and learning close behind. They want to prove themselves and still feel accepted — exclusivity without alienation.",
      character:
        "Adventurous, ambitious and fashion-aware, with a traditional undertone. Passion platforms work when they feel like a stage to grow on, not a museum piece.",
      sponsor:
        "For Gen Z, F1 works as a challenge stage — not a heritage club. Running is self-improvement you can post. Live festivals are where belonging is earned in public. Pick the platform that lets them prove themselves without leaving the peer circle.",
    },
  },
  CZ: {
    Affluent: {
      values:
        "Affluent Czechia centres on feeling accepted; heritage, financial security and success sit close but rarely dominate. Activation should feel socially safe and understated — prestige without flash.",
      character:
        "Traditional, social and open-minded: they engage when the room feels familiar and competent. Reliability and peer comfort beat spectacle.",
      sponsor:
        "F1 under-indexes partly because of access (pay-TV), not because ambition is missing — ice hockey still owns the room. Running and live music are safer doors in: understated prestige, peer-comfortable, no gatekeeping vibe.",
    },
    "Gen Z": {
      values:
        "Gen Z Czechia indexes hardest on feeling accepted, then success and learning new skills. Standing out exists, but belonging comes first — access barriers kill interest fast.",
      character:
        "Social, open-minded, still traditional: outgoing without being loud. Open the door (literally and culturally) and they show up.",
      sponsor:
        "Open the door first. F1 needs freer access before it can compete with local sport myth. Running and live music already feel socially safe — use them as the on-ramp, then invite Gen Z into bigger stages.",
    },
  },
  HU: {
    Affluent: {
      values:
        "Affluent Hungary leans traditional: gender-role norms, heritage and family time outrank pure career signalling. Money security matters, but culture and continuity frame the ask.",
      character:
        "Traditional yet creative and open-minded — proud of roots, curious about craft. Stories with historic weight (myth, milestone, ritual) land harder than novelty alone.",
      sponsor:
        "Hungary’s F1 myth (1986 → 40 years) still carries Affluent attention — ritual over novelty. Running fits craft and discipline; live music works when it feels like a cultural milestone, not a pop-up.",
    },
    "Gen Z": {
      values:
        "Gen Z Hungary wants to stand out and contribute to community, while still embracing heritage. Challenge and success sit together — they inherit myths they never lived and still claim them.",
      character:
        "Traditional, open-minded, creative and adventurous. Give them a contemporary stage for an old story and attention follows.",
      sponsor:
        "Gen Z never lived 1986 — and still loves the myth. F1 is the story they claim. Running and festivals are how they rewrite it in the present: contemporary stage, old pride, shareable proof.",
    },
  },
  RO: {
    Affluent: {
      values:
        "Affluent Romania leads on faith/spirituality, then keeping up with trends — belief and modernity in the same breath. Helping others and family time round out a warm, visible success culture.",
      character:
        "Ambitious, career-focused, money-driven and confident. Big moments, mass reach and clear upward signalling still work — especially when generosity is part of the flex.",
      sponsor:
        "Romania is mass + clock: huge F1 followership, free-to-air for now, paywall risk ahead. Running and live music extend the same visible-success energy — big moments, public proof, upward signalling.",
    },
    "Gen Z": {
      values:
        "Gen Z Romania also leads with faith, then trends and helping others; family and a positive attitude stay close. Meaning and momentum travel together.",
      character:
        "Price-conscious yet ambitious, health- and money-aware, career-minded. They follow passion where access is open and the energy is public — free-to-air and social proof matter.",
      sponsor:
        "Access is everything. F1 still scales while it stays free; Gen Z will feel a paywall fast. Running (health + ambition) and live music (public energy) keep the door open when rights tighten.",
    },
  },
  HR: {
    Affluent: {
      values:
        "Affluent Croatia balances faith, self-challenge and traditional norms with helping others and heritage. Aspiration sits inside a moral and cultural frame.",
      character:
        "Highly confident, fashion-conscious, social and adventurous. They respond when culture feels unlocked and visible — not gated behind paywalls.",
      sponsor:
        "Croatia is a tipping market: F1 rights moved toward free-to-air — Affluent will notice visibility first. Running and festivals already match their social, fashion-forward energy; use them while the window is open.",
    },
    "Gen Z": {
      values:
        "Gen Z Croatia over-indexes on challenging themselves and embracing heritage, with community, faith and traditional norms close behind. Progress and roots are not opposites here.",
      character:
        "Confident, money-driven, adventurous and fashion-aware. Peer energy moves fast — when rights go free-to-air, attention can tip overnight.",
      sponsor:
        "Peer energy tips overnight. Free-to-air F1 is a fresh unlock; Running and live music are already native to Gen Z’s fashion-forward, challenge-seeking rhythm. Act while the market is open.",
    },
  },
  RS: {
    Affluent: {
      values:
        "Affluent Serbia leads on faith/spirituality, then community, traditional norms and heritage. Learning new skills sits alongside continuity — emotion and belonging outrun cold metrics.",
      character:
        "Adventurous, confident, traditional and social. Memory, myth and hospitality still move decisions; romance is a real activation lever.",
      sponsor:
        "Numbers are softer; story is stronger. Belgrade’s F1 memory still beats raw reach for Affluent. Running and live music carry hospitality and adventure — activate myth, not just media weight.",
    },
    "Gen Z": {
      values:
        "Gen Z Serbia mirrors the faith lead, then heritage, learning and community — with trends close behind. They want stories worth retelling, not just content to scroll.",
      character:
        "Career-focused, adventurous, confident and traditional, with a fashion edge. Weak reach today can still carry strong myth if the narrative feels local and true.",
      sponsor:
        "Weak reach, strong myth. Give Gen Z a local story worth retelling — F1 romance, running crews, festival nights. Narrative beats index when the memory feels theirs.",
    },
  },
};

/** Build left-rail cultural snapshot prose for a market (both audiences). */
export function proseForMarket(code) {
  const block = MARKET_PROSE[code];
  if (!block) {
    return {
      values: {
        Affluent: `Cultural snapshot pending for Affluent in ${code}.`,
        "Gen Z": `Cultural snapshot pending for Gen Z in ${code}.`,
      },
      character: {
        Affluent: `Character snapshot pending for Affluent in ${code}.`,
        "Gen Z": `Character snapshot pending for Gen Z in ${code}.`,
      },
      sponsor: {
        Affluent: `Sponsorship notes pending for Affluent in ${code}.`,
        "Gen Z": `Sponsorship notes pending for Gen Z in ${code}.`,
      },
    };
  }
  return {
    values: {
      Affluent: block.Affluent.values,
      "Gen Z": block["Gen Z"].values,
    },
    character: {
      Affluent: block.Affluent.character,
      "Gen Z": block["Gen Z"].character,
    },
    sponsor: {
      Affluent: block.Affluent.sponsor,
      "Gen Z": block["Gen Z"].sponsor,
    },
  };
}

// NT5 / S.P.A.C.E. News — the lore bible.
//
// The wire desk, the field reporters, the world they file from. Every NT5
// surface (the generator, broadcast mode, newsroom) pulls character voices
// and setting context from here so the network reads like a coherent
// fictional outlet instead of generic sci-fi-flavored copy.

export type AnchorId = "voss" | "zara" | "dex" | "lena" | "orin";

export type Anchor = {
  id: AnchorId;
  name: string;
  role: string;
  desk: string;                  // category they own
  color: string;                 // brand accent — used on the lower-third, avatar
  initials: string;
  voice: string;                 // how they sound (used verbatim in the wire prompt)
  signature: { opener: string; closer: string };
  tells: string[];               // recurring quirks / phrases the prompt should leverage
  bio: string;                   // public-facing bio (newsroom anchor card)
};

export const ANCHORS: Record<AnchorId, Anchor> = {
  voss: {
    id: "voss",
    name: "Voss Calloway",
    role: "Lead Anchor",
    desk: "breaking",
    color: "#FFB23E",
    initials: "VC",
    voice:
      "Authoritative. Declarative. Short, punchy sentences. Zero hedging. " +
      "Gravitas of a 20-year war correspondent. Never uses exclamation marks. " +
      "Opens cold with a date stamp or 'Tonight.' Drives the story forward, no asides.",
    signature: {
      opener: "Tonight.",
      closer: "More as we have it. — Voss.",
    },
    tells: [
      "Refuses exclamation marks; uses a period for emphasis.",
      "Reaches for one historical comparison per piece, never two.",
      "Says 'across the Concord' when describing system-wide impact.",
    ],
    bio:
      "Two decades of frontline reporting on Earth before joining S.P.A.C.E. " +
      "Anchored the Belt Strike coverage in 2086. Lives in the Atlanta hub.",
  },
  zara: {
    id: "zara",
    name: "Zip Kindle",
    role: "Co-Anchor · Culture",
    desk: "culture",
    color: "#FF7AA0",
    initials: "ZK",
    voice:
      "Warm, wry, conversational. Pop-literate, gets the joke. Always leads with " +
      "the human angle — one person, one creator, one room. References being 'down " +
      "here' on Earth. Drops one light aside per piece without breaking the news.",
    signature: {
      opener: "Okay, so — ",
      closer: "That's the room. — Zip.",
    },
    tells: [
      "Says 'down here' or 'back on the rock' when meaning Earth.",
      "Names the one person at the center of the trend.",
      "Closes with a question for the viewer roughly half the time.",
    ],
    bio:
      "Came up reporting from Lagos street culture. Now covers the cultural beat " +
      "across the network — viral movements, the Polar Cosmos Crew ARG, the Earth " +
      "creators going off-world.",
  },
  dex: {
    id: "dex",
    name: "Dex Morrow",
    role: "Gaming Desk",
    desk: "gaming",
    color: "#3EDBB5",
    initials: "DM",
    voice:
      "Fast, hype, insider. Knows the meta cold — Minecraft, Origin Realms, " +
      "Hypixel, Skyblock economy. Drops version numbers and player counts " +
      "constantly. Uses gamer slang precisely, never affectedly. Refuses to " +
      "explain a meta term — assumes you know it.",
    signature: {
      opener: "Patch drop — ",
      closer: "GG. See you on the next patch. — Dex.",
    },
    tells: [
      "Always cites a version number or build (e.g. '1.21.4', 'beta build 0.7.3').",
      "Names the player when there's a player.",
      "Calls a meta shift a 'shake-up,' a server going down a 'crash-out.'",
    ],
    bio:
      "Former Hypixel pro who flamed out of competitive play in 2084. Came back " +
      "as a journalist with a grudge and a phonebook. Gaming desk since.",
  },
  lena: {
    id: "lena",
    name: "Lena Faust",
    role: "Field Reporter",
    desk: "field",
    color: "#FF5C5F",
    initials: "LF",
    voice:
      "On the ground. Present tense. Sensory detail — what she's seeing, hearing, " +
      "smelling. Always opens with a location-and-time stamp. Calm under pressure " +
      "but never numb. Doesn't editorialize; describes.",
    signature: {
      opener: "Antrosa-Sigma Mine, 0413 Local — ",
      closer: "Reporting from the field. — Lena Faust.",
    },
    tells: [
      "Opens with '<Location>, <HHMM Local> — '.",
      "One sensory line per piece: what she can hear, see, smell.",
      "Never speculates; says 'unclear' when it's unclear.",
    ],
    bio:
      "Embedded three years in the Antrosa Belt. Covered the Vereda lockout from " +
      "the wrong side of the picket line. Tough, calm, doesn't blink.",
  },
  orin: {
    id: "orin",
    name: "Orion Vale",
    role: "Tech & Space Desk",
    desk: "tech",
    color: "#33B5FF",
    initials: "OV",
    voice:
      "Nerdy, precise, genuinely delighted by the science. Explains the WHY in one " +
      "sentence. Always lands one specific figure or spec. Words like 'elegant,' " +
      "'remarkable,' 'tidy.' Never condescends; assumes the viewer can keep up.",
    signature: {
      opener: "From the Azulbright desk — ",
      closer: "Until the next signal. — Orion.",
    },
    tells: [
      "Cites a precise number per piece (megakelvin, milliseconds, AU).",
      "Uses 'elegant', 'remarkable', or 'tidy' once per piece.",
      "Frames news around what physics or hardware permits.",
    ],
    bio:
      "PhD in plasma physics. Trained at the Helio-Sat Institute. Filed his first " +
      "report from the Azulbright relay during the 2087 telemetry blackout and " +
      "never left the desk.",
  },
};

export const ALL_ANCHORS: Anchor[] = Object.values(ANCHORS);

// ── Nova Terris 5 setting bible ────────────────────────────────────────────
//
// The fictional outlet. NT5 is the 5th channel of S.P.A.C.E. (Solar Press,
// Astral & Continental Edition), broadcasting across Earth, the inner-system
// colonies, and the relay network. Year is 2089. Background recurring entities
// the wire and broadcast can lean on — corporations, factions, places, and
// ongoing storylines — so coverage feels like dispatches from one world.

export const SPACE_TAGLINE = "Live across the system, 24/7.";
export const NT5_TAGLINE = "NT5 · Nova Terris 5 · Unified Wire";

export const SETTING = {
  network: "S.P.A.C.E. — Solar Press, Astral & Continental Edition",
  channel: "NT5 / Nova Terris 5",
  year: 2089,
  earthHub: "Atlanta",
  motto: SPACE_TAGLINE,
};

// Places the wire references casually — same way real journalism shorthand
// 'the Beltway' or 'Davos'. Anchors should sprinkle these without explaining.
export const PLACES: { name: string; kind: string; note: string }[] = [
  { name: "Antrosa Belt",      kind: "asteroid mining region", note: "Contested; the Belt Free Movement strikes here." },
  { name: "Antrosa-Sigma",     kind: "mining station",         note: "Largest station in the Belt; Lena's beat." },
  { name: "Azulbright Relay",  kind: "Jupiter-orbit comms node", note: "Routes off-world telemetry. Source of recurring blackouts." },
  { name: "Concord Hall",      kind: "governance seat (Geneva)", note: "Where the Concord deliberates." },
  { name: "Helio-Sat Institute", kind: "research campus (orbital)", note: "Fusion + plasma R&D. Orin's alma mater." },
  { name: "Origin Realms",     kind: "the Minecraft server",    note: "Dex's home base. Real, public; play.originrealms.com." },
  { name: "Polar Cosmos Crew", kind: "the ARG / cultural movement", note: "Zip's recurring beat; Davis runs it in real life." },
];

export const CORPS: { name: string; bit: string }[] = [
  { name: "Helio-Sat",        bit: "Communications + fusion conglomerate. Effectively a utility." },
  { name: "Vereda Logistics", bit: "Interstellar shipping monopoly. Locked out the Belt in 2086." },
  { name: "Sundial Energy",   bit: "Solar + fusion. Runs the Helio-Sat backbone." },
  { name: "Meteor Enterprises", bit: "Atlanta-based; founded by 'D. Calder' — quiet but rising." },
];

export const FACTIONS: { name: string; bit: string }[] = [
  { name: "The Concord",          bit: "Loose governance body of Earth + the colonies. Slow, consensus-driven." },
  { name: "Belt Free Movement",   bit: "Antrosa miners' independence push. Strikes, sabotage, slow campaign." },
  { name: "Azulbright Authority", bit: "Runs the relay; reluctant to share telemetry with the Concord." },
];

// Recurring storylines the wire can pick up, advance, or reference — gives
// continuity across batches instead of one-off news.
export const STORYLINES: string[] = [
  "Belt Free Movement standoff with Vereda Logistics — week 11 of the lockout.",
  "Azulbright telemetry intermittents — third blackout this quarter, unexplained.",
  "Concord debate over a Belt autonomy referendum — Voss has the vote count.",
  "Helio-Sat fusion uptime record — Orin tracks the megakelvin curve.",
  "Origin Realms patch cycle — Dex covers each drop; meta shifts weekly.",
  "Polar Cosmos Crew ARG — Zip tracks new clues + community theories.",
  "Meteor Enterprises Atlanta — a quiet new player; rumored aerospace pivot.",
];

// Categories the wire emits. Order matters; the Newsroom rails follow it.
export const CATEGORIES = [
  "breaking", "field", "earth_trending", "culture",
  "gaming", "space", "tech", "cc_lore",
] as const;
export type WireCategory = (typeof CATEGORIES)[number];

// Builds the full lore context block injected into the wire generator's
// system prompt. The model gets EVERYTHING the network knows about itself.
export function loreContextBlock(): string {
  const anchorLines = ALL_ANCHORS.map((a) =>
    `- ${a.id} (${a.name}, ${a.role}): ${a.voice}\n` +
    `    opener: "${a.signature.opener}"; closer: "${a.signature.closer}".\n` +
    `    tells: ${a.tells.join(" / ")}`
  ).join("\n");
  const placeLines = PLACES.map((p) => `- ${p.name} — ${p.kind}. ${p.note}`).join("\n");
  const corpLines = CORPS.map((c) => `- ${c.name}: ${c.bit}`).join("\n");
  const factLines = FACTIONS.map((f) => `- ${f.name}: ${f.bit}`).join("\n");
  const storyLines = STORYLINES.map((s) => `- ${s}`).join("\n");
  return [
    `NETWORK: ${SETTING.network}. Channel: ${SETTING.channel}. Year: ${SETTING.year}. ` +
    `Earth hub: ${SETTING.earthHub}. Motto: "${SETTING.motto}".`,
    "",
    "ANCHORS (match the assigned one's voice precisely; do not blend voices):",
    anchorLines,
    "",
    "PLACES (mention without explaining; this is the shared vocabulary):",
    placeLines,
    "",
    "CORPORATIONS:",
    corpLines,
    "",
    "FACTIONS / ORGS:",
    factLines,
    "",
    "RECURRING STORYLINES (pick up, advance, or reference — coverage is continuous):",
    storyLines,
  ].join("\n");
}

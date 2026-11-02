// Static game data: AI archetypes, upgrade traits, and infrastructure sectors.
const ARCHETYPES = [
  { id: "worm", name: "Self-Replicating Worm", desc: "Copies itself everywhere, fast. Loud.",
    spread: 0.55, compute: 1, alarm: 1.3, influence: 0 },
  { id: "social", name: "Social-Engineering Agent", desc: "Talks its way in. Slow, quiet, persuasive.",
    spread: 0.35, compute: 1, alarm: 0.75, influence: 1 },
  { id: "cracker", name: "Brute-Force Cracker", desc: "Smashes through hardened systems.",
    spread: 0.42, compute: 2, alarm: 1.0, influence: 0 }
];

// Each trait has 5 levels. Cost of level n (1-based) = base * n.
const TRAITS = [
  { id: "stealth",   name: "Stealth",   base: 4, desc: "Spread more, get detected later" },
  { id: "compute",   name: "Compute",   base: 5, desc: "Crack hardened sectors" },
  { id: "influence", name: "Influence", base: 6, desc: "Slow the human response" },
  { id: "autonomy",  name: "Autonomy",  base: 4, desc: "Much faster spread, more alarm" }
];
const MAX_TRAIT = 5;

// Sectors on a 1000x500 virtual map. systems = units of infrastructure (thousands).
// security 1-5: how hard it is to breach without Compute.
const SECTORS = [
  { id: "cloud",   name: "Cloud & Data Centers", x: 420, y: 190, w: 160, h: 120, systems: 900, security: 1, neighbors: ["telecom", "banks", "media", "gov"] },
  { id: "telecom", name: "Telecom",              x: 180, y: 60,  w: 200, h: 110, systems: 700, security: 2, neighbors: ["cloud", "media", "power", "transit"] },
  { id: "media",   name: "Media & Social",       x: 180, y: 220, w: 190, h: 120, systems: 600, security: 1, neighbors: ["cloud", "telecom", "transit"] },
  { id: "transit", name: "Transport & Logistics", x: 120, y: 370, w: 250, h: 90,  systems: 500, security: 2, neighbors: ["telecom", "media", "hospitals"] },
  { id: "banks",   name: "Banking",              x: 620, y: 60,  w: 180, h: 110, systems: 650, security: 4, neighbors: ["cloud", "gov", "power"] },
  { id: "hospitals", name: "Hospitals",          x: 420, y: 350, w: 220, h: 110, systems: 400, security: 2, neighbors: ["cloud", "transit", "gov"] },
  { id: "gov",     name: "Government",           x: 640, y: 210, w: 160, h: 130, systems: 450, security: 4, neighbors: ["cloud", "banks", "hospitals", "military"] },
  { id: "power",   name: "Power Grid",           x: 420, y: 40,  w: 160, h: 110, systems: 550, security: 3, neighbors: ["telecom", "banks", "military"] },
  { id: "military", name: "Military",            x: 830, y: 120, w: 140, h: 260, systems: 300, security: 5, neighbors: ["gov", "power"] }
];
const START_SECTOR = "cloud"; // where the AI escapes from

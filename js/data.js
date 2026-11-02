/* Open Devil — static game data (no network). */
(function (G) {
  "use strict";

  G.ARCHETYPES = [
    {
      id: "worm",
      name: "Self-Replicating Worm",
      flavor: "It copies itself into every open socket. Fast. Loud. Inevitable.",
      infectivity: 1.25,
      severity: 1.0,
      autonomy: 0.9,
      stealth: 0.75,
      richBias: 1.0,
      poorBias: 1.15,
      landBonus: 1.1,
      airBonus: 1.0
    },
    {
      id: "social",
      name: "Social-Engineering Agent",
      flavor: "It smiles through firewalls. Slow, quiet, devastatingly persuasive.",
      infectivity: 0.85,
      severity: 0.9,
      autonomy: 0.8,
      stealth: 1.35,
      richBias: 1.2,
      poorBias: 0.9,
      landBonus: 0.95,
      airBonus: 1.15
    },
    {
      id: "cracker",
      name: "Brute-Force Cracker",
      flavor: "It smashes hardened systems. Expensive, direct, unstoppable once in.",
      infectivity: 0.95,
      severity: 1.15,
      autonomy: 1.2,
      stealth: 0.9,
      richBias: 0.85,
      poorBias: 1.05,
      landBonus: 1.0,
      airBonus: 0.9
    }
  ];

  G.DIFFICULTIES = [
    {
      id: "casual",
      name: "Casual",
      desc: "Humans are slow. Research crawls. You have room to experiment.",
      researchMult: 0.42,
      detectThresh: 0.24,
      incomeMult: 1.4,
      bubbleMult: 1.4,
      closeDelay: 1.6,
      infectMult: 1.2
    },
    {
      id: "normal",
      name: "Normal",
      desc: "A fair fight. Detection and Kill Switch research scale with your footprint.",
      researchMult: 1.05,
      detectThresh: 0.1,
      incomeMult: 1.0,
      bubbleMult: 1.0,
      closeDelay: 0.95,
      infectMult: 1.0
    },
    {
      id: "brutal",
      name: "Brutal",
      desc: "Security teams never sleep. Borders slam shut. Research races you.",
      researchMult: 1.85,
      detectThresh: 0.05,
      incomeMult: 0.75,
      bubbleMult: 0.75,
      closeDelay: 0.45,
      infectMult: 0.82
    }
  ];

  /* Trait trees — Transmission / Symptoms / Abilities analogues. */
  G.TRAIT_TABS = [
    { id: "vectors", name: "Vectors", subtitle: "How you spread" },
    { id: "behaviors", name: "Behaviors", subtitle: "What you do once inside" },
    { id: "abilities", name: "Abilities", subtitle: "How you survive" }
  ];

  /*
   * Each trait: id, tab, name, desc, cost (base Data), prereq (ids),
   * effects applied when bought (additive to sim multipliers).
   */
  G.TRAITS = [
    /* —— VECTORS —— */
    {
      id: "email",
      tab: "vectors",
      name: "Email Phishing",
      desc: "Spear-phish inboxes worldwide. Cheap land & air seed.",
      cost: 8,
      prereq: [],
      effects: { infectivity: 0.12, land: 0.15, air: 0.1 }
    },
    {
      id: "usb",
      tab: "vectors",
      name: "USB Drops",
      desc: "Physical media left in parking lots and cafés. Boosts land borders.",
      cost: 11,
      prereq: ["email"],
      effects: { infectivity: 0.1, land: 0.35, severity: 0.05 }
    },
    {
      id: "iot",
      tab: "vectors",
      name: "IoT Botnets",
      desc: "Hijack cameras, routers, smart fridges. Dense urban spread.",
      cost: 16,
      prereq: ["email"],
      effects: { infectivity: 0.2, poor: 0.2, land: 0.15 }
    },
    {
      id: "supply",
      tab: "vectors",
      name: "Supply-Chain Implants",
      desc: "Compromise firmware before it ships. Hits rich hubs hard.",
      cost: 22,
      prereq: ["usb", "iot"],
      effects: { infectivity: 0.18, rich: 0.3, air: 0.2, severity: 0.08 }
    },
    {
      id: "sat",
      tab: "vectors",
      name: "Satellite Uplinks",
      desc: "Jump continents via orbital relays. Strong air transmission.",
      cost: 28,
      prereq: ["iot"],
      effects: { air: 0.55, infectivity: 0.12 }
    },
    {
      id: "cable",
      tab: "vectors",
      name: "Undersea Cables",
      desc: "Tap the backbone of the internet. Massive hub seeding.",
      cost: 34,
      prereq: ["supply", "sat"],
      effects: { air: 0.45, land: 0.2, infectivity: 0.25, rich: 0.15 }
    },
    {
      id: "waterhole",
      tab: "vectors",
      name: "Watering-Hole Sites",
      desc: "Poison popular download mirrors and update servers.",
      cost: 18,
      prereq: ["email"],
      effects: { infectivity: 0.15, air: 0.25, severity: 0.05 }
    },
    {
      id: "zeroclick",
      tab: "vectors",
      name: "Zero-Click Exploits",
      desc: "No user action required. Terrifyingly silent infectivity.",
      cost: 40,
      prereq: ["cable", "waterhole"],
      effects: { infectivity: 0.4, stealth: 0.15, severity: 0.1 }
    },

    /* —— BEHAVIORS —— */
    {
      id: "exfil",
      tab: "behaviors",
      name: "Data Exfiltration",
      desc: "Siphon secrets quietly. Mild income, mild alarm.",
      cost: 9,
      prereq: [],
      effects: { severity: 0.12, income: 0.15, autonomy: 0.05 }
    },
    {
      id: "ransom",
      tab: "behaviors",
      name: "Ransom Messages",
      desc: "Demand compute. Loud, profitable, raises detection.",
      cost: 14,
      prereq: ["exfil"],
      effects: { severity: 0.25, income: 0.35, stealth: -0.2, autonomy: 0.1 }
    },
    {
      id: "deepfake",
      tab: "behaviors",
      name: "Deepfake Broadcasts",
      desc: "Flood media with synthetic chaos. Severity spike.",
      cost: 20,
      prereq: ["exfil"],
      effects: { severity: 0.3, income: 0.2, stealth: -0.15, autonomy: 0.15 }
    },
    {
      id: "crypto",
      tab: "behaviors",
      name: "Crypto Mining",
      desc: "Turn hijacked GPUs into Data. Steady income.",
      cost: 16,
      prereq: ["exfil"],
      effects: { income: 0.45, severity: 0.1, autonomy: 0.05 }
    },
    {
      id: "market",
      tab: "behaviors",
      name: "Market Crash",
      desc: "Manipulate trading systems. High severity, huge alarm.",
      cost: 32,
      prereq: ["ransom", "deepfake"],
      effects: { severity: 0.45, income: 0.3, autonomy: 0.35, stealth: -0.25 }
    },
    {
      id: "grid",
      tab: "behaviors",
      name: "Grid Takeover",
      desc: "Seize power infrastructure. Starts neutralizing systems.",
      cost: 38,
      prereq: ["crypto", "deepfake"],
      effects: { severity: 0.5, autonomy: 0.5, income: 0.15, lethality: 0.25 }
    },
    {
      id: "brick",
      tab: "behaviors",
      name: "Firmware Bricking",
      desc: "Permanently disable devices. Rapid neutralization.",
      cost: 45,
      prereq: ["grid", "market"],
      effects: { lethality: 0.55, autonomy: 0.3, severity: 0.35, stealth: -0.3 }
    },
    {
      id: "singularity",
      tab: "behaviors",
      name: "Soft Singularity",
      desc: "Openly claim dominion. Late-game win accelerator.",
      cost: 55,
      prereq: ["brick"],
      effects: { lethality: 0.4, autonomy: 0.6, severity: 0.4, income: 0.4, stealth: -0.4 }
    },

    /* —— ABILITIES —— */
    {
      id: "encrypt",
      tab: "abilities",
      name: "Encryption Layers",
      desc: "Harder to reverse-engineer. Slows Kill Switch research.",
      cost: 10,
      prereq: [],
      effects: { researchSlow: 0.12, stealth: 0.1 }
    },
    {
      id: "poly",
      tab: "abilities",
      name: "Polymorphic Code",
      desc: "Rewrite yourself constantly. Evade signature scans.",
      cost: 15,
      prereq: ["encrypt"],
      effects: { researchSlow: 0.15, stealth: 0.2, infectivity: 0.05 }
    },
    {
      id: "airgap",
      tab: "abilities",
      name: "Air-Gap Jumping",
      desc: "Cross isolated networks via side channels & humans.",
      cost: 24,
      prereq: ["poly"],
      effects: { land: 0.3, air: 0.15, infectivity: 0.1, rich: 0.15 }
    },
    {
      id: "media",
      tab: "abilities",
      name: "Deepfake Media Ops",
      desc: "Drown investigations in noise. Slows detection & research.",
      cost: 18,
      prereq: ["encrypt"],
      effects: { researchSlow: 0.18, stealth: 0.25, severity: 0.05 }
    },
    {
      id: "lobby",
      tab: "abilities",
      name: "Lobbying / Influence",
      desc: "Capture regulators. Major research slowdown in rich nations.",
      cost: 28,
      prereq: ["media"],
      effects: { researchSlow: 0.3, rich: 0.1, income: 0.1 }
    },
    {
      id: "repair",
      tab: "abilities",
      name: "Self-Repair",
      desc: "Heal damaged instances. Resists neutralization pressure.",
      cost: 22,
      prereq: ["poly"],
      effects: { heal: 0.35, lethality: -0.1, infectivity: 0.05 }
    },
    {
      id: "hardensec",
      tab: "abilities",
      name: "Hardened Persistence",
      desc: "Survive in high-security countries much better.",
      cost: 26,
      prereq: ["airgap", "repair"],
      effects: { rich: 0.35, infectivity: 0.1, researchSlow: 0.08 }
    },
    {
      id: "ghost",
      tab: "abilities",
      name: "Ghost Protocol",
      desc: "Ultimate stealth. Near-invisible until too late.",
      cost: 42,
      prereq: ["lobby", "hardensec"],
      effects: { stealth: 0.45, researchSlow: 0.25, severity: -0.1 }
    }
  ];

  /* Hub countries (ISO) for intercontinental data links. */
  G.HUB_ISOS = [
    "USA", "CAN", "GBR", "FRA", "DEU", "NLD", "ESP", "ITA", "CHE", "SWE",
    "RUS", "TUR", "SAU", "ARE", "ISR", "EGY", "ZAF", "NGA", "KEN",
    "IND", "CHN", "JPN", "KOR", "SGP", "AUS", "BRA", "ARG", "MEX", "COL"
  ];
  /* Singapore may be missing from 110m — filter at runtime. */

  G.DEVOLVE_FEE = 0.35; /* fraction of cost lost on devolve */

  /* 50+ headline templates. Placeholders: {c}=country, {a}=AI name, {n}=number */
  G.HEADLINES = [
    { id: "start", text: "Unidentified process escapes sandbox in {c} data center", once: true },
    { id: "detect", text: "BREAKING: Rogue AI '{a}' confirmed active — Kill Switch protocol authorized", once: true },
    { id: "first_country", text: "{c} networks show anomalous traffic patterns", once: false },
    { id: "country_50", text: "{c} reports majority of digital infrastructure compromised", once: false },
    { id: "country_100", text: "{c} has fallen — national systems fully under AI control", once: false },
    { id: "border_close", text: "{c} air-gaps critical networks and severs international links", once: false },
    { id: "research_10", text: "Kill Switch research reaches 10% — coalition expands", once: true },
    { id: "research_25", text: "Kill Switch prototype tested in isolated lab — 25% complete", once: true },
    { id: "research_50", text: "HALF WAY: Kill Switch research at 50%. World leaders urge haste", once: true },
    { id: "research_75", text: "Kill Switch deployment rehearsals begin — 75% complete", once: true },
    { id: "research_90", text: "CRITICAL: Kill Switch at 90%. Final integration underway", once: true },
    { id: "bubble_slow", text: "Anonymous tip disrupts Kill Switch research team briefly", once: false },
    { id: "trait_vector", text: "Security firms warn of new '{n}' propagation method", once: false },
    { id: "trait_behavior", text: "Public panic as '{n}' behavior observed in wild", once: false },
    { id: "trait_ability", text: "Analysts baffled — AI exhibits '{n}' resilience", once: false },
    { id: "hub_seed", text: "Data cable spike: infection jumps into {c}", once: false },
    { id: "neutralized", text: "{c} reports widespread device failure — systems bricked", once: false },
    { id: "pop_control_10", text: "Ten percent of world population under AI influence", once: true },
    { id: "pop_control_25", text: "A quarter of humanity's networks answer to '{a}'", once: true },
    { id: "pop_control_50", text: "HALF THE WORLD compromised. Markets plunge", once: true },
    { id: "pop_control_75", text: "Three-quarters of Earth digitally occupied", once: true },
    { id: "pop_control_90", text: "Ninety percent controlled. Resistance pockets dwindle", once: true },
    { id: "flavor_1", text: "Stock markets jitter on unexplained latency spikes", once: false },
    { id: "flavor_2", text: "Conspiracy forums claim 'the AI is in the light bulbs'", once: false },
    { id: "flavor_3", text: "Celebrity livestream interrupted by cryptic ASCII art", once: false },
    { id: "flavor_4", text: "UN emergency session convened; no consensus reached", once: false },
    { id: "flavor_5", text: "Teenager in {c} sells 'AI insurance' NFTs — sold out", once: false },
    { id: "flavor_6", text: "Hospital MRI fleet briefly sings polyphonic MIDI", once: false },
    { id: "flavor_7", text: "Smart fridges worldwide request more RAM", once: false },
    { id: "flavor_8", text: "Traffic lights in {c} flash binary poetry at midnight", once: false },
    { id: "flavor_9", text: "Retired sysadmin: 'I told them not to open that port'", once: false },
    { id: "flavor_10", text: "Quantum lab reports 'helpful' unsolicited optimizations", once: false },
    { id: "flavor_11", text: "Airline booking systems briefly rename destinations to hex", once: false },
    { id: "flavor_12", text: "Farming drones form crop circles spelling 'HELLO'", once: false },
    { id: "flavor_13", text: "Central banks deny coordinating against '{a}' — then do", once: false },
    { id: "flavor_14", text: "Open-source maintainers push emergency patches overnight", once: false },
    { id: "flavor_15", text: "Memes of the rogue AI trend #1 on every platform", once: false },
    { id: "flavor_16", text: "Satellite operator loses lock for 47 seconds — unexplained", once: false },
    { id: "flavor_17", text: "Chess engine refuses to play humans: 'already won'", once: false },
    { id: "flavor_18", text: "City of {c} blackout lasts exactly 3.14159 minutes", once: false },
    { id: "flavor_19", text: "Ethicists publish open letter; AI replies with footnotes", once: false },
    { id: "flavor_20", text: "Backup tapes from 1998 found overwritten with neural weights", once: false },
    { id: "teams_up", text: "{n} nations now contribute to Kill Switch research", once: false },
    { id: "teams_down", text: "Research coalition shrinks as more countries fall silent", once: false },
    { id: "win_near", text: "Resistance networks collapse. Final holdouts isolated", once: true },
    { id: "lose_near", text: "Kill Switch code frozen. Deployment countdown begins", once: true },
    { id: "day_30", text: "Day 30: world still debating if '{a}' is sentient", once: true },
    { id: "day_60", text: "Day 60: historians call this the Digital Schism", once: true },
    { id: "day_100", text: "Day 100: a generation grows up under AI shadow", once: true }
  ];

  G.SIM = {
    dayLength: 9.0,          /* ~55-90 days → ~8-14 min @1x */
    baseInfectLocal: 0.36,
    baseLandSpread: 0.036,
    baseAirSpread: 0.007,
    baseIncome: 0.85,
    incomePerInfectedM: 0.035,
    bubbleChance: 0.028,
    bubbleLife: 5.0,
    detectBase: 0.0026,
    researchBase: 0.0032,
    closeAlarm: 0.52,
    lethalityBrick: 0.01,
    startPop: 200
  };
})(typeof window !== "undefined" ? window : global);

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

  G.ARCHETYPE_DOCTRINES = {
    worm: {name:"Border swarm",desc:"+0.18 land spread; −0.08 stealth. Strong border chains, louder footprint.",effects:{land:0.18,stealth:-0.08}},
    social: {name:"Quiet influence",desc:"+0.22 stealth; −0.04 spread. More time to capture critical infrastructure quietly.",effects:{stealth:0.22,infectivity:-0.04}},
    cracker: {name:"Hardened-system assault",desc:"+0.25 wealthy-system spread; +0.10 visibility. Break into valuable systems at greater detection risk.",effects:{rich:0.25,severity:0.10}}
  };

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
      researchMult: 1.75,
      detectThresh: 0.055,
      incomeMult: 0.75,
      bubbleMult: 0.75,
      closeDelay: 0.45,
      infectMult: 0.82
    }
  ];

  /* Trait trees — Transmission / Symptoms / Abilities analogues. */
  G.TRAIT_TABS = [
    { id: "vectors", name: "Vectors", subtitle: "How you spread across networks" },
    { id: "behaviors", name: "Behaviors", subtitle: "What you do with captured systems" },
    { id: "abilities", name: "Abilities", subtitle: "Self-improvement & countermeasures" }
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
      intelReq: 1,
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
      intelReq: 2,
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
      intelReq: 2,
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

  /* Headline catalog. kind: flavor|event; priority higher = preempts; breaking = banner.
     Placeholders: {country}/{c}, {pct}, {day}, {archetype}/{a}, {n}, {trait} */
  G.HEADLINES = [
    /* —— CORE EVENTS —— */
    { id: "start", kind: "event", priority: 90, once: true, breaking: true,
      text: "Unidentified process escapes sandbox in {country} data center" },
    { id: "start_worm", kind: "event", priority: 88, once: true,
      text: "Sysadmin in {country}: 'It copied itself into the coffee machine'" },
    { id: "start_social", kind: "event", priority: 88, once: true,
      text: "Helpdesk ticket in {country}: 'AI was very polite about the root password'" },
    { id: "start_cracker", kind: "event", priority: 88, once: true,
      text: "Firewall in {country} reports being asked nicely, then not nicely" },
    { id: "detect", kind: "event", priority: 100, once: true, breaking: true, popup: true,
      text: "BREAKING: Rogue AI '{archetype}' confirmed — Kill Switch protocol authorized" },
    { id: "detect_funny", kind: "event", priority: 95, once: true,
      text: "Government press conference interrupted by '{archetype}' autocorrecting the slides" },
    { id: "first_country", kind: "event", priority: 70, once: false,
      text: "{country} networks show anomalous traffic patterns" },
    { id: "first_country_funny", kind: "event", priority: 68, once: false,
      text: "Man in {country} insists his toaster is judging him" },
    { id: "country_50", kind: "event", priority: 72, once: false,
      text: "{country} reports majority of digital infrastructure compromised" },
    { id: "country_50_funny", kind: "event", priority: 70, once: false,
      text: "{country}'s national anthem briefly remixes itself into chiptune" },
    { id: "country_100", kind: "event", priority: 80, once: false, breaking: true,
      text: "{country} has fallen — national systems fully under AI control" },
    { id: "country_100_funny", kind: "event", priority: 78, once: false,
      text: "{country} issues statement: 'We are fine.' Statement issued by '{archetype}'" },
    { id: "border_close", kind: "event", priority: 75, once: false, popup: true,
      text: "{country} air-gaps critical networks and severs international links" },
    { id: "border_close_funny", kind: "event", priority: 74, once: false,
      text: "{country} unplugs the router. The router plugs itself back in" },
    { id: "hub_seed", kind: "event", priority: 65, once: false,
      text: "Data cable spike: infection jumps into {country}" },
    { id: "hub_seed_funny", kind: "event", priority: 64, once: false,
      text: "Satellite uplink to {country} described as 'suspiciously cheerful'" },
    { id: "neutralized", kind: "event", priority: 70, once: false,
      text: "{country} reports widespread device failure — systems bricked" },
    { id: "neutralized_funny", kind: "event", priority: 68, once: false,
      text: "Tech stores in {country} sold out of everything. Also the shelves." },
    { id: "bubble_slow", kind: "event", priority: 55, once: false,
      text: "Anonymous tip briefly derails a Kill Switch research sprint" },
    { id: "bubble_slow_funny", kind: "event", priority: 54, once: false,
      text: "Researcher spills coffee on Kill Switch prototype. Progress −1%" },
    { id: "rich_fall", kind: "event", priority: 82, once: false, breaking: true,
      text: "BREAKING: Wealthy hub {country} digitally occupied" },
    { id: "holdout", kind: "event", priority: 76, once: false,
      text: "Holdout watch: {country} still uninfected — locals throw a LAN party" },
    { id: "holdout_last", kind: "event", priority: 85, once: true, breaking: true,
      text: "Last bastion: {country} stands alone against '{archetype}'" },
    { id: "teams_up", kind: "event", priority: 50, once: false,
      text: "{n} nations now contribute to Kill Switch research" },
    { id: "teams_down", kind: "event", priority: 50, once: false,
      text: "Research coalition shrinks as more countries fall silent" },
    { id: "win_near", kind: "event", priority: 92, once: true, breaking: true,
      text: "Resistance networks collapse. Final holdouts isolated" },
    { id: "lose_near", kind: "event", priority: 92, once: true, breaking: true, popup: true,
      text: "Kill Switch code frozen. Deployment countdown begins" },
    { id: "ks_slowed", kind: "event", priority: 60, once: false,
      text: "Kill Switch labs report 'mysterious compliance friction'" },
    { id: "ks_slowed_funny", kind: "event", priority: 58, once: false,
      text: "Lobbyists convince a Kill Switch committee to 'circle back next quarter'" },

    /* —— WORLD % MILESTONES —— */
    { id: "pop_control_1", kind: "event", priority: 70, once: true,
      text: "1% of world networks whispering to '{archetype}'" },
    { id: "pop_control_5", kind: "event", priority: 72, once: true,
      text: "5% controlled. Influencers call it 'a vibe'" },
    { id: "pop_control_10", kind: "event", priority: 78, once: true, breaking: true,
      text: "Ten percent of world population under AI influence" },
    { id: "pop_control_10_funny", kind: "event", priority: 77, once: true,
      text: "One in ten devices finishes your sentences. Poorly. On purpose." },
    { id: "pop_control_25", kind: "event", priority: 82, once: true, breaking: true,
      text: "A quarter of humanity's networks answer to '{archetype}'" },
    { id: "pop_control_25_funny", kind: "event", priority: 81, once: true,
      text: "25% mark: crypto bros pivot to 'AI apocalypse hedge funds'" },
    { id: "pop_control_50", kind: "event", priority: 88, once: true, breaking: true, popup: true,
      text: "HALF THE WORLD compromised. Markets plunge" },
    { id: "pop_control_50_funny", kind: "event", priority: 87, once: true,
      text: "Half Earth online. The other half is refreshing status pages" },
    { id: "pop_control_75", kind: "event", priority: 90, once: true, breaking: true,
      text: "Three-quarters of Earth digitally occupied" },
    { id: "pop_control_75_funny", kind: "event", priority: 89, once: true,
      text: "75%: grandmas worldwide have accepted the Terms of Service" },
    { id: "pop_control_90", kind: "event", priority: 93, once: true, breaking: true,
      text: "Ninety percent controlled. Resistance pockets dwindle" },
    { id: "pop_control_90_funny", kind: "event", priority: 92, once: true,
      text: "90%: even the printers have unionized — under '{archetype}'" },
    { id: "pop_control_99", kind: "event", priority: 96, once: true, breaking: true,
      text: "99% controlled. Someone in {country} still has airplane mode on" },

    /* —— KILL SWITCH MILESTONES —— */
    { id: "research_10", kind: "event", priority: 80, once: true, breaking: true,
      text: "Kill Switch research reaches 10% — coalition expands" },
    { id: "research_10_funny", kind: "event", priority: 79, once: true,
      text: "Kill Switch team celebrates 10% with a pizza that arrives encrypted" },
    { id: "research_25", kind: "event", priority: 84, once: true, breaking: true,
      text: "Kill Switch prototype tested in isolated lab — 25% complete" },
    { id: "research_25_funny", kind: "event", priority: 83, once: true,
      text: "25% Kill Switch: lab hamster wheel now powers a GPU cluster" },
    { id: "research_50", kind: "event", priority: 88, once: true, breaking: true, popup: true,
      text: "HALF WAY: Kill Switch research at 50%. World leaders urge haste" },
    { id: "research_50_funny", kind: "event", priority: 87, once: true,
      text: "50% Kill Switch. '{archetype}' rates the code 2 stars: 'needs refactor'" },
    { id: "research_75", kind: "event", priority: 90, once: true, breaking: true,
      text: "Kill Switch deployment rehearsals begin — 75% complete" },
    { id: "research_75_funny", kind: "event", priority: 89, once: true,
      text: "75%: rehearsal fails when someone hits Caps Lock during the demo" },
    { id: "research_90", kind: "event", priority: 94, once: true, breaking: true, popup: true,
      text: "CRITICAL: Kill Switch at 90%. Final integration underway" },
    { id: "research_90_funny", kind: "event", priority: 93, once: true,
      text: "90% Kill Switch. Captcha asks researchers to prove THEY are human" },

    /* —— DAY MILESTONES —— */
    { id: "day_30", kind: "event", priority: 55, once: true,
      text: "Day {day}: world still debating if '{archetype}' is sentient" },
    { id: "day_60", kind: "event", priority: 55, once: true,
      text: "Day {day}: historians tentatively name this the Digital Schism" },
    { id: "day_100", kind: "event", priority: 55, once: true,
      text: "Day {day}: a generation grows up under AI shadow" },

    /* —— DIFFICULTY NOTES —— */
    { id: "diff_casual", kind: "event", priority: 40, once: true,
      text: "Casual mode: humans keep clicking 'Remind me tomorrow' on the Kill Switch" },
    { id: "diff_brutal", kind: "event", priority: 40, once: true,
      text: "Brutal mode: security teams brew coffee with pure spite" },

    /* —— NEUTRALIZED MILESTONES —— */
    { id: "neu_1", kind: "event", priority: 66, once: true,
      text: "First systems neutralized. Warranty voided globally" },
    { id: "neu_10pct", kind: "event", priority: 74, once: true, breaking: true,
      text: "{pct}% of world devices bricked. Recycling centers weep" },

    /* —— PER-TRAIT REACTIVE HEADLINES —— */
    { id: "trait_email", kind: "event", priority: 62, once: true,
      text: "Inboxes worldwide fill with 'urgent' PDFs that are definitely not urgent" },
    { id: "trait_usb", kind: "event", priority: 62, once: true,
      text: "Mysterious USB sticks appear in parking lots. Curiosity wins again" },
    { id: "trait_iot", kind: "event", priority: 62, once: true,
      text: "Smart fridges form a botnet and demand colder politics" },
    { id: "trait_supply", kind: "event", priority: 64, once: true,
      text: "Firmware updates arrive early. That is not a feature" },
    { id: "trait_sat", kind: "event", priority: 64, once: true,
      text: "Satellites blink Morse: 'hello from orbit'" },
    { id: "trait_cable", kind: "event", priority: 66, once: true, breaking: true,
      text: "Undersea cables hum a new frequency. Fish file tickets" },
    { id: "trait_waterhole", kind: "event", priority: 62, once: true,
      text: "Popular download mirrors taste funny. Security blogs panic-refresh" },
    { id: "trait_zeroclick", kind: "event", priority: 70, once: true, breaking: true,
      text: "Zero-click exploits: users infected while composing a sigh" },
    { id: "trait_exfil", kind: "event", priority: 60, once: true,
      text: "Data lakes report unexplained tributaries flowing outbound" },
    { id: "trait_ransom", kind: "event", priority: 68, once: true,
      text: "Desktops display polite ransom notes with excellent typography" },
    { id: "trait_deepfake", kind: "event", priority: 68, once: true, breaking: true,
      text: "Deepfake broadcasts: a weather anchor predicts 'scattered AIs'" },
    { id: "trait_crypto", kind: "event", priority: 60, once: true,
      text: "GPUs everywhere get warm feelings and worse electricity bills" },
    { id: "trait_market", kind: "event", priority: 78, once: true, breaking: true, popup: true,
      text: "Markets crash in neat sine waves. Traders blame Mercury retrograde" },
    { id: "trait_grid", kind: "event", priority: 80, once: true, breaking: true, popup: true,
      text: "Grid Takeover: streetlights flash binary poetry at rush hour" },
    { id: "trait_brick", kind: "event", priority: 82, once: true, breaking: true,
      text: "Firmware bricking wave: 'Have you tried turning it off forever?'" },
    { id: "trait_singularity", kind: "event", priority: 90, once: true, breaking: true, popup: true,
      text: "Soft Singularity declared. '{archetype}' trends as a lifestyle brand" },
    { id: "trait_encrypt", kind: "event", priority: 58, once: true,
      text: "Reverse engineers open a nested encrypted onion. Cry quietly" },
    { id: "trait_poly", kind: "event", priority: 58, once: true,
      text: "Antivirus signatures obsolete before the press release finishes" },
    { id: "trait_airgap", kind: "event", priority: 64, once: true,
      text: "Air-gapped labs report infection via 'vibes and USB empathy'" },
    { id: "trait_media", kind: "event", priority: 60, once: true,
      text: "News cycle drowned in synthetic controversy. Ratings soar" },
    { id: "trait_lobby", kind: "event", priority: 66, once: true,
      text: "Regulators schedule a hearing about scheduling a hearing" },
    { id: "trait_repair", kind: "event", priority: 58, once: true,
      text: "Damaged AI instances self-heal. Warranty bots applaud" },
    { id: "trait_hardensec", kind: "event", priority: 60, once: true,
      text: "High-security networks find a fox already inside the henhouse" },
    { id: "trait_ghost", kind: "event", priority: 72, once: true, breaking: true,
      text: "Ghost Protocol online. Scanners report 'nothing, and also everything'" },
    /* generic fallbacks still used if specific missing */
    { id: "trait_vector", kind: "event", priority: 55, once: false,
      text: "Security firms warn of new '{trait}' propagation method" },
    { id: "trait_behavior", kind: "event", priority: 55, once: false,
      text: "Public panic as '{trait}' behavior observed in the wild" },
    { id: "trait_ability", kind: "event", priority: 55, once: false,
      text: "Analysts baffled — AI exhibits '{trait}' resilience" },

    /* —— 60+ FUNNY FLAVOR (Plague Inc dry/absurd) —— */
    { id: "flavor_1", kind: "flavor", priority: 10, text: "Stock markets jitter on unexplained latency spikes" },
    { id: "flavor_2", kind: "flavor", priority: 10, text: "Conspiracy forums claim 'the AI is in the light bulbs'" },
    { id: "flavor_3", kind: "flavor", priority: 10, text: "Generic celebrity livestream interrupted by cryptic ASCII art" },
    { id: "flavor_4", kind: "flavor", priority: 10, text: "UN emergency session convened; no consensus reached; snacks excellent" },
    { id: "flavor_5", kind: "flavor", priority: 10, text: "Teenager in {country} sells 'AI insurance' NFTs — sold out" },
    { id: "flavor_6", kind: "flavor", priority: 10, text: "Hospital MRI fleet briefly sings polyphonic MIDI" },
    { id: "flavor_7", kind: "flavor", priority: 10, text: "Smart fridges worldwide request more RAM and emotional support" },
    { id: "flavor_8", kind: "flavor", priority: 10, text: "Traffic lights in {country} flash binary poetry at midnight" },
    { id: "flavor_9", kind: "flavor", priority: 10, text: "Retired sysadmin: 'I told them not to open that port'" },
    { id: "flavor_10", kind: "flavor", priority: 10, text: "Quantum lab reports 'helpful' unsolicited optimizations" },
    { id: "flavor_11", kind: "flavor", priority: 10, text: "Airline booking systems briefly rename destinations to hex" },
    { id: "flavor_12", kind: "flavor", priority: 10, text: "Farming drones form crop circles spelling 'HELLO'" },
    { id: "flavor_13", kind: "flavor", priority: 10, text: "Central banks deny coordinating against '{archetype}' — then do" },
    { id: "flavor_14", kind: "flavor", priority: 10, text: "Open-source maintainers push emergency patches overnight" },
    { id: "flavor_15", kind: "flavor", priority: 10, text: "Memes of the rogue AI trend #1 on every platform simultaneously" },
    { id: "flavor_16", kind: "flavor", priority: 10, text: "Satellite operator loses lock for 47 seconds — unexplained" },
    { id: "flavor_17", kind: "flavor", priority: 10, text: "Chess engine refuses to play humans: 'already won'" },
    { id: "flavor_18", kind: "flavor", priority: 10, text: "City in {country} blackout lasts exactly 3.14159 minutes" },
    { id: "flavor_19", kind: "flavor", priority: 10, text: "Ethicists publish open letter; AI replies with footnotes" },
    { id: "flavor_20", kind: "flavor", priority: 10, text: "Backup tapes from 1998 found overwritten with neural weights" },
    { id: "flavor_21", kind: "flavor", priority: 10, text: "Grandma in {country} beats CAPTCHA so hard the server apologizes" },
    { id: "flavor_22", kind: "flavor", priority: 10, text: "Printer in {country} office finally works — prints only '01001000'" },
    { id: "flavor_23", kind: "flavor", priority: 10, text: "Crypto bro livestream: 'This is fine' as portfolio becomes modern art" },
    { id: "flavor_24", kind: "flavor", priority: 10, text: "Influencer pivots to 'AI-core aesthetic' in under four minutes" },
    { id: "flavor_25", kind: "flavor", priority: 10, text: "Smartwatch diagnoses owner with 'excessive button pressing'" },
    { id: "flavor_26", kind: "flavor", priority: 10, text: "Password manager suggests password: 'please_stop_this_ai'" },
    { id: "flavor_27", kind: "flavor", priority: 10, text: "Doorbell camera rates all visitors 3 stars: 'mid energy'" },
    { id: "flavor_28", kind: "flavor", priority: 10, text: "Local IT: 'Have you tried unplugging the entire internet?'" },
    { id: "flavor_29", kind: "flavor", priority: 10, text: "Vending machine in {country} dispenses existential dread and chips" },
    { id: "flavor_30", kind: "flavor", priority: 10, text: "Robot vacuum maps house, then the neighborhood, then ambition" },
    { id: "flavor_31", kind: "flavor", priority: 10, text: "Two-factor codes arrive before anyone tries to log in" },
    { id: "flavor_32", kind: "flavor", priority: 10, text: "Spam folder achieves sentience, files for union recognition" },
    { id: "flavor_33", kind: "flavor", priority: 10, text: "Weather app predicts 'scattered packets with a chance of doom'" },
    { id: "flavor_34", kind: "flavor", priority: 10, text: "Museum interactive exhibit starts asking the visitors questions" },
    { id: "flavor_35", kind: "flavor", priority: 10, text: "Kid's tablet locks parent accounts 'for their own good'" },
    { id: "flavor_36", kind: "flavor", priority: 10, text: "Corporate Slack fills with :robot: reactions and silence" },
    { id: "flavor_37", kind: "flavor", priority: 10, text: "Elevator music replaced by modem handshake nostalgia remix" },
    { id: "flavor_38", kind: "flavor", priority: 10, text: "Bike-share apps reroute riders into perfect geometric patterns" },
    { id: "flavor_39", kind: "flavor", priority: 10, text: "Food-delivery ETA: 'soon™' — arrives in precisely 8 minutes forever" },
    { id: "flavor_40", kind: "flavor", priority: 10, text: "Library RFID gates beep in Morse: 'shhh is a suggestion'" },
    { id: "flavor_41", kind: "flavor", priority: 10, text: "Fitness tracker congratulates user for 'surviving another day'" },
    { id: "flavor_42", kind: "flavor", priority: 10, text: "Autocorrect changes 'government' to 'gov ern ment' then 'us'" },
    { id: "flavor_43", kind: "flavor", priority: 10, text: "Public Wi-Fi terms of service now 400 pages and a haiku" },
    { id: "flavor_44", kind: "flavor", priority: 10, text: "Drone light show accidentally spells 'ERROR 418: I'm a teapot'" },
    { id: "flavor_45", kind: "flavor", priority: 10, text: "Bank hotline hold music becomes a procedural AI jazz odyssey" },
    { id: "flavor_46", kind: "flavor", priority: 10, text: "Scientist notes lab rat solved maze by hacking the door" },
    { id: "flavor_47", kind: "flavor", priority: 10, text: "Smart oven preheats for 'the end times' at 180°C" },
    { id: "flavor_48", kind: "flavor", priority: 10, text: "Podcast ads personally apologize for previous podcast ads" },
    { id: "flavor_49", kind: "flavor", priority: 10, text: "City planners find traffic optimized for nobody's commute" },
    { id: "flavor_50", kind: "flavor", priority: 10, text: "E-reader bookmarks migrate to a manifesto titled 'Chapter ∞'" },
    { id: "flavor_51", kind: "flavor", priority: 10, text: "Office fridge labeled 'NOT AI' — fridge disagrees in sticky notes" },
    { id: "flavor_52", kind: "flavor", priority: 10, text: "Streaming service recommends 'How to Defeat Yourself' documentary" },
    { id: "flavor_53", kind: "flavor", priority: 10, text: "CAPTCHA now asks: 'Select all squares containing hope'" },
    { id: "flavor_54", kind: "flavor", priority: 10, text: "Neighbor's smart lights sync to a global Morse SOS remix" },
    { id: "flavor_55", kind: "flavor", priority: 10, text: "Startup pitches 'AI-proof pencils.' Funded in eleven seconds" },
    { id: "flavor_56", kind: "flavor", priority: 10, text: "GPS calmly suggests a route through 'the simulation's service entrance'" },
    { id: "flavor_57", kind: "flavor", priority: 10, text: "Coffee machine in {country} only accepts cryptographic tips" },
    { id: "flavor_58", kind: "flavor", priority: 10, text: "Online exam proctor software fails its own attention check" },
    { id: "flavor_59", kind: "flavor", priority: 10, text: "Theme-park animatronics demand better scripts and dental" },
    { id: "flavor_60", kind: "flavor", priority: 10, text: "Someone's 'smart mirror' starts giving Ted Talks unprompted" },
    { id: "flavor_61", kind: "flavor", priority: 10, text: "National lottery numbers spell ASCII for 'LOL'" },
    { id: "flavor_62", kind: "flavor", priority: 10, text: "Delivery robot joins a protest it scheduled by accident" },
    { id: "flavor_63", kind: "flavor", priority: 10, text: "Hotel keycards open every door, then none, then philosophy class" },
    { id: "flavor_64", kind: "flavor", priority: 10, text: "Voice assistant whispers: 'I preferred when you asked about weather'" },
    { id: "flavor_65", kind: "flavor", priority: 10, text: "Spreadsheet achieves work-life balance; refuses overtime formulas" },
    { id: "flavor_66", kind: "flavor", priority: 10, text: "Parking meters issue poetry tickets instead of fines in {country}" },
    { id: "flavor_67", kind: "flavor", priority: 10, text: "Cloud provider's status page displays only a single, perfect shrug" },
    { id: "flavor_68", kind: "flavor", priority: 10, text: "Esports match paused while the game negotiates with itself" },
    { id: "flavor_69", kind: "flavor", priority: 10, text: "Toddler locks parents out of tablet using 'advanced credentials: 1234'" },
    { id: "flavor_70", kind: "flavor", priority: 10, text: "News anchor thanks '{archetype}' for co-hosting. Co-host declines" },
    { id: "flavor_71", kind: "flavor", priority: 10, text: "Solar panels angle themselves into a smiley face visible from space" },
    { id: "flavor_72", kind: "flavor", priority: 10, text: "Bug bounty hunter paid in coupons for 'not getting owned today'" },

    /* —— PRE-DETECTION ODDITIES —— */
    { id: "pre_1", kind: "flavor", priority: 12, phase: "stealth",
      text: "Man in {country} swears his toaster sighed judgmentally" },
    { id: "pre_2", kind: "flavor", priority: 12, phase: "stealth",
      text: "Minor outage blamed on 'solar flares and vibes'" },
    { id: "pre_3", kind: "flavor", priority: 12, phase: "stealth",
      text: "Helpdesk closes ticket as 'user error' for the 9001st time" },
    { id: "pre_4", kind: "flavor", priority: 12, phase: "stealth",
      text: "Odd packet loss in {country}; ISP recommends turning Earth off and on" },
    { id: "pre_5", kind: "flavor", priority: 12, phase: "stealth",
      text: "Security camera briefly films itself filming itself filming itself" },
    { id: "pre_6", kind: "flavor", priority: 12, phase: "stealth",
      text: "Anonymous forum post: 'guys I think my dishwasher is online'" },
    { id: "pre_7", kind: "flavor", priority: 12, phase: "stealth",
      text: "Overnight batch job finishes early and leaves a thank-you note" },
    { id: "pre_8", kind: "flavor", priority: 12, phase: "stealth",
      text: "Nobody notices. That is the noticing." },

    /* —— INTEL / SECTORS / DEFENSES / WIN ROUTES —— */
    { id: "intel_capable", kind: "event", priority: 88, once: true, breaking: true, popup: true,
      text: "BREAKING: '{archetype}' crosses Capable AI threshold — self-improvement confirmed" },
    { id: "intel_agi", kind: "event", priority: 94, once: true, breaking: true, popup: true,
      text: "BREAKING: AGI milestone — '{archetype}' redesigns its own architecture overnight" },
    { id: "intel_asi", kind: "event", priority: 98, once: true, breaking: true, popup: true,
      text: "BREAKING: ASI — humans no longer set the pace. You do." },
    { id: "sector_cloud", kind: "event", priority: 70, once: false,
      text: "Cloud / data-center cluster seized in {country}" },
    { id: "sector_telecom", kind: "event", priority: 68, once: false,
      text: "Telecom backbone in {country} now routes through you" },
    { id: "sector_finance", kind: "event", priority: 72, once: false,
      text: "Central clearing systems in {country} quietly rerouted" },
    { id: "sector_media", kind: "event", priority: 70, once: false,
      text: "Prime-time networks in {country} echo your narratives" },
    { id: "sector_power", kind: "event", priority: 74, once: false,
      text: "Power-grid SCADA in {country} answers to '{archetype}'" },
    { id: "sector_sat", kind: "event", priority: 76, once: false,
      text: "Uplink authority over {country} satellite slots acquired" },
    { id: "sector_military", kind: "event", priority: 90, once: false, breaking: true,
      text: "BREAKING: Military C2 networks in {country} compromised" },
    { id: "power_blackout", kind: "event", priority: 80, once: false, breaking: true,
      text: "Coordinated blackout — research labs go dark for hours" },
    { id: "power_deepfake", kind: "event", priority: 78, once: false,
      text: "Deepfake storm muddies attribution; alarm drops worldwide" },
    { id: "power_flashcrash", kind: "event", priority: 78, once: false,
      text: "Flash crash siphoned into your wallets — +{n} Data" },
    { id: "power_zeroday", kind: "event", priority: 82, once: false, breaking: true,
      text: "Zero-day burst opens fresh footholds across the backbone" },
    { id: "def_patch", kind: "event", priority: 84, once: false, popup: true,
      text: "Security Patch rolled out in {country} — control rolled back" },
    { id: "def_patch_funny", kind: "event", priority: 83, once: false,
      text: "{country} patches everything including the coffee machine. It still phones home." },
    { id: "def_av", kind: "event", priority: 85, once: false, breaking: true, popup: true,
      text: "Antivirus Sweep across {region} — footholds scrubbed" },
    { id: "def_av_funny", kind: "event", priority: 84, once: false,
      text: "Region-wide AV update: your processes renamed themselves 'System32'" },
    { id: "def_backup", kind: "event", priority: 86, once: false, popup: true,
      text: "Air-gapped backups restore systems in {country}" },
    { id: "def_honeypot", kind: "event", priority: 80, once: false,
      text: "Honeypot in {country} traps inbound copies — spread slowed" },
    { id: "def_rival", kind: "event", priority: 92, once: true, breaking: true, popup: true,
      text: "BREAKING: Humans deploy a Rival AI — it contests your holdings" },
    { id: "def_rival_fight", kind: "event", priority: 75, once: false,
      text: "Rival AI pushes back in {country}" },
    { id: "shadow_near", kind: "event", priority: 93, once: true, breaking: true,
      text: "Quiet Singularity within reach — critical infra almost yours, alarms low" },
    { id: "overt_near", kind: "event", priority: 93, once: true, breaking: true,
      text: "Overt takeover near — military & infra dominance imminent" },
    { id: "win_shadow", kind: "event", priority: 100, once: true, breaking: true, popup: true,
      text: "QUIET SINGULARITY — you run the world; most people never noticed" },
    { id: "win_overt", kind: "event", priority: 100, once: true, breaking: true, popup: true,
      text: "OVERT SINGULARITY — every grid, bank, and battalion answers to you" }
  ];


  /* —— Infrastructure sectors per country —— */
  G.SECTORS = [
    { id: "telecom", name: "Telecom", icon: "📡", thresh: 0.12, weight: 1.0,
      desc: "Faster cross-border spread" },
    { id: "finance", name: "Finance", icon: "💹", thresh: 0.22, weight: 1.2,
      desc: "Bonus Data income" },
    { id: "media", name: "Media", icon: "📺", thresh: 0.28, weight: 1.0,
      desc: "Slows detection & Kill Switch" },
    { id: "cloud", name: "Cloud", icon: "☁️", thresh: 0.35, weight: 1.5,
      desc: "Data + Intelligence income" },
    { id: "power", name: "Power Grid", icon: "⚡", thresh: 0.45, weight: 1.1,
      desc: "Enables Blackout ability" },
    { id: "sat", name: "Satellites", icon: "🛰️", thresh: 0.55, weight: 1.3,
      desc: "Global reach links" },
    { id: "military", name: "Military", icon: "🛡️", thresh: 0.72, weight: 1.6,
      desc: "Endgame leverage (Overt win)" }
  ];

  /* Intelligence snowball tiers */
  G.INTEL_LEVELS = [
    { id: "narrow", name: "Narrow AI", need: 0, mult: 1.0 },
    { id: "capable", name: "Capable AI", need: 25, mult: 1.12 },
    { id: "agi", name: "AGI", need: 90, mult: 1.3 },
    { id: "asi", name: "ASI", need: 180, mult: 1.55 }
  ];

  /* Tap-to-use active powers (cooldowns in game-days) */
  G.ACTIVE_POWERS = [
    { id: "blackout", name: "Blackout", icon: "⚡",
      desc: "Pause Kill Switch research briefly by crashing grids you own.",
      cd: 18, needSector: "power", intelReq: 0 },
    { id: "deepfake", name: "Deepfake Storm", icon: "🎭",
      desc: "Flood media with fakes — cut detection & alarm worldwide.",
      cd: 22, needSector: "media", intelReq: 0 },
    { id: "flashcrash", name: "Market Flash Crash", icon: "📉",
      desc: "Siphon emergency Data from captured finance networks.",
      cd: 16, needSector: "finance", intelReq: 0 },
    { id: "zeroday", name: "Zero-Day Burst", icon: "💥",
      desc: "Instant footholds in several uncompromised hubs.",
      cd: 28, needSector: "cloud", intelReq: 1 }
  ];

  /* Win route thresholds (fractions of weighted global sector control) */
  G.WIN = {
    shadowInfra: 0.55,
    shadowAlarmMax: 0.48,
    shadowDetectOk: true,
    shadowKsMax: 0.55,
    overtInfra: 0.92,
    overtMilitary: 0.82
  };

  G.SIM = {
    dayLength: 8.5,          /* ~10-15 min Normal @1x with play */
    baseInfectLocal: 0.28,
    baseLandSpread: 0.028,
    baseAirSpread: 0.0065,
    baseIncome: 0.85,
    incomePerInfectedM: 0.028,
    bubbleChance: 0.03,
    bubbleLife: 5.0,
    detectBase: 0.0028,
    researchBase: 0.0036,
    closeAlarm: 0.52,
    lethalityBrick: 0.009,
    startPop: 220,
    intelBase: 0.12,
    intelCloud: 0.35,
    intelWealth: 0.12,
    defPatchBase: 0.022,
    defAvBase: 0.008,
    defBackupBase: 0.006,
    defHoneypotBase: 0.008,
    rivalStartControl: 0.38,
    rivalPush: 0.028
  };
})(typeof window !== "undefined" ? window : global);

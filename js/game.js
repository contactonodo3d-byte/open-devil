// Simulation: spread within and between sectors, data points, traits, detection and the Kill Switch.
const Game = {
  state: null,

  start(archetype) {
    const sectors = SECTORS.map(s => ({ ...s, control: 0 }));
    sectors.find(s => s.id === START_SECTOR).control = 0.002;
    const traits = {};
    TRAITS.forEach(t => traits[t.id] = 0);
    this.state = { ai: archetype, sectors, traits, dp: 3, dpAcc: 0, detection: 0, detected: false,
                   kill: 0, over: false, result: null, time: 0 };
  },

  traitCost(id) {
    const t = TRAITS.find(x => x.id === id);
    return t.base * (this.state.traits[id] + 1);
  },

  buy(id) {
    const s = this.state;
    if (s.traits[id] >= MAX_TRAIT) return false;
    const cost = this.traitCost(id);
    if (s.dp < cost) return false;
    s.dp -= cost;
    s.traits[id]++;
    return true;
  },

  // Derived stats from archetype + traits.
  stats() {
    const { ai, traits: t } = this.state;
    return {
      spread: ai.spread * (1 + 0.15 * t.stealth + 0.3 * t.autonomy),
      compute: ai.compute + t.compute,
      detectRate: ai.alarm * (1 - 0.12 * t.stealth) * (1 + 0.25 * t.autonomy),
      killRate: (1 + 0.2 * t.autonomy) * Math.max(0.25, 1 - 0.15 * (t.influence + ai.influence))
    };
  },

  // Chance multiplier to break into a sector given its security and our compute.
  breachFactor(sector, compute) {
    return Math.min(1, Math.pow(compute / sector.security, 1.5));
  },

  update(dt) {
    const s = this.state;
    if (!s || s.over) return;
    s.time += dt;
    const st = this.stats();

    // Growth inside breached sectors (logistic), slowed by hardness.
    for (const c of s.sectors) {
      if (c.control <= 0) continue;
      const bf = this.breachFactor(c, st.compute);
      c.control = Math.min(1, c.control + c.control * (1 - c.control) * st.spread * bf * dt * 1.4 + 0.0004 * dt);
    }
    // Jump to neighboring sectors.
    for (const c of s.sectors) {
      if (c.control < 0.05) continue;
      for (const nId of c.neighbors) {
        const n = s.sectors.find(x => x.id === nId);
        if (n.control > 0) continue;
        const p = st.spread * c.control * this.breachFactor(n, st.compute) * dt * 0.5;
        if (Math.random() < p) n.control = 0.002;
      }
    }
    // Data points: earned as you control more systems.
    s.dpAcc += dt * (0.4 + 3 * this.controlFraction());
    while (s.dpAcc >= 1) { s.dp++; s.dpAcc--; }

    // Detection builds with how much you control; once detected, the Kill Switch fills.
    s.detection = Math.min(100, s.detection + dt * st.detectRate * (2 + 40 * this.controlFraction()));
    if (!s.detected && s.detection >= 100) s.detected = true;
    if (s.detected) s.kill = Math.min(100, s.kill + dt * 2.4 * st.killRate);

    if (this.controlFraction() >= 0.999) this.finish("win");
    else if (s.kill >= 100) this.finish("lose");
  },

  finish(result) { this.state.over = true; this.state.result = result; },

  totalSystems() { return this.state.sectors.reduce((a, c) => a + c.systems, 0); },
  controlled() { return this.state.sectors.reduce((a, c) => a + c.systems * c.control, 0); },
  controlFraction() { return this.controlled() / this.totalSystems(); },
  sectorsBreached() { return this.state.sectors.filter(c => c.control > 0).length; }
};

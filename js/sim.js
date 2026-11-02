/* Open Devil — pure simulation (no DOM / canvas). Works in browser & Node. */
(function (G) {
  "use strict";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(s) { s.seed = (s.seed * 16807) % 2147483647; return (s.seed - 1) / 2147483646; }

  function buildCountryIndex(map) {
    const countries = map.countries.map(function (c, i) {
      return {
        id: i,
        name: c.n,
        iso: c.iso,
        pop: c.pop,
        region: c.r,
        wealth: c.w,
        climate: c.cl,
        centroid: c.c,
        bounds: c.b,
        neighbors: c.nb.slice(),
        polys: c.p,
        dots: c.d,
        infected: 0,
        neutralized: 0,
        closed: false,
        alarm: 0,
        everInfected: false,
        reached50: false,
        reached100: false
      };
    });
    const byIso = {};
    countries.forEach(function (c) { byIso[c.iso] = c; });
    return { countries: countries, byIso: byIso, w: map.w, h: map.h };
  }

  function emptyStats() {
    return {
      infectivity: 1,
      severity: 1,
      autonomy: 1,
      stealth: 1,
      land: 1,
      air: 1,
      rich: 1,
      poor: 1,
      income: 1,
      researchSlow: 0,
      lethality: 0,
      heal: 0
    };
  }

  function recomputeStats(state) {
    const arch = state.archetype;
    const s = emptyStats();
    s.infectivity *= arch.infectivity;
    s.severity *= arch.severity;
    s.autonomy *= arch.autonomy;
    s.stealth *= arch.stealth;
    s.rich *= arch.richBias;
    s.poor *= arch.poorBias;
    s.land *= arch.landBonus;
    s.air *= arch.airBonus;
    state.traitsOwned.forEach(function (id) {
      const t = state.traitById[id];
      if (!t || !t.effects) return;
      Object.keys(t.effects).forEach(function (k) {
        s[k] = (s[k] || 0) + t.effects[k];
      });
    });
    s.infectivity = Math.max(0.05, s.infectivity);
    s.severity = Math.max(0.05, s.severity);
    s.stealth = Math.max(0.05, s.stealth);
    s.land = Math.max(0.05, s.land);
    s.air = Math.max(0.05, s.air);
    s.income = Math.max(0.1, s.income);
    s.lethality = Math.max(0, s.lethality);
    s.heal = Math.max(0, s.heal);
    s.researchSlow = clamp(s.researchSlow, 0, 0.92);
    state.stats = s;
  }

  function createGame(opts) {
    const map = opts.map;
    const world = buildCountryIndex(map);
    const traitById = {};
    G.TRAITS.forEach(function (t) { traitById[t.id] = t; });

    const hubs = [];
    (G.HUB_ISOS || []).forEach(function (iso) {
      if (world.byIso[iso]) hubs.push(world.byIso[iso].id);
    });
    /* Fill hubs if too few */
    if (hubs.length < 18) {
      const sorted = world.countries.slice().sort(function (a, b) {
        return b.wealth * Math.log(b.pop) - a.wealth * Math.log(a.pop);
      });
      for (let i = 0; i < sorted.length && hubs.length < 24; i++) {
        if (hubs.indexOf(sorted[i].id) < 0) hubs.push(sorted[i].id);
      }
    }

    const state = {
      world: world,
      hubs: hubs,
      archetype: opts.archetype,
      difficulty: opts.difficulty,
      traitById: traitById,
      traitsOwned: [],
      stats: emptyStats(),
      data: 18,
      day: 0,
      time: 0,
      speed: 1,
      paused: false,
      detected: false,
      detection: 0,
      killSwitch: 0,
      startCountry: null,
      bubbles: [],
      packets: [],
      news: [],
      newsUsed: {},
      newsCooldown: 0,
      events: [],
      ended: null,
      winDays: null,
      totalInfectedPeak: 0,
      countriesFallen: 0,
      seed: opts.seed || 1337,
      lastIncomeAcc: 0,
      researchTeams: 0,
      milestones: {}
    };
    recomputeStats(state);
    return state;
  }

  function startInCountry(state, countryId) {
    const c = state.world.countries[countryId];
    if (!c) return false;
    const n = Math.min(c.pop, G.SIM.startPop + Math.floor(c.pop * 0.00001));
    c.infected = n;
    c.everInfected = true;
    state.startCountry = countryId;
    pushNews(state, "start", { c: c.name });
    return true;
  }

  function pushNews(state, id, vars) {
    const tpl = G.HEADLINES.find(function (h) { return h.id === id; });
    if (!tpl) return;
    if (tpl.once && state.newsUsed[id]) return;
    state.newsUsed[id] = true;
    let text = tpl.text;
    vars = vars || {};
    vars.a = vars.a || (state.archetype && state.archetype.name) || "Open Devil";
    Object.keys(vars).forEach(function (k) {
      text = text.split("{" + k + "}").join(String(vars[k]));
    });
    state.news.unshift({ t: state.day, text: text, id: id });
    if (state.news.length > 40) state.news.length = 40;
    state.events.push({ type: "news", text: text });
  }

  function maybeFlavor(state, dt) {
    state.newsCooldown -= dt;
    if (state.newsCooldown > 0) return;
    if (rnd(state) > 0.08 * dt) return;
    const flavors = G.HEADLINES.filter(function (h) {
      return h.id.indexOf("flavor_") === 0 && !state.newsUsed[h.id + "_" + Math.floor(state.day)];
    });
    if (!flavors.length) return;
    const pick = flavors[Math.floor(rnd(state) * flavors.length)];
    const infected = state.world.countries.filter(function (c) { return c.infected > 0; });
    const c = infected.length ? infected[Math.floor(rnd(state) * infected.length)] : state.world.countries[0];
    pushNews(state, pick.id, { c: c.name });
    state.newsCooldown = 4 + rnd(state) * 8;
  }

  function traitCost(state, trait) {
    const owned = state.traitsOwned.length;
    return Math.round(trait.cost * (1 + owned * 0.04));
  }

  function canBuyTrait(state, id) {
    const t = state.traitById[id];
    if (!t) return false;
    if (state.traitsOwned.indexOf(id) >= 0) return false;
    if (state.data < traitCost(state, t)) return false;
    return t.prereq.every(function (p) { return state.traitsOwned.indexOf(p) >= 0; });
  }

  function buyTrait(state, id) {
    if (!canBuyTrait(state, id)) return false;
    const t = state.traitById[id];
    const cost = traitCost(state, t);
    state.data -= cost;
    state.traitsOwned.push(id);
    recomputeStats(state);
    const tabHint = t.tab === "vectors" ? "trait_vector" : t.tab === "behaviors" ? "trait_behavior" : "trait_ability";
    pushNews(state, tabHint, { n: t.name });
    state.events.push({ type: "trait", id: id });
    return true;
  }

  function canDevolve(state, id) {
    if (state.traitsOwned.indexOf(id) < 0) return false;
    /* cannot devolve if something depends on it */
    return !G.TRAITS.some(function (t) {
      return state.traitsOwned.indexOf(t.id) >= 0 && t.prereq.indexOf(id) >= 0;
    });
  }

  function devolveTrait(state, id) {
    if (!canDevolve(state, id)) return false;
    const t = state.traitById[id];
    const refund = Math.floor(traitCost(state, t) * (1 - G.DEVOLVE_FEE));
    state.traitsOwned = state.traitsOwned.filter(function (x) { return x !== id; });
    state.data += refund;
    recomputeStats(state);
    state.events.push({ type: "devolve", id: id, refund: refund });
    return true;
  }

  function countryInfectRate(state, c) {
    const s = state.stats;
    const wealthMod = c.wealth >= 3 ? s.rich : s.poor;
    const sec = 0.55 + c.wealth * 0.12; /* higher wealth = harder initially */
    const dm = (state.difficulty && state.difficulty.infectMult) || 1;
    return s.infectivity * wealthMod * dm / sec;
  }

  function totals(state) {
    let pop = 0, inf = 0, neu = 0, healthy = 0, countriesInf = 0, countriesFull = 0;
    state.world.countries.forEach(function (c) {
      pop += c.pop;
      inf += c.infected;
      neu += c.neutralized;
      healthy += Math.max(0, c.pop - c.infected - c.neutralized);
      if (c.infected > 0 || c.neutralized > 0) countriesInf++;
      if (c.infected + c.neutralized >= c.pop * 0.995) countriesFull++;
    });
    return {
      pop: pop,
      infected: inf,
      neutralized: neu,
      healthy: healthy,
      control: (inf + neu) / pop,
      infectPct: inf / pop,
      countriesInf: countriesInf,
      countriesFull: countriesFull,
      countries: state.world.countries.length
    };
  }

  function spawnBubble(state, c, kind) {
    /* kind: 'infect' | 'cure' */
    const life = G.SIM.bubbleLife * (0.85 + rnd(state) * 0.3);
    const value = kind === "infect"
      ? Math.round(2 + rnd(state) * 5 + Math.log10(Math.max(10, c.infected)) * 1.5)
      : Math.round(3 + rnd(state) * 4);
    state.bubbles.push({
      id: Math.floor(rnd(state) * 1e9),
      country: c.id,
      x: c.centroid[0] + (rnd(state) - 0.5) * 40,
      y: c.centroid[1] + (rnd(state) - 0.5) * 30,
      kind: kind,
      value: value,
      life: life,
      maxLife: life
    });
  }

  function tapBubble(state, bubbleId) {
    const i = state.bubbles.findIndex(function (b) { return b.id === bubbleId; });
    if (i < 0) return null;
    const b = state.bubbles[i];
    state.bubbles.splice(i, 1);
    if (b.kind === "infect") {
      state.data += b.value;
      return { type: "data", value: b.value };
    }
    /* cure-style: slow kill switch */
    const slow = 0.012 + b.value * 0.002;
    state.killSwitch = Math.max(0, state.killSwitch - slow);
    pushNews(state, "bubble_slow", {});
    return { type: "slow", value: slow };
  }

  function launchPacket(state, fromId, toId) {
    const a = state.world.countries[fromId];
    const b = state.world.countries[toId];
    if (!a || !b || b.closed) return;
    const dist = Math.hypot(a.centroid[0] - b.centroid[0], a.centroid[1] - b.centroid[1]);
    const dur = clamp(dist / 280, 1.2, 5.5);
    state.packets.push({
      from: fromId,
      to: toId,
      t: 0,
      dur: dur,
      x0: a.centroid[0],
      y0: a.centroid[1],
      x1: b.centroid[0],
      y1: b.centroid[1]
    });
  }

  function tryAirSeed(state, dt) {
    const s = state.stats;
    const airPow = Math.max(0.15, s.air); /* traits stack air */
    const rate = G.SIM.baseAirSpread * airPow * airPow * s.infectivity * dt;
    const infectedHubs = state.hubs.filter(function (id) {
      const c = state.world.countries[id];
      return c.infected > c.pop * 0.005 && !c.closed;
    });
    if (!infectedHubs.length) return;
    infectedHubs.forEach(function (hid) {
      const src = state.world.countries[hid];
      if (rnd(state) > rate * (0.7 + src.infected / src.pop * 2.5)) return;
      let targets = state.hubs.filter(function (tid) {
        const t = state.world.countries[tid];
        return tid !== hid && !t.closed && t.infected < t.pop * 0.6;
      });
      /* sometimes seed a random uninfected / low country (islands etc.) */
      if (!targets.length || rnd(state) < 0.35) {
        const extras = [];
        state.world.countries.forEach(function (t) {
          if (t.id === hid || t.closed) return;
          if (t.infected < t.pop * 0.1) extras.push(t.id);
        });
        if (extras.length) targets = extras;
      }
      if (!targets.length) return;
      const tid = targets[Math.floor(rnd(state) * targets.length)];
      launchPacket(state, hid, tid);
    });
  }

  function applyPacketArrival(state, pkt) {
    const t = state.world.countries[pkt.to];
    if (!t || t.closed) return;
    const seed = Math.max(120, Math.floor(t.pop * 0.000015 * state.stats.infectivity * 60));
    if (t.infected <= 0) {
      t.infected = Math.min(t.pop, seed);
      t.everInfected = true;
      pushNews(state, "hub_seed", { c: t.name });
      if (rnd(state) < 0.6 * state.difficulty.bubbleMult) spawnBubble(state, t, "infect");
    } else {
      t.infected = Math.min(t.pop - t.neutralized, t.infected + seed);
    }
  }

  function stepCountry(state, c, dt) {
    const s = state.stats;
    const healthy = Math.max(0, c.pop - c.infected - c.neutralized);
    if (c.infected > 0 && healthy > 0) {
      const rate = G.SIM.baseInfectLocal * countryInfectRate(state, c);
      /* logistic growth + boost while a tiny foothold so countries don't stall */
      const frac = c.infected / c.pop;
      const logistic = c.infected * rate * (healthy / c.pop) * dt;
      const foothold = (frac < 0.02) ? Math.min(healthy, c.pop * 0.0008 * rate * dt) : 0;
      const move = Math.min(healthy, logistic + foothold);
      c.infected += move;
    }
    /* land spread */
    if (c.infected > c.pop * 0.008) {
      c.neighbors.forEach(function (nid) {
        const n = state.world.countries[nid];
        if (!n || n.closed) return;
        const chance = G.SIM.baseLandSpread * s.land * s.land * s.infectivity * Math.min(1, c.infected / c.pop * 2.5) * dt;
        if (rnd(state) < chance) {
          const seed = Math.max(80, Math.floor(n.pop * 0.00001 * s.infectivity * 80));
          if (n.infected <= 0) {
            n.infected = Math.min(n.pop, seed);
            n.everInfected = true;
            if (rnd(state) < 0.45 * state.difficulty.bubbleMult) spawnBubble(state, n, "infect");
          } else if (n.infected < n.pop * 0.3) {
            n.infected = Math.min(n.pop - n.neutralized, n.infected + seed);
          }
        }
      });
    }
    /* lethality / neutralization */
    if (s.lethality > 0 && c.infected > 0) {
      const brick = c.infected * G.SIM.lethalityBrick * s.lethality * dt;
      const healed = brick * s.heal;
      const net = Math.max(0, brick - healed);
      const take = Math.min(c.infected, net);
      c.infected -= take;
      c.neutralized += take;
    }
    /* alarm / close borders */
    const control = (c.infected + c.neutralized) / c.pop;
    c.alarm = clamp(s.severity * control * (state.detected ? 1.2 : 0.6), 0, 1);
    const closeNeed = G.SIM.closeAlarm * state.difficulty.closeDelay;
    if (!c.closed && state.detected && c.alarm > closeNeed && control > 0.15 && control < 0.92) {
      if (rnd(state) < 0.08 * dt) {
        c.closed = true;
        pushNews(state, "border_close", { c: c.name });
      }
    }
    /* milestones */
    if (c.everInfected && !c.reached50 && control >= 0.5) {
      c.reached50 = true;
      pushNews(state, "country_50", { c: c.name });
    }
    if (!c.reached100 && control >= 0.995) {
      c.reached100 = true;
      state.countriesFallen++;
      pushNews(state, "country_100", { c: c.name });
    }
    if (c.neutralized > c.pop * 0.05 && rnd(state) < 0.01 * dt) {
      pushNews(state, "neutralized", { c: c.name });
    }
    /* bubbles */
    if (c.infected > 0 && rnd(state) < G.SIM.bubbleChance * state.difficulty.bubbleMult * dt) {
      spawnBubble(state, c, "infect");
    }
    if (state.detected && state.killSwitch > 0.05 && c.wealth >= 3 && c.infected < c.pop * 0.5) {
      if (rnd(state) < 0.006 * state.difficulty.bubbleMult * dt) spawnBubble(state, c, "cure");
    }
  }

  function stepDetectionResearch(state, dt, tot) {
    const s = state.stats;
    const d = state.difficulty;
    if (!state.detected) {
      const noise = G.SIM.detectBase * s.severity / s.stealth * (0.5 + tot.control * 2) * dt;
      state.detection += noise;
      if (state.detection >= d.detectThresh || tot.control > 0.15 / s.stealth) {
        state.detected = true;
        pushNews(state, "detect", {});
      }
      return;
    }
    /* research teams = wealthy uncompromised countries */
    let teams = 0;
    let researchPower = 0;
    state.world.countries.forEach(function (c) {
      const free = 1 - (c.infected + c.neutralized) / c.pop;
      if (free < 0.2) return;
      const w = c.wealth;
      if (w >= 3) {
        teams++;
        researchPower += free * (0.25 + w * 0.2) * Math.log10(Math.max(1e6, c.pop)) / 12;
      } else if (w === 2) {
        teams++;
        researchPower += free * 0.15 * Math.log10(Math.max(1e6, c.pop)) / 12;
      }
    });
    state.researchTeams = teams;
    /* global collapse penalty: as control rises, labs go dark */
    const collapse = Math.max(0.08, 1 - tot.control * 1.05);
    const slow = 1 - s.researchSlow;
    const rate = G.SIM.researchBase * d.researchMult * researchPower * collapse * slow *
      (0.55 + s.severity * 0.2) * dt;
    const prev = state.killSwitch;
    state.killSwitch = clamp(state.killSwitch + rate, 0, 1);
    const marks = [
      [0.1, "research_10"], [0.25, "research_25"], [0.5, "research_50"],
      [0.75, "research_75"], [0.9, "research_90"]
    ];
    marks.forEach(function (m) {
      if (prev < m[0] && state.killSwitch >= m[0]) pushNews(state, m[1], {});
    });
    if (state.killSwitch >= 0.95 && !state.milestones.lose_near) {
      state.milestones.lose_near = true;
      pushNews(state, "lose_near", {});
    }
  }

  function stepIncome(state, dt, tot) {
    const s = state.stats;
    const d = state.difficulty;
    const infectedM = tot.infected / 1e6;
    const gain = (G.SIM.baseIncome + infectedM * G.SIM.incomePerInfectedM) * s.income * d.incomeMult * dt;
    state.lastIncomeAcc += gain;
    if (state.lastIncomeAcc >= 1) {
      const add = Math.floor(state.lastIncomeAcc);
      state.data += add;
      state.lastIncomeAcc -= add;
    }
  }

  function checkMilestones(state, tot) {
    const marks = [
      [0.1, "pop_control_10"], [0.25, "pop_control_25"], [0.5, "pop_control_50"],
      [0.75, "pop_control_75"], [0.9, "pop_control_90"]
    ];
    marks.forEach(function (m) {
      if (!state.milestones[m[1]] && tot.control >= m[0]) {
        state.milestones[m[1]] = true;
        pushNews(state, m[1], {});
      }
    });
    if (tot.control >= 0.97 && !state.milestones.win_near) {
      state.milestones.win_near = true;
      pushNews(state, "win_near", {});
    }
    if (state.day >= 30 && !state.milestones.day_30) {
      state.milestones.day_30 = true;
      pushNews(state, "day_30", {});
    }
    if (state.day >= 60 && !state.milestones.day_60) {
      state.milestones.day_60 = true;
      pushNews(state, "day_60", {});
    }
    if (state.day >= 100 && !state.milestones.day_100) {
      state.milestones.day_100 = true;
      pushNews(state, "day_100", {});
    }
  }

  function checkEnd(state, tot) {
    if (state.ended) return;
    if (tot.control >= 0.995) {
      state.ended = "win";
      state.winDays = Math.floor(state.day);
      state.paused = true;
      return;
    }
    if (state.killSwitch >= 1) {
      state.ended = "lose";
      state.paused = true;
    }
  }

  function tick(state, realDt) {
    if (state.ended || state.paused || state.speed <= 0) {
      /* still age bubbles visually? skip */
      return totals(state);
    }
    const dt = realDt * state.speed / G.SIM.dayLength; /* in game-days */
    state.time += realDt * state.speed;
    state.day += dt;

    /* packets */
    for (let i = state.packets.length - 1; i >= 0; i--) {
      const p = state.packets[i];
      p.t += realDt * state.speed;
      if (p.t >= p.dur) {
        applyPacketArrival(state, p);
        state.packets.splice(i, 1);
      }
    }

    /* bubbles expire */
    for (let i = state.bubbles.length - 1; i >= 0; i--) {
      state.bubbles[i].life -= realDt;
      if (state.bubbles[i].life <= 0) state.bubbles.splice(i, 1);
    }

    state.world.countries.forEach(function (c) { stepCountry(state, c, dt); });
    tryAirSeed(state, dt);

    const tot = totals(state);
    stepDetectionResearch(state, dt, tot);
    stepIncome(state, dt, tot);
    checkMilestones(state, tot);
    maybeFlavor(state, dt);
    checkEnd(state, tot);
    state.totalInfectedPeak = Math.max(state.totalInfectedPeak, tot.infected + tot.neutralized);
    return tot;
  }

  /* Auto-play helper for balance tests: buy cheapest useful traits over time */
  function autoPlayPolicy(state) {
    if (state.ended) return;
    const tot = totals(state);
    /* delay loud late behaviors until well spread */
    const lateOk = tot.control > 0.45 || state.killSwitch > 0.55;
    const order = [
      "email", "encrypt", "usb", "iot", "poly", "waterhole", "exfil", "crypto",
      "media", "sat", "supply", "repair", "lobby", "airgap", "cable", "hardensec",
      "zeroclick", "ghost"
    ];
    const late = ["ransom", "deepfake", "grid", "market", "brick", "singularity"];
    const list = lateOk ? order.concat(late) : order;
    for (let i = 0; i < list.length; i++) {
      if (canBuyTrait(state, list[i])) {
        buyTrait(state, list[i]);
        return;
      }
    }
    if (!lateOk) {
      for (let i = 0; i < late.length; i++) {
        if (canBuyTrait(state, late[i]) && state.data > 80) {
          buyTrait(state, late[i]);
          return;
        }
      }
    }
  }

  function runHeadless(opts) {
    const state = createGame(opts);
    const startId = opts.startId != null
      ? opts.startId
      : state.world.countries.findIndex(function (c) { return c.iso === (opts.startIso || "USA"); });
    startInCountry(state, startId >= 0 ? startId : 0);
    state.speed = opts.speed || 1;
    const maxDays = opts.maxDays || 400;
    const step = opts.step || 0.25; /* game days per tick */
    const realStep = step * G.SIM.dayLength;
    let ticks = 0;
    const buyEvery = opts.buyEvery != null ? opts.buyEvery : 3; /* days */
    let nextBuy = 5;
    while (!state.ended && state.day < maxDays && ticks < 200000) {
      tick(state, realStep);
      if (opts.autoPlay && state.day >= nextBuy) {
        autoPlayPolicy(state);
        nextBuy = state.day + buyEvery;
      }
      ticks++;
    }
    const tot = totals(state);
    return {
      ended: state.ended,
      day: state.day,
      killSwitch: state.killSwitch,
      control: tot.control,
      data: state.data,
      traits: state.traitsOwned.slice(),
      countriesFallen: state.countriesFallen,
      countriesInf: tot.countriesInf,
      detected: state.detected,
      researchTeams: state.researchTeams,
      ticks: ticks
    };
  }

  G.Sim = {
    createGame: createGame,
    startInCountry: startInCountry,
    tick: tick,
    totals: totals,
    buyTrait: buyTrait,
    canBuyTrait: canBuyTrait,
    traitCost: traitCost,
    canDevolve: canDevolve,
    devolveTrait: devolveTrait,
    tapBubble: tapBubble,
    pushNews: pushNews,
    runHeadless: runHeadless,
    recomputeStats: recomputeStats,
    autoPlayPolicy: autoPlayPolicy
  };
})(typeof window !== "undefined" ? window : global);

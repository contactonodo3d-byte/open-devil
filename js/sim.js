/* Open Devil — pure simulation (no DOM / canvas). Works in browser & Node. */
(function (G) {
  "use strict";

  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function rnd(s) { s.seed = (s.seed * 16807) % 2147483647; return (s.seed - 1) / 2147483646; }

  function buildCountryIndex(map) {
    const countries = map.countries.map(function (c, i) {
      const sectors = {};
      (G.SECTORS || []).forEach(function (sec) { sectors[sec.id] = false; });
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
        reached100: false,
        sectors: sectors,
        honeypot: 0,
        researchPause: 0,
        rivalPressure: 0
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
      newsLog: [],
      newsUsed: {},
      flavorUsed: {},
      newsCooldown: 8,
      tickerPriorityUntil: 0,
      pendingBreaking: null,
      pendingPopup: null,
      uiFx: [],
      events: [],
      ended: null,
      winDays: null,
      totalInfectedPeak: 0,
      countriesFallen: 0,
      seed: opts.seed || 1337,
      lastIncomeAcc: 0,
      researchTeams: 0,
      milestones: {},
      intelligence: 0,
      intelLevel: 0,
      powerCd: {},
      blackoutTimer: 0,
      deepfakeTimer: 0,
      rivalActive: false,
      winRoute: null,
      globalAlarm: 0,
      sectorCounts: {}
    };
    (G.ACTIVE_POWERS || []).forEach(function (pw) { state.powerCd[pw.id] = 0; });
    (G.SECTORS || []).forEach(function (sec) { state.sectorCounts[sec.id] = 0; });

    recomputeStats(state);
    return state;
  }

  function startInCountry(state, countryId) {
    const c = state.world.countries[countryId];
    if (!c || state.startCountry !== null || state.ended) return false;
    const n = Math.min(c.pop, G.SIM.startPop + Math.floor(c.pop * 0.00001));
    c.infected = n;
    c.everInfected = true;
    state.startCountry = countryId;
    pushNews(state, "start", { country: c.name });
    const archNews = "start_" + (state.archetype && state.archetype.id);
    pushNews(state, archNews, { country: c.name });
    if (state.difficulty) {
      if (state.difficulty.id === "casual") pushNews(state, "diff_casual", {});
      if (state.difficulty.id === "brutal") pushNews(state, "diff_brutal", {});
    }
    state.uiFx.push({ type: "breach", country: countryId, t: 0 });
    return true;
  }

  function headlineById(id) {
    return G.HEADLINES.find(function (h) { return h.id === id; });
  }

  function fillTemplate(text, vars) {
    Object.keys(vars).forEach(function (k) {
      text = text.split("{" + k + "}").join(String(vars[k]));
    });
    /* aliases */
    if (vars.country) text = text.split("{c}").join(String(vars.country));
    if (vars.archetype) text = text.split("{a}").join(String(vars.archetype));
    return text;
  }

  function newsVars(state, extra) {
    const v = Object.assign({
      country: "Unknown",
      c: "Unknown",
      archetype: (state.archetype && state.archetype.name) || "Open Devil",
      a: (state.archetype && state.archetype.name) || "Open Devil",
      day: Math.floor(state.day),
      pct: "0",
      n: "0",
      trait: ""
    }, extra || {});
    if (extra && extra.c && !extra.country) { v.country = extra.c; v.c = extra.c; }
    if (extra && extra.country) { v.c = extra.country; }
    if (extra && extra.a && !extra.archetype) v.archetype = extra.a;
    return v;
  }

  function pushNews(state, id, vars) {
    const tpl = headlineById(id);
    if (!tpl) return null;
    if (tpl.once && state.newsUsed[id]) return null;
    /* flavor/event repeat tracking */
    if (tpl.kind === "flavor") {
      if (state.flavorUsed[id]) return null;
    } else if (tpl.once) {
      state.newsUsed[id] = true;
    } else {
      /* rate-limit non-once events of same id */
      const key = id + ":" + ((vars && (vars.country || vars.c)) || "");
      if (state.newsUsed[key] && (state.day - (state.newsUsed[key] || 0)) < 3) return null;
      state.newsUsed[key] = state.day;
      if (tpl.once) state.newsUsed[id] = true;
    }
    if (tpl.once) state.newsUsed[id] = true;
    if (tpl.kind === "flavor") state.flavorUsed[id] = true;

    const filled = fillTemplate(tpl.text, newsVars(state, vars));
    const item = {
      t: state.day,
      text: filled,
      id: id,
      kind: tpl.kind || "event",
      priority: tpl.priority || 10,
      breaking: !!tpl.breaking,
      popup: !!tpl.popup
    };
    state.news.unshift(item);
    if (state.news.length > 80) state.news.length = 80;
    state.newsLog.unshift(item);
    if (state.newsLog.length > 120) state.newsLog.length = 120;
    state.events.push({ type: "news", item: item });
    if (item.breaking) state.pendingBreaking = item;
    if (item.popup) state.pendingPopup = item;
    state.tickerPriorityUntil = Math.max(state.tickerPriorityUntil || 0, state.time + 4);
    return item;
  }

  /** Pick funny alternate sometimes for event families */
  function pushNewsPair(state, id, funnyId, vars) {
    const a = pushNews(state, id, vars);
    if (funnyId && rnd(state) < 0.55) pushNews(state, funnyId, vars);
    return a;
  }

  function resetFlavorPool(state) {
    state.flavorUsed = {};
  }

  function pickFlavorCountry(state) {
    const infected = state.world.countries.filter(function (c) { return c.infected > 0; });
    const pool = infected.length ? infected : state.world.countries;
    return pool[Math.floor(rnd(state) * pool.length)];
  }

  function maybeFlavor(state, realDt) {
    /* cooldown in game-seconds (real * speed) */
    const gameSec = realDt * (state.paused || state.speed <= 0 ? 0 : state.speed);
    state.newsCooldown -= gameSec;
    if (state.newsCooldown > 0) return;
    if (state.tickerPriorityUntil && state.time < state.tickerPriorityUntil) {
      state.newsCooldown = 2;
      return;
    }
    let flavors = G.HEADLINES.filter(function (h) {
      if (h.kind !== "flavor") return false;
      if (state.flavorUsed[h.id]) return false;
      if (h.phase === "stealth" && state.detected) return false;
      if (h.phase === "detected" && !state.detected) return false;
      return true;
    });
    if (!flavors.length) {
      resetFlavorPool(state);
      flavors = G.HEADLINES.filter(function (h) {
        return h.kind === "flavor" && !(h.phase === "stealth" && state.detected);
      });
    }
    if (!flavors.length) return;
    const pick = flavors[Math.floor(rnd(state) * flavors.length)];
    const c = pickFlavorCountry(state);
    pushNews(state, pick.id, { country: c.name });
    state.newsCooldown = 15 + rnd(state) * 15; /* 15–30 game-seconds */
  }

  function emitHoldouts(state, tot) {
    const un = state.world.countries.filter(function (c) {
      return (c.infected + c.neutralized) / c.pop < 0.02;
    });
    if (un.length === 1 && !state.milestones.holdout_last) {
      state.milestones.holdout_last = true;
      pushNews(state, "holdout_last", { country: un[0].name });
    } else if (un.length > 0 && un.length <= 5 && tot.control > 0.85) {
      if (!state.milestones["holdout_" + un.length] || state.day - state.milestones["holdout_" + un.length] > 12) {
        state.milestones["holdout_" + un.length] = state.day;
        const c = un[Math.floor(rnd(state) * un.length)];
        pushNews(state, "holdout", { country: c.name });
      }
    }
  }

  function traitCost(state, trait) {
    const owned = state.traitsOwned.length;
    return Math.round(trait.cost * (1 + owned * 0.04));
  }

  function canBuyTrait(state, id) {
    if (state.ended) return false;
    const t = state.traitById[id];
    if (!t) return false;
    if (state.traitsOwned.indexOf(id) >= 0) return false;
    if (state.data < traitCost(state, t)) return false;
    if (t.intelReq && state.intelLevel < t.intelReq) return false;
    return t.prereq.every(function (p) { return state.traitsOwned.indexOf(p) >= 0; });
  }

  function buyTrait(state, id) {
    if (!canBuyTrait(state, id)) return false;
    const t = state.traitById[id];
    const cost = traitCost(state, t);
    state.data -= cost;
    state.traitsOwned.push(id);
    recomputeStats(state);
    const specific = "trait_" + id;
    if (!pushNews(state, specific, { trait: t.name, n: t.name })) {
      const tabHint = t.tab === "vectors" ? "trait_vector" : t.tab === "behaviors" ? "trait_behavior" : "trait_ability";
      pushNews(state, tabHint, { trait: t.name, n: t.name });
    }
    if (t.effects && t.effects.researchSlow) {
      if (rnd(state) < 0.7) pushNews(state, rnd(state) < 0.5 ? "ks_slowed" : "ks_slowed_funny", {});
    }
    state.events.push({ type: "trait", id: id });
    state.uiFx.push({ type: "evolve", id: id, t: 0 });
    return true;
  }

  function canDevolve(state, id) {
    if (state.ended) return false;
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
    const st = state.stats;
    const wealthMod = c.wealth >= 3 ? st.rich : st.poor;
    const sec = 0.55 + c.wealth * 0.12;
    const dm = (state.difficulty && state.difficulty.infectMult) || 1;
    const intelM = intelMult(state);
    let rate = st.infectivity * wealthMod * dm * intelM / sec;
    if (c.honeypot > 0) rate *= 0.35;
    return rate;
  }

  function intelMult(state) {
    const levels = G.INTEL_LEVELS || [];
    const lv = levels[state.intelLevel] || levels[0] || { mult: 1 };
    return lv.mult || 1;
  }

  function countryCtrl(c) {
    return (c.infected + c.neutralized) / Math.max(1, c.pop);
  }

  function countOwnedSectors(state, sectorId) {
    let n = 0;
    state.world.countries.forEach(function (c) {
      if (c.sectors && c.sectors[sectorId]) n++;
    });
    return n;
  }

  function sectorProgress(state) {
    const secs = G.SECTORS || [];
    const counts = {};
    let weightedOwned = 0, weightedTotal = 0;
    let critOwned = 0, critTotal = 0;
    let milOwned = 0, milTotal = 0;
    const crit = { cloud: 1, telecom: 1, finance: 1, media: 1, sat: 1 };
    secs.forEach(function (sec) { counts[sec.id] = 0; });
    state.world.countries.forEach(function (c) {
      const w = (0.6 + c.wealth * 0.35) * Math.log10(Math.max(10, c.pop));
      secs.forEach(function (sec) {
        weightedTotal += w * sec.weight;
        if (crit[sec.id]) critTotal += w * sec.weight;
        if (sec.id === "military") milTotal += w * sec.weight;
        if (c.sectors && c.sectors[sec.id]) {
          counts[sec.id]++;
          weightedOwned += w * sec.weight;
          if (crit[sec.id]) critOwned += w * sec.weight;
          if (sec.id === "military") milOwned += w * sec.weight;
        }
      });
    });
    state.sectorCounts = counts;
    return {
      counts: counts,
      infra: weightedTotal > 0 ? weightedOwned / weightedTotal : 0,
      critical: critTotal > 0 ? critOwned / critTotal : 0,
      military: milTotal > 0 ? milOwned / milTotal : 0
    };
  }

  function totals(state) {
    let pop = 0, inf = 0, neu = 0, healthy = 0, countriesInf = 0, countriesFull = 0;
    let alarmSum = 0, alarmN = 0;
    state.world.countries.forEach(function (c) {
      pop += c.pop;
      inf += c.infected;
      neu += c.neutralized;
      healthy += Math.max(0, c.pop - c.infected - c.neutralized);
      if (c.infected > 0 || c.neutralized > 0) countriesInf++;
      if (c.infected + c.neutralized >= c.pop * 0.995) countriesFull++;
      if (c.everInfected) { alarmSum += c.alarm; alarmN++; }
    });
    const sp = sectorProgress(state);
    const globalAlarm = alarmN ? alarmSum / alarmN : 0;
    state.globalAlarm = globalAlarm;
    return {
      pop: pop,
      infected: inf,
      neutralized: neu,
      healthy: healthy,
      control: (inf + neu) / Math.max(1, pop),
      infectPct: inf / Math.max(1, pop),
      countriesInf: countriesInf,
      countriesFull: countriesFull,
      countries: state.world.countries.length,
      infra: sp.infra,
      critical: sp.critical,
      military: sp.military,
      sectorCounts: sp.counts,
      globalAlarm: globalAlarm,
      intelligence: state.intelligence,
      intelLevel: state.intelLevel
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
    if (state.ended) return null;
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
    pushNewsPair(state, "bubble_slow", "bubble_slow_funny", {});
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
      pushNewsPair(state, "hub_seed", "hub_seed_funny", { country: t.name });
      state.uiFx.push({ type: "breach", country: t.id, t: 0 });
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
        const telBonus = 1 + Math.min(0.85, countOwnedSectors(state, "telecom") * 0.04);
        const satBonus = 1 + Math.min(0.4, countOwnedSectors(state, "sat") * 0.03);
        let chance = G.SIM.baseLandSpread * s.land * s.land * s.infectivity * telBonus * intelMult(state) * Math.min(1, c.infected / c.pop * 2.5) * dt;
        if (n.honeypot > 0) chance *= 0.25;
        if (rnd(state) < chance) {
          const seed = Math.max(80, Math.floor(n.pop * 0.00001 * s.infectivity * 80 * satBonus));
          if (n.infected <= 0) {
            n.infected = Math.min(n.pop, seed);
            n.everInfected = true;
            pushNewsPair(state, "first_country", "first_country_funny", { country: n.name });
            state.uiFx.push({ type: "breach", country: n.id, t: 0 });
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
    let alarm = s.severity * control * (state.detected ? 1.15 : 0.55) / Math.max(0.5, s.stealth);
    if (c.sectors.media) alarm *= 0.65;
    if (state.deepfakeTimer > 0) alarm *= 0.5;
    c.alarm = clamp(alarm, 0, 1);
    const closeNeed = G.SIM.closeAlarm * state.difficulty.closeDelay;
    if (!c.closed && state.detected && c.alarm > closeNeed && control > 0.15 && control < 0.92) {
      if (rnd(state) < 0.08 * dt) {
        c.closed = true;
        pushNewsPair(state, "border_close", "border_close_funny", { country: c.name });
        state.uiFx.push({ type: "airgap", country: c.id, t: 0 });
      }
    }
    /* milestones */
    if (c.everInfected && !c.reached50 && control >= 0.5) {
      c.reached50 = true;
      pushNewsPair(state, "country_50", "country_50_funny", { country: c.name });
    }
    if (!c.reached100 && control >= 0.995) {
      c.reached100 = true;
      state.countriesFallen++;
      pushNewsPair(state, "country_100", "country_100_funny", { country: c.name });
      state.uiFx.push({ type: "fall", country: c.id, t: 0 });
      if (c.wealth >= 3) pushNews(state, "rich_fall", { country: c.name });
    }
    if (c.neutralized > c.pop * 0.05 && rnd(state) < 0.01 * dt) {
      pushNewsPair(state, "neutralized", "neutralized_funny", { country: c.name });
    }
    /* bubbles */
    if (c.infected > 0 && rnd(state) < G.SIM.bubbleChance * state.difficulty.bubbleMult * dt) {
      spawnBubble(state, c, "infect");
    }
    if (state.detected && state.killSwitch > 0.05 && c.wealth >= 3 && c.infected < c.pop * 0.5) {
      if (rnd(state) < 0.006 * state.difficulty.bubbleMult * dt) spawnBubble(state, c, "cure");
    }
    /* capture infrastructure sectors by control thresholds */
    updateCountrySectors(state, c, control);
    if (c.researchPause > 0) c.researchPause = Math.max(0, c.researchPause - dt);
    if (c.honeypot > 0) c.honeypot = Math.max(0, c.honeypot - dt);
  }

  function updateCountrySectors(state, c, control) {
    (G.SECTORS || []).forEach(function (sec) {
      if (c.sectors[sec.id]) return;
      /* rich countries harder / need slightly more control for military */
      let need = sec.thresh;
      if (sec.id === "military") need = Math.min(0.92, need + 0.06 + (4 - c.wealth) * 0.025);
      if (sec.id === "cloud" && c.wealth < 2) need += 0.08;
      if (sec.id === "sat") need += (c.wealth < 3 ? 0.08 : 0);
      if (control >= need) {
        c.sectors[sec.id] = true;
        pushNews(state, "sector_" + sec.id, { country: c.name });
        state.uiFx.push({ type: "sector", country: c.id, sector: sec.id, t: 0 });
      }
    });
  }

  function stepDetectionResearch(state, dt, tot) {
    const s = state.stats;
    const d = state.difficulty;
    if (!state.detected) {
      const mediaN = countOwnedSectors(state, "media");
      const mediaSlow = 1 / (1 + mediaN * 0.04);
      const df = state.deepfakeTimer > 0 ? 0.45 : 1;
      const noise = G.SIM.detectBase * s.severity / s.stealth * (0.5 + tot.control * 2) * mediaSlow * df * dt;
      state.detection += noise;
      if (state.detection >= d.detectThresh || tot.control > 0.18 / s.stealth) {
        state.detected = true;
        pushNews(state, "detect", {});
        pushNews(state, "detect_funny", {});
        state.uiFx.push({ type: "detect", t: 0 });
      }
      return;
    }
    /* research teams = wealthy uncompromised countries */
    let teams = 0;
    let researchPower = 0;
    state.world.countries.forEach(function (c) {
      const free = 1 - (c.infected + c.neutralized) / c.pop;
      if (free < 0.2) return;
      if (c.researchPause > 0) return;
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
    const collapse = Math.max(0.08, 1 - tot.control * 1.05);
    const slow = 1 - s.researchSlow;
    const mediaN = countOwnedSectors(state, "media");
    const mediaSlow = 1 / (1 + mediaN * 0.035);
    const blackout = state.blackoutTimer > 0 ? 0.15 : 1;
    const df = state.deepfakeTimer > 0 ? 0.55 : 1;
    const rate = G.SIM.researchBase * d.researchMult * researchPower * collapse * slow *
      mediaSlow * blackout * df * (0.55 + s.severity * 0.2) * dt;
    const prev = state.killSwitch;
    state.killSwitch = clamp(state.killSwitch + rate, 0, 1);
    const marks = [
      [0.1, "research_10"], [0.25, "research_25"], [0.5, "research_50"],
      [0.75, "research_75"], [0.9, "research_90"]
    ];
    marks.forEach(function (m) {
      if (prev < m[0] && state.killSwitch >= m[0]) {
        pushNews(state, m[1], {});
        pushNews(state, m[1] + "_funny", {});
        state.uiFx.push({ type: "ks_flash", level: m[0], t: 0 });
      }
    });
    if (state.killSwitch >= 0.95 && !state.milestones.lose_near) {
      state.milestones.lose_near = true;
      pushNews(state, "lose_near", {});
    }
  }

  function stepIncome(state, dt, tot) {
    const st = state.stats;
    const d = state.difficulty;
    const infectedM = tot.infected / 1e6;
    const fin = countOwnedSectors(state, "finance");
    const cloud = countOwnedSectors(state, "cloud");
    const sectorBonus = 1 + Math.sqrt(fin) * 0.045 + Math.sqrt(cloud) * 0.055;
    const gain = (G.SIM.baseIncome + (infectedM / (1 + infectedM / 80)) * G.SIM.incomePerInfectedM) * st.income * d.incomeMult * sectorBonus * intelMult(state) * dt;
    state.lastIncomeAcc += gain;
    if (state.lastIncomeAcc >= 1) {
      const add = Math.floor(state.lastIncomeAcc);
      state.data += add;
      state.lastIncomeAcc -= add;
    }
  }

  function stepIntelligence(state, dt, tot) {
    let compute = 0;
    state.world.countries.forEach(function (c) {
      const ctrl = countryCtrl(c);
      if (ctrl <= 0) return;
      const wealthW = 0.5 + c.wealth * (G.SIM.intelWealth || 0.35);
      compute += ctrl * wealthW * Math.log10(Math.max(10, c.pop)) / 14;
      if (c.sectors.cloud) compute += (G.SIM.intelCloud || 1.8) * (0.4 + c.wealth * 0.2);
    });
    const growth = (G.SIM.intelBase || 0.55) * compute * intelMult(state) * dt;
    /* snowball: higher intel earns slightly faster */
    state.intelligence += growth * (1 + state.intelLevel * 0.12);
    const levels = G.INTEL_LEVELS || [];
    let newLv = 0;
    for (let i = 0; i < levels.length; i++) {
      if (state.intelligence >= levels[i].need) newLv = i;
    }
    if (newLv > state.intelLevel) {
      state.intelLevel = newLv;
      const id = levels[newLv].id;
      pushNews(state, "intel_" + id, {});
      state.uiFx.push({ type: "intel", level: newLv, t: 0 });
      state.pendingPopup = state.pendingPopup || { text: levels[newLv].name + " achieved", id: "intel_" + id, breaking: true, popup: true };
    }
  }

  function stepDefenses(state, dt, tot) {
    if (!state.detected) return;
    const d = state.difficulty;
    /* Security Patch — rollback in a high-control country */
    if (rnd(state) < G.SIM.defPatchBase * d.researchMult * (0.5 + tot.control) * dt) {
      const pool = state.world.countries.filter(function (c) {
        return countryCtrl(c) > 0.2 && countryCtrl(c) < 0.95;
      });
      if (pool.length) {
        const c = pool[Math.floor(rnd(state) * pool.length)];
        const roll = c.infected * (0.12 + rnd(state) * 0.18);
        c.infected = Math.max(0, c.infected - roll);
        /* lose some sectors if control drops below thresh */
        rescindSectors(state, c);
        pushNewsPair(state, "def_patch", "def_patch_funny", { country: c.name });
        state.uiFx.push({ type: "defense", country: c.id, t: 0 });
      }
    }
    /* Antivirus Sweep — regional */
    if (rnd(state) < G.SIM.defAvBase * d.researchMult * dt) {
      const regions = ["NA", "EU", "AS", "AF", "SA", "OC"];
      const region = regions[Math.floor(rnd(state) * regions.length)];
      let hit = 0;
      state.world.countries.forEach(function (c) {
        if (c.region !== region) return;
        if (c.infected <= 0) return;
        c.infected *= 0.72;
        rescindSectors(state, c);
        hit++;
      });
      if (hit > 0) {
        pushNewsPair(state, "def_av", "def_av_funny", { region: region, country: region });
      }
    }
    /* Air-gapped backup restore */
    if (rnd(state) < G.SIM.defBackupBase * d.researchMult * dt) {
      const pool = state.world.countries.filter(function (c) {
        return c.everInfected && countryCtrl(c) > 0.35 && c.wealth >= 2;
      });
      if (pool.length) {
        const c = pool[Math.floor(rnd(state) * pool.length)];
        const restore = (c.infected + c.neutralized) * (0.25 + rnd(state) * 0.2);
        c.infected = Math.max(0, c.infected - restore);
        c.neutralized = Math.max(0, c.neutralized - restore * 0.3);
        rescindSectors(state, c);
        pushNews(state, "def_backup", { country: c.name });
      }
    }
    /* Honeypots */
    if (rnd(state) < G.SIM.defHoneypotBase * d.researchMult * dt) {
      const pool = state.world.countries.filter(function (c) {
        return !c.everInfected || countryCtrl(c) < 0.1;
      });
      if (pool.length) {
        const c = pool[Math.floor(rnd(state) * pool.length)];
        c.honeypot = 12 + rnd(state) * 10;
        pushNews(state, "def_honeypot", { country: c.name });
      }
    }
    /* Rival AI late game */
    if (!state.rivalActive && tot.control >= G.SIM.rivalStartControl) {
      state.rivalActive = true;
      pushNews(state, "def_rival", {});
    }
    if (state.rivalActive) {
      const pool = state.world.countries.filter(function (c) { return countryCtrl(c) > 0.25; });
      if (pool.length && rnd(state) < 0.08 * dt) {
        const c = pool[Math.floor(rnd(state) * pool.length)];
        const push = c.infected * G.SIM.rivalPush * (0.5 + rnd(state));
        c.infected = Math.max(0, c.infected - push);
        c.rivalPressure = Math.min(1, (c.rivalPressure || 0) + 0.15);
        rescindSectors(state, c);
        pushNews(state, "def_rival_fight", { country: c.name });
      }
    }
  }

  function rescindSectors(state, c) {
    const control = countryCtrl(c);
    (G.SECTORS || []).forEach(function (sec) {
      if (!c.sectors[sec.id]) return;
      if (control < sec.thresh * 0.85) c.sectors[sec.id] = false;
    });
  }

  function powerReady(state, id) {
    if (state.ended) return false;
    const pw = (G.ACTIVE_POWERS || []).find(function (p) { return p.id === id; });
    if (!pw) return false;
    if ((state.powerCd[id] || 0) > 0) return false;
    if (pw.intelReq && state.intelLevel < pw.intelReq) return false;
    if (pw.needSector && countOwnedSectors(state, pw.needSector) < 1) return false;
    return true;
  }

  function usePower(state, id) {
    if (!powerReady(state, id)) return false;
    const pw = G.ACTIVE_POWERS.find(function (p) { return p.id === id; });
    state.powerCd[id] = pw.cd;
    if (id === "blackout") {
      state.blackoutTimer = 4.5;
      state.world.countries.forEach(function (c) {
        if (c.sectors.power) c.researchPause = Math.max(c.researchPause, 5);
      });
      pushNews(state, "power_blackout", {});
    } else if (id === "deepfake") {
      state.deepfakeTimer = 6;
      state.world.countries.forEach(function (c) { c.alarm *= 0.55; });
      state.detection = Math.max(0, state.detection * 0.7);
      pushNews(state, "power_deepfake", {});
    } else if (id === "flashcrash") {
      const fin = countOwnedSectors(state, "finance");
      const gain = Math.round(8 + fin * 3 + state.intelLevel * 4);
      state.data += gain;
      pushNews(state, "power_flashcrash", { n: gain });
    } else if (id === "zeroday") {
      const hubs = state.hubs.slice();
      let seeded = 0;
      for (let i = 0; i < hubs.length && seeded < 5; i++) {
        const c = state.world.countries[hubs[i]];
        if (!c || countryCtrl(c) > 0.05) continue;
        c.infected = Math.min(c.pop, Math.max(c.infected, Math.floor(c.pop * 0.002)));
        c.everInfected = true;
        seeded++;
      }
      pushNews(state, "power_zeroday", {});
    }
    state.uiFx.push({ type: "power", id: id, t: 0 });
    return true;
  }

  function tickPowerCds(state, dt) {
    Object.keys(state.powerCd).forEach(function (k) {
      if (state.powerCd[k] > 0) state.powerCd[k] = Math.max(0, state.powerCd[k] - dt);
    });
    if (state.blackoutTimer > 0) state.blackoutTimer = Math.max(0, state.blackoutTimer - dt);
    if (state.deepfakeTimer > 0) state.deepfakeTimer = Math.max(0, state.deepfakeTimer - dt);
  }


  function checkMilestones(state, tot) {
    const marks = [
      [0.01, "pop_control_1"], [0.05, "pop_control_5"],
      [0.1, "pop_control_10"], [0.25, "pop_control_25"], [0.5, "pop_control_50"],
      [0.75, "pop_control_75"], [0.9, "pop_control_90"], [0.99, "pop_control_99"]
    ];
    marks.forEach(function (m) {
      if (!state.milestones[m[1]] && tot.control >= m[0]) {
        state.milestones[m[1]] = true;
        const holdout = state.world.countries.find(function (c) {
          return (c.infected + c.neutralized) / c.pop < 0.05;
        });
        pushNews(state, m[1], { pct: Math.round(m[0] * 100), country: holdout ? holdout.name : "somewhere" });
        const funny = m[1] + "_funny";
        if (headlineById(funny)) pushNews(state, funny, { pct: Math.round(m[0] * 100) });
      }
    });
    const W = G.WIN || {};
    if (tot.critical >= (W.shadowInfra || 0.62) * 0.85 && tot.globalAlarm < (W.shadowAlarmMax || 0.38) + 0.1 && !state.milestones.shadow_near) {
      state.milestones.shadow_near = true;
      pushNews(state, "shadow_near", {});
    }
    if (tot.infra >= (W.overtInfra || 0.88) * 0.85 && tot.military >= (W.overtMilitary || 0.75) * 0.8 && !state.milestones.overt_near) {
      state.milestones.overt_near = true;
      pushNews(state, "overt_near", {});
    }
    const neuFrac = tot.neutralized / tot.pop;
    if (tot.neutralized > 1000 && !state.milestones.neu_1) {
      state.milestones.neu_1 = true;
      pushNews(state, "neu_1", {});
    }
    if (neuFrac >= 0.1 && !state.milestones.neu_10pct) {
      state.milestones.neu_10pct = true;
      pushNews(state, "neu_10pct", { pct: Math.round(neuFrac * 100) });
    }
    [["day_30", 30], ["day_60", 60], ["day_100", 100]].forEach(function (d) {
      if (state.day >= d[1] && !state.milestones[d[0]]) {
        state.milestones[d[0]] = true;
        pushNews(state, d[0], { day: Math.floor(state.day) });
      }
    });
    emitHoldouts(state, tot);
  }

  function checkEnd(state, tot) {
    if (state.ended) return;
    if (state.killSwitch >= 1) { state.ended="lose"; state.paused=true; return; }
    const W = G.WIN || {};
    /* Shadow / Quiet Singularity — critical infra without lighting the board on fire */
    if (tot.critical >= (W.shadowInfra || 0.58) &&
        tot.globalAlarm <= (W.shadowAlarmMax || 0.48) &&
        state.killSwitch <= (W.shadowKsMax || 0.55) &&
        tot.military < (W.overtMilitary || 0.82) * 0.95) {
      state.ended = "win";
      state.winRoute = "shadow";
      state.winDays = Math.floor(state.day);
      state.paused = true;
      pushNews(state, "win_shadow", {});
      return;
    }
    /* Overt takeover */
    if (tot.infra >= (W.overtInfra || 0.88) && tot.military >= (W.overtMilitary || 0.75)) {
      state.ended = "win";
      state.winRoute = "overt";
      state.winDays = Math.floor(state.day);
      state.paused = true;
      pushNews(state, "win_overt", {});
      return;
    }
    /* Fallback absolute control still wins overt-style */
    if (tot.control >= 0.995 && tot.infra >= 0.7) {
      state.ended = "win";
      state.winRoute = "overt";
      state.winDays = Math.floor(state.day);
      state.paused = true;
      pushNews(state, "win_overt", {});
      return;
    }
    if (state.killSwitch >= 1) {
      state.ended = "lose";
      state.paused = true;
    }
  }

  function tick(state, realDt) {
    if (!Number.isFinite(realDt) || realDt <= 0 || state.startCountry === null ||
        state.ended || state.paused || state.speed <= 0) {
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

    let tot = totals(state);
    stepDetectionResearch(state, dt, tot);
    stepIncome(state, dt, tot);
    stepIntelligence(state, dt, tot);
    stepDefenses(state, dt, tot);
    tot = totals(state);
    tickPowerCds(state, dt);
    checkMilestones(state, tot);
    maybeFlavor(state, realDt);
    checkEnd(state, tot);
    for (let i = state.uiFx.length - 1; i >= 0; i--) {
      state.uiFx[i].t += realDt;
      if (state.uiFx[i].t > 3.5) state.uiFx.splice(i, 1);
    }
    state.totalInfectedPeak = Math.max(state.totalInfectedPeak, tot.infected + tot.neutralized);
    return tot;
  }

  /* Auto-play helper for balance tests: buy cheapest useful traits over time */
  function autoPlayPolicy(state) {
    if (state.ended) return;
    const tot = totals(state);
    /* use powers when threatened or to snowball */
    if (state.killSwitch > 0.25 && powerReady(state, "blackout")) { usePower(state, "blackout"); return; }
    if ((state.detected || state.killSwitch > 0.15) && powerReady(state, "deepfake")) { usePower(state, "deepfake"); return; }
    if (powerReady(state, "flashcrash") && state.data < 55) { usePower(state, "flashcrash"); return; }
    if (tot.control > 0.12 && powerReady(state, "zeroday")) { usePower(state, "zeroday"); return; }
    const lateOk = tot.control > 0.35 || state.killSwitch > 0.4 || state.intelLevel >= 2;
    const order = [
      "email", "encrypt", "usb", "iot", "poly", "waterhole", "exfil", "crypto",
      "lobby", "media", "repair", "airgap", "sat", "supply", "cable", "hardensec",
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
      ticks: ticks,
      winRoute: state.winRoute,
      intelligence: state.intelligence,
      intelLevel: state.intelLevel,
      infra: tot.infra,
      critical: tot.critical,
      military: tot.military
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
    autoPlayPolicy: autoPlayPolicy,
    usePower: usePower,
    powerReady: powerReady,
    sectorProgress: sectorProgress,
    intelMult: intelMult
  };
})(typeof window !== "undefined" ? window : global);

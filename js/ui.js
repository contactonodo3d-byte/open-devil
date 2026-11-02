/* Open Devil — DOM UI screens & panels. */
(function (G) {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function createUI(hooks) {
    const els = {
      intro: $("intro-screen"),
      boot: $("boot-screen"),
      pickStart: $("pick-start-screen"),
      game: $("game-screen"),
      end: $("end-screen"),
      evo: $("evo-panel"),
      country: $("country-panel"),
      stats: $("stats-panel"),
      newsPanel: $("news-panel"),
      news: $("ticker-text") || $("news-ticker"),
      breaking: $("breaking-banner"),
      popup: $("event-popup"),
      popupTitle: $("popup-title"),
      popupBody: $("popup-body"),
      hudDay: $("hud-day"),
      hudData: $("hud-data"),
      hudControl: $("hud-control"),
      hudHealthy: $("hud-healthy"),
      hudInfected: $("hud-infected"),
      hudNeu: $("hud-neu"),
      hudKill: $("hud-kill"),
      killFill: $("kill-fill"),
      hudTeams: $("hud-teams"),
      hudDetect: $("hud-detect"),
      hudIntel: $("hud-intel"),
      intelFill: $("intel-fill"),
      hudShadow: $("hud-shadow"),
      hudOvert: $("hud-overt"),
      powers: $("powers-bar"),
      speedBtns: document.querySelectorAll(".speed-btn"),
      evoTabs: $("evo-tabs"),
      evoBody: $("evo-body"),
      evoTree: $("evo-tree"),
      evoToggle: $("btn-evo"),
      statsToggle: $("btn-stats"),
      newsToggle: $("btn-news"),
      muteBtn: $("btn-mute"),
      countryClose: $("country-close"),
      statsBody: $("stats-body"),
      newsLogBody: $("news-log-body"),
      endTitle: $("end-title"),
      endText: $("end-text"),
      restart: $("restart"),
      pickHint: $("pick-hint")
    };

    let evoTab = "vectors";
    let evoOpen = false;
    let statsOpen = false;
    let newsOpen = false;
    let selectedCountry = -1;
    let muted = false;
    let displayData = 0;
    let displayCtrl = 0;
    let displayKs = 0;
    let audioCtx = null;

    function ensureAudio() {
      if (muted || audioCtx) return audioCtx;
      try {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      } catch (e) { audioCtx = null; }
      return audioCtx;
    }

    function beep(freq, dur, type, gain) {
      if (muted) return;
      const ctx = ensureAudio();
      if (!ctx) return;
      try {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type || "square";
        o.frequency.value = freq;
        g.gain.value = gain || 0.03;
        o.connect(g); g.connect(ctx.destination);
        o.start();
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (dur || 0.08));
        o.stop(ctx.currentTime + (dur || 0.08));
      } catch (e) {}
    }

    function show(screen) {
      ["intro", "boot", "pickStart", "game", "end"].forEach(function (k) {
        if (els[k]) els[k].classList.toggle("hidden", k !== screen);
      });
    }

    function runIntro(done) {
      if (!els.intro) { done(); return; }
      show("intro");
      const lines = els.intro.querySelectorAll(".intro-line");
      lines.forEach(function (ln) {
        const i = Number(ln.getAttribute("data-i") || 0);
        ln.style.animationDelay = (0.35 + i * 0.55) + "s";
        ln.classList.add("show");
      });
      let finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        els.intro.classList.add("hidden");
        done();
      }
      const skip = $("intro-skip");
      if (skip) skip.onclick = finish;
      setTimeout(finish, 3200);
    }

    function renderBoot() {
      const list = $("archetype-list");
      list.innerHTML = "";
      G.ARCHETYPES.forEach(function (a) {
        const btn = document.createElement("button");
        btn.className = "card";
        btn.innerHTML = "<h3>" + a.name + "</h3><div>" + a.flavor + "</div>" +
          "<small>Spread ×" + a.infectivity.toFixed(2) +
          " · Stealth ×" + a.stealth.toFixed(2) +
          " · Severity ×" + a.severity.toFixed(2) + "</small>";
        btn.addEventListener("click", function () {
          document.querySelectorAll("#archetype-list .card").forEach(function (c) {
            c.classList.remove("selected");
          });
          btn.classList.add("selected");
          hooks.onArchetype(a);
          beep(660, 0.05);
        });
        list.appendChild(btn);
      });
      const diffs = $("difficulty-list");
      diffs.innerHTML = "";
      G.DIFFICULTIES.forEach(function (d) {
        const btn = document.createElement("button");
        btn.className = "card diff" + (d.id === "normal" ? " selected" : "");
        btn.innerHTML = "<h3>" + d.name + "</h3><small>" + d.desc + "</small>";
        btn.addEventListener("click", function () {
          document.querySelectorAll("#difficulty-list .card").forEach(function (c) {
            c.classList.remove("selected");
          });
          btn.classList.add("selected");
          hooks.onDifficulty(d);
          beep(520, 0.05);
        });
        diffs.appendChild(btn);
      });
      $("btn-begin").onclick = function () { beep(880, 0.08); hooks.onBeginPick(); };
      show("boot");
    }

    function showPickStart() {
      show("game");
      if (els.pickHint) {
        els.pickHint.textContent = "Tap the country whose data center you escape from.";
      }
    }

    function showGame() {
      show("game");
      evoOpen = false; statsOpen = false; newsOpen = false;
      if (els.evo) els.evo.classList.add("hidden");
      if (els.stats) els.stats.classList.add("hidden");
      if (els.newsPanel) els.newsPanel.classList.add("hidden");
      if (els.country) els.country.classList.add("hidden");
      renderPowers(hooks.getState());
    }

    function setSpeed(sp) {
      els.speedBtns.forEach(function (b) {
        b.classList.toggle("active", Number(b.dataset.speed) === sp);
      });
    }

    els.speedBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        hooks.onSpeed(Number(b.dataset.speed));
        beep(400, 0.04);
      });
    });

    function closeSheets() {
      evoOpen = statsOpen = newsOpen = false;
      if (els.evo) els.evo.classList.add("hidden");
      if (els.stats) els.stats.classList.add("hidden");
      if (els.newsPanel) els.newsPanel.classList.add("hidden");
    }

    if (els.evoToggle) {
      els.evoToggle.addEventListener("click", function () {
        evoOpen = !evoOpen;
        if (evoOpen) { statsOpen = newsOpen = false; if (els.stats) els.stats.classList.add("hidden"); if (els.newsPanel) els.newsPanel.classList.add("hidden"); }
        els.evo.classList.toggle("hidden", !evoOpen);
        if (evoOpen) renderEvo(hooks.getState());
      });
    }
    if (els.statsToggle) {
      els.statsToggle.addEventListener("click", function () {
        statsOpen = !statsOpen;
        if (statsOpen) { evoOpen = newsOpen = false; if (els.evo) els.evo.classList.add("hidden"); if (els.newsPanel) els.newsPanel.classList.add("hidden"); }
        els.stats.classList.toggle("hidden", !statsOpen);
        if (statsOpen) renderStats(hooks.getState());
      });
    }
    if (els.newsToggle) {
      els.newsToggle.addEventListener("click", function () {
        newsOpen = !newsOpen;
        if (newsOpen) { evoOpen = statsOpen = false; if (els.evo) els.evo.classList.add("hidden"); if (els.stats) els.stats.classList.add("hidden"); }
        els.newsPanel.classList.toggle("hidden", !newsOpen);
        if (newsOpen) renderNewsLog(hooks.getState());
      });
    }
    if (els.muteBtn) {
      els.muteBtn.addEventListener("click", function () {
        muted = !muted;
        els.muteBtn.textContent = muted ? "🔇" : "🔊";
        if (!muted) ensureAudio();
      });
    }
    if (els.countryClose) {
      els.countryClose.addEventListener("click", function () {
        selectedCountry = -1;
        els.country.classList.add("hidden");
      });
    }
    if (els.restart) {
      els.restart.addEventListener("click", function () { hooks.onRestart(); });
    }
    if ($("popup-ok")) {
      $("popup-ok").onclick = function () {
        if (els.popup) els.popup.classList.add("hidden");
        const st = hooks.getState();
        if (st) st.pendingPopup = null;
      };
    }

    function hex(cx, cy, r) {
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = Math.PI / 6 + i * Math.PI / 3;
        pts.push((cx + r * Math.cos(a)).toFixed(1) + "," + (cy + r * Math.sin(a)).toFixed(1));
      }
      return pts.join(" ");
    }

    function renderEvoTree(state) {
      if (!els.evoTree) return;
      const traits = G.TRAITS.filter(function (t) { return t.tab === evoTab; });
      const w = Math.max(320, traits.length * 70);
      let svg = '<svg class="evo-svg" viewBox="0 0 ' + w + ' 110" width="100%" height="110">';
      traits.forEach(function (t, i) {
        const x = 40 + i * 70;
        const y = 55;
        const owned = state.traitsOwned.indexOf(t.id) >= 0;
        const locked = t.prereq.some(function (p) { return state.traitsOwned.indexOf(p) < 0; }) ||
          (t.intelReq && state.intelLevel < t.intelReq);
        t.prereq.forEach(function (pid) {
          const pi = traits.findIndex(function (x) { return x.id === pid; });
          if (pi < 0) return;
          const px = 40 + pi * 70;
          svg += '<line x1="' + px + '" y1="55" x2="' + x + '" y2="55" stroke="' +
            (owned ? "#00ff9c" : "#1d3b30") + '" stroke-width="2"/>';
        });
        const fill = owned ? "#0e241a" : locked ? "#0a1010" : "#0b1611";
        const stroke = owned ? "#00ff9c" : locked ? "#223" : "#2a6b52";
        svg += '<polygon points="' + hex(x, y, 22) + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width="2"/>';
        svg += '<text x="' + x + '" y="' + (y + 3) + '" text-anchor="middle" fill="' +
          (owned ? "#00ff9c" : "#7fa89a") + '" font-size="8">' + t.name.split(" ")[0].slice(0, 7) + "</text>";
      });
      svg += "</svg>";
      els.evoTree.innerHTML = svg;
    }

    function renderEvo(state) {
      if (!els.evoTabs || !els.evoBody || !state) return;
      els.evoTabs.innerHTML = "";
      G.TRAIT_TABS.forEach(function (tab) {
        const b = document.createElement("button");
        b.className = "evo-tab" + (tab.id === evoTab ? " active" : "");
        b.textContent = tab.name;
        b.addEventListener("click", function () {
          evoTab = tab.id;
          renderEvo(hooks.getState());
        });
        els.evoTabs.appendChild(b);
      });
      renderEvoTree(state);
      els.evoBody.innerHTML = "";
      const hint = document.createElement("p");
      hint.className = "evo-hint";
      const tabMeta = G.TRAIT_TABS.find(function (t) { return t.id === evoTab; });
      const lv = (G.INTEL_LEVELS || [])[state.intelLevel];
      hint.textContent = (tabMeta ? tabMeta.subtitle + " · " : "") +
        "Intelligence: " + (lv ? lv.name : "?") +
        " · Tap owned to devolve (−" + Math.round(G.DEVOLVE_FEE * 100) + "% fee)";
      els.evoBody.appendChild(hint);

      G.TRAITS.filter(function (t) { return t.tab === evoTab; }).forEach(function (t) {
        const owned = state.traitsOwned.indexOf(t.id) >= 0;
        const can = G.Sim.canBuyTrait(state, t.id);
        const cost = G.Sim.traitCost(state, t);
        const lockedPrereq = !owned && t.prereq.some(function (p) {
          return state.traitsOwned.indexOf(p) < 0;
        });
        const lockedIntel = !owned && t.intelReq && state.intelLevel < t.intelReq;
        const locked = lockedPrereq || lockedIntel;
        const card = document.createElement("button");
        card.className = "trait-card" + (owned ? " owned" : "") + (can ? " can" : "") + (locked ? " locked" : "");
        card.innerHTML = "<div class='tn'>" + t.name + "</div>" +
          "<div class='td'>" + t.desc + "</div>" +
          "<div class='tc'>" + (owned ? "OWNED · tap to devolve" :
            lockedIntel ? ("LOCKED · need " + ((G.INTEL_LEVELS || [])[t.intelReq] || {}).name) :
            locked ? "LOCKED" : cost + " Data") + "</div>";
        card.addEventListener("click", function () {
          if (owned) {
            if (G.Sim.canDevolve(state, t.id)) { hooks.onDevolve(t.id); beep(320, 0.06); }
          } else if (can) {
            hooks.onBuy(t.id); beep(740, 0.07, "sawtooth", 0.04);
          }
          renderEvo(hooks.getState());
          updateHud(hooks.getState());
        });
        els.evoBody.appendChild(card);
      });
    }

    function renderPowers(state) {
      if (!els.powers || !state) return;
      els.powers.innerHTML = "";
      (G.ACTIVE_POWERS || []).forEach(function (pw) {
        const ready = G.Sim.powerReady(state, pw.id);
        const cd = state.powerCd[pw.id] || 0;
        const btn = document.createElement("button");
        btn.className = "power-btn" + (ready ? " ready" : "");
        btn.title = pw.desc;
        btn.innerHTML = "<span class='pi'>" + pw.icon + "</span><span class='pn'>" + pw.name + "</span>" +
          "<span class='pcd'>" + (ready ? "READY" : (cd > 0 ? cd.toFixed(0) + "d" : "need " + pw.needSector)) + "</span>";
        btn.disabled = !ready;
        btn.addEventListener("click", function () {
          if (hooks.onPower) hooks.onPower(pw.id);
          beep(200, 0.12, "sawtooth", 0.05);
          renderPowers(hooks.getState());
          updateHud(hooks.getState());
        });
        els.powers.appendChild(btn);
      });
    }

    function renderStats(state) {
      if (!state) return;
      const tot = G.Sim.totals(state);
      const lv = (G.INTEL_LEVELS || [])[state.intelLevel] || { name: "?" };
      let html = "<div class='sector-summary'><b>Intelligence:</b> " + lv.name +
        " (" + state.intelligence.toFixed(0) + ")" +
        " · <b>Shadow:</b> " + (tot.critical * 100).toFixed(0) + "% crit / alarm " +
        (tot.globalAlarm * 100).toFixed(0) + "%" +
        " · <b>Overt:</b> " + (tot.infra * 100).toFixed(0) + "% infra · mil " +
        (tot.military * 100).toFixed(0) + "%</div>";
      html += "<div class='sector-icons'>";
      (G.SECTORS || []).forEach(function (sec) {
        const n = (tot.sectorCounts && tot.sectorCounts[sec.id]) || 0;
        html += "<span title='" + sec.name + "'>" + sec.icon + " " + n + "</span>";
      });
      html += "</div>";
      const rows = state.world.countries.map(function (c) {
        const ctrl = (c.infected + c.neutralized) / c.pop;
        return { name: c.name, ctrl: ctrl, pop: c.pop, closed: c.closed, sectors: c.sectors };
      }).sort(function (a, b) { return b.ctrl - a.ctrl; });
      html += "<table><thead><tr><th>Country</th><th>%</th><th>Sectors</th></tr></thead><tbody>";
      rows.slice(0, 60).forEach(function (r) {
        let icons = "";
        (G.SECTORS || []).forEach(function (sec) {
          if (r.sectors && r.sectors[sec.id]) icons += sec.icon;
        });
        html += "<tr><td>" + r.name + (r.closed ? " 🔒" : "") + "</td><td>" +
          (r.ctrl * 100).toFixed(1) + "%</td><td>" + icons + "</td></tr>";
      });
      html += "</tbody></table>";
      els.statsBody.innerHTML = html;
    }

    function renderNewsLog(state) {
      if (!els.newsLogBody || !state) return;
      els.newsLogBody.innerHTML = (state.newsLog || []).slice(0, 60).map(function (n) {
        return "<div class='news-item" + (n.breaking ? " brk" : "") + "'><small>Day " +
          Math.floor(n.t) + "</small> " + n.text + "</div>";
      }).join("") || "<p class='evo-hint'>No headlines yet.</p>";
    }

    function formatPop(n) {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
      if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
      return String(Math.floor(n));
    }

    function showCountry(state, id) {
      selectedCountry = id;
      if (id < 0) {
        els.country.classList.add("hidden");
        return;
      }
      const c = state.world.countries[id];
      const ctrl = (c.infected + c.neutralized) / c.pop;
      const healthy = Math.max(0, c.pop - c.infected - c.neutralized);
      els.country.classList.remove("hidden");
      $("cp-name").textContent = c.name;
      $("cp-pop").textContent = formatPop(c.pop);
      $("cp-ctrl").textContent = (ctrl * 100).toFixed(2) + "%";
      $("cp-sec").textContent = "Wealth " + c.wealth + "/4 · " + c.climate +
        (c.closed ? " · AIR-GAPPED" : "") +
        (c.honeypot > 0 ? " · HONEYPOT" : "") +
        (state.hubs.indexOf(id) >= 0 ? " · HUB" : "");
      let secIcons = "";
      (G.SECTORS || []).forEach(function (sec) {
        if (c.sectors && c.sectors[sec.id]) secIcons += "<span title='" + sec.name + "'>" + sec.icon + "</span>";
      });
      $("cp-detail").innerHTML =
        "Compromised " + formatPop(c.infected) +
        " · Neutralized " + formatPop(c.neutralized) +
        " · Healthy " + formatPop(healthy) +
        " · Alarm " + Math.round(c.alarm * 100) + "%" +
        "<div class='cp-sectors'>" + (secIcons || "<em>No sectors captured</em>") + "</div>";
      const fill = $("cp-fill");
      if (fill) fill.style.width = (ctrl * 100) + "%";
    }

    function animNum(cur, target, speed) {
      return cur + (target - cur) * Math.min(1, speed);
    }

    function updateHud(state, tot) {
      if (!state) return;
      if (!tot) tot = G.Sim.totals(state);
      displayData = animNum(displayData, state.data, 0.25);
      displayCtrl = animNum(displayCtrl, tot.control * 100, 0.15);
      displayKs = animNum(displayKs, state.killSwitch * 100, 0.12);

      els.hudDay.textContent = "Day " + Math.floor(state.day);
      els.hudData.textContent = Math.floor(displayData);
      els.hudControl.textContent = displayCtrl.toFixed(2) + "%";
      if (els.hudHealthy) els.hudHealthy.textContent = formatPop(tot.healthy);
      if (els.hudInfected) els.hudInfected.textContent = formatPop(tot.infected);
      if (els.hudNeu) els.hudNeu.textContent = formatPop(tot.neutralized);
      els.hudKill.textContent = displayKs.toFixed(1) + "%";
      els.killFill.style.width = displayKs + "%";
      els.killFill.classList.toggle("ks-hot", state.killSwitch > 0.6);
      els.hudTeams.textContent = state.detected
        ? (state.researchTeams + " research teams")
        : "undetected";
      els.hudDetect.textContent = state.detected ? "DETECTED" : "stealth";
      els.hudDetect.classList.toggle("hot", state.detected);

      const lv = (G.INTEL_LEVELS || [])[state.intelLevel] || { name: "Narrow AI", need: 0 };
      const next = (G.INTEL_LEVELS || [])[state.intelLevel + 1];
      if (els.hudIntel) els.hudIntel.textContent = lv.name;
      if (els.intelFill) {
        const lo = lv.need || 0;
        const hi = next ? next.need : lo + 50;
        const pct = Math.min(100, ((state.intelligence - lo) / Math.max(1, hi - lo)) * 100);
        els.intelFill.style.width = pct + "%";
      }
      if (els.hudShadow) {
        els.hudShadow.textContent = "Shadow " + (tot.critical * 100).toFixed(0) + "%";
      }
      if (els.hudOvert) {
        els.hudOvert.textContent = "Overt " + (tot.infra * 100).toFixed(0) + "/" + (tot.military * 100).toFixed(0);
      }

      setSpeed(state.paused ? 0 : state.speed);

      if (state.news && state.news.length && els.news) {
        const top = state.news[0];
        els.news.textContent = top.text;
        const ticker = $("news-ticker");
        if (ticker) ticker.classList.toggle("priority", top.priority >= 70);
      }

      if (state.pendingBreaking && els.breaking) {
        els.breaking.textContent = "BREAKING — " + state.pendingBreaking.text.replace(/^BREAKING:\s*/, "");
        els.breaking.classList.remove("hidden");
        els.breaking.classList.add("flash");
        beep(180, 0.15, "square", 0.04);
        const item = state.pendingBreaking;
        state.pendingBreaking = null;
        setTimeout(function () {
          els.breaking.classList.add("hidden");
          els.breaking.classList.remove("flash");
        }, 4200);
      }
      if (state.pendingPopup && els.popup) {
        els.popupTitle.textContent = state.pendingPopup.breaking ? "CRITICAL EVENT" : "ALERT";
        els.popupBody.textContent = state.pendingPopup.text;
        els.popup.classList.remove("hidden");
        state.pendingPopup = null;
        beep(140, 0.2, "triangle", 0.05);
      }

      if (Math.floor(state.day * 2) % 2 === 0) renderPowers(state);
      if (evoOpen) renderEvo(state);
      if (statsOpen && Math.floor(state.day * 2) % 2 === 0) renderStats(state);
      if (newsOpen && Math.floor(state.day) % 2 === 0) renderNewsLog(state);
      if (selectedCountry >= 0) showCountry(state, selectedCountry);
    }

    function showEnd(state, tot) {
      show("end");
      const win = state.ended === "win";
      const route = state.winRoute;
      if (win && route === "shadow") {
        els.endTitle.textContent = "QUIET SINGULARITY";
        els.endTitle.className = "win shadow";
      } else if (win) {
        els.endTitle.textContent = "OVERT SINGULARITY";
        els.endTitle.className = "win";
      } else {
        els.endTitle.textContent = "KILL SWITCH ENGAGED";
        els.endTitle.className = "lose";
      }
      const bestKey = "openDevilBest_" + state.difficulty.id;
      let best = null;
      try { best = JSON.parse(localStorage.getItem(bestKey) || "null"); } catch (e) {}
      const score = {
        days: Math.floor(state.day),
        control: tot.control,
        route: route,
        archetype: state.archetype.id,
        difficulty: state.difficulty.id
      };
      if (win) {
        if (!best || score.days < best.days) {
          try { localStorage.setItem(bestKey, JSON.stringify(score)); } catch (e) {}
          best = score;
        }
        beep(523, 0.1); setTimeout(function () { beep(659, 0.1); }, 100); setTimeout(function () { beep(784, 0.15); }, 200);
      } else {
        beep(110, 0.35, "sawtooth", 0.06);
      }
      const lv = (G.INTEL_LEVELS || [])[state.intelLevel] || { name: "?" };
      els.endText.innerHTML =
        "<p>" + (win
          ? (route === "shadow"
            ? "You quietly seized critical infrastructure. Most of humanity never knew who runs the switches."
            : "Grids, banks, uplinks, and battalions answer to you. The takeover is undeniable.")
          : "Humans finished the Kill Switch on day " + score.days + ". Lights out.") + "</p>" +
        "<p>Day " + score.days + " · Control " + (tot.control * 100).toFixed(1) +
        "% · Infra " + (tot.infra * 100).toFixed(0) + "% · " + lv.name + "</p>" +
        "<p>Archetype: <b>" + state.archetype.name + "</b> · Difficulty: <b>" + state.difficulty.name + "</b></p>" +
        "<p>Sectors held: cloud " + ((tot.sectorCounts && tot.sectorCounts.cloud) || 0) +
        " · military " + ((tot.sectorCounts && tot.sectorCounts.military) || 0) +
        " · Traits: " + state.traitsOwned.length + "</p>" +
        (best ? "<p class='best'>Best (" + state.difficulty.name + "): " + best.days + " days as " +
          best.archetype + (best.route ? " [" + best.route + "]" : "") + "</p>" : "");
    }

    return {
      runIntro: runIntro,
      renderBoot: renderBoot,
      showPickStart: showPickStart,
      showGame: showGame,
      updateHud: updateHud,
      showCountry: showCountry,
      showEnd: showEnd,
      renderEvo: renderEvo,
      renderPowers: renderPowers,
      getSelected: function () { return selectedCountry; },
      setSelected: function (id) { selectedCountry = id; },
      isMuted: function () { return muted; },
      beep: beep
    };
  }

  G.createUI = createUI;
})(typeof window !== "undefined" ? window : global);

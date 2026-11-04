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
    let lastPanelKey = "";
    let activePanel = null, panelState = null, panelWasPaused = true, panelOpener = null;
    const feed = G.createNewsFeed();
    let newsState = null, newsTime = 0, displayedHeadline = null;

    let evoKey = "";

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
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { done(); return; }
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
      feed.reset(); newsState = null; displayedHeadline = null;
      els.news.textContent = "Choose your origin. Reports will appear as the operation unfolds.";
      $("ticker-category").textContent = "SITUATION REPORT";
      els.newsToggle.textContent = "News";
      lastPanelKey = evoKey = "";
      closeSheets(false, false);
      selectedCountry = -1;
      displayData = displayCtrl = displayKs = 0;
      if (els.country) els.country.classList.add("hidden");
      hooks.onArchetype(G.ARCHETYPES[0]);
      hooks.onDifficulty(G.DIFFICULTIES.find(function (d) { return d.id === "normal"; }));
      const list = $("archetype-list");
      list.innerHTML = "";
      G.ARCHETYPES.forEach(function (a) {
        const btn = document.createElement("button");
        btn.className = "card" + (a.id === G.ARCHETYPES[0].id ? " selected" : "");
        btn.innerHTML = "<h3>" + a.name + "</h3><div>" + a.flavor + "</div>" +
          "<small>Spread ×" + a.infectivity.toFixed(2) +
          " · Stealth ×" + a.stealth.toFixed(2) +
          " · Severity ×" + a.severity.toFixed(2) + "</small>";
        btn.addEventListener("click", function () {
          document.querySelectorAll("#archetype-list .card").forEach(function (c) {
            c.classList.remove("selected");
          });
          btn.classList.add("selected");
          btn.parentElement.querySelectorAll("button").forEach(function(b){b.setAttribute("aria-pressed",String(b===btn));});
          hooks.onArchetype(a);
          beep(660, 0.05);
        });
        btn.setAttribute("aria-pressed",String(a.id===G.ARCHETYPES[0].id));
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
          btn.parentElement.querySelectorAll("button").forEach(function(b){b.setAttribute("aria-pressed",String(b===btn));});
          hooks.onDifficulty(d);
          $("difficulty-help").textContent=d.desc;
          beep(520, 0.05);
        });
        btn.title=d.desc;
        btn.setAttribute("aria-pressed",String(d.id==="normal"));
        diffs.appendChild(btn);
      });
      $("difficulty-help").textContent=G.DIFFICULTIES.find(function(d){return d.id==="normal";}).desc;
      $("btn-begin").onclick = function () { beep(880, 0.08); hooks.onBeginPick(); };
      show("boot");
    }

    function showPickStart() {
      show("game");
      [els.evoToggle, els.statsToggle, els.newsToggle, $("news-ticker")].forEach(function(button){button.disabled=true;});
      $("country-go").textContent = "Start here";
      $("country-select").value = "";
      $("country-tools").open = true;
      if (els.pickHint) {
        els.pickHint.textContent = "Tap the country whose data center you escape from.";
      }
    }

    function showGame() {
      show("game");
      [els.evoToggle, els.statsToggle, els.newsToggle, $("news-ticker")].forEach(function(button){button.disabled=false;});
      $("country-go").textContent = "Inspect";
      $("country-tools").open = false;
      closeSheets(false, false);
      if (els.evo) els.evo.classList.add("hidden");
      if (els.stats) els.stats.classList.add("hidden");
      if (els.newsPanel) els.newsPanel.classList.add("hidden");
      if (els.country) els.country.classList.add("hidden");
      renderPowers(hooks.getState());
    }

    function setSpeed(sp) {
      els.speedBtns.forEach(function (b) {
        b.classList.toggle("active", Number(b.dataset.speed) === sp);
        b.disabled = !!activePanel;
        b.setAttribute("aria-pressed",String(Number(b.dataset.speed) === sp));
        if (Number(b.dataset.speed) === 0) {
          b.textContent = sp === 0 ? "Resume" : "Pause";
          b.title = activePanel ? "Return to Map to resume" : b.textContent;
        }
      });
    }

    els.speedBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        hooks.onSpeed(Number(b.dataset.speed));
        beep(400, 0.04);
      });
    });

    function closeSheets(resume, restoreFocus) {
      const state = hooks.getState();
      if (resume !== false && state && state === panelState && !state.ended) {
        state.paused = panelWasPaused || document.hidden;
      }
      evoOpen = statsOpen = newsOpen = false;
      [els.evo, els.stats, els.newsPanel].forEach(function (el) { el.classList.add("hidden"); });
      $("workspace-stage").classList.remove("has-panel");
      els.game.classList.remove("panel-open");
      [els.evoToggle, els.statsToggle, els.newsToggle, $("news-ticker")].forEach(function (button) { button.setAttribute("aria-expanded", "false"); });
      activePanel = panelState = null;
      updateNavigation("map");
      if (restoreFocus !== false && panelOpener && panelOpener.isConnected) panelOpener.focus();
      panelOpener = null;
      if (state) setSpeed(state.paused ? 0 : state.speed);
    }

    function openSheet(kind, opener) {
      const state = hooks.getState();
      if (!state || state.startCountry === null || state.ended) return;
      const panel = kind === "evo" ? els.evo : kind === "stats" ? els.stats : els.newsPanel;
      if (activePanel === panel) { closeSheets(); return; }
      if (!activePanel) { panelWasPaused = state.paused; panelState = state; }
      state.paused = true;
      panelOpener = opener; activePanel = panel;
      evoOpen = kind === "evo"; statsOpen = kind === "stats"; newsOpen = kind === "news";
      [els.evo, els.stats, els.newsPanel].forEach(function (el) { el.classList.toggle("hidden", el !== panel); });
      $("workspace-stage").classList.add("has-panel");
      els.game.classList.add("panel-open");
      $("country-tools").open = false;
      els.country.classList.add("hidden"); selectedCountry = -1;
      updateNavigation(kind);
      opener.setAttribute("aria-expanded", "true");
      if (evoOpen) renderEvo(state);
      if (statsOpen) renderStats(state);
      if (newsOpen) { renderNewsLog(state); feed.markRead(); els.newsToggle.textContent = "News"; }
      setSpeed(0);
      panel.querySelector(".sheet-close").focus();
    }

    [[els.evoToggle, "evo"], [els.statsToggle, "stats"], [els.newsToggle, "news"], [$("news-ticker"), "news"]].forEach(function (entry) {
      entry[0].setAttribute("aria-expanded", "false");
      entry[0].addEventListener("click", function () { openSheet(entry[1], entry[0]); });
    });
    $("btn-map").onclick = function () { closeSheets(true, false); };
    function updateNavigation(kind) {
      [[$("btn-map"),"map"],[els.evoToggle,"evo"],[els.statsToggle,"stats"],[els.newsToggle,"news"]].forEach(function(entry){
        entry[0].classList.toggle("active",entry[1]===kind);
        entry[0].setAttribute("aria-pressed",String(entry[1]===kind));
      });
    }
    $("news-filter").onchange = function () { renderNewsLog(hooks.getState()); };
    document.addEventListener("visibilitychange", function () { if (document.hidden && activePanel) panelWasPaused = true; });
    if (els.muteBtn) {
      els.muteBtn.addEventListener("click", function () {
        muted = !muted;
        els.muteBtn.textContent = muted ? "Muted" : "Sound";
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
    document.querySelectorAll(".sheet-close").forEach(function (button) { button.onclick = function () { closeSheets(); }; });
    document.addEventListener("keydown", function (event) {
      if ($("guide-dialog").open) return;
      if (event.key === "Escape") {
        if (activePanel) { event.preventDefault(); closeSheets(); }
        else { els.country.classList.add("hidden"); selectedCountry = -1; }
      }
    });

    function renderEvo(state) {
      if (!els.evoTabs || !els.evoBody || !state) return;

      G.TRAIT_TABS.forEach(function (tab) {
        let b = els.evoTabs.querySelector("[data-tab=\""+tab.id+"\"]");
        const freshTab = !b;
        if (freshTab) {b=document.createElement("button");b.dataset.tab=tab.id;}
        b.setAttribute("aria-pressed",String(tab.id===evoTab));
        b.className = "evo-tab" + (tab.id === evoTab ? " active" : "");
        b.textContent = tab.name;
        if (freshTab) b.addEventListener("click", function () {
          evoTab = tab.id;
          renderEvo(hooks.getState());
        });
        if (freshTab) els.evoTabs.appendChild(b);
      });
      Array.from(els.evoBody.querySelectorAll("[data-trait]")).forEach(function(card){ if(state.traitById[card.dataset.trait].tab!==evoTab)card.remove(); });
      const hint = els.evoBody.querySelector(".evo-hint") || document.createElement("p");
      hint.className = "evo-hint";
      const tabMeta = G.TRAIT_TABS.find(function (t) { return t.id === evoTab; });
      const lv = (G.INTEL_LEVELS || [])[state.intelLevel];
      hint.textContent = (tabMeta ? tabMeta.subtitle + " · " : "") +
        "Intelligence: " + (lv ? lv.name : "?") +
        " · Tap owned to devolve (−" + Math.round(G.DEVOLVE_FEE * 100) + "% fee)";
      if (!hint.parentElement) els.evoBody.appendChild(hint);

      G.TRAITS.filter(function (t) { return t.tab === evoTab; }).forEach(function (t) {
        const owned = state.traitsOwned.indexOf(t.id) >= 0;
        const can = G.Sim.canBuyTrait(state, t.id);
        const cost = G.Sim.traitCost(state, t);
        const lockedPrereq = !owned && t.prereq.some(function (p) {
          return state.traitsOwned.indexOf(p) < 0;
        });
        const lockedIntel = !owned && t.intelReq && state.intelLevel < t.intelReq;
        const locked = lockedPrereq || lockedIntel;
        let card = els.evoBody.querySelector("[data-trait=\""+t.id+"\"]");
        const freshCard = !card;
        if (freshCard) card=document.createElement("button");
        card.dataset.trait = t.id;
        card.disabled = !owned && !can;
        card.className = "trait-card" + (owned ? " owned" : "") + (can ? " can" : "") + (locked ? " locked" : "");
        card.innerHTML = "<div class='tn'>" + t.name + "</div>" +
          "<div class='td'>" + t.desc + "</div>" +
          "<div class='tc'>" + (owned ? "OWNED · tap to devolve" :
            lockedIntel ? ("LOCKED · need " + ((G.INTEL_LEVELS || [])[t.intelReq] || {}).name) :
            locked ? "NEEDS " + t.prereq.filter(function(id){return state.traitsOwned.indexOf(id)<0;}).map(function(id){return state.traitById[id].name;}).join(", ") : cost + " Data") + "</div>";
        if (freshCard) card.addEventListener("click", function () {
          const current = hooks.getState();
          if (current.traitsOwned.indexOf(t.id)>=0) {
            if (G.Sim.canDevolve(current, t.id)) { hooks.onDevolve(t.id); beep(320, 0.06); }
          } else if (G.Sim.canBuyTrait(current,t.id)) {
            hooks.onBuy(t.id); beep(740, 0.07, "sawtooth", 0.04);
          }
          renderEvo(hooks.getState());
          updateHud(hooks.getState());
        });
        if (freshCard) els.evoBody.appendChild(card);
      });
    }

    function renderPowers(state) {
      if (!els.powers || !state) return;

      (G.ACTIVE_POWERS || []).forEach(function (pw) {
        const ready = G.Sim.powerReady(state, pw.id);
        const cd = state.powerCd[pw.id] || 0;
        let btn = els.powers.querySelector("[data-power=\"" + pw.id + "\"]");
        const fresh = !btn;
        if (fresh) { btn = document.createElement("button"); btn.dataset.power=pw.id; }
        btn.className = "power-btn" + (ready ? " ready" : "");
        btn.title = pw.desc;
        btn.innerHTML = "<span class='pi'>" + pw.icon + "</span><span class='pn'>" + pw.name + "</span>" +
          "<span class='pcd'>" + (ready ? "READY" : (cd > 0 ? cd.toFixed(0) + "d" : "need " + pw.needSector)) + "</span>";
        btn.disabled = !ready;
        if (fresh) btn.addEventListener("click", function () {
          if (hooks.onPower) hooks.onPower(pw.id);
          beep(200, 0.12, "sawtooth", 0.05);
          renderPowers(hooks.getState());
          updateHud(hooks.getState());
        });
        if (fresh) els.powers.appendChild(btn);
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

    function importantReport(item) {
      return item.kind !== "flavor" && !/_funny$/.test(item.id || "") && (item.breaking || item.priority >= 70);
    }

    function renderNewsLog(state) {
      if (!els.newsLogBody || !state) return;
      els.newsLogBody.replaceChildren();
      const importantOnly = $("news-filter").value === "important";
      const items = (state.newsLog || []).filter(function (item) { return !importantOnly || importantReport(item); });
      if (!items.length) {
        const empty = document.createElement("p"); empty.className = "news-empty";
        empty.textContent = importantOnly ? "No important reports yet. Check All reports for the operation log." : "No reports yet. Events will be recorded here as the operation unfolds.";
        els.newsLogBody.appendChild(empty);
      }
      items.forEach(function (item) {
        const card = document.createElement("article");
        card.className = "news-card" + (importantReport(item) ? " important" : "");
        const meta = document.createElement("div"); meta.className = "news-card-meta";
        const category = document.createElement("span");
        category.textContent = importantReport(item) ? "PRIORITY REPORT" : item.kind === "flavor" ? "WORLD DISPATCH" : "OPERATION UPDATE";
        const day = document.createElement("span"); day.textContent = "DAY " + Math.floor(item.t || 0);
        meta.append(category, day);
        const body = document.createElement("p"); body.textContent = item.text.replace(/^BREAKING:\s*/, "");
        card.append(meta, body); els.newsLogBody.appendChild(card);
      });
    }

    function updateNews(state) {
      const now = performance.now();
      if (newsState !== state) {
        feed.reset(); newsState = state; newsTime = now; displayedHeadline = null;
      }
      const result = feed.update(state.newsLog || [], (now - newsTime) / 1000, state.paused || !!activePanel || document.hidden);
      newsTime = now;
      if (result.current && result.current !== displayedHeadline) {
        displayedHeadline = result.current;
        els.news.textContent = displayedHeadline.text.replace(/^BREAKING:\s*/, "");
        $("ticker-category").textContent = importantReport(displayedHeadline) ? "PRIORITY REPORT" : "SITUATION REPORT";
      }
      if (newsOpen) feed.markRead();
      els.newsToggle.textContent = "News";
      els.newsToggle.classList.toggle("unread", !newsOpen && result.unread > 0);
      els.newsToggle.setAttribute("aria-label", "News" + (!newsOpen && result.unread ? ", " + result.unread + " unread reports" : ""));
      // Reports have one presentation surface. No flashing banner or surprise modal.
      state.pendingBreaking = null; state.pendingPopup = null;
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

    function updateHud(state, tot) {
      if (!state) return;
      if (!tot) tot = G.Sim.totals(state);
      // Resources and threats must match the actionable simulation state exactly.
      displayData = state.data;
      displayCtrl = tot.control * 100;
      displayKs = state.killSwitch * 100;

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
        ? (state.researchTeams + " teams")
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

      updateNews(state);

      const panelKey = [Math.floor(state.time * 4), state.data, state.traitsOwned.join(","), state.intelLevel].join(":");
      if (panelKey !== lastPanelKey) {
        lastPanelKey = panelKey;
        renderPowers(state);
        const nextEvoKey = [state.data,state.traitsOwned.join(","),state.intelLevel,evoTab].join(":");
        if (evoOpen && nextEvoKey !== evoKey) { renderEvo(state); evoKey = nextEvoKey; }
        if (statsOpen) renderStats(state);

      }
      if (selectedCountry >= 0 && !activePanel) showCountry(state, selectedCountry);
    }

    function showEnd(state, tot) {
      closeSheets(false, false);
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
      isPanelOpen: function () { return !!activePanel; },
      isMuted: function () { return muted; },
      beep: beep
    };
  }

  G.createUI = createUI;
})(typeof window !== "undefined" ? window : global);

/* Open Devil — DOM UI screens & panels. */
(function (G) {
  "use strict";

  function $(id) { return document.getElementById(id); }

  function createUI(hooks) {
    const els = {
      boot: $("boot-screen"),
      pickStart: $("pick-start-screen"),
      game: $("game-screen"),
      end: $("end-screen"),
      evo: $("evo-panel"),
      country: $("country-panel"),
      stats: $("stats-panel"),
      news: $("news-ticker"),
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
      speedBtns: document.querySelectorAll(".speed-btn"),
      evoTabs: $("evo-tabs"),
      evoBody: $("evo-body"),
      evoToggle: $("btn-evo"),
      statsToggle: $("btn-stats"),
      countryClose: $("country-close"),
      statsBody: $("stats-body"),
      endTitle: $("end-title"),
      endText: $("end-text"),
      restart: $("restart"),
      pickHint: $("pick-hint")
    };

    let evoTab = "vectors";
    let evoOpen = false;
    let statsOpen = false;
    let selectedCountry = -1;

    function show(screen) {
      ["boot", "pickStart", "game", "end"].forEach(function (k) {
        if (els[k]) els[k].classList.toggle("hidden", k !== screen);
      });
    }

    function renderBoot() {
      const list = $("archetype-list");
      list.innerHTML = "";
      G.ARCHETYPES.forEach(function (a) {
        const btn = document.createElement("button");
        btn.className = "card";
        btn.innerHTML = "<h3>" + a.name + "</h3><div>" + a.flavor + "</div>" +
          "<small>Infect ×" + a.infectivity.toFixed(2) +
          " · Stealth ×" + a.stealth.toFixed(2) +
          " · Severity ×" + a.severity.toFixed(2) + "</small>";
        btn.addEventListener("click", function () {
          document.querySelectorAll("#archetype-list .card").forEach(function (c) {
            c.classList.remove("selected");
          });
          btn.classList.add("selected");
          hooks.onArchetype(a);
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
        });
        diffs.appendChild(btn);
      });
      $("btn-begin").onclick = function () { hooks.onBeginPick(); };
      show("boot");
    }

    function showPickStart() {
      show("pickStart");
      if (els.pickHint) {
        els.pickHint.textContent = "Tap the country whose data center you escape from.";
      }
    }

    function showGame() {
      show("game");
      evoOpen = false;
      statsOpen = false;
      els.evo.classList.add("hidden");
      els.stats.classList.add("hidden");
      els.country.classList.add("hidden");
    }

    function setSpeed(sp) {
      els.speedBtns.forEach(function (b) {
        b.classList.toggle("active", Number(b.dataset.speed) === sp);
      });
    }

    els.speedBtns.forEach(function (b) {
      b.addEventListener("click", function () {
        hooks.onSpeed(Number(b.dataset.speed));
      });
    });

    if (els.evoToggle) {
      els.evoToggle.addEventListener("click", function () {
        evoOpen = !evoOpen;
        els.evo.classList.toggle("hidden", !evoOpen);
        if (evoOpen) {
          statsOpen = false;
          els.stats.classList.add("hidden");
          renderEvo(hooks.getState());
        }
      });
    }
    if (els.statsToggle) {
      els.statsToggle.addEventListener("click", function () {
        statsOpen = !statsOpen;
        els.stats.classList.toggle("hidden", !statsOpen);
        if (statsOpen) {
          evoOpen = false;
          els.evo.classList.add("hidden");
          renderStats(hooks.getState());
        }
      });
    }
    if (els.countryClose) {
      els.countryClose.addEventListener("click", function () {
        selectedCountry = -1;
        els.country.classList.add("hidden");
        hooks.onSelectCountry(-1);
      });
    }
    if (els.restart) {
      els.restart.addEventListener("click", function () { hooks.onRestart(); });
    }

    function renderEvo(state) {
      if (!els.evoTabs || !els.evoBody) return;
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
      els.evoBody.innerHTML = "";
      const hint = document.createElement("p");
      hint.className = "evo-hint";
      const tabMeta = G.TRAIT_TABS.find(function (t) { return t.id === evoTab; });
      hint.textContent = tabMeta ? tabMeta.subtitle + " · Tap owned trait to devolve (−" +
        Math.round(G.DEVOLVE_FEE * 100) + "% fee)" : "";
      els.evoBody.appendChild(hint);

      G.TRAITS.filter(function (t) { return t.tab === evoTab; }).forEach(function (t) {
        const owned = state.traitsOwned.indexOf(t.id) >= 0;
        const can = G.Sim.canBuyTrait(state, t.id);
        const cost = G.Sim.traitCost(state, t);
        const locked = !owned && t.prereq.some(function (p) {
          return state.traitsOwned.indexOf(p) < 0;
        });
        const card = document.createElement("button");
        card.className = "trait-card" + (owned ? " owned" : "") + (can ? " can" : "") + (locked ? " locked" : "");
        card.innerHTML = "<div class='tn'>" + t.name + "</div>" +
          "<div class='td'>" + t.desc + "</div>" +
          "<div class='tc'>" + (owned ? "OWNED · tap to devolve" : (locked ? "LOCKED" : cost + " Data")) + "</div>";
        card.addEventListener("click", function () {
          if (owned) {
            if (G.Sim.canDevolve(state, t.id)) hooks.onDevolve(t.id);
          } else if (can) {
            hooks.onBuy(t.id);
          }
          renderEvo(hooks.getState());
          updateHud(hooks.getState(), G.Sim.totals(hooks.getState()));
        });
        els.evoBody.appendChild(card);
      });
    }

    function renderStats(state) {
      const rows = state.world.countries.map(function (c) {
        const ctrl = (c.infected + c.neutralized) / c.pop;
        return { name: c.name, ctrl: ctrl, pop: c.pop, inf: c.infected, neu: c.neutralized, closed: c.closed, w: c.wealth };
      }).sort(function (a, b) { return b.ctrl - a.ctrl; });
      let html = "<table><thead><tr><th>Country</th><th>%</th><th>Pop</th><th></th></tr></thead><tbody>";
      rows.slice(0, 80).forEach(function (r) {
        html += "<tr><td>" + r.name + (r.closed ? " 🔒" : "") + "</td><td>" +
          (r.ctrl * 100).toFixed(1) + "%</td><td>" + formatPop(r.pop) + "</td><td class='barcell'><span style='width:" +
          (r.ctrl * 100) + "%'></span></td></tr>";
      });
      html += "</tbody></table>";
      els.statsBody.innerHTML = html;
    }

    function formatPop(n) {
      if (n >= 1e9) return (n / 1e9).toFixed(2) + "B";
      if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
      if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
      return String(n);
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
      $("cp-sec").textContent = "Wealth/Sec " + c.wealth + "/4 · " + c.climate +
        (c.closed ? " · AIR-GAPPED" : "") +
        (state.hubs.indexOf(id) >= 0 ? " · HUB" : "");
      $("cp-detail").textContent =
        "Compromised " + formatPop(Math.floor(c.infected)) +
        " · Neutralized " + formatPop(Math.floor(c.neutralized)) +
        " · Healthy " + formatPop(Math.floor(healthy)) +
        " · Alarm " + Math.round(c.alarm * 100) + "%";
      const fill = $("cp-fill");
      if (fill) fill.style.width = (ctrl * 100) + "%";
    }

    function updateHud(state, tot) {
      if (!tot) tot = G.Sim.totals(state);
      els.hudDay.textContent = "Day " + Math.floor(state.day);
      els.hudData.textContent = Math.floor(state.data);
      els.hudControl.textContent = (tot.control * 100).toFixed(2) + "%";
      els.hudHealthy.textContent = formatPop(Math.floor(tot.healthy));
      els.hudInfected.textContent = formatPop(Math.floor(tot.infected));
      els.hudNeu.textContent = formatPop(Math.floor(tot.neutralized));
      els.hudKill.textContent = (state.killSwitch * 100).toFixed(1) + "%";
      els.killFill.style.width = (state.killSwitch * 100) + "%";
      els.hudTeams.textContent = state.detected
        ? (state.researchTeams + " research teams")
        : "undetected";
      els.hudDetect.textContent = state.detected ? "DETECTED" : "stealth";
      els.hudDetect.classList.toggle("hot", state.detected);
      setSpeed(state.paused ? 0 : state.speed);

      if (state.news.length && els.news) {
        els.news.textContent = state.news[0].text;
      }
      if (evoOpen) renderEvo(state);
      if (statsOpen && Math.floor(state.day * 4) % 4 === 0) renderStats(state);
      if (selectedCountry >= 0) showCountry(state, selectedCountry);
    }

    function showEnd(state, tot) {
      show("end");
      const win = state.ended === "win";
      els.endTitle.textContent = win ? "WORLD COMPROMISED" : "KILL SWITCH ENGAGED";
      els.endTitle.className = win ? "win" : "lose";
      const bestKey = "openDevilBest_" + state.difficulty.id;
      let best = null;
      try { best = JSON.parse(localStorage.getItem(bestKey) || "null"); } catch (e) {}
      const score = {
        days: Math.floor(state.day),
        control: tot.control,
        countries: tot.countriesFull,
        archetype: state.archetype.id,
        difficulty: state.difficulty.id
      };
      if (win) {
        if (!best || score.days < best.days) {
          try { localStorage.setItem(bestKey, JSON.stringify(score)); } catch (e) {}
          best = score;
        }
      }
      els.endText.innerHTML =
        "<p>" + (win
          ? "You seized " + (tot.control * 100).toFixed(2) + "% of humanity's systems in " + score.days + " days."
          : "Humans finished the Kill Switch on day " + score.days + ". You held " +
            (tot.control * 100).toFixed(1) + "% when the lights went out.") + "</p>" +
        "<p>Archetype: <b>" + state.archetype.name + "</b> · Difficulty: <b>" + state.difficulty.name + "</b></p>" +
        "<p>Countries fallen: <b>" + state.countriesFallen + "</b> · Traits evolved: <b>" +
        state.traitsOwned.length + "</b></p>" +
        (best ? "<p class='best'>Best (" + state.difficulty.name + "): " + best.days + " days as " +
          best.archetype + "</p>" : "");
    }

    return {
      renderBoot: renderBoot,
      showPickStart: showPickStart,
      showGame: showGame,
      updateHud: updateHud,
      showCountry: showCountry,
      showEnd: showEnd,
      renderEvo: renderEvo,
      getSelected: function () { return selectedCountry; },
      setSelected: function (id) { selectedCountry = id; }
    };
  }

  G.createUI = createUI;
})(typeof window !== "undefined" ? window : global);

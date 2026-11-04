/* Open Devil — bootstrap & input loop. */
(function () {
  "use strict";

  if (!window.WORLD_MAP || !window.Sim) {
    console.error("Open Devil: missing WORLD_MAP or Sim");
    return;
  }

  const canvas = document.getElementById("map");
  const renderer = window.createRenderer(canvas);

  let archetype = window.ARCHETYPES[0];
  let difficulty = window.DIFFICULTIES.find(function (d) { return d.id === "normal"; }) || window.DIFFICULTIES[1];
  let state = null;
  let mode = "boot";
  let accumulator = 0;
  let saveElapsed = 0;
  let lastTs = 0;
  let dragging = false;
  let dragMoved = false;
  let lastX = 0, lastY = 0;
  let startX = 0, startY = 0;
  let pointers = new Map();
  let pinchStartDist = 0;
  let pinchStartScale = 1;

  const ui = window.createUI({
    onArchetype: function (a) { archetype = a; },
    onDifficulty: function (d) { difficulty = d; },
    onBeginPick: function () {
      state = window.Sim.createGame({
        map: window.WORLD_MAP,
        archetype: archetype,
        difficulty: difficulty,
        seed: (Date.now() % 100000) + 17
      });
      renderer.setMap(window.WORLD_MAP);
      const dataEl = document.getElementById("hud-data");
      if (renderer.setDataHudEl && dataEl) renderer.setDataHudEl(dataEl);
      accumulator = 0;
      mode = "pick";
      ui.showPickStart();
      renderer.resize();
      document.getElementById("game-screen").classList.remove("hidden");
      document.getElementById("boot-screen").classList.add("hidden");
      document.getElementById("pick-banner").classList.remove("hidden");
    },
    onSpeed: function (sp) {
      if (!state || mode !== "play") return;
      if (sp === 0) {
        state.paused = !state.paused;
        if (!state.paused && state.speed === 0) state.speed = 1;
      } else {
        state.paused = false;
        state.speed = sp;
      }
      ui.updateHud(state);
    },
    onBuy: function (id) {
      if (state) window.Sim.buyTrait(state, id);
    },
    onDevolve: function (id) {
      if (state) window.Sim.devolveTrait(state, id);
    },
    onPower: function (id) {
      if (state) window.Sim.usePower(state, id);
    },
    onSelectCountry: function (id) {
      if (state) ui.showCountry(state, id);
    },
    onRestart: function () {
      mode = "boot";
      state = null;
      document.getElementById("end-screen").classList.add("hidden");
      document.getElementById("game-screen").classList.add("hidden");
      document.getElementById("pick-banner").classList.add("hidden");
      ui.renderBoot();
      refreshContinue();
    },
    getState: function () { return state; }
  });

  function canvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const t = e.touches && e.touches[0] ? e.touches[0] : (e.changedTouches && e.changedTouches[0]) || e;
    return [t.clientX - rect.left, t.clientY - rect.top];
  }

  function onPointerDown(e) {
    if (e.button != null && e.button !== 0) return;
    const p = canvasPos(e);
    dragging = true;
    if (pointers.size === 0) dragMoved = false;
    startX = p[0]; startY = p[1];
    lastX = p[0];
    lastY = p[1];
    if (e.pointerId != null) {
      pointers.set(e.pointerId, p);
      if (pointers.size >= 2) dragMoved = true;
      if (pointers.size === 2) {
        const pts = Array.from(pointers.values());
        pinchStartDist = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
        pinchStartScale = renderer.getView().scale;
      }
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
    }
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (e.pointerId != null && pointers.has(e.pointerId)) {
      pointers.set(e.pointerId, canvasPos(e));
    }
    if (pointers.size === 2) {
      const pts = Array.from(pointers.values());
      const dist = Math.hypot(pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]);
      if (pinchStartDist > 0) {
        const mid = [(pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2];
        const target = pinchStartScale * (dist / pinchStartDist);
        const factor = target / renderer.getView().scale;
        renderer.zoomAt(mid[0], mid[1], factor);
        dragMoved = true;
      }
      e.preventDefault();
      return;
    }
    if (!dragging) return;
    const p = canvasPos(e);
    const dx = p[0] - lastX;
    const dy = p[1] - lastY;
    if (Math.hypot(p[0] - startX, p[1] - startY) > 6) dragMoved = true;
    renderer.pan(dx, dy);
    lastX = p[0];
    lastY = p[1];
    e.preventDefault();
  }

  function onPointerUp(e) {
    const p = canvasPos(e);
    if (e.pointerId != null) pointers.delete(e.pointerId);
    if (pointers.size < 2) pinchStartDist = 0;
    if (pointers.size) {
      const remaining = pointers.values().next().value;
      lastX = remaining[0]; lastY = remaining[1];
      return;
    }
    if (!dragging) return;
    dragging = false;
    if (dragMoved || !state) return;

    if (mode === "play") {
      const bub = renderer.bubbleAt(p[0], p[1], state.bubbles);
      if (bub) {
        const res = window.Sim.tapBubble(state, bub.id);
        if (res && renderer.spawnBurst) {
          renderer.spawnBurst(bub.x, bub.y, bub.kind, bub.value);
        }
        ui.beep(bub.kind === "infect" ? 880 : 330, 0.06);
        ui.updateHud(state);
        return;
      }
    }

    const id = renderer.hitTest(p[0], p[1], state.world.countries);
    if (mode === "pick") {
      if (id >= 0) {
        window.Sim.startInCountry(state, id);
        mode = "play";
        state.speed = 1;
        state.paused = false;
        document.getElementById("pick-banner").classList.add("hidden");
        ui.showGame();
        ui.showCountry(state, id);
        ui.updateHud(state);
        if (renderer.focusOn) {
          const c = state.world.countries[id];
          renderer.focusOn(c.centroid[0], c.centroid[1], renderer.getView().scale * 1.3, 0.8);
        }
        ui.beep(520, 0.1);
      }
      return;
    }
    if (mode === "play" && id >= 0) {
      ui.setSelected(id);
      ui.showCountry(state, id);
    }
  }

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", function (e) {
    dragMoved = true;
    onPointerUp(e);
  });
  canvas.addEventListener("wheel", function (e) {
    const p = canvasPos(e);
    renderer.zoomAt(p[0], p[1], e.deltaY < 0 ? 1.12 : 1 / 1.12);
    e.preventDefault();
  }, { passive: false });

  window.addEventListener("resize", function () { renderer.resize(); });
  if (window.ResizeObserver) {
    new ResizeObserver(function () { renderer.resize(); }).observe(canvas.parentElement);
  }

  document.addEventListener("touchmove", function (e) {
    if (e.target === canvas) e.preventDefault();
  }, { passive: false });

  function frame(ts) {
    requestAnimationFrame(frame);
    if (!lastTs) lastTs = ts;
    let dt = (ts - lastTs) / 1000;
    lastTs = ts;
    if (dt > 0.1) dt = 0.1;

    if (state && (mode === "play" || mode === "pick")) {
      if (mode === "play" && !state.ended) {
        if (!state.paused) accumulator += dt;
        while (accumulator >= 1 / 30 && !state.ended) {
          window.Sim.tick(state, 1 / 30);
          accumulator -= 1 / 30;
        }
        ui.updateHud(state);
        saveElapsed += dt;
        if (saveElapsed >= 10) { window.SaveGame.write(state); saveElapsed = 0; }
        state.events.length = 0;
        document.getElementById("operation-status").textContent = state.paused ? "OPERATION PAUSED" : state.detected ? "DETECTED · Humanity is responding" : "UNDETECTED · Expand your network";
        if (state.ended) {
          window.SaveGame.clear();
          ui.showEnd(state, window.Sim.totals(state));
        }
      }
      renderer.draw(state, {
        selected: ui.getSelected(),
        pickMode: mode === "pick",
        dt: dt
      });
    }
  }

  function refreshContinue() {
    const saved = window.SaveGame.read();
    document.getElementById("btn-continue").classList.toggle("hidden", !saved);
    document.getElementById("save-status").textContent = saved ? "Saved operation · Day " + Math.floor(saved.day) + " · " + saved.difficulty.name : "";
  }
  document.getElementById("btn-continue").onclick = function () {
    const saved = window.SaveGame.read(); if (!saved) { refreshContinue(); return; }
    state = saved; mode = "play"; accumulator = 0;
    renderer.setMap(window.WORLD_MAP); ui.showGame(); renderer.resize();
    document.getElementById("pick-banner").classList.add("hidden");
    ui.updateHud(state); ui.showCountry(state, state.startCountry);
  };
  document.getElementById("btn-menu").onclick = function () {
    const saved = window.SaveGame.write(state);
    if (state) state.paused = true;
    mode = "boot"; ui.renderBoot(); refreshContinue();
    if (!saved && state && state.startCountry !== null && !state.ended) document.getElementById("save-status").textContent = "Saving is unavailable in this browser. Keep this tab open.";
  };
  const select = document.getElementById("country-select");
  window.WORLD_MAP.countries.map(function(c,i){ return {name:c.n,id:i}; }).sort(function(a,b){return a.name.localeCompare(b.name);}).forEach(function(c){
    const option = document.createElement("option"); option.value=c.id; option.textContent=c.name; select.appendChild(option);
  });
  document.getElementById("country-go").onclick = function () {
    if (!state || select.value === "") return;
    const id = Number(select.value), c = state.world.countries[id];
    if (mode === "pick" && window.Sim.startInCountry(state,id)) {
      mode="play";state.paused=false;state.speed=1;
      document.getElementById("pick-banner").classList.add("hidden"); ui.showGame();
    }
    ui.showCountry(state,id);ui.updateHud(state);
    renderer.focusOn(c.centroid[0],c.centroid[1],renderer.getView().scale,0.4);
  };
  function zoom(factor) { renderer.zoomAt(canvas.clientWidth/2,canvas.clientHeight/2,factor); }
  document.getElementById("zoom-in").onclick=function(){zoom(1.3);};
  document.getElementById("zoom-out").onclick=function(){zoom(1/1.3);};
  document.getElementById("zoom-fit").onclick=function(){renderer.resize();};
  const guide=document.getElementById("guide-dialog");
  function openGuide(){if(state && mode==="play")state.paused=true;guide.showModal();}
  document.getElementById("btn-guide").onclick=openGuide;
  document.getElementById("btn-help").onclick=openGuide;
  document.getElementById("guide-close").onclick=document.getElementById("guide-done").onclick=function(){guide.close();};
  const w=window.WIN;
  document.getElementById("guide-thresholds").textContent="Shadow: critical infrastructure ≥ "+Math.round(w.shadowInfra*100)+"%, alarm ≤ "+Math.round(w.shadowAlarmMax*100)+"%, Kill Switch ≤ "+Math.round(w.shadowKsMax*100)+"%. Overt: infrastructure ≥ "+Math.round(w.overtInfra*100)+"%, military ≥ "+Math.round(w.overtMilitary*100)+"%.";
  document.addEventListener("keydown",function(e){
    if (guide.open || /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
    if(mode!=="play")return;
    if(e.code==="Space"){e.preventDefault();state.paused=!state.paused;}
    if(e.key.toLowerCase()==="e")document.getElementById("btn-evo").click();
    if(e.key==="+")zoom(1.3);if(e.key==="-")zoom(1/1.3);
  });
  document.addEventListener("visibilitychange",function(){
    if(document.hidden && state){window.SaveGame.write(state);state.paused=true;accumulator=0;}
    lastTs=0;
  });
  window.addEventListener("pagehide",function(){window.SaveGame.write(state);});

  renderer.setMap(window.WORLD_MAP);
  renderer.resize();

  ui.runIntro(function () {
    ui.renderBoot();
    refreshContinue();
  });
  requestAnimationFrame(frame);

  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    navigator.serviceWorker.register("sw.js").catch(function () { /* Local play remains available. */ });
  }

  window.__OD = {
    getState: function () { return state; },
    getMode: function () { return mode; },
    setArchetype: function (id) {
      archetype = window.ARCHETYPES.find(function (a) { return a.id === id; }) || archetype;
    },
    setDifficulty: function (id) {
      difficulty = window.DIFFICULTIES.find(function (d) { return d.id === id; }) || difficulty;
    },
    beginPick: function () {
      document.getElementById("btn-begin").click();
    },
    pickCountryIso: function (iso) {
      if (!state) return false;
      const id = state.world.countries.findIndex(function (c) { return c.iso === iso; });
      if (id < 0) return false;
      window.Sim.startInCountry(state, id);
      mode = "play";
      state.speed = 3;
      state.paused = false;
      document.getElementById("pick-banner").classList.add("hidden");
      ui.showGame();
      ui.showCountry(state, id);
      return true;
    },
    openEvolve: function () {
      document.getElementById("btn-evo").click();
    },
    renderer: renderer,
    ui: ui
  };
})();

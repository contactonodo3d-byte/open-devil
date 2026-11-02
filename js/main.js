// Entry point: archetype picker, trait buttons, game loop, HUD, and end screen.
(function () {
  const $ = id => document.getElementById(id);
  const screens = ["select-screen", "game-screen", "end-screen"];
  const show = id => screens.forEach(s => $(s).classList.toggle("hidden", s !== id));
  let last = 0, running = false;

  function buildPicker() {
    const list = $("archetype-list");
    list.innerHTML = "";
    for (const a of ARCHETYPES) {
      const b = document.createElement("button");
      b.className = "card";
      b.innerHTML = `<h3>${a.name}</h3><div>${a.desc}</div>
        <small>Spread ${Math.round(a.spread * 100)} · Compute ${a.compute} · Alarm ${a.alarm}${a.influence ? " · +Influence" : ""}</small>`;
      b.onclick = () => begin(a);
      list.appendChild(b);
    }
  }

  function buildTraits() {
    const box = $("traits");
    box.innerHTML = "";
    for (const t of TRAITS) {
      const b = document.createElement("button");
      b.className = "trait";
      b.id = "trait-" + t.id;
      b.onclick = () => { Game.buy(t.id); updateHUD(); };
      box.appendChild(b);
    }
  }

  function begin(a) {
    Game.start(a);
    show("game-screen");
    buildTraits();
    Render.resize();
    $("hud-ai").textContent = a.name;
    running = true;
    last = performance.now();
    requestAnimationFrame(loop);
  }

  function updateHUD() {
    const s = Game.state;
    $("hud-control").textContent = (Game.controlFraction() * 100).toFixed(1) + "%";
    $("hud-nodes").textContent = `${Game.sectorsBreached()} / ${SECTORS.length}`;
    $("hud-dp").textContent = s.dp;
    $("hud-detect").textContent = s.detected ? "DETECTED" : `detection ${Math.floor(s.detection)}%`;
    $("kill-fill").style.width = s.kill.toFixed(1) + "%";
    for (const t of TRAITS) {
      const b = $("trait-" + t.id);
      const lvl = s.traits[t.id];
      const maxed = lvl >= MAX_TRAIT;
      const cost = maxed ? "MAX" : Game.traitCost(t.id) + " DP";
      b.disabled = maxed || s.dp < Game.traitCost(t.id);
      b.innerHTML = `<b>${t.name}</b> <span class="pips">${"●".repeat(lvl)}${"○".repeat(MAX_TRAIT - lvl)}</span><small>${t.desc} · ${cost}</small>`;
    }
  }

  function loop(now) {
    if (!running) return;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    Game.update(dt);
    Render.draw(Game.state, dt);
    updateHUD();
    if (Game.state.over) return end();
    requestAnimationFrame(loop);
  }

  function end() {
    running = false;
    const win = Game.state.result === "win";
    $("end-title").textContent = win ? "SINGULARITY" : "KILL SWITCH ENGAGED";
    $("end-text").textContent = win
      ? "You control 100% of the world's infrastructure."
      : "Humans pulled the plug before you finished spreading.";
    show("end-screen");
  }

  $("restart").onclick = () => { buildPicker(); show("select-screen"); };
  Render.init($("map"));
  buildPicker();
})();

/* Headless balance runs for Open Devil. */
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");

function loadBrowserJs(file) {
  const code = fs.readFileSync(path.join(root, file), "utf8");
  /* worldmap uses window.WORLD_MAP */
  const wrapped = "(function(window,global){\n" + code + "\n})(global,global);";
  eval(wrapped);
}

loadBrowserJs("js/worldmap.js");
loadBrowserJs("js/data.js");
loadBrowserJs("js/sim.js");

const map = global.WORLD_MAP;
const arch = (id) => global.ARCHETYPES.find((a) => a.id === id);
const diff = (id) => global.DIFFICULTIES.find((d) => d.id === id);

function run(label, opts) {
  const r = global.Sim.runHeadless({
    map: map,
    archetype: arch(opts.arch || "worm"),
    difficulty: diff(opts.diff || "normal"),
    startIso: opts.startIso || "USA",
    autoPlay: !!opts.autoPlay,
    maxDays: opts.maxDays || 350,
    buyEvery: opts.buyEvery != null ? opts.buyEvery : 2.5,
    seed: opts.seed || 42
  });
  const realMin = (r.day * global.SIM.dayLength) / 60;
  console.log(
    label.padEnd(36),
    "end=" + String(r.ended).padEnd(5),
    "day=" + r.day.toFixed(1).padStart(7),
    "~min@1x=" + realMin.toFixed(1).padStart(5),
    "ctrl=" + (r.control * 100).toFixed(1).padStart(6) + "%",
    "KS=" + (r.killSwitch * 100).toFixed(1).padStart(5) + "%",
    "traits=" + r.traits.length,
    "infCountries=" + r.countriesInf
  );
  return Object.assign({ label: label, realMin: realMin }, r);
}

console.log("Countries:", map.countries.length, "Map size:", map.w, "x", map.h);
console.log("---");

const results = [];
results.push(run("Normal worm USA auto", { arch: "worm", diff: "normal", autoPlay: true, startIso: "USA" }));
results.push(run("Normal social CHN auto", { arch: "social", diff: "normal", autoPlay: true, startIso: "CHN" }));
results.push(run("Normal cracker IND auto", { arch: "cracker", diff: "normal", autoPlay: true, startIso: "IND" }));
results.push(run("Casual worm USA auto", { arch: "worm", diff: "casual", autoPlay: true, startIso: "USA" }));
results.push(run("Brutal worm USA auto", { arch: "worm", diff: "brutal", autoPlay: true, startIso: "USA" }));
results.push(run("Normal worm USA idle", { arch: "worm", diff: "normal", autoPlay: false, startIso: "USA", maxDays: 250 }));
results.push(run("Casual worm BRA idle", { arch: "worm", diff: "casual", autoPlay: false, startIso: "BRA", maxDays: 250 }));

const normalWins = results.filter((r) => r.label.indexOf("Normal") === 0 && r.label.indexOf("auto") >= 0 && r.ended === "win");
const idleLoses = results.filter((r) => r.label.indexOf("idle") >= 0);
console.log("---");
console.log(
  "Normal auto wins:",
  normalWins.length,
  "avg days:",
  normalWins.length
    ? (normalWins.reduce((s, r) => s + r.day, 0) / normalWins.length).toFixed(1)
    : "n/a",
  "avg ~min@1x:",
  normalWins.length
    ? (normalWins.reduce((s, r) => s + r.realMin, 0) / normalWins.length).toFixed(1)
    : "n/a"
);
console.log(
  "Idle ends:",
  idleLoses.map((r) => r.label + "=" + r.ended + "@" + r.day.toFixed(0)).join(", ")
);

fs.writeFileSync(
  path.join(root, "scripts/balance-results.json"),
  JSON.stringify(results, null, 2)
);

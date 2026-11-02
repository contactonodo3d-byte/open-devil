# Open Devil

A Plague Inc.–inspired **rogue-AI takeover** game that runs entirely in the browser
(`file://`, GitHub Pages, iPhone Safari). Vanilla HTML5 Canvas / JS / CSS — no build step,
no runtime network fetches.

## Concept

You are a lab AI that escaped into the open internet. This is **not** a disease reskin:

1. **Self-improvement snowball** — captured compute (wealth-weighted countries + Cloud
   sectors) generates **Intelligence** (Narrow → Capable → AGI → ASI). Higher tiers
   passively boost stats and unlock late traits.
2. **Infrastructure powers** — each country has sectors (Telecom, Finance, Media, Cloud,
   Power Grid, Satellites, Military). Crossing control thresholds captures them and
   unlocks passive bonuses plus tap-to-use **active abilities** (Blackout, Deepfake Storm,
   Market Flash Crash, Zero-Day Burst).
3. **Software-style defenses** — humans push Security Patches, Antivirus Sweeps,
   Air-Gapped Backups, Honeypots, and eventually a **Rival AI**. The **Kill Switch** is
   still the global lose condition.
4. **Win by control**, two routes:
   - **Quiet Singularity (Shadow)** — dominate critical infrastructure while keeping
     alarm / Kill Switch low.
   - **Overt Singularity** — seize global infrastructure including Military.

## How to play

1. Open `index.html` in a browser (or host the folder statically).
2. Pick an archetype + difficulty, then tap your origin country on the map.
3. Spend **Data** to evolve Vectors / Behaviors / Abilities.
4. Capture sectors, raise Intelligence, and use active powers from the bar under the HUD.
5. Watch the news ticker — BREAKING banners and popups mark major events.

### Win / lose

| Outcome | Condition |
|--------|-----------|
| Shadow win | Critical infra high, alarm & Kill Switch low |
| Overt win | Global infra + Military dominance |
| Lose | Kill Switch reaches 100% |

## Files

| Path | Role |
|------|------|
| `index.html` / `style.css` / `manifest.json` | Shell UI |
| `js/worldmap.js` | Embedded Natural Earth 110m (Miller), ~145KB |
| `js/data.js` | Archetypes, traits, sectors, powers, headlines, balance |
| `js/sim.js` | Pure simulation (headless-capable) |
| `js/render.js` | Digital-breach map, net arcs, satellites |
| `js/ui.js` / `js/main.js` | HUD, evolve tree, input loop |
| `scripts/` | Balance + Playwright helpers |

## Balance notes

Headless auto-play (Normal): roughly **8–12 minutes** of 1× time to a win with competent
trait/power use. Idle runs lose to the Kill Switch. Brutal is demanding; stealthy
archetypes fare better. Both Shadow and Overt routes are reachable.

## License

Map data derived from Natural Earth (public domain) via world-atlas.

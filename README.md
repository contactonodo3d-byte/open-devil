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
trait/power use. Normal idle runs lose to the Kill Switch; Casual can win without purchases. Brutal is demanding; stealthy
archetypes fare better. Both Shadow and Overt routes are reachable.

## License

Map data derived from Natural Earth (public domain) via world-atlas.

## Development and verification

The game still runs without npm. Development checks require Node 22+ and Python 3:

```sh
npm ci
npx playwright install chromium
npm test
npm run test:browser
npm run balance
```

Set `CHROMIUM_PATH` to use an installed Chromium executable. Browser tests serve the
repository on localhost:8765; no external server is required. CI runs simulation
and desktop/mobile Chromium checks. Legacy scripts under `scripts/browser-*.mjs`
are historical helpers; use `npm run test:browser` for maintained checks.

See [AUDIT.md](AUDIT.md) for findings, limitations and prioritized follow-up work.

## Command interface and saved games

The menu includes a field manual and a versioned Continue operation. Progress saves
locally every ten seconds, on returning to the menu, and when the tab is hidden.
Continuing starts paused. News history resets on load. Clearing site data removes
saves. If storage is unavailable, the menu reports that saving failed.

Select a country using the map or the country dropdown. Space pauses, E opens
Evolution, Escape closes panels, and +/− zoom the map. Native zoom buttons are also
available. A hidden tab pauses automatically. Reduced motion skips the introduction.

After the first complete visit over HTTPS or localhost, a service worker caches the
application for offline play. Increment the cache version in `sw.js` when shipping
asset changes. New versions activate after older tabs close.

Balance matrix: `node scripts/balance-matrix.cjs` (27 seeded campaigns, results in
`scripts/balance-matrix.json`). These automated runs are a diagnostic sample, not
human win-rate estimates. Runtime income now uses diminishing returns.

## Reading and planning

Events never move or zoom the camera. Drag, scroll, zoom buttons, Reset map, and an
explicit country inspection control the view; resizing preserves its center and zoom.

Evolve, World and News pause the simulation. Each docked workspace has a persistent **Back to
map** button; Escape or the Map navigation tab also returns. Returning restores
the prior pause state, so a deliberately paused game stays paused. The guide follows
the same rule. Workspaces sit beside the map on desktop/landscape and below it on
portrait phones; they never overlap the map or hide navigation. Switching away from the tab leaves the game paused for your return.

Situation reports use a stable summary (at least 12 real seconds per headline,
independent of 1×/2×/3× speed). Read reports or News opens full, selectable text cards,
with an Important only filter. Related repeat reports are grouped in the summary;
the archive keeps the latest 120 reports. Reports never open a surprise modal or
flash a banner over controls. Opening an archive marks its reports as read.

## Build 4 layout

A single stylesheet defines the app layout. Powers live in World, country lookup
opens from Find, and the noninteractive evolution diagram has been removed.
Planning workspaces share the available space with the map. Their content scrolls
independently while tabs and Back remain visible. The HUD uses exact resource values
and nonwrapping counters to avoid changing the map size as a campaign progresses.

Layout checks cover 320×568, 390×844, 844×390, 768×1024 and 1280×800, with mouse and
touch contexts. All CSS/JS URLs and the offline cache are versioned together for
this release. When changing the cache version, update the HTML asset query versions
and the service worker precache list together.

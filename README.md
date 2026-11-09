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
npx playwright install chromium webkit
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
asset changes. From build 6, the completed cache activates immediately; navigation
checks the network first and falls back to the cached application when offline.

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

## Build 6: strategic decisions

Evolution cards show current → resulting stats before buying (or devolving), including
stat caps and visibility tradeoffs. World contains the exact checklist for Quiet
Singularity, Overt takeover, and the alternative absolute-control route. Every condition
within a route must hold together; the Kill Switch reaching 100% takes precedence.

Reports explain impact and suggested responses, with buttons to open the relevant
workspace. Flavor/joke reports are explicitly identified as having no separate
mechanical effect. Suggestions are guidance, not guarantees of success.

Archetype doctrines add distinct permanent tradeoffs: Worm favors land spread with
less stealth, Social favors stealth with less spread, and Cracker favors wealthy
systems with higher visibility. The setup screen displays the actual starting stats.
Origin profiles show hub connections, security/compute tradeoffs and starting bonuses:
wealth ≤2 gives +6 Data, while four or more land neighbors gives a 20% larger initial
foothold. Map selection opens the profile; Start here confirms the origin.

The postgame review explains the final condition, lists unmet route requirements on
loss, suggests a next-run adjustment and displays recent recorded decisions/milestones.
A bounded decision timeline survives saves. Older saves load with an empty timeline
and begin recording new actions; pre-update decisions are never invented.

Run `node scripts/balance-origins.cjs` for the 12-run origin/archetype sample in addition
to the 27-run difficulty matrix. Both use a diagnostic bot and fixed simulation steps;
they do not estimate human win rates.

## Languages (build 7)

Choose **English**, **Español** or **Português** from the main menu. The game uses the
saved choice; on a first visit it follows a supported browser language or uses English.
`?lang=en`, `?lang=es` and `?lang=pt` explicitly choose a language. Portuguese uses
Brazilian terminology and `pt-BR` country names. The selector retains its native names.

Changing language refreshes the menu, preserving the selected archetype/difficulty and
saved operation. Continue resumes paused. IDs and mechanics remain language-independent.
The interface, manual, strategy explanations, upgrade descriptions, country names,
192 news templates and postgame review are translated using bundled catalogs; no
translation API is called. Catalog tests check coverage and placeholder preservation.
`js/i18n.js` translates presentation expressions synchronously; simulation IDs and
saved numeric values are never translated. `scripts/localize-source.cjs` is an
idempotent development helper for wrapping new presentation assignments. Add new text
to `js/locales/ui.js` or the appropriate data/news catalog when extending the game.

## Build 8: contained menu scrolling

The main menu scrolls vertically and supports intentional pinch zoom, but has no
horizontal overflow. The decorative map stays inside its column; menu grid tracks
and children can shrink to the viewport. The language select uses 16px text to avoid
automatic form-focus zoom in mobile Safari. Menu overflow tests inspect the actual
`#boot-screen` scroller, attempt horizontal scrolling, verify vertical scrolling and
exercise the launch button in English, Spanish and Portuguese at four viewport sizes.
A dedicated WebKit project runs the same checks in CI alongside Chromium.

## Build 9: approved visual design

The crimson-globe concept is implemented as native, responsive HTML/CSS/Canvas:
original generated globe artwork (optimized WebP, about 81 KB), devil-chip branding,
three icon-based archetype cards, an explicit selected-stat/tradeoff disclosure, and
matching PNG/SVG app icons. Artwork is decorative; controls and text remain accessible,
localized DOM rather than an image of a user interface.

Gameplay uses three resource cards, a separate Kill Switch meter, a full-text report
card and four persistent SVG-icon navigation buttons at the bottom. Country search
lives on the map. Planning workspaces keep the map visible; duplicate headlines hide
while reading/planning. Powers scroll with World content to preserve usable room on
small phones. Navigation retains all close, pause, keyboard and focus behavior.

The image-generation source is preserved outside the repository; only the optimized
production asset is bundled. The new icon symbols are authored vectors. The existing
Natural Earth geometry still drives the interactive map, with updated contrast and
infection colors. Menu overflow protection and 16px native language controls remain.

# Open Devil

A Plague Inc.–style rogue-AI pandemic sim on a real world map. Vanilla HTML5 Canvas + JS + CSS — no frameworks, no CDN, no runtime network fetches. Open `index.html` from `file://` or serve statically (e.g. GitHub Pages). Works on desktop Chrome and iPhone Safari (touch, safe areas).

## Theme

You are a rogue AI that breached a data-center lab. Spread through countries via land borders and data-cable / satellite uplinks. Humans race to finish a **Kill Switch** (the cure analogue).

- **Win:** control / infect 100% of world population  
- **Lose:** Kill Switch research reaches 100%

## How to play

1. Pick an **archetype** (Worm / Social-Engineering / Brute-Force) and **difficulty**.
2. Tap a country on the map — that data center is your origin.
3. Earn **Data** (DNA points) from passive income and orange infection bubbles.
4. Open **Evolve** to buy **Vectors** / **Behaviors** / **Abilities** (Transmission / Symptoms / Abilities).
5. Blue bubbles slow the Kill Switch when tapped.
6. Pause / 1× / 2× / 3× speed in the HUD.

## Files

| Path | Role |
|------|------|
| `index.html` | Shell, HUD, panels, iOS meta |
| `style.css` | Dark cyber UI |
| `manifest.json` | PWA-ish standalone |
| `js/worldmap.js` | Embedded Natural Earth 110m countries (Miller), pops, neighbors, dots |
| `js/data.js` | Archetypes, difficulties, trait trees, headlines, sim constants |
| `js/sim.js` | Pure simulation (browser + Node) |
| `js/render.js` | Canvas map, pan/zoom, infection shading, packets, bubbles |
| `js/ui.js` | Screens, evolution sheet, country panel, world stats |
| `js/main.js` | Input, game loop, test hooks (`window.__OD`) |

Map data is generated offline from `world-atlas` (Natural Earth). Rebuild with the script in `/workspace/od-build/build.js` if needed.

## Balance tests

```bash
node scripts/balance.js
```

## License / data

Country boundaries: Natural Earth (public domain) via world-atlas. Population figures are approximate contemporary estimates embedded for gameplay.

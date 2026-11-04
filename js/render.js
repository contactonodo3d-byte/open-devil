/* Open Devil — canvas renderer: digital breach visuals, net layer, FX. */
(function (G) {
  "use strict";

  function createRenderer(canvas) {
    const ctx = canvas.getContext("2d", { alpha: false });
    let dpr = 1;
    let view = { x: 0, y: 0, scale: 1, minScale: 0.35, maxScale: 8 };
    let mapW = 2000, mapH = 1000;
    let cssW = 0, cssH = 0;
    const pathCache = [];
    const countryGfx = []; /* { mesh, nodes:[{x,y}], links:[[i,j]], flash:0, displayCtrl:0 } */
    let netLinks = []; /* ambient backbone {a,b,x0,y0,x1,y1,phase} */
    let satellites = [];
    let particles = [];
    let floaters = [];
    let ripples = [];
    let glyphs = [];
    let camAnim = null;
    let time = 0;
    let dataHudEl = null;

    function setMap(map) {
      camAnim = null;
      particles = []; floaters = []; ripples = []; glyphs = [];
      mapW = map.w; mapH = map.h;
      pathCache.length = 0;
      countryGfx.length = 0;
      map.countries.forEach(function (c, i) {
        const p = new Path2D();
        (c.p || []).forEach(function (flat) {
          if (!flat || flat.length < 6) return;
          p.moveTo(flat[0], flat[1]);
          for (let k = 2; k < flat.length; k += 2) p.lineTo(flat[k], flat[k + 1]);
          p.closePath();
        });
        pathCache[i] = p;
        countryGfx[i] = buildCountryGfx(c, i);
      });
      buildNetLayer(map);
      initSatellites();
      fit();
    }

    function buildCountryGfx(c, idx) {
      const b = c.b;
      const w = Math.max(8, b[2] - b[0]);
      const h = Math.max(8, b[3] - b[1]);
      /* seed nodes from precomputed dots + centroid */
      const nodes = [];
      const dots = c.d || [];
      for (let i = 0; i < dots.length; i += 2) {
        nodes.push({ x: dots[i], y: dots[i + 1], lit: 0, dead: 0 });
      }
      if (!nodes.length) nodes.push({ x: c.c[0], y: c.c[1], lit: 0, dead: 0 });
      /* hub-ish: ensure centroid node */
      nodes.unshift({ x: c.c[0], y: c.c[1], lit: 0, dead: 0, hub: true });
      /* cap nodes for perf */
      while (nodes.length > 28) nodes.pop();
      /* MST-ish links for network look */
      const links = [];
      const used = [0];
      const left = [];
      for (let i = 1; i < nodes.length; i++) left.push(i);
      while (left.length) {
        let bestD = 1e9, bi = -1, bj = -1;
        for (let u = 0; u < used.length; u++) {
          for (let v = 0; v < left.length; v++) {
            const a = nodes[used[u]], b2 = nodes[left[v]];
            const d = (a.x - b2.x) * (a.x - b2.x) + (a.y - b2.y) * (a.y - b2.y);
            if (d < bestD) { bestD = d; bi = used[u]; bj = v; }
          }
        }
        const ni = left.splice(bj, 1)[0];
        links.push([bi, ni]);
        used.push(ni);
      }
      /* a few extra cross links */
      for (let k = 0; k < Math.min(4, nodes.length - 1); k++) {
        const i = 1 + (k * 7) % (nodes.length - 1);
        const j = 1 + (k * 13) % (nodes.length - 1);
        if (i !== j) links.push([i, j]);
      }
      /* offscreen mesh pattern */
      const pad = 4;
      const ow = Math.ceil(w + pad * 2);
      const oh = Math.ceil(h + pad * 2);
      const off = document.createElement("canvas");
      off.width = Math.max(2, Math.min(512, ow));
      off.height = Math.max(2, Math.min(512, oh));
      const octx = off.getContext("2d");
      const sx = off.width / ow, sy = off.height / oh;
      octx.strokeStyle = "rgba(0,255,180,0.35)";
      octx.lineWidth = 1;
      const step = Math.max(6, Math.min(14, Math.floor(Math.min(off.width, off.height) / 12)));
      for (let x = 0; x < off.width; x += step) {
        octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x, off.height); octx.stroke();
      }
      for (let y = 0; y < off.height; y += step) {
        octx.beginPath(); octx.moveTo(0, y); octx.lineTo(off.width, y); octx.stroke();
      }
      octx.strokeStyle = "rgba(0,200,255,0.2)";
      for (let x = 0; x < off.width; x += step * 2) {
        octx.beginPath(); octx.moveTo(x, 0); octx.lineTo(x + off.height, off.height); octx.stroke();
      }
      return {
        mesh: off, ox: b[0] - pad, oy: b[1] - pad, ow: ow, oh: oh,
        nodes: nodes, links: links, flash: 0, displayCtrl: 0, displayNeu: 0, glitch: 0
      };
    }

    function buildNetLayer(map) {
      netLinks = [];
      const hubs = [];
      const byIso = {};
      map.countries.forEach(function (c, i) { byIso[c.iso] = i; });
      (G.HUB_ISOS || []).forEach(function (iso) {
        if (byIso[iso] != null) hubs.push(byIso[iso]);
      });
      if (hubs.length < 12) {
        map.countries.forEach(function (c, i) {
          if (c.w >= 3 && hubs.length < 22) hubs.push(i);
        });
      }
      /* ring + star connections */
      for (let i = 0; i < hubs.length; i++) {
        const a = hubs[i];
        const b = hubs[(i + 1) % hubs.length];
        const c = hubs[(i + 3) % hubs.length];
        addNet(map, a, b, i * 0.37);
        if (i % 2 === 0) addNet(map, a, c, i * 0.51);
      }
      /* major transoceanic */
      const pairs = [["USA","GBR"],["USA","JPN"],["GBR","IND"],["BRA","AGO"],["AUS","JPN"],["CHN","DEU"],["USA","BRA"],["ZAF","IND"]];
      pairs.forEach(function (pr, i) {
        if (byIso[pr[0]] != null && byIso[pr[1]] != null) addNet(map, byIso[pr[0]], byIso[pr[1]], 1.7 + i);
      });
    }

    function addNet(map, ia, ib, phase) {
      const a = map.countries[ia], b = map.countries[ib];
      if (!a || !b) return;
      netLinks.push({
        a: ia, b: ib,
        x0: a.c[0], y0: a.c[1], x1: b.c[0], y1: b.c[1],
        phase: phase || Math.random() * Math.PI * 2
      });
    }

    function initSatellites() {
      satellites = [];
      for (let i = 0; i < 3; i++) {
        satellites.push({
          y: 80 + i * 220 + Math.random() * 40,
          x: Math.random() * mapW,
          speed: 18 + Math.random() * 22,
          trail: [],
          beam: 0
        });
      }
    }

    function resize() {
      const parent = canvas.parentElement || document.body;
      const width = parent.clientWidth, height = parent.clientHeight;
      if (!width || !height) return;
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      if (width === cssW && height === cssH && nextDpr === dpr) return;
      const center = cssW && cssH ? screenToWorld(cssW / 2, cssH / 2) : null;
      cssW = width; cssH = height; dpr = nextDpr;
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      camAnim = null;
      if (!center) { fit(); return; }
      // Layout changes preserve the player's location and zoom.
      view.minScale = Math.min(cssW * 0.92 / mapW, cssH * 0.92 / mapH) * 0.85;
      view.x = cssW / 2 - center[0] * view.scale;
      view.y = cssH / 2 - center[1] * view.scale;
    }

    function fit() {
      camAnim = null;
      if (!cssW || !cssH) return;
      const pad = 0.92;
      const sx = (cssW * pad) / mapW;
      const sy = (cssH * pad) / mapH;
      view.minScale = Math.min(sx, sy) * 0.85;
      view.scale = Math.min(sx, sy);
      view.x = (cssW - mapW * view.scale) / 2;
      view.y = (cssH - mapH * view.scale) / 2;
    }

    function worldToScreen(wx, wy) {
      return [wx * view.scale + view.x, wy * view.scale + view.y];
    }
    function screenToWorld(sx, sy) {
      return [(sx - view.x) / view.scale, (sy - view.y) / view.scale];
    }
    function pan(dx, dy) { camAnim = null; view.x += dx; view.y += dy; }
    function zoomAt(sx, sy, factor) {
      camAnim = null;
      const before = screenToWorld(sx, sy);
      view.scale = Math.max(view.minScale, Math.min(view.maxScale, view.scale * factor));
      const after = screenToWorld(sx, sy);
      view.x += (after[0] - before[0]) * view.scale;
      view.y += (after[1] - before[1]) * view.scale;
    }

    function focusOn(wx, wy, scale, dur) {
      const sc = worldToScreen(wx, wy);
      camAnim = {
        t: 0, dur: dur || 0.85,
        x0: view.x, y0: view.y, s0: view.scale,
        x1: cssW / 2 - wx * (scale || view.scale * 1.4),
        y1: cssH / 2 - wy * (scale || view.scale * 1.4),
        s1: Math.min(view.maxScale, Math.max(view.minScale, scale || view.scale * 1.35))
      };
    }

    function hitTest(sx, sy, countries) {
      const w = screenToWorld(sx, sy);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      let best = -1, bestArea = Infinity;
      for (let i = 0; i < countries.length; i++) {
        const c = countries[i];
        const b = c.bounds;
        if (w[0] < b[0] - 2 || w[0] > b[2] + 2 || w[1] < b[1] - 2 || w[1] > b[3] + 2) continue;
        if (!pathCache[i]) continue;
        if (ctx.isPointInPath(pathCache[i], w[0], w[1])) {
          const area = (b[2] - b[0]) * (b[3] - b[1]);
          if (area < bestArea) { bestArea = area; best = i; }
        }
      }
      ctx.restore();
      return best;
    }

    function bubbleAt(sx, sy, bubbles) {
      const w = screenToWorld(sx, sy);
      const hitR = 16 / view.scale;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (Math.hypot(b.x - w[0], b.y - w[1]) < hitR) return b;
      }
      return null;
    }

    function spawnBurst(wx, wy, kind, value) {
      const n = Math.min(14, 8 + (value || 2));
      for (let i = 0; i < n; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 40 + Math.random() * 120;
        particles.push({
          x: wx, y: wy,
          vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
          life: 0.45 + Math.random() * 0.35,
          max: 0.8,
          r: 1.5 + Math.random() * 2,
          col: kind === "cure" ? "#3aa0ff" : "#ff9a2e",
          home: kind === "infect"
        });
      }
      floaters.push({
        x: wx, y: wy, vy: -28, life: 1.1,
        text: kind === "infect" ? ("+" + value) : "↓KS",
        col: kind === "infect" ? "#ffcc66" : "#7ec8ff"
      });
    }

    function addRipple(wx, wy, col) {
      ripples.push({ x: wx, y: wy, r: 2, life: 0.9, col: col || "rgba(0,255,200,0.7)" });
    }

    function syncGfx(state, dt) {
      const countries = state.world.countries;
      for (let i = 0; i < countries.length; i++) {
        const c = countries[i];
        const g = countryGfx[i];
        if (!g) continue;
        const ctrl = (c.infected + c.neutralized) / c.pop;
        const neu = c.neutralized / c.pop;
        g.displayCtrl += (ctrl - g.displayCtrl) * Math.min(1, dt * 2.2);
        g.displayNeu += (neu - g.displayNeu) * Math.min(1, dt * 2.2);
        if (g.flash > 0) g.flash = Math.max(0, g.flash - dt);
        if (g.glitch > 0) g.glitch = Math.max(0, g.glitch - dt);
        const litN = Math.floor(g.nodes.length * g.displayCtrl);
        const deadN = Math.floor(g.nodes.length * g.displayNeu);
        for (let n = 0; n < g.nodes.length; n++) {
          const target = n < litN ? 1 : 0;
          g.nodes[n].lit += (target - g.nodes[n].lit) * Math.min(1, dt * 4);
          g.nodes[n].dead = n < deadN ? Math.min(1, (g.nodes[n].dead || 0) + dt * 2) : Math.max(0, (g.nodes[n].dead || 0) - dt);
        }
      }
      (state.uiFx || []).forEach(function (fx) {
        if (fx._seen) return;
        fx._seen = true;
        if ((fx.type === "breach" || fx.type === "fall") && fx.country != null) {
          const c = countries[fx.country];
          const g = countryGfx[fx.country];
          if (c && g) {
            g.flash = 1.2;
            g.glitch = 0.8;
            addRipple(c.centroid[0], c.centroid[1], fx.type === "fall" ? "rgba(255,80,120,0.8)" : "rgba(0,255,220,0.85)");
            // Events mark the location without taking control of the camera.
          }
        }
      });
    }

    function drawNet(state) {
      const countries = state.world.countries;
      const hasSat = state.traitsOwned && state.traitsOwned.indexOf("sat") >= 0;
      netLinks.forEach(function (L) {
        const ca = countries[L.a], cb = countries[L.b];
        if (!ca || !cb) return;
        const caCtrl = (ca.infected + ca.neutralized) / ca.pop;
        const cbCtrl = (cb.infected + cb.neutralized) / cb.pop;
        const cut = ca.closed || cb.closed;
        const both = caCtrl > 0.4 && cbCtrl > 0.4;
        const mx = (L.x0 + L.x1) / 2;
        const my = (L.y0 + L.y1) / 2 - Math.hypot(L.x1 - L.x0, L.y1 - L.y0) * 0.12;
        ctx.beginPath();
        ctx.moveTo(L.x0, L.y0);
        ctx.quadraticCurveTo(mx, my, L.x1, L.y1);
        if (cut) {
          ctx.strokeStyle = "rgba(255,70,70,0.18)";
          ctx.setLineDash([4 / view.scale, 6 / view.scale]);
        } else if (both) {
          ctx.strokeStyle = "rgba(0,255,200,0.28)";
          ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = "rgba(80,140,180,0.12)";
          ctx.setLineDash([]);
        }
        ctx.lineWidth = (cut ? 1.0 : both ? 1.4 : 0.9) / view.scale;
        ctx.stroke();
        ctx.setLineDash([]);
        /* traveling pulse */
        if (!cut) {
          const u = ((time * 0.08 + L.phase) % 1 + 1) % 1;
          const px = (1 - u) * (1 - u) * L.x0 + 2 * (1 - u) * u * mx + u * u * L.x1;
          const py = (1 - u) * (1 - u) * L.y0 + 2 * (1 - u) * u * my + u * u * L.y1;
          ctx.fillStyle = both ? "rgba(0,255,220,0.85)" : "rgba(140,190,220,0.35)";
          ctx.beginPath();
          ctx.arc(px, py, (both ? 2.4 : 1.6) / view.scale, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      /* active AI packets on top */
      (state.packets || []).forEach(function (p) {
        const u = Math.min(1, p.t / p.dur);
        const mx = (p.x0 + p.x1) / 2;
        const my = (p.y0 + p.y1) / 2 - Math.hypot(p.x1 - p.x0, p.y1 - p.y0) * 0.18;
        ctx.strokeStyle = "rgba(0,230,255,0.45)";
        ctx.lineWidth = 1.6 / view.scale;
        ctx.beginPath();
        ctx.moveTo(p.x0, p.y0);
        ctx.quadraticCurveTo(mx, my, p.x1, p.y1);
        ctx.stroke();
        /* trail dots */
        for (let k = 0; k < 4; k++) {
          const uu = Math.max(0, u - k * 0.04);
          const x = (1 - uu) * (1 - uu) * p.x0 + 2 * (1 - uu) * uu * mx + uu * uu * p.x1;
          const y = (1 - uu) * (1 - uu) * p.y0 + 2 * (1 - uu) * uu * my + uu * uu * p.y1;
          ctx.globalAlpha = 1 - k * 0.22;
          ctx.fillStyle = "#00f0ff";
          ctx.beginPath();
          ctx.arc(x, y, (3.2 - k * 0.5) / view.scale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      });
    }

    function drawSats(state) {
      const hasSat = state.traitsOwned && state.traitsOwned.indexOf("sat") >= 0;
      satellites.forEach(function (s, si) {
        s.x += s.speed * 0.016;
        if (s.x > mapW + 40) s.x = -40;
        s.trail.push([s.x, s.y]);
        if (s.trail.length > 12) s.trail.shift();
        for (let i = 0; i < s.trail.length; i++) {
          const t = s.trail[i];
          ctx.fillStyle = "rgba(180,220,255," + (i / s.trail.length * 0.35) + ")";
          ctx.beginPath();
          ctx.arc(t[0], t[1], 1.2 / view.scale, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.fillStyle = "#dfefff";
        ctx.shadowColor = "#88ccff";
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 2.8 / view.scale, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        /* body */
        ctx.fillStyle = "rgba(200,230,255,0.9)";
        ctx.fillRect(s.x - 4 / view.scale, s.y - 1.2 / view.scale, 8 / view.scale, 2.4 / view.scale);
        if (hasSat && state.world) {
          /* faint beam to nearest infected hub */
          let best = null, bestD = 1e9;
          state.hubs.forEach(function (id) {
            const c = state.world.countries[id];
            if (!c || c.infected <= 0) return;
            const d = Math.abs(c.centroid[0] - s.x) + Math.abs(c.centroid[1] - s.y);
            if (d < bestD) { bestD = d; best = c; }
          });
          if (best && bestD < 420) {
            ctx.strokeStyle = "rgba(0,255,200,0.12)";
            ctx.lineWidth = 1 / view.scale;
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(best.centroid[0], best.centroid[1]);
            ctx.stroke();
          }
        }
      });
    }

    function drawCountryDigital(i, c, pickMode) {
      const g = countryGfx[i];
      const path = pathCache[i];
      if (!path || !g) return;
      /* base land — night earth */
      ctx.fillStyle = pickMode ? "#263b4b" : "#1b3040";
      ctx.fill(path);
      ctx.strokeStyle = "rgba(140,190,210,0.28)";
      ctx.lineWidth = 0.7 / view.scale;
      ctx.stroke(path);

      const ctrl = g.displayCtrl;
      if (ctrl > 0.002) {
        ctx.save();
        ctx.clip(path);
        /* circuit mesh opacity by control */
        ctx.globalAlpha = 0.15 + ctrl * 0.55;
        if (g.glitch > 0 && Math.random() < 0.4) {
          ctx.translate((Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2);
        }
        ctx.drawImage(g.mesh, g.ox, g.oy, g.ow, g.oh);
        ctx.globalAlpha = 1;
        /* network links */
        g.links.forEach(function (lk, li) {
          const a = g.nodes[lk[0]], b = g.nodes[lk[1]];
          if (!a || !b) return;
          const lit = Math.min(a.lit, b.lit);
          if (lit < 0.05 && ctrl < 0.08) return;
          const dead = Math.max(a.dead || 0, b.dead || 0);
          if (dead > 0.6) {
            ctx.strokeStyle = "rgba(80,40,50," + (0.25 + dead * 0.35) + ")";
          } else {
            ctx.strokeStyle = "rgba(0,255,200," + (0.08 + lit * 0.55) + ")";
          }
          ctx.lineWidth = (0.7 + lit * 0.9) / view.scale;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        });
        /* nodes */
        g.nodes.forEach(function (n) {
          if (n.dead > 0.4) {
            ctx.fillStyle = "rgba(40,20,28,0.9)";
            ctx.beginPath();
            ctx.arc(n.x, n.y, (n.hub ? 2.4 : 1.6) / view.scale, 0, Math.PI * 2);
            ctx.fill();
            /* static speckles */
            if (Math.random() < 0.15) {
              ctx.fillStyle = "rgba(180,180,180,0.35)";
              ctx.fillRect(n.x, n.y, 1 / view.scale, 1 / view.scale);
            }
            return;
          }
          if (n.lit < 0.05) {
            /* dim city light when healthy-ish */
            ctx.fillStyle = "rgba(120,160,180," + (0.12 + (1 - ctrl) * 0.1) + ")";
            ctx.beginPath();
            ctx.arc(n.x, n.y, 0.9 / view.scale, 0, Math.PI * 2);
            ctx.fill();
            return;
          }
          ctx.fillStyle = n.hub ? "#00ffd0" : "#66ffc8";
          ctx.shadowColor = "#00ffc8";
          ctx.shadowBlur = (n.hub ? 8 : 4) * n.lit;
          ctx.beginPath();
          ctx.arc(n.x, n.y, ((n.hub ? 2.6 : 1.7) * (0.6 + n.lit * 0.6)) / view.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        });
        /* glyph flickers */
        if (ctrl > 0.15 && Math.random() < 0.02 * ctrl) {
          const n = g.nodes[Math.floor(Math.random() * g.nodes.length)];
          glyphs.push({ x: n.x, y: n.y, life: 0.45, ch: Math.random() > 0.5 ? "1" : "0" });
        }
        ctx.restore();
      } else {
        /* healthy dim city lights only */
        ctx.save();
        ctx.clip(path);
        g.nodes.forEach(function (n, ni) {
          if (ni % 3 !== 0) return;
          ctx.fillStyle = "rgba(100,140,160,0.18)";
          ctx.beginPath();
          ctx.arc(n.x, n.y, 0.8 / view.scale, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      if (c.closed) {
        ctx.strokeStyle = "rgba(255,90,60,0.55)";
        ctx.lineWidth = 1.5 / view.scale;
        ctx.setLineDash([3 / view.scale, 3 / view.scale]);
        ctx.stroke(path);
        ctx.setLineDash([]);
      }
      if (g.flash > 0) {
        ctx.strokeStyle = "rgba(0,255,220," + (g.flash * 0.9) + ")";
        ctx.lineWidth = (2 + g.flash * 2) / view.scale;
        ctx.stroke(path);
      }
    }

    function drawBubbles(bubbles) {
      (bubbles || []).forEach(function (b) {
        const age = 1 - b.life / b.maxLife;
        const popIn = Math.min(1, age * 8);
        const bounce = 1 + Math.sin(Math.min(1, age * 10) * Math.PI) * 0.18 * (1 - age);
        const pulse = 1 + Math.sin(time * 6 + b.id) * 0.06;
        const alpha = Math.min(1, b.life / 0.5) * Math.min(1, popIn + 0.2);
        const r = (11 * bounce * pulse) / Math.sqrt(view.scale);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = b.kind === "infect" ? "#ff9a2e" : "#3aa0ff";
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(b.x, b.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#05080d";
        ctx.font = "bold " + Math.max(9, 11 / Math.sqrt(view.scale)) + "px monospace";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(b.kind === "infect" ? "+" + b.value : "↓", b.x, b.y);
        ctx.globalAlpha = 1;
      });
    }

    function stepFx(dt) {
      time += dt;
      if (camAnim) {
        camAnim.t += dt;
        const u = Math.min(1, camAnim.t / camAnim.dur);
        const e = u * u * (3 - 2 * u);
        view.x = camAnim.x0 + (camAnim.x1 - camAnim.x0) * e;
        view.y = camAnim.y0 + (camAnim.y1 - camAnim.y0) * e;
        view.scale = camAnim.s0 + (camAnim.s1 - camAnim.s0) * e;
        if (u >= 1) camAnim = null;
      }
      /* particles */
      let homeX = mapW * 0.5, homeY = 20;
      if (dataHudEl) {
        const r = dataHudEl.getBoundingClientRect();
        const cr = canvas.getBoundingClientRect();
        const sx = r.left + r.width / 2 - cr.left;
        const sy = r.top + r.height / 2 - cr.top;
        const w = screenToWorld(sx, sy);
        homeX = w[0]; homeY = w[1];
      }
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.life -= dt;
        if (p.home && p.life < 0.35) {
          p.vx += (homeX - p.x) * 8 * dt;
          p.vy += (homeY - p.y) * 8 * dt;
        } else {
          p.vy += 30 * dt;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
      if (particles.length > 80) particles.length = 80;
      for (let i = floaters.length - 1; i >= 0; i--) {
        const f = floaters[i];
        f.life -= dt;
        f.y += f.vy * dt;
        if (f.life <= 0) floaters.splice(i, 1);
      }
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        r.r += 80 * dt;
        r.life -= dt;
        if (r.life <= 0) ripples.splice(i, 1);
      }
      for (let i = glyphs.length - 1; i >= 0; i--) {
        glyphs[i].life -= dt;
        glyphs[i].y -= 10 * dt;
        if (glyphs[i].life <= 0) glyphs.splice(i, 1);
      }
      if (glyphs.length > 40) glyphs.length = 40;
    }

    function draw(state, opts) {
      opts = opts || {};
      const dt = opts.dt || 0.016;
      stepFx(dt);
      if (state) syncGfx(state, dt);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);
      const g = ctx.createLinearGradient(0, 0, 0, cssH);
      g.addColorStop(0, "#040a10");
      g.addColorStop(0.5, "#07131c");
      g.addColorStop(1, "#050c14");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);

      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);

      /* faint world grid */
      ctx.strokeStyle = "rgba(0,60,80,0.1)";
      ctx.lineWidth = 1 / view.scale;
      for (let x = 0; x <= mapW; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapH); ctx.stroke();
      }

      if (state) {
        drawNet(state);
        const countries = state.world.countries;
        const sel = opts.selected;
        for (let i = 0; i < countries.length; i++) {
          drawCountryDigital(i, countries[i], opts.pickMode);
        }
        if (sel >= 0 && pathCache[sel]) {
          ctx.strokeStyle = "#00ffc8";
          ctx.lineWidth = 2.2 / view.scale;
          ctx.shadowColor = "#00ffc8";
          ctx.shadowBlur = 10;
          ctx.stroke(pathCache[sel]);
          ctx.shadowBlur = 0;
        }
        drawSats(state);
        drawBubbles(state.bubbles);

        ripples.forEach(function (r) {
          ctx.strokeStyle = r.col.replace(/[\d.]+\)$/, (r.life * 0.7).toFixed(2) + ")");
          if (r.col.indexOf("rgba") < 0) ctx.strokeStyle = r.col;
          ctx.globalAlpha = Math.max(0, r.life);
          ctx.lineWidth = 2 / view.scale;
          ctx.beginPath();
          ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2);
          ctx.stroke();
          ctx.globalAlpha = 1;
        });
        glyphs.forEach(function (g) {
          ctx.globalAlpha = Math.max(0, g.life * 2);
          ctx.fillStyle = "#66ffcc";
          ctx.font = (8 / view.scale) + "px monospace";
          ctx.fillText(g.ch, g.x, g.y);
          ctx.globalAlpha = 1;
        });
        particles.forEach(function (p) {
          ctx.globalAlpha = Math.max(0, p.life / p.max);
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r / view.scale, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        });
        floaters.forEach(function (f) {
          ctx.globalAlpha = Math.max(0, f.life);
          ctx.fillStyle = f.col;
          ctx.font = "bold " + (12 / Math.sqrt(view.scale)) + "px monospace";
          ctx.textAlign = "center";
          ctx.fillText(f.text, f.x, f.y);
          ctx.globalAlpha = 1;
        });
      }
      ctx.restore();
    }

    function setDataHudEl(el) { dataHudEl = el; }

    return {
      resize: resize,
      resetView: fit,
      setMap: setMap,
      draw: draw,
      pan: pan,
      zoomAt: zoomAt,
      hitTest: hitTest,
      bubbleAt: bubbleAt,
      fit: fit,
      worldToScreen: worldToScreen,
      screenToWorld: screenToWorld,
      getView: function () { return view; },
      spawnBurst: spawnBurst,
      focusOn: focusOn,
      setDataHudEl: setDataHudEl,
      addRipple: addRipple
    };
  }

  G.createRenderer = createRenderer;
})(typeof window !== "undefined" ? window : global);

/* Open Devil — canvas world map renderer. */
(function (G) {
  "use strict";

  function createRenderer(canvas) {
    const ctx = canvas.getContext("2d");
    let dpr = 1;
    let view = { x: 0, y: 0, scale: 1, minScale: 0.35, maxScale: 8 };
    let mapW = 2000, mapH = 1000;
    let cssW = 0, cssH = 0;
    const pathCache = []; /* Path2D per country */
    let oceanGrad = null;
    let dirtyPaths = true;

    function setMap(map) {
      mapW = map.w;
      mapH = map.h;
      pathCache.length = 0;
      map.countries.forEach(function (c, i) {
        const p = new Path2D();
        (c.p || []).forEach(function (flat) {
          if (!flat || flat.length < 6) return;
          p.moveTo(flat[0], flat[1]);
          for (let k = 2; k < flat.length; k += 2) p.lineTo(flat[k], flat[k + 1]);
          p.closePath();
        });
        pathCache[i] = p;
      });
      dirtyPaths = false;
      fit();
    }

    function resize() {
      const parent = canvas.parentElement || document.body;
      cssW = parent.clientWidth || window.innerWidth;
      cssH = parent.clientHeight || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(cssW * dpr));
      canvas.height = Math.max(1, Math.floor(cssH * dpr));
      canvas.style.width = cssW + "px";
      canvas.style.height = cssH + "px";
      fit();
    }

    function fit() {
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

    function pan(dx, dy) {
      view.x += dx;
      view.y += dy;
    }

    function zoomAt(sx, sy, factor) {
      const before = screenToWorld(sx, sy);
      view.scale = Math.max(view.minScale, Math.min(view.maxScale, view.scale * factor));
      const after = screenToWorld(sx, sy);
      view.x += (after[0] - before[0]) * view.scale;
      view.y += (after[1] - before[1]) * view.scale;
    }

    function hitTest(sx, sy, countries) {
      const w = screenToWorld(sx, sy);
      /* Path2D hit uses current CTM — reset so world coords match paths */
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      let best = -1;
      let bestArea = Infinity;
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

    function fillCountry(i, fill, stroke) {
      const p = pathCache[i];
      if (!p) return;
      ctx.fillStyle = fill;
      ctx.fill(p);
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 0.6 / view.scale;
        ctx.stroke(p);
      }
    }

    function infectionColor(c) {
      const ctrl = (c.infected + c.neutralized) / c.pop;
      if (ctrl <= 0) return null;
      const neu = c.neutralized / c.pop;
      if (neu > 0.3) {
        const a = 0.35 + neu * 0.45;
        return "rgba(180,40,80," + a.toFixed(3) + ")";
      }
      const a = 0.15 + ctrl * 0.65;
      const g = Math.floor(180 + ctrl * 75);
      const r = Math.floor(20 + ctrl * 40);
      return "rgba(" + r + "," + g + ",120," + a.toFixed(3) + ")";
    }

    function drawDots(c, ctrl) {
      if (ctrl <= 0.01 || !c.dots || c.dots.length < 2) return;
      const n = Math.min(c.dots.length / 2, Math.ceil(ctrl * c.dots.length / 2));
      const r = Math.max(0.8, 1.6 / Math.sqrt(view.scale));
      ctx.fillStyle = "rgba(0,255,160,0.85)";
      for (let i = 0; i < n; i++) {
        const x = c.dots[i * 2], y = c.dots[i * 2 + 1];
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (c.neutralized / c.pop > 0.05) {
        ctx.fillStyle = "rgba(255,60,90,0.7)";
        const n2 = Math.ceil(n * (c.neutralized / (c.infected + c.neutralized + 1)));
        for (let i = 0; i < n2; i++) {
          const x = c.dots[i * 2], y = c.dots[i * 2 + 1];
          ctx.beginPath();
          ctx.arc(x + 1.5, y - 1, r * 0.9, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    function drawPacket(p, t) {
      const u = Math.min(1, p.t / p.dur);
      const mx = (p.x0 + p.x1) / 2;
      const my = (p.y0 + p.y1) / 2 - Math.hypot(p.x1 - p.x0, p.y1 - p.y0) * 0.18;
      const x = (1 - u) * (1 - u) * p.x0 + 2 * (1 - u) * u * mx + u * u * p.x1;
      const y = (1 - u) * (1 - u) * p.y0 + 2 * (1 - u) * u * my + u * u * p.y1;
      ctx.strokeStyle = "rgba(0,220,255,0.35)";
      ctx.lineWidth = 1.2 / view.scale;
      ctx.beginPath();
      ctx.moveTo(p.x0, p.y0);
      ctx.quadraticCurveTo(mx, my, p.x1, p.y1);
      ctx.stroke();
      ctx.fillStyle = "#00e8ff";
      ctx.shadowColor = "#00e8ff";
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(x, y, 3.2 / view.scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    function drawBubble(b) {
      const alpha = Math.min(1, b.life / 0.6) * Math.min(1, (b.maxLife - b.life) / 0.3 + 0.7);
      const r = 10 / Math.sqrt(view.scale);
      ctx.globalAlpha = alpha;
      if (b.kind === "infect") {
        ctx.fillStyle = "#ff9a2e";
        ctx.shadowColor = "#ff9a2e";
      } else {
        ctx.fillStyle = "#3aa0ff";
        ctx.shadowColor = "#3aa0ff";
      }
      ctx.shadowBlur = 10;
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
    }

    function draw(state, opts) {
      opts = opts || {};
      const countries = state.world.countries;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssW, cssH);

      /* ocean */
      const g = ctx.createLinearGradient(0, 0, 0, cssH);
      g.addColorStop(0, "#061018");
      g.addColorStop(0.5, "#0a1a24");
      g.addColorStop(1, "#07141c");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, cssW, cssH);

      /* faint grid */
      ctx.save();
      ctx.translate(view.x, view.y);
      ctx.scale(view.scale, view.scale);
      ctx.strokeStyle = "rgba(0,80,100,0.12)";
      ctx.lineWidth = 1 / view.scale;
      for (let x = 0; x <= mapW; x += 100) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, mapH); ctx.stroke();
      }
      for (let y = 0; y <= mapH; y += 100) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(mapW, y); ctx.stroke();
      }

      const sel = opts.selected;
      const pickMode = opts.pickMode;

      for (let i = 0; i < countries.length; i++) {
        const c = countries[i];
        let base = "#132a22";
        if (pickMode) base = "#1a3a30";
        fillCountry(i, base, "rgba(0,255,160,0.18)");
        const col = infectionColor(c);
        if (col) fillCountry(i, col, null);
        if (c.closed) {
          ctx.strokeStyle = "rgba(255,120,60,0.55)";
          ctx.lineWidth = 1.4 / view.scale;
          ctx.stroke(pathCache[i]);
        }
      }

      for (let i = 0; i < countries.length; i++) {
        const c = countries[i];
        const ctrl = (c.infected + c.neutralized) / c.pop;
        drawDots(c, ctrl);
      }

      if (sel >= 0 && pathCache[sel]) {
        ctx.strokeStyle = "#00ffc8";
        ctx.lineWidth = 2.2 / view.scale;
        ctx.shadowColor = "#00ffc8";
        ctx.shadowBlur = 12;
        ctx.stroke(pathCache[sel]);
        ctx.shadowBlur = 0;
      }

      (state.packets || []).forEach(drawPacket);
      (state.bubbles || []).forEach(drawBubble);

      /* hub markers subtle */
      if (state.hubs) {
        ctx.fillStyle = "rgba(0,200,255,0.35)";
        state.hubs.forEach(function (id) {
          const c = countries[id];
          if (!c) return;
          ctx.beginPath();
          ctx.arc(c.centroid[0], c.centroid[1], 2.5 / view.scale, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      ctx.restore();
    }

    function bubbleAt(sx, sy, bubbles) {
      const w = screenToWorld(sx, sy);
      const hitR = 14 / view.scale;
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        if (Math.hypot(b.x - w[0], b.y - w[1]) < hitR) return b;
      }
      return null;
    }

    return {
      resize: resize,
      setMap: setMap,
      draw: draw,
      pan: pan,
      zoomAt: zoomAt,
      hitTest: hitTest,
      bubbleAt: bubbleAt,
      fit: fit,
      worldToScreen: worldToScreen,
      screenToWorld: screenToWorld,
      getView: function () { return view; }
    };
  }

  G.createRenderer = createRenderer;
})(typeof window !== "undefined" ? window : global);

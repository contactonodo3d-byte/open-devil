// Canvas drawing: network map of sectors, colored by how much the AI controls.
const Render = {
  canvas: null, ctx: null, scale: 1, ox: 0, oy: 0, t: 0,

  init(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    window.addEventListener("resize", () => this.resize());
    this.resize();
  },

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const r = this.canvas.getBoundingClientRect();
    this.canvas.width = r.width * dpr;
    this.canvas.height = r.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.scale = Math.min(r.width / 1000, r.height / 500);
    this.ox = (r.width - 1000 * this.scale) / 2;
    this.oy = (r.height - 500 * this.scale) / 2;
  },

  center(c) { return [this.ox + (c.x + c.w / 2) * this.scale, this.oy + (c.y + c.h / 2) * this.scale]; },

  draw(state, dt) {
    const { ctx, scale, ox, oy } = this;
    this.t += dt || 0;
    const r = this.canvas.getBoundingClientRect();
    ctx.fillStyle = "#05080d";
    ctx.fillRect(0, 0, r.width, r.height);

    // Background grid
    ctx.strokeStyle = "rgba(0,255,156,0.05)";
    ctx.lineWidth = 1;
    for (let gx = 0; gx <= 1000; gx += 50) { ctx.beginPath(); ctx.moveTo(ox + gx * scale, oy); ctx.lineTo(ox + gx * scale, oy + 500 * scale); ctx.stroke(); }
    for (let gy = 0; gy <= 500; gy += 50) { ctx.beginPath(); ctx.moveTo(ox, oy + gy * scale); ctx.lineTo(ox + 1000 * scale, oy + gy * scale); ctx.stroke(); }

    // Network links, with moving packets on links where the AI is present.
    for (const c of state.sectors) for (const nId of c.neighbors) {
      if (nId < c.id) continue;
      const n = state.sectors.find(x => x.id === nId);
      const [x1, y1] = this.center(c), [x2, y2] = this.center(n);
      const hot = c.control > 0 && n.control > 0;
      ctx.strokeStyle = hot ? "rgba(0,255,156,0.5)" : "rgba(127,168,154,0.2)";
      ctx.lineWidth = hot ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (hot) {
        const p = (this.t * 0.6 + (c.x % 7) / 7) % 1;
        ctx.fillStyle = "#00ff9c";
        ctx.fillRect(x1 + (x2 - x1) * p - 2, y1 + (y2 - y1) * p - 2, 4, 4);
      }
    }

    for (const c of state.sectors) {
      const x = ox + c.x * scale, y = oy + c.y * scale, w = c.w * scale, h = c.h * scale;
      const k = c.control;
      ctx.fillStyle = "#0b1611";
      ctx.fillRect(x, y, w, h);
      // Controlled portion fills from the bottom up.
      ctx.fillStyle = `rgba(0,255,156,${0.25 + 0.45 * k})`;
      ctx.fillRect(x, y + h * (1 - k), w, h * k);
      ctx.strokeStyle = k > 0 ? "#00ff9c" : "#1d3b30";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      ctx.fillStyle = "#d7f5e8";
      ctx.textAlign = "center";
      ctx.font = `${Math.max(9, 13 * scale)}px Menlo, monospace`;
      ctx.fillText(c.name, x + w / 2, y + h / 2 - 4 * scale);
      ctx.fillStyle = "#7fa89a";
      ctx.font = `${Math.max(8, 11 * scale)}px Menlo, monospace`;
      ctx.fillText(`${(k * 100).toFixed(1)}%  SEC ${"■".repeat(c.security)}`, x + w / 2, y + h / 2 + 12 * scale);
    }
  }
};

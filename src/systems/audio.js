export class AudioGarden {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }
  start() {
    if (!this.ctx)
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.ctx.resume();
  }
  play(type = "ui") {
    if (!this.enabled || !this.ctx) return;
    const c = this.ctx,
      t = c.currentTime,
      notes = {
        ui: [540],
        step: [95],
        hit: [180, 80],
        water: [520, 800],
        harvest: [440, 660, 880],
        capture: [330, 440, 660, 880],
        craft: [392, 523, 784],
        battle: [220, 277, 330],
      };
    for (const [f, i] of (notes[type] || notes.ui).map((f, i) => [f, i])) {
      const o = c.createOscillator(),
        g = c.createGain();
      o.type = ["hit", "step"].includes(type) ? "triangle" : "sine";
      o.frequency.setValueAtTime(f, t + i * 0.08);
      o.frequency.exponentialRampToValueAtTime(f * 0.75, t + i * 0.08 + 0.25);
      g.gain.setValueAtTime(0, t + i * 0.08);
      g.gain.linearRampToValueAtTime(0.035, t + i * 0.08 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + 0.35);
      o.connect(g);
      g.connect(c.destination);
      o.start(t + i * 0.08);
      o.stop(t + i * 0.08 + 0.4);
    }
  }
}

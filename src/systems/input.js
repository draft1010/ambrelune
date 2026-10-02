export class Input {
  constructor(canvas, { action, tool, menu, map, rotate, escape, onStart }) {
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.target = null;
    this.drag = null;
    this.angle = 0;
    this.zoom = 36;
    this.running = false;
    this.pointerMoved = false;
    this.onGround = null;
    this.enabled = true;
    const handled = [
      "ArrowUp",
      "ArrowDown",
      "ArrowLeft",
      "ArrowRight",
      " ",
      "Tab",
    ];
    window.addEventListener("keydown", (e) => {
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(document.activeElement.tagName)
      )
        return;
      if (handled.includes(e.key)) e.preventDefault();
      this.keys.add(e.key.toLowerCase());
      if (e.repeat) return;
      onStart();
      if (e.key.toLowerCase() === "e" || e.key === " ") action();
      if (/^[1-7]$/.test(e.key)) tool(+e.key - 1);
      if (e.key === "Tab" || e.key.toLowerCase() === "i") menu();
      if (e.key.toLowerCase() === "m") map();
      if (e.key.toLowerCase() === "r") rotate();
      if (e.key === "Escape") escape();
    });
    window.addEventListener("keyup", (e) =>
      this.keys.delete(e.key.toLowerCase()),
    );
    window.addEventListener("blur", () => {
      this.keys.clear();
      this.stick = { x: 0, y: 0 };
      this.running = false;
    });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
    canvas.addEventListener("pointerdown", (e) => {
      onStart();
      canvas.focus();
      this.pointerMoved = false;
      this.drag = {
        x: e.clientX,
        y: e.clientY,
        right: e.button === 2,
        id: e.pointerId,
      };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (this.drag) {
        if (Math.hypot(e.clientX - this.drag.x, e.clientY - this.drag.y) > 4)
          this.pointerMoved = true;
        if (this.drag.right) this.angle -= (e.clientX - this.drag.x) * 0.008;
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
      }
    });
    canvas.addEventListener("pointerup", (e) => {
      if (this.drag && !this.drag.right && !this.pointerMoved && this.enabled)
        this.onGround?.(e.clientX, e.clientY);
      this.drag = null;
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoom = Math.max(21, Math.min(55, this.zoom + e.deltaY * 0.025));
      },
      { passive: false },
    );
    const joy = document.getElementById("joystick"),
      knob = joy.querySelector("i");
    let stickId = null;
    const update = (e) => {
      const r = joy.getBoundingClientRect(),
        max = r.width * 0.31,
        x = (e.clientX - r.left - r.width / 2) / max,
        y = (e.clientY - r.top - r.height / 2) / max,
        len = Math.max(1, Math.hypot(x, y));
      this.stick = { x: x / len, y: y / len };
      knob.style.transform = `translate(${this.stick.x * max}px,${this.stick.y * max}px)`;
      this.target = null;
    };
    joy.addEventListener("pointerdown", (e) => {
      stickId = e.pointerId;
      joy.setPointerCapture(stickId);
      onStart();
      update(e);
    });
    joy.addEventListener("pointermove", (e) => {
      if (e.pointerId === stickId) update(e);
    });
    const reset = (e) => {
      if (e.pointerId === stickId) {
        stickId = null;
        this.stick = { x: 0, y: 0 };
        knob.style.transform = "";
      }
    };
    joy.addEventListener("pointerup", reset);
    joy.addEventListener("pointercancel", reset);
    const pad = document.getElementById("cameraPad");
    let cameraId = null,
      last = 0;
    pad.addEventListener("pointerdown", (e) => {
      cameraId = e.pointerId;
      last = e.clientX;
      pad.setPointerCapture(cameraId);
    });
    pad.addEventListener("pointermove", (e) => {
      if (cameraId === e.pointerId) {
        this.angle -= (e.clientX - last) * 0.012;
        last = e.clientX;
      }
    });
    pad.addEventListener("pointerup", () => (cameraId = null));
    pad.addEventListener("pointercancel", () => (cameraId = null));
    const run = document.getElementById("runBtn");
    run.addEventListener("pointerdown", (e) => {
      run.setPointerCapture(e.pointerId);
      this.running = true;
    });
    for (const ev of ["pointerup", "pointercancel"])
      run.addEventListener(ev, () => (this.running = false));
  }
  vector() {
    let x =
        (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) -
        (this.keys.has("q") || this.keys.has("a") || this.keys.has("arrowleft")
          ? 1
          : 0) +
        this.stick.x,
      y =
        (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) -
        (this.keys.has("z") || this.keys.has("w") || this.keys.has("arrowup")
          ? 1
          : 0) +
        this.stick.y;
    const pad = navigator.getGamepads?.()[0];
    if (pad) {
      if (Math.abs(pad.axes[0]) > 0.18) x += pad.axes[0];
      if (Math.abs(pad.axes[1]) > 0.18) y += pad.axes[1];
      if (Math.abs(pad.axes[2]) > 0.2) this.angle -= pad.axes[2] * 0.03;
    }
    const l = Math.hypot(x, y);
    return l > 1 ? { x: x / l, y: y / l } : { x, y };
  }
}

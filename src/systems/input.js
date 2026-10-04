export class Input {
  constructor(canvas, { action, tool, menu, map, rotate, escape, onStart }) {
    this.keys = new Set();
    this.stick = { x: 0, y: 0 };
    this.target = null;
    this.drag = null;
    this.angle = 0;
    this.zoom = 21;
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
    const touches = new Map();
    let pinchDistance = 0;
    const distance = () => { const [a,b] = [...touches.values()]; return Math.hypot(a.x-b.x,a.y-b.y); };
    const clearTouches = () => { touches.clear(); pinchDistance = 0; };
    window.addEventListener("blur", clearTouches);
    canvas.style.touchAction = "none";
    let holdTimer=null, origin=null, held=false;
    canvas.addEventListener("dblclick",e=>{this.target=null;this.route=[];this.onObject?.(e.clientX,e.clientY);});
    canvas.addEventListener("pointerdown", (e) => {
      if (e.pointerType === "touch") {
        e.preventDefault(); onStart(); canvas.focus();
        this.target = null; this.route = [];
        touches.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,moved:false,multi:false,time:Date.now(),camera:e.clientX >= canvas.getBoundingClientRect().left + canvas.clientWidth/2});
        canvas.setPointerCapture(e.pointerId);
        if (touches.size > 1) { for (const point of touches.values()) point.multi = true; }
        if (touches.size === 2) pinchDistance = distance();
        return;
      }
      origin={x:e.clientX,y:e.clientY};held=false;
      clearTimeout(holdTimer);
      if(e.button===0)holdTimer=setTimeout(()=>{if(this.drag&&!this.pointerMoved){held=!!this.onObject?.(e.clientX,e.clientY);this.target=null;}},550);
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
      if (e.pointerType === "touch") {
        const point = touches.get(e.pointerId);
        if (!point) return;
        e.preventDefault();
        if (Math.hypot(e.clientX-point.startX,e.clientY-point.startY)>8) point.moved=true;
        const dx = e.clientX - point.x;
        point.x = e.clientX; point.y = e.clientY;
        if (touches.size === 2) {
          const next = distance();
          if (pinchDistance > 0 && next > 0) this.zoom = Math.max(5,Math.min(55,this.zoom * pinchDistance / next));
          pinchDistance = next;
        } else if (touches.size === 1 && point.camera) this.angle -= dx * 0.008;
        return;
      }
      if (this.drag && this.drag.id === e.pointerId) {
        if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 8)
          this.pointerMoved = true;
        if (this.drag.right) this.angle -= (e.clientX - this.drag.x) * 0.008;
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
      }
    });
    canvas.addEventListener("pointerup", (e) => {
      if (e.pointerType === "touch") {
        const point = touches.get(e.pointerId);
        touches.delete(e.pointerId); pinchDistance = touches.size === 2 ? distance() : 0;
        if (point && !point.moved && !point.multi && Date.now()-point.time<500 && Math.hypot(e.clientX-point.startX,e.clientY-point.startY)<=8 && this.enabled) this.onGround?.(e.clientX,e.clientY);
        return;
      }
      clearTimeout(holdTimer);
      if (this.drag && !held && !this.drag.right && !this.pointerMoved && this.enabled)
        this.onGround?.(e.clientX, e.clientY);
      this.drag = null;
    });
    canvas.addEventListener("pointercancel",e=>{touches.delete(e.pointerId);pinchDistance=0;clearTimeout(holdTimer);this.drag=null;});
    canvas.addEventListener("lostpointercapture",e=>{touches.delete(e.pointerId);pinchDistance=0;});
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        this.zoom = Math.max(5, Math.min(55, this.zoom + e.deltaY * 0.025));
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
    const run = document.getElementById("runBtn");
    this.runButton = run;
    this.running = this.running;
    const toggleRun = () => { onStart(); this.running = !this.running; };
    run.addEventListener("pointerdown", e => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      e.preventDefault();
      toggleRun();
    });
    // Keyboard activation still works; physical taps are handled on pointerdown.
    run.addEventListener("click", e => { if (e.detail === 0) toggleRun(); });
  }
  get running() { return this._running || false; }
  set running(value) {
    this._running = !!value;
    if (this.runButton) {
      this.runButton.textContent = this._running ? "Marcher" : "Courir";
      this.runButton.setAttribute("aria-pressed", String(this._running));
    }
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

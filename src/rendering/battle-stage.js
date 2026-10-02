import { T, Factory, tree, flower, creature, random } from "./art.js";
import { species } from "../systems/data.js";
export class BattleStage {
  constructor(ally, enemy) {
    this.scene = new T.Scene();
    this.scene.background = new T.Color("#b9cdc0");
    this.scene.fog = new T.Fog("#b9cdc0", 24, 55);
    this.scene.add(new T.HemisphereLight("#ffedcc", "#68886e", 2));
    const sun = new T.DirectionalLight("#ffe6b4", 2.5);
    sun.position.set(-8, 18, 9);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -15,
      right: 15,
      top: 15,
      bottom: -15,
      near: 1,
      far: 60,
    });
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    this.sun = sun;
    const g = new T.Group(),
      f = new Factory(g, true),
      r = random(991);
    f.part("cylinder", "#7d9465", 0, -0.25, 0, 30, 0.4, 30);
    f.part("cylinder", "#adb583", 0, -0.07, 0, 7, 0.14, 7);
    f.part("torus", "#a0aa78", 0, -0.02, 0, 7, 7, 7, Math.PI / 2);
    for (let i = 0; i < 130; i++) {
      const a = r() * Math.PI * 2,
        rad = 7 + r() * 18,
        x = Math.sin(a) * rad,
        z = Math.cos(a) * rad;
      flower(f, x, 0, z, i % 3 ? "#d9c8aa" : "#b5a2b4", 1.3);
      if (i % 9 === 0 && z < -3) tree(f, x, 0, z, 0.65 + r() * 0.35, i % 3);
      if (i % 8 === 0)
        f.part("sphere", "#9eaa90", x, 0.25, z, 0.7, 0.5, 0.7, 0, i);
    }
    f.flush();
    this.scene.add(g);
    this.decor = g;
    this.ally = creature(species(ally.id), 1.65);
    this.enemy = creature(species(enemy.id), 1.65);
    this.scene.add(this.ally, this.enemy);
    this.ally.rotation.y = 2;
    this.enemy.rotation.y = -1.14;
    this.ring = new T.Mesh(
      new T.TorusGeometry(1.4, 0.035, 5, 64),
      new T.MeshBasicMaterial({
        color: "#ffdd8f",
        transparent: true,
        opacity: 0,
      }),
    );
    this.ring.rotation.x = Math.PI / 2;
    this.ring.position.set(3, 1, -1);
    this.scene.add(this.ring);
    this.particles = [];
    this.hit = 0;
    this.side = 1;
    this.capture = 0;
  }
  impact(allyAttacking, color) {
    this.hit = 0.6;
    this.side = allyAttacking ? 1 : -1;
    const x = allyAttacking ? 3 : -3,
      z = allyAttacking ? -1 : 2,
      g = new T.BufferGeometry(),
      p = new Float32Array(60),
      vel = [];
    for (let i = 0; i < 20; i++) {
      p.set([x, 1, z], i * 3);
      vel.push([
        (Math.random() - 0.5) * 5,
        Math.random() * 4,
        (Math.random() - 0.5) * 5,
      ]);
    }
    g.setAttribute("position", new T.BufferAttribute(p, 3));
    const m = new T.Points(
      g,
      new T.PointsMaterial({ size: 0.18, color, transparent: true }),
    );
    this.scene.add(m);
    this.particles.push({ m, vel, life: 1 });
  }
  update(dt, t) {
    this.ally.position.set(-3, 0, 2);
    this.enemy.position.set(3, 0, -1);
    this.ally.userData.animate(t, false);
    this.enemy.userData.animate(t + 0.7, false);
    if (this.hit > 0) {
      this.hit -= dt;
      const n = Math.sin(this.hit * 12) * 0.55;
      (this.side > 0 ? this.ally : this.enemy).position.x += n * this.side;
      (this.side > 0 ? this.enemy : this.ally).rotation.z =
        Math.sin(this.hit * 23) * 0.08;
    } else {
      this.ally.rotation.z = 0;
      this.enemy.rotation.z = 0;
    }
    if (this.capture > 0) {
      this.capture -= dt;
      this.ring.material.opacity = Math.min(1, this.capture);
      this.ring.position.y = 0.7 + Math.sin(t * 9) * 0.5;
      this.ring.rotation.z = t * 3;
      const s = 1 + Math.sin(t * 8) * 0.2;
      this.ring.scale.setScalar(s);
    } else this.ring.material.opacity = 0;
    for (const p of [...this.particles]) {
      p.life -= dt;
      const a = p.m.geometry.attributes.position;
      p.vel.forEach((v, i) => {
        v[1] -= dt * 7;
        a.setXYZ(
          i,
          a.getX(i) + v[0] * dt,
          a.getY(i) + v[1] * dt,
          a.getZ(i) + v[2] * dt,
        );
      });
      a.needsUpdate = true;
      p.m.material.opacity = Math.max(0, p.life);
      if (p.life <= 0) {
        this.scene.remove(p.m);
        p.m.geometry.dispose();
        p.m.material.dispose();
        this.particles.splice(this.particles.indexOf(p), 1);
      }
    }
  }
  dispose() {
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.sun.shadow.map?.dispose();
    this.decor.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
    });
    for (const p of this.particles) {
      p.m.geometry.dispose();
      p.m.material.dispose();
    }
  }
}

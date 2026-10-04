import { getTerrainTextures } from './village.js';
import { T, Factory, tree, flower, random, furnishing } from "./art.js";
import { modelCreature } from "./monster-models.js";
import { species } from "../systems/data.js";

const BLEND = T.AdditiveBlending;

function ease(t) {
  return t * t * (3 - 2 * t);
}

function disposeObject(root) {
  root.traverse((o) => {
    if (o.isInstancedMesh) o.dispose();
    if (o.geometry?.dispose && !o.geometry.userData.sharedAsset) o.geometry.dispose();
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of mats) {
      if (!m || m.userData.sharedAsset) continue;
      for (const k of ["map", "normalMap", "roughnessMap", "metalnessMap", "alphaMap", "emissiveMap"]) {
        if (!m[k]?.userData.sharedAsset) m[k]?.dispose?.();
      }
      m.dispose?.();
    }
  });
}

function makePoints(count, size, color) {
  const geometry = new T.BufferGeometry();
  const positions = new Float32Array(count * 3);
  geometry.setAttribute("position", new T.BufferAttribute(positions, 3));
  const material = new T.PointsMaterial({
    size,
    color,
    transparent: true,
    opacity: 1,
    depthWrite: false,
    blending: BLEND,
  });
  return {
    object: new T.Points(geometry, material),
    geometry,
    positions,
  };
}

function cloneVec(v) {
  return new T.Vector3(v.x, v.y, v.z);
}

export class BattleStage {
  constructor(ally, enemy) {
    this.scene = new T.Scene();
    this.scene.background = new T.Color("#c8d8cf");
    this.scene.fog = new T.Fog("#c8d8cf", 18, 65);

    this.scene.add(new T.HemisphereLight("#fff4db", "#6c8d72", 1.6));

    const sun = new T.DirectionalLight("#ffe4b1", 2.2);
    sun.position.set(-10, 20, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -18,
      right: 18,
      top: 18,
      bottom: -18,
      near: 1,
      far: 70,
    });
    sun.shadow.normalBias = 0.04;
    this.scene.add(sun);
    this.sun = sun;

    const fill = new T.DirectionalLight("#cbe7ff", 0.7);
    fill.position.set(12, 8, -8);
    this.scene.add(fill);

    const g = new T.Group();
    const f = new Factory(g, true);
    const r = random(991);

    const terrain = new T.PlaneGeometry(150,150,36,36);terrain.rotateX(-Math.PI/2);
    const pos=terrain.attributes.position,colors=[];
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i),dist=Math.hypot(x,z);pos.setY(i,dist<8?-.04:(Math.sin(x*.16)*Math.cos(z*.13)*1.3)*Math.min(1,(dist-8)/12)-.04);const c=new T.Color('#82986b');c.offsetHSL(0,0,Math.sin(x*.24+z*.17)*.04);colors.push(c.r,c.g,c.b);}
    for(let i=0;i<terrain.attributes.uv.count;i++){terrain.attributes.uv.setXY(i,terrain.attributes.uv.getX(i)*50,terrain.attributes.uv.getY(i)*50);}
    terrain.setAttribute('color',new T.Float32BufferAttribute(colors,3));terrain.computeVertexNormals();
    const meadow=new T.Mesh(terrain,new T.MeshStandardMaterial({vertexColors:true,roughness:1,map:getTerrainTextures().grass}));meadow.receiveShadow=true;this.scene.add(meadow);this.meadow=meadow;
    for (let i = 0; i < 210; i++) {
      const a = r() * Math.PI * 2;
      const rad = 8.5 + r() * 19;
      const x = Math.sin(a) * rad;
      const z = Math.cos(a) * rad;
      flower(
        f,
        x,
        0,
        z,
        ["#dcc4ab", "#d8b6c6", "#f0d18a", "#b5c7a1"][i % 4],
        0.6 + r() * 0.45,
      );
      if (i % 7 === 0) {
        f.part(
          "sphere",
          i % 2 ? "#87966b" : "#98a97c",
          x,
          0.18,
          z,
          0.6 + r() * 0.22,
          0.28 + r() * 0.12,
          0.58 + r() * 0.22,
          0,
          i * 0.2,
        );
      }
    }

    for (const [x, z, v, s] of [
      [-17, -14, 0, 0.95],
      [16, 14, 1, 0.92],
      [-18, 13, 4, 1.05],
      [18, -13, 2, 1.02],
      [0, -19, 0, 0.85],
      [0, 19, 1, 0.9],
    ]) {
      tree(f, x, 0, z, s, v);
    }

    // Irregular rocks and shrubs form the edge of a clearing, without an arena ring.
    for(let i=0;i<28;i++) {
      const x=(r()-.5)*48,z=-10-r()*19;
      f.part('sphere',i%2?'#8a917d':'#98a97c',x,.2,z,.4+r()*1.2,.3+r()*.6,.5+r(),0,r()*3);
    }

    f.flush();
    this.scene.add(g);
    this.decor = g;

    this.ally = modelCreature(species(ally.id), 1.65);
    this.enemy = modelCreature(species(enemy.id), 1.65);
    this.scene.add(this.ally, this.enemy);

    this.ally.rotation.y = 2;
    this.enemy.rotation.y = -1.14;

    this.allyBase = new T.Vector3(-3.2, 0, 2.1);
    this.enemyBase = new T.Vector3(3.1, 0, -1.1);

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
    this.particlePool = [];
    this.pendingImpact = null;
    this.effects = [];
    this.action = null;
    this.capture = 0;

    this.ambientGlow = this.createAmbientGlow();
    this.scene.add(this.ambientGlow.object);
  }

  createAmbientGlow() {
    const pts = makePoints(140, 0.12, "#fff2c9");
    const seeds = [];
    for (let i = 0; i < 140; i++) {
      const a = Math.random() * Math.PI * 2;
      const radius = 6 + Math.random() * 20;
      seeds.push({
        x: Math.cos(a) * radius,
        y: 0.8 + Math.random() * 3.2,
        z: Math.sin(a) * radius,
        s: Math.random() * Math.PI * 2,
      });
    }
    return { ...pts, seeds };
  }

  actorForSide(allySide) {
    return allySide ? this.ally : this.enemy;
  }

  impact(allyAttacking, color, moveId = "elan", opts = {}) {
    const attacker = this.actorForSide(allyAttacking);
    const defender = this.actorForSide(!allyAttacking);

    attacker.userData.playAttack?.();

    this.action = {
      allyAttacking,
      color,
      moveId,
      elapsed: 0,
      duration: moveId === "elan" ? 0.86 : 0.76,
      hitTriggered: false,
      ko: !!opts.ko,
      miss: !!opts.miss,
    };

    const from = (allyAttacking ? this.allyBase : this.enemyBase).clone().add(new T.Vector3(0, 1.12, 0));
    const to = (allyAttacking ? this.enemyBase : this.allyBase).clone().add(new T.Vector3(0, 1.02, 0));
    if (opts.miss) {
      to.x += allyAttacking ? 0.7 : -0.7;
      to.y += 0.35;
      to.z += allyAttacking ? -0.4 : 0.4;
    }

    this.spawnMoveEffect(moveId, from, to, color, allyAttacking, opts);
    this.pendingImpact={delay:.46,to,color,moveId,miss:opts.miss};
  }

  support(allySide, moveId = "garde", color = "#f4d688") {
    const actor = this.actorForSide(allySide);
    actor.userData.playAttack?.();
    const center = (allySide ? this.allyBase : this.enemyBase).clone().add(new T.Vector3(0, 1.02, 0));
    if (moveId === "garde") this.spawnGuardEffect(center, color);
    else this.spawnMistEffect(center, color);
  }

  addEffect(root, maxLife, updater) {
    this.scene.add(root);
    this.effects.push({ root, life: maxLife, maxLife, updater });
  }

  spawnMoveEffect(moveId, from, to, color, allyAttacking, opts = {}) {
    const special={
      dard:{coreColor:'#a6cc62',accent:'#f3d472',size:.12,life:.32,arc:.1,trail:18,tailSpread:.05,shard:true},
      flamme:{coreColor:'#fa703b',accent:'#ffd47b',size:.32,life:.6,arc:.22,trail:36,tailSpread:.32},
      bulle:{coreColor:'#77dce6',accent:'#e3fcff',size:.15,life:.65,arc:.85,trail:14,tailSpread:.15},
      gresil:{coreColor:'#b7e9fb',accent:'#ffffff',size:.12,life:.4,arc:1.4,trail:20,tailSpread:.13,shard:true},
      graine:{coreColor:'#88ad50',accent:'#ded18e',size:.12,life:.55,arc:.75,trail:12,tailSpread:.09},
      halo:{coreColor:'#ffe5a0',accent:'#ffffff',size:.29,life:.35,arc:0,trail:32,tailSpread:.14,shard:true}
    }[moveId];
    if(special){for(let i=0;i<(['bulle','gresil','graine'].includes(moveId)?3:1);i++){const origin=from.clone();origin.z+=(i-1)*.3;this.spawnProjectile(origin,to,{...special,arc:special.arc+i*.18});}return;}
    switch (moveId) {
      case "flamme":
      case "braise":
        this.spawnProjectile(from, to, {
          coreColor: "#ff8d41",
          accent: "#ffd178",
          size: 0.22,
          life: 0.46,
          arc: 0.55,
          trail: 22,
          tailSpread: 0.22,
        });
        break;
      case "bulle":
case "gresil":
      case "onde":
        this.spawnProjectile(from, to, {
          coreColor: "#77d5e9",
          accent: "#d4fbff",
          size: 0.24,
          life: 0.5,
          arc: 0.42,
          trail: 28,
          tailSpread: 0.26,
        });
        break;
      case "halo":
      case "eclat":
        this.spawnProjectile(from, to, {
          coreColor: "#fff4b0",
          accent: "#fffef6",
          size: 0.21,
          life: 0.4,
          arc: 0.34,
          trail: 20,
          tailSpread: 0.18,
          shard: true,
        });
        break;
      case "rafale":
      case "souffle":
        this.spawnWindBlades(from, to);
        break;
      case "eboulis":
      case "roc":
        this.spawnRockVolley(from, to);
        break;
      case "liane":
        this.spawnVineWhip(from, to);
        break;
      case "dard":
case "graine":
      case "pollen":
        this.spawnPollenCloud(from, to);
        break;
      case "elan":
        this.spawnDashStreaks(allyAttacking ? this.allyBase : this.enemyBase, allyAttacking ? this.enemyBase : this.allyBase, color);
        break;
      default:
        this.spawnProjectile(from, to, {
          coreColor: color,
          accent: "#ffffff",
          size: 0.2,
          life: 0.44,
          arc: 0.38,
          trail: 18,
          tailSpread: 0.2,
        });
    }
  }

  spawnProjectile(from, to, cfg) {
    const group = new T.Group();
    const core = new T.Mesh(
      cfg.shard ? new T.OctahedronGeometry(cfg.size, 0) : new T.SphereGeometry(cfg.size, 12, 12),
      new T.MeshBasicMaterial({ color: cfg.coreColor, transparent: true, opacity: 0.95 }),
    );
    group.add(core);

    const halo = new T.Mesh(
      new T.SphereGeometry(cfg.size * 1.9, 10, 10),
      new T.MeshBasicMaterial({
        color: cfg.accent,
        transparent: true,
        opacity: 0.34,
        blending: BLEND,
        depthWrite: false,
      }),
    );
    group.add(halo);

    const pts = makePoints(cfg.trail, cfg.size * 1.45, cfg.accent);
    group.add(pts.object);
    const seeds = Array.from({ length: cfg.trail }, () => ({
      drift: (Math.random() - 0.5) * cfg.tailSpread,
      lift: Math.random() * 0.3,
      spin: Math.random() * Math.PI * 2,
    }));

    const light = new T.PointLight(cfg.coreColor, 2.8, 6, 2);
    // Emissive halo supplies the glow without an extra per-pixel light.

    this.addEffect(group, cfg.life, (effect, dt, progress) => {
      const p = ease(progress);
      const pos = cloneVec(from).lerp(to, p);
      pos.y += Math.sin(progress * Math.PI) * cfg.arc;
      group.position.copy(pos);
      group.rotation.y += dt * 5;
      core.rotation.x += dt * 7;
      core.rotation.z += dt * 9;
      core.scale.setScalar(0.78 + Math.sin(progress * Math.PI) * 0.28);
      halo.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.35);
      halo.material.opacity = 0.36 * (1 - progress * 0.55);
      light.intensity = 2.5 * (1 - progress * 0.35);

      const a = pts.object.geometry.attributes.position;
      for (let i = 0; i < seeds.length; i++) {
        const back = Math.max(0, p - (i + 1) / (seeds.length * 1.45));
        const p2 = ease(back);
        const tp = cloneVec(from).lerp(to, p2);
        tp.y += Math.sin(back * Math.PI) * cfg.arc;
        const s = seeds[i];
        a.setXYZ(
          i,
          tp.x - pos.x + Math.sin(progress * 12 + s.spin) * s.drift,
          tp.y - pos.y + Math.cos(progress * 10 + s.spin) * s.lift,
          tp.z - pos.z + Math.cos(progress * 8 + s.spin) * s.drift,
        );
      }
      a.needsUpdate = true;
      pts.object.material.opacity = 0.92 * (1 - progress * 0.4);
    });
  }

  spawnWindBlades(from, to) {
    const group = new T.Group();
    const rings = [];
    for (let i = 0; i < 3; i++) {
      const ring = new T.Mesh(
        new T.TorusGeometry(0.36 + i * 0.08, 0.025, 6, 32),
        new T.MeshBasicMaterial({
          color: i === 1 ? "#f9fff9" : "#d7efe1",
          transparent: true,
          opacity: 0.72,
          blending: BLEND,
          depthWrite: false,
        }),
      );
      ring.rotation.y = Math.PI / 2;
      rings.push(ring);
      group.add(ring);
    }
    const pts = makePoints(26, 0.18, "#f7fff9");
    group.add(pts.object);

    this.addEffect(group, 0.42, (effect, dt, progress) => {
      const p = ease(progress);
      const pos = cloneVec(from).lerp(to, p);
      pos.y += Math.sin(progress * Math.PI) * 0.2;
      group.position.copy(pos);
      rings.forEach((ring, i) => {
        ring.rotation.z += dt * (6 + i * 2);
        ring.scale.setScalar(0.8 + progress * (1.2 + i * 0.15));
        ring.material.opacity = (0.7 - i * 0.12) * (1 - progress * 0.4);
      });
      const a = pts.object.geometry.attributes.position;
      for (let i = 0; i < 26; i++) {
        const q = i / 26;
        a.setXYZ(
          i,
          -q * 1.2,
          Math.sin(progress * 14 + i) * 0.12,
          Math.cos(progress * 8 + i) * 0.32,
        );
      }
      a.needsUpdate = true;
      pts.object.material.opacity = 0.8 * (1 - progress * 0.35);
    });
  }

  spawnRockVolley(from, to) {
    const group = new T.Group();
    const shards = [];
    for (let i = 0; i < 7; i++) {
      const mesh = new T.Mesh(
        i % 2 ? new T.DodecahedronGeometry(0.13 + Math.random() * 0.08, 0) : new T.BoxGeometry(0.18, 0.16, 0.16),
        new T.MeshStandardMaterial({ color: i % 3 ? "#a59b86" : "#c1b6a0", roughness: 1, metalness: 0 }),
      );
      shards.push({ mesh, offset: new T.Vector3((Math.random() - 0.5) * 0.45, Math.random() * 0.35, (Math.random() - 0.5) * 0.45), phase: Math.random() * Math.PI * 2 });
      group.add(mesh);
    }
    this.addEffect(group, 0.52, (effect, dt, progress) => {
      const p = ease(progress);
      const base = cloneVec(from).lerp(to, p);
      base.y += Math.sin(progress * Math.PI) * 0.44;
      group.position.copy(base);
      shards.forEach((s, i) => {
        const w = 1 - Math.abs(0.5 - p) * 1.2;
        s.mesh.position.set(
          s.offset.x * (1 + progress * 1.6),
          s.offset.y + Math.sin(progress * Math.PI * 2 + s.phase) * 0.15,
          s.offset.z * (1 + progress * 1.6),
        );
        s.mesh.rotation.x += dt * (5 + i);
        s.mesh.rotation.y += dt * (4.5 + i * 0.7);
        s.mesh.scale.setScalar(0.92 + w * 0.35);
      });
    });
  }

  spawnVineWhip(from, to) {
    const group = new T.Group();
    const lines = [];
    for (let k = 0; k < 3; k++) {
      const segments = 20;
      const pos = new Float32Array((segments + 1) * 3);
      const geometry = new T.BufferGeometry();
      geometry.setAttribute("position", new T.BufferAttribute(pos, 3));
      geometry.setDrawRange(0, 2);
      const material = new T.LineBasicMaterial({
        color: k === 1 ? "#cbe887" : k === 2 ? "#8ebf59" : "#6d9b54",
        transparent: true,
        opacity: 0.95,
      });
      const line = new T.Line(geometry, material);
      lines.push({ line, pos, segments, phase: k * 1.6 });
      group.add(line);
    }

    const leaves = makePoints(14, 0.18, "#cce48c");
    group.add(leaves.object);

    this.addEffect(group, 0.44, (effect, dt, progress) => {
      const p = ease(progress);
      lines.forEach((entry, idx) => {
        for (let i = 0; i <= entry.segments; i++) {
          const q = i / entry.segments;
          const point = cloneVec(from).lerp(to, q * p);
          const sway = Math.sin(q * Math.PI * 2 + progress * 11 + entry.phase) * (0.42 - q * 0.18);
          const lift = Math.sin(q * Math.PI) * 0.45;
          point.x += sway * (idx === 0 ? 1 : idx === 1 ? -0.6 : 0.35);
          point.y += lift;
          point.z += Math.cos(q * Math.PI * 2 + entry.phase) * 0.18;
          entry.pos[i * 3] = point.x;
          entry.pos[i * 3 + 1] = point.y;
          entry.pos[i * 3 + 2] = point.z;
        }
        entry.line.geometry.attributes.position.needsUpdate = true;
        entry.line.geometry.setDrawRange(0, Math.max(2, Math.floor((entry.segments + 1) * p)));
        entry.line.material.opacity = 0.95 * (1 - progress * 0.18);
      });
      const a = leaves.object.geometry.attributes.position;
      for (let i = 0; i < 14; i++) {
        const q = (i + 1) / 16;
        const point = cloneVec(from).lerp(to, q * p);
        point.y += Math.sin(q * Math.PI) * 0.4;
        a.setXYZ(i, point.x, point.y, point.z + Math.sin(progress * 10 + i) * 0.08);
      }
      a.needsUpdate = true;
      leaves.object.material.opacity = 0.85 * (1 - progress * 0.28);
    });
  }

  spawnPollenCloud(from, to) {
    const group = new T.Group();
    const pts = makePoints(52, 0.16, "#f4e8a4");
    group.add(pts.object);
    const orb = new T.Mesh(
      new T.SphereGeometry(0.2, 10, 10),
      new T.MeshBasicMaterial({ color: "#fff2a8", transparent: true, opacity: 0.35, blending: BLEND }),
    );
    group.add(orb);
    const seeds = Array.from({ length: 52 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.3 + Math.random() * 0.45,
      lift: -0.1 + Math.random() * 0.8,
      phase: Math.random() * Math.PI * 2,
    }));
    this.addEffect(group, 0.75, (effect, dt, progress) => {
      const travel = Math.min(1, progress * 1.1);
      const center = cloneVec(from).lerp(to, ease(travel));
      center.y += 0.15 + Math.sin(progress * Math.PI) * 0.22;
      group.position.copy(center);
      orb.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.35);
      orb.material.opacity = 0.32 + Math.sin(progress * Math.PI) * 0.12;
      const a = pts.object.geometry.attributes.position;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        const spin = progress * 9 + s.phase;
        a.setXYZ(
          i,
          Math.cos(spin + s.angle) * s.radius,
          Math.sin(spin * 1.3) * 0.18 + s.lift,
          Math.sin(spin + s.angle) * s.radius,
        );
      }
      a.needsUpdate = true;
      pts.object.material.opacity = 0.9 * (1 - Math.max(0, progress - 0.55) * 1.6);
    });
  }

  spawnDashStreaks(fromBase, toBase, color) {
    const group = new T.Group();
    const pts = makePoints(22, 0.18, "#fff2dc");
    group.add(pts.object);
    const ring = new T.Mesh(
      new T.TorusGeometry(0.32, 0.04, 6, 28),
      new T.MeshBasicMaterial({ color, transparent: true, opacity: 0.85, blending: BLEND, depthWrite: false }),
    );
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
    this.addEffect(group, 0.34, (effect, dt, progress) => {
      const p = ease(progress);
      const pos = cloneVec(fromBase).lerp(toBase, p * 0.85);
      pos.y = 1;
      group.position.copy(pos);
      ring.scale.setScalar(0.4 + progress * 1.8);
      ring.material.opacity = 0.85 * (1 - progress);
      const a = pts.object.geometry.attributes.position;
      for (let i = 0; i < 22; i++) {
        const q = i / 22;
        a.setXYZ(i, -q * 1.8, Math.sin(progress * 12 + i) * 0.05, (Math.random() - 0.5) * 0.35);
      }
      a.needsUpdate = true;
      pts.object.material.opacity = 0.95 * (1 - progress * 0.25);
    });
  }

  spawnMistEffect(center, color) {
    const group = new T.Group();
    group.position.copy(center);
    const pts = makePoints(48, 0.22, "#dff8ff");
    group.add(pts.object);
    const halo = new T.Mesh(
      new T.SphereGeometry(0.85, 12, 12),
      new T.MeshBasicMaterial({ color: "#b7f4ff", transparent: true, opacity: 0.22, blending: BLEND, depthWrite: false }),
    );
    group.add(halo);
    const seeds = Array.from({ length: 48 }, () => ({
      angle: Math.random() * Math.PI * 2,
      radius: 0.25 + Math.random() * 0.45,
      lift: Math.random() * 1.25,
      phase: Math.random() * Math.PI * 2,
    }));
    const light = new T.PointLight("#dff8ff", 2.4, 5, 2);
    // Emissive surfaces provide this glow.
    this.addEffect(group, 0.95, (effect, dt, progress) => {
      halo.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.22);
      halo.material.opacity = 0.22 * (1 - progress * 0.35);
      light.intensity = 2.4 * (1 - progress * 0.55);
      const a = pts.object.geometry.attributes.position;
      for (let i = 0; i < seeds.length; i++) {
        const s = seeds[i];
        const spin = progress * 5 + s.phase;
        a.setXYZ(
          i,
          Math.cos(spin + s.angle) * s.radius,
          -0.55 + s.lift * progress + Math.sin(spin * 1.2) * 0.08,
          Math.sin(spin + s.angle) * s.radius,
        );
      }
      a.needsUpdate = true;
      pts.object.material.opacity = 0.8 * (1 - progress * 0.25);
    });
  }

  spawnGuardEffect(center, color) {
    const group = new T.Group();
    group.position.copy(center);
    const shell = new T.Mesh(
      new T.SphereGeometry(0.78, 14, 14),
      new T.MeshBasicMaterial({ color: "#bfe6ff", transparent: true, opacity: 0.18, blending: BLEND, depthWrite: false }),
    );
    group.add(shell);
    const ringA = new T.Mesh(
      new T.TorusGeometry(0.9, 0.04, 8, 40),
      new T.MeshBasicMaterial({ color: "#f5fffb", transparent: true, opacity: 0.75, blending: BLEND, depthWrite: false }),
    );
    ringA.rotation.x = Math.PI / 2;
    group.add(ringA);
    const ringB = ringA.clone();
    ringB.rotation.y = Math.PI / 2;
    group.add(ringB);
    const light = new T.PointLight(color, 2.4, 5, 2);
    group.add(light);
    this.addEffect(group, 0.86, (effect, dt, progress) => {
      ringA.rotation.z += dt * 1.8;
      ringB.rotation.x += dt * 1.4;
      ringA.scale.setScalar(0.96 + Math.sin(progress * Math.PI) * 0.12);
      ringB.scale.setScalar(0.96 + Math.cos(progress * Math.PI) * 0.12);
      shell.scale.setScalar(0.9 + Math.sin(progress * Math.PI) * 0.18);
      shell.material.opacity = 0.18 * (1 - progress * 0.45);
      ringA.material.opacity = 0.75 * (1 - progress * 0.2);
      ringB.material.opacity = 0.58 * (1 - progress * 0.2);
      light.intensity = 2.4 * (1 - progress * 0.5);
    });
  }

  spawnImpactParticles(x, y, z, color, moveId = "elan", miss = false) {
    const tint = {
      braise: "#ff8d41",
      onde: "#7dd3ea",
      roc: "#bcb39e",
      souffle: "#f2fff9",
      liane: "#a8cf6a",
      pollen: "#f1e69f",
      eclat: "#fff7bf",
      elan: color,
    }[moveId] || color;

    const reused=this.particlePool.pop();
    const g = reused?.geometry || new T.BufferGeometry();
    const p = g.attributes.position?.array || new Float32Array(90);
    const vel = [];

    for (let i = 0; i < 30; i++) {
      p.set([x, y, z], i * 3);
      const a = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 4.2;
      vel.push([
        Math.cos(a) * speed,
        1.2 + Math.random() * 3.8,
        Math.sin(a) * speed,
      ]);
    }

    g.setAttribute("position", new T.BufferAttribute(p, 3));

    const m = reused || new T.Points(
      g,
      new T.PointsMaterial({
        size: moveId === "roc" ? 0.24 : 0.18,
        color: tint,
        transparent: true,
        opacity: miss ? 0.5 : 1,
        depthWrite: false,
      }),
    );

    m.material.color.set(tint);m.material.opacity=miss?.5:1;m.material.size=moveId==="roc"?.24:.18;
    g.attributes.position.needsUpdate=true;g.computeBoundingSphere();
    this.scene.add(m);
    this.particles.push({ m, vel, life: 0.8, gravity: moveId === "roc" ? 9 : 7 });

    const ring = new T.Mesh(
      new T.TorusGeometry(moveId === "onde" ? 0.62 : 0.52, 0.055, 8, 48),
      new T.MeshBasicMaterial({
        color: tint,
        transparent: true,
        opacity: miss ? 0.35 : 0.85,
        blending: BLEND,
        depthWrite: false,
      }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(x, 0.18, z);
    ring.scale.setScalar(0.25);
    this.scene.add(ring);
    this.effects.push({
      root: ring,
      life: 0.55,
      maxLife: 0.55,
      updater: (effect, dt, progress) => {
        const k = progress;
        ring.scale.setScalar(0.25 + k * (moveId === "onde" ? 3.1 : 2.4));
        ring.material.opacity = (miss ? 0.4 : 0.82) * (1 - progress);
      },
    });

    const flash = new T.PointLight(tint, miss ? 1.5 : 3.2, moveId === "eclat" ? 8 : 7, 2);
    flash.position.set(x, 1.25, z);
    // Impact ring and emissive particles provide light without a new light pass.
    this.effects.push({
      root: flash,
      life: 0.24,
      maxLife: 0.24,
      updater: (effect, dt, progress) => {
        flash.intensity = (miss ? 1.5 : 3.2) * (1 - progress);
      },
    });
  }

  update(dt, t) {
    if(this.pendingImpact){this.pendingImpact.delay-=dt;if(this.pendingImpact.delay<=0){const p=this.pendingImpact;this.pendingImpact=null;this.spawnImpactParticles(p.to.x,p.to.y,p.to.z,p.color,p.moveId,p.miss);}}
    this.ally.position.copy(this.allyBase);
    this.enemy.position.copy(this.enemyBase);

    const allyMoving = !!(this.action && this.action.allyAttacking && this.action.moveId === "elan");
    const enemyMoving = !!(this.action && !this.action.allyAttacking && this.action.moveId === "elan");

    this.ally.userData.animate?.(t, allyMoving);
    this.enemy.userData.animate?.(t + 0.7, enemyMoving);

    // Petites lueurs d'ambiance pour éviter une arène vide.
    const amb = this.ambientGlow.object.geometry.attributes.position;
    this.ambientGlow.seeds.forEach((s, i) => {
      amb.setXYZ(
        i,
        s.x + Math.sin(t * 0.7 + s.s) * 0.25,
        s.y + Math.sin(t * 1.3 + s.s) * 0.18,
        s.z + Math.cos(t * 0.9 + s.s) * 0.25,
      );
    });
    amb.needsUpdate = true;
    this.ambientGlow.object.material.opacity = 0.42 + Math.sin(t * 1.5) * 0.06;

    if (this.action) {
      const a = this.action;
      a.elapsed += dt;
      const p = Math.min(1, a.elapsed / a.duration);
      const attacker = a.allyAttacking ? this.ally : this.enemy;
      const defender = a.allyAttacking ? this.enemy : this.ally;
      const attackerBase = a.allyAttacking ? this.allyBase : this.enemyBase;
      const defenderBase = a.allyAttacking ? this.enemyBase : this.allyBase;
      const dir = defenderBase.clone().sub(attackerBase).normalize();

      let lunge = 0;
      const amp = a.moveId === "elan" ? 2.05 : a.moveId === "roc" || a.moveId === "souffle" ? 0.65 : 1.25;
      if (p < 0.38) {
        const q = p / 0.38;
        lunge = q * q * (3 - 2 * q);
      } else {
        const q = (p - 0.38) / 0.62;
        lunge = 1 - q * q * (3 - 2 * q);
      }
      attacker.position.addScaledVector(dir, lunge * amp);
      if (a.moveId === "elan") attacker.position.y += Math.sin(Math.min(1, p * 1.2) * Math.PI) * 0.15;

      if (a.elapsed >= 0.46 && !a.hitTriggered) {
        a.hitTriggered = true;
        if (!a.miss) {
          if (a.ko) defender.userData.playDeath?.();
          else defender.userData.playHit?.();
        }
      }

      if (!a.miss && p > 0.28) {
        const q = Math.min(1, (p - 0.28) / 0.72);
        const recoil = Math.sin(q * Math.PI) * (a.moveId === "elan" ? 0.48 : 0.34);
        defender.position.addScaledVector(dir, recoil);
        defender.rotation.z = Math.sin(q * Math.PI * 3) * 0.05;
      }

      if (p >= 1) {
        defender.rotation.z = 0;
        this.action = null;
      }
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
    } else {
      this.ring.material.opacity = 0;
    }

    for (const p of [...this.particles]) {
      p.life -= dt;
      const a = p.m.geometry.attributes.position;
      p.vel.forEach((v, i) => {
        v[1] -= dt * p.gravity;
        a.setXYZ(
          i,
          a.getX(i) + v[0] * dt,
          a.getY(i) + v[1] * dt,
          a.getZ(i) + v[2] * dt,
        );
      });
      a.needsUpdate = true;
      p.m.material.opacity = Math.max(0, p.life / 0.8);
      if (p.life <= 0) {
        this.scene.remove(p.m);
        this.particlePool.push(p.m);
        this.particles.splice(this.particles.indexOf(p), 1);
      }
    }

    for (const e of [...this.effects]) {
      e.life -= dt;
      const progress = 1 - Math.max(0, e.life / e.maxLife);
      e.updater?.(e, dt, progress, t);
      if (e.life <= 0) {
        this.scene.remove(e.root);
        disposeObject(e.root);
        this.effects.splice(this.effects.indexOf(e), 1);
      }
    }
  }

  dispose() {
    this.meadow.geometry.dispose();this.meadow.material.dispose();
    this.ring.geometry.dispose();
    this.ring.material.dispose();
    this.sun.shadow.map?.dispose();

    this.decor.traverse((o) => {
      if (o.isInstancedMesh) o.dispose();
    });

    for (const actor of [this.ally,this.enemy]) actor.userData.dispose?.();

    for(const m of this.particlePool){m.geometry.dispose();m.material.dispose();}
    this.particlePool=[];
    for (const p of this.particles) {
      p.m.geometry.dispose();
      p.m.material.dispose();
    }

    for (const e of this.effects) disposeObject(e.root);

    this.ambientGlow.object.geometry.dispose();
    this.ambientGlow.object.material.dispose();
  }
}

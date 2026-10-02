import {
  T,
  Factory,
  random,
  house,
  tree,
  flower,
  lamp,
  furnishing,
  human,
  creature,
} from "../rendering/art.js";
import { stepNpc } from "../systems/npc-motion.js";
import {
  groundMaterial,
  villageDetails,
  lamplightPools,
} from "../rendering/village.js";
import { species } from "../systems/data.js";
export const riverX = (z) => 19 + Math.sin(z * 0.04) * 1.5;
export function terrainHeight(x, z) {
  let h = Math.max(
    0.1,
    0.35 +
      Math.sin(x * 0.075) * 0.45 +
      Math.cos(z * 0.085) * 0.32 +
      Math.max(0, -z - 12) * 0.058 +
      Math.exp(-((x - 43) ** 2 + (z + 34) ** 2) / 500) * 3.5,
  );
  const terrace = Math.max(0, Math.min(1, (8 - x) / 5));
  h += terrace * Math.max(0, Math.min(1, (-z - 31) / 4)) * 2.6;
  const dist = Math.abs(x - riverX(z));
  if (dist < 4.7) return -0.85;
  if (dist < 7) h *= Math.min(1, (dist - 4.7) / 2.3);
  return h;
}
export const onBridge = (x, z) =>
  x > 11 && x < 28 && (Math.abs(z - 8) < 2 || Math.abs(z + 30) < 2);
export function height(x, z) {
  return onBridge(x, z)
    ? 0.7 + Math.sin(((x - 11) / 17) * Math.PI) * 0.55
    : terrainHeight(x, z);
}
export function isRoad(x, z) {
  if (
    x < -2 &&
    x > -48 &&
    (Math.abs(z + 19) < 2.1 || Math.abs(z - 8) < 2.1 || Math.abs(z + 39) < 1.7)
  )
    return true;
  if (Math.abs(x + 9) < 2.3 && z > -52 && z < 24) return true;
  if (Math.hypot(x + 9, z) < 7.5) return true;
  if (z > 7 && z < 31 && Math.abs(x - (-9 - (z - 8) * 0.9)) < 1.45) return true;
  if (x > -9 && x < 52 && (Math.abs(z - 8) < 1.7 || Math.abs(z + 30) < 1.5))
    return true;
  if (x > 27 && x < 52 && Math.abs(x - (38 + Math.sin(z * 0.1) * 5)) < 1.7)
    return true;
  return false;
}
export class World {
  constructor(scene) {
    this.scene = scene;
    this.chunks = [];
    this.colliders = [];
    this.resources = [];
    this.npcs = [];
    this.wild = [];
    this.interactables = [];
    this.lamps = [];
    this.plotMeshes = new Map();
    this.buildMeshes = [];
    this.rand = random(57291);
    this.build();
  }
  collider(x, z, r, kind = "circle", w = 0, d = 0) {
    this.colliders.push({ x, z, r, kind, w, d });
  }
  collides(x, z, r = 0.4) {
    if (x < -66 || x > 66 || z < -65 || z > 60) return true;
    if (Math.abs(x - riverX(z)) < 5.1 && !onBridge(x, z)) return true;
    for (const c of this.colliders) {
      if (c.disabled) continue;
      if (c.kind === "rect") {
        if (Math.abs(x - c.x) < c.w / 2 + r && Math.abs(z - c.z) < c.d / 2 + r)
          return true;
      } else if (Math.hypot(x - c.x, z - c.z) < c.r + r) return true;
    }
    return false;
  }
  build() {
    const geom = new T.PlaneGeometry(150, 150, 180, 180);
    geom.rotateX(-Math.PI / 2);
    const colors = [],
      pos = geom.attributes.position,
      grass = new T.Color(),
      r = this.rand;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i),
        z = pos.getZ(i);
      pos.setY(i, terrainHeight(x, z));
      const road = isRoad(x, z);
      grass.set(road ? "#b59177" : x > 30 && z < -23 ? "#65866e" : "#668746");
      grass.multiplyScalar(0.94 + r() * 0.12);
      colors.push(grass.r, grass.g, grass.b);
    }
    geom.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    const ground = new T.Mesh(geom, groundMaterial());
    ground.receiveShadow = true;
    this.scene.add(ground);
    const waterGeo = new T.PlaneGeometry(150, 150, 1, 1);
    waterGeo.rotateX(-Math.PI / 2);
    this.water = new T.Mesh(
      waterGeo,
      new T.ShaderMaterial({
        uniforms: { time: { value: 0 }, sun: { value: 1 } },
        vertexShader: `varying vec3 vP;void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
        fragmentShader: `varying vec3 vP;uniform float time;uniform float sun;void main(){float wave=sin(vP.x*2.4+vP.z*3.1+time*.9)*sin(vP.z*1.7-time*.7);float glint=pow(max(0.,sin(vP.x*4.8+vP.z*2.7+time)*cos(vP.z*5.5-time*.5)),18.);vec3 c=mix(vec3(.08,.25,.38),vec3(.2,.5,.62),wave*.25+.45);c+=glint*.3;gl_FragColor=vec4(c*(.5+.5*sun),1.);}`,
      }),
    );
    this.water.position.y = -0.37;
    this.scene.add(this.water);
    this.ground = ground;
    this.pickSurfaces = [ground];
    for (const bridgeZ of [8, -30]) {
      const deck = new T.Mesh(
        new T.PlaneGeometry(17, 3.9),
        new T.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: false,
          transparent: true,
          opacity: 0,
        }),
      );
      deck.rotation.x = -Math.PI / 2;
      deck.position.set(19.5, 0.9, bridgeZ);
      this.scene.add(deck);
      this.pickSurfaces.push(deck);
    }
    for (let cx = -2; cx <= 2; cx++)
      for (let cz = -2; cz <= 2; cz++) {
        const g = new T.Group(),
          f = new Factory(g, true);
        this.chunks.push({ g, x: cx * 30, z: cz * 30 });
        this.scene.add(g);
        this.decorateChunk(f, cx, cz);
        f.flush();
      }
    const g = new T.Group(),
      f = new Factory(g, true);
    this.scene.add(g);
    this.landmarkGroup = g;
    villageDetails(f, this);
    // Formal crescent city: three neighbourhoods, generous streets and passages.
    let idx = 0;
    for (const z of [-48, -29, -9, 18])
      for (const x of [-44, -32, -21, 2]) {
        if (z === 18 && x < -15) continue;
        if (z === -9 && x === -21) continue;
        const w = 4.5 + r() * 1.5,
          d = 4.5 + r() * 1.2,
          h = 3.4 + r() * 2.4;
        house(f, x, height(x, z), z, w, d, h, idx++);
        this.collider(x, z, 0.1, "rect", w + 0.5, d + 0.5);
        if (z < 0) {
          lamp(f, x + w / 2 + 1, height(x + w / 2 + 1, z + 4), z + 4);
          furnishing(
            f,
            "bed",
            x - w / 2 - 0.9,
            height(x - w / 2 - 0.9, z + 1),
            z + 1,
          );
        }
        for (let k = 0; k < 3; k++)
          f.part(
            "box",
            "#b1a58a",
            x - w / 2 - 1,
            height(x - w / 2 - 1, z + k * 0.5) + 0.1,
            z + k * 0.5,
            0.5,
            0.15,
            0.4,
            0,
            k * 0.2,
          );
      }
    // Arcaded civic hall and its observatory.
    house(f, -8, height(-8, -27), -27, 10, 7, 6, 1);
    this.collider(-8, -27, 0, "rect", 10, 7);
    const ty = height(-9, -28);
    f.part("cylinder", "#d5c6a1", -9, ty + 9, -28, 2, 9, 2, 0, 0, 0, "stone");
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      f.part(
        "box",
        "#66817a",
        -9 + Math.sin(a) * 1.99,
        ty + 10,
        -28 + Math.cos(a) * 1.99,
        0.4,
        1.5,
        0.12,
        0,
        a,
      );
    }
    f.part("cone", "#527972", -9, ty + 15, -28, 3, 4, 3, 0, 0.3);
    f.part("sphere", "#dab873", -9, ty + 17.1, -28, 0.22, 0.35, 0.22);
    f.part("torus", "#e5c990", -9, ty + 12, -25.97, 0.7, 0.7, 0.7);
    f.part("box", "#e5c990", -9, ty + 12.2, -25.94, 0.06, 0.42, 0.07);
    f.part("box", "#e5c990", -8.8, ty + 12, -25.94, 0.46, 0.06, 0.07);
    // Fountain: scalloped basin, carved central spindle, four water spouts.
    const fy = height(-9, 0);
    f.part("cylinder", "#b9b498", -9, fy + 0.16, 0, 3, 0.32, 3);
    f.part("torus", "#ddd2b2", -9, fy + 0.48, 0, 2.65, 2.65, 2.65, Math.PI / 2);
    f.part("cylinder", "#6faaa2", -9, fy + 0.3, 0, 2.5, 0.05, 2.5);
    f.part("taper", "#d3c8a8", -9, fy + 1.1, 0, 0.58, 2, 0.58);
    f.part("cylinder", "#d4c6a3", -9, fy + 1.8, 0, 1.3, 0.18, 1.3);
    f.part("sphere", "#6d9a7b", -9, fy + 2.4, 0, 0.4, 0.68, 0.4);
    f.part("torus", "#d9bb71", -9, fy + 2.7, 0, 0.73, 0.73, 0.73, 0, 0.6);
    this.collider(-9, 0, 2.7);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2,
        x = -9 + Math.sin(a) * 5.5,
        z = Math.cos(a) * 5.5;
      furnishing(f, "bench", x, height(x, z), z, -a);
      lamp(f, x + 1, height(x + 1, z), z);
    }
    // Market canopies and individual produce baskets.
    for (let i = 0; i < 5; i++) {
      const x = -41 + i * 5.2,
        z = -17.1,
        y = height(x, z);
      for (const dx of [-1.5, 1.5])
        for (const dz of [-0.8, 0.8])
          f.part(
            "cylinder",
            "#7e684b",
            x + dx,
            y + 1.35,
            z + dz,
            0.055,
            2.7,
            0.055,
          );
      for (let j = 0; j < 7; j++)
        f.part(
          "box",
          j % 2 ? "#f0ddb3" : i % 2 ? "#859c81" : "#c58b70",
          x - 1.5 + j * 0.5,
          y + 2.62,
          z,
          0.5,
          0.09,
          2.15,
          0.1,
        );
      f.part("box", "#997e56", x, y + 0.82, z, 3.1, 1, 1.5, 0, 0, 0, "wood");
      for (let j = 0; j < 12; j++)
        f.part(
          "sphere",
          j % 3 ? "#b9b763" : "#c5825c",
          x - 1.2 + (j % 6) * 0.48,
          y + 1.42,
          z - 0.35 + Math.floor(j / 6) * 0.6,
          0.18,
          0.17,
          0.2,
        );
      this.collider(x, z, 0, "rect", 3.2, 1.6);
    }
    // Farm cottage, fruit pergola and fence, entrance toward the path.
    house(f, -36, height(-36, 25), 25, 6, 5, 3.5, 2);
    this.collider(-36, 25, 0, "rect", 6.5, 5.5);
    for (let x = -44; x < -14; x += 2) {
      if (x > -28 && x < -23) continue;
      furnishing(f, "fence", x, height(x, 42), 42);
    }
    for (let z = 21; z < 42; z += 2) {
      furnishing(f, "fence", -44, height(-44, z), z, Math.PI / 2);
      furnishing(f, "fence", -15, height(-15, z), z, Math.PI / 2);
    }
    furnishing(f, "workbench", -40, height(-40, 32), 32);
    this.interactables.push({
      type: "workbench",
      name: "Établi de campagne",
      x: -40,
      z: 32,
    });
    this.interactables.push({
      type: "home",
      name: "Votre maison · repos et soins",
      x: -36,
      z: 28.3,
    });
    for (let i = 0; i < 4; i++) {
      tree(f, -41 + i * 6, height(-41 + i * 6, 38), 38, 0.56, 1);
      this.collider(-41 + i * 6, 38, 0.3);
    }
    // Bridges: rising plank decks, arches, posts and double handrails.
    for (const z of [8, -30]) {
      for (let j = 0; j < 34; j++) {
        const x = 11 + j * 0.5,
          y = height(x, z);
        f.part(
          "box",
          "#b39c76",
          x,
          y - 0.1,
          z,
          0.48,
          0.2,
          3.9,
          0,
          0,
          0,
          "wood",
        );
      }
      for (let x = 11; x <= 28; x += 2.1) {
        for (const dz of [-1.85, 1.85]) {
          const y = height(x, z);
          f.part("box", "#6e725f", x, y + 0.65, z + dz, 0.17, 1.3, 0.17);
          f.part("sphere", "#d7bd80", x, y + 1.4, z + dz, 0.15, 0.17, 0.15);
        }
      }
      for (let x = 11.5; x < 27.5; x++) {
        for (const dz of [-1.85, 1.85])
          for (const yy of [0.55, 1.13])
            f.part(
              "box",
              "#8f856a",
              x,
              height(x, z) + yy,
              z + dz,
              1.12,
              0.1,
              0.1,
            );
      }
      for (const x of [12, 27]) lamp(f, x, height(x, z), z - 2.15);
    }
    // Conservatory, tiered garden and ancient sanctuary.
    house(f, -35, height(-35, -49), -49, 7, 7, 4.8, 1);
    for (let i = 0; i < 7; i++) {
      const x = -39 + i * 1.2;
      f.part("box", "#9eb5a0", x, height(-35, -49) + 5.5, -49, 0.06, 1.6, 6.7);
    }
    const sy = height(43, -39);
    f.part("cylinder", "#b1b29b", 43, sy + 0.18, -39, 5.5, 0.36, 5.5);
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI) / 4,
        x = 43 + Math.sin(a) * 4.3,
        z = -39 + Math.cos(a) * 4.3;
      if (i === 0) continue;
      const y = height(x, z),
        h = 3 + r() * 2;
      f.part(
        "cylinder",
        "#cac6a9",
        x,
        y + h / 2,
        z,
        0.42,
        h,
        0.42,
        0,
        0,
        0,
        "stone",
      );
      f.part("box", "#abb596", x, y + h, z, 1.15, 0.35, 1.15);
      f.part("sphere", "#698567", x + 0.2, y + h * 0.6, z, 0.6, 0.3, 0.6);
      this.collider(x, z, 0.5);
    }
    f.part("torus", "#a9b8a1", 43, sy + 4.7, -41, 2.3, 2.3, 2.3, 0, 0, 0.1);
    f.part(
      "sphere",
      "#d8c188",
      43,
      sy + 4.7,
      -41,
      0.35,
      0.55,
      0.35,
      0,
      0,
      0,
      "",
      0.6,
    );
    // Stone riverbanks, lilies, reed beds and stepping contours.
    for (let z = -66; z < 62; z += 1.5) {
      for (const s of [-1, 1]) {
        const x = riverX(z) + s * (5.2 + r() * 0.45);
        if (onBridge(x, z)) continue;
        const y = terrainHeight(x, z);
        f.part(
          "sphere",
          s > 0 ? "#929d88" : "#a4ac90",
          x,
          y - 0.1,
          z,
          0.5 + r() * 0.4,
          0.45 + r() * 0.4,
          0.65,
          0,
          r() * 6,
        );
        if (r() > 0.7) {
          for (let i = 0; i < 4; i++)
            f.part(
              "cone",
              "#79916a",
              x + s * 0.2 + r() * 0.3,
              y + 0.5,
              z + r() * 0.5,
              0.04,
              1.3,
              0.04,
              0,
              0,
              0.18,
            );
        }
      }
      if (r() > 0.8) {
        const x = riverX(z) + (r() - 0.5) * 5;
        f.part("cylinder", "#8caa77", x, -0.32, z, 0.24, 0.02, 0.23);
        flower(f, x, -0.35, z, "#efddbc", 0.8);
      }
    }
    // Individual paving, curbs and planted islands give the streets a human scale.
    for (let x = -48; x < 10; x += 0.78)
      for (let z = -53; z < 23; z += 0.72) {
        if (!isRoad(x, z)) continue;
        const xx = x + (Math.round(z / 0.72) % 2) * 0.3;
        const c = ["#8d8586", "#aa9a91", "#817c80"][Math.floor(r() * 3)];
        f.part(
          "box",
          c,
          xx,
          height(xx, z) + 0.035,
          z,
          0.69,
          0.035,
          0.63,
          0,
          (r() - 0.5) * 0.08,
        );
      }
    for (const [x, z, s] of [
      [-19, 5, 0.72],
      [-20, -7, 0.8],
      [-2, 7, 0.7],
      [-3, -10, 0.75],
      [-27, 2, 0.9],
      [-37, 1, 0.75],
      [-42, 13, 0.72],
      [-3, -37, 0.8],
      [-18, -39, 0.75],
      [-30, -39, 0.7],
      [-17, 18, 0.75],
      [-35, 17, 0.65],
    ]) {
      const y = height(x, z);
      f.part("cylinder", "#b5ad8f", x, y + 0.17, z, 1.65, 0.32, 1.65);
      f.part("cylinder", "#667454", x, y + 0.36, z, 1.45, 0.08, 1.45);
      tree(f, x, y + 0.4, z, s, x === -20 || x === -17 || x === -30 ? 4 : 1);
      this.collider(x, z, 0.35);
      for (let j = 0; j < 18; j++) {
        const a = j * 2.4;
        flower(
          f,
          x + Math.sin(a) * 1.15,
          y + 0.38,
          z + Math.cos(a) * 1.15,
          j % 2 ? "#c79089" : "#e7cf9e",
          1.2,
        );
      }
    }
    // Walled herb garden beside the plaza with patterned beds and a pergola.
    for (const [x, z] of [
      [-25, -3],
      [-30, -3],
      [-25, 2],
      [-30, 2],
    ]) {
      const y = height(x, z);
      f.part("box", "#b8ae8d", x, y + 0.1, z, 3.6, 0.22, 3.6, 0, 0, 0, "stone");
      f.part("box", "#596b4b", x, y + 0.23, z, 3.25, 0.12, 3.25);
      for (let i = 0; i < 25; i++) {
        const dx = ((i % 5) - 2) * 0.56,
          dz = (Math.floor(i / 5) - 2) * 0.56;
        f.part(
          "sphere",
          i % 2 ? "#889963" : "#9eaa71",
          x + dx,
          y + 0.53,
          z + dz,
          0.29,
          0.38,
          0.29,
        );
        flower(f, x + dx, y + 0.7, z + dz, i % 3 ? "#cda2b0" : "#edd3a6", 1.3);
      }
    }
    for (let i = 0; i < 4; i++) {
      const x = -34 + i * 2.3,
        y = height(x, -4);
      for (const zz of [-6, -3])
        f.part("box", "#7c7153", x, y + 1.5, zz, 0.12, 3, 0.12);
      f.part("box", "#a1956c", x, y + 3, -4.5, 0.15, 0.16, 4);
      for (let j = 0; j < 4; j++)
        f.part("sphere", "#739061", x, y + 3.12, -6 + j, 0.5, 0.18, 0.68);
    }
    for (let j = 0; j < 9; j++) {
      const x = -35 + j,
        y = height(x, -4);
      f.part("box", "#8d8260", x, y + 2.98, -4.5, 0.12, 0.13, 4.2);
    }
    for (const [x, z] of [
      [-21, 11],
      [-32, 10],
      [-13, -13],
      [-4, -15],
      [-45, -21],
    ]) {
      const y = height(x, z);
      furnishing(f, "bench", x, y, z);
      furnishing(f, "bed", x + 2.3, height(x + 2.3, z), z);
      lamp(f, x - 1.5, height(x - 1.5, z), z);
    }
    // Northern neighbourhood sits on a raised terrace with a central stairway.
    for (const [x, width] of [
      [-30, 33],
      [1, 12],
    ]) {
      const y = height(x, -31);
      f.part(
        "box",
        "#b2aa8d",
        x,
        y + 1.05,
        -33.8,
        width,
        2.2,
        0.65,
        0,
        0,
        0,
        "stone",
      );
      f.part("box", "#d0c4a3", x, y + 2.22, -33.8, width + 0.2, 0.17, 0.85);
      this.collider(x, -33.8, 0, "rect", width, 0.7);
    }
    for (let i = 0; i < 12; i++) {
      const z = -31.3 - i * 0.32;
      f.part(
        "box",
        "#c7bb9b",
        -9,
        height(-9, z) + 0.06,
        z,
        4.7,
        0.15,
        0.38,
        0,
        0,
        0,
        "stone",
      );
    }
    this.lightPools = lamplightPools(this.scene, f);
    f.flush();
    this.populate();
    this.createParticles();
  }
  decorateChunk(f, cx, cz) {
    const r = this.rand;
    for (let i = 0; i < 55; i++) {
      const x = cx * 30 + (r() - 0.5) * 30,
        z = cz * 30 + (r() - 0.5) * 30;
      if (
        Math.abs(x) > 66 ||
        Math.abs(z) > 64 ||
        Math.abs(x - riverX(z)) < 7 ||
        isRoad(x, z)
      )
        continue;
      const city = x < 7 && x > -50 && z < 21 && z > -56,
        farm = x > -46 && x < -13 && z > 18 && z < 44;
      let nearHome = city || farm;
      if (!nearHome && r() > 0.24) {
        const size = 0.65 + r() * 0.65;
        tree(f, x, height(x, z), z, size, Math.floor(r() * 3));
        this.collider(x, z, 0.29 * size);
      } else if (!farm && !city) {
        f.part("sphere", "#879b63", x, height(x, z) + 0.3, z, 0.8, 0.5, 0.7);
      }
    }
    for (let i = 0; i < 150; i++) {
      const x = cx * 30 + (r() - 0.5) * 30,
        z = cz * 30 + (r() - 0.5) * 30;
      if (Math.abs(x) > 69 || Math.abs(z) > 67 || Math.abs(x - riverX(z)) < 6)
        continue;
      const y = height(x, z);
      if (isRoad(x, z)) {
        if (r() > 0.5)
          f.part(
            "box",
            "#bdb39a",
            x,
            y + 0.023,
            z,
            0.18 + r() * 0.32,
            0.05,
            0.2 + r() * 0.15,
            0,
            r() * 3,
          );
        continue;
      }
      const farm = x > -44 && x < -15 && z > 20 && z < 42;
      if (farm) continue;
      for (let j = 0; j < 3; j++)
        f.part(
          "cone",
          j % 2 ? "#9bad72" : "#829762",
          x + j * 0.12,
          y + 0.14,
          z,
          0.045,
          0.34 + r() * 0.2,
          0.06,
          0,
          r() * 6,
          0.25,
        );
      if (r() > 0.55)
        flower(
          f,
          x,
          y,
          z,
          ["#e4c6a0", "#bcbacf", "#dba6a0"][i % 3],
          0.7 + r() * 0.5,
        );
    }
  }
  populate() {
    const npcData = [
      ["Maëlle", "La gardienne des jardins", -5, 4, "#9f8670"],
      ["Soline", "Tisserande et marchande", -27, -14, "#b98769"],
      ["Ivo", "Botaniste des Sources", -14, -20, "#73948a"],
      ["Noé", "Promeneur des terrasses", -12, 15, "#8b91a5"],
      ["Ysée", "La mémoire des ruines", 30, -29, "#b59c75"],
      ["Tess", "Menuisière", -41, 8, "#8d9d7b"],
      ["Orin", "Marchand de semences", -38, -14, "#bcaa78"],
      ["Alba", "Voyageuse", -9, -40, "#ac8981"],
    ];
    npcData.forEach(([name, role, x, z, color], i) => {
      const mesh = human(color, i % 2 ? "#ba8c69" : "#d5b496", i % 3 !== 0);
      mesh.position.set(x, height(x, z), z);
      mesh.rotation.y = i;
      this.scene.add(mesh);
      this.npcs.push({
        name,
        role,
        x,
        z,
        homeX: x,
        homeZ: z,
        mesh,
        phase: i * 1.7,
        route: [
          [
            { x: -5, z: 4 },
            { x: -5, z: 8 },
            { x: -15, z: 8 },
            { x: -15, z: 0 },
          ],
          [
            { x: -27, z: -14 },
            { x: -23, z: -19 },
            { x: -34, z: -19 },
          ],
          [
            { x: -14, z: -20 },
            { x: -9, z: -19 },
            { x: -9, z: -12 },
            { x: -16, z: -12 },
          ],
          [
            { x: -12, z: 15 },
            { x: -9, z: 20 },
            { x: -9, z: 8 },
            { x: -20, z: 8 },
          ],
          [
            { x: 30, z: -29 },
            { x: 35, z: -30 },
            { x: 35, z: -35 },
          ],
          [
            { x: -41, z: 8 },
            { x: -32, z: 8 },
            { x: -41, z: 12 },
          ],
          [
            { x: -38, z: -14 },
            { x: -40, z: -19 },
            { x: -32, z: -19 },
          ],
          [
            { x: -9, z: -40 },
            { x: -17, z: -39 },
            { x: -9, z: -48 },
          ],
        ][i],
      });
    });
    const wildData = [
      ["velune", 34, 12],
      ["ondril", 29, 20],
      ["moussier", 44, 24],
      ["vrille", -26, -59],
      ["brasile", 39, 43],
      ["velune", 51, 1],
      ["moussier", 37, -11],
      ["ondril", 29, -19],
      ["lumignon", 49, -30],
      ["coralys", 29, 34],
      ["gardien", 43, -38],
    ];
    wildData.forEach(([id, x, z], i) => {
      const mesh = creature(species(id));
      mesh.position.set(x, height(x, z), z);
      this.scene.add(mesh);
      this.wild.push({
        id,
        x,
        z,
        homeX: x,
        homeZ: z,
        mesh,
        phase: i * 1.3,
        cooldown: 0,
        index: i,
        level: id === "gardien" ? 7 : 2 + (i % 4),
      });
    });
    for (let i = 0; i < 60; i++) {
      const r = this.rand;
      let x, z;
      if (i < 10) {
        x = -41 + r() * 22;
        z = 29 + r() * 11;
      } else {
        x = 29 + r() * 29;
        z = -23 + r() * 78;
      }
      if (
        isRoad(x, z) ||
        this.collides(x, z, 1) ||
        (x > -30.3 && x < -20.7 && z > 26.8 && z < 34)
      )
        continue;
      const type =
          i % 3 === 0
            ? "wood"
            : i % 3 === 1
              ? "stone"
              : i % 9 === 2
                ? "crystal"
                : "fiber",
        g = new T.Group(),
        f = new Factory(g, true);
      if (type === "wood") {
        f.part(
          "cylinder",
          "#8d7453",
          0,
          0.4,
          0,
          0.37,
          1.3,
          0.37,
          0,
          0,
          Math.PI / 2,
        );
        f.part(
          "cylinder",
          "#c4ab77",
          0.66,
          0.4,
          0,
          0.3,
          0.025,
          0.3,
          0,
          0,
          Math.PI / 2,
        );
        for (let j = 0; j < 3; j++)
          f.part("box", "#705c41", 0, 0.45 + j * 0.07, 0.3, 1.2, 0.04, 0.04);
      } else if (type === "stone") {
        f.part("sphere", "#a9ab98", 0, 0.5, 0, 0.8, 0.6, 0.66, 0, i);
        f.part("sphere", "#babbab", 0.44, 0.2, 0.3, 0.35, 0.32, 0.3);
      } else if (type === "crystal") {
        for (let j = 0; j < 4; j++)
          f.part(
            "cone",
            "#9cc7b0",
            Math.sin(j * 3) * 0.2,
            0.6,
            Math.cos(j * 3) * 0.2,
            0.2,
            1.3,
            0.2,
            0,
            j,
            (j - 2) * 0.2,
          );
      } else {
        for (let j = 0; j < 6; j++) {
          f.part(
            "sphere",
            "#8c9d65",
            Math.sin(j) * 0.25,
            0.32,
            Math.cos(j) * 0.25,
            0.22,
            0.35,
            0.22,
          );
          flower(f, Math.sin(j) * 0.25, 0.5, Math.cos(j) * 0.25, "#d7bf93");
        }
      }
      f.flush();
      g.position.set(x, height(x, z), z);
      this.scene.add(g);
      this.resources.push({ id: `res${i}`, type, x, z, mesh: g });
    }
    // Guaranteed crystal on the forest path to connect early crafting to exploration.
    const g = new T.Group(),
      f = new Factory(g, true);
    for (let i = 0; i < 5; i++)
      f.part(
        "cone",
        "#a7d2b7",
        Math.sin(i * 2) * 0.3,
        0.65,
        Math.cos(i * 2) * 0.3,
        0.18,
        1.3,
        0.18,
        0,
        i,
        0.15,
      );
    f.flush();
    g.position.set(31, height(31, 11), 11);
    this.scene.add(g);
    this.resources.push({
      id: "firstcrystal",
      type: "crystal",
      x: 31,
      z: 11,
      mesh: g,
    });
  }
  createParticles() {
    const r = this.rand,
      count = 180,
      g = new T.BufferGeometry(),
      p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i * 3] = (r() - 0.5) * 110;
      p[i * 3 + 1] = 1 + r() * 9;
      p[i * 3 + 2] = (r() - 0.5) * 110;
    }
    g.setAttribute("position", new T.BufferAttribute(p, 3));
    this.motes = new T.Points(
      g,
      new T.PointsMaterial({
        color: "#f9e8b3",
        size: 0.075,
        transparent: true,
        opacity: 0.65,
        depthWrite: false,
      }),
    );
    this.scene.add(this.motes);
    const rainGeo = new T.BufferGeometry(),
      rp = new Float32Array(1200 * 3);
    for (let i = 0; i < 1200; i++) {
      rp[i * 3] = (r() - 0.5) * 60;
      rp[i * 3 + 1] = r() * 25;
      rp[i * 3 + 2] = (r() - 0.5) * 60;
    }
    rainGeo.setAttribute("position", new T.BufferAttribute(rp, 3));
    this.rain = new T.Points(
      rainGeo,
      new T.PointsMaterial({
        color: "#d8e7dd",
        size: 0.06,
        transparent: true,
        opacity: 0.7,
      }),
    );
    this.scene.add(this.rain);
    this.effects = [];
  }
  burst(x, y, z, color = "#efd28b", count = 14) {
    const r = this.rand,
      geo = new T.BufferGeometry(),
      p = new Float32Array(count * 3),
      v = [];
    for (let i = 0; i < count; i++) {
      p.set([x, y, z], i * 3);
      v.push([(r() - 0.5) * 3, 1 + r() * 3, (r() - 0.5) * 3]);
    }
    geo.setAttribute("position", new T.BufferAttribute(p, 3));
    const m = new T.Points(
      geo,
      new T.PointsMaterial({ color, size: 0.14, transparent: true }),
    );
    this.scene.add(m);
    this.effects.push({ m, v, life: 1 });
  }
  update(dt, t, state, px, pz) {
    this.water.material.uniforms.time.value = t;
    this.rain.visible = state.weather === "pluie";
    if (this.rain.visible) {
      this.rain.position.set(px, 0, pz);
      const a = this.rain.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        a.setY(i, (a.getY(i) - dt * 16 + 25) % 25);
        a.setX(i, ((a.getX(i) - dt * 2 + 30) % 60) - 30);
      }
      a.needsUpdate = true;
    }
    this.motes.position.x = Math.sin(t * 0.1) * 1.2;
    this.motes.position.y = Math.sin(t * 0.4) * 0.2;
    this.motes.material.opacity =
      state.time > 18 || state.time < 6 ? 0.8 : 0.35;
    for (const n of this.npcs) {
      const motion = stepNpc(n, dt, { x: px, z: pz }, this.collides.bind(this));
      n.mesh.position.set(n.x, height(n.x, n.z), n.z);
      if (motion.facing !== undefined) n.mesh.rotation.y = motion.facing;
      n.mesh.userData.animate(
        motion.moving ? n.walkCycle : t * 0.15,
        motion.moving,
      );
    }
    for (const w of this.wild) {
      w.cooldown = Math.max(0, w.cooldown - dt);
      const nocturnal = w.id === "lumignon",
        rainOnly = w.id === "coralys";
      w.mesh.visible =
        w.cooldown === 0 &&
        (!nocturnal || state.time >= 17 || state.time < 6) &&
        (!rainOnly || state.weather === "pluie") &&
        !(w.id === "gardien" && state.flags.guardian);
      if (!w.mesh.visible) continue;
      const dist = Math.hypot(px - w.homeX, pz - w.homeZ),
        timid = species(w.id).temper === "timide",
        move = w.id !== "gardien";
      const flee = timid && dist < 4 ? 2 : 0;
      w.x =
        w.homeX +
        (move ? Math.sin(t * 0.28 + w.phase) * 1.5 : 0) +
        (dist > 0 ? ((w.homeX - px) / dist) * flee : 0);
      w.z = w.homeZ + (move ? Math.cos(t * 0.22 + w.phase) : 0);
      w.mesh.position.set(w.x, height(w.x, w.z), w.z);
      w.mesh.rotation.y =
        dist < 5
          ? Math.atan2(px - w.x, pz - w.z)
          : Math.cos(t * 0.28 + w.phase) * 1.7;
      w.mesh.userData.animate(t + w.phase, move);
    }
    for (const e of [...this.effects]) {
      e.life -= dt;
      const a = e.m.geometry.attributes.position;
      e.v.forEach((v, i) => {
        v[1] -= dt * 5;
        a.setXYZ(
          i,
          a.getX(i) + v[0] * dt,
          a.getY(i) + v[1] * dt,
          a.getZ(i) + v[2] * dt,
        );
      });
      a.needsUpdate = true;
      e.m.material.opacity = Math.max(0, e.life);
      if (e.life <= 0) {
        this.scene.remove(e.m);
        e.m.geometry.dispose();
        e.m.material.dispose();
        this.effects.splice(this.effects.indexOf(e), 1);
      }
    }
    const radius =
      state.settings.quality === "low"
        ? 55
        : state.settings.quality === "medium"
          ? 70
          : 95;
    for (const c of this.chunks)
      c.g.visible = Math.hypot(c.x - px, c.z - pz) < radius;
  }
  sync(state) {
    for (const r of this.resources)
      r.mesh.visible = !(state.depleted[r.id] > state.day);
    for (const p of state.plots) {
      const key = `${p.stage}-${p.water > 0.1}-${p.fertilized}`;
      const old = this.plotMeshes.get(p.id);
      if (old?.key === key) continue;
      if (old) {
        old.g.traverse((o) => {
          if (o.isInstancedMesh) o.dispose();
        });
        this.scene.remove(old.g);
      }
      const g = new T.Group(),
        f = new Factory(g, true),
        wet = p.water > 0.1;
      f.part("box", wet ? "#665744" : "#8f7958", 0, 0.015, 0, 1.7, 0.06, 1.7);
      for (let i = 0; i < 4; i++)
        f.part(
          "box",
          wet ? "#776249" : "#a08a62",
          -0.6 + i * 0.4,
          0.055,
          0,
          0.1,
          0.06,
          1.5,
        );
      if (p.stage > 0)
        for (let i = 0; i < 4; i++) {
          const x = ((i % 2) - 0.5) * 0.7,
            z = (Math.floor(i / 2) - 0.5) * 0.7,
            size = p.stage * 0.23;
          f.part("cone", "#709050", x, 0.1 + size / 2, z, 0.035, size, 0.035);
          for (const s of [-1, 1])
            f.part(
              "sphere",
              "#96a763",
              x + s * 0.12,
              0.1 + size * 0.6,
              z,
              0.22 * size,
              0.07,
              0.38 * size,
              0,
              s * 0.5,
              s * 0.3,
            );
          if (p.stage >= 3)
            f.part(
              "sphere",
              p.stage === 4 ? "#c88c77" : "#acc277",
              x,
              0.15 + size,
              z,
              0.2,
              0.23,
              0.18,
            );
          if (p.stage === 4)
            f.part("sphere", "#edd4ac", x, 0.37 + size, z, 0.085, 0.065, 0.085);
        }
      f.flush();
      g.position.set(p.x, height(p.x, p.z) + 0.05, p.z);
      this.scene.add(g);
      this.plotMeshes.set(p.id, { key, g });
    }
    while (this.buildMeshes.length < state.buildings.length) {
      const b = state.buildings[this.buildMeshes.length],
        g = new T.Group(),
        f = new Factory(g, true);
      furnishing(f, b.type, 0, 0, 0, b.r);
      f.flush();
      g.position.set(b.x, height(b.x, b.z), b.z);
      this.scene.add(g);
      this.buildMeshes.push(g);
    }
  }
}

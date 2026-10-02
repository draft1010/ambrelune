import * as T from "../../vendor/three.module.js";
export { T };
export function random(seed) {
  let n = seed >>> 0;
  return () => {
    n = (1664525 * n + 1013904223) >>> 0;
    return n / 4294967296;
  };
}
const rng = random(831);
const geometries = {
  box: new T.BoxGeometry(1, 1, 1),
  sphere: new T.IcosahedronGeometry(1, 1),
  smooth: new T.SphereGeometry(1, 12, 8),
  cone: new T.ConeGeometry(1, 1, 7),
  cylinder: new T.CylinderGeometry(1, 1, 1, 10),
  taper: new T.CylinderGeometry(0.7, 1, 1, 8),
  plane: new T.PlaneGeometry(1, 1),
  torus: new T.TorusGeometry(1, 0.1, 5, 20),
};
const gableShape = new T.Shape();
gableShape.moveTo(-0.5, 0);
gableShape.lineTo(0.5, 0);
gableShape.lineTo(0, 1);
gableShape.closePath();
geometries.gable = new T.ExtrudeGeometry(gableShape, {
  depth: 1,
  bevelEnabled: false,
});
geometries.gable.translate(0, 0, -0.5);
const materials = new Map();
export const windUniform = { value: 0 };
export const foliageFocus = { value: new T.Vector3() };
export const foliageCamera = { value: new T.Vector3() };
export const foliageCutaway = { value: 0 };
function texture(kind) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.fillStyle = "#ddd2bd";
  g.fillRect(0, 0, 128, 128);
  const grain = random(1937);
  for (let i = 0; i < 2100; i++) {
    g.fillStyle = grain() > 0.5 ? "#faf0d839" : "#342d3435";
    g.fillRect(
      Math.floor(grain() * 64) * 2,
      Math.floor(grain() * 64) * 2,
      2 + Math.floor(grain() * 3) * 2,
      2,
    );
  }
  if (kind === "wood" || kind === "roof" || kind === "stone") {
    const rh = kind === "roof" ? 16 : kind === "stone" ? 32 : 16;
    for (let y = 0; y < 128; y += rh)
      for (let x = -32; x < 128; x += 32) {
        const xx = x + ((y / rh) % 2) * 16;
        g.fillStyle = ["#a8a399", "#bcb5a8", "#ddd3ba", "#c8bcac"][
          Math.floor(grain() * 4)
        ];
        g.fillRect(xx + 1, y + 1, 30, rh - 2);
        g.fillStyle = "#f8e3b754";
        g.fillRect(xx + 2, y + 2, 28, 2);
        g.fillStyle = "#30293f40";
        g.fillRect(xx + 2, y + rh - 3, 30, 2);
        if (kind === "wood") {
          g.fillStyle = "#53403280";
          g.fillRect(xx + 6, y + 5, 13, 1);
          g.fillRect(xx + 15, y + 9, 10, 1);
        }
      }
  }
  if (kind === "leaf") {
    for (let i = 0; i < 650; i++) {
      const x = Math.floor(grain() * 32) * 4,
        y = Math.floor(grain() * 32) * 4;
      g.fillStyle = ["#82946b", "#a0af87", "#bac89f", "#d2dab2"][
        Math.floor(grain() * 4)
      ];
      g.fillRect(x, y, 4, 4);
      g.fillRect(x - 2, y + 2, 6, 2);
    }
  }
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping;
  t.magFilter = T.NearestFilter;
  t.anisotropy = 4;
  return t;
}
const textures = {};
export function mat(color, kind = "", glow = 0) {
  if (
    !kind &&
    [
      "#d891a6",
      "#edbbbc",
      "#426e59",
      "#4e7b61",
      "#789456",
      "#99a665",
      "#b2b879",
      "#9bad72",
      "#829762",
      "#7c975f",
    ].includes(color)
  )
    kind = "leaf";
  const key = `${color}/${kind}/${glow}`;
  if (!materials.has(key)) {
    if (kind && !textures[kind]) textures[kind] = texture(kind);
    const m = new T.MeshStandardMaterial({
      color,
      map: kind && kind !== "leaf" ? textures[kind] : null,
      roughness: 0.88,
      flatShading: !kind,
      emissive: glow ? color : 0x000000,
      emissiveIntensity: glow,
    });
    if (
      [
        "#d891a6",
        "#edbbbc",
        "#426e59",
        "#4e7b61",
        "#789456",
        "#99a665",
        "#b2b879",
        "#9bad72",
        "#829762",
        "#7c975f",
      ].includes(color)
    ) {
      m.onBeforeCompile = (shader) => {
        shader.uniforms.windTime = windUniform;
        shader.uniforms.gardenFocus = foliageFocus;
        shader.uniforms.gardenCamera = foliageCamera;
        shader.uniforms.gardenCutaway = foliageCutaway;
        shader.vertexShader =
          "uniform float windTime;\nvarying vec3 gardenWorld;\n" +
          shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>\nvec3 wp=position;\n#ifdef USE_INSTANCING\nwp=(instanceMatrix*vec4(position,1.0)).xyz;\n#endif\ntransformed.x+=sin(wp.x*.7+wp.z*.6+windTime*1.5)*.024*(position.y+1.0);\nvec4 gardenVertex=vec4(transformed,1.);\n#ifdef USE_INSTANCING\ngardenVertex=instanceMatrix*gardenVertex;\n#endif\ngardenWorld=(modelMatrix*gardenVertex).xyz;`,
        );
        shader.fragmentShader =
          "varying vec3 gardenWorld;\nuniform vec3 gardenFocus;\nuniform vec3 gardenCamera;\nuniform float gardenCutaway;\n" +
          shader.fragmentShader;
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <color_fragment>",
          `#include <color_fragment>
          float leafGrain=fract(sin(dot(floor(gardenWorld*11.),vec3(127.1,311.7,74.7)))*43758.5453);
          diffuseColor.rgb*=leafGrain<.16?.87:leafGrain>.86?1.12:1.;`,
        );
        shader.fragmentShader = shader.fragmentShader.replace(
          "#include <dithering_fragment>",
          `#include <dithering_fragment>
          vec3 ray=gardenCamera-gardenFocus;
          float along=dot(gardenWorld-gardenFocus,ray)/max(dot(ray,ray),.01);
          float radius=length(gardenWorld-(gardenFocus+ray*along));
          if(gardenCutaway>.5 && along>.02 && along<.7 && radius<1.8){
            float keep=smoothstep(.6,1.8,radius);
            float dither=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
            if(dither>keep)discard;
          }`,
        );
      };
      m.customProgramCacheKey = () => "foliage-wind-cutaway-v2";
    }
    materials.set(key, m);
  }
  return materials.get(key);
}
export class Factory {
  constructor(root, batch = false) {
    this.root = root;
    this.batch = batch;
    this.parts = new Map();
    this.dummy = new T.Object3D();
  }
  part(
    type,
    color,
    x,
    y,
    z,
    sx = 1,
    sy = 1,
    sz = 1,
    rx = 0,
    ry = 0,
    rz = 0,
    kind = "",
    glow = 0,
  ) {
    const g = geometries[type],
      m = mat(color, kind, glow);
    if (this.batch) {
      const key = type + ":" + m.uuid;
      if (!this.parts.has(key)) this.parts.set(key, { g, m, matrices: [] });
      this.dummy.position.set(x, y, z);
      this.dummy.scale.set(sx, sy, sz);
      this.dummy.rotation.set(rx, ry, rz);
      this.dummy.updateMatrix();
      this.parts.get(key).matrices.push(this.dummy.matrix.clone());
      return this.dummy;
    }
    const mesh = new T.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = type !== "plane";
    mesh.receiveShadow = true;
    this.root.add(mesh);
    return mesh;
  }
  flush() {
    for (const { g, m, matrices } of this.parts.values()) {
      const mesh = new T.InstancedMesh(g, m, matrices.length);
      matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.computeBoundingSphere();
      this.root.add(mesh);
    }
    this.parts.clear();
  }
}
export function house(f, x, y, z, w = 5, d = 5, h = 4, variant = 0) {
  const roof = ["#80536a", "#3c6172", "#aa6749", "#42556d"][variant % 4],
    wall = ["#eee0bc", "#e0ceab", "#dfc3a3", "#efe3c9"][variant % 4],
    wood = "#705941";
  f.part(
    "box",
    "#a89c7f",
    x,
    y + 0.25,
    z,
    w + 0.4,
    0.5,
    d + 0.4,
    0,
    0,
    0,
    "stone",
  );
  f.part("box", wall, x, y + h / 2, z, w, h, d, 0, 0, 0, "plaster");
  for (const dx of [-w / 2, w / 2])
    for (const dz of [-d / 2, d / 2])
      f.part(
        "box",
        wood,
        x + dx,
        y + h / 2,
        z + dz,
        0.16,
        h,
        0.16,
        0,
        0,
        0,
        "wood",
      );
  for (const yy of [0.65, h * 0.63, h])
    f.part(
      "box",
      wood,
      x,
      y + yy,
      z + d / 2 + 0.04,
      w,
      0.12,
      0.13,
      0,
      0,
      0,
      "wood",
    );
  // Two broad pitched planes and individually coursed tile strips.
  const rise = w * 0.43,
    slant = Math.sqrt((w / 2 + 0.35) ** 2 + rise ** 2),
    angle = Math.atan2(rise, w / 2 + 0.35);
  for (const s of [-1, 1]) {
    f.part(
      "box",
      roof,
      x + s * (w / 4 + 0.1),
      y + h + rise / 2,
      z,
      slant,
      0.18,
      d + 0.9,
      0,
      0,
      -s * angle,
      "roof",
    );
    const tileColors = [0.86, 1, 1.12].map((v) =>
      new T.Color(roof).multiplyScalar(v).getStyle(),
    );
    const cols = Math.ceil((d + 0.9) / 0.52),
      rows = 8;
    for (let row = 0; row < rows; row++)
      for (let col = 0; col < cols; col++) {
        const k = (row + 0.5) / rows;
        f.part(
          "box",
          tileColors[(col + row * 7) % 3],
          x + s * k * (w / 2 + 0.35),
          y + h + rise * (1 - k) + 0.1,
          z - (d + 0.9) / 2 + ((col + 0.5) * (d + 0.9)) / cols,
          slant / rows + 0.03,
          0.06,
          (d + 0.9) / cols - 0.015,
          0,
          0,
          -s * angle,
          "roof",
        );
      }
  }
  f.part(
    "box",
    wood,
    x,
    y + h + rise + 0.12,
    z,
    0.25,
    0.23,
    d + 1.02,
    0,
    0,
    0,
    "wood",
  );
  // Triangular gables filled by a cone with four sides, buried in the building.
  for (const zz of [-d / 2, d / 2]) {
    f.part("gable", wall, x, y + h, z + zz, w, rise, 0.12);
    f.part(
      "box",
      wood,
      x,
      y + h + rise * 0.45,
      z + zz + 0.08,
      0.12,
      rise * 0.9,
      0.16,
    );
    f.part("box", wood, x, y + h + 0.06, z + zz + 0.08, w, 0.14, 0.14);
  }
  const side = z + d / 2 + 0.12;
  f.part("box", wood, x, y + 1.1, side, 1.15, 2.2, 0.16, 0, 0, 0, "wood");
  f.part(
    "box",
    "#4c6761",
    x,
    y + 1.05,
    side + 0.1,
    0.87,
    1.96,
    0.08,
    0,
    0,
    0,
    "wood",
  );
  f.part("sphere", "#d9bb77", x + 0.3, y + 1, side + 0.17, 0.07, 0.07, 0.07);
  f.part(
    "box",
    "#c3b598",
    x,
    y + 0.1,
    side + 0.4,
    1.6,
    0.2,
    0.9,
    0,
    0,
    0,
    "stone",
  );
  for (const xx of [-w * 0.3, w * 0.3]) {
    for (const yy of h > 4.5 ? [1.65, 3.8] : [1.9]) {
      f.part("box", wood, x + xx, y + yy, side, 1.02, 1.3, 0.16);
      f.part(
        "box",
        "#e6c880",
        x + xx,
        y + yy,
        side + 0.09,
        0.76,
        1.06,
        0.035,
        0,
        0,
        0,
        "",
        0.25,
      );
      f.part("box", wood, x + xx, y + yy, side + 0.14, 0.05, 1.1, 0.07);
      f.part("box", wood, x + xx, y + yy, side + 0.14, 0.8, 0.06, 0.07);
      for (const s of [-1, 1])
        f.part(
          "box",
          "#658478",
          x + xx + s * 0.62,
          y + yy,
          side,
          0.22,
          1.25,
          0.14,
          0,
          s * 0.12,
          0,
          "wood",
        );
      f.part(
        "box",
        wood,
        x + xx,
        y + yy - 0.75,
        side + 0.18,
        1.3,
        0.27,
        0.48,
        0,
        0,
        0,
        "wood",
      );
      for (let j = 0; j < 5; j++) {
        f.part(
          "sphere",
          "#718750",
          x + xx - 0.5 + j * 0.25,
          y + yy - 0.57,
          side + 0.22,
          0.24,
          0.18,
          0.25,
        );
        f.part(
          "sphere",
          j % 2 ? "#e8bda0" : "#c88882",
          x + xx - 0.5 + j * 0.25,
          y + yy - 0.41,
          side + 0.25,
          0.11,
          0.1,
          0.1,
        );
      }
    }
  }
  f.part(
    "box",
    "#c9b391",
    x + w * 0.26,
    y + h + rise * 0.75,
    z - d * 0.25,
    0.62,
    1.5,
    0.65,
    0,
    0,
    0,
    "stone",
  );
  f.part(
    "box",
    "#77614c",
    x + w * 0.26,
    y + h + rise * 0.75 + 0.8,
    z - d * 0.25,
    0.8,
    0.16,
    0.8,
  );
  // Stone skirts, corner vines and rain barrel.
  for (let j = 0; j < 4; j++)
    f.part(
      "sphere",
      "#708951",
      x - w / 2 - 0.08,
      y + 0.7 + j * 0.45,
      side - 0.25,
      0.3,
      0.4,
      0.22,
    );
  f.part(
    "cylinder",
    "#846d4c",
    x + w / 2 + 0.55,
    y + 0.53,
    z + d * 0.3,
    0.45,
    1.06,
    0.45,
    0,
    0,
    0,
    "wood",
  );
  for (const yy of [0.2, 0.8])
    f.part(
      "torus",
      "#554f40",
      x + w / 2 + 0.55,
      y + yy,
      z + d * 0.3,
      0.46,
      0.46,
      0.46,
      Math.PI / 2,
    );
}
export function tree(f, x, y, z, size = 1, variant = 0) {
  const wood = "#74634b";
  const pine = variant % 3 === 0,
    leaf =
      variant === 4
        ? "#d891a6"
        : pine
          ? "#426e59"
          : variant % 3 === 1
            ? "#789456"
            : "#99a665";
  f.part(
    "taper",
    wood,
    x,
    y + 2.3 * size,
    z,
    0.3 * size,
    4.6 * size,
    0.3 * size,
    0,
    0,
    0.04,
    "wood",
  );
  if (pine) {
    for (let j = 0; j < 5; j++) {
      const r = (2.1 - j * 0.3) * size;
      f.part(
        "cone",
        j % 2 ? "#4e7b61" : leaf,
        x,
        y + (3 + j * 0.73) * size,
        z,
        r,
        2.4 * size,
        r,
        0,
        j * 0.7,
        0,
      );
    }
  } else {
    for (let j = 0; j < 15; j++) {
      const a = j * 2.4,
        dx = Math.sin(a) * (j ? 1.5 : 0) * size,
        dz = Math.cos(a) * (j ? 1.15 : 0) * size,
        yy = y + (4.5 + Math.sin(j * 4) * 0.65) * size;
      f.part(
        "taper",
        wood,
        x + dx * 0.5,
        y + 3.4 * size,
        z + dz * 0.5,
        0.13 * size,
        2.2 * size,
        0.13 * size,
        0.4 * Math.cos(a),
        0,
        -0.5 * Math.sin(a),
      );
      f.part(
        "sphere",
        variant === 4
          ? j % 3
            ? "#d891a6"
            : "#edbbbc"
          : j % 3 === 0
            ? "#b2b879"
            : leaf,
        x + dx,
        yy,
        z + dz,
        0.94 * size,
        0.76 * size,
        0.92 * size,
        0,
        a,
        0.2,
      );
      f.part(
        "sphere",
        leaf,
        x + dx * 0.85,
        yy + 0.65 * size,
        z + dz * 0.85,
        0.94 * size,
        0.62 * size,
        0.87 * size,
      );
    }
  }
  f.part("sphere", "#789157", x, y + 0.22, z, 0.64 * size, 0.23, 0.6 * size);
}
export function flower(f, x, y, z, color = "#d5b2a4", size = 1) {
  f.part(
    "cone",
    "#7c975f",
    x,
    y + 0.18 * size,
    z,
    0.06 * size,
    0.4 * size,
    0.07 * size,
    0,
    0,
    0.2,
  );
  f.part(
    "sphere",
    color,
    x,
    y + 0.4 * size,
    z,
    0.11 * size,
    0.08 * size,
    0.11 * size,
  );
}
export function lamp(f, x, y, z) {
  f.part("cylinder", "#506559", x, y + 1.6, z, 0.065, 3.2, 0.065);
  f.part("box", "#506559", x, y + 3.1, z, 0.45, 0.1, 0.45);
  f.part("box", "#ffe0a2", x, y + 2.83, z, 0.28, 0.46, 0.28, 0, 0, 0, "", 0.75);
  f.part("cone", "#506559", x, y + 3.23, z, 0.37, 0.25, 0.37, 0, Math.PI / 4);
  f.part("box", "#506559", x, y + 0.1, z, 0.36, 0.2, 0.36);
}
export function furnishing(f, type, x, y, z, r = 0) {
  if (type === "lamp") return lamp(f, x, y, z);
  if (type === "fence") {
    for (const d of [-0.8, 0.8])
      f.part(
        "box",
        "#947c56",
        x + Math.cos(r) * d,
        y + 0.65,
        z - Math.sin(r) * d,
        0.13,
        1.3,
        0.13,
        0,
        0,
        0,
        "wood",
      );
    for (const yy of [0.4, 0.95])
      f.part("box", "#b7a177", x, y + yy, z, 1.9, 0.12, 0.12, 0, r, 0, "wood");
  } else if (type === "bed") {
    f.part("box", "#a88c62", x, y + 0.25, z, 1.8, 0.5, 1, 0, r, 0, "wood");
    f.part("box", "#645540", x, y + 0.51, z, 1.6, 0.04, 0.8, 0, r);
    for (let i = 0; i < 12; i++)
      flower(
        f,
        x + Math.sin(i * 5) * 0.65,
        y + 0.5,
        z + Math.cos(i * 3) * 0.32,
        i % 2 ? "#edc286" : "#d9a5a0",
        1.5,
      );
  } else {
    const yy = type === "workbench" ? 1.25 : 0.6;
    f.part("box", "#b39a6c", x, y + yy, z, 1.9, 0.18, 0.8, 0, r, 0, "wood");
    for (const dx of [-0.7, 0.7])
      for (const dz of [-0.26, 0.26])
        f.part(
          "box",
          "#766344",
          x + dx * Math.cos(r) + dz * Math.sin(r),
          y + yy / 2,
          z - dx * Math.sin(r) + dz * Math.cos(r),
          0.13,
          yy,
          0.13,
        );
    if (type === "bench")
      f.part(
        "box",
        "#ab936b",
        x - Math.sin(r) * 0.33,
        y + 1.05,
        z - Math.cos(r) * 0.33,
        1.9,
        0.42,
        0.1,
        0,
        r,
        0,
        "wood",
      );
    if (type === "workbench") {
      f.part("box", "#6d6f5a", x + 0.5, y + 1.46, z, 0.4, 0.24, 0.3);
      f.part(
        "cylinder",
        "#bea26b",
        x - 0.4,
        y + 1.6,
        z,
        0.12,
        0.6,
        0.12,
        0,
        0,
        Math.PI / 2,
      );
    }
  }
}
export function human(color = "#698895", skin = "#ccaa83", hat = true) {
  const g = new T.Group(),
    f = new Factory(g);
  f.part("smooth", skin, 0, 1.52, 0, 0.27, 0.3, 0.25);
  f.part("smooth", "#685044", 0, 1.67, -0.055, 0.28, 0.23, 0.25);
  f.part("taper", color, 0, 0.95, 0, 0.29, 0.75, 0.23);
  f.part("box", "#d9c899", 0, 0.83, 0.21, 0.48, 0.25, 0.045);
  const arms = [];
  for (const s of [-1, 1]) {
    const a = new T.Group();
    a.position.set(s * 0.33, 1.17, 0);
    g.add(a);
    const af = new Factory(a);
    af.part("taper", color, 0, -0.16, 0, 0.095, 0.39, 0.095);
    af.part("smooth", skin, 0, -0.4, 0, 0.09, 0.12, 0.1);
    arms.push(a);
  }
  const legs = [];
  for (const s of [-1, 1]) {
    const l = new T.Group();
    l.position.set(s * 0.13, 0.63, 0);
    g.add(l);
    const lf = new Factory(l);
    lf.part("cylinder", "#544f48", 0, -0.23, 0, 0.105, 0.47, 0.1);
    lf.part("box", "#6c5845", 0, -0.5, 0.08, 0.23, 0.18, 0.38);
    legs.push(l);
  }
  for (const s of [-1, 1])
    f.part("smooth", "#2c3d36", s * 0.105, 1.53, 0.224, 0.029, 0.038, 0.018);
  if (hat) {
    f.part("cylinder", "#d8bb7e", 0, 1.76, 0, 0.47, 0.08, 0.4);
    f.part("taper", "#dac18b", 0, 1.89, 0, 0.29, 0.25, 0.27);
    f.part("cylinder", "#67826b", 0, 1.8, 0, 0.3, 0.07, 0.28);
  }
  const backpack = f.part(
    "box",
    "#9b7658",
    0,
    1.06,
    -0.26,
    0.42,
    0.51,
    0.22,
    0,
    0,
    0,
    "wood",
  );
  g.userData = {
    legs,
    arms,
    backpack,
    animate(t, moving) {
      for (let i = 0; i < 2; i++) {
        legs[i].rotation.x = moving ? Math.sin(t * 10 + i * Math.PI) * 0.55 : 0;
        arms[i].rotation.x = moving
          ? -Math.sin(t * 10 + i * Math.PI) * 0.42
          : Math.sin(t * 1.5) * 0.03;
      }
      g.position.y += moving ? Math.abs(Math.sin(t * 10)) * 0.045 : 0;
    },
  };
  return g;
}
export function creature(s, scale = 1) {
  const g = new T.Group(),
    f = new Factory(g),
    c = s.color,
    a = s.accent;
  const body = f.part("smooth", c, 0, 0.63, 0, 0.54, 0.49, 0.67);
  f.part("smooth", a, 0, 0.49, 0.37, 0.37, 0.29, 0.34);
  f.part("smooth", c, 0, 0.99, 0.3, 0.46, 0.39, 0.4);
  for (const dx of [-0.19, 0.19]) {
    f.part("smooth", "#213e37", dx, 1.05, 0.638, 0.065, 0.08, 0.035);
    f.part("smooth", "#fff7dc", dx + 0.014, 1.08, 0.66, 0.022, 0.025, 0.012);
    f.part("smooth", a, dx * 1.5, 0.91, 0.6, 0.07, 0.035, 0.025);
  }
  const limbs = [];
  for (const x of [-0.36, 0.36])
    for (const z of [-0.34, 0.37])
      limbs.push(f.part("smooth", c, x, 0.2, z, 0.16, 0.2, 0.24));
  const ears = [];
  if (["leaf", "guardian"].includes(s.shape)) {
    for (const q of [-1, 1]) {
      ears.push(
        f.part(
          "sphere",
          "#648858",
          q * 0.3,
          1.52,
          0.2,
          0.18,
          0.62,
          0.07,
          0,
          0,
          -q * 0.45,
        ),
      );
      f.part(
        "sphere",
        a,
        q * 0.31,
        1.54,
        0.245,
        0.04,
        0.44,
        0.02,
        0,
        0,
        -q * 0.45,
      );
    }
    for (let i = 0; i < 5; i++)
      f.part(
        "sphere",
        "#8d9e63",
        Math.sin(i * 2) * 0.32,
        1,
        -0.2 + Math.cos(i * 2) * 0.25,
        0.24,
        0.12,
        0.4,
        0.35,
        i,
        0,
      );
  } else if (s.shape === "fin") {
    for (const q of [-1, 1])
      ears.push(
        f.part(
          "sphere",
          a,
          q * 0.48,
          1.13,
          0.18,
          0.28,
          0.49,
          0.08,
          0,
          0,
          -q * 0.65,
        ),
      );
    f.part("torus", a, 0, 1.38, 0.3, 0.27, 0.27, 0.27, Math.PI / 2);
    f.part("sphere", c, 0, 0.58, -0.9, 0.35, 0.09, 0.4, 0.1, 0, 0);
  } else if (s.shape === "ember") {
    f.part("sphere", "#a66c51", 0, 0.79, -0.22, 0.58, 0.38, 0.59);
    for (let j = 0; j < 4; j++)
      f.part(
        "cone",
        a,
        Math.sin(j * 4) * 0.25,
        1.11,
        -0.3 + Math.cos(j * 4) * 0.25,
        0.13,
        0.35,
        0.14,
        0,
        j,
        0.12,
      );
    for (const q of [-1, 1])
      ears.push(
        f.part(
          "cone",
          c,
          q * 0.31,
          1.42,
          0.22,
          0.18,
          0.45,
          0.15,
          0,
          0,
          -q * 0.4,
        ),
      );
  } else if (s.shape === "shell") {
    f.part("sphere", "#718761", 0, 0.88, -0.18, 0.68, 0.52, 0.68);
    for (let i = 0; i < 6; i++)
      f.part(
        "sphere",
        "#a7b484",
        Math.sin(i * 3) * 0.4,
        1.22,
        -0.2 + Math.cos(i * 3) * 0.4,
        0.18,
        0.14,
        0.2,
      );
  } else if (s.shape === "wing") {
    for (const q of [-1, 1])
      for (let j = 0; j < 4; j++)
        ears.push(
          f.part(
            "sphere",
            a,
            q * (0.45 + j * 0.1),
            0.83,
            -0.05 - j * 0.13,
            0.46,
            0.09,
            0.17,
            0,
            q * 0.4,
            -q * 0.45,
          ),
        );
    f.part("cone", a, 0, 1.04, 0.75, 0.08, 0.23, 0.08, Math.PI / 2);
  } else {
    f.part("sphere", a, 0, 1.52, 0.21, 0.19, 0.3, 0.18);
    f.part("torus", a, 0, 1.1, 0, 0.73, 0.73, 0.73, Math.PI / 2, 0, 0, "", 0.5);
  }
  if (s.shape === "guardian") {
    g.scale.setScalar(2.5);
    f.part("torus", "#ddbb74", 0, 1.35, 0.28, 0.49, 0.49, 0.49, Math.PI / 2);
  } else g.scale.setScalar(scale);
  g.userData = {
    limbs,
    ears,
    animate(t, moving) {
      body.scale.y = 0.49 * (1 + Math.sin(t * 2.2) * 0.025);
      limbs.forEach((l, i) => {
        l.rotation.x = moving ? Math.sin(t * 9 + i * Math.PI) * 0.4 : 0;
      });
      ears.forEach((e, i) => {
        e.rotation.x = Math.sin(t * 2.4 + i) * 0.09;
      });
    },
  };
  return g;
}

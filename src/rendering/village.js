import { T, random, house, flower, furnishing } from "./art.js";

export function groundMaterial() {
  const m = new T.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  m.onBeforeCompile = (shader) => {
    shader.vertexShader =
      "varying vec3 meadowPosition;\n" + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nmeadowPosition=position;",
    );
    shader.fragmentShader =
      `varying vec3 meadowPosition;
      float meadowHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      ` + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 cell=floor(meadowPosition.xz*12.);
      float fleck=meadowHash(cell);
      float meadowPatch=sin(meadowPosition.x*.58+sin(meadowPosition.z*.44))*cos(meadowPosition.z*.63);
      float grain=1.+meadowPatch*.12;
      grain*=fleck>.93?1.27:fleck<.16?.72:1.;
      diffuseColor.rgb*=grain;
      if(fleck>.987) diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.65,.58,.31),.38);
    `,
    );
  };
  return m;
}

export function lamplightPools(scene, factory) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 64;
  const ctx = canvas.getContext("2d"),
    gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,180,76,.65)");
  gradient.addColorStop(0.4, "rgba(245,144,48,.30)");
  gradient.addColorStop(1, "rgba(230,111,31,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new T.CanvasTexture(canvas);
  const material = new T.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    blending: T.AdditiveBlending,
    opacity: 0,
  });
  const geometry = new T.PlaneGeometry(5.4, 5.4);
  geometry.rotateX(-Math.PI / 2);
  // The light pane is shared by each lamp, so positions are collected from its batch.
  for (const part of factory.parts.values()) {
    if (part.m.emissiveIntensity !== 0.75) continue;
    for (const matrix of part.matrices) {
      const p = new T.Vector3().setFromMatrixPosition(matrix);
      const pool = new T.Mesh(geometry, material);
      pool.position.set(p.x, p.y - 2.83 + 0.065, p.z);
      scene.add(pool);
    }
  }
  return material;
}

// Original village props, generated locally and instanced with the rest of the town.
export function villageDetails(f, world) {
  const r = random(5194);

  const ground = world.ground.geometry;
  function yAt(x, z) {
    const col = Math.max(0, Math.min(180, Math.round(((x + 75) / 150) * 180)));
    const row = Math.max(0, Math.min(180, Math.round(((z + 75) / 150) * 180)));
    return ground.attributes.position.getY(row * 181 + col);
  }
  function pot(x, z, color = "#ab654e", scale = 1) {
    const y = yAt(x, z);
    f.part(
      "taper",
      color,
      x,
      y + 0.28 * scale,
      z,
      0.32 * scale,
      0.56 * scale,
      0.32 * scale,
      0,
      0,
      Math.PI,
    );
    f.part(
      "torus",
      "#cf9267",
      x,
      y + 0.54 * scale,
      z,
      0.31 * scale,
      0.31 * scale,
      0.31 * scale,
      Math.PI / 2,
    );
    for (let i = 0; i < 6; i++)
      flower(
        f,
        x + (r() - 0.5) * 0.5 * scale,
        y + 0.48 * scale,
        z + (r() - 0.5) * 0.5 * scale,
        ["#d77c9b", "#ebc678", "#9f9bd1"][i % 3],
        scale * 1.4,
      );
  }
  function crate(x, z) {
    const y = yAt(x, z);
    f.part("box", "#aa774d", x, y + 0.36, z, 0.85, 0.7, 0.8, 0, 0, 0, "wood");
    for (const xx of [-0.37, 0.37])
      f.part("box", "#493d42", x + xx, y + 0.38, z + 0.41, 0.06, 0.68, 0.055);
    for (let i = 0; i < 7; i++)
      f.part(
        "sphere",
        i % 2 ? "#d58a4c" : "#a4ad57",
        x + (r() - 0.5) * 0.65,
        y + 0.79,
        z + (r() - 0.5) * 0.6,
        0.12,
        0.13,
        0.12,
      );
  }
  // Small shop fronts bring the architecture up to the square without blocking its exits.
  for (const [x, z, w, d, v] of [
    [-19, -10, 5.3, 4.6, 0],
    [2, 0, 5.4, 5, 2],
    [-20, 17, 4.4, 4.3, 3],
  ]) {
    const y = yAt(x, z);
    house(f, x, y, z, w, d, 3.1, v);
    world.collider(x, z, 0, "rect", w + 0.6, d + 0.6);
    const front = z + d / 2 + 0.65;
    for (let i = 0; i < 9; i++) {
      f.part(
        "box",
        i % 2 ? "#edd5a6" : v === 2 ? "#b75c56" : "#426c78",
        x - w / 2 + (i * w) / 9,
        y + 2.58,
        front,
        w / 9,
        0.13,
        1.6,
        0.16,
      );
      f.part(
        "box",
        i % 2 ? "#edd5a6" : v === 2 ? "#b75c56" : "#426c78",
        x - w / 2 + (i * w) / 9,
        y + 2.36,
        front + 0.78,
        w / 9,
        0.36,
        0.08,
      );
    }
    for (const dx of [-w / 2, w / 2])
      f.part("box", "#63483f", x + dx, y + 1.25, front + 0.7, 0.08, 2.5, 0.08);
    crate(x - w / 2 - 0.9, front);
    pot(x + w / 2 + 0.75, front);
    // Hanging sign, chalk board and doorstep lantern.
    f.part(
      "box",
      "#57404b",
      x + w * 0.32,
      y + 2.6,
      front + 0.3,
      0.08,
      0.7,
      0.08,
    );
    f.part(
      "box",
      "#b58e5c",
      x + w * 0.32,
      y + 2.25,
      front + 0.3,
      1.1,
      0.65,
      0.13,
    );
    f.part(
      "sphere",
      "#e0c17c",
      x + w * 0.32,
      y + 2.25,
      front + 0.39,
      0.17,
      0.21,
      0.04,
    );
    f.part(
      "box",
      "#77523f",
      x + 0.9,
      y + 0.5,
      front + 1.1,
      0.62,
      0.95,
      0.12,
      -0.12,
    );
    f.part(
      "box",
      "#30454b",
      x + 0.9,
      y + 0.55,
      front + 1.18,
      0.48,
      0.63,
      0.03,
      -0.12,
    );
    for (let j = 0; j < 3; j++)
      f.part(
        "box",
        "#d9c999",
        x + 0.9,
        y + 0.7 - j * 0.13,
        front + 1.21,
        0.3,
        0.025,
        0.02,
      );
  }
  // Café courtyard with round tables, stools, pottery and striped parasols.
  for (const [x, z] of [
    [-17, -4],
    [-19, 0],
    [-16, 3],
    [0, 4],
  ]) {
    const y = yAt(x, z);
    f.part("cylinder", "#654b42", x, y + 0.46, z, 0.08, 0.92, 0.08);
    f.part(
      "cylinder",
      "#ad8153",
      x,
      y + 0.92,
      z,
      0.7,
      0.1,
      0.7,
      0,
      0,
      0,
      "wood",
    );
    for (const dx of [-1, 1]) {
      f.part("box", "#785846", x + dx, y + 0.3, z, 0.4, 0.6, 0.4);
      f.part("box", "#c29462", x + dx, y + 0.62, z, 0.56, 0.09, 0.54);
    }
    f.part("cylinder", "#eee0bd", x + 0.25, y + 1.05, z, 0.09, 0.18, 0.09);
    f.part("cylinder", "#b95f69", x - 0.23, y + 1.02, z, 0.14, 0.1, 0.14);
    if (z === 0 || x === 0) {
      f.part("cylinder", "#735547", x, y + 1.9, z, 0.045, 3.8, 0.045);
      f.part("cone", "#cf9773", x, y + 3.6, z, 1.8, 0.65, 1.8);
      f.part("cone", "#e2c28e", x, y + 3.76, z, 1.2, 0.42, 1.2, 0, 0.4);
    }
    world.collider(x, z, 0.75);
  }
  // Bunting follows a gentle sag above the approach to the square.
  for (const z of [-7, 11]) {
    for (const x of [-15, -3])
      f.part("cylinder", "#66514c", x, yAt(x, z) + 2.6, z, 0.065, 5.2, 0.065);
    for (let i = 0; i < 25; i++) {
      const x = -15 + i * 0.5,
        y = yAt(-9, z) + 4.6 - Math.sin((i / 24) * Math.PI) * 0.7;
      f.part(
        "box",
        "#64544f",
        x,
        y,
        z,
        0.53,
        0.025,
        0.025,
        0,
        0,
        -Math.cos((i / 24) * Math.PI) * 0.14,
      );
      if (i % 2)
        f.part(
          "gable",
          ["#bf788c", "#dbb25f", "#659c95", "#9391b0"][i % 4],
          x,
          y - 0.04,
          z,
          0.38,
          0.53,
          0.025,
          0,
          0,
          Math.PI,
        );
    }
  }
  // Irregular hedgerows, flower banks and small stones soften the formal grid.
  for (const [cx, cz, len] of [
    [-16, -15, 5],
    [-1, -13, 5],
    [-22, 12, 5],
    [-33, 5, 7],
    [-38, -5, 5],
    [-4, 16, 5],
    [4, 9, 4],
  ]) {
    for (let i = 0; i < len * 3; i++) {
      const x = cx + i * 0.33 - len * 0.5,
        z = cz + (r() - 0.5) * 1.1,
        y = yAt(x, z);
      f.part(
        "sphere",
        ["#426e59", "#789456", "#99a665"][i % 3],
        x,
        y + 0.4,
        z,
        0.55,
        0.4 + r() * 0.25,
        0.52,
      );
      if (i % 2)
        for (let j = 0; j < 3; j++)
          flower(
            f,
            x + (r() - 0.5) * 0.5,
            y + 0.5,
            z + (r() - 0.5) * 0.5,
            ["#c47197", "#dbb568", "#c9c1dc"][i % 3],
            1.1,
          );
    }
    for (let i = 0; i < len; i++) {
      const x = cx + i - len * 0.5;
      f.part(
        "sphere",
        "#797b79",
        x,
        yAt(x, cz + 1) + 0.13,
        cz + 1,
        0.42,
        0.2,
        0.31,
      );
    }
  }
  for (const [x, z] of [
    [-13, -8],
    [-4, -8],
    [-24, 6],
    [-36, 6],
    [-1, 14],
    [-15, 12],
    [-31, -12],
  ]) {
    pot(x, z);
    crate(x + 0.8, z + 0.25);
  }
  // Ground-level patches are broken up with tiny blades and fallen petals.
  for (let i = 0; i < 4800; i++) {
    const x = -47 + r() * 54,
      z = -28 + r() * 49;
    if (world.collides(x, z, 0.1)) continue;
    const y = yAt(x, z);
    // Avoid every street, the fountain and the farm approach.
    if (
      Math.abs(x + 9) < 3 ||
      Math.abs(z - 8) < 2.4 ||
      Math.abs(z + 19) < 2.5 ||
      Math.hypot(x + 9, z) < 8
    )
      continue;
    const color = ["#536d40", "#84974c", "#a7aa62", "#536d40"][i % 4];
    f.part(
      "box",
      color,
      x,
      y + 0.045,
      z,
      0.045,
      0.07 + r() * 0.12,
      0.035,
      0,
      r() * 6,
      0.22,
    );
    if (i % 19 === 0)
      f.part("box", "#dbb39f", x + 0.1, y + 0.04, z, 0.1, 0.02, 0.075);
  }
}

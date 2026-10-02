import { T, random, house, flower, furnishing } from "./art.js";

/*
 * Sol Ambrelune — version "peinte / organique légère".
 *
 * Objectif visuel : garder exactement la direction artistique pastel/low-poly
 * du jeu, sans transformer le terrain en photo réaliste ni en tapis de bruit.
 *
 * Technique :
 * - on conserve les couleurs de sommets déjà générées dans world.js ;
 *   elles donnent naturellement le vert de la prairie et la teinte des chemins ;
 * - on superpose UNE seule texture procédurale 1024x1024 très douce ;
 * - pas de bump map, pas de normal map, pas de shader custom ;
 * - pas de texture 2048, donc nettement moins de mémoire et un seul échantillon
 *   de texture par pixel pour le sol ;
 * - les détails sont créés une seule fois au chargement puis réutilisés.
 */

const GROUND_WORLD_SIZE = 150;
const GROUND_WORLD_HALF = GROUND_WORLD_SIZE / 2;
const GROUND_DETAIL_SIZE = 1024;

let groundTextureCache = null;

function worldToCanvas(x, z, size) {
  return {
    x: ((x + GROUND_WORLD_HALF) / GROUND_WORLD_SIZE) * size,
    y: ((GROUND_WORLD_HALF - z) / GROUND_WORLD_SIZE) * size,
  };
}

function worldLengthToPixels(length, size) {
  return (length / GROUND_WORLD_SIZE) * size;
}

function makeCanvas(size) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function roadAt(x, z, margin = 0) {
  if (
    x < -2 + margin &&
    x > -48 - margin &&
    (
      Math.abs(z + 19) < 2.1 + margin ||
      Math.abs(z - 8) < 2.1 + margin ||
      Math.abs(z + 39) < 1.7 + margin
    )
  )
    return true;

  if (
    Math.abs(x + 9) < 2.3 + margin &&
    z > -52 - margin &&
    z < 24 + margin
  )
    return true;

  if (Math.hypot(x + 9, z) < 7.5 + margin)
    return true;

  if (
    z > 7 - margin &&
    z < 31 + margin &&
    Math.abs(x - (-9 - (z - 8) * 0.9)) < 1.45 + margin
  )
    return true;

  if (
    x > -9 - margin &&
    x < 52 + margin &&
    (
      Math.abs(z - 8) < 1.7 + margin ||
      Math.abs(z + 30) < 1.5 + margin
    )
  )
    return true;

  if (
    x > 27 - margin &&
    x < 52 + margin &&
    Math.abs(x - (38 + Math.sin(z * 0.1) * 5)) < 1.7 + margin
  )
    return true;

  return false;
}

function roadEdgeAt(x, z) {
  return roadAt(x, z, 0.78) && !roadAt(x, z, -0.12);
}

function paintSoftPatch(
  ctx,
  x,
  y,
  rx,
  ry,
  inner,
  outer = "rgba(0,0,0,0)",
  rotation = 0,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.scale(1, ry / Math.max(1, rx));

  const gradient = ctx.createRadialGradient(
    0,
    0,
    0,
    0,
    0,
    rx,
  );

  gradient.addColorStop(0, inner);
  gradient.addColorStop(1, outer);

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(0, 0, rx, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawWorldPolyline(
  ctx,
  points,
  size,
  widthWorld,
  color,
) {
  if (!points.length || widthWorld <= 0) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = worldLengthToPixels(widthWorld, size);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();

  for (let i = 0; i < points.length; i++) {
    const p = worldToCanvas(points[i][0], points[i][1], size);

    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  }

  ctx.stroke();
  ctx.restore();
}

function sampledLine(x1, z1, x2, z2, step = 1.1) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const length = Math.hypot(dx, dz);
  const count = Math.max(2, Math.ceil(length / step));
  const points = [];

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const x = x1 + dx * t;
    const z = z1 + dz * t;

    /* Petite ondulation volontaire : assez subtile pour rester "jeu cosy". */
    const wave =
      Math.sin(t * 17.0 + x1 * 0.21 + z1 * 0.17) * 0.12 +
      Math.sin(t * 31.0 + z1 * 0.13) * 0.045;

    const nx = length > 0 ? -dz / length : 0;
    const nz = length > 0 ? dx / length : 0;

    points.push([
      x + nx * wave,
      z + nz * wave,
    ]);
  }

  return points;
}

function drawRoadNetwork(ctx, size, widthExtra, color) {
  const lines = [
    [-48, -19, -2, -19, 4.2],
    [-48, 8, -2, 8, 4.2],
    [-48, -39, -2, -39, 3.4],
    [-9, -52, -9, 24, 4.6],
    [-9, 8, -30, 31, 2.9],
    [-9, 8, 52, 8, 3.4],
    [-9, -30, 52, -30, 3.0],
  ];

  for (const [x1, z1, x2, z2, width] of lines) {
    drawWorldPolyline(
      ctx,
      sampledLine(x1, z1, x2, z2),
      size,
      width + widthExtra,
      color,
    );
  }

  const curve = [];

  for (let z = -48; z <= 36; z += 0.9) {
    curve.push([
      38 + Math.sin(z * 0.1) * 5,
      z,
    ]);
  }

  drawWorldPolyline(
    ctx,
    curve,
    size,
    3.4 + widthExtra,
    color,
  );

  const center = worldToCanvas(-9, 0, size);
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(
    center.x,
    center.y,
    worldLengthToPixels(7.5 + widthExtra * 0.5, size),
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.restore();
}

function createGroundDetailCanvas() {
  const size = GROUND_DETAIL_SIZE;
  const canvas = makeCanvas(size);
  const ctx = canvas.getContext("2d", { alpha: false });
  const r = random(73491);

  /*
   * Presque blanc : la texture ne remplace pas les couleurs de world.js,
   * elle les nuance seulement par multiplication.
   */
  ctx.fillStyle = "#f7f6ef";
  ctx.fillRect(0, 0, size, size);

  /* Grandes nappes peintes : douces, mates, sans bruit photographique. */
  const meadowPatches = [
    "rgba(81,111,57,.060)",
    "rgba(122,139,76,.050)",
    "rgba(155,146,87,.040)",
    "rgba(67,94,54,.045)",
    "rgba(132,118,73,.030)",
  ];

  for (let i = 0; i < 105; i++) {
    const x = r() * size;
    const y = r() * size;
    const rx = 38 + r() * 145;
    const ry = 28 + r() * 115;

    paintSoftPatch(
      ctx,
      x,
      y,
      rx,
      ry,
      meadowPatches[Math.floor(r() * meadowPatches.length)],
      "rgba(255,255,255,0)",
      r() * Math.PI,
    );
  }

  /* Petites touches de prairie, volontairement espacées. */
  ctx.lineCap = "round";

  for (let i = 0; i < 3600; i++) {
    const wx = -74 + r() * 148;
    const wz = -74 + r() * 148;

    if (roadAt(wx, wz, 0.55)) continue;

    const p = worldToCanvas(wx, wz, size);
    const len = 0.8 + r() * 2.5;
    const angle = -Math.PI / 2 + (r() - 0.5) * 1.4;

    ctx.strokeStyle =
      r() > 0.48
        ? "rgba(55,78,39,.075)"
        : "rgba(113,124,68,.060)";

    ctx.lineWidth = 0.45 + r() * 0.55;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(
      p.x + Math.cos(angle) * len,
      p.y + Math.sin(angle) * len,
    );
    ctx.stroke();
  }

  /* Quelques micro-taches irrégulières : terre nue, feuilles, petites ombres. */
  for (let i = 0; i < 1800; i++) {
    const wx = -74 + r() * 148;
    const wz = -74 + r() * 148;

    if (roadAt(wx, wz, 0.45)) continue;

    const p = worldToCanvas(wx, wz, size);
    const radius = 0.35 + r() * 1.1;

    ctx.fillStyle =
      r() > 0.7
        ? "rgba(128,111,68,.060)"
        : "rgba(57,78,42,.055)";

    ctx.beginPath();
    ctx.ellipse(
      p.x,
      p.y,
      radius * (0.8 + r() * 1.2),
      radius * (0.5 + r() * 0.7),
      r() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  /*
   * Chemins : teinte chaude et désaturée.
   * Les couches restent translucides : la couleur de sommet continue de faire
   * l'essentiel du travail, ce qui garde le chemin parfaitement intégré au DA.
   */
  drawRoadNetwork(ctx, size, 1.20, "rgba(100,79,54,.105)");
  drawRoadNetwork(ctx, size, 0.45, "rgba(132,91,57,.165)");
  drawRoadNetwork(ctx, size, -0.35, "rgba(170,126,80,.105)");

  /* Nuances de terre très fines, uniquement à l'intérieur des chemins. */
  for (let i = 0; i < 2600; i++) {
    const wx = -54 + r() * 113;
    const wz = -58 + r() * 105;

    if (!roadAt(wx, wz, -0.08)) continue;

    const p = worldToCanvas(wx, wz, size);
    const w = 0.55 + r() * 1.75;
    const h = 0.25 + r() * 0.8;

    ctx.fillStyle =
      r() > 0.52
        ? "rgba(70,53,39,.085)"
        : "rgba(218,190,147,.085)";

    ctx.beginPath();
    ctx.ellipse(
      p.x,
      p.y,
      w,
      h,
      r() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  /* Quelques cailloux — assez peu pour ne pas faire "papier peint". */
  for (let i = 0; i < 520; i++) {
    const wx = -54 + r() * 113;
    const wz = -58 + r() * 105;

    if (!roadAt(wx, wz, -0.18)) continue;

    const p = worldToCanvas(wx, wz, size);
    const w = 0.45 + r() * 1.25;
    const h = 0.25 + r() * 0.6;

    ctx.fillStyle =
      r() > 0.52
        ? "rgba(67,62,52,.14)"
        : "rgba(208,194,163,.13)";

    ctx.beginPath();
    ctx.ellipse(
      p.x,
      p.y,
      w,
      h,
      r() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  /* Herbe qui grignote doucement les bords : évite le ruban de terre propre. */
  for (let i = 0; i < 950; i++) {
    const wx = -55 + r() * 115;
    const wz = -59 + r() * 107;

    if (!roadEdgeAt(wx, wz)) continue;

    const p = worldToCanvas(wx, wz, size);
    const len = 0.75 + r() * 2.0;
    const angle = -Math.PI / 2 + (r() - 0.5) * 1.25;

    ctx.strokeStyle =
      r() > 0.5
        ? "rgba(60,84,44,.13)"
        : "rgba(102,115,62,.11)";

    ctx.lineWidth = 0.45 + r() * 0.45;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(
      p.x + Math.cos(angle) * len,
      p.y + Math.sin(angle) * len,
    );
    ctx.stroke();
  }

  return canvas;
}

function ensureGroundTexture() {
  if (groundTextureCache) return groundTextureCache;

  const canvas = createGroundDetailCanvas();
  const texture = new T.CanvasTexture(canvas);

  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = T.ClampToEdgeWrapping;
  texture.wrapT = T.ClampToEdgeWrapping;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.anisotropy = 2;
  texture.flipY = false;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;

  groundTextureCache = texture;
  return texture;
}

export function groundMaterial() {
  const material = new T.MeshStandardMaterial({
    color: 0xffffff,
    map: ensureGroundTexture(),
    vertexColors: true,
    roughness: 0.985,
    metalness: 0,
  });

  material.dithering = true;

  return material;
}

export function lamplightPools(
  scene,
  factory,
) {
  const canvas =
    document.createElement(
      "canvas",
    );

  canvas.width =
    canvas.height =
      64;

  const ctx =
    canvas.getContext("2d");

  const gradient =
    ctx.createRadialGradient(
      32,
      32,
      0,
      32,
      32,
      32,
    );

  gradient.addColorStop(
    0,
    "rgba(255,180,76,.62)",
  );

  gradient.addColorStop(
    0.42,
    "rgba(245,144,48,.28)",
  );

  gradient.addColorStop(
    1,
    "rgba(230,111,31,0)",
  );

  ctx.fillStyle =
    gradient;

  ctx.fillRect(
    0,
    0,
    64,
    64,
  );

  const texture =
    new T.CanvasTexture(
      canvas,
    );

  texture.colorSpace =
    T.SRGBColorSpace;

  texture.minFilter =
    T.LinearFilter;

  texture.magFilter =
    T.LinearFilter;

  const material =
    new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending:
        T.AdditiveBlending,
      opacity: 0,
      toneMapped: false,
    });

  const geometry =
    new T.PlaneGeometry(
      5.4,
      5.4,
    );

  geometry.rotateX(
    -Math.PI / 2,
  );

  for (
    const part of
    factory.parts.values()
  ) {
    if (
      part.m
        .emissiveIntensity !==
      0.75
    )
      continue;

    for (
      const matrix of
      part.matrices
    ) {
      const p =
        new T.Vector3()
          .setFromMatrixPosition(
            matrix,
          );

      const pool =
        new T.Mesh(
          geometry,
          material,
        );

      pool.position.set(
        p.x,
        p.y -
          2.83 +
          0.065,
        p.z,
      );

      pool.renderOrder =
        1;

      scene.add(pool);
    }
  }

  return material;
}

export function villageDetails(
  f,
  world,
) {
  const r =
    random(5194);

  const ground =
    world.ground.geometry;

  function yAt(x, z) {
    const col =
      Math.max(
        0,
        Math.min(
          180,
          Math.round(
            ((x + 75) /
              150) *
              180,
          ),
        ),
      );

    const row =
      Math.max(
        0,
        Math.min(
          180,
          Math.round(
            ((z + 75) /
              150) *
              180,
          ),
        ),
      );

    return ground
      .attributes
      .position
      .getY(
        row * 181 +
        col,
      );
  }

  function roadLike(x, z) {
    if (
      x < -2 &&
      x > -48 &&
      (
        Math.abs(z + 19) <
          2.3 ||
        Math.abs(z - 8) <
          2.3 ||
        Math.abs(z + 39) <
          1.9
      )
    )
      return true;

    if (
      Math.abs(x + 9) <
        2.5 &&
      z > -52 &&
      z < 24
    )
      return true;

    if (
      Math.hypot(
        x + 9,
        z,
      ) < 8.2
    )
      return true;

    if (
      z > 7 &&
      z < 31 &&
      Math.abs(
        x -
        (
          -9 -
          (z - 8) *
          0.9
        )
      ) < 1.6
    )
      return true;

    if (
      x > -9 &&
      x < 52 &&
      (
        Math.abs(z - 8) <
          1.9 ||
        Math.abs(z + 30) <
          1.7
      )
    )
      return true;

    if (
      x > 27 &&
      x < 52 &&
      Math.abs(
        x -
        (
          38 +
          Math.sin(
            z * 0.1,
          ) *
          5
        )
      ) < 1.9
    )
      return true;

    return false;
  }

  function pot(
    x,
    z,
    color = "#ab654e",
    scale = 1,
  ) {
    const y =
      yAt(x, z);

    f.part(
      "taper",
      color,
      x,
      y +
        0.28 *
        scale,
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
      y +
        0.54 *
        scale,
      z,
      0.31 * scale,
      0.31 * scale,
      0.31 * scale,
      Math.PI / 2,
    );

    for (
      let i = 0;
      i < 6;
      i++
    ) {
      flower(
        f,
        x +
          (r() - 0.5) *
          0.5 *
          scale,
        y +
          0.48 *
          scale,
        z +
          (r() - 0.5) *
          0.5 *
          scale,
        [
          "#d77c9b",
          "#ebc678",
          "#9f9bd1",
        ][i % 3],
        scale * 1.4,
      );
    }
  }

  function crate(
    x,
    z,
  ) {
    const y =
      yAt(x, z);

    f.part(
      "box",
      "#aa774d",
      x,
      y + 0.36,
      z,
      0.85,
      0.7,
      0.8,
      0,
      0,
      0,
      "wood",
    );

    for (
      const xx of [
        -0.37,
        0.37,
      ]
    ) {
      f.part(
        "box",
        "#493d42",
        x + xx,
        y + 0.38,
        z + 0.41,
        0.06,
        0.68,
        0.055,
      );
    }

    for (
      let i = 0;
      i < 7;
      i++
    ) {
      f.part(
        "sphere",
        i % 2
          ? "#d58a4c"
          : "#a4ad57",
        x +
          (r() - 0.5) *
          0.65,
        y + 0.79,
        z +
          (r() - 0.5) *
          0.6,
        0.12,
        0.13,
        0.12,
      );
    }
  }

  /*
   * Façades de boutiques.
   */

  for (
    const [
      x,
      z,
      w,
      d,
      v,
    ] of [
      [
        -19,
        -10,
        5.3,
        4.6,
        0,
      ],
      [
        -20,
        17,
        4.4,
        4.3,
        3,
      ],
    ]
  ) {
    const y =
      yAt(x, z);

    house(
      f,
      x,
      y,
      z,
      w,
      d,
      3.1,
      v,
    );

    world.collider(
      x,
      z,
      0,
      "rect",
      w + 0.6,
      d + 0.6,
    );

    const front =
      z +
      d / 2 +
      0.65;

    for (
      let i = 0;
      i < 9;
      i++
    ) {
      const stripe =
        i % 2
          ? "#edd5a6"
          : v === 2
            ? "#b75c56"
            : "#426c78";

      f.part(
        "box",
        stripe,
        x -
          w / 2 +
          (i * w) / 9,
        y + 2.58,
        front,
        w / 9,
        0.13,
        1.6,
        0.16,
      );

      f.part(
        "box",
        stripe,
        x -
          w / 2 +
          (i * w) / 9,
        y + 2.36,
        front + 0.78,
        w / 9,
        0.36,
        0.08,
      );
    }

    for (
      const dx of [
        -w / 2,
        w / 2,
      ]
    ) {
      f.part(
        "box",
        "#63483f",
        x + dx,
        y + 1.25,
        front + 0.7,
        0.08,
        2.5,
        0.08,
      );
    }

    crate(
      x -
        w / 2 -
        0.9,
      front,
    );

    pot(
      x +
        w / 2 +
        0.75,
      front,
    );

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

    for (
      let j = 0;
      j < 3;
      j++
    ) {
      f.part(
        "box",
        "#d9c999",
        x + 0.9,
        y +
          0.7 -
          j * 0.13,
        front + 1.21,
        0.3,
        0.025,
        0.02,
      );
    }
  }

  /*
   * Terrasse café.
   */

  for (
    const [
      x,
      z,
    ] of [
      [-17, -4],
      [-19, 0],
      [-16, 3],
    ]
  ) {
    const y =
      yAt(x, z);

    f.part(
      "cylinder",
      "#654b42",
      x,
      y + 0.46,
      z,
      0.08,
      0.92,
      0.08,
    );

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

    for (
      const dx of [
        -1,
        1,
      ]
    ) {
      f.part(
        "box",
        "#785846",
        x + dx,
        y + 0.3,
        z,
        0.4,
        0.6,
        0.4,
      );

      f.part(
        "box",
        "#c29462",
        x + dx,
        y + 0.62,
        z,
        0.56,
        0.09,
        0.54,
      );
    }

    f.part(
      "cylinder",
      "#eee0bd",
      x + 0.25,
      y + 1.05,
      z,
      0.09,
      0.18,
      0.09,
    );

    f.part(
      "cylinder",
      "#b95f69",
      x - 0.23,
      y + 1.02,
      z,
      0.14,
      0.1,
      0.14,
    );

    if (z === 0) {
      f.part(
        "cylinder",
        "#735547",
        x,
        y + 1.9,
        z,
        0.045,
        3.8,
        0.045,
      );

      f.part(
        "cone",
        "#cf9773",
        x,
        y + 3.6,
        z,
        1.8,
        0.65,
        1.8,
      );

      f.part(
        "cone",
        "#e2c28e",
        x,
        y + 3.76,
        z,
        1.2,
        0.42,
        1.2,
        0,
        0.4,
      );
    }

    world.collider(
      x,
      z,
      0.75,
    );
  }

  /*
   * Guirlandes.
   */

  for (
    const z of [
      -7,
      11,
    ]
  ) {
    for (
      const x of [
        -15,
        -3,
      ]
    ) {
      f.part(
        "cylinder",
        "#66514c",
        x,
        yAt(x, z) +
          2.6,
        z,
        0.065,
        5.2,
        0.065,
      );
    }

    for (
      let i = 0;
      i < 25;
      i++
    ) {
      const x =
        -15 +
        i * 0.5;

      const y =
        yAt(-9, z) +
        4.6 -
        Math.sin(
          (i / 24) *
          Math.PI,
        ) *
        0.7;

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
        -Math.cos(
          (i / 24) *
          Math.PI,
        ) *
        0.14,
      );

      if (i % 2) {
        f.part(
          "gable",
          [
            "#bf788c",
            "#dbb25f",
            "#659c95",
            "#9391b0",
          ][i % 4],
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
  }

  /*
   * Haies périphériques.
   */

  for (
    const [
      cx,
      cz,
      len,
    ] of [
      [-16, -15, 5],
      [-33, 5, 7],
      [-38, -5, 5],
      [4, 9, 4],
    ]
  ) {
    for (
      let i = 0;
      i < len * 3;
      i++
    ) {
      const x =
        cx +
        i * 0.33 -
        len * 0.5;

      const z =
        cz +
        (r() - 0.5) *
        1.1;

      const y =
        yAt(x, z);

      f.part(
        "sphere",
        [
          "#426e59",
          "#789456",
          "#99a665",
        ][i % 3],
        x,
        y + 0.4,
        z,
        0.55,
        0.4 +
          r() * 0.25,
        0.52,
      );

      if (i % 2) {
        for (
          let j = 0;
          j < 3;
          j++
        ) {
          flower(
            f,
            x +
              (r() - 0.5) *
              0.5,
            y + 0.5,
            z +
              (r() - 0.5) *
              0.5,
            [
              "#c47197",
              "#dbb568",
              "#c9c1dc",
            ][i % 3],
            1.1,
          );
        }
      }
    }

    for (
      let i = 0;
      i < len;
      i++
    ) {
      const x =
        cx +
        i -
        len * 0.5;

      f.part(
        "sphere",
        "#797b79",
        x,
        yAt(
          x,
          cz + 1,
        ) +
          0.13,
        cz + 1,
        0.42,
        0.2,
        0.31,
      );
    }
  }

  for (
    const [
      x,
      z,
    ] of [
      [-13, -8],
      [-4, -8],
      [-24, 6],
      [-36, 6],
      [-1, 14],
      [-31, -12],
    ]
  ) {
    pot(x, z);

    crate(
      x + 0.8,
      z + 0.25,
    );
  }

  /*
   * Prairie principale.
   */

  for (
    let i = 0;
    i < 2600;
    i++
  ) {
    const x =
      -47 +
      r() * 54;

    const z =
      -28 +
      r() * 49;

    if (
      world.collides(
        x,
        z,
        0.08,
      )
    )
      continue;

    if (
      roadLike(x, z)
    )
      continue;

    const y =
      yAt(x, z);

    const mode =
      r();

    if (mode < 0.82) {
      const h =
        0.055 +
        r() * 0.12;

      f.part(
        "box",
        r() > 0.55
          ? "#4f6d3c"
          : "#728a50",
        x,
        y +
          h * 0.5,
        z,
        0.026,
        h,
        0.020,
        0,
        r() * 6,
        0.18 +
          r() * 0.18,
      );
    } else if (
      mode < 0.97
    ) {
      for (
        let j = 0;
        j <
        2 +
          Math.floor(
            r() * 3,
          );
        j++
      ) {
        f.part(
          "cone",
          j % 2
            ? "#627b47"
            : "#819759",
          x +
            (j - 1) *
            0.03,
          y + 0.08,
          z +
            (r() - 0.5) *
            0.06,
          0.018,
          0.09 +
            r() * 0.09,
          0.025,
          0,
          r() * 6,
          0.18,
          "leaf",
        );
      }
    } else {
      flower(
        f,
        x,
        y,
        z,
        r() > 0.5
          ? "#ded7c9"
          : r() > 0.5
            ? "#d6c58e"
            : "#c9aab8",
        0.42 +
          r() * 0.22,
      );
    }
  }

  /*
   * Zones de prairie plus riches.
   */

  for (
    const [
      cx,
      cz,
    ] of [
      [-40, 15],
      [-43, -18],
      [-27, 20],
      [-7, 19],
      [-2, -16],
    ]
  ) {
    for (
      let i = 0;
      i < 14;
      i++
    ) {
      const x =
        cx +
        (r() - 0.5) *
        3.2;

      const z =
        cz +
        (r() - 0.5) *
        2.7;

      if (
        world.collides(
          x,
          z,
          0.08,
        ) ||
        roadLike(x, z)
      )
        continue;

      const y =
        yAt(x, z);

      for (
        let j = 0;
        j < 3;
        j++
      ) {
        f.part(
          "cone",
          [
            "#6e884d",
            "#8ea85d",
            "#5b7740",
          ][j],
          x +
            (j - 1) *
            0.04,
          y + 0.09,
          z +
            (r() - 0.5) *
            0.06,
          0.024,
          0.16 +
            r() * 0.16,
          0.032,
          0,
          r() * 6,
          0.2,
          "leaf",
        );
      }

      if (
        i % 5 === 0
      ) {
        flower(
          f,
          x,
          y,
          z,
          i % 2
            ? "#f6efe8"
            : "#ead1a4",
          0.8,
        );
      }
    }
  }

  /*
   * Prairie plus dense
   * autour de la ferme.
   */

  for (
    let i = 0;
    i < 760;
    i++
  ) {
    const x =
      -43 +
      r() * 27;

    const z =
      21 +
      r() * 20;

    /*
     * Ne jamais mettre d'herbe
     * directement sur les parcelles.
     */

    if (
      x > -31.2 &&
      x < -20.0 &&
      z > 26.0 &&
      z < 35.3
    )
      continue;

    if (
      world.collides(
        x,
        z,
        0.08,
      ) ||
      roadLike(x, z)
    )
      continue;

    const y =
      yAt(x, z);

    const h =
      0.07 +
      r() * 0.14;

    const clump =
      r();

    if (
      clump < 0.88
    ) {
      for (
        let j = 0;
        j <
        2 +
          Math.floor(
            r() * 3,
          );
        j++
      ) {
        f.part(
          "cone",
          j % 2
            ? "#5f7844"
            : "#7f9554",
          x +
            (r() - 0.5) *
            0.09,
          y +
            h * 0.45,
          z +
            (r() - 0.5) *
            0.09,
          0.016 +
            r() * 0.009,
          h,
          0.025,
          0,
          r() * 6,
          (r() - 0.5) *
            0.45,
          "leaf",
        );
      }
    } else if (
      clump < 0.97
    ) {
      flower(
        f,
        x,
        y,
        z,
        r() > 0.5
          ? "#ddd7cb"
          : "#d3c28c",
        0.42 +
          r() * 0.24,
      );
    } else {
      f.part(
        "sphere",
        "#8a8c79",
        x,
        y + 0.025,
        z,
        0.055 +
          r() * 0.06,
        0.025 +
          r() * 0.03,
        0.07 +
          r() * 0.07,
        0,
        r() * 6,
        0,
        "stone",
      );
    }
  }
}
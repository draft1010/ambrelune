import * as T from "../../vendor/three.module.js";
export { T };

export function random(seed) {
  let n = seed >>> 0;

  return () => {
    n = (1664525 * n + 1013904223) >>> 0;
    return n / 4294967296;
  };
}

const geometries = {
  box: new T.BoxGeometry(1, 1, 1),
  sphere: new T.IcosahedronGeometry(1, 1),
  smooth: new T.SphereGeometry(1, 12, 8),
  soft: new T.SphereGeometry(1, 18, 12),
  hi: new T.SphereGeometry(1, 24, 16),
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

export const windUniform = {
  value: 0,
};

export const foliageFocus = {
  value: new T.Vector3(),
};

export const foliageCamera = {
  value: new T.Vector3(),
};

export const foliageCutaway = {
  value: 0,
};

function texture(kind) {
  const c = document.createElement("canvas");

  c.width = c.height = 128;

  const g = c.getContext("2d");

  const grain = random(
    {
      plaster: 1937,
      wood: 2197,
      roof: 2477,
      stone: 2729,
      bark: 3253,
      cutwood: 3557,
      rock: 3821,
      leaf: 4211,
      cloth: 4513,
    }[kind] || 1937,
  );

  const fill = (color) => {
    g.fillStyle = color;
    g.fillRect(0, 0, 128, 128);
  };

  const rect = (x, y, w, h, color) => {
    g.fillStyle = color;

    g.fillRect(
      Math.floor(x),
      Math.floor(y),
      Math.ceil(w),
      Math.ceil(h),
    );
  };

  const pick = (colors) =>
    colors[Math.floor(grain() * colors.length)];

  fill("#ddd2bd");

  for (let i = 0; i < 2100; i++) {
    g.fillStyle =
      grain() > 0.5
        ? "#faf0d839"
        : "#342d3435";

    g.fillRect(
      Math.floor(grain() * 64) * 2,
      Math.floor(grain() * 64) * 2,
      2 + Math.floor(grain() * 3) * 2,
      2,
    );
  }

  if (
    kind === "wood" ||
    kind === "roof" ||
    kind === "stone"
  ) {
    const rh =
      kind === "roof"
        ? 16
        : kind === "stone"
          ? 32
          : 16;

    for (
      let y = 0;
      y < 128;
      y += rh
    ) {
      for (
        let x = -32;
        x < 128;
        x += 32
      ) {
        const xx =
          x +
          ((y / rh) % 2) * 16;

        g.fillStyle = [
          "#a8a399",
          "#bcb5a8",
          "#ddd3ba",
          "#c8bcac",
        ][Math.floor(grain() * 4)];

        g.fillRect(
          xx + 1,
          y + 1,
          30,
          rh - 2,
        );

        g.fillStyle =
          "#f8e3b754";

        g.fillRect(
          xx + 2,
          y + 2,
          28,
          2,
        );

        g.fillStyle =
          "#30293f40";

        g.fillRect(
          xx + 2,
          y + rh - 3,
          30,
          2,
        );

        if (kind === "wood") {
          g.fillStyle =
            "#53403280";

          g.fillRect(
            xx + 6,
            y + 5,
            13,
            1,
          );

          g.fillRect(
            xx + 15,
            y + 9,
            10,
            1,
          );
        }
      }
    }
  }

  if (kind === "bark") {
    fill("#80705d");

    for (
      let x = 0;
      x < 128;
      x += 3
    ) {
      rect(
        x,
        0,
        1 +
          Math.floor(
            grain() * 2,
          ),
        128,
        pick([
          "#665746",
          "#756451",
          "#8f7d67",
          "#9c8970",
        ]),
      );

      for (
        let j = 0;
        j < 6;
        j++
      ) {
        const y =
          Math.floor(
            grain() * 128,
          );

        rect(
          x + grain() * 2,
          y,
          2 + grain() * 7,
          1,
          "#b09a7a78",
        );
      }
    }

    for (
      let i = 0;
      i < 90;
      i++
    ) {
      const x =
        Math.floor(
          grain() * 128,
        );

      const y =
        Math.floor(
          grain() * 128,
        );

      rect(
        x,
        y,
        1,
        4 +
          Math.floor(
            grain() * 13,
          ),
        grain() > 0.5
          ? "#4f4439aa"
          : "#b39a7b88",
      );
    }
  }

  if (kind === "cutwood") {
    fill("#c6a878");

    const cx = 64;
    const cy = 64;

    for (
      let ring = 8;
      ring < 62;
      ring +=
        7 +
        Math.floor(
          grain() * 3,
        )
    ) {
      g.strokeStyle =
        ring % 2
          ? "#8f704caa"
          : "#a8875eaa";

      g.lineWidth =
        1 +
        (ring % 3 === 0
          ? 1
          : 0);

      g.beginPath();

      g.ellipse(
        cx +
          (grain() - 0.5) *
            3,
        cy +
          (grain() - 0.5) *
            3,
        ring,
        ring * 0.92,
        0,
        0,
        Math.PI * 2,
      );

      g.stroke();
    }

    for (
      let i = 0;
      i < 7;
      i++
    ) {
      const a =
        grain() *
        Math.PI *
        2;

      const len =
        14 +
        grain() * 40;

      g.strokeStyle =
        "#765b40aa";

      g.lineWidth = 1;

      g.beginPath();

      g.moveTo(cx, cy);

      g.lineTo(
        cx +
          Math.cos(a) * len,
        cy +
          Math.sin(a) * len,
      );

      g.stroke();
    }
  }

  if (kind === "rock") {
    fill("#aaa99f");

    for (
      let i = 0;
      i < 1300;
      i++
    ) {
      const x =
        Math.floor(
          grain() * 128,
        );

      const y =
        Math.floor(
          grain() * 128,
        );

      const s =
        1 +
        Math.floor(
          grain() * 5,
        );

      rect(
        x,
        y,
        s,
        s,
        pick([
          "#8d918d33",
          "#c9c8bc48",
          "#737a7730",
          "#e0ddd04a",
        ]),
      );
    }

    for (
      let i = 0;
      i < 14;
      i++
    ) {
      let x =
        grain() * 128;

      let y =
        grain() * 128;

      g.strokeStyle =
        grain() > 0.5
          ? "#686d6a77"
          : "#e4e0d288";

      g.lineWidth = 1;

      g.beginPath();
      g.moveTo(x, y);

      for (
        let j = 0;
        j < 4;
        j++
      ) {
        x +=
          (grain() - 0.5) *
          11;

        y +=
          3 +
          grain() * 9;

        g.lineTo(x, y);
      }

      g.stroke();
    }
  }

  if (kind === "leaf") {
    fill("#a2b184");

    for (
      let i = 0;
      i < 1000;
      i++
    ) {
      const x =
        Math.floor(
          grain() * 128,
        );

      const y =
        Math.floor(
          grain() * 128,
        );

      const s =
        2 +
        Math.floor(
          grain() * 5,
        );

      g.fillStyle =
        pick([
          "#70845b66",
          "#8fa27177",
          "#bbc69a77",
          "#d4dcb477",
        ]);

      g.beginPath();

      g.ellipse(
        x,
        y,
        s,
        Math.max(
          1,
          s * 0.55,
        ),
        grain() *
          Math.PI,
        0,
        Math.PI * 2,
      );

      g.fill();
    }
  }

  if (kind === "cloth") {
    fill("#ded8cd");

    for (
      let y = 0;
      y < 128;
      y += 4
    ) {
      rect(
        0,
        y,
        128,
        1,
        "#ffffff18",
      );
    }

    for (
      let x = 0;
      x < 128;
      x += 5
    ) {
      rect(
        x,
        0,
        1,
        128,
        "#4e474412",
      );
    }
  }

  const t =
    new T.CanvasTexture(c);

  t.colorSpace =
    T.SRGBColorSpace;

  t.wrapS =
    t.wrapT =
      T.RepeatWrapping;

  t.anisotropy = 4;

  if (
    [
      "wood",
      "roof",
      "stone",
      "plaster",
    ].includes(kind)
  ) {
    t.magFilter =
      T.NearestFilter;
  } else {
    t.magFilter =
      T.LinearFilter;

    t.minFilter =
      T.LinearMipmapLinearFilter;
  }

  return t;
}

const textures = {};

export function mat(
  color,
  kind = "",
  glow = 0,
) {
  const normalized =
    typeof color ===
    "string"
      ? color.toLowerCase()
      : color;

  const foliage = [
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
    "#789157",
    "#648858",
    "#8d9e63",
    "#718750",
  ];

  if (
    !kind &&
    [
      "#8d7453",
      "#705c41",
      "#74634b",
    ].includes(normalized)
  ) {
    kind = "bark";
  }

  if (
    !kind &&
    normalized ===
      "#c4ab77"
  ) {
    kind = "cutwood";
  }

  if (
    !kind &&
    [
      "#a9ab98",
      "#babbab",
      "#797b79",
      "#929d88",
      "#a4ac90",
    ].includes(normalized)
  ) {
    kind = "rock";
  }

  if (
    !kind &&
    foliage.includes(
      normalized,
    )
  ) {
    kind = "leaf";
  }

  const key =
    `${color}/${kind}/${glow}`;

  if (!materials.has(key)) {
    const textured =
      kind &&
      ![
        "skin",
        "creature",
      ].includes(kind);

    if (
      textured &&
      !textures[kind]
    ) {
      textures[kind] =
        texture(kind);
    }

    const m =
      new T.MeshStandardMaterial({
        color,

        map: textured
          ? textures[kind]
          : null,

        roughness:
          kind === "rock"
            ? 0.98
            : kind === "bark"
              ? 0.95
              : kind === "leaf"
                ? 0.91
                : 0.88,

        flatShading:
          kind === "rock" ||
          (!kind && !glow),

        emissive:
          glow
            ? color
            : 0x000000,

        emissiveIntensity:
          glow,
      });

    if (kind === "leaf") {
      m.onBeforeCompile =
        (shader) => {
          shader.uniforms.windTime =
            windUniform;

          shader.uniforms.gardenFocus =
            foliageFocus;

          shader.uniforms.gardenCamera =
            foliageCamera;

          shader.uniforms.gardenCutaway =
            foliageCutaway;

          shader.vertexShader =
            "uniform float windTime;\nvarying vec3 gardenWorld;\n" +
            shader.vertexShader;

          shader.vertexShader =
            shader.vertexShader.replace(
              "#include <begin_vertex>",
              `#include <begin_vertex>
vec3 wp=position;
#ifdef USE_INSTANCING
wp=(instanceMatrix*vec4(position,1.0)).xyz;
#endif
transformed.x += sin(wp.x*.62+wp.z*.53+windTime*1.45) * .021 * (position.y+1.0);
transformed.z += cos(wp.x*.37-wp.z*.58+windTime*1.18) * .010 * (position.y+1.0);
vec4 gardenVertex=vec4(transformed,1.);
#ifdef USE_INSTANCING
gardenVertex=instanceMatrix*gardenVertex;
#endif
gardenWorld=(modelMatrix*gardenVertex).xyz;`,
            );

          shader.fragmentShader =
            "varying vec3 gardenWorld;\nuniform vec3 gardenFocus;\nuniform vec3 gardenCamera;\nuniform float gardenCutaway;\n" +
            shader.fragmentShader;

          shader.fragmentShader =
            shader.fragmentShader.replace(
              "#include <color_fragment>",
              `#include <color_fragment>
float organicShade =
  sin(gardenWorld.x*3.7+gardenWorld.z*2.9) *
  sin(gardenWorld.y*4.3-gardenWorld.x*1.7);
diffuseColor.rgb *= 1.0 + organicShade*.035;`,
            );

          shader.fragmentShader =
            shader.fragmentShader.replace(
              "#include <dithering_fragment>",
              `#include <dithering_fragment>
vec3 ray=gardenCamera-gardenFocus;
float along=
  dot(gardenWorld-gardenFocus,ray) /
  max(dot(ray,ray),.01);
float radius=
  length(
    gardenWorld-
    (gardenFocus+ray*along)
  );
if(
  gardenCutaway>.5 &&
  along>.02 &&
  along<.7 &&
  radius<1.8
){
  float keep=
    smoothstep(.6,1.8,radius);
  float dither=
    fract(
      sin(
        dot(
          floor(gl_FragCoord.xy),
          vec2(12.9898,78.233)
        )
      )*
      43758.5453
    );
  if(dither>keep){
    discard;
  }
}`,
            );
        };

      m.customProgramCacheKey =
        () =>
          "foliage-organic-v4";
    }

    materials.set(key, m);
  }

  return materials.get(key);
}

export class Factory {
  constructor(
    root,
    batch = false,
  ) {
    this.root = root;
    this.batch = batch;
    this.parts = new Map();
    this.dummy =
      new T.Object3D();
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
    const g =
      geometries[type];

    const m =
      mat(
        color,
        kind,
        glow,
      );

    if (this.batch) {
      const key =
        type +
        ":" +
        m.uuid;

      if (
        !this.parts.has(key)
      ) {
        this.parts.set(
          key,
          {
            g,
            m,
            matrices: [],
          },
        );
      }

      this.dummy.position.set(
        x,
        y,
        z,
      );

      this.dummy.scale.set(
        sx,
        sy,
        sz,
      );

      this.dummy.rotation.set(
        rx,
        ry,
        rz,
      );

      this.dummy.updateMatrix();

      this.parts
        .get(key)
        .matrices.push(
          this.dummy.matrix.clone(),
        );

      return this.dummy;
    }

    const mesh =
      new T.Mesh(g, m);

    mesh.position.set(
      x,
      y,
      z,
    );

    mesh.scale.set(
      sx,
      sy,
      sz,
    );

    mesh.rotation.set(
      rx,
      ry,
      rz,
    );

    mesh.castShadow =
      type !== "plane";

    mesh.receiveShadow =
      true;

    this.root.add(mesh);

    return mesh;
  }

  flush() {
    for (
      const {
        g,
        m,
        matrices,
      } of this.parts.values()
    ) {
      const mesh =
        new T.InstancedMesh(
          g,
          m,
          matrices.length,
        );

      matrices.forEach(
        (
          matrix,
          i,
        ) =>
          mesh.setMatrixAt(
            i,
            matrix,
          ),
      );

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      mesh.computeBoundingSphere();

      this.root.add(mesh);
    }

    this.parts.clear();
  }
}

export function house(
  f,
  x,
  y,
  z,
  w = 5,
  d = 5,
  h = 4,
  variant = 0,
) {
  const roof = [
    "#80536a",
    "#3c6172",
    "#aa6749",
    "#42556d",
  ][variant % 4];

  const wall = [
    "#eee0bc",
    "#e0ceab",
    "#dfc3a3",
    "#efe3c9",
  ][variant % 4];

  const wood =
    "#705941";

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

  f.part(
    "box",
    wall,
    x,
    y + h / 2,
    z,
    w,
    h,
    d,
    0,
    0,
    0,
    "plaster",
  );

  for (
    const dx of [
      -w / 2,
      w / 2,
    ]
  ) {
    for (
      const dz of [
        -d / 2,
        d / 2,
      ]
    ) {
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
    }
  }

  for (
    const yy of [
      0.65,
      h * 0.63,
      h,
    ]
  ) {
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
  }

  const rise =
    w * 0.43;

  const slant =
    Math.sqrt(
      (w / 2 + 0.35) ** 2 +
        rise ** 2,
    );

  const angle =
    Math.atan2(
      rise,
      w / 2 + 0.35,
    );

  for (
    const s of [-1, 1]
  ) {
    f.part(
      "box",
      roof,
      x +
        s *
          (w / 4 + 0.1),
      y +
        h +
        rise / 2,
      z,
      slant,
      0.18,
      d + 0.9,
      0,
      0,
      -s * angle,
      "roof",
    );

    const tileColors =
      [0.86, 1, 1.12].map(
        (v) =>
          new T.Color(roof)
            .multiplyScalar(v)
            .getStyle(),
      );

    const cols =
      Math.ceil(
        (d + 0.9) /
          0.52,
      );

    const rows = 8;

    for (
      let row = 0;
      row < rows;
      row++
    ) {
      for (
        let col = 0;
        col < cols;
        col++
      ) {
        const k =
          (row + 0.5) /
          rows;

        f.part(
          "box",
          tileColors[
            (col +
              row * 7) %
              3
          ],
          x +
            s *
              k *
              (w / 2 +
                0.35),
          y +
            h +
            rise *
              (1 - k) +
            0.1,
          z -
            (d + 0.9) /
              2 +
            ((col + 0.5) *
              (d + 0.9)) /
              cols,
          slant /
              rows +
            0.03,
          0.06,
          (d + 0.9) /
              cols -
            0.015,
          0,
          0,
          -s * angle,
          "roof",
        );
      }
    }
  }

  f.part(
    "box",
    wood,
    x,
    y +
      h +
      rise +
      0.12,
    z,
    0.25,
    0.23,
    d + 1.02,
    0,
    0,
    0,
    "wood",
  );

  for (
    const zz of [
      -d / 2,
      d / 2,
    ]
  ) {
    f.part(
      "gable",
      wall,
      x,
      y + h,
      z + zz,
      w,
      rise,
      0.12,
    );

    f.part(
      "box",
      wood,
      x,
      y +
        h +
        rise * 0.45,
      z +
        zz +
        0.08,
      0.12,
      rise * 0.9,
      0.16,
    );

    f.part(
      "box",
      wood,
      x,
      y +
        h +
        0.06,
      z +
        zz +
        0.08,
      w,
      0.14,
      0.14,
    );
  }

  const side =
    z + d / 2 + 0.12;

  f.part(
    "box",
    wood,
    x,
    y + 1.1,
    side,
    1.15,
    2.2,
    0.16,
    0,
    0,
    0,
    "wood",
  );

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

  f.part(
    "sphere",
    "#d9bb77",
    x + 0.3,
    y + 1,
    side + 0.17,
    0.07,
    0.07,
    0.07,
  );

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

  for (
    const xx of [
      -w * 0.3,
      w * 0.3,
    ]
  ) {
    for (
      const yy of
        h > 4.5
          ? [1.65, 3.8]
          : [1.9]
    ) {
      f.part(
        "box",
        wood,
        x + xx,
        y + yy,
        side,
        1.02,
        1.3,
        0.16,
      );

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

      f.part(
        "box",
        wood,
        x + xx,
        y + yy,
        side + 0.14,
        0.05,
        1.1,
        0.07,
      );

      f.part(
        "box",
        wood,
        x + xx,
        y + yy,
        side + 0.14,
        0.8,
        0.06,
        0.07,
      );

      for (
        const s of [-1, 1]
      ) {
        f.part(
          "box",
          "#658478",
          x +
            xx +
            s * 0.62,
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
      }

      f.part(
        "box",
        wood,
        x + xx,
        y +
          yy -
          0.75,
        side + 0.18,
        1.3,
        0.27,
        0.48,
        0,
        0,
        0,
        "wood",
      );

      for (
        let j = 0;
        j < 5;
        j++
      ) {
        f.part(
          "sphere",
          "#718750",
          x +
            xx -
            0.5 +
            j * 0.25,
          y +
            yy -
            0.57,
          side + 0.22,
          0.24,
          0.18,
          0.25,
        );

        f.part(
          "sphere",
          j % 2
            ? "#e8bda0"
            : "#c88882",
          x +
            xx -
            0.5 +
            j * 0.25,
          y +
            yy -
            0.41,
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
    y +
      h +
      rise * 0.75,
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
    y +
      h +
      rise * 0.75 +
      0.8,
    z - d * 0.25,
    0.8,
    0.16,
    0.8,
  );

  for (
    let j = 0;
    j < 4;
    j++
  ) {
    f.part(
      "sphere",
      "#708951",
      x -
        w / 2 -
        0.08,
      y +
        0.7 +
        j * 0.45,
      side - 0.25,
      0.3,
      0.4,
      0.22,
    );
  }

  f.part(
    "cylinder",
    "#846d4c",
    x +
      w / 2 +
      0.55,
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

  for (
    const yy of [0.2, 0.8]
  ) {
    f.part(
      "torus",
      "#554f40",
      x +
        w / 2 +
        0.55,
      y + yy,
      z + d * 0.3,
      0.46,
      0.46,
      0.46,
      Math.PI / 2,
    );
  }
}

export function tree(
  f,
  x,
  y,
  z,
  size = 1,
  variant = 0,
) {
  const wood =
    "#74634b";

  const pine =
    variant % 3 === 0;

  const leaf =
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
    0.31 * size,
    4.6 * size,
    0.31 * size,
    0,
    0,
    0.04,
    "bark",
  );

  for (
    let root = 0;
    root < 4;
    root++
  ) {
    const a =
      root *
        (Math.PI / 2) +
      variant * 0.31;

    f.part(
      "taper",
      wood,
      x +
        Math.sin(a) *
          0.24 *
          size,
      y + 0.16 * size,
      z +
        Math.cos(a) *
          0.24 *
          size,
      0.11 * size,
      0.5 * size,
      0.16 * size,
      Math.cos(a) * 0.9,
      0,
      -Math.sin(a) * 0.9,
      "bark",
    );
  }

  if (pine) {
    for (
      let j = 0;
      j < 5;
      j++
    ) {
      const radius =
        (2.1 -
          j * 0.3) *
        size;

      f.part(
        "cone",
        j % 2
          ? "#4e7b61"
          : leaf,
        x,
        y +
          (3 +
            j * 0.73) *
            size,
        z,
        radius,
        2.4 * size,
        radius,
        0,
        j * 0.7,
        0,
        "leaf",
      );
    }

    for (
      let j = 0;
      j < 6;
      j++
    ) {
      const a =
        j * 2.17 +
        variant;

      const level =
        3.1 +
        (j % 3) *
          0.72;

      f.part(
        "sphere",
        j % 2
          ? "#426e59"
          : "#4e7b61",
        x +
          Math.sin(a) *
            (0.75 +
              (j % 2) *
                0.3) *
            size,
        y +
          level * size,
        z +
          Math.cos(a) *
            (0.75 +
              (j % 2) *
                0.3) *
            size,
        0.46 * size,
        0.24 * size,
        0.62 * size,
        0.1,
        a,
        0.18,
        "leaf",
      );
    }
  } else {
    for (
      let j = 0;
      j < 12;
      j++
    ) {
      const a =
        j * 2.4 +
        variant * 0.13;

      const dx =
        Math.sin(a) *
        (j ? 1.45 : 0) *
        size;

      const dz =
        Math.cos(a) *
        (j ? 1.12 : 0) *
        size;

      const yy =
        y +
        (4.45 +
          Math.sin(j * 4) *
            0.6) *
          size;

      f.part(
        "taper",
        wood,
        x + dx * 0.5,
        y +
          3.35 * size,
        z + dz * 0.5,
        0.13 * size,
        2.15 * size,
        0.13 * size,
        0.4 *
          Math.cos(a),
        0,
        -0.5 *
          Math.sin(a),
        "bark",
      );

      const crownColor =
        variant === 4
          ? j % 3
            ? "#d891a6"
            : "#edbbbc"
          : j % 3 === 0
            ? "#b2b879"
            : leaf;

      f.part(
        "soft",
        crownColor,
        x + dx,
        yy,
        z + dz,
        0.92 * size,
        0.72 * size,
        0.9 * size,
        0,
        a,
        0.15,
        "leaf",
      );

      f.part(
        "soft",
        leaf,
        x + dx * 0.84,
        yy + 0.62 * size,
        z + dz * 0.84,
        0.88 * size,
        0.58 * size,
        0.83 * size,
        0,
        a * 0.4,
        0,
        "leaf",
      );
    }

    for (
      let j = 0;
      j < 8;
      j++
    ) {
      const a =
        j * 2.31 +
        variant * 0.4;

      const radius =
        (1.72 +
          (j % 2) *
            0.25) *
        size;

      f.part(
        "sphere",
        variant === 4 &&
          j % 3 === 0
          ? "#edbbbc"
          : leaf,
        x +
          Math.sin(a) *
            radius,
        y +
          (4.5 +
            Math.sin(
              j * 1.8,
            ) *
              0.55) *
            size,
        z +
          Math.cos(a) *
            radius *
            0.82,
        0.45 * size,
        0.31 * size,
        0.52 * size,
        0,
        a,
        0.12,
        "leaf",
      );
    }
  }

  f.part(
    "soft",
    "#789157",
    x,
    y + 0.22,
    z,
    0.64 * size,
    0.21,
    0.6 * size,
    0,
    0,
    0,
    "leaf",
  );
}

export function flower(
  f,
  x,
  y,
  z,
  color = "#d5b2a4",
  size = 1,
) {
  f.part(
    "cone",
    "#7c975f",
    x,
    y + 0.18 * size,
    z,
    0.055 * size,
    0.4 * size,
    0.065 * size,
    0,
    0,
    0.2,
    "leaf",
  );

  for (
    let i = 0;
    i < 4;
    i++
  ) {
    const a =
      i *
      (Math.PI / 2);

    f.part(
      "soft",
      color,
      x +
        Math.sin(a) *
          0.085 *
          size,
      y + 0.4 * size,
      z +
        Math.cos(a) *
          0.085 *
          size,
      0.09 * size,
      0.045 * size,
      0.12 * size,
      0,
      a,
      0.15,
    );
  }

  f.part(
    "soft",
    "#e6c77f",
    x,
    y + 0.415 * size,
    z,
    0.055 * size,
    0.045 * size,
    0.055 * size,
  );
}

export function lamp(
  f,
  x,
  y,
  z,
) {
  f.part(
    "cylinder",
    "#506559",
    x,
    y + 1.6,
    z,
    0.065,
    3.2,
    0.065,
  );

  f.part(
    "box",
    "#506559",
    x,
    y + 3.1,
    z,
    0.45,
    0.1,
    0.45,
  );

  f.part(
    "box",
    "#ffe0a2",
    x,
    y + 2.83,
    z,
    0.28,
    0.46,
    0.28,
    0,
    0,
    0,
    "",
    0.75,
  );

  f.part(
    "cone",
    "#506559",
    x,
    y + 3.23,
    z,
    0.37,
    0.25,
    0.37,
    0,
    Math.PI / 4,
  );

  f.part(
    "box",
    "#506559",
    x,
    y + 0.1,
    z,
    0.36,
    0.2,
    0.36,
  );
}

export function furnishing(
  f,
  type,
  x,
  y,
  z,
  r = 0,
) {
  if (type === "lamp") {
    return lamp(
      f,
      x,
      y,
      z,
    );
  }

  if (type === "fence") {
    for (
      const d of [-0.8, 0.8]
    ) {
      f.part(
        "box",
        "#947c56",
        x +
          Math.cos(r) * d,
        y + 0.65,
        z -
          Math.sin(r) * d,
        0.13,
        1.3,
        0.13,
        0,
        0,
        0,
        "wood",
      );
    }

    for (
      const yy of [0.4, 0.95]
    ) {
      f.part(
        "box",
        "#b7a177",
        x,
        y + yy,
        z,
        1.9,
        0.12,
        0.12,
        0,
        r,
        0,
        "wood",
      );
    }
  } else if (
    type === "bed"
  ) {
    f.part(
      "box",
      "#a88c62",
      x,
      y + 0.25,
      z,
      1.8,
      0.5,
      1,
      0,
      r,
      0,
      "wood",
    );

    f.part(
      "box",
      "#645540",
      x,
      y + 0.51,
      z,
      1.6,
      0.04,
      0.8,
      0,
      r,
    );

    for (
      let i = 0;
      i < 12;
      i++
    ) {
      flower(
        f,
        x +
          Math.sin(i * 5) *
            0.65,
        y + 0.5,
        z +
          Math.cos(i * 3) *
            0.32,
        i % 2
          ? "#edc286"
          : "#d9a5a0",
        1.5,
      );
    }
  } else {
    const yy =
      type === "workbench"
        ? 1.25
        : 0.6;

    f.part(
      "box",
      "#b39a6c",
      x,
      y + yy,
      z,
      1.9,
      0.18,
      0.8,
      0,
      r,
      0,
      "wood",
    );

    for (
      const dx of [-0.7, 0.7]
    ) {
      for (
        const dz of [
          -0.26,
          0.26,
        ]
      ) {
        f.part(
          "box",
          "#766344",
          x +
            dx *
              Math.cos(r) +
            dz *
              Math.sin(r),
          y + yy / 2,
          z -
            dx *
              Math.sin(r) +
            dz *
              Math.cos(r),
          0.13,
          yy,
          0.13,
        );
      }
    }

    if (type === "bench") {
      f.part(
        "box",
        "#ab936b",
        x -
          Math.sin(r) *
            0.33,
        y + 1.05,
        z -
          Math.cos(r) *
            0.33,
        1.9,
        0.42,
        0.1,
        0,
        r,
        0,
        "wood",
      );
    }

    if (
      type === "workbench"
    ) {
      f.part(
        "box",
        "#6d6f5a",
        x + 0.5,
        y + 1.46,
        z,
        0.4,
        0.24,
        0.3,
      );

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

function humanFace(
  f,
  skin,
  eyeColor = "#28352f",
) {
  for (
    const s of [-1, 1]
  ) {
    f.part(
      "hi",
      "#f7f1e7",
      s * 0.092,
      0.025,
      0.222,
      0.043,
      0.052,
      0.025,
      0.05,
      0,
      0,
      "skin",
    );

    f.part(
      "hi",
      eyeColor,
      s * 0.094,
      0.024,
      0.244,
      0.021,
      0.032,
      0.016,
      0,
      0,
      0,
      "skin",
    );

    f.part(
      "hi",
      "#ffffff",
      s * 0.087,
      0.041,
      0.254,
      0.007,
      0.009,
      0.006,
      0,
      0,
      0,
      "skin",
    );

    f.part(
      "soft",
      "#674b40",
      s * 0.092,
      0.096,
      0.221,
      0.068,
      0.012,
      0.014,
      0,
      0,
      s * 0.05,
      "skin",
    );

    f.part(
      "soft",
      "#d59a91",
      s * 0.145,
      -0.035,
      0.194,
      0.028,
      0.018,
      0.014,
      0,
      0,
      0,
      "skin",
    );
  }

  f.part(
    "hi",
    skin,
    0,
    -0.002,
    0.238,
    0.031,
    0.05,
    0.024,
    0.28,
    0,
    0,
    "skin",
  );

  f.part(
    "soft",
    "#a86660",
    0,
    -0.09,
    0.221,
    0.052,
    0.016,
    0.012,
    0,
    0,
    0,
    "skin",
  );

  f.part(
    "soft",
    "#754b45",
    0,
    -0.085,
    0.231,
    0.025,
    0.007,
    0.008,
    0,
    0,
    0,
    "skin",
  );
}

function creatureEyes(
  f,
  y,
  z,
  spread = 0.17,
  scale = 1,
  iris = "#263630",
) {
  for (
    const s of [-1, 1]
  ) {
    f.part(
      "hi",
      "#f7f2e8",
      s * spread,
      y,
      z,
      0.064 * scale,
      0.074 * scale,
      0.042 * scale,
      0.06,
      -s * 0.13,
      0,
      "creature",
    );

    f.part(
      "hi",
      iris,
      s * spread,
      y - 0.003,
      z + 0.035 * scale,
      0.034 * scale,
      0.046 * scale,
      0.022 * scale,
      0,
      0,
      0,
      "creature",
    );

    f.part(
      "hi",
      "#ffffff",
      s *
        (spread - 0.011),
      y +
        0.022 * scale,
      z +
        0.052 * scale,
      0.011 * scale,
      0.014 * scale,
      0.008 * scale,
      0,
      0,
      0,
      "creature",
    );
  }
}

function creatureMuzzle(
  f,
  accent,
  y = -0.07,
  z = 0.27,
  scale = 1,
  nose = "#60453d",
) {
  f.part(
    "hi",
    accent,
    -0.065 * scale,
    y,
    z,
    0.115 * scale,
    0.09 * scale,
    0.11 * scale,
    0,
    0,
    0,
    "creature",
  );

  f.part(
    "hi",
    accent,
    0.065 * scale,
    y,
    z,
    0.115 * scale,
    0.09 * scale,
    0.11 * scale,
    0,
    0,
    0,
    "creature",
  );

  f.part(
    "hi",
    nose,
    0,
    y +
      0.025 * scale,
    z +
      0.102 * scale,
    0.052 * scale,
    0.038 * scale,
    0.035 * scale,
    0.15,
    0,
    0,
    "creature",
  );

  f.part(
    "soft",
    "#9f6158",
    0,
    y -
      0.07 * scale,
    z +
      0.09 * scale,
    0.052 * scale,
    0.015 * scale,
    0.012 * scale,
    0,
    0,
    0,
    "creature",
  );
}

function addQuadrupedLeg(
  root,
  x,
  z,
  color,
  accent,
  legs,
  slim = 1,
) {
  const hip =
    new T.Group();

  hip.position.set(
    x,
    0.42,
    z,
  );

  root.add(hip);

  const f =
    new Factory(hip);

  f.part(
    "hi",
    color,
    0,
    -0.1,
    0,
    0.115 * slim,
    0.22,
    0.12 * slim,
    0,
    0,
    0,
    "creature",
  );

  const lower =
    new T.Group();

  lower.position.set(
    0,
    -0.22,
    0.015,
  );

  hip.add(lower);

  const lf =
    new Factory(lower);

  lf.part(
    "hi",
    color,
    0,
    -0.09,
    0,
    0.095 * slim,
    0.17,
    0.1 * slim,
    0,
    0,
    0,
    "creature",
  );

  lf.part(
    "hi",
    accent,
    0,
    -0.19,
    0.07,
    0.11 * slim,
    0.055,
    0.15 * slim,
    0,
    0,
    0,
    "creature",
  );

  legs.push({
    hip,
    lower,
  });
}

export function human(
  color = "#698895",
  skin = "#ccaa83",
  hat = true,
) {
  const g =
    new T.Group();

  const model =
    new T.Group();

  g.add(model);

  const torso =
    new T.Group();

  torso.position.set(
    0,
    1.08,
    0,
  );

  model.add(torso);

  const tf =
    new Factory(torso);

  tf.part(
    "hi",
    color,
    0,
    0.14,
    0,
    0.29,
    0.34,
    0.2,
    0,
    0,
    0,
    "cloth",
  );

  tf.part(
    "hi",
    color,
    0,
    -0.12,
    0,
    0.25,
    0.25,
    0.19,
    0,
    0,
    0,
    "cloth",
  );

  tf.part(
    "hi",
    "#ead8ae",
    0,
    0.39,
    0.15,
    0.15,
    0.07,
    0.035,
    -0.3,
    0,
    0,
    "cloth",
  );

  tf.part(
    "torus",
    "#ccb17e",
    0,
    -0.01,
    0,
    0.245,
    0.245,
    0.245,
    Math.PI / 2,
    0,
    0,
    "cloth",
  );

  tf.part(
    "soft",
    "#765942",
    0,
    -0.33,
    -0.11,
    0.19,
    0.13,
    0.12,
    0.18,
    0,
    0,
    "wood",
  );

  const backpack =
    tf.part(
      "hi",
      "#987254",
      0,
      -0.29,
      -0.22,
      0.24,
      0.25,
      0.13,
      0,
      0,
      0,
      "wood",
    );

  const neck =
    new T.Group();

  neck.position.set(
    0,
    1.48,
    0.015,
  );

  model.add(neck);

  new Factory(neck).part(
    "hi",
    skin,
    0,
    0,
    0,
    0.075,
    0.085,
    0.07,
    0,
    0,
    0,
    "skin",
  );

  const head =
    new T.Group();

  head.position.set(
    0,
    1.66,
    0.035,
  );

  model.add(head);

  const hf =
    new Factory(head);

  hf.part(
    "hi",
    skin,
    0,
    0,
    0,
    0.235,
    0.275,
    0.215,
    0,
    0,
    0,
    "skin",
  );

  hf.part(
    "hi",
    skin,
    0,
    -0.115,
    0.13,
    0.13,
    0.09,
    0.105,
    0,
    0,
    0,
    "skin",
  );

  for (
    const s of [-1, 1]
  ) {
    hf.part(
      "hi",
      skin,
      s * 0.232,
      0,
      0.005,
      0.043,
      0.068,
      0.04,
      0,
      0,
      0,
      "skin",
    );
  }

  hf.part(
    "hi",
    "#654b42",
    0,
    0.16,
    -0.035,
    0.255,
    0.15,
    0.205,
    0,
    0,
    0,
    "skin",
  );

  hf.part(
    "hi",
    "#654b42",
    -0.175,
    0.055,
    -0.015,
    0.075,
    0.15,
    0.07,
    0.05,
    0,
    0.13,
    "skin",
  );

  hf.part(
    "hi",
    "#654b42",
    0.175,
    0.055,
    -0.015,
    0.075,
    0.15,
    0.07,
    0.05,
    0,
    -0.13,
    "skin",
  );

  hf.part(
    "soft",
    "#654b42",
    -0.12,
    0.19,
    0.06,
    0.09,
    0.06,
    0.11,
    -0.3,
    0.15,
    0,
    "skin",
  );

  hf.part(
    "soft",
    "#654b42",
    0.11,
    0.19,
    0.06,
    0.09,
    0.06,
    0.11,
    -0.3,
    -0.15,
    0,
    "skin",
  );

  humanFace(
    hf,
    skin,
  );

  if (hat) {
    hf.part(
      "cylinder",
      "#d4b776",
      0,
      0.25,
      0,
      0.42,
      0.055,
      0.37,
      0,
      0,
      0,
      "cloth",
    );

    hf.part(
      "taper",
      "#d9c18b",
      0,
      0.36,
      0,
      0.245,
      0.22,
      0.235,
      0,
      0,
      0,
      "cloth",
    );

    hf.part(
      "torus",
      "#5f7c68",
      0,
      0.276,
      0,
      0.265,
      0.265,
      0.265,
      Math.PI / 2,
      0,
      0,
      "cloth",
    );
  }

  const arms = [];

  for (
    const s of [-1, 1]
  ) {
    const shoulder =
      new T.Group();

    shoulder.position.set(
      s * 0.285,
      1.33,
      0,
    );

    model.add(shoulder);

    const sf =
      new Factory(shoulder);

    sf.part(
      "hi",
      color,
      0,
      -0.09,
      0,
      0.105,
      0.2,
      0.095,
      0.03,
      0,
      s * 0.04,
      "cloth",
    );

    const elbow =
      new T.Group();

    elbow.position.set(
      0,
      -0.32,
      0.015,
    );

    shoulder.add(elbow);

    const ef =
      new Factory(elbow);

    ef.part(
      "hi",
      color,
      0,
      -0.08,
      0,
      0.092,
      0.18,
      0.085,
      0.02,
      0,
      s * 0.025,
      "cloth",
    );

    ef.part(
      "hi",
      skin,
      0,
      -0.245,
      0.025,
      0.073,
      0.085,
      0.07,
      0,
      0,
      0,
      "skin",
    );

    ef.part(
      "hi",
      skin,
      s * 0.024,
      -0.3,
      0.065,
      0.052,
      0.035,
      0.045,
      0,
      0,
      0,
      "skin",
    );

    arms.push(shoulder);
  }

  const legs = [];

  for (
    const s of [-1, 1]
  ) {
    const hip =
      new T.Group();

    hip.position.set(
      s * 0.115,
      0.74,
      0,
    );

    model.add(hip);

    const lf =
      new Factory(hip);

    lf.part(
      "hi",
      "#504d49",
      0,
      -0.15,
      0,
      0.105,
      0.25,
      0.095,
      0,
      0,
      0,
      "cloth",
    );

    const knee =
      new T.Group();

    knee.position.set(
      0,
      -0.38,
      0.01,
    );

    hip.add(knee);

    const kf =
      new Factory(knee);

    kf.part(
      "hi",
      "#504d49",
      0,
      -0.11,
      0,
      0.095,
      0.2,
      0.088,
      0,
      0,
      0,
      "cloth",
    );

    kf.part(
      "hi",
      "#654d3c",
      0,
      -0.28,
      0.09,
      0.14,
      0.075,
      0.21,
      0,
      0,
      0,
      "skin",
    );

    legs.push({
      hip,
      knee,
    });
  }

  g.userData = {
    arms,

    legs:
      legs.map(
        (v) => v.hip,
      ),

    backpack,

    animate(
      t,
      moving,
    ) {
      const walk =
        moving
          ? Math.sin(
              t * 8.4,
            )
          : 0;

      const bob =
        moving
          ? Math.abs(
              Math.sin(
                t * 8.4,
              ),
            ) * 0.024
          : Math.sin(
              t * 1.5,
            ) * 0.004;

      const sway =
        moving
          ? Math.sin(
              t * 4.2,
            ) * 0.032
          : Math.sin(
              t * 1.25,
            ) * 0.01;

      model.position.y =
        bob;

      torso.rotation.z =
        sway;

      torso.rotation.x =
        moving
          ? Math.sin(
              t * 8.4,
            ) * 0.02
          : 0;

      head.rotation.z =
        -sway * 0.5;

      head.rotation.y =
        Math.sin(
          t * 1.1,
        ) * 0.018;

      arms.forEach(
        (
          arm,
          i,
        ) => {
          const phase =
            walk *
            (i === 0
              ? 1
              : -1);

          arm.rotation.x =
            -phase * 0.48 +
            (moving
              ? 0
              : Math.sin(
                  t * 1.2 +
                    i,
                ) *
                0.025);

          arm.rotation.z =
            (i === 0
              ? 1
              : -1) *
              0.055 +
            sway * 0.4;
        },
      );

      legs.forEach(
        (
          leg,
          i,
        ) => {
          const phase =
            walk *
            (i === 0
              ? -1
              : 1);

          leg.hip.rotation.x =
            phase * 0.52;

          leg.knee.rotation.x =
            Math.max(
              0,
              -phase,
            ) * 0.4;
        },
      );
    },
  };

  return g;
}

export function creature(
  s,
  scale = 1,
) {
  const g =
    new T.Group();

  const model =
    new T.Group();

  g.add(model);

  const c =
    s.color;

  const a =
    s.accent;

  const legs = [];
  const ears = [];
  const extras = [];

  const body =
    new T.Group();

  model.add(body);

  const bf =
    new Factory(body);

  const head =
    new T.Group();

  model.add(head);

  const hf =
    new Factory(head);

  function addAnimalHead({
    y = 0.97,
    z = 0.42,
    sx = 0.34,
    sy = 0.31,
    sz = 0.31,
    muzzle = a,
    eyeSpread = 0.15,
    iris = "#24352f",
  } = {}) {
    head.position.set(
      0,
      y,
      z,
    );

    hf.part(
      "hi",
      c,
      0,
      0,
      0,
      sx,
      sy,
      sz,
      0,
      0,
      0,
      "creature",
    );

    creatureEyes(
      hf,
      0.045,
      sz * 0.82,
      eyeSpread,
      0.9,
      iris,
    );

    creatureMuzzle(
      hf,
      muzzle,
      -0.07,
      sz * 0.82,
      0.85,
    );
  }

  function addPointedEars(
    color = c,
    inner = a,
    tall = 1,
  ) {
    for (
      const q of [-1, 1]
    ) {
      const e =
        new T.Group();

      e.position.set(
        q * 0.21,
        head.position.y +
          0.22,
        head.position.z -
          0.02,
      );

      model.add(e);

      const ef =
        new Factory(e);

      ef.part(
        "cone",
        color,
        0,
        0.12 * tall,
        0,
        0.12,
        0.3 * tall,
        0.1,
        0,
        0,
        -q * 0.22,
        "creature",
      );

      ef.part(
        "cone",
        inner,
        0,
        0.11 * tall,
        0.045,
        0.055,
        0.2 * tall,
        0.04,
        0,
        0,
        -q * 0.22,
        "creature",
      );

      ears.push(e);
    }
  }

  function addRoundEars() {
    for (
      const q of [-1, 1]
    ) {
      const e =
        new T.Group();

      e.position.set(
        q * 0.23,
        head.position.y +
          0.15,
        head.position.z -
          0.01,
      );

      model.add(e);

      const ef =
        new Factory(e);

      ef.part(
        "hi",
        c,
        0,
        0,
        0,
        0.11,
        0.14,
        0.07,
        0,
        0,
        -q * 0.2,
        "creature",
      );

      ef.part(
        "hi",
        a,
        0,
        0.005,
        0.04,
        0.055,
        0.08,
        0.035,
        0,
        0,
        -q * 0.2,
        "creature",
      );

      ears.push(e);
    }
  }

  function addLeafEars() {
    for (
      const q of [-1, 1]
    ) {
      const e =
        new T.Group();

      e.position.set(
        q * 0.2,
        head.position.y +
          0.21,
        head.position.z -
          0.01,
      );

      model.add(e);

      const ef =
        new Factory(e);

      ef.part(
        "soft",
        "#648858",
        0,
        0.16,
        0,
        0.1,
        0.35,
        0.055,
        0,
        0,
        -q * 0.38,
        "leaf",
      );

      ef.part(
        "soft",
        a,
        0,
        0.17,
        0.035,
        0.03,
        0.24,
        0.018,
        0,
        0,
        -q * 0.38,
        "leaf",
      );

      ears.push(e);
    }
  }

  function addTail(
    color = c,
    accent = a,
    fluffy = false,
  ) {
    const tail =
      new T.Group();

    tail.position.set(
      0,
      0.67,
      -0.55,
    );

    model.add(tail);

    const tf =
      new Factory(tail);

    tf.part(
      "hi",
      color,
      0,
      0.02,
      -0.14,
      fluffy
        ? 0.14
        : 0.1,
      fluffy
        ? 0.14
        : 0.1,
      0.3,
      -0.3,
      0,
      0,
      "creature",
    );

    tf.part(
      "hi",
      accent,
      0,
      0.09,
      -0.36,
      fluffy
        ? 0.17
        : 0.11,
      fluffy
        ? 0.16
        : 0.1,
      0.18,
      -0.42,
      0,
      0,
      "creature",
    );

    extras.push(tail);

    return tail;
  }

  if (s.id === "brasile") {
    bf.part(
      "hi",
      c,
      0,
      0.62,
      -0.05,
      0.42,
      0.34,
      0.67,
      0,
      0,
      0,
      "creature",
    );

    bf.part(
      "hi",
      a,
      0,
      0.51,
      0.29,
      0.25,
      0.16,
      0.25,
      0,
      0,
      0,
      "creature",
    );

    bf.part(
      "hi",
      "#b87355",
      0,
      0.76,
      -0.1,
      0.33,
      0.16,
      0.38,
      0,
      0,
      0,
      "creature",
    );

    addAnimalHead({
      y: 0.98,
      z: 0.43,
      sx: 0.3,
      sy: 0.28,
      sz: 0.29,
      muzzle: a,
      eyeSpread: 0.135,
      iris: "#3b2d25",
    });

    addPointedEars(
      c,
      "#efb68b",
      1.05,
    );

    for (
      const x of [-0.25, 0.25]
    ) {
      addQuadrupedLeg(
        model,
        x,
        0.28,
        c,
        a,
        legs,
        0.9,
      );

      addQuadrupedLeg(
        model,
        x,
        -0.32,
        c,
        a,
        legs,
        0.95,
      );
    }

    const tail =
      addTail(
        c,
        a,
        true,
      );

    tail.rotation.x =
      -0.16;

    const tf =
      new Factory(tail);

    tf.part(
      "hi",
      "#f3c471",
      0,
      0.17,
      -0.48,
      0.09,
      0.1,
      0.14,
      -0.4,
      0,
      0,
      "creature",
      0.2,
    );
  } else if (
    s.id === "velune"
  ) {
    bf.part(
      "hi",
      c,
      0,
      0.61,
      -0.03,
      0.43,
      0.36,
      0.65,
      0,
      0,
      0,
      "creature",
    );

    bf.part(
      "hi",
      a,
      0,
      0.49,
      0.3,
      0.23,
      0.16,
      0.22,
      0,
      0,
      0,
      "creature",
    );

    addAnimalHead({
      y: 1.0,
      z: 0.42,
      sx: 0.29,
      sy: 0.29,
      sz: 0.27,
      muzzle: a,
      eyeSpread: 0.13,
      iris: "#284333",
    });

    addLeafEars();

    for (
      const x of [-0.24, 0.24]
    ) {
      addQuadrupedLeg(
        model,
        x,
        0.27,
        c,
        a,
        legs,
        0.88,
      );

      addQuadrupedLeg(
        model,
        x,
        -0.31,
        c,
        a,
        legs,
        0.9,
      );
    }

    bf.part(
      "soft",
      "#7f9b62",
      -0.17,
      0.9,
      -0.18,
      0.18,
      0.07,
      0.22,
      0.25,
      0,
      0.2,
      "leaf",
    );

    bf.part(
      "soft",
      "#8ca76b",
      0.04,
      0.94,
      -0.22,
      0.2,
      0.07,
      0.25,
      -0.2,
      0,
      -0.1,
      "leaf",
    );

    bf.part(
      "soft",
      "#76905a",
      0.2,
      0.86,
      -0.12,
      0.15,
      0.06,
      0.2,
      0.3,
      0,
      -0.25,
      "leaf",
    );

    addTail(
      "#789b61",
      a,
      false,
    );
  } else if (
    s.id === "ondril" ||
    s.id === "coralys"
  ) {
    const coral =
      s.id === "coralys";

    bf.part(
      "hi",
      c,
      0,
      0.53,
      -0.06,
      0.43,
      0.3,
      0.75,
      0,
      0,
      0,
      "creature",
    );

    bf.part(
      "hi",
      a,
      0,
      0.42,
      0.3,
      0.24,
      0.13,
      0.25,
      0,
      0,
      0,
      "creature",
    );

    addAnimalHead({
      y: 0.88,
      z: 0.43,
      sx: 0.31,
      sy: 0.27,
      sz: 0.31,
      muzzle: a,
      eyeSpread: 0.14,
      iris: "#203e42",
    });

    addRoundEars();

    for (
      const x of [-0.27, 0.27]
    ) {
      addQuadrupedLeg(
        model,
        x,
        0.24,
        c,
        a,
        legs,
        0.8,
      );

      addQuadrupedLeg(
        model,
        x,
        -0.31,
        c,
        a,
        legs,
        0.82,
      );
    }

    const tail =
      new T.Group();

    tail.position.set(
      0,
      0.53,
      -0.61,
    );

    model.add(tail);

    const tf =
      new Factory(tail);

    tf.part(
      "hi",
      c,
      0,
      0,
      -0.2,
      0.19,
      0.08,
      0.42,
      -0.15,
      0,
      0,
      "creature",
    );

    tf.part(
      "hi",
      a,
      0,
      0.01,
      -0.5,
      0.28,
      0.05,
      0.2,
      0,
      0,
      0.42,
      "creature",
    );

    extras.push(tail);

    if (coral) {
      for (
        const q of [-1, 1]
      ) {
        for (
          let j = 0;
          j < 3;
          j++
        ) {
          hf.part(
            "soft",
            "#b7ddd0",
            q *
              (0.25 +
                j * 0.045),
            0.05 +
              j * 0.07,
            -0.03,
            0.055,
            0.16,
            0.045,
            0,
            0,
            -q *
              (0.35 +
                j * 0.1),
            "leaf",
          );
        }
      }
    } else {
      hf.part(
        "torus",
        a,
        0,
        0.28,
        0.02,
        0.21,
        0.21,
        0.21,
        Math.PI / 2,
        0,
        0,
        "creature",
      );
    }
  } else if (
    s.id === "moussier"
  ) {
    bf.part(
      "hi",
      c,
      0,
      0.49,
      -0.03,
      0.46,
      0.3,
      0.62,
      0,
      0,
      0,
      "creature",
    );

    bf.part(
      "hi",
      "#718761",
      0,
      0.7,
      -0.09,
      0.54,
      0.32,
      0.57,
      0,
      0,
      0,
      "creature",
    );

    for (
      let i = 0;
      i < 7;
      i++
    ) {
      const ang =
        i * 0.9;

      bf.part(
        "hi",
        "#a7b484",
        Math.sin(ang) *
          0.29,
        0.83 +
          Math.cos(
            ang * 1.7,
          ) *
            0.04,
        -0.08 +
          Math.cos(ang) *
            0.26,
        0.12,
        0.07,
        0.13,
        0,
        ang,
        0,
        "creature",
      );
    }

    addAnimalHead({
      y: 0.74,
      z: 0.48,
      sx: 0.27,
      sy: 0.25,
      sz: 0.27,
      muzzle: a,
      eyeSpread: 0.12,
      iris: "#34351f",
    });

    addRoundEars();

    for (
      const x of [-0.3, 0.3]
    ) {
      addQuadrupedLeg(
        model,
        x,
        0.24,
        c,
        a,
        legs,
        0.75,
      );

      addQuadrupedLeg(
        model,
        x,
        -0.3,
        c,
        a,
        legs,
        0.75,
      );
    }

    addTail(
      c,
      a,
      false,
    );
  } else if (
    s.id === "vrille"
  ) {
    bf.part(
      "hi",
      c,
      0,
      0.65,
      -0.02,
      0.38,
      0.48,
      0.4,
      0,
      0,
      0,
      "creature",
    );

    bf.part(
      "hi",
      a,
      0,
      0.53,
      0.28,
      0.22,
      0.25,
      0.18,
      0,
      0,
      0,
      "creature",
    );

    head.position.set(
      0,
      1.0,
      0.25,
    );

    hf.part(
      "hi",
      c,
      0,
      0,
      0,
      0.28,
      0.27,
      0.25,
      0,
      0,
      0,
      "creature",
    );

    creatureEyes(
      hf,
      0.04,
      0.22,
      0.12,
      0.82,
      "#263a34",
    );

    hf.part(
      "cone",
      "#d7a765",
      0,
      -0.035,
      0.34,
      0.08,
      0.24,
      0.08,
      Math.PI / 2,
      0,
      0,
      "creature",
    );

    for (
      const q of [-1, 1]
    ) {
      const wing =
        new T.Group();

      wing.position.set(
        q * 0.23,
        0.72,
        -0.02,
      );

      model.add(wing);

      const wf =
        new Factory(wing);

      for (
        let j = 0;
        j < 4;
        j++
      ) {
        wf.part(
          "hi",
          a,
          q *
            (0.14 +
              j * 0.08),
          0.02 -
            j * 0.025,
          -j * 0.09,
          0.2,
          0.055,
          0.12,
          0,
          q * 0.35,
          -q *
            (0.22 +
              j * 0.05),
          "creature",
        );
      }

      extras.push(wing);
    }

    for (
      const x of [-0.12, 0.12]
    ) {
      const leg =
        new T.Group();

      leg.position.set(
        x,
        0.24,
        0.08,
      );

      model.add(leg);

      const lf =
        new Factory(leg);

      lf.part(
        "hi",
        "#806c50",
        0,
        -0.1,
        0,
        0.045,
        0.15,
        0.045,
        0,
        0,
        0,
        "creature",
      );

      lf.part(
        "hi",
        "#806c50",
        0,
        -0.2,
        0.06,
        0.08,
        0.035,
        0.12,
        0,
        0,
        0,
        "creature",
      );

      legs.push({
        hip: leg,
        lower: leg,
      });
    }

    const tail =
      new T.Group();

    tail.position.set(
      0,
      0.57,
      -0.34,
    );

    model.add(tail);

    const tf =
      new Factory(tail);

    for (
      const q of [-1, 0, 1]
    ) {
      tf.part(
        "hi",
        a,
        q * 0.09,
        -0.01,
        -0.18,
        0.07,
        0.04,
        0.24,
        -0.2,
        0,
        q * 0.16,
        "creature",
      );
    }

    extras.push(tail);
  } else if (
    s.id === "lumignon"
  ) {
    bf.part(
      "hi",
      c,
      0,
      0.61,
      -0.04,
      0.38,
      0.34,
      0.62,
      0,
      0,
      0,
      "creature",
    );

    bf.part(
      "hi",
      a,
      0,
      0.47,
      0.28,
      0.23,
      0.14,
      0.22,
      0,
      0,
      0,
      "creature",
    );

    addAnimalHead({
      y: 0.98,
      z: 0.4,
      sx: 0.29,
      sy: 0.28,
      sz: 0.28,
      muzzle: a,
      eyeSpread: 0.13,
      iris: "#584627",
    });

    addPointedEars(
      c,
      a,
      0.9,
    );

    for (
      const x of [-0.23, 0.23]
    ) {
      addQuadrupedLeg(
        model,
        x,
        0.27,
        c,
        a,
        legs,
        0.86,
      );

      addQuadrupedLeg(
        model,
        x,
        -0.3,
        c,
        a,
        legs,
        0.86,
      );
    }

    const halo =
      new T.Group();

    halo.position.set(
      0,
      1.25,
      0.05,
    );

    model.add(halo);

    const lf =
      new Factory(halo);

    lf.part(
      "torus",
      "#f5d889",
      0,
      0,
      0,
      0.25,
      0.25,
      0.25,
      Math.PI / 2,
      0,
      0,
      "",
      0.35,
    );

    lf.part(
      "hi",
      "#fff1ae",
      0,
      0,
      0,
      0.07,
      0.08,
      0.07,
      0,
      0,
      0,
      "",
      0.55,
    );

    extras.push(halo);

    addTail(
      c,
      "#fff0b6",
      true,
    );
  } else {
    bf.part(
      "hi",
      c,
      0,
      0.66,
      -0.05,
      0.55,
      0.43,
      0.75,
      0,
      0,
      0,
      "creature",
    );

    bf.part(
      "hi",
      a,
      0,
      0.52,
      0.3,
      0.27,
      0.16,
      0.25,
      0,
      0,
      0,
      "creature",
    );

    addAnimalHead({
      y: 1.04,
      z: 0.43,
      sx: 0.33,
      sy: 0.31,
      sz: 0.3,
      muzzle: a,
      eyeSpread: 0.145,
      iris: "#23392f",
    });

    addLeafEars();

    for (
      const x of [-0.3, 0.3]
    ) {
      addQuadrupedLeg(
        model,
        x,
        0.28,
        c,
        a,
        legs,
        1,
      );

      addQuadrupedLeg(
        model,
        x,
        -0.33,
        c,
        a,
        legs,
        1,
      );
    }

    for (
      const q of [-1, 1]
    ) {
      for (
        let j = 0;
        j < 3;
        j++
      ) {
        const branch =
          new T.Group();

        branch.position.set(
          q *
            (0.16 +
              j * 0.06),
          1.28 +
            j * 0.1,
          0.14 -
            j * 0.03,
        );

        model.add(branch);

        const rf =
          new Factory(branch);

        rf.part(
          "taper",
          "#765c43",
          0,
          0.12,
          0,
          0.035,
          0.28,
          0.035,
          0,
          0,
          -q *
            (0.3 +
              j * 0.08),
          "bark",
        );
      }
    }

    addTail(
      "#577f67",
      "#e6ba6f",
      true,
    );
  }

  if (
    s.id === "gardien" ||
    s.shape === "guardian"
  ) {
    g.scale.setScalar(2.15);

    const gf =
      new Factory(model);

    gf.part(
      "torus",
      "#ddbb74",
      0,
      1.36,
      0.31,
      0.44,
      0.44,
      0.44,
      Math.PI / 2,
      0,
      0,
      "",
      0.25,
    );
  } else {
    g.scale.setScalar(scale);
  }

  g.userData = {
    animate(
      t,
      moving,
    ) {
      const walk =
        moving
          ? Math.sin(
              t * 7.2,
            )
          : 0;

      model.position.y =
        moving
          ? Math.abs(
              Math.sin(
                t * 7.2,
              ),
            ) * 0.018
          : Math.sin(
              t * 1.7,
            ) * 0.006;

      body.rotation.x =
        walk * 0.025;

      head.rotation.x =
        moving
          ? -walk * 0.035
          : Math.sin(
              t * 1.5,
            ) * 0.014;

      head.rotation.y =
        Math.sin(
          t * 1.15,
        ) * 0.025;

      legs.forEach(
        (
          leg,
          i,
        ) => {
          const phase =
            walk *
            (i % 2 === 0
              ? 1
              : -1);

          leg.hip.rotation.x =
            phase * 0.38;

          if (
            leg.lower &&
            leg.lower !== leg.hip
          ) {
            leg.lower.rotation.x =
              Math.max(
                0,
                -phase,
              ) * 0.28;
          }
        },
      );

      ears.forEach(
        (
          ear,
          i,
        ) => {
          ear.rotation.x =
            Math.sin(
              t * 2.4 +
                i,
            ) * 0.055;

          ear.rotation.z +=
            (i === 0
              ? -1
              : 1) *
            Math.sin(
              t * 1.6 +
                i,
            ) *
            0.002;
        },
      );

      extras.forEach(
        (
          extra,
          i,
        ) => {
          extra.rotation.y =
            Math.sin(
              t * 1.8 +
                i,
            ) * 0.06;

          extra.rotation.x =
            Math.sin(
              t * 2.2 +
                i,
            ) * 0.035;
        },
      );
    },
  };

  return g;
}
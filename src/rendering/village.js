import { T, random, house, flower, furnishing } from "./art.js";

/*
 * Ambrelune - terrain multicouche haute qualité
 *
 * Layers réellement texturés :
 *  - herbe dense seamless (albédo + detail + normal)
 *  - terre battue seamless (albédo + detail + normal)
 *  - mousse / bordure seamless (albédo + detail + normal)
 *
 * Les textures sont des fichiers image séparés pour garder un vrai niveau de détail.
 * Le shader les mélange à plusieurs échelles afin d'éviter le damier / la répétition.
 * L'eau, les cultures et le reste du monde ne sont pas modifiés ici.
 */

const TERRAIN_ROOT = new URL("../../assets/terrain/", import.meta.url);
let terrainTextures = null;

function loadTerrainTexture(name, color = true) {
  const loader = new T.TextureLoader();
  const texture = loader.load(new URL(name, TERRAIN_ROOT).href);
  texture.wrapS = T.RepeatWrapping;
  texture.wrapT = T.RepeatWrapping;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.magFilter = T.LinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = 8;
  if (color) texture.colorSpace = T.SRGBColorSpace;
  return texture;
}

function getTerrainTextures() {
  if (terrainTextures) return terrainTextures;

  terrainTextures = {
    grass: loadTerrainTexture("grass_albedo.png", true),
    grassDetail: loadTerrainTexture("grass_detail.png", false),
    grassNormal: loadTerrainTexture("grass_normal.png", false),

    soil: loadTerrainTexture("soil_albedo.png", true),
    soilDetail: loadTerrainTexture("soil_detail.png", false),
    soilNormal: loadTerrainTexture("soil_normal.png", false),

    moss: loadTerrainTexture("moss_albedo.png", true),
    mossDetail: loadTerrainTexture("moss_detail.png", false),
    mossNormal: loadTerrainTexture("moss_normal.png", false),
  };

  return terrainTextures;
}

export function groundMaterial() {
  const tex = getTerrainTextures();

  /*
   * normalMap active le support des normal maps dans MeshStandardMaterial.
   * normalScale=0 neutralise le sampling standard : notre shader applique ensuite
   * le mélange correct herbe / terre / mousse avec ses propres coordonnées monde.
   */
  const material = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0,
    normalMap: tex.grassNormal,
    normalScale: new T.Vector2(0, 0),
  });

  material.userData.lowQuality = false;
  material.userData.ambLowUniform = null;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.ambLowQuality = { value: material.userData.lowQuality ? 1 : 0 };
    material.userData.ambLowUniform = shader.uniforms.ambLowQuality;
    shader.uniforms.ambGrass = { value: tex.grass };
    shader.uniforms.ambGrassDetail = { value: tex.grassDetail };
    shader.uniforms.ambGrassNormal = { value: tex.grassNormal };

    shader.uniforms.ambSoil = { value: tex.soil };
    shader.uniforms.ambSoilDetail = { value: tex.soilDetail };
    shader.uniforms.ambSoilNormal = { value: tex.soilNormal };

    shader.uniforms.ambMoss = { value: tex.moss };
    shader.uniforms.ambMossDetail = { value: tex.mossDetail };
    shader.uniforms.ambMossNormal = { value: tex.mossNormal };

    shader.vertexShader =
      "varying vec3 ambGroundPosition;\n" + shader.vertexShader;

    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      "#include <begin_vertex>\nambGroundPosition = position;",
    );

    shader.fragmentShader = `
      uniform float ambLowQuality;
      uniform sampler2D ambGrass;
      uniform sampler2D ambGrassDetail;
      uniform sampler2D ambGrassNormal;

      uniform sampler2D ambSoil;
      uniform sampler2D ambSoilDetail;
      uniform sampler2D ambSoilNormal;

      uniform sampler2D ambMoss;
      uniform sampler2D ambMossDetail;
      uniform sampler2D ambMossNormal;

      varying vec3 ambGroundPosition;

      float ambHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1,311.7))) * 43758.5453123);
      }

      float ambNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f*f*(3.0-2.0*f);

        float a = ambHash(i);
        float b = ambHash(i + vec2(1.0,0.0));
        float c = ambHash(i + vec2(0.0,1.0));
        float d = ambHash(i + vec2(1.0,1.0));

        return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
      }

      float ambFbm(vec2 p) {
        float v = 0.0;
        float a = 0.5;
        for(int i=0;i<5;i++) {
          v += ambNoise(p) * a;
          p = p * 2.03 + vec2(7.13, 11.71);
          a *= 0.5;
        }
        return v;
      }

      mat2 ambRot(float a) {
        float s = sin(a);
        float c = cos(a);
        return mat2(c,-s,s,c);
      }

      float ambRange(float v, float a, float b, float soft) {
        return smoothstep(a-soft,a+soft,v) *
          (1.0-smoothstep(b-soft,b+soft,v));
      }

      float ambStrip(float d, float halfWidth, float soft) {
        return 1.0-smoothstep(halfWidth-soft,halfWidth+soft,abs(d));
      }

      /* Même géométrie de chemins que world.js, mais avec bords adoucis. */
      float ambRoadMask(vec2 p) {
        float road = 0.0;

        float west = ambRange(p.x,-48.0,-2.0,.8);
        road = max(road, west * ambStrip(p.y+19.0,2.1,.64));
        road = max(road, west * ambStrip(p.y-8.0,2.1,.64));
        road = max(road, west * ambStrip(p.y+39.0,1.7,.60));

        road = max(
          road,
          ambRange(p.y,-52.0,24.0,.85) * ambStrip(p.x+9.0,2.3,.68)
        );

        road = max(
          road,
          1.0-smoothstep(6.8,8.45,length(p-vec2(-9.0,0.0)))
        );

        float diagonalX = -9.0 - (p.y-8.0)*.9;
        road = max(
          road,
          ambRange(p.y,7.0,31.0,.85) * ambStrip(p.x-diagonalX,1.45,.64)
        );

        float east = ambRange(p.x,-9.0,52.0,.85);
        road = max(road, east * ambStrip(p.y-8.0,1.7,.60));
        road = max(road, east * ambStrip(p.y+30.0,1.5,.58));

        float curveX = 38.0 + sin(p.y*.1)*5.0;
        road = max(
          road,
          ambRange(p.x,27.0,52.0,.95) * ambStrip(p.x-curveX,1.7,.66)
        );

        return clamp(road,0.0,1.0);
      }

      /*
       * Anti-répétition : chaque matériau est lu deux fois avec
       * des échelles et rotations différentes, puis mélangé par un bruit macro.
       */
      vec3 ambSampleGrass(vec2 p, float mixNoise) {
        vec2 uvA = p / 2.65;
        vec2 uvB = ambRot(.73) * (p / 3.55) + vec2(17.3,-8.9);

        vec3 a = texture2D(ambGrass, uvA).rgb;
        vec3 b = texture2D(ambGrass, uvB).rgb;
        vec3 c = mix(a,b,smoothstep(.28,.72,mixNoise));

        float d1 = texture2D(ambGrassDetail, p/.58).r;
        float d2 = texture2D(ambGrassDetail, ambRot(-.31)*(p/.82)+vec2(4.0,13.0)).r;
        float detail = mix(d1,d2,.38);

        c *= .86 + detail*.28;
        return c;
      }

      vec3 ambSampleSoil(vec2 p, float mixNoise) {
        vec2 uvA = p / 2.35;
        vec2 uvB = ambRot(-.58) * (p / 3.15) + vec2(-12.0,19.0);

        vec3 a = texture2D(ambSoil, uvA).rgb;
        vec3 b = texture2D(ambSoil, uvB).rgb;
        vec3 c = mix(a,b,smoothstep(.30,.74,mixNoise));

        float d1 = texture2D(ambSoilDetail, p/.48).r;
        float d2 = texture2D(ambSoilDetail, ambRot(.27)*(p/.69)+vec2(10.0,-3.0)).r;
        float detail = mix(d1,d2,.42);

        c *= .84 + detail*.31;
        return c;
      }

      vec3 ambSampleMoss(vec2 p, float mixNoise) {
        vec2 uvA = p / 1.95;
        vec2 uvB = ambRot(.92) * (p / 2.8) + vec2(7.0,14.0);

        vec3 a = texture2D(ambMoss, uvA).rgb;
        vec3 b = texture2D(ambMoss, uvB).rgb;
        vec3 c = mix(a,b,smoothstep(.25,.76,mixNoise));

        float d = texture2D(ambMossDetail,p/.46).r;
        c *= .87 + d*.25;
        return c;
      }
    ` + shader.fragmentShader;

    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <color_fragment>",
      `#include <color_fragment>
      vec2 p = ambGroundPosition.xz;

      if (ambLowQuality > 0.5) {
        // Low mode: preserve real albedo textures and organic roads, but avoid the
        // expensive multi-octave/detail/moss sampling used by Medium+.
        float lowRoad = ambRoadMask(p);
        float lowMacro = ambNoise(p*.065 + vec2(3.0,11.0));
        vec3 lowGrass = texture2D(ambGrass, p/2.8).rgb;
        vec3 lowSoil = texture2D(ambSoil, p/2.5).rgb;
        lowGrass *= .91 + lowMacro*.15;
        lowSoil *= .90 + lowMacro*.12;
        diffuseColor.rgb = mix(lowGrass, lowSoil, smoothstep(.20,.78,lowRoad));
      } else {

      float macroA = ambFbm(p*.028 + vec2(21.0,-17.0));
      float macroB = ambFbm(p*.075 + vec2(-12.0,9.0));
      float breakup = ambFbm(p*.20 + vec2(8.0,31.0));

      vec3 grass = ambSampleGrass(p, macroB);
      vec3 soil = ambSampleSoil(p, macroA);
      vec3 moss = ambSampleMoss(p, breakup);

      /* Grandes variations : elles cassent le tiling sans effacer la micro-texture. */
      grass *= .90 + macroA*.18;
      grass = mix(
        grass,
        grass*vec3(1.08,1.04,.86),
        smoothstep(.68,.90,macroB)*.12
      );

      soil *= .91 + macroA*.15;
      soil = mix(
        soil,
        soil*vec3(.86,.82,.78),
        smoothstep(.70,.92,breakup)*.10
      );

      float road = ambRoadMask(p);

      /* Bord de chemin irrégulier : pas de découpe nette. */
      float edgeWarp = (ambFbm(p*.31 + vec2(-4.0,18.0))-.5)*.24;
      float organicRoad = clamp(
        road + edgeWarp*road*(1.0-road),
        0.0,
        1.0
      );

      float roadCore = smoothstep(.48,.86,organicRoad);
      float verge = smoothstep(.10,.52,organicRoad) *
        (1.0-smoothstep(.62,.94,organicRoad));

      /* Mousse/végétation plus forte exactement dans les transitions. */
      float mossPatch = smoothstep(.44,.76,breakup);
      float mossAmount = verge*(.38+.46*mossPatch);
      mossAmount += (1.0-roadCore)*smoothstep(.82,.96,macroB)*.10;
      mossAmount = clamp(mossAmount,0.0,.78);

      vec3 grassMoss = mix(grass,moss,mossAmount);
      vec3 transition = mix(grassMoss,soil,.28+.18*macroA);
      vec3 groundColor = mix(grassMoss,transition,verge*.76);
      groundColor = mix(groundColor,soil,roadCore);

      diffuseColor.rgb = groundColor;
      }
      `,
    );

    /*
     * Vraies normal maps mélangées. Les fonctions nécessaires sont disponibles
     * car normalMap est activé sur MeshStandardMaterial.
     */
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      if (ambLowQuality < 0.5) {
        vec2 np = ambGroundPosition.xz;
        float nMacro = ambFbm(np*.075 + vec2(-12.0,9.0));
        float nBreak = ambFbm(np*.20 + vec2(8.0,31.0));
        float nRoad = ambRoadMask(np);
        float nEdgeWarp = (ambFbm(np*.31 + vec2(-4.0,18.0))-.5)*.24;
        float nOrganicRoad = clamp(nRoad+nEdgeWarp*nRoad*(1.0-nRoad),0.0,1.0);
        float nRoadCore = smoothstep(.48,.86,nOrganicRoad);
        float nVerge = smoothstep(.10,.52,nOrganicRoad)*(1.0-smoothstep(.62,.94,nOrganicRoad));
        float nMoss = clamp(nVerge*(.38+.46*smoothstep(.44,.76,nBreak)),0.0,.78);

        vec3 ng1 = texture2D(ambGrassNormal,np/2.65).xyz*2.0-1.0;
        vec3 ng2 = texture2D(ambGrassNormal,ambRot(.73)*(np/3.55)+vec2(17.3,-8.9)).xyz*2.0-1.0;
        vec3 nGrass = normalize(mix(ng1,ng2,smoothstep(.28,.72,nMacro)));

        vec3 ns1 = texture2D(ambSoilNormal,np/2.35).xyz*2.0-1.0;
        vec3 ns2 = texture2D(ambSoilNormal,ambRot(-.58)*(np/3.15)+vec2(-12.0,19.0)).xyz*2.0-1.0;
        vec3 nSoil = normalize(mix(ns1,ns2,smoothstep(.30,.74,nMacro)));

        vec3 nm1 = texture2D(ambMossNormal,np/1.95).xyz*2.0-1.0;
        vec3 nm2 = texture2D(ambMossNormal,ambRot(.92)*(np/2.8)+vec2(7.0,14.0)).xyz*2.0-1.0;
        vec3 nMossMap = normalize(mix(nm1,nm2,smoothstep(.25,.76,nBreak)));

        vec3 nGround = normalize(mix(nGrass,nMossMap,nMoss));
        nGround = normalize(mix(nGround,nSoil,nRoadCore));

        /* relief présent mais doux pour rester cohérent avec la DA */
        nGround.xy *= .38;
        nGround = normalize(nGround);

        /* Compatible avec la version de Three.js d'Ambrelune :
         * tbn est fourni par <normal_fragment_begin> lorsque normalMap est actif.
         */
        normal = normalize(tbn * nGround);
      }
      `,
    );
  };

  material.customProgramCacheKey = () => "ambrelune-ground-multilayer-assets-v3-fixed";
  return material;
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

import {chooseEncounter,wildZone} from '../systems/encounters.js';
import {flowingFountain} from '../rendering/fountain.js';
import {
  T,
  Factory,
  random,
  house,
  tree,
  flower,
  lamp,
  furnishing,
} from "../rendering/art.js";
import { character } from "../rendering/character-assets.js";
import { modelCreature } from "../rendering/monster-models.js";
import { stepNpc } from "../systems/npc-motion.js";
import {
  groundMaterial,
  villageDetails,
  lamplightPools,
} from "../rendering/village.js";
import { species } from "../systems/data.js";
import {riverX,terrainHeight,onBridge,height,bridgeHeight,baseTerrainHeight,clearLandmark} from './terrain.js';
export {riverX,terrainHeight,onBridge,height,bridgeHeight,clearLandmark} from './terrain.js';
export function isRoad(x, z) {
  if (
    x < -2 &&
    x > -48 &&
    (Math.abs(z + 19) < 2.1 || Math.abs(z - 8) < 2.1 || Math.abs(z + 39) < 1.7)
  )
    return true;
  if (Math.abs(x + 9) < 2.3 && z > -52 && z < 24) return true;
  if (Math.hypot(x + 9, z) < 7.5) return true;
  if (z > 7 && z < 20 && Math.abs(x - (-9 - (z - 8) * 0.9)) < 1.45) return true;
  if((x>-32.7 && x<-19 && Math.abs(z-20)<.85)||(z>19 && z<38 && Math.abs(x+31.8)<.75)||(x>-38 && x<-31 && Math.abs(z-29)<.8))return true;
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
    this.buildLampLights = [];
    this.buildLampPoolMaterial = null;
    this.buildLampPoolGeometry = null;
    this.rand = random(57291);
    this.lowQuality = false;
    this.build();
  }
  collider(x, z, r, kind = "circle", w = 0, d = 0) {
    const collider = { x, z, r, kind, w, d, disabled: false };
    this.colliders.push(collider);
    return collider;
  }
  ensureBuildLampAssets() {
    if (this.buildLampPoolMaterial && this.buildLampPoolGeometry) return;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, "rgba(255,205,130,.58)");
    gradient.addColorStop(0.42, "rgba(244,164,77,.24)");
    gradient.addColorStop(1, "rgba(230,125,43,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.minFilter = T.LinearFilter;
    texture.magFilter = T.LinearFilter;
    this.buildLampPoolMaterial = new T.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      blending: T.AdditiveBlending,
      opacity: 0,
      toneMapped: false,
    });
    this.buildLampPoolGeometry = new T.PlaneGeometry(5.8, 5.8);
    this.buildLampPoolGeometry.rotateX(-Math.PI / 2);
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
      // Fine texture now comes from village.js. Vertex colours only carry broad tints.
      if (road) {
        grass.set("#aaa08f");
        const broad =
          Math.sin(x * 0.11) * 0.018 +
          Math.cos(z * 0.09) * 0.016 +
          Math.sin((x + z) * 0.045) * 0.012;
        grass.offsetHSL(0, 0, broad);
      } else {
        grass.set(x > 30 && z < -23 ? "#6d8d72" : "#71904f");
        const broad =
          Math.sin(x * 0.08) * 0.015 +
          Math.cos(z * 0.075) * 0.018 +
          Math.sin((x - z) * 0.038) * 0.012;
        grass.offsetHSL(0, 0, broad);
      }
      colors.push(grass.r, grass.g, grass.b);
    }
    geom.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geom.computeVertexNormals();
    const ground = new T.Mesh(geom, groundMaterial());
    ground.material.userData.cutawayExcluded=true;
    ground.receiveShadow = true;
    // Low-detail outer land continues beyond the playable rectangle into the fog.
    const skirt=new T.PlaneGeometry(300,300,30,30);skirt.rotateX(-Math.PI/2);
    const sp=skirt.attributes.position,sc=[];
    for(let i=0;i<sp.count;i++){sp.setY(i,baseTerrainHeight(sp.getX(i),sp.getZ(i))-.04);sc.push(.35,.45,.25);}
    const si=skirt.index.array,indices=[];
    for(let i=0;i<si.length;i+=3){const ids=[si[i],si[i+1],si[i+2]];if(ids.some(j=>Math.abs(sp.getX(j))>=75||Math.abs(sp.getZ(j))>=75))indices.push(...ids);}
    skirt.setIndex(indices);skirt.setAttribute('color',new T.Float32BufferAttribute(sc,3));skirt.computeVertexNormals();
    const horizon=new T.Mesh(skirt,ground.material);horizon.receiveShadow=true;this.scene.add(horizon);
    this.scene.add(ground);
    /* Eau organique : limitée STRICTEMENT au lit de la rivière. */
    const waterGeo = new T.PlaneGeometry(300, 300, 96, 96);
    waterGeo.rotateX(-Math.PI / 2);

    this.water = new T.Mesh(
      waterGeo,
      new T.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        uniforms: {
          time: { value: 0 },
          sun: { value: 1 },
          lowQuality: { value: 0 },
        },
        vertexShader: `
          varying vec3 vWorldP;
          varying float vWave;
          uniform float time;

          void main() {
            vec3 p = position;

            float w1 = sin(p.x * .36 + time * .62) * .035;
            float w2 = sin(p.z * .51 - time * .47 + p.x * .12) * .024;
            float w3 = sin((p.x + p.z) * .19 + time * .31) * .018;

            p.y += w1 + w2 + w3;
            vWave = w1 + w2 + w3;

            vec4 worldPos = modelMatrix * vec4(p, 1.0);
            vWorldP = worldPos.xyz;

            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          varying vec3 vWorldP;
          varying float vWave;
          uniform float time;
          uniform float sun;
          uniform float lowQuality;

          float hash21(vec2 p){
            return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
          }

          float noise2(vec2 p){
            vec2 i=floor(p), f=fract(p);
            f=f*f*(3.0-2.0*f);
            float a=hash21(i);
            float b=hash21(i+vec2(1.,0.));
            float c=hash21(i+vec2(0.,1.));
            float d=hash21(i+vec2(1.,1.));
            return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
          }

          float fbm(vec2 p){
            float v=0.0;
            float a=.5;
            for(int i=0;i<4;i++){
              v += noise2(p)*a;
              p = p*2.07 + vec2(8.3,13.7);
              a *= .5;
            }
            return v;
          }

          void main() {
            vec2 p = vWorldP.xz;

            float riverCenter = 19.0 + sin(p.y * .04) * 1.5;
            float bank = abs(p.x - riverCenter);

            /* Coupe complètement l'eau hors du lit de la rivière. */
            if (bank > 5.2) discard;

            float edgeAlpha = 1.0 - smoothstep(4.15, 5.2, bank);

            if (lowQuality > 0.5) {
              // Low: lightweight water with the same palette/banks, without layered FBM.
              float wave = sin(p.x*.72 + p.y*.46 + time*.7) * .5 + .5;
              float depthMix = clamp((bank - 1.0) / 4.3, 0.0, 1.0);
              vec3 deep = vec3(.035,.205,.285);
              vec3 shallow = vec3(.145,.485,.495);
              vec3 lowC = mix(deep, shallow, depthMix*.38);
              lowC *= .84 + wave*.10;
              lowC *= .58 + .42 * sun;
              lowC += vWave * .09;
              gl_FragColor = vec4(lowC, edgeAlpha * .96);
              return;
            }

            float broad = fbm(p * .075 + vec2(time * .025, -time * .018));
            float fine  = fbm(p * .28  + vec2(-time * .06, time * .035));

            vec3 deep    = vec3(.035,.205,.285);
            vec3 mid     = vec3(.070,.345,.405);
            vec3 shallow = vec3(.145,.485,.495);

            float depthMix = clamp((bank - 1.0) / 4.3, 0.0, 1.0);

            vec3 c = mix(deep, mid, .42 + broad * .28);
            c = mix(c, shallow, depthMix * .42);
            c *= .92 + (fine - .5) * .10;

            float r1 = sin(p.x * 1.35 + p.y * .68 + time * .95);
            float r2 = sin(p.x * .61 - p.y * 1.17 - time * .72 + sin(p.y * .17) * 1.8);
            float r3 = sin((p.x + p.y) * 2.05 + time * 1.22);
            float crest = smoothstep(1.45, 2.35, r1 + r2 + r3);
            c = mix(c, vec3(.43,.72,.72), crest * .22 * (.35 + .65 * sun));

            float shimmer = smoothstep(.73, .96, fbm(p * .72 + vec2(time * .12, -time * .08)));
            c += vec3(.22,.39,.38) * shimmer * .12 * (.25 + .75 * sun);

            float foamBand = smoothstep(4.05, 4.72, bank) * (1.0 - smoothstep(4.72, 5.15, bank));
            float foamNoise = .55 + .45 * fbm(p * .8 + time * .04);
            c = mix(c, vec3(.63,.78,.70), foamBand * foamNoise * .20);

            c *= .58 + .42 * sun;
            c += vWave * .12;

            gl_FragColor = vec4(c, edgeAlpha * .98);
          }
        `,
      }),
    );

    this.water.position.y = -0.48;
    this.scene.add(this.water);
    this.ground = ground;
    this.pickSurfaces = [ground];
    for (const bridgeZ of [8, -30]) {
      const deck = new T.Mesh(
        new T.PlaneGeometry(17, 3.9, 34, 1),
        new T.MeshBasicMaterial({
          colorWrite: false,
          depthWrite: false,
          transparent: true,
          opacity: 0,
        }),
      );
      deck.geometry.rotateX(-Math.PI / 2);
      const dp=deck.geometry.attributes.position;
      for(let i=0;i<dp.count;i++)dp.setY(i,bridgeHeight(dp.getX(i)+19.5,bridgeZ));
      deck.geometry.computeVertexNormals();deck.position.set(19.5, 0, bridgeZ);
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
    f.onFurnishing=(type,x,z,r)=>{if(type==='lamp')this.collider(x,z,.22);else this.collider(x,z,0,'rect',Math.abs(Math.cos(r))*1.9+Math.abs(Math.sin(r)),Math.abs(Math.sin(r))*1.9+Math.abs(Math.cos(r)));};
    villageDetails(f, this);
    // Formal crescent city: three neighbourhoods, generous streets and passages.
    let idx = 0;
    for (const z of [-48, -29, -9, 18])
      for (const x of [-44, -32, -21, 2]) {
        if (z === 18 && x < -15) continue;
        if (z === -9 && x === -21) continue;
        if((z===-48 && x===-32)||(z===-29 && x===2))continue;
        // Remove the two dark-roof houses that cut across the composition.
        if ((x === -32 && z === -9) || (x === 2 && z === 18)) continue;
        const w = 4.5 + r() * 1.5,
          d = 4.5 + r() * 1.2,
          h = 3.4 + r() * 2.4;
        house(f, x, height(x, z), z, w, d, h, idx++);
        this.collider(x, z, 0.1, "rect", w + 0.5, d + 0.5);
        this.interactables.push({type:"home",name:"Entrer dans la maison",location:`house-${x}-${z}`,x,z:z+d/2+1.1});
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
            0,
            "stone",
          );
      }
    // Arcaded civic hall and its observatory.
    const hall={part:(type,color,x,y,z,...rest)=>f.part(type,color,x-1,y+height(-9,-55)-height(-8,-27),z-28,...rest)};
    house(hall, -8, height(-8, -27), -27, 10, 7, 6, 1);
    this.collider(-9, -55, 0, "rect", 10.6, 7.6);
    const ty = height(-9, -28);
    hall.part("cylinder", "#d5c6a1", -9, ty + 9, -28, 2, 9, 2, 0, 0, 0, "stone");
    for (let j = 0; j < 8; j++) {
      const a = (j * Math.PI) / 4;
      hall.part(
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
    hall.part("cone", "#527972", -9, ty + 15, -28, 3, 4, 3, 0, 0.3);
    hall.part("sphere", "#dab873", -9, ty + 17.1, -28, 0.22, 0.35, 0.22);
    hall.part("torus", "#e5c990", -9, ty + 12, -25.97, 0.7, 0.7, 0.7);
    hall.part("box", "#e5c990", -9, ty + 12.2, -25.94, 0.06, 0.42, 0.07);
    hall.part("box", "#e5c990", -8.8, ty + 12, -25.94, 0.46, 0.06, 0.07);
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
    this.fountain=flowingFountain(this.scene,-9,fy,0);
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
        z = -14.8,
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
            0,
            0,
            0,
            "wood",
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
          0,
          0,
          "fabric",
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
      this.collider(x, 42, 0, "rect", 1.9, 0.34);
    }
    for (let z = 21; z < 42; z += 2) {
      furnishing(f, "fence", -44, height(-44, z), z, Math.PI / 2);
      furnishing(f, "fence", -15, height(-15, z), z, Math.PI / 2);
      this.collider(-44, z, 0, "rect", 0.34, 1.9);
      this.collider(-15, z, 0, "rect", 0.34, 1.9);
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
      name: "Votre maison · entrer",
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
        const x = 11 + (j + .5) * 0.5,
          y = height(x, z);
        f.part(
          "box",
          "#b39c76",
          x,
          y - 0.1,
          z,
          0.51,
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
          f.part("box", "#6e725f", x, y + 0.65, z + dz, 0.17, 1.3, 0.17, 0, 0, 0, "wood");
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
              0,
              0,
              0,
              "wood",
            );
      }
      for (const x of [12, 27]) lamp(f, x, height(x, z), z - 2.15);
      this.collider(19.5, z - 1.85, 0, "rect", 17.1, 0.26);
      this.collider(19.5, z + 1.85, 0, "rect", 17.1, 0.26);
    }
    // Conservatory, tiered garden and ancient sanctuary.
    house(f, -35, height(-35, -49), -49, 7, 7, 4.8, 1);
    this.collider(-35,-49,0,"rect",7.5,7.5);

    const sy = terrainHeight(43, -39);
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
      f.part("box", "#abb596", x, y + h, z, 1.15, 0.35, 1.15, 0, 0, 0, "stone");
      f.part("sphere", "#698567", x + 0.2, y + h * 0.6, z, 0.6, 0.3, 0.6, 0, 0, 0, "leaf");
      this.collider(x, z, 0.5);
    }
    f.part("torus", "#a9b8a1", 43, sy + 4.7, -41, 2.3, 2.3, 2.3, 0, 0, 0.1, "stone");
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
        if (Math.abs(z-8)<3 || Math.abs(z+30)<3) continue;
        const y = terrainHeight(x, z);
        const bankRockSize = 0.5 + r() * 0.4;
        f.part(
          "sphere",
          s > 0 ? "#929d88" : "#a4ac90",
          x,
          y - 0.1,
          z,
          bankRockSize,
          0.45 + r() * 0.4,
          0.65,
          0,
          r() * 6,
          0,
          "stone",
        );
        this.collider(x, z, Math.max(0.32, bankRockSize * 0.72));
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
              "leaf",
            );
        }
      }
      if (r() > 0.8) {
        const x = riverX(z) + (r() - 0.5) * 5;
        f.part("cylinder", "#8caa77", x, -0.32, z, 0.24, 0.02, 0.23, 0, 0, 0, "leaf");
        flower(f, x, -0.35, z, "#efddbc", 0.8);
      }
    }
    // Individual paving, curbs and planted islands give the streets a human scale.
    for (let x = -48; x < 10; x += 0.78)
      for (let z = -53; z < 23; z += 0.72) {
        if (!isRoad(x, z)) continue;
        const xx = x + (Math.abs(Math.round(z / 0.72)) % 2) * 0.39;
        const c = ["#9b9588", "#aaa393", "#918d83", "#b5ab97"][Math.floor(r() * 4)];
        const sx = 0.742 + r() * 0.022;
        const sz = 0.677 + r() * 0.024;
        f.part(
          "paver" + (Math.abs(Math.round(x*13+z*7))%3),
          c,
          xx + (r() - 0.5) * 0.035,
          height(xx, z) + 0.045,
          z + (r() - 0.5) * 0.025,
          sx,
          0.085 + r() * 0.015,
          sz,
          0,
          (r() - 0.5) * 0.055,
          0,
          "paving",
        );
      }

    // Bordures organiques : quelques pierres, herbes et fleurs cassent la grille des rues.
    for (let i = 0; i < 620; i++) {
      const x = -49 + r() * 62;
      const z = -55 + r() * 88;
      if (!isRoad(x, z) || onBridge(x, z)) continue;
      const edge =
        !isRoad(x + 0.82, z) ||
        !isRoad(x - 0.82, z) ||
        !isRoad(x, z + 0.82) ||
        !isRoad(x, z - 0.82);
      if (!edge) continue;
      const y = height(x, z);
      if (r() < 0.48) {
        f.part(
          "sphere",
          r() > 0.5 ? "#8f8b82" : "#a9a397",
          x + (r() - 0.5) * 0.45,
          y + 0.045,
          z + (r() - 0.5) * 0.45,
          0.08 + r() * 0.12,
          0.04 + r() * 0.07,
          0.07 + r() * 0.11,
          0,
          r() * 6,
          0,
          "stone",
        );
      } else {
        const gx = x + (r() - 0.5) * 0.45;
        const gz = z + (r() - 0.5) * 0.45;
        for (let j = 0; j < 2 + Math.floor(r() * 3); j++)
          f.part(
            "cone",
            j % 2 ? "#718852" : "#8da15e",
            gx + (j - 1) * 0.05,
            height(gx, gz) + 0.08,
            gz,
            0.025,
            0.18 + r() * 0.16,
            0.035,
            0,
            r() * 6,
            0.18,
            "leaf",
          );
        if (r() > 0.82)
          flower(
            f,
            gx,
            height(gx, gz),
            gz,
            r() > 0.5 ? "#d5a6ae" : "#e2c98e",
            0.55 + r() * 0.35,
          );
      }
    }

    for (const [x, z, s] of [
      // Only peripheral planters remain; the central ones shown in the screenshots are gone.
      [-44, 1, 0.75],
      [-42, 13, 0.72],
      [-3, -37, 0.8],
      [-18, -35.8, 0.75],
      [-30, -35.8, 0.7],
      [-42, 17, 0.65],
    ]) {
      const y = height(x, z);
      f.part("cylinder", "#b5ad8f", x, y + 0.17, z, 1.65, 0.32, 1.65, 0, 0, 0, "stone");
      f.part("cylinder", "#667454", x, y + 0.36, z, 1.45, 0.08, 1.45, 0, 0, 0, "leaf");
      tree(f, x, y + 0.4, z, s, x === -20 || x === -17 || x === -30 ? 4 : 1);
      this.collider(x, z, 1.65);
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
    // Bulky central shrub beds removed; flowers are redistributed in village.js.
    for (let i = 0; i < 4; i++) {
      const x = -34 + i * 2.3,
        y = height(x, -4);
      for (const zz of [-6, -3])
        f.part("box", "#7c7153", x, y + 1.5, zz, 0.12, 3, 0.12, 0, 0, 0, "wood");
      f.part("box", "#a1956c", x, y + 3, -4.5, 0.15, 0.16, 4, 0, 0, 0, "wood");
      for (let j = 0; j < 4; j++)
        f.part("sphere", "#739061", x, y + 3.12, -6 + j, 0.5, 0.18, 0.68, 0, 0, 0, "leaf");
    }
    for (let j = 0; j < 9; j++) {
      const x = -35 + j,
        y = height(x, -4);
      f.part("box", "#8d8260", x, y + 2.98, -4.5, 0.12, 0.13, 4.2, 0, 0, 0, "wood");
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
      f.part("box", "#d0c4a3", x, y + 2.22, -33.8, width + 0.2, 0.17, 0.85, 0, 0, 0, "stone");
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
    // Narrow wooded edges sit entirely OUTSIDE the playable rectangle.
    for(let side=0;side<4;side++)for(let i=0;i<18;i++){
      const t=i/17,offset=Math.sin(i*2.3)*.7;
      const x=side<2?(side===0?-71:71)+offset:-71+t*142;
      const z=side<2?-70+t*136:(side===2?-70:66)+offset;
      if(Math.abs(x-riverX(z))<6)continue;
      f.part('sphere','#8a917d',x,height(x,z)+.6,z,1.4+(i%3)*.3,1.1+(i%2)*.5,1.6,0,i*.5,0,'stone');
      if(i%2===0)tree(f,x,height(x,z),z,.65+(i%3)*.08,i%3);
    }
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
        isRoad(x, z) || clearLandmark(x,z)
      )
        continue;
      const city = x < 7 && x > -50 && z < 21 && z > -56,
        farm = x > -46 && x < -13 && z > 18 && z < 44;
      let nearHome = city || farm;
      if (!nearHome && r() > 0.24) {
        const size = 0.65 + r() * 0.65;
        tree(f, x, height(x, z), z, size, Math.floor(r() * 3));
        this.collider(x, z, 0.29 * size);
      }
      // V7: removed the old standalone spherical shrubs. They read as green balls
      // against the more organic vegetation and are intentionally left empty here.
    }
    for (let i = 0; i < 240; i++) {
      const x = cx * 30 + (r() - 0.5) * 30,
        z = cz * 30 + (r() - 0.5) * 30;
      if (Math.abs(x) > 69 || Math.abs(z) > 67 || Math.abs(x - riverX(z)) < 6 || clearLandmark(x,z))
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
            0,
            "stone",
          );
        continue;
      }
      const farm = x > -44 && x < -15 && z > 20 && z < 42;
      const plotField = x > -31.2 && x < -20.0 && z > 26.0 && z < 35.3;
      if (plotField || (x>-49 && x<7 && z>-55 && z<20)) continue;
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
          "leaf",
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
      ["Maëlle", "La gardienne des jardins", -5, 4, "#9f8670", "maelle"],
      ["Soline", "Tisserande et marchande", -27, -14, "#b98769", "soline"],
      ["Ivo", "Botaniste des Sources", -14, -20, "#73948a", "ivo"],
      ["Noé", "Promeneur des terrasses", -12, 15, "#8b91a5", "noe"],
      ["Ysée", "La mémoire des ruines", 30, -29, "#b59c75", "ysee"],
      ["Tess", "Menuisière", -41, 8, "#8d9d7b", "tess"],
      ["Orin", "Marchand de semences", -38, -14, "#bcaa78", "orin"],
      ["Alba", "Voyageuse", -9, -40, "#ac8981", "alba"],
    ];
    npcData.forEach(([name, role, x, z, color, characterKind], i) => {
      const mesh = character(characterKind, color);
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
          i>=10 && i%7===0 ? "ore" : i>=10 && i%11===0 ? "coal" :
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
          "bark",
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
          "wood",
        );
        for (let j = 0; j < 3; j++)
          f.part("box", "#705c41", 0, 0.45 + j * 0.07, 0.3, 1.2, 0.04, 0.04, 0, 0, 0, "bark");
      } else if (["stone","ore","coal"].includes(type)) {
        f.part("sphere", type==="ore"?"#a57351":type==="coal"?"#434744":"#a9ab98", 0, 0.5, 0, 0.8, 0.6, 0.66, 0, i, 0, "stone");
        f.part("sphere", "#babbab", 0.44, 0.2, 0.3, 0.35, 0.32, 0.3, 0, 0, 0, "stone");
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
            "ceramic",
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
            0,
            0,
            0,
            "leaf",
          );
          flower(f, Math.sin(j) * 0.25, 0.5, Math.cos(j) * 0.25, "#d7bf93");
        }
      }
      f.flush();
      g.position.set(x, height(x, z), z);
      this.scene.add(g);
      const resourceRadius =
        type === "wood" ? 0.72 : ["stone","ore","coal"].includes(type) ? 0.7 : type === "crystal" ? 0.5 : 0.38;
      const resourceCollider = this.collider(x, z, resourceRadius);
      this.resources.push({
        id: `res${i}`,
        type,
        x,
        z,
        mesh: g,
        collider: resourceCollider,
      });
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
        "ceramic",
      );
    f.flush();
    g.position.set(31, height(31, 11), 11);
    this.scene.add(g);
    const firstCrystalCollider = this.collider(31, 11, 0.52);
    this.resources.push({
      id: "firstcrystal",
      type: "crystal",
      x: 31,
      z: 11,
      mesh: g,
      collider: firstCrystalCollider,
    });
    const wildData = [];
    for(let i=0;i<18;i++){const e=chooseEncounter(Math.random,this.collides.bind(this),wildData.map(([id,x,z])=>({homeX:x,homeZ:z})));if(e)wildData.push([e.id,e.x,e.z]);}
    wildData.push(['gardien',43,-38]);
    wildData.forEach(([id, x, z], i) => {
      const mesh = modelCreature(species(id), 1);
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
  setQuality(q) {
    const low = q === "low";
    this.lowQuality = low;
    if (this.water?.material?.uniforms?.lowQuality)
      this.water.material.uniforms.lowQuality.value = low ? 1 : 0;
    if (this.ground?.material) {
      this.ground.material.userData.lowQuality = low;
      if (this.ground.material.userData.ambLowUniform)
        this.ground.material.userData.ambLowUniform.value = low ? 1 : 0;
    }
    if (this.motes) this.motes.visible = !low;
    if (this.rain?.geometry) this.rain.geometry.setDrawRange(0, low ? 420 : 1200);
  }
  burst(x, y, z, color = "#efd28b", count = 14) {
    if (this.lowQuality) count = Math.min(count, 8);
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
    this.fountain?.update(t);
    this.rain.visible = state.weather === "pluie";
    if (this.rain.visible) {
      this.rain.position.set(px, 0, pz);
      const a = this.rain.geometry.attributes.position;
      const rainCount = this.lowQuality ? Math.min(a.count, 420) : a.count;
      for (let i = 0; i < rainCount; i++) {
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
      const npcDistance = Math.hypot(px - n.x, pz - n.z);
      const npcVisible = !this.lowQuality || npcDistance < 38;
      n.mesh.visible = npcVisible;
      if (!npcVisible) continue;
      const motion = stepNpc(n, dt, { x: px, z: pz }, this.collides.bind(this));
      n.mesh.position.set(n.x, height(n.x, n.z), n.z);
      if (motion.facing !== undefined) n.mesh.rotation.y = motion.facing;
      n.animationElapsed=(n.animationElapsed||0)+dt;
      if(npcDistance<28 || n.animationElapsed>=1/15){
        n.mesh.userData.animate(t,motion.moving,false,n.animationElapsed);
        n.animationElapsed=0;
      }
    }
    for (const w of this.wild) {
      const wasCooling=w.cooldown>0;
      w.cooldown = Math.max(0, w.cooldown - dt);
      if(w.id!=='gardien' && ((wasCooling && w.cooldown===0)||w.respawnPending|| (w.spawnDay!==undefined&&w.spawnDay!==state.day))){
       if(Math.hypot(px-w.x,pz-w.z)>20){const e=chooseEncounter(Math.random,(x,z,r)=>this.collides(x,z,r)||Math.hypot(px-x,pz-z)<20,this.wild.filter(v=>v!==w));if(e){w.mesh.removeFromParent();w.mesh.userData.dispose?.();Object.assign(w,e);w.mesh=modelCreature(species(e.id),1);this.scene.add(w.mesh);w.mesh.position.set(w.x,height(w.x,w.z),w.z);w.spawnDay=state.day;w.respawnPending=false;}}
       else if(wasCooling)w.respawnPending=true;
      }
      w.spawnDay??=state.day;
      const nocturnal = w.id === "lumignon",
        rainOnly = w.id === "coralys";
      const wildDistance = Math.hypot(px - w.homeX, pz - w.homeZ);
      w.mesh.visible =
        w.cooldown === 0 && !w.respawnPending &&
        (!this.lowQuality || wildDistance < 42) &&
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
      if(w.id!=='gardien' && (!wildZone(w.x,w.z)||this.collides(w.x,w.z,.65))){w.x=w.homeX;w.z=w.homeZ;}
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
    this.buildLampLights = this.buildLampLights.filter((entry) => entry.group.parent);
    const daylightRaw = Math.max(
      0,
      Math.sin(((state.time - 6) / 15) * Math.PI),
    );
    const daylight = T.MathUtils.smoothstep(daylightRaw, 0.02, 0.42);
    const lampStrength = T.MathUtils.smoothstep(1 - daylight, 0.18, 0.82);
    if (this.buildLampPoolMaterial)
      this.buildLampPoolMaterial.opacity = lampStrength * 0.72;
    for (const entry of this.buildLampLights)
      entry.light.intensity = this.lowQuality ? 0 : lampStrength * 1.75;

    const radius =
      state.settings.quality === "low"
        ? 48
        : state.settings.quality === "medium"
          ? 70
          : 95;
    for (const c of this.chunks)
      c.g.visible = Math.hypot(c.x - px, c.z - pz) < radius;
  }
  sync(state) {
    const buildKey=JSON.stringify(state.buildings.map(({type,x,z,r,y})=>({type,x,z,r,y})));
    if(buildKey!==this.buildKey){
      this.buildKey=buildKey;
      for(const g of this.buildMeshes){g.traverse(o=>{if(o.isInstancedMesh)o.dispose();});g.removeFromParent();}
      this.buildMeshes=[];this.buildLampLights=[];
    }
    for (const r of this.resources) {
      const visible = !(state.depleted[r.id] > state.day);
      r.mesh.visible = visible;
      if (r.collider) r.collider.disabled = !visible;
    }
    for (const p of state.plots) {
      const key = `${p.seed}-${p.stage}-${p.water > 0.1}-${p.fertilized}`;
      const old = this.plotMeshes.get(p.id);
      if (old?.key === key) continue;

      if (old) {
        old.g.traverse((o) => {
          if (o.isInstancedMesh) o.dispose();
        });
        this.scene.remove(old.g);
      }

      const g = new T.Group();
      const f = new Factory(g, true);
      const wet = p.water > 0.1;
      const plotIndex = Number(String(p.id).replace(/\D/g, "")) || 0;
      const pr = random(8401 + plotIndex * 97 + p.stage * 13 + (wet ? 31 : 0));

      const soilDark = wet ? "#44372f" : "#654a35";
      const soilMid = wet ? "#554338" : "#79583d";
      const soilLight = wet ? "#665044" : "#8b6848";

      /* Une vraie parcelle de terre, basse et organique. */
      f.part("box", soilDark, 0, 0.035, 0, 1.88, 0.09, 1.82);

      /* Bordure en bois sombre, fine, pas de grandes planches beiges. */
      const rim = "#72563d";
      f.part("box", rim, 0, 0.105, -0.91, 1.92, 0.12, 0.10, 0, 0, 0, "wood");
      f.part("box", rim, 0, 0.105, 0.91, 1.92, 0.12, 0.10, 0, 0, 0, "wood");
      f.part("box", rim, -0.95, 0.105, 0, 0.10, 0.12, 1.72, 0, 0, 0, "wood");
      f.part("box", rim, 0.95, 0.105, 0, 0.10, 0.12, 1.72, 0, 0, 0, "wood");

      /* Quatre sillons bombés. */
      for (let i = 0; i < 4; i++) {
        const x = -0.57 + i * 0.38;
        f.part(
          "sphere",
          i % 2 ? soilMid : soilLight,
          x,
          0.10,
          0,
          0.15,
          0.055 + pr() * 0.015,
          0.76,
          0,
          0,
          (pr() - 0.5) * 0.05,
        );
      }

      /* Petites mottes : cassent l'aspect parfait. */
      for (let i = 0; i < 10; i++) {
        const x = (pr() - 0.5) * 1.55;
        const z = (pr() - 0.5) * 1.45;
        f.part(
          "sphere",
          pr() > 0.5 ? soilMid : soilDark,
          x,
          0.13 + pr() * 0.025,
          z,
          0.045 + pr() * 0.045,
          0.025 + pr() * 0.025,
          0.05 + pr() * 0.05,
          0,
          pr() * 6,
          0,
        );
      }

      if (p.fertilized) {
        for (let i = 0; i < 7; i++) {
          f.part(
            "sphere",
            i % 2 ? "#66724d" : "#88724c",
            (pr() - 0.5) * 1.45,
            0.16,
            (pr() - 0.5) * 1.35,
            0.035 + pr() * 0.035,
            0.025,
            0.035 + pr() * 0.035,
          );
        }
      }

      if (wet) {
        for (let i = 0; i < 4; i++) {
          f.part(
            "sphere",
            "#65756e",
            (pr() - 0.5) * 1.3,
            0.155,
            (pr() - 0.5) * 1.25,
            0.06 + pr() * 0.05,
            0.008,
            0.04 + pr() * 0.04,
          );
        }
      }

      /* Culture : davantage de plants, volumes plus naturels. */
      if(p.stage>0 && p.seed && p.seed!=='seed') {
        for(let i=0;i<6;i++){
          const x=-.5+(i%3)*.5,z=-.4+Math.floor(i/3)*.8,h=.15+p.stage*.17;
          f.part('cone','#789157',x,.14+h/2,z,.04,h,.04,0,i*.5,.08,'leaf');
          if(p.seed==='wheatSeed'){
            for(let j=0;j<3;j++)f.part('sphere',p.stage===4?'#dfc179':'#99a665',x+(j%2?-.045:.045),.12+h-j*.09,z,.055,.09,.04);
          }else if(p.seed==='carrotSeed'){
            f.part('cone','#88a35f',x,.2+h*.3,z,.15,h*.6,.12,Math.PI,0,.3,'leaf');
            if(p.stage>2)f.part('sphere','#d78e53',x,.17,z,.10,.08,.10);
          }else if(p.seed==='pumpkinSeed'){
            f.part('sphere','#88a35f',x,.2,z,.2,.035,.23,0,i,0,'leaf');
            if(p.stage>2)f.part('sphere','#d5a05d',x,.15+p.stage*.04,z,p.stage*.065,p.stage*.06,p.stage*.065);
          }else{
            for(let j=0;j<3;j++){const a=j*Math.PI*2/3;f.part('sphere',p.stage>2?'#a7a4cf':'#99a665',x+Math.sin(a)*.07,.14+h,z+Math.cos(a)*.07,.075,.025,.075);}
          }
        }
      }else if (p.stage > 0) {
        for (let row = 0; row < 3; row++) {
          for (let col = 0; col < 2; col++) {
            const x = -0.38 + row * 0.38 + (pr() - 0.5) * 0.045;
            const z = -0.38 + col * 0.76 + (pr() - 0.5) * 0.05;
            const size = 0.16 + p.stage * 0.10;

            f.part(
              "cone",
              "#607f48",
              x,
              0.14 + size * 0.52,
              z,
              0.032,
              size,
              0.038,
              0,
              pr() * 6,
              (pr() - 0.5) * 0.22,
              "leaf",
            );

            for (const side of [-1, 1]) {
              f.part(
                "sphere",
                side > 0 ? "#88a35f" : "#769255",
                x + side * (0.07 + size * 0.15),
                0.15 + size * 0.55,
                z + (pr() - 0.5) * 0.05,
                0.10 + size * 0.24,
                0.04 + size * 0.08,
                0.16 + size * 0.20,
                0,
                side * 0.45,
                side * 0.22,
                "leaf",
              );
            }

            if (p.stage >= 3) {
              f.part(
                "sphere",
                p.stage === 4 ? "#c77970" : "#a7ba6d",
                x,
                0.18 + size * 1.12,
                z,
                0.11 + size * 0.20,
                0.13 + size * 0.18,
                0.11 + size * 0.18,
              );
            }

            if (p.stage === 4) {
              for (let petal = 0; petal < 4; petal++) {
                const a = petal * Math.PI / 2;
                f.part(
                  "sphere",
                  petal % 2 ? "#edd1ae" : "#e4b7aa",
                  x + Math.sin(a) * 0.075,
                  0.23 + size * 1.2,
                  z + Math.cos(a) * 0.075,
                  0.07,
                  0.035,
                  0.09,
                  0,
                  a,
                  0.1,
                );
              }
              f.part("sphere", "#d8bd70", x, 0.25 + size * 1.2, z, 0.045, 0.04, 0.045);
            }
          }
        }
      }

      f.flush();
      g.position.set(p.x, height(p.x, p.z) + 0.05, p.z);
      g.rotation.y = (pr() - 0.5) * 0.025;
      this.scene.add(g);
      this.plotMeshes.set(p.id, { key, g });
    }
    this.buildLampLights = this.buildLampLights.filter((entry) => entry.group.parent);
    while (this.buildMeshes.length < state.buildings.length) {
      const b = state.buildings[this.buildMeshes.length],
        g = new T.Group(),
        f = new Factory(g, true);
      furnishing(f, b.type, 0, 0, 0, b.r);
      f.flush();
      g.position.set(b.x, height(b.x, b.z), b.z);

      if (b.type === "lamp") {
        this.ensureBuildLampAssets();
        const pool = new T.Mesh(this.buildLampPoolGeometry, this.buildLampPoolMaterial);
        pool.position.set(0, 0.065, 0);
        pool.renderOrder = 1;
        pool.castShadow = false;
        pool.receiveShadow = false;
        g.add(pool);

        const pointLight = new T.PointLight("#ffd58f", 0, 8.5, 2);
        pointLight.position.set(0, 2.83, 0);
        pointLight.castShadow = false;
        // Warm pooled ground glow is enough; avoid accumulating point lights.
        this.buildLampLights.push({ group: g, light: pointLight });
      }

      this.scene.add(g);
      g.userData.building=b;
      this.buildMeshes.push(g);
    }
  }
}

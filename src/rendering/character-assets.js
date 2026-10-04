import { T, human } from "./art.js";

const ROOT = "./assets/characters/";
const textureLoader = new T.TextureLoader();
const rawCache = new Map();
const assetCache = new Map();
let animationPromise = null;

const TYPE_INFO = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
};
const COMPONENT_ARRAY = {
  5120: Int8Array,
  5121: Uint8Array,
  5122: Int16Array,
  5123: Uint16Array,
  5125: Uint32Array,
  5126: Float32Array,
};

function dirname(url) {
  return url.slice(0, url.lastIndexOf("/") + 1);
}

async function fetchArrayBuffer(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Asset introuvable: ${url}`);
  return r.arrayBuffer();
}

function accessorArray(json, buffers, index) {
  const a = json.accessors[index];
  if (!a || a.bufferView === undefined) throw new Error(`Accessor ${index} non pris en charge`);
  const view = json.bufferViews[a.bufferView];
  const Type = COMPONENT_ARRAY[a.componentType];
  const size = TYPE_INFO[a.type];
  if (!Type || !size) throw new Error(`Accessor ${a.type}/${a.componentType} non pris en charge`);
  const byteOffset = (view.byteOffset || 0) + (a.byteOffset || 0);
  return {
    array: new Type(buffers[view.buffer], byteOffset, a.count * size),
    itemSize: size,
    count: a.count,
    normalized: !!a.normalized,
    min: a.min,
    max: a.max,
  };
}

function colorFactor(v = [1, 1, 1, 1]) {
  return new T.Color(v[0], v[1], v[2]);
}

async function loadTexture(url, srgb = false) {
  const key = `${url}|${srgb ? 1 : 0}`;
  if (rawCache.has(key)) return rawCache.get(key);
  const promise = textureLoader.loadAsync(url).then((tex) => {
    tex.flipY = false;
    if (srgb) tex.colorSpace = T.SRGBColorSpace;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    tex.needsUpdate = true;
    return tex;
  });
  rawCache.set(key, promise);
  return promise;
}

async function prepareGltf(url) {
  if (assetCache.has(url)) return assetCache.get(url);
  const promise = (async () => {
    const base = dirname(url);
    const r = await fetch(url);
    if (!r.ok) throw new Error(`Modèle introuvable: ${url}`);
    const json = await r.json();
    const buffers = await Promise.all((json.buffers || []).map((b) => fetchArrayBuffer(base + b.uri)));
    const images = json.images || [];
    const textureDefs = json.textures || [];
    const texturePromises = textureDefs.map(async (td) => {
      const img = images[td.source];
      return img?.uri ? loadTexture(base + img.uri, false) : null;
    });
    const textures = await Promise.all(texturePromises);

    const materials = await Promise.all((json.materials || []).map(async (m) => {
      const pbr = m.pbrMetallicRoughness || {};
      const alpha = pbr.baseColorFactor || [1, 1, 1, 1];
      const mat = new T.MeshStandardMaterial({
        name: m.name || "",
        color: colorFactor(alpha),
        opacity: alpha[3] ?? 1,
        transparent: m.alphaMode === "BLEND" || (alpha[3] ?? 1) < 1,
        alphaTest: m.alphaMode === "MASK" ? (m.alphaCutoff ?? 0.5) : 0,
        side: m.doubleSided ? T.DoubleSide : T.FrontSide,
        metalness: pbr.metallicFactor ?? 1,
        roughness: pbr.roughnessFactor ?? 1,
      });
      if (pbr.baseColorTexture) {
        mat.map = textures[pbr.baseColorTexture.index];
        if (mat.map) mat.map.colorSpace = T.SRGBColorSpace;
      }
      if (pbr.metallicRoughnessTexture) {
        const t = textures[pbr.metallicRoughnessTexture.index];
        mat.metalnessMap = t;
        mat.roughnessMap = t;
      }
      if (m.normalTexture) {
        mat.normalMap = textures[m.normalTexture.index];
        mat.normalScale.set(m.normalTexture.scale ?? 1, -(m.normalTexture.scale ?? 1));
      }
      if (m.emissiveFactor) mat.emissive.fromArray(m.emissiveFactor);
      if (m.emissiveTexture) {
        mat.emissiveMap = textures[m.emissiveTexture.index];
        if (mat.emissiveMap) mat.emissiveMap.colorSpace = T.SRGBColorSpace;
      }
      mat.needsUpdate = true;
      return mat;
    }));

    const geometries = (json.meshes || []).map((mesh) => mesh.primitives.map((p) => {
      const g = new T.BufferGeometry();
      const map = {
        POSITION: "position",
        NORMAL: "normal",
        TEXCOORD_0: "uv",
        COLOR_0: "color",
        JOINTS_0: "skinIndex",
        WEIGHTS_0: "skinWeight",
      };
      for (const [semantic, ai] of Object.entries(p.attributes || {})) {
        const name = map[semantic];
        if (!name) continue;
        const a = accessorArray(json, buffers, ai);
        g.setAttribute(name, new T.BufferAttribute(a.array, a.itemSize, a.normalized));
      }
      if (p.indices !== undefined) {
        const a = accessorArray(json, buffers, p.indices);
        g.setIndex(new T.BufferAttribute(a.array, 1, a.normalized));
      }
      if (!g.getAttribute("normal")) g.computeVertexNormals();
      g.computeBoundingBox();
      g.computeBoundingSphere();
      return { geometry: g, material: materials[p.material] || new T.MeshStandardMaterial({ color: 0xffffff }) };
    }));
    return { json, buffers, materials, geometries };
  })();
  assetCache.set(url, promise);
  return promise;
}

function applyTransform(obj, n) {
  if (n.matrix) {
    obj.matrix.fromArray(n.matrix);
    obj.matrix.decompose(obj.position, obj.quaternion, obj.scale);
  } else {
    if (n.translation) obj.position.fromArray(n.translation);
    if (n.rotation) obj.quaternion.fromArray(n.rotation);
    if (n.scale) obj.scale.fromArray(n.scale);
  }
}

async function instantiateGltf(url) {
  const asset = await prepareGltf(url);
  const { json, buffers, geometries } = asset;
  const boneIds = new Set((json.skins || []).flatMap((s) => s.joints || []));
  const nodes = (json.nodes || []).map((n, i) => {
    const o = boneIds.has(i) ? new T.Bone() : new T.Group();
    o.name = n.name || `node_${i}`;
    applyTransform(o, n);
    return o;
  });
  (json.nodes || []).forEach((n, i) => (n.children || []).forEach((c) => nodes[i].add(nodes[c])));

  const scene = new T.Group();
  scene.name = json.scenes?.[json.scene || 0]?.name || "CharacterAsset";
  for (const i of json.scenes?.[json.scene || 0]?.nodes || []) scene.add(nodes[i]);
  scene.updateMatrixWorld(true);

  const pendingSkin = [];
  (json.nodes || []).forEach((n, i) => {
    if (n.mesh === undefined) return;
    const parts = geometries[n.mesh] || [];
    for (const part of parts) {
      const mesh = n.skin !== undefined
        ? new T.SkinnedMesh(part.geometry, part.material)
        : new T.Mesh(part.geometry, part.material);
      mesh.name = `${nodes[i].name}_mesh`;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = true;
      nodes[i].add(mesh);
      if (n.skin !== undefined) pendingSkin.push({ mesh, skin: n.skin, node: nodes[i] });
    }
  });
  scene.updateMatrixWorld(true);

  for (const bind of pendingSkin) {
    const skin = json.skins[bind.skin];
    const bones = skin.joints.map((j) => nodes[j]);
    let inverses = undefined;
    if (skin.inverseBindMatrices !== undefined) {
      const a = accessorArray(json, buffers, skin.inverseBindMatrices).array;
      inverses = bones.map((_, k) => new T.Matrix4().fromArray(a, k * 16));
    }
    const skeleton = new T.Skeleton(bones, inverses);
    bind.mesh.bind(skeleton, bind.node.matrixWorld);
    bind.mesh.normalizeSkinWeights();
  }
  scene.updateMatrixWorld(true);
  return scene;
}

function parseGlb(buffer) {
  const dv = new DataView(buffer);
  if (dv.getUint32(0, true) !== 0x46546c67) throw new Error("GLB invalide");
  let offset = 12;
  let json = null, bin = null;
  while (offset < buffer.byteLength) {
    const len = dv.getUint32(offset, true);
    const type = dv.getUint32(offset + 4, true);
    const data = buffer.slice(offset + 8, offset + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(new TextDecoder().decode(data).replace(/\0+$/g, "").trim());
    if (type === 0x004e4942) bin = data;
    offset += 8 + len;
  }
  return { json, buffers: [bin] };
}

async function animationClips(url) {
  const buf = await fetchArrayBuffer(url);
  const { json, buffers } = parseGlb(buf);
  const clips = [];
  for (const a of json.animations || []) {
    const tracks = [];
    for (const ch of a.channels || []) {
      const s = a.samplers[ch.sampler];
      const target = json.nodes[ch.target.node]?.name;
      if (!target || target === "Mannequin") continue;
      const times = accessorArray(json, buffers, s.input).array;
      const vals = accessorArray(json, buffers, s.output).array;
      const path = ch.target.path;
      if (path === "rotation") tracks.push(new T.QuaternionKeyframeTrack(`${target}.quaternion`, times, vals));
      else if (path === "translation") tracks.push(new T.VectorKeyframeTrack(`${target}.position`, times, vals));
      else if (path === "scale") tracks.push(new T.VectorKeyframeTrack(`${target}.scale`, times, vals));
    }
    clips.push(new T.AnimationClip(a.name || `anim_${clips.length}`, -1, tracks));
  }
  return clips;
}

async function getAnimations() {
  if (!animationPromise) {
    animationPromise = Promise.all([
      animationClips(`${ROOT}animations/UAL1_Standard.glb`),
      animationClips(`${ROOT}animations/UAL2_Standard.glb`),
    ]).then((sets) => new Map(sets.flat().map((c) => [c.name, c])));
  }
  return animationPromise;
}

const VARIANTS = {
  // The hero has a reserved outfit/colour combination. No NPC reuses it.
  player: { gender: "male", outfit: "Male_Ranger_Player", hair: "Hair_SimpleParted", idle: "Idle_Loop" },
  maelle: { gender: "female", outfit: "Female_Peasant", hair: "Hair_Buns", idle: "Idle_FoldArms_Loop" },
  soline: { gender: "female", outfit: "Female_Peasant_Alt", hair: "Hair_Long", idle: "Idle_Loop" },
  ivo: { gender: "male", outfit: "Male_Peasant", hair: "Hair_SimpleParted", idle: "Idle_FoldArms_Loop" },
  noe: { gender: "male", outfit: "Male_Peasant_Alt", hair: "Hair_Buzzed", idle: "Idle_Loop" },
  ysee: { gender: "female", outfit: "Female_Ranger", hair: "Hair_Long", idle: "Idle_Loop" },
  tess: { gender: "female", outfit: "Female_Peasant_Alt", hair: "Hair_BuzzedFemale", idle: "Idle_FoldArms_Loop" },
  orin: { gender: "male", outfit: "Male_Peasant_Alt", hair: "Hair_Beard", idle: "Idle_Loop" },
  alba: { gender: "female", outfit: "Female_Ranger_Alt", hair: "Hair_BuzzedFemale", idle: "Idle_Loop" },
};

function pathsFor(v) {
  return [
    `${ROOT}base/Superhero_${v.gender === "female" ? "Female" : "Male"}_FullBody.gltf`,
    `${ROOT}outfits/${v.outfit}.gltf`,
    `${ROOT}hair/${v.hair}.gltf`,
  ];
}

export function character(kind = "player", fallbackColor = "#698895") {
  const v = VARIANTS[kind] || VARIANTS.player;
  const group = new T.Group();
  group.userData.characterKind = kind;
  const fallback = human(fallbackColor, v.gender === "female" ? "#d5b496" : "#cda882", kind === "player");
  group.add(fallback);
  const state = {
    fallback,
    layers: [],
    mixers: [],
    actions: new Map(),
    current: "",
    oneShotUntil: 0,
    lastT: 0,
    idle: v.idle || "Idle_Loop",
    ready: false,
    toolAnchor: fallback.userData.arms[1],
  };

  group.userData.arms = fallback.userData.arms;
  group.userData.legs = fallback.userData.legs;
  group.userData.backpack = fallback.userData.backpack;
  group.userData.ready = false;

  const setAction = (name, once = false, now = state.lastT) => {
    if (!state.ready || !name || state.current === name) return;
    const clip = state.clips?.get(name);
    if (!clip) return;
    for (const mixer of state.mixers) {
      const prev = state.actions.get(`${state.current}|${state.mixers.indexOf(mixer)}`);
      if (prev) prev.fadeOut(0.16);
      let action = mixer.clipAction(clip);
      action.reset().enabled = true;
      if (once) {
        action.setLoop(T.LoopOnce, 1);
        action.clampWhenFinished = true;
      } else {
        action.setLoop(T.LoopRepeat, Infinity);
        action.clampWhenFinished = false;
      }
      action.fadeIn(0.18).play();
      state.actions.set(`${name}|${state.mixers.indexOf(mixer)}`, action);
    }
    state.current = name;
    if (once) state.oneShotUntil = now + Math.max(0.25, clip.duration - 0.05);
  };

  group.userData.playAction = (name) => setAction(name, true, state.lastT);
  group.userData.animate = (t, moving, running = false, dtOverride = null) => {
    if (!state.ready) {
      fallback.userData.animate(t, moving);
      return;
    }
    let dt = dtOverride;
    if (!(dt >= 0 && dt < 0.2)) dt = state.lastT ? Math.max(0, Math.min(0.05, t - state.lastT)) : 0.016;
    state.lastT = t;
    for (const mixer of state.mixers) mixer.update(dt);
    state.alignGrip?.();
    if (t < state.oneShotUntil) return;
    const desired = moving ? (running ? "Sprint_Loop" : "Walk_Loop") : state.idle;
    if (desired !== state.current) setAction(desired, false, t);
  };

  const readyPromise = Promise.all([getAnimations(), ...pathsFor(v).map(instantiateGltf)])
    .then(([clips, base, outfit, hair]) => {
      state.clips = clips;
      const layers = [base, outfit, hair];
      const visual = new T.Group();
      visual.name = `${kind}_visual`;
      for (const layer of layers) {
        layer.traverse((o) => {
          if (o.isMesh || o.isSkinnedMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        visual.add(layer);
      }
      // Assets use real-world proportions close to Ambrelune's existing 1.8 m humans.
      const box = new T.Box3().setFromObject(base);
      const h = Math.max(0.1, box.max.y - box.min.y);
      const scale = 1.82 / h;
      visual.scale.setScalar(scale);
      group.add(visual);
      group.remove(fallback);

      // Rebind clothing and hair to the base character skeleton. This keeps all three
      // visual layers perfectly synchronized while requiring only one AnimationMixer
      // per character — important for smartphone performance.
      const baseBones = new Map();
      base.traverse((o) => { if (o.isBone && o.name) baseBones.set(o.name, o); });
      for (const layer of [outfit, hair]) {
        layer.traverse((o) => {
          if (!o.isSkinnedMesh || !o.skeleton) return;
          const mapped = o.skeleton.bones.map((b) => baseBones.get(b.name));
          if (mapped.every(Boolean)) {
            const inverses = o.skeleton.boneInverses.map((m) => m.clone());
            const skeleton = new T.Skeleton(mapped, inverses);
            o.bind(skeleton, o.bindMatrix.clone());
          }
        });
      }
      state.layers = layers;
      state.mixers = [new T.AnimationMixer(base)];
      state.ready = true;
      group.userData.ready = true;

      const hand = base.getObjectByName("hand_r") || base.getObjectByName("hand_l");
      const anchor = new T.Group();
      anchor.name = "AmbreluneToolAnchor";
      anchor.position.set(0, .085, .015);
      // Local +Y runs from wrist to fingers. Place the grip inside the palm.
      anchor.rotation.set(0,0,0);
      anchor.scale.setScalar(1/scale);
      if (hand) hand.add(anchor); else base.add(anchor);
      // Keep the can upright while following the animated palm, independently of wrist roll.
      const handQ=new T.Quaternion(),bodyQ=new T.Quaternion();
      state.alignGrip=()=>{anchor.parent.getWorldQuaternion(handQ);group.getWorldQuaternion(bodyQ);anchor.quaternion.copy(handQ.invert()).multiply(bodyQ);};
      state.alignGrip();
      // Preserve only the equipped tool while the HD character was still loading.
      // The procedural fallback arm also contains its own elbow/hand hierarchy, which must not migrate.
      const equipped = state.toolAnchor.children.find((c) => c.name === "HeldTool");
      if (equipped) anchor.add(equipped);
      state.toolAnchor = anchor;
      group.userData.arms = [new T.Group(), anchor];
      group.userData.legs = [];
      group.userData.backpack = null;
      setAction(state.idle, false, state.lastT || 0);
    })
    .catch((err) => {
      console.warn("Ambrelune: personnage HD non chargé, modèle de secours conservé.", kind, err);
      throw err;
    });
  group.userData.whenReady = readyPromise;

  return group;
}

export function characterActionForTool(tool) {
  if (tool === "water") return "Farm_Watering";
  if (tool === "hoe") return "Farm_PlantSeed";
  if (tool === "axe") return "TreeChopping_Loop";
  if (tool === "pick") return "TreeChopping_Loop";
  return "Interact";
}

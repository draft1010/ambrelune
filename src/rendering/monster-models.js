import { T, creature as proceduralCreature } from "./art.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

/*
 * Ambrelune - acteurs de monstres glTF
 *
 * Le groupe est créé immédiatement avec la créature procédurale historique.
 * Si le glTF se charge correctement, il remplace le fallback sans changer
 * l'API utilisée par le reste du jeu (userData.animate). Si le chargement
 * échoue, le jeu continue donc normalement avec l'ancien modèle.
 */

const loader = new GLTFLoader();
T.Cache.enabled = true;

const MODEL_CONFIG = {
  velune: {
    url: "./assets/monsters/velune.gltf",
    height: 1.55,
    idle: ["Idle"],
    move: ["Walk"],
    attack: ["Bite_Front", "Jump"],
    hit: ["HitRecieve", "HitReact"],
    death: ["Death"],
  },
  ondril: {
    url: "./assets/monsters/ondril.gltf",
    height: 1.55,
    hover: 0.25,
    idle: ["Flying_Idle", "Idle"],
    move: ["Fast_Flying", "Walk"],
    attack: ["Headbutt", "Punch"],
    hit: ["HitReact", "HitRecieve"],
    death: ["Death"],
  },
  brasile: {
    url: "./assets/monsters/brasile.gltf",
    height: 1.45,
    idle: ["Idle"],
    move: ["Walk"],
    attack: ["Bite_Front", "Jump"],
    hit: ["HitRecieve", "HitReact"],
    death: ["Death"],
  },
  moussier: {
    url: "./assets/monsters/moussier.gltf",
    height: 1.65,
    idle: ["Idle"],
    move: ["Walk"],
    attack: ["Bite_Front", "Jump"],
    hit: ["HitRecieve", "HitReact"],
    death: ["Death"],
  },
  vrille: {
    url: "./assets/monsters/vrille.gltf",
    height: 1.55,
    hover: 0.35,
    idle: ["Flying_Idle", "Idle"],
    move: ["Fast_Flying", "Walk"],
    attack: ["Headbutt", "Punch"],
    hit: ["HitReact", "HitRecieve"],
    death: ["Death"],
  },
  lumignon: {
    url: "./assets/monsters/lumignon.gltf",
    height: 1.6,
    hover: 0.38,
    idle: ["Flying_Idle", "Idle"],
    move: ["Fast_Flying", "Walk"],
    attack: ["Headbutt", "Punch"],
    hit: ["HitReact", "HitRecieve"],
    death: ["Death"],
    glow: true,
  },
  coralys: {
    url: "./assets/monsters/coralys.gltf",
    height: 1.6,
    hover: 0.3,
    idle: ["Flying_Idle", "Idle"],
    move: ["Fast_Flying", "Walk"],
    attack: ["Headbutt", "Punch"],
    hit: ["HitReact", "HitRecieve"],
    death: ["Death"],
  },
  gardien: {
    url: "./assets/monsters/gardien.gltf",
    height: 2.5,
    idle: ["Idle"],
    move: ["Walk", "Run"],
    attack: ["Punch", "Jump"],
    hit: ["HitReact", "HitRecieve"],
    death: ["Death"],
  },
};

function firstClip(clips, names) {
  for (const wanted of names || []) {
    const exact = clips.find((clip) => clip.name === wanted);
    if (exact) return exact;
  }
  for (const wanted of names || []) {
    const lower = wanted.toLowerCase();
    const fuzzy = clips.find((clip) => clip.name.toLowerCase().includes(lower));
    if (fuzzy) return fuzzy;
  }
  return null;
}

function setMeshQuality(root, glow = false) {
  root.traverse((o) => {
    if (!o.isMesh && !o.isSkinnedMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;

    const materials = Array.isArray(o.material) ? o.material : [o.material];
    for (const material of materials) {
      if (!material) continue;
      if (material.map) {
        material.map.colorSpace = T.SRGBColorSpace;
        material.map.anisotropy = 4;
        material.map.needsUpdate = true;
      }
      if ("roughness" in material) material.roughness = Math.max(0.72, material.roughness ?? 0.85);
      if ("metalness" in material) material.metalness = 0;
      if (glow && "emissive" in material) {
        const base = material.color?.clone?.() || new T.Color("#f4d688");
        material.emissive.copy(base).multiplyScalar(0.22);
        material.emissiveIntensity = 0.35;
      }
    }
  });
}

function normalizeModel(model, targetHeight, hover = 0) {
  model.updateMatrixWorld(true);
  const box = new T.Box3().setFromObject(model);
  const size = box.getSize(new T.Vector3());
  const h = Math.max(0.001, size.y);
  const scale = targetHeight / h;
  model.scale.multiplyScalar(scale);
  model.updateMatrixWorld(true);

  const scaledBox = new T.Box3().setFromObject(model);
  const center = scaledBox.getCenter(new T.Vector3());
  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y += -scaledBox.min.y + hover;
  model.updateMatrixWorld(true);
}

function stopAll(actions, except = null, fade = 0.12) {
  for (const action of Object.values(actions)) {
    if (!action || action === except) continue;
    if (action.isRunning()) action.fadeOut(fade);
  }
}

function playLoop(actor, key, fade = 0.18) {
  if (!actor._loaded || actor._locked > 0 || actor._dead) return;
  const action = actor._actions[key];
  if (!action || actor._active === key) return;
  stopAll(actor._actions, action, fade);
  action.enabled = true;
  action.setLoop(T.LoopRepeat, Infinity);
  action.clampWhenFinished = false;
  action.reset().fadeIn(fade).play();
  actor._active = key;
}

function playOneShot(actor, key, duration = 0.65) {
  if (!actor._loaded || actor._dead) return;
  const action = actor._actions[key];
  if (!action) return;
  actor._locked = duration;
  stopAll(actor._actions, action, 0.08);
  action.enabled = true;
  action.setLoop(T.LoopOnce, 1);
  action.clampWhenFinished = true;
  action.reset().fadeIn(0.06).play();
  actor._active = key;
}

export function modelCreature(s, scale = 1) {
  const group = new T.Group();
  const fallback = proceduralCreature(s, scale);
  group.add(fallback);

  const cfg = MODEL_CONFIG[s.id];
  const actor = {
    _loaded: false,
    _dead: false,
    _locked: 0,
    _lastT: null,
    _active: "",
    _mixer: null,
    _model: null,
    _actions: {},
  };

  group.userData.isModelCreature = true;
  group.userData.modelReady = false;

  group.userData.animate = (t, moving = false) => {
    let dt = 0;
    if (actor._lastT !== null) dt = Math.max(0, Math.min(0.08, t - actor._lastT));
    actor._lastT = t;

    if (!actor._loaded) {
      fallback.userData.animate?.(t, moving);
      return;
    }

    actor._mixer?.update(dt);
    actor._locked = Math.max(0, actor._locked - dt);

    if (!actor._dead && actor._locked <= 0) {
      playLoop(actor, moving ? "move" : "idle");
    }

    if (cfg?.hover && actor._model && !actor._dead) {
      actor._model.position.y = actor._baseY + Math.sin(t * 2.25 + group.id * 0.13) * 0.055;
    }
  };

  group.userData.playAttack = () => playOneShot(actor, "attack", 0.68);
  group.userData.playHit = () => playOneShot(actor, "hit", 0.46);
  group.userData.playDeath = () => {
    if (!actor._loaded || actor._dead) return;
    actor._dead = true;
    const action = actor._actions.death;
    if (action) {
      stopAll(actor._actions, action, 0.08);
      action.enabled = true;
      action.setLoop(T.LoopOnce, 1);
      action.clampWhenFinished = true;
      action.reset().fadeIn(0.06).play();
      actor._active = "death";
    }
  };
  group.userData.resetAnimation = () => {
    actor._dead = false;
    actor._locked = 0;
    actor._active = "";
    if (actor._loaded) playLoop(actor, "idle", 0.08);
  };

  if (!cfg) return group;

  loader.load(
    cfg.url,
    (gltf) => {
      try {
        const model = gltf.scene;
        setMeshQuality(model, cfg.glow);
        normalizeModel(model, cfg.height * scale, (cfg.hover || 0) * scale);

        const mixer = new T.AnimationMixer(model);
        const clips = gltf.animations || [];
        const actions = {};
        const defs = {
          idle: cfg.idle,
          move: cfg.move,
          attack: cfg.attack,
          hit: cfg.hit,
          death: cfg.death,
        };

        for (const [key, names] of Object.entries(defs)) {
          const clip = firstClip(clips, names);
          if (clip) actions[key] = mixer.clipAction(clip);
        }

        actor._model = model;
        actor._baseY = model.position.y;
        actor._mixer = mixer;
        actor._actions = actions;
        actor._loaded = true;

        fallback.visible = false;
        group.add(model);
        group.userData.modelReady = true;
        playLoop(actor, "idle", 0.01);
      } catch (error) {
        console.warn(`[Ambrelune] Modèle ${s.id} invalide, fallback conservé.`, error);
      }
    },
    undefined,
    (error) => {
      console.warn(`[Ambrelune] Impossible de charger ${cfg.url}, fallback conservé.`, error);
    },
  );

  return group;
}

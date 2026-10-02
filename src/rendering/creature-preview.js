import { T } from "./art.js";
import { modelCreature } from "./monster-models.js";
import { species } from "../systems/data.js";

const previews = [];
let raf = 0;

const PRESET = {
  starter: { w: 150, h: 118, scale: 0.88, camZ: 4.4, camY: 1.16 },
  card: { w: 126, h: 104, scale: 0.82, camZ: 4.5, camY: 1.08 },
  companion: { w: 96, h: 84, scale: 0.72, camZ: 4.1, camY: 0.98 },
  bestiary: { w: 126, h: 104, scale: 0.82, camZ: 4.5, camY: 1.08 },
};

export function creaturePortrait3D(id, kind = "card") {
  return `<div class="creature-portrait3d ${kind}" data-creature3d="${id}" data-preview-kind="${kind}" role="img" aria-label="${species(id).name}"></div>`;
}

export function clearCreaturePortraits() {
  if (raf) {
    cancelAnimationFrame(raf);
    raf = 0;
  }
  while (previews.length) {
    const preview = previews.pop();
    try {
      preview.renderer.dispose();
      preview.creature?.traverse?.((o) => {
        if (o.geometry?.dispose) o.geometry.dispose();
        if (o.material) {
          const materials = Array.isArray(o.material) ? o.material : [o.material];
          materials.forEach((m) => {
            if (!m) return;
            if (m.map?.dispose) m.map.dispose();
          });
        }
      });
      preview.node.innerHTML = "";
    } catch {
      // noop
    }
  }
}

function makePreview(node) {
  const id = node.dataset.creature3d;
  const cfg = PRESET[node.dataset.previewKind] || PRESET.card;
  const renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(cfg.w, cfg.h, false);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.domElement.className = "creature-portrait3d-canvas";
  node.innerHTML = "";
  node.appendChild(renderer.domElement);

  const scene = new T.Scene();

  const camera = new T.PerspectiveCamera(28, cfg.w / cfg.h, 0.1, 40);
  camera.position.set(0, cfg.camY, cfg.camZ);
  camera.lookAt(0, 0.92, 0);

  const hemi = new T.HemisphereLight("#fff9e8", "#4d6b59", 1.35);
  scene.add(hemi);

  const key = new T.DirectionalLight("#fff6dc", 1.65);
  key.position.set(2.6, 4.2, 3.8);
  key.castShadow = true;
  key.shadow.mapSize.set(512, 512);
  key.shadow.camera.left = -3;
  key.shadow.camera.right = 3;
  key.shadow.camera.top = 3;
  key.shadow.camera.bottom = -3;
  scene.add(key);

  const fill = new T.DirectionalLight("#9cc5b7", 0.6);
  fill.position.set(-2.8, 2.2, -1.5);
  scene.add(fill);

  const pedestal = new T.Mesh(
    new T.CylinderGeometry(1.08, 1.24, 0.22, 28),
    new T.MeshStandardMaterial({ color: "#efe6c9", roughness: 0.94, metalness: 0 }),
  );
  pedestal.position.set(0, -0.1, 0);
  pedestal.receiveShadow = true;
  scene.add(pedestal);

  const shadow = new T.Mesh(
    new T.CircleGeometry(1.18, 30),
    new T.MeshBasicMaterial({ color: "#2a4037", transparent: true, opacity: 0.11 }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, 0.012, 0);
  scene.add(shadow);

  const creature = modelCreature(species(id), cfg.scale);
  creature.position.set(0, 0, 0);
  scene.add(creature);

  previews.push({ node, renderer, scene, camera, creature, shadow, seed: previews.length * 0.91 + 0.5 });
}

function loop(now) {
  const t = now * 0.001;
  for (const p of previews) {
    if (!p.node.isConnected) continue;
    p.creature.rotation.y = Math.sin(t * 0.8 + p.seed) * 0.22 + 0.4;
    p.creature.userData.animate?.(t, false);
    p.shadow.scale.setScalar(1 + Math.sin(t * 1.7 + p.seed) * 0.03);
    p.renderer.render(p.scene, p.camera);
  }
  if (previews.length) raf = requestAnimationFrame(loop);
  else raf = 0;
}

export function mountCreaturePortraits(root = document) {
  clearCreaturePortraits();
  const nodes = [...root.querySelectorAll("[data-creature3d]")];
  if (!nodes.length) return;
  nodes.forEach(makePreview);
  raf = requestAnimationFrame(loop);
}

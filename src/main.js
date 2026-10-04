import { prepareOccluders, updateCutawayScreen } from './rendering/occlusion.js';
import { FishingSession } from './rendering/fishing.js';
import { Interior, indoorHeight, indoorCollision, indoorPlacementCollision } from './rendering/interior.js';
import { CROPS, BUILDABLES, FOOD, spaceOf, footprint, furnitureBlocks, stationAvailable, transfer, recover, moveInventoryStack } from './systems/homestead.js';
import {
  gauge,
  teamView,
  bagView,
  craftView,
  gardenView,
  storageView,
} from "./rendering/journal-ui.js";
import { BattleStage } from "./rendering/battle-stage.js";
import { character, characterActionForTool, preloadCharacterAssets } from "./rendering/character-assets.js?v=22";
import { modelCreature, preloadMonsterModels } from "./rendering/monster-models.js?v=22";
import {
  creaturePortrait3D,
  mountCreaturePortraits,
  clearCreaturePortraits,
} from "./rendering/creature-preview.js";
import { findPath } from "./systems/navigation.js";
import { toolIcon } from "./rendering/icons.js";
import {
  T,
  Factory,
  creature,
  furnishing,
  mat,
  windUniform,
  foliageFocus,
  foliageCamera,
  foliageCutaway,
} from "./rendering/art.js";
import { World, height, riverX } from "./world/world.js";
import {
  SPECIES,
  MOVES,
  ITEMS,
  RECIPES,
  QUESTS,
  TOOLS,
  LANDMARKS,
  ELEMENT_NAMES,
  portrait,
  species,
} from "./systems/data.js";
import {
  newState,
  makeCreature,
  load,
  save,
  craft,
  canAfford,
  craftCanAfford,
  craftAvailable,
  craftOutputFits,
  spend,
  add,
  advanceQuest,
  tickFarm,
  farmAction,
  damage,
  captureChance,
  gainXp,
  canPlace,
} from "./systems/state.js";
import { Input } from "./systems/input.js?v=22";
import { AudioGarden } from "./systems/audio.js";
const $ = (id) => document.getElementById(id),
  esc = (s) =>
    String(s).replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const canvas = $("world"),
  scene = new T.Scene();
scene.background = new T.Color("#c8d8ce");
scene.fog = new T.Fog("#c8d8ce", 65, 135);
const renderer = new T.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.8));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = T.PCFSoftShadowMap;
renderer.outputColorSpace = T.SRGBColorSpace;
renderer.toneMapping = T.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
const camera = new T.PerspectiveCamera(38, innerWidth / innerHeight, 0.2, 220);
const ambient = new T.HemisphereLight("#dfe9d0", "#758668", 2.1);
scene.add(ambient);
const sun = new T.DirectionalLight("#fff0c9", 3.2);
sun.position.set(-25, 48, 30);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {
  left: -36,
  right: 36,
  top: 36,
  bottom: -36,
  near: 1,
  far: 140,
});
sun.shadow.bias = -0.00025;
sun.shadow.normalBias = 0.04;
sun.shadow.radius = 3;
scene.add(sun, sun.target);
const world = new World(scene),
  audio = new AudioGarden();
let state = newState(),
  started = false,
  tool = "hand",
  player,
  companion,
  heldTool,
  actionTimer = 0,
  modalTab = "team",
  selected = null,
  building = null,
  preview = null,
  battle = null,
  busy = false,
  toastTimer,
  bannerTimer,
  saveElapsed = 0,
  uiElapsed = 0,
  lastRegion = "",
  time = 0,
  frames = 0,
  frameElapsed = 0,
  fps = 0,
  frameMs = 0,
  lowRenderScale = 0.85,
  stepElapsed = 0,
  farmHelperElapsed = 0,
  lastDailyHour = 8;
let fishingSession=null;
let interior = null;
prepareOccluders(scene);
const currentScene = () => interior?.scene || scene;
const surfaceHeight = (x,z) => interior ? indoorHeight(x,z,state.player.y||0) : height(x,z);
const solidAt = (x,z,r=.4) => interior ? indoorCollision(x,z,r,state.player.y||0) : world.collides(x,z,r);
const placementSolidAt = (x,z,r=.12) => interior ? indoorPlacementCollision(x,z,r,state.player.y||0) : world.collides(x,z,r);
const snapPlacement = (value,type) => { const step=(interior||type==='fence')?.1:1; return Math.round(value/step)*step; };
const fenceEnds=(x,z,r)=>{const hx=Math.cos(r)*.95,hz=-Math.sin(r)*.95;return [{x:x+hx,z:z+hz},{x:x-hx,z:z-hz}];};
function refinePlacement(x,z,type,r=0,movingIndex=-1){
 x=snapPlacement(x,type); z=snapPlacement(z,type);
 if(interior){
  const [w,d]=footprint(type,r), maxX=8.875-w/2, maxZ=7.875-d/2, magnet=.16;
  // When an object is dragged close to an outer wall, magnetise its visible edge exactly onto the plaster face.
  if(Math.abs(Math.abs(x)-maxX)<=magnet || Math.abs(x)>maxX) x=(x<0?-1:1)*maxX;
  if(Math.abs(Math.abs(z)-maxZ)<=magnet || Math.abs(z)>maxZ) z=(z<0?-1:1)*maxZ;
  return {x,z};
 }
 if(type==='fence'){
  const own=fenceEnds(x,z,r); let best=null;
  state.buildings.forEach((b,i)=>{
   if(i===movingIndex || b.type!=='fence' || spaceOf(b)!=='world') return;
   const target=fenceEnds(b.x,b.z,b.r||0);
   own.forEach(a=>target.forEach(c=>{const dx=c.x-a.x,dz=c.z-a.z,dist=Math.hypot(dx,dz);if(dist<=.32 && (!best || dist<best.dist))best={x:x+dx,z:z+dz,dist};}));
  });
  if(best){x=best.x;z=best.z;}
 }
 return {x,z};
}
function syncWorld() { world.sync({...state,buildings:state.buildings.filter(b=>spaceOf(b)==='world')}); interior?.sync(state); }
function sceneTransition(){const veil=document.createElement('div');veil.className='scene-transition';document.body.append(veil);veil.addEventListener('animationend',()=>veil.remove(),{once:true});}
function enterHome(location='home') {
 sceneTransition();
 cancelBuild();closeModal();input.target=null;input.route=[];
 state.outdoorPlayer={...state.player};state.location=location;
 interior=new Interior();prepareOccluders(interior.root);interior.scene.add(player);companion.visible=false;
 state.player={x:0,z:4.5,y:0};player.position.set(0,0,4.5);
 input.zoom=7;camera.fov=55;camera.updateProjectionMatrix();cameraTarget.set(0,1,4.5);camera.position.set(3,2.7,7.3);
 interior.sync(state);document.body.classList.add('indoors');persist();
 toast('Bienvenue chez vous. L’escalier est à droite. Approchez de la porte pour sortir.');
}
function leaveHome() {
 sceneTransition();
 cancelBuild();closeModal();scene.add(player);companion.visible=true;
 interior?.dispose();interior=null;state.location='world';
 state.player=state.outdoorPlayer||{x:-36,z:29};delete state.player.y;
 input.zoom=21;camera.fov=38;camera.updateProjectionMatrix();input.target=null;input.route=[];
 cameraTarget.set(state.player.x,height(state.player.x,state.player.z)+1,state.player.z);
 player.position.set(state.player.x,height(state.player.x,state.player.z),state.player.z);
 document.body.classList.remove('indoors');persist();
}
let inventoryDragSuppressUntil = 0;
function bindInventoryDragDrop(storage = null, storageIndex = -1) {
  const root = $("modalContent");
  if (!root) return;
  const slots = [...root.querySelectorAll('[data-slot-area][data-slot-index]')];
  if (!slots.length) return;

  root.addEventListener('click', (event) => {
    if (Date.now() < inventoryDragSuppressUntil && event.target.closest('[data-slot-area][data-slot-index]')) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  let drag = null;
  let hover = null;
  const clearHover = () => {
    if (hover) hover.classList.remove('drag-target');
    hover = null;
  };
  const finishVisual = () => {
    clearHover();
    drag?.source?.classList.remove('drag-source');
    drag?.ghost?.remove();
    document.body.classList.remove('inventory-dragging');
  };
  const slotAt = (x, y) => {
    const hit = document.elementFromPoint(x, y)?.closest?.('[data-slot-area][data-slot-index]');
    return hit && root.contains(hit) ? hit : null;
  };
  const moveGhost = (x, y) => {
    if (!drag?.ghost) return;
    drag.ghost.style.left = `${x}px`;
    drag.ghost.style.top = `${y}px`;
  };
  const refresh = () => {
    const paper = document.querySelector('#modal .paper');
    const oldTop = paper?.scrollTop || 0;
    const journal = document.querySelector('#modal .journal-content');
    const oldJournalTop = journal?.scrollTop || 0;
    if (storage) furnishingMenu(storageIndex);
    else openMenu('bag');
    const restore = () => {
      const nextPaper = document.querySelector('#modal .paper');
      if (nextPaper) nextPaper.scrollTop = oldTop;
      const nextJournal = document.querySelector('#modal .journal-content');
      if (nextJournal) nextJournal.scrollTop = oldJournalTop;
    };
    restore();
    requestAnimationFrame(restore);
  };

  for (const slot of slots) {
    if (!slot.classList.contains('filled')) continue;
    slot.addEventListener('pointerdown', (event) => {
      if (event.button !== undefined && event.button !== 0) return;
      slot.setPointerCapture?.(event.pointerId);
      drag = {
        pointerId: event.pointerId,
        source: slot,
        fromArea: slot.dataset.slotArea,
        fromIndex: +slot.dataset.slotIndex,
        startX: event.clientX,
        startY: event.clientY,
        active: false,
        ghost: null,
      };
    });
  }

  const onMove = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (!drag.active && Math.hypot(dx, dy) < 8) return;
    if (!drag.active) {
      drag.active = true;
      inventoryDragSuppressUntil = Date.now() + 800;
      drag.source.classList.add('drag-source');
      drag.ghost = drag.source.cloneNode(true);
      drag.ghost.removeAttribute('id');
      drag.ghost.classList.add('inventory-drag-ghost');
      drag.ghost.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'));
      document.body.appendChild(drag.ghost);
      document.body.classList.add('inventory-dragging');
    }
    event.preventDefault();
    moveGhost(event.clientX, event.clientY);
    const target = slotAt(event.clientX, event.clientY);
    if (target !== hover) {
      clearHover();
      hover = target;
      hover?.classList.add('drag-target');
    }
  };

  const onEnd = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const current = drag;
    current.source?.releasePointerCapture?.(event.pointerId);
    const target = current.active ? slotAt(event.clientX, event.clientY) : null;
    if (current.active) {
      event.preventDefault();
      inventoryDragSuppressUntil = Date.now() + 800;
      if (target) {
        const changed = moveInventoryStack(
          state,
          storage,
          current.fromArea,
          current.fromIndex,
          target.dataset.slotArea,
          +target.dataset.slotIndex,
        );
        if (changed) {
          persist();
          refresh();
        }
      }
    }
    finishVisual();
    drag = null;
  };

  const onCancel = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.source?.releasePointerCapture?.(event.pointerId);
    finishVisual();
    drag = null;
  };
  root.addEventListener('pointermove', onMove, { passive: false });
  root.addEventListener('pointerup', onEnd, { passive: false });
  root.addEventListener('pointercancel', onCancel, { passive: true });
}

function furnishingMenu(index) {
 const b=state.buildings[index];if(!b)return;
 const storage=['chest','shelf','wardrobe'].includes(b.type);
 showModal(`<span class="eyebrow">AMÉNAGEMENT</span><h2>${ITEMS[b.type]}</h2><div class="card-actions"><button id="moveObject">Déplacer / tourner</button><button id="recoverObject">Récupérer</button>${b.type==='sleepingBed'?'<button id="restMorning">Jusqu’au matin</button><button id="restEvening">Jusqu’au soir</button>':''}${['workbench','furnace','stove','composter'].includes(b.type)?'<button id="useStation">Fabriquer ici</button>':''}</div>${storage?storageView(state,b):''}`);
 $('moveObject').onclick=()=>startBuild(b.type,index);
 $('recoverObject').onclick=()=>{if(!recover(state,index))return toast('Videz le rangement et libérez une case dans le sac.');syncWorld();persist();closeModal();};
 if($('useStation'))$('useStation').onclick=()=>openMenu('craft');
 for(const [id,morning] of [['restMorning',true],['restEvening',false]]) if($(id))$(id).onclick=()=>{if(morning || state.time>=19)state.day++;state.time=morning?7:19;tickFarm(state,65);state.team.forEach(c=>{c.hp=c.maxHp;c.energy=30;c.status=null;});closeModal();syncWorld();persist();toast('Votre équipe est reposée.');};
 for(const [attr,to] of [['store',true],['take',false]])document.querySelectorAll('[data-'+attr+']').forEach(btn=>btn.onclick=()=>{if(!transfer(state,b,btn.dataset[attr],1,to))return toast(to?'Ce rangement est plein.':'Votre sac est plein.');persist();const paper=document.querySelector('#modal .paper'),top=paper?.scrollTop||0;furnishingMenu(index);const restore=()=>{const next=document.querySelector('#modal .paper');if(next)next.scrollTop=top;};restore();requestAnimationFrame(restore);});
 if(storage) bindInventoryDragDrop(b,index);
}
const errors = [];
window.addEventListener("error", (e) => errors.push(e.message));
const raycaster = new T.Raycaster(),
  groundPlane = new T.Plane(new T.Vector3(0, 1, 0), 0),
  aimPoint = new T.Vector3(),
  cameraTarget = new T.Vector3(-9, 1, 3),
  cameraPos = new T.Vector3();
const input = new Input(canvas, {
  action: interact,
  tool: (i) => selectTool(TOOLS[i][0]),
  menu: () => openMenu(),
  map: () => openMenu("map"),
  rotate: () => {
    if (building) {
      building.r += Math.PI / 2;
      Object.assign(building, refinePlacement(building.x, building.z, building.type, building.r, building.movingIndex));
    }
  },
  escape: () => {
    if(fishingSession)return fishingSession.finish(false,"La ligne est rangée.");
    if (building) cancelBuild();
    else if (!$("modal").hidden) closeModal();
    else if (!battle && started) openMenu("settings");
  },
  onStart: () => {
    if (started) audio.start();
  },
});
input.onGround = (sx, sy) => {
  if (!started || !building || battle || fishingSession || !$("modal").hidden) return;
  raycaster.setFromCamera(
    { x: (sx / innerWidth) * 2 - 1, y: 1 - (sy / innerHeight) * 2 },
    camera,
  );
  const hit = raycaster.intersectObjects(interior ? [interior.floors[(state.player.y||0)>3.3?1:0]] : world.pickSurfaces)[0];
  if (hit) {
    aimPoint.copy(hit.point);
    if (building) {
      Object.assign(building, refinePlacement(aimPoint.x, aimPoint.z, building.type, building.r, building.movingIndex));
    }
  }
};
input.onObject=(sx,sy)=>{
 if(!started||battle||building||!$('modal').hidden)return false;
 raycaster.setFromCamera({x:sx/innerWidth*2-1,y:1-sy/innerHeight*2},camera);
 const hit=raycaster.intersectObjects(interior ? interior.furniture.children : world.buildMeshes,true)[0];
 if(!hit)return false;let root=hit.object;while(root&&!root.userData.building)root=root.parent;
 const index=state.buildings.indexOf(root?.userData.building);if(index<0)return false;
 input.route=[];input.target=null;furnishingMenu(index);return true;
};
function toast(text) {
  $("toast").textContent = text;
  $("toast").classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("toast").classList.remove("show"), 3500);
}
function showModal(html, closable = true) {
  clearCreaturePortraits();
  const paper = document.querySelector("#modal .paper");
  const isJournal = html.includes('class="journal-shell"');
  const isStorage = html.includes('class="storage-inventory"');
  const isInventory = html.includes('class="inventory-layout"');
  paper?.classList.toggle("journal-paper", isJournal);
  paper?.classList.toggle("storage-paper", isStorage);
  paper?.classList.toggle("inventory-paper", isInventory);
  paper?.classList.toggle("story-dialog", !isJournal && !isStorage && !isInventory);
  $("modalContent").innerHTML = html;
  $("modal").hidden = false;
  $("hud").inert=true;$("intro").inert=true;
  document.body.classList.add("modal-open");
  $("closeModal").hidden = !closable;
  input.target = null;
  input.route=[];input.stick={x:0,y:0};input.running=false;
  input.keys.clear();
  mountCreaturePortraits($("modalContent"));

  // Desktop: make the premium journal reliably wheel-scrollable even when
  // the pointer is over the header/sidebar or a nested card. Mobile keeps
  // its full-sheet native touch scrolling.
  if (paper) {
    const desktopJournal =
      paper.classList.contains("journal-paper") &&
      matchMedia("(pointer: fine)").matches;
    paper.onwheel = desktopJournal
      ? (event) => {
          const content = paper.querySelector(".journal-content");
          if (!content || content.scrollHeight <= content.clientHeight) return;
          const before = content.scrollTop;
          content.scrollTop += event.deltaY;
          if (content.scrollTop !== before) event.preventDefault();
        }
      : null;
  }
}
function closeModal() {
  clearCreaturePortraits();
  $("modal").hidden = true;
  $("hud").inert=false;$("intro").inert=false;
  document.body.classList.remove("modal-open");
  input.keys.clear();
  canvas.focus();
}
function persist(show = false) {
  try {
    save(state);
    if (show) toast("Votre voyage est sauvegardé sur cet appareil.");
  } catch {
    toast(
      "La sauvegarde locale a échoué. Exportez votre carnet dans les paramètres.",
    );
  }
}
function ensurePlots() {
  if (!state.plots.length)
    for (let z = 0; z < 3; z++)
      for (let x = 0; x < 4; x++)
        state.plots.push({
          id: `plot${z * 4 + x}`,
          x: -29 + x * 2.25,
          z: 28 + z * 2.25,
          stage: 0,
          water: 0,
          growth: 0,
        });
}
function setupActors() {
  if (player) player.removeFromParent();
  if (companion) { companion.removeFromParent();companion.userData.dispose?.(); }
  player = character("player", state.color);
  currentScene().add(player);
  player.position.set(
    state.player.x,
    surfaceHeight(state.player.x, state.player.z),
    state.player.z,
  );
  companion = modelCreature(species(state.team[0].id), 0.8);
  scene.add(companion);
  companion.position.set(
    state.player.x - 1,
    surfaceHeight(state.player.x - 1, state.player.z + 1),
    state.player.z + 1,
  );
}
async function requestGameFullscreen() {
  try {
    if(!document.fullscreenElement && document.documentElement.requestFullscreen)
      await document.documentElement.requestFullscreen({navigationUI:'hide'});
  } catch {}
  // Installed applications and supported fullscreen browsers can lock directly.
  try { await screen.orientation?.lock?.('landscape'); } catch {}
}

function begin(s) {
  requestGameFullscreen();
  input.zoom = 21;
  fishingSession?.finish(false,"La ligne est rangée.");
  if(battle)endBattle("Fin de la rencontre.");
  if(interior)leaveHome();
  const resume=s.location && s.location!=="world" ? {location:s.location,player:{...s.player}} : null;
  state = s;
  if(state.location!=="world"){state.player=state.outdoorPlayer||{x:-36,z:29};state.location="world";}
  if(!resume && world.collides(state.player.x,state.player.z,.4)){
    const origin={...state.player};
    outer:for(let radius=.5;radius<14;radius+=.5)for(let i=0;i<24;i++){const x=origin.x+Math.cos(i*Math.PI/12)*radius,z=origin.z+Math.sin(i*Math.PI/12)*radius;if(!world.collides(x,z,.45)){state.player={x,z};break outer;}}
  }
  ensurePlots();
  started = true;
  setupActors();
  syncWorld();
  $("intro").hidden = true;
  $("hud").hidden = false;
  audio.enabled = state.settings.sound;
  audio.start();
  applySettings();
  renderToolbelt();
  updateHUD();
  cameraTarget.set(state.player.x, 1, state.player.z);
  if(resume){enterHome(resume.location);state.player=resume.player;movePlayer(0);cameraTarget.copy(player.position).add(new T.Vector3(0,1,0));}
  persist();
}
function introChoice() {
  showModal(
    `<span class="eyebrow">PROLOGUE · LA LETTRE DE MAËLLE</span><h2>« Le jardin t’attend. »</h2><p>Votre tante vous a légué une maison aux portes d’Ambrelune. Depuis que la Source s’est tue, les jardins perdent leur éclat. Maëlle pense qu’un nouveau lien pourrait les réveiller.</p><div class="settings"><label>Votre nom <input id="playerName" value="Élo" maxlength="24" aria-label="Votre nom"></label></div><div class="cards">${SPECIES.slice(
      0,
      3,
    )
      .map(
        (c) =>
          `<article class="card">${creaturePortrait3D(c.id, "starter")}<span class="tag">${ELEMENT_NAMES[c.element]}</span><h3>${c.name}</h3><p>${c.desc}</p><button data-starter="${c.id}">Choisir ${c.name}</button></article>`,
      )
      .join(
        "",
      )}</div><small>Votre compagnon explore, combat et prend soin du jardin avec vous.</small>`,
    false,
  );
  document.querySelectorAll("[data-starter]").forEach(
    (b) =>
      (b.onclick = () => {
        const s = newState(
          b.dataset.starter,
          $("playerName").value.trim() || "Élo",
          "#657d95",
        );
        if (matchMedia("(pointer:coarse)").matches) {
          s.settings.touch = true;
        }
        closeModal();
        begin(s);
        toast("Bienvenue à Ambrelune. Maëlle vous attend près de la fontaine.");
      }),
  );
}
$("newBtn").onclick = introChoice;
$("continueBtn").onclick = () => {
  const s = load();
  if (s) begin(s);
};
$("closeModal").onclick = closeModal;
// Android/coarse pointer fallback: some browsers can suppress the synthetic click
// inside the fullscreen inventory after touch-action changes. Pointer-up closes it
// directly without affecting mouse/desktop behaviour.
$("closeModal").addEventListener("pointerup", (event) => {
  if (event.pointerType !== "touch") return;
  event.preventDefault();
  event.stopPropagation();
  closeModal();
});
$("menuBtn").onclick = () => openMenu();
$("mapBtn").onclick = () => openMenu("map");
$("actBtn").onclick = interact;
$("rotateBtn").onclick = () => {
  if (building) building.r += Math.PI / 2;
};
$("placeBtn").onclick = placeBuilding;
$("cancelBuild").onclick = cancelBuild;
function selectTool(id) {
  if (!started || battle) return;
  if (id === "journal") return openMenu();
  if (id === "build") return openMenu("build");
  tool = id;
  equipTool();
  updateHUD();
  audio.play();
}
function equipTool() {
  if (heldTool) heldTool.removeFromParent();
  heldTool = new T.Group();
  heldTool.name = "HeldTool";
  const f = new Factory(heldTool);
  // Model the grip at the origin so the hand socket no longer grips empty space.
  if(['axe','pick','hoe'].includes(tool)) {
    heldTool.rotation.x=.3;
    f.part('cylinder','#9b7b50',0,.12,0,.028,.85,.028,0,0,0,'wood');
    if(tool==='axe')f.part('box','#9eaaa1',.12,.5,0,.3,.21,.065);
    if(tool==='pick')f.part('box','#83978e',0,.5,0,.54,.085,.07,0,0,-.14);
    if(tool==='hoe')f.part('box','#83978e',0,.49,.09,.24,.065,.25);
  } else if(tool==='water') {
    f.part('cylinder','#87a99b',0,-.25,0,.19,.28,.19);
    f.part('torus','#b9c7a4',0,-.06,0,.13,.13,.13,0,Math.PI/2);
    f.part('cylinder','#94b5aa',0,-.16,.29,.035,.36,.035,Math.PI/2-.3);
    f.part('sphere','#b9c7a4',0,-.1,.46,.095,.065,.04);
  }
  player.userData.arms[1].add(heldTool);
}
function renderToolbelt() {
  const belt = $("toolbelt");
  if (!belt) return;
  belt.innerHTML = TOOLS.map(
    ([id, icon, name], i) =>
      `<button class="tool ${id === tool ? "active" : ""}" data-tool="${id}" aria-label="${name}" title="${name} · ${i + 1}"><kbd>${i + 1}</kbd>${toolIcon(id)}<span>${name}</span></button>`,
  ).join("");
  belt.querySelectorAll("[data-tool]").forEach(
    (b) => (b.onclick = () => selectTool(b.dataset.tool)),
  );
}
const QUEST_TARGETS = ["city", "home", "forest", "home", "home", "ruins", null];

function currentQuestIndex() {
  const raw = Number(state?.quest);
  if (!Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(QUESTS.length - 1, Math.trunc(raw)));
}

function setObjectiveCompact(compact, remember = true) {
  const panel = document.querySelector(".quest");
  if (!panel) return;
  panel.classList.toggle("compact", !!compact);
  panel.setAttribute("aria-expanded", String(!compact));
  panel.setAttribute("aria-label", compact ? "Afficher l’objectif complet" : "Réduire l’objectif");
  panel.title = compact ? "Afficher l’objectif complet" : "Réduire l’objectif";
  if (remember) {
    try { localStorage.setItem("ambrelune.objectiveCompact", compact ? "1" : "0"); } catch {}
  }
}

function setupObjectiveToggle() {
  const panel = document.querySelector(".quest");
  if (!panel || panel.dataset.toggleReady === "1") return;
  panel.dataset.toggleReady = "1";
  let compact = false;
  try { compact = localStorage.getItem("ambrelune.objectiveCompact") === "1"; } catch {}
  setObjectiveCompact(compact, false);
  const toggle = () => setObjectiveCompact(!panel.classList.contains("compact"));
  panel.addEventListener("click", toggle);
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggle();
    }
  });
}

setupObjectiveToggle();

function updateObjectiveTracker() {
  if (!state) return;
  const qi = currentQuestIndex();
  const q = QUESTS[qi] || QUESTS[0];
  const title = $("questTitle"), text = $("questText"), progress = $("questProgress");
  if (title) title.textContent = q?.title || "Votre prochaine étape";
  if (text) text.textContent = q?.text || "Poursuivez votre aventure dans les Jardins.";
  if (progress) progress.style.width = `${(qi / Math.max(1, QUESTS.length - 1)) * 100}%`;

  const targetId = QUEST_TARGETS[qi];
  const target = targetId ? LANDMARKS.find((l) => l.id === targetId) : null;
  const direction = $("questDirection"), arrow = $("questArrow"), place = $("questPlace"), distance = $("questDistance");
  if (!direction || !arrow || !place || !distance) return;

  if (!target) {
    direction.classList.add("free");
    arrow.textContent = "✦";
    arrow.style.transform = "none";
    place.textContent = "Exploration libre";
    distance.textContent = "";
    return;
  }

  direction.classList.remove("free");
  place.textContent = target.name;
  const dx = target.x - state.player.x;
  const dz = target.z - state.player.z;
  const meters = Math.max(0, Math.round(Math.hypot(dx, dz)));
  distance.textContent = meters < 2 ? "Sur place" : `${meters} m`;

  // Arrow points toward the target relative to the current camera heading.
  // CSS rotation is clockwise on screen, while the world bearing delta uses the opposite horizontal sign.
  const targetBearing = Math.atan2(dx, dz);
  const cameraForwardBearing = 0.65 + input.angle + Math.PI;
  let delta = targetBearing - cameraForwardBearing;
  delta = ((delta + Math.PI) % (Math.PI * 2)) - Math.PI;
  arrow.textContent = "↑";
  arrow.style.transform = `rotate(${-delta}rad)`;
}

function updateHUD() {
  // Render tools first so the mobile toolbar never depends on companion/UI rendering.
  renderToolbelt();
  updateObjectiveTracker();
  const c = state.team[0];
  if (c) {
    $("companionIcon").innerHTML = portrait(c.id);
    $("companionName").textContent = species(c.id).name;
    $("companionInfo").textContent = `Niv. ${c.level} · ${c.hp}/${c.maxHp} PV`;
  }
  $("coins").textContent = `◈ ${state.coins}`;
}
function questCheck() {
  if (advanceQuest(state)) {
    state.flags.marker = [
      "city",
      "home",
      "forest",
      "home",
      "home",
      "ruins",
      "home",
    ][state.quest];
    toast("Étape accomplie · +35 ambres · Votre carnet a été mis à jour.");
    audio.play("capture");
    updateHUD();
  }
  persist();
}
function nearby() {
  const p = state.player, list = [];
  state.buildings.forEach((b,index)=>{if(spaceOf(b)===(state.location||'world') && Math.abs((b.y||0)-(p.y||0))<1)list.push({...b,type:'furniture',index,name:ITEMS[b.type],distance:Math.hypot(b.x-p.x,b.z-p.z)});});
  if(interior){if((p.y||0)<1)list.push({type:'exit',name:'Sortir de la maison',x:0,z:7,distance:Math.hypot(p.x,p.z-7)});return list.sort((a,b)=>a.distance-b.distance).find(v=>v.distance<2.5);}
  for (const n of world.npcs)
    list.push({
      ...n,
      type: "npc",
      distance: Math.hypot(n.x - p.x, n.z - p.z),
    });
  for (const w of world.wild)
    if (w.mesh.visible && w.cooldown === 0)
      list.push({
        ...w,
        type: "wild",
        source: w,
        name: species(w.id).name,
        distance: Math.hypot(w.x - p.x, w.z - p.z),
      });
  for (const r of world.resources)
    if (r.mesh.visible)
      list.push({
        ...r,
        type: "resource",
        resourceType: r.type,
        source: r,
        name: ITEMS[r.type],
        distance: Math.hypot(r.x - p.x, r.z - p.z),
      });
  for (const plot of state.plots)
    list.push({
      ...plot,
      type: "plot",
      source: plot,
      name:
        plot.stage === 4
          ? `${CROPS[plot.seed||"seed"]?.name||"Culture"} mûr(e)`
          : plot.stage
            ? (CROPS[plot.seed||"seed"]?.name||"Culture") + " · " + ["", "graine", "pousse", "bouton"][plot.stage]
            : "Terre à cultiver",
      distance: Math.hypot(plot.x - p.x, plot.z - p.z),
    });
  for (const a of world.interactables)
    list.push({ ...a, distance: Math.hypot(a.x - p.x, a.z - p.z) });
  list.push({
    type: "fish",
    name: "Pêcher dans l’Ambre",
    x: riverX(p.z) - 6,
    z: p.z,
    distance: Math.abs(p.x - (riverX(p.z) - 6)),
  });
  list.sort((a, b) => a.distance - b.distance);
  return list.find((v) => v.distance < (v.type === "wild" ? 3.3 : 2.5));
}
function interact() {
  if(fishingSession)return;
  if (!started || battle || !$("modal").hidden) return;
  if (building) return placeBuilding();
  const a = nearby();
  if (!a) {
    toast("Approchez-vous d’un habitant, d’une créature ou d’une ressource.");
    return;
  }
  input.target = null;
  actionTimer = 0.65;
  player.rotation.y = Math.atan2(a.x - state.player.x, a.z - state.player.z);
  if(a.type === "exit") return leaveHome();
  if(a.type === "furniture") return furnishingMenu(a.index);
  if (a.type === "npc") {
    player.userData.playAction?.("Interact");
    return dialogue(a);
  }
  if (a.type === "wild") {
    if (a.id === "gardien" && state.quest < 5) {
      toast("Le Veilleur dort. Faites refleurir votre jardin pour l’éveiller.");
      return;
    }
    return startBattle(a.source);
  }
  if (a.type === "plot") {
    const previousStage = a.source.stage;
    const text = farmAction(state, a.source, tool);
    // Give a freshly planted plot a short, visible dry phase before the
    // optional companion helper can water it automatically.
    if (tool === "hoe" && previousStage === 0 && a.source.stage === 1)
      farmHelperElapsed = 0;
    syncWorld();
    audio.play(tool === "water" ? "water" : "harvest");
    world.burst(
      a.x,
      surfaceHeight(a.x, a.z) + 0.4,
      a.z,
      tool === "water" ? "#a3d6da" : "#d5c78c",
    );
    toast(text);
    if (player.userData.playAction) player.userData.playAction(characterActionForTool(tool));
    else player.userData.arms[1].rotation.x = -1;
    questCheck();
    updateHUD();
    return;
  }
  if (a.type === "resource") {
    const required =
      a.resourceType === "wood"
        ? "axe"
        : ["stone", "crystal", "ore", "coal"].includes(a.resourceType)
          ? "pick"
          : "hand";
    if (tool !== required) {
      toast(
        `Équipez ${required === "axe" ? "la hache" : required === "pick" ? "la pioche" : "Lien"} dans la barre d’outils.`,
      );
      return;
    }
    const count = a.resourceType === "crystal" ? 2 : 3;
    if (!add(state, a.resourceType, count)) {
      toast("Votre sac est plein. Déposez des objets dans un coffre.");
      return;
    }
    state.depleted[a.id] = state.day + 2;
    a.source.mesh.visible = false;
    world.burst(
      a.x,
      surfaceHeight(a.x, a.z) + 0.5,
      a.z,
      a.resourceType === "crystal" ? "#aad4bb" : "#cdbb93",
      24,
    );
    audio.play("hit");
    toast(
      `+${count} ${ITEMS[a.resourceType]} · La nature se renouvellera dans deux jours.`,
    );
    if (player.userData.playAction) player.userData.playAction(characterActionForTool(tool));
    else player.userData.arms[1].rotation.x = -1.5;
    persist();
    return;
  }
  if (a.type === "home") { player.userData.playAction?.("Interact"); return enterHome(a.location || "home"); }
  if (a.type === "workbench") { player.userData.playAction?.("Interact"); return openMenu("craft"); }
  if (a.type === "fish") { player.userData.playAction?.("Interact"); return fishing(); }
}
function dialogue(n) {
  const met = state.friendship[n.name] || 0;
  let text,
    actions = "";
  if (n.name === "Maëlle") {
    state.flags.metMaelle = true;
    text = met
      ? "Les anciens liaient chaque jardin à une créature. Quand ta terre refleurira, le Veilleur de Sève entendra peut-être son appel."
      : "Te voilà enfin ! Ta maison est au sud-ouest, au bout du chemin clair. J’ai laissé douze graines dans ton sac. Plante trois roselles et donne-leur de l’eau. Ton compagnon t’aidera si tu l’affectes au jardin depuis le carnet.";
    actions =
      '<button id="guideHome" class="primary">Marquer ma propriété</button>';
  } else if (["Soline", "Orin"].includes(n.name)) {
    text =
      n.name === "Orin"
        ? "De bonnes graines, de l’eau et un peu de patience. Je rachète aussi tes récoltes."
        : "Je tisse les liens de résonance. Affaiblis une créature et apaise-la avant de tendre le tien.";
    actions =
      '<button id="shopOpen" class="primary">Voir les marchandises</button>';
  } else if (n.name === "Ivo") {
    text =
      "Le pollen endort, la brume soigne. Les éléments ont leurs affinités : l’eau apaise le feu, le feu domine la nature, et la nature absorbe l’eau.";
  } else if (n.name === "Ysée") {
    text =
      "Le sanctuaire est plus au nord. Le Veilleur n’acceptera ton défi que si ton jardin possède une lumière et si tu as appris à tisser un lien.";
  } else if (n.name === "Tess") {
    text =
      "Les clôtures se tournent avant de les poser. Avec le carnet, tu peux aussi récupérer tes constructions sans perdre les matériaux.";
  } else {
    text =
      "Quand vient le soir, les Lumignons se montrent près des ruines. Sous la pluie, les Coralys remontent la rivière. Chaque promenade raconte autre chose.";
  }
  if (state.flags["talkDay" + n.name] !== state.day) {
    state.friendship[n.name] = Math.min(5, met + 1);
    state.flags["talkDay" + n.name] = state.day;
  }
  showModal(
    `<span class="eyebrow">${n.role}</span><h2>${n.name}</h2><p class="note">« ${text} »</p><p>Affinité ${"♥".repeat(state.friendship[n.name])}${"♡".repeat(5 - state.friendship[n.name])}</p>${actions} <button id="bye">À bientôt</button>`,
  );
  $("bye").onclick = closeModal;
  if ($("guideHome"))
    $("guideHome").onclick = () => {
      state.flags.marker = "home";
      closeModal();
      toast("Votre jardin est marqué sur la carte, au sud-ouest de la place.");
    };
  if ($("shopOpen")) $("shopOpen").onclick = shop;
  questCheck();
  updateHUD();
}
function shop() {
  showModal(
    `<span class="eyebrow">MARCHÉ DES TISSERANDS</span><h2>Un panier pour demain</h2><p>Votre bourse : ${state.coins} ambres</p><div class="rows">${[
      ["seed", 5],
      ["wheatSeed",7],["carrotSeed",6],["flaxSeed",8],["pumpkinSeed",10],
      ["seal", 18],
      ["potion", 15],
    ]
      .map(
        ([id, price]) =>
          `<div class="row"><div><b>${ITEMS[id]}</b><small>${price} ambres · En sac : ${state.inventory[id] || 0}</small></div><button data-buy="${id}" data-price="${price}" ${state.coins < price ? "disabled" : ""}>Acheter</button></div>`,
      )
      .join("")}${[
      ["crop", 12],
      ["wheat",14],["carrot",12],["flax",16],["pumpkin",22],
      ["quality", 24],
      ["fish", 16],
    ]
      .map(
        ([id, price]) =>
          `<div class="row"><div><b>${ITEMS[id]}</b><small>${price} ambres l’unité · En sac : ${state.inventory[id] || 0}</small></div><button data-sell="${id}" data-price="${price}" ${!state.inventory[id] ? "disabled" : ""}>Vendre</button></div>`,
      )
      .join("")}</div>`,
  );
  document.querySelectorAll("[data-buy]").forEach(
    (b) =>
      (b.onclick = () => {
        const price = +b.dataset.price;
        if (state.coins >= price) {
          if (!add(state, b.dataset.buy)) return toast("Votre sac est plein. Utilisez un coffre avant d’acheter.");
          state.coins -= price;
          audio.play();
          persist();
          shop();
          updateHUD();
        }
      }),
  );
  document.querySelectorAll("[data-sell]").forEach(
    (b) =>
      (b.onclick = () => {
        if (spend(state, { [b.dataset.sell]: 1 })) {
          state.coins += +b.dataset.price;
          audio.play();
          persist();
          shop();
          updateHUD();
        }
      }),
  );
}
function home() {
  showModal(
    `<span class="eyebrow">LA MAISON AUX VOLETS DE SAUGE</span><h2>Bienvenue chez vous, ${esc(state.name)}.</h2><p>La maison sent le bois ciré et les herbes sèches. Au mur, une note de votre tante : « Ce qui grandit ici grandit aussi en nous. »</p><div class="rows"><div class="row"><div><b>Une nuit paisible</b><small>Passe au lendemain, soigne l’équipe et laisse pousser les plantes arrosées.</small></div><button id="sleep">Dormir</button></div><div class="row"><div><b>Votre carnet</b><small>Sauvegarder cette journée.</small></div><button id="saveHome">Sauvegarder</button></div></div>`,
  );
  $("saveHome").onclick = () => persist(true);
  $("sleep").onclick = () => {
    tickFarm(state, 65);
    state.day++;
    state.time = 7;
    state.weather =
      state.day % 3 === 0 ? "pluie" : state.day % 2 === 0 ? "nuages" : "soleil";
    state.team.forEach((c) => {
      c.hp = c.maxHp;
      c.energy = 30;
      c.status = null;
    });
    syncWorld();
    closeModal();
    persist();
    updateHUD();
    toast(
      `Jour ${state.day} · Votre équipe est reposée. Une nouvelle journée commence.`,
    );
    audio.play("harvest");
  };
}
function fishing() {
 if(fishingSession||interior)return;
 input.target=null;input.route=[];input.keys.clear();
 fishingSession=new FishingSession(scene,player,riverX(state.player.z)-1,state.player.z,(success,message)=>{fishingSession=null;if(success){if(!add(state,'fish'))return toast('Votre sac est plein. Le poisson est relâché.');audio.play('harvest');persist();}toast(message);});
}
const tabs = [
  ["team", "Compagnons", "Vos liens et votre équipe active"],
  ["bag", "Sac", "Ressources, récoltes et objets"],
  ["craft", "Fabriquer", "Recettes et créations"],
  ["build", "Aménagement", "Maison, mobilier et extérieur"],
  ["map", "Carte", "Lieux découverts et voyage rapide"],
  ["journal", "Histoire", "Votre progression dans les Jardins"],
  ["bestiary", "Bestiaire", "Créatures des terres de la Sève"],
  ["settings", "Réglages", "Affichage, contrôles et sauvegarde"],
];
const tabIcon = (id) => {
  const icons = {
    team: '<path d="M8.7 11.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm6.9 1.1a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM3.6 19c.2-3 2-4.8 5.1-4.8s4.9 1.8 5.1 4.8m.7-3.7c2.8.1 4.4 1.4 4.8 3.7"/>',
    bag: '<path d="M7.2 7.8h9.6l1.1 12H6.1l1.1-12Zm2.2 0V6a2.6 2.6 0 0 1 5.2 0v1.8"/>',
    craft: '<path d="m14.8 4.1 5.1 5.1-2.7 2.7-5.1-5.1 2.7-2.7ZM11 8l-6.8 6.8a2.3 2.3 0 0 0 3.2 3.2l6.8-6.8M4.8 4.8l3.6 3.6"/>',
    build: '<path d="M4 10.2 12 4l8 6.2V20H4v-9.8ZM8.3 20v-5.7h7.4V20"/>',
    map: '<path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2V6Zm5-2v14m6-12v14"/>',
    journal: '<path d="M5.2 4.5h8.1A2.7 2.7 0 0 1 16 7.2V20H7.5a2.3 2.3 0 0 1-2.3-2.3V4.5Zm10.8 3h2.8V20H16"/>',
    bestiary: '<path d="M12 5.2c2-2.4 5.2-2.2 6.7.3 1.2 2 .8 4.5-.8 6.2 1.1 2.5.2 5.6-2.3 6.9-1.3.7-2.7.6-3.6-.2-.9.8-2.3.9-3.6.2-2.5-1.3-3.4-4.4-2.3-6.9-1.6-1.7-2-4.2-.8-6.2 1.5-2.5 4.7-2.7 6.7-.3Z"/><path d="M9.3 10.4h.1m5.2 0h.1M9.8 14.3c1.5 1.2 2.9 1.2 4.4 0"/>',
    settings: '<path d="M12 8.5A3.5 3.5 0 1 0 12 15a3.5 3.5 0 0 0 0-6.5Zm0-5 1.3 2.1 2.4-.2.4 2.4 2.2 1.2-1.1 2.2 1.1 2.2-2.2 1.2-.4 2.4-2.4-.2L12 20.5l-1.3-2.1-2.4.2-.4-2.4-2.2-1.2 1.1-2.2-1.1-2.2 2.2-1.2.4-2.4 2.4.2L12 3.5Z"/>',
  };
  return `<svg class="tab-icon" viewBox="0 0 24 24" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${icons[id] || icons.journal}</g></svg>`;
};
function openMenu(tab = modalTab) {
  fishingSession?.finish(false,"La ligne est rangée.");
  if (!started || battle) return;
  if(building)cancelBuild();
  modalTab = tab;
  let html = "";
  if (tab === "team") html = teamView(state);
  if (tab === "bag") html = bagView(state);
  if (tab === "craft") html = craftView(state, craftCanAfford, craftAvailable, craftOutputFits);
  if (tab === "build") html = gardenView(state);
  if (tab === "map")
    html = `<div class="menu-lead"><div><span class="section-kicker">TERRES DE LA SÈVE</span><h3>Votre carte d’exploration</h3><p>Les chemins et les lieux se révèlent au fil de vos pas. Sélectionnez un lieu découvert pour y poser votre repère.</p></div><div class="menu-stat"><small>DÉCOUVERTS</small><b>${state.discovered.length}</b></div></div><div class="map-frame"><canvas class="mapLarge" id="largeMap" width="760" height="430"></canvas><div class="map-compass">N</div></div><div class="mapLegend premium-map-legend">${LANDMARKS.filter(
      (l) => state.discovered.includes(l.id),
    )
      .map((l) => `<button data-mark="${l.id}"><span>◇</span>${l.name}</button>`)
      .join(
        "",
      )}</div><div class="map-key"><span><i class="key-you"></i>Vous</span><span><i class="key-goal"></i>Objectif</span><span><i class="key-place"></i>Lieu découvert</span><small>Les secrets restent à explorer.</small></div>`;
  if (tab === "journal")
    html = `<div class="story-hero"><span class="section-kicker">LE FIL DES JARDINS</span><h3>Une histoire qui s’écrit avec vos pas</h3><p>Le silence de la Source n’est pas une fin. Maëlle en est certaine : chaque nouvelle amitié, chaque jardin restauré lui rend une part de sa voix.</p></div><div class="story-progress">${QUESTS.map((q, i) => `<article class="story-step ${i < state.quest ? "done" : i === state.quest ? "current" : "locked"}"><div class="story-marker">${i < state.quest ? "✓" : i === state.quest ? "◇" : i + 1}</div><div><small>${i < state.quest ? "ACCOMPLI" : i === state.quest ? "EN COURS" : "À VENIR"}</small><h3>${q.title}</h3><p>${i <= state.quest ? q.text : "Une nouvelle page reste à écrire."}</p></div></article>`).join("")}</div><div class="journey-stats"><div><small>LIENS TISSÉS</small><b>${state.stats.captured}</b></div><div><small>RÉCOLTES</small><b>${state.stats.harvested}</b></div><div><small>AMÉNAGEMENTS</small><b>${state.buildings.length}</b></div><div><small>JOUR ACTUEL</small><b>${state.day}</b></div></div>`;
  if (tab === "bestiary") {
    const linked = SPECIES.filter((c) => state.team.some((t) => t.id === c.id)).length;
    html = `<div class="menu-lead"><div><span class="section-kicker">CODEX DES CRÉATURES</span><h3>Le bestiaire d’Ambrelune</h3><p>Observez leur tempérament, leur élément et les lieux où elles apparaissent. Certaines ne se montrent qu’à des conditions particulières.</p></div><div class="menu-stat"><small>LIENS TISSÉS</small><b>${linked}<em> / ${SPECIES.length}</em></b></div></div><div class="bestiary-grid">${SPECIES.map((c, index) => {
      const owned = state.team.some((t) => t.id === c.id);
      return `<article class="bestiary-card ${owned ? "linked" : ""}" style="--species:${c.color};--species-accent:${c.accent}"><div class="bestiary-number">N° ${String(index + 1).padStart(2, "0")}</div><div class="bestiary-portrait">${creaturePortrait3D(c.id, "bestiary")}</div><div class="bestiary-info"><div class="bestiary-topline"><span class="element-chip">${ELEMENT_NAMES[c.element]}</span><span class="rarity">${"◆".repeat(Math.min(c.rarity, 5))}${"◇".repeat(Math.max(0, 5 - c.rarity))}</span></div><h3>${c.name}</h3><p>${c.desc}</p><div class="bestiary-meta"><span><small>HABITAT</small>${c.habitat}</span><span><small>TEMPÉRAMENT</small>${c.temper}</span></div><div class="bestiary-status">${owned ? "✦ Lien tissé" : "○ À rencontrer"}</div></div></article>`;
    }).join("")}</div>`;
  }
  if (tab === "settings")
    html = `<div class="settings-grid"><section class="settings-card"><div class="settings-card-head"><span class="settings-symbol">◫</span><div><small>AFFICHAGE</small><h3>Qualité visuelle</h3></div></div><label class="setting-row"><span><b>Qualité graphique</b><small>Adapte ombres et finesse du rendu.</small></span><select id="quality">${["low", "medium", "high", "ultra"].map((q, i) => `<option value="${q}" ${state.settings.quality === q ? "selected" : ""}>${["Basse · optimisée", "Moyenne", "Haute", "Ultra"][i]}</option>`).join("")}</select></label><label class="setting-row toggle-row"><span><b>Mesures de performance</b><small>Affiche les informations techniques.</small></span><input type="checkbox" id="perf" ${!$("debug").hidden ? "checked" : ""}></label></section><section class="settings-card"><div class="settings-card-head"><span class="settings-symbol">⌁</span><div><small>EXPÉRIENCE</small><h3>Sons & contrôles</h3></div></div><label class="setting-row toggle-row"><span><b>Sons d’Ambrelune</b><small>Ambiance, interactions et combats.</small></span><input type="checkbox" id="sound" ${state.settings.sound ? "checked" : ""}></label><label class="setting-row toggle-row"><span><b>Contrôles tactiles</b><small>Affiche les commandes adaptées au smartphone.</small></span><input type="checkbox" id="touch" ${state.settings.touch ? "checked" : ""}></label><div class="settings-actions"><button id="fullscreen">Plein écran</button><button id="photo">Mode paysage sans interface</button></div></section><section class="settings-card settings-card-wide"><div class="settings-card-head"><span class="settings-symbol">◇</span><div><small>VOYAGE</small><h3>Sauvegarde</h3></div></div><p>Votre progression est enregistrée localement sur cet appareil. Vous pouvez aussi conserver une copie du voyage.</p><div class="settings-actions"><button id="saveBtn" class="primary">Sauvegarder</button><button id="exportBtn">Exporter</button><button id="importBtn">Importer</button><input type="file" id="importFile" accept="application/json" hidden></div></section></div><div class="controls-note"><b>Commandes PC</b><span>ZQSD / WASD / flèches · déplacement à 360°</span><span>Maj · courir</span><span>E · agir</span><span>1–6 · outils</span><span>Tab · carnet</span><span>M · carte</span><span>R · tourner</span><span>Échap · retour</span></div><small class="version-note">Version 0.4 · Interface Ambrelune · Sauvegarde locale versionnée</small>`;
  const current = tabs.find((t) => t[0] === tab) || tabs[0];
  showModal(
    `<div class="journal-shell"><aside class="journal-sidebar"><div class="journal-brand"><span class="journal-sigil">❧</span><div><b>AMBRELUNE</b><small>CARNET DE ${esc(state.name).toUpperCase()}</small></div></div><nav class="journal-nav">${tabs.map(([id, label]) => `<button data-tab="${id}" aria-label="${label}" title="${label}" class="${id === tab ? "selected" : ""}">${tabIcon(id)}<span>${label}</span><i></i></button>`).join("")}</nav><div class="journal-sidebar-foot"><div><small>JOUR</small><b>${state.day}</b></div><div><small>AMBRE</small><b>◈ ${state.coins}</b></div></div></aside><section class="journal-page"><header class="journal-page-header"><div><span class="eyebrow">${current[2].toUpperCase()}</span><h2>${current[1]}</h2></div><div class="journal-day"><small>${state.weather.toUpperCase()}</small><b>${$("clock").textContent || "08:00"}</b><span>${$("calendar").textContent || `Jour ${state.day}`}</span></div></header><div class="journal-content">${html}</div></section></div>`,
  );
  document
    .querySelectorAll("[data-tab]")
    .forEach((b) => (b.onclick = () => openMenu(b.dataset.tab)));
  document.querySelectorAll("[data-craft]").forEach(
    (b) =>
      (b.onclick = () => {
        // Keep the workshop exactly where the player was browsing. Rebuilding
        // the journal after a craft is useful to refresh stocks/buttons, but it
        // must never throw the list back to the top.
        const previousContent = document.querySelector("#modal .journal-content");
        const previousScrollTop = previousContent?.scrollTop ?? 0;
        const previousFilter = $("craftFilter")?.value ?? "all";
        if (
          craft(
            state,
            RECIPES[+b.dataset.craft],
          )
        ) {
          audio.play("craft");
          questCheck();
          openMenu("craft");

          const filter = $("craftFilter");
          if (filter) {
            filter.value = previousFilter;
            filter.dispatchEvent(new Event("change"));
          }

          const restoreCraftScroll = () => {
            const content = document.querySelector("#modal .journal-content");
            if (!content) return;
            const maxScroll = Math.max(0, content.scrollHeight - content.clientHeight);
            content.scrollTop = Math.min(previousScrollTop, maxScroll);
          };
          // Restore synchronously, then once more after layout/portraits settle.
          restoreCraftScroll();
          requestAnimationFrame(restoreCraftScroll);
          updateHUD();
        }
      }),
  );
  document.querySelectorAll("[data-lead]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.lead;
        [state.team[0], state.team[i]] = [state.team[i], state.team[0]];
        setupActors();
        persist();
        openMenu("team");
        updateHUD();
      }),
  );
  document.querySelectorAll("[data-heal]").forEach(
    (b) =>
      (b.onclick = () => {
        const c = state.team[+b.dataset.heal];
        if (c.hp < c.maxHp && spend(state, { potion: 1 })) {
          c.hp = Math.min(c.maxHp, c.hp + 30);
          persist();
          openMenu("team");
          updateHUD();
        }
      }),
  );
  if ($("helper"))
    $("helper").onclick = () => {
      state.flags.helper = !state.flags.helper;
      persist();
      openMenu("team");
    };
  document
    .querySelectorAll("[data-build]")
    .forEach((b) => (b.onclick = () => startBuild(b.dataset.build)));
  document.querySelectorAll("[data-remove]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = +b.dataset.remove;
        if(!recover(state,i))return toast("Videz ce rangement avant de le récupérer.");
        world.buildMeshes.forEach((g) => {
          g.traverse((o) => {
            if (o.isInstancedMesh) o.dispose();
          });
          scene.remove(g);
        });
        world.buildMeshes = [];
        syncWorld();
        persist();
        openMenu("build");
      }),
  );
  if ($("fertilize"))
    $("fertilize").onclick = () => {
      const p = state.plots.find(
        (p) => p.stage > 0 && p.stage < 4 && !p.fertilized,
      );
      if (!p) return toast("Plantez une culture avant de fertiliser.");
      if (spend(state, { fertilizer: 1 })) {
        p.fertilized = true;
        syncWorld();
        persist();
        openMenu("build");
        toast("Une roselle a reçu du compost.");
      }
    };
  document.querySelectorAll('[data-equip]').forEach(b=>b.onclick=()=>{closeModal();selectTool(b.dataset.equip);});
  if($('craftFilter'))$('craftFilter').onchange=e=>document.querySelectorAll('.recipe-card').forEach(card=>card.hidden=e.target.value==='ready'?!card.classList.contains('recipe-ready'):e.target.value!=='all'&&card.dataset.category!==e.target.value);
  if($('inventorySearch'))$('inventorySearch').oninput=e=>{const q=e.target.value.toLocaleLowerCase();document.querySelectorAll('.inventory-slot.filled').forEach(slot=>slot.classList.toggle('search-hidden',!!q&&!slot.dataset.inventoryName.includes(q)));};
  document.querySelectorAll('[data-inventory-item]').forEach(slot=>slot.onclick=()=>{const id=slot.dataset.inventoryItem;document.querySelectorAll('[data-inventory-item]').forEach(s=>s.classList.toggle('selected',s.dataset.inventoryItem===id));document.querySelectorAll('[data-inventory-detail]').forEach(d=>d.hidden=d.dataset.inventoryDetail!==id);});
  if(tab==='bag') bindInventoryDragDrop();
  document.querySelectorAll('[data-seed]').forEach(b=>b.onclick=()=>{state.selectedSeed=b.dataset.seed;tool='hoe';equipTool();closeModal();toast('Semences sélectionnées : '+ITEMS[state.selectedSeed]);});
  document.querySelectorAll('[data-eat]').forEach(b=>b.onclick=()=>{const id=b.dataset.eat,c=state.team[0];if(spend(state,{[id]:1})){c.hp=Math.min(c.maxHp,c.hp+FOOD[id]);if(id==='grilledFish')c.energy=Math.min(30,c.energy+10);persist();openMenu('bag');}});
  document.querySelectorAll('[data-edit-object]').forEach(b=>b.onclick=()=>{const i=+b.dataset.editObject;if(spaceOf(state.buildings[i])!==(state.location||'world'))return toast('Rejoignez le lieu où cet objet est installé.');furnishingMenu(i);});
  if (tab === "map") {
    drawMap($("largeMap"));
    attachTravel();
    document.querySelectorAll("[data-mark]").forEach(
      (b) =>
        (b.onclick = () => {
          state.flags.marker = b.dataset.mark;
          drawMap($("largeMap"));
          toast("Repère ajouté à votre carte.");
        }),
    );
  }
  if (tab === "settings") {
    $("quality").onchange = () => {
      state.settings.quality = $("quality").value;
      applySettings();
      persist();
    };
    $("sound").onchange = () => {
      state.settings.sound = $("sound").checked;
      applySettings();
      persist();
    };
    $("touch").onchange = () => {
      state.settings.touch = $("touch").checked;
      applySettings();
      persist();
    };
    $("perf").onchange = () => {
      $("debug").hidden = !$("perf").checked;
    };
    $("saveBtn").onclick = () => persist(true);
    $("exportBtn").onclick = () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], {
          type: "application/json",
        }),
        url = URL.createObjectURL(blob),
        a = document.createElement("a");
      a.href = url;
      a.download = `ambrelune-jour-${state.day}.json`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
    };
    $("importBtn").onclick = () => $("importFile").click();
    $("importFile").onchange = async () => {
      try {
        const { normalizeSave } = await import("./systems/state.js");
        const s = normalizeSave(
          JSON.parse(await $("importFile").files[0].text()),
        );
        for (const o of world.plotMeshes.values()) scene.remove(o.g);
        world.plotMeshes.clear();
        world.buildMeshes.forEach((g) => {
          g.traverse((o) => {
            if (o.isInstancedMesh) o.dispose();
          });
          scene.remove(g);
        });
        world.buildMeshes = [];
        closeModal();
        begin(s);
        toast("Votre voyage a été restauré.");
      } catch {
        toast("Cette copie est invalide ou d’une version incompatible.");
      }
    };
    $("fullscreen").onclick = () =>
      document.documentElement
        .requestFullscreen?.()
        .catch(() =>
          toast("Le plein écran est indisponible dans ce navigateur."),
        );
    $("photo").onclick = () => {
      closeModal();
      $("hud").hidden = true;
      toast("Échap pour réouvrir le carnet et retrouver l’interface.");
    };
  }
}

function attachTravel() {
  const box = document.createElement("div");
  box.className = "mapLegend";
  box.innerHTML =
    '<small style="width:100%;margin:7px 0">CHEMINS DÉJÀ PARCOURUS · VOYAGE RAPIDE</small>' +
    LANDMARKS.filter((l) => state.discovered.includes(l.id))
      .map((l) => `<button data-travel="${l.id}">↗ ${l.name}</button>`)
      .join("");
  $("largeMap").after(box);
  box.querySelectorAll("button").forEach(
    (b) =>
      (b.onclick = () => {
        const l = LANDMARKS.find((l) => l.id === b.dataset.travel);
        if (!l || !state.discovered.includes(l.id)) return;
        let x = l.id === "city" ? -9 : l.x,
          z = l.id === "city" ? 8 : l.z;
        for (let i = 0; i < 30 && world.collides(x, z, 0.5); i++) {
          x = l.x + Math.sin(i * 2.4) * (2 + i * 0.2);
          z = l.z + Math.cos(i * 2.4) * (2 + i * 0.2);
        }
        if (world.collides(x, z, 0.5)) return;
        if(interior)leaveHome();
        state.player = { x, z };
        setupActors();
        closeModal();
        persist();
        toast("Vous retrouvez " + l.name + ".");
      }),
  );
}
function applySettings() {
  const q = state.settings.quality;
  // Medium/High/Ultra deliberately keep their existing rendering unchanged.
  // Low is the dedicated performance mode for weaker phones.
  if (q !== "low") lowRenderScale = 0.85;
  const ratio = q === "low"
    ? lowRenderScale
    : ({ medium: 1.2, high: 1.7, ultra: 2.5 }[q] || 1.2);

  state.settings.pixel = false;
  renderer.setPixelRatio(Math.min(devicePixelRatio, ratio));
  renderer.domElement.style.imageRendering = "auto";

  const low = q === "low";
  renderer.shadowMap.enabled = !low;
  sun.castShadow = !low;
  const res = q === "ultra" ? 4096 : q === "high" ? 2048 : 1024;
  if (sun.shadow.mapSize.x !== res) {
    sun.shadow.mapSize.set(res, res);
    if (sun.shadow.map) {
      sun.shadow.map.dispose();
      sun.shadow.map = null;
    }
  }

  // Slightly shorter view distance only in Low; fog masks the chunk culling softly.
  scene.fog.near = low ? 52 : 65;
  scene.fog.far = low ? 105 : 135;
  world.setQuality?.(q);

  audio.enabled = state.settings.sound;
  document.body.classList.toggle(
    "touch",
    state.settings.touch || matchMedia("(pointer:coarse)").matches,
  );
}
function startBuild(type, movingIndex=-1) {
  closeModal();
  if (movingIndex<0 && !state.inventory[type]) return;
  const initialR=movingIndex>=0?state.buildings[movingIndex].r:0;
  const initial=refinePlacement(state.player.x + 2,state.player.z,type,initialR,movingIndex);
  building = {
    type,
    movingIndex,
    r: initialR,
    x: initial.x,
    z: initial.z,
  };
  if (preview) preview.removeFromParent();
  preview = new T.Group();
  const f = new Factory(preview);
  furnishing(f, type, 0, 0, 0);
  preview.traverse((o) => {
    if (o.isMesh) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.5;
      o.material.depthWrite = false;
    }
  });
  currentScene().add(preview);
  $("buildbar").hidden = false;
  $("buildlabel").textContent = ITEMS[type];
  $("interaction").style.display = "none";
  toast("Cliquez au sol pour déplacer l’aperçu. R pour tourner.");
}
function placeBuilding() {
  if (!building) return;
  const { x, z, type, r } = building;
  if (!canPlace(state, x, z, (x, z, r) => placementSolidAt(x, z, r),type,r,building.movingIndex)) {
    toast(
      "Placez cette création sur votre terrain, à distance des cultures et des obstacles.",
    );
    return;
  }
  const placed={type,x,z,r,location:state.location||'world',y:interior?((state.player.y||0)>3.3?3.6:0):0};
  if(building.movingIndex>=0)Object.assign(state.buildings[building.movingIndex],placed);
  else {if (!spend(state, { [type]: 1 })) return; state.buildings.push(placed);}
  persist();
  syncWorld();
  world.burst(x, surfaceHeight(x, z) + 0.7, z);
  audio.play("craft");
  cancelBuild();
  questCheck();
  updateHUD();
}
function cancelBuild() {
  if (preview) {
    preview.removeFromParent();
    preview.traverse((o) => {
      if (o.isMesh) o.material.dispose();
    });
    preview = null;
  }
  building = null;
  $("buildbar").hidden = true;
  $("interaction").style.display = "";
}
function drawMap(c) {
  if (!c) return;
  const g = c.getContext("2d"),
    w = c.width,
    h = c.height,
    large = w > 200,
    scale = large ? Math.min(w / 140, h / 130) : 1.35,
    cx = large ? 0 : state.player.x,
    cz = large ? -4 : state.player.z;
  const pt = (x, z) => [w / 2 + (x - cx) * scale, h / 2 + (z - cz) * scale];
  g.fillStyle = "#e7e5c8";
  g.fillRect(0, 0, w, h);
  g.strokeStyle = "#bed0b7";
  g.lineWidth = 1;
  for (let i = 0; i < 8; i++) {
    g.beginPath();
    g.ellipse(
      w * 0.75,
      h * 0.35,
      10 + i * 12,
      15 + i * 10,
      -0.4,
      0,
      Math.PI * 2,
    );
    g.stroke();
  }
  g.strokeStyle = "#8ab8ad";
  g.lineWidth = 8 * scale;
  g.beginPath();
  for (let z = -70; z < 70; z++) {
    const [x, y] = pt(riverX(z), z);
    z === -70 ? g.moveTo(x, y) : g.lineTo(x, y);
  }
  g.stroke();
  g.lineWidth = 2 * scale;
  g.strokeStyle = "#c6b590";
  for (const line of [
    [-9, -55, -9, 24],
    [-48, -19, 5, -19],
    [-48, 8, 50, 8],
    [-9, 8, -30, 32],
    [-9, -30, 50, -30],
  ]) {
    g.beginPath();
    g.moveTo(...pt(line[0], line[1]));
    g.lineTo(...pt(line[2], line[3]));
    g.stroke();
  }
  for (const b of world.colliders.filter((b) => b.kind === "rect")) {
    g.fillStyle = "#afa78b";
    const [x, y] = pt(b.x, b.z);
    g.fillRect(
      x - (b.w * scale) / 2,
      y - (b.d * scale) / 2,
      b.w * scale,
      b.d * scale,
    );
  }
  g.font = large ? "12px Georgia" : "8px sans-serif";
  g.textAlign = "center";
  if(!interior) for (const l of LANDMARKS) {
    if (!state.discovered.includes(l.id) && l.id !== state.flags.marker)
      continue;
    const [x, y] = pt(l.x, l.z);
    g.fillStyle = l.id === state.flags.marker ? "#c18a45" : "#66876f";
    g.beginPath();
    g.arc(x, y, large ? 4 : 3, 0, Math.PI * 2);
    g.fill();
    if (large) {
      g.fillStyle = "#466252";
      g.fillText(l.name, x, y - 10);
    }
  }
  const [px, py] = pt(state.player.x, state.player.z);
  g.fillStyle = "#315c51";
  g.strokeStyle = "#fff5d5";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(px, py, large ? 5 : 4, 0, Math.PI * 2);
  g.fill();
  g.stroke();
  if (large) {
    g.fillStyle = "#7e876b";
    g.font = "10px system-ui";
    g.fillText("N", w - 22, 20);
    g.fillText("LES TERRES DE LA SÈVE", w / 2, 25);
  } else {
    g.fillStyle = "#5e765e";
    g.font = "9px sans-serif";
    g.fillText("N", w / 2, 15);
  }
}
function startBattle(w) {
  if (state.team.every((c) => c.hp <= 0)) {
    toast("Votre équipe a besoin de repos. Rentrez dormir à la maison.");
    return;
  }
  if (state.team[0].hp <= 0) {
    const i = state.team.findIndex((c) => c.hp > 0);
    [state.team[0], state.team[i]] = [state.team[i], state.team[0]];
    setupActors();
  }
  battle = {
    wild: w,
    enemy: makeCreature(w.id, w.level),
    ally: state.team[0],
    phase: "choose",
    round: 0,
    center: new T.Vector3(state.player.x, 0, state.player.z),
    attack: 0,
    side: 0,
    wasVisible: w.mesh.visible,
  };
  battle.stage = new BattleStage(battle.ally, battle.enemy);
  battle.stage.sun.castShadow=state.settings.quality!=="low";
  cameraTarget.set(0, 0.7, 0.5);
  camera.position.set(5, 20, 20);
  battle.ally.energy = 30;
  battle.ally.status = null;
  battle.ally.guard = false;
  input.target = null;
  $("hud").hidden = true;
  $("battle").hidden = false;
  audio.play("battle");
  updateBattle(
    `${species(w.id).name} vous observe. Affaiblissez-le avant de tisser un lien.`,
  );
}
function updateBattle(log) {
  if (!battle) return;
  const { enemy: e, ally: a } = battle;
  $("enemyName").textContent = species(e.id).name;
  $("battleBiome").textContent =
    `${ELEMENT_NAMES[species(e.id).element]} · ${species(e.id).temper}`;
  $("enemyStat").textContent = `${species(e.id).name} · Niv. ${e.level}`;
  $("allyStat").textContent = `${species(a.id).name} · Niv. ${a.level}`;
  $("enemyGauges").innerHTML = gauge("pv", e.hp, e.maxHp);
  $("allyGauges").innerHTML =
    gauge("pv", a.hp, a.maxHp) +
    gauge("xp", a.xp, a.level * 20) +
    gauge("energy", a.energy, 30, "Énergie");
  $("enemyStatus").textContent = e.status || "";
  $("allyEnergy").textContent = a.status || "";
  if (log) $("battleLog").textContent = log;
  const waiting = battle.phase !== "choose";
  $("battleActions").innerHTML =
    species(a.id)
      .moves.map(
        (id) =>
          `<button data-move="${id}" ${waiting || a.energy < MOVES[id].energy ? "disabled" : ""}>${MOVES[id].name}<small>${MOVES[id].energy < 0 ? "+9" : MOVES[id].energy} énergie</small></button>`,
      )
      .join("") +
    `<button id="captureBtn" ${waiting || !state.inventory.seal || e.id === "gardien" ? "disabled" : ""}>Tisser un lien<small>×${state.inventory.seal} · ${Math.round(captureChance(e) * 100)} %</small></button><button id="battleHeal" ${waiting || !state.inventory.potion ? "disabled" : ""}>Tisane<small>×${state.inventory.potion} · +30 PV</small></button><button id="fleeBtn" ${waiting ? "disabled" : ""}>Partir<small>Sans pénalité</small></button>`;
  document
    .querySelectorAll("[data-move]")
    .forEach((b) => (b.onclick = () => battleTurn(b.dataset.move)));
  $("captureBtn").onclick = () => battleTurn("capture");
  $("battleHeal").onclick = () => battleTurn("heal");
  $("fleeBtn").onclick = () =>
    endBattle("Vous laissez cette rencontre derrière vous.");
}
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function applyMove(attacker, defender, id, isAlly) {
  if (!battle) return;
  const move = MOVES[id];
  attacker.energy = Math.min(30, attacker.energy - move.energy);
  attacker.guard = false;
  let text = "";
  if (move.guard) {
    battle.stage.support(isAlly, id);
    attacker.guard = true;
    text = `${species(attacker.id).name} s’abrite et retrouve son énergie.`;
  } else if (move.heal) {
    battle.stage.support(isAlly, id, "#a9d6d0");
    const n = Math.min(move.heal, attacker.maxHp - attacker.hp);
    attacker.hp += n;
    text = `La brume rend ${n} PV à ${species(attacker.id).name}.`;
  } else {
    const currentBattle=battle;
    updateBattle(`${species(attacker.id).name} prépare ${move.name}…`);
    await delay(160);if(battle!==currentBattle)return;
    const hit = damage(attacker, defender, move);
    const nextHp = Math.max(0, defender.hp - hit.amount);
    text = hit.miss
      ? `${move.name} manque sa cible.`
      : `${move.name} · ${hit.amount} dégâts${hit.crit ? " · critique" : ""}${hit.effect > 1 ? " · affinité favorable" : ""}`;
    if (!hit.miss && move.status && Math.random() < 0.55)
      defender.status = move.status;
    defender.guard = false;
    battle.attack = 0.5;
    battle.side = isAlly ? 1 : -1;
    battle.stage.impact(isAlly, species(attacker.id).accent, id, {miss:hit.miss,ko:nextHp===0});
    await delay(480);if(battle!==currentBattle)return;
    defender.hp=nextHp;
    audio.play("hit");
  }
  updateBattle(text);
  await delay(move.power ? 350 : 700);
}
async function battleTurn(action) {
  if (!battle || battle.phase !== "choose") return;
  battle.phase = "animating";
  const b = battle,
    a = b.ally,
    e = b.enemy;
  updateBattle();
  if (action === "capture") {
    if (!spend(state, { seal: 1 })) {
      b.phase = "choose";
      updateBattle();
      return;
    }
    updateBattle("Les fils de résonance entourent la créature…");
    world.burst(
      b.wild.x,
      surfaceHeight(b.wild.x, b.wild.z) + 1,
      b.wild.z,
      "#f4d688",
      45,
    );
    audio.play("capture");
    b.stage.capture = 1.8;
    await delay(1100);
    if (Math.random() < captureChance(e)) {
      const friend = {
        ...e,
        hp: e.maxHp,
        status: null,
        energy: 30,
        guard: false,
      };
      state.team.push(friend);
      state.stats.captured++;
      // Validate the friendship quest immediately. Do not wait for endBattle(),
      // because rendering/world sync errors must never block story progression.
      questCheck();
      gainXp(a, 15);
      b.wild.cooldown = 100;
      endBattle(
        `Un lien s’est tissé avec ${species(e.id).name} ! Il rejoint votre équipe.`,
      );
      return;
    }
    updateBattle(
      "La résonance se dissipe. Essayez après l’avoir affaibli davantage.",
    );
    await delay(700);
  } else if (action === "heal") {
    if (spend(state, { potion: 1 })) {
      a.hp = Math.min(a.maxHp, a.hp + 30);
      audio.play("water");
      updateBattle("La tisane restaure 30 PV.");
      await delay(600);
    }
  } else await applyMove(a, e, action, true);
  if (!battle) return;
  if (e.hp <= 0) {
    victory();
    return;
  }
  if (e.status === "somnolent" && Math.random() < 0.55) {
    updateBattle(`${species(e.id).name} somnole et perd son tour.`);
    e.status = null;
    await delay(650);
  } else {
    const choices = species(e.id).moves.filter(
      (id) => MOVES[id].energy <= e.energy,
    );
    const id =
      e.hp < e.maxHp * 0.4 && choices.includes("brume")
        ? "brume"
        : choices
            .filter((id) => MOVES[id].power > 0)
            .sort((x, y) => MOVES[y].power - MOVES[x].power)[0] || "garde";
    await applyMove(e, a, id, false);
  }
  if (!battle) return;
  if (a.status === "brulure") a.hp = Math.max(0, a.hp - 3);
  if (e.status === "brulure") e.hp = Math.max(0, e.hp - 3);
  a.energy = Math.min(30, a.energy + 3);
  e.energy = Math.min(30, e.energy + 3);
  b.round++;
  if (a.hp <= 0) {
    state.coins = Math.max(0, state.coins - 10);
    a.hp = Math.ceil(a.maxHp * 0.35);
    state.player = { x: -33, z: 29 };
    player.position.set(-33, surfaceHeight(-33, 29), 29);
    endBattle(
      "Votre compagnon est épuisé. Maëlle vous ramène au jardin · 10 ambres de soins.",
    );
    return;
  }
  if (e.hp <= 0) {
    victory();
    return;
  }
  b.phase = "choose";
  updateBattle("À vous. Observez les PV, l’énergie et les affinités.");
}
function victory() {
  const b = battle,
    xp = 20 + b.enemy.level * 7,
    levels = gainXp(b.ally, xp);
  state.coins += 12;
  state.stats.battles++;
  if (b.enemy.id === "gardien") {
    state.flags.guardian = true;
    // Story rewards are never lost: if the bag is already full they may
    // temporarily put it over capacity until the player unloads a chest.
    state.inventory.crystal = (state.inventory.crystal || 0) + 8;
    state.inventory.seed = (state.inventory.seed || 0) + 8;
  }
  b.wild.cooldown = 90;
  endBattle(
    b.enemy.id === "gardien"
      ? "Le Veilleur s’incline. La Source chante de nouveau · +8 cristaux."
      : `Victoire · +${xp} XP · +12 ambres${levels ? " · Niveau " + b.ally.level + " !" : ""}`,
  );
}
function endBattle(message) {
  if (!battle) return;
  battle.wild.mesh.visible = false;
  battle.ally.guard = false;
  battle.ally.status = null;
  battle.stage.dispose();
  battle = null;
  $("battle").hidden = true;
  $("hud").hidden = false;
  syncWorld();
  updateHUD();
  questCheck();
  toast(message);
  audio.play("harvest");
}
function advanceTime(dt) {
  state.time += dt / 50;
  state.playtime += dt;
  if (state.time >= 24) {
    state.time -= 24;
    state.day++;
    state.weather =
      state.day % 3 === 0 ? "pluie" : state.day % 2 === 0 ? "nuages" : "soleil";
  }
  tickFarm(state, dt);
}
function updateLighting() {
  const h = state.time,
    day = Math.max(0.08, Math.sin(((h - 6) / 15) * Math.PI)),
    sunset = Math.max(0, 1 - Math.abs(h - 18) / 2);
  sun.intensity = (state.weather === "pluie" ? 1.2 : 2.6) * day;
  sun.color.set("#fff1da").lerp(new T.Color("#ecad78"), sunset * 0.65);
  ambient.intensity = 0.9 + day * 0.55;
  ambient.color.set(day < 0.2 ? "#96b4ce" : "#d6dff2");
  scene.background.set(
    day < 0.2 ? "#607889" : state.weather === "pluie" ? "#a6bcb3" : "#c4d8ce",
  );
  scene.fog.color.copy(scene.background);
  world.water.material.uniforms.sun.value = day;
  if (world.lightPools)
    world.lightPools.opacity = Math.max(0, 1 - day * 1.6) * 0.85;
  mat("#e6c880", "", 0.25).emissiveIntensity = 0.05 + (1 - day) * 1.6;
  mat("#ffe0a2", "", 0.75).emissiveIntensity = 0.1 + (1 - day) * 2;
  const px = state.player.x,
    pz = state.player.z;
  sun.position.set(px - 25, 35 + day * 20, pz + 25);
  sun.target.position.set(px, 0, pz);
}
function movePlayer(dt) {
  const v = input.vector(),
    baseAngle = 0.65 + input.angle;
  let dx = 0,
    dz = 0;
  const active = Math.hypot(v.x, v.y) > 0.04;
  if (active) {
    input.target = null;
    input.route = [];
    dx = v.x * Math.cos(baseAngle) + v.y * Math.sin(baseAngle);
    dz = -v.x * Math.sin(baseAngle) + v.y * Math.cos(baseAngle);
  } else if (input.target) {
    dx = input.target.x - state.player.x;
    dz = input.target.z - state.player.z;
    const l = Math.hypot(dx, dz);
    if (l < 0.25) {
      input.target = input.route?.shift() || null;
      dx = dz = 0;
    } else {
      dx /= l;
      dz /= l;
    }
  }
  const speed = input.keys.has("shift") || input.running ? 6.8 : 4.1,
    x = state.player.x,
    z = state.player.z;
  let nx = x + dx * dt * speed,
    nz = z + dz * dt * speed;
  const blocked = (a, b) =>
    solidAt(a, b) ||
    state.buildings.some(o=>furnitureBlocks(o,a,b,.35,state.player.y||0,state.location)) ||
    (!interior && world.npcs.some((n) => {
      const nextDistance = Math.hypot(a - n.x, b - n.z);
      // A journey can land next to a wandering resident; always allow separation.
      return nextDistance < 0.55 && nextDistance < Math.hypot(x - n.x, z - n.z);
    }));
  if (!blocked(nx, z)) state.player.x = nx;
  if (!blocked(state.player.x, nz)) state.player.z = nz;
  if(interior)state.player.y=indoorHeight(state.player.x,state.player.z,state.player.y||0);
  const moving = Math.hypot(state.player.x - x, state.player.z - z) > 0.001;
  if (!moving && input.target && Math.hypot(dx, dz) > 0) input.target = null;
  player.position.set(
    state.player.x,
    surfaceHeight(state.player.x, state.player.z),
    state.player.z,
  );
  if (moving) {
    const a = Math.atan2(dx, dz);
    let d = ((a - player.rotation.y + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    player.rotation.y += d * Math.min(1, dt * 13);
    stepElapsed += dt;
    if (stepElapsed > 0.33) {
      stepElapsed = 0;
      audio.play("step");
    }
  }
  player.userData.animate(time, moving, input.keys.has("shift") || input.running, dt);
  if (actionTimer > 0) {
    actionTimer -= dt;
    if (!player.userData.ready)
      player.userData.arms[1].rotation.x =
        -Math.sin(((0.65 - actionTimer) / 0.65) * Math.PI) * 1.8;
  }
  if(interior)return;
  let tx = state.player.x - Math.sin(player.rotation.y) * 1.4 - 1,
    tz = state.player.z - Math.cos(player.rotation.y) * 1.4;
  const atFarm =
    state.player.x > -46 &&
    state.player.x < -14 &&
    state.player.z > 20 &&
    state.player.z < 44;
  if (state.flags.helper && atFarm) {
    const p =
      state.plots.find((p) => p.stage > 0 && p.stage < 4 && p.water < 0.6) ||
      state.plots[Math.floor(time / 5) % state.plots.length];
    tx = p.x;
    tz = p.z + 0.6;
    farmHelperElapsed += dt;
    if (farmHelperElapsed > 4) {
      farmHelperElapsed = 0;
      if (p.stage > 0 && p.stage < 4) {
        const element = species(state.team[0].id).element;
        if (element === "eau") p.water = 1;
        else if (element === "nature") {
          p.fertilized = true;
          p.growth += 6;
        } else if (element === "feu" && p.water > 0) p.growth += 9;
        else if (p.water > 0) p.growth += 3;
        world.burst(p.x, surfaceHeight(p.x, p.z) + 0.6, p.z, "#b2d5bc", 10);
        audio.play("water");
      }
    }
  }
  const dist = Math.hypot(companion.position.x - tx, companion.position.z - tz);
  companion.position.x = T.MathUtils.lerp(
    companion.position.x,
    tx,
    Math.min(1, dt * 2.7),
  );
  companion.position.z = T.MathUtils.lerp(
    companion.position.z,
    tz,
    Math.min(1, dt * 2.7),
  );
  companion.position.y = surfaceHeight(companion.position.x, companion.position.z);
  if (dist > 0.1)
    companion.rotation.y = Math.atan2(
      tx - companion.position.x,
      tz - companion.position.z,
    );
  companion.userData.animate(time, dist > 0.2);
}
function updateCamera(dt) {
  const compact = innerWidth < 950 && innerHeight < 600;
  const outdoorTps = started && !battle && !interior;
  // The classic outdoor camera keeps its old minimum distance (21). Zooming
  // farther in smoothly morphs into a real third-person camera instead of
  // collapsing the overhead view onto the player.
  const tpsRaw = outdoorTps ? T.MathUtils.clamp((21 - input.zoom) / 8, 0, 1) : 0;
  const tpsBlend = tpsRaw * tpsRaw * (3 - 2 * tpsRaw);
  let target,
    dist = Math.max(21, input.zoom) * (compact ? 0.76 : 1),
    angle = 0.65 + input.angle;
  if (!started) {
    target = new T.Vector3(-12, 2, -6);
    dist = 54;
    angle = 0.6 + Math.sin(time * 0.035) * 0.08;
  } else if (battle) {
    target = new T.Vector3(
      (player.position.x + battle.wild.x) / 2,
      1.1,
      (player.position.z + battle.wild.z) / 2,
    );
    dist = 16;
    angle = 0.7;
    const dir = new T.Vector3(
      battle.wild.x - player.position.x,
      0,
      battle.wild.z - player.position.z,
    ).normalize();
    companion.position.copy(player.position).addScaledVector(dir, 1.9);
    companion.position.y = surfaceHeight(companion.position.x, companion.position.z);
    companion.rotation.y = Math.atan2(dir.x, dir.z);
    battle.wild.mesh.rotation.y = companion.rotation.y + Math.PI;
    companion.userData.animate(time, false);
    if (battle.attack > 0) {
      battle.attack -= dt;
      companion.position.addScaledVector(
        dir,
        Math.sin(battle.attack * 15) * 0.18 * battle.side,
      );
    }
  } else
    target = new T.Vector3(
      state.player.x,
      surfaceHeight(state.player.x, state.player.z) + T.MathUtils.lerp(0.8, 1.45, tpsBlend),
      state.player.z,
    );
  if (battle) {
    target = new T.Vector3(0, 1.2, 0.5);
    dist = 23 * Math.max(1, 1 / camera.aspect);
    angle = 0.3 + Math.sin(time*.12)*.05;
    if(battle.stage.action){const a=battle.stage.action;dist-=Math.sin(Math.min(1,a.elapsed/a.duration)*Math.PI)*2;}
    battle.stage.update(dt, time);
  }
  if(interior && !battle){dist=7; target.y=player.position.y+1.1;}
  cameraTarget.lerp(target, 1 - Math.exp(-dt * (tpsBlend > .01 ? 7 : 4)));

  const overheadPos = new T.Vector3(
    cameraTarget.x + Math.sin(angle) * dist * 0.75,
    cameraTarget.y + dist * (battle ? 0.35 : interior ? 0.22 : 0.84),
    cameraTarget.z + Math.cos(angle) * dist * 0.75,
  );
  cameraPos.copy(overheadPos);

  if (outdoorTps && tpsBlend > 0) {
    // At maximum zoom the camera sits just behind the player. The last part
    // of the zoom only changes shoulder distance, keeping the transition soft.
    const close = T.MathUtils.clamp((13 - input.zoom) / 8, 0, 1);
    const back = T.MathUtils.lerp(compact ? 4.5 : 5.2, compact ? 2.8 : 3.2, close);
    const tpsPos = new T.Vector3(
      cameraTarget.x + Math.sin(angle) * back,
      cameraTarget.y + T.MathUtils.lerp(1.15, 0.78, close),
      cameraTarget.z + Math.cos(angle) * back,
    );

    // Keep the TPS camera on the player side of walls, trees and buildings.
    // Sampling from the player outward is cheap and avoids camera clipping.
    const dx = tpsPos.x - cameraTarget.x, dz = tpsPos.z - cameraTarget.z;
    const path = Math.hypot(dx, dz), steps = Math.max(1, Math.ceil(path / .3));
    let safeT = 1;
    for (let i = 2; i <= steps; i++) {
      const f = i / steps;
      if (f * path < .8) continue;
      const sx = cameraTarget.x + dx * f, sz = cameraTarget.z + dz * f;
      if (solidAt(sx, sz, .14)) { safeT = Math.max(.2, (i - 2) / steps); break; }
    }
    if (safeT < 1) {
      tpsPos.x = cameraTarget.x + dx * safeT;
      tpsPos.z = cameraTarget.z + dz * safeT;
      tpsPos.y = Math.max(tpsPos.y, cameraTarget.y + .55);
    }
    cameraPos.lerpVectors(overheadPos, tpsPos, tpsBlend);
  }

  if(interior&&!battle){cameraPos.x=T.MathUtils.clamp(cameraPos.x,-8.2,8.2);cameraPos.z=T.MathUtils.clamp(cameraPos.z,-7.2,7.2);cameraPos.y=Math.min(cameraPos.y,(state.player.y||0)>3.3?6.8:3.05);}
  const desiredFov = outdoorTps ? T.MathUtils.lerp(38, 52, tpsBlend) : (interior && !battle ? 55 : 38);
  if (Math.abs(camera.fov - desiredFov) > .02) {
    camera.fov = T.MathUtils.lerp(camera.fov, desiredFov, 1 - Math.exp(-dt * 8));
    camera.updateProjectionMatrix();
  }
  camera.position.lerp(cameraPos, 1 - Math.exp(-dt * (tpsBlend > .01 ? 8 : 4)));
  camera.lookAt(cameraTarget);
}
function updateUI() {
  const hour = Math.floor(state.time),
    min = Math.floor((state.time % 1) * 60);
  $("clock").textContent =
    `${String(hour).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
  $("calendar").textContent = `Printemps · Jour ${state.day}`;
  $("weatherIcon").textContent =
    state.weather === "pluie"
      ? "☂"
      : state.weather === "nuages"
        ? "☁"
        : state.time > 19 || state.time < 6
          ? "☾"
          : "☀";
  updateObjectiveTracker();
  if (!battle) {
    selected = nearby();
    $("hint").textContent = selected?.name || "";
    $("actBtn").innerHTML =
      (selected?.type === "wild"
        ? "Rencontrer"
        : selected?.type === "resource"
          ? "Récolter"
          : selected?.type === "plot"
            ? tool === "water"
              ? "Arroser"
              : selected.stage === 4
                ? "Récolter"
                : "Cultiver"
            : "Interagir") + " <kbd>E</kbd>";
  }
  for (const l of LANDMARKS)
    if (Math.hypot(l.x - state.player.x, l.z - state.player.z) < 13) {
      if (!state.discovered.includes(l.id)) {
        state.discovered.push(l.id);
        toast("Nouveau lieu découvert · " + l.name);
      }
      if (l.id !== lastRegion) {
        lastRegion = l.id;
        $("region").textContent = l.name;
        $("locationBanner").textContent = l.name;
        $("locationBanner").classList.add("show");
        clearTimeout(bannerTimer);
        bannerTimer = setTimeout(
          () => $("locationBanner").classList.remove("show"),
          2500,
        );
      }
    }
  drawMap($("minimap"));
  syncWorld();
}
let contextLost=false;
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();contextLost=true;if(started)persist();toast('Restauration du rendu…');});
canvas.addEventListener('webglcontextrestored',()=>{contextLost=false;applySettings();renderer.setSize(Math.max(1,innerWidth),Math.max(1,innerHeight));camera.updateProjectionMatrix();toast('Le rendu est rétabli.');});
// Landscape-only smartphone play; the overlay is the fallback when OS locking is unavailable.
let portraitBlocked=false;
const orientationPrompt=document.createElement('section');
orientationPrompt.id='orientationPrompt';orientationPrompt.hidden=true;
orientationPrompt.setAttribute('role','dialog');orientationPrompt.setAttribute('aria-modal','true');orientationPrompt.setAttribute('aria-labelledby','orientationTitle');
orientationPrompt.innerHTML='<span class="orientation-icon" aria-hidden="true">↻</span><h2 id="orientationTitle">Tournez votre téléphone</h2><p>Ambrelune se joue en paysage.<br>Tournez votre écran pour continuer.</p><button type="button">Activer le mode paysage</button>';
document.body.append(orientationPrompt);
orientationPrompt.querySelector('button').onclick=requestGameFullscreen;
const orientationInert=new Set();let orientationPreviousFocus=null;
function updateOrientationGate(){
 const mobile=matchMedia('(pointer:coarse)').matches || document.body.classList.contains('touch');
 const blocked=mobile && Math.min(innerWidth,innerHeight)<=600 && innerHeight>innerWidth;
 if(blocked===portraitBlocked)return;
 portraitBlocked=blocked;orientationPrompt.hidden=!blocked;
 document.body.classList.toggle('portrait-blocked',blocked);
 if(blocked){
  orientationPreviousFocus=document.activeElement;
  input.keys.clear();input.stick={x:0,y:0};input.running=false;input.target=null;input.route=[];input.drag=null;
  if(fishingSession)fishingSession.holding=false;
  for(const el of document.body.children)if(el!==orientationPrompt&&!el.inert){el.inert=true;orientationInert.add(el);}
  orientationPrompt.querySelector('button').focus();
 }else{
  for(const el of orientationInert)el.inert=false;orientationInert.clear();
  if(orientationPreviousFocus?.isConnected)orientationPreviousFocus.focus({preventScroll:true});
 }
}
window.addEventListener('resize',updateOrientationGate);
window.addEventListener('orientationchange',updateOrientationGate);
window.addEventListener('keydown',e=>{if(portraitBlocked){if(!['Tab','Enter',' '].includes(e.key))e.preventDefault();e.stopImmediatePropagation();}},true);
const orientationMedia=matchMedia('(pointer:coarse)');
if(orientationMedia.addEventListener)orientationMedia.addEventListener('change',updateOrientationGate);
else orientationMedia.addListener?.(updateOrientationGate);
new MutationObserver(updateOrientationGate).observe(document.body,{attributes:true,attributeFilter:['class']});
updateOrientationGate();

const clock = new T.Clock();
function loop() {
  requestAnimationFrame(loop);
  const raw = clock.getDelta(),
    dt = Math.min(raw, 0.05);
  if(contextLost || document.hidden || portraitBlocked)return;
  time += dt;
  windUniform.value = time;
  frames++;
  frameElapsed += raw;
  if (frameElapsed >= 1) {
    fps = frames / frameElapsed;
    frameMs = (frameElapsed / frames) * 1000;
    frames = 0;
    frameElapsed = 0;

    // Low mode only: adapt internal resolution gently to the phone's real FPS.
    // This never changes Medium or the higher quality modes.
    if (started && state.settings.quality === "low") {
      const previous = lowRenderScale;
      if (fps < 24) lowRenderScale = Math.max(0.65, lowRenderScale - 0.08);
      else if (fps < 31) lowRenderScale = Math.max(0.65, lowRenderScale - 0.04);
      else if (fps > 48) lowRenderScale = Math.min(0.85, lowRenderScale + 0.04);
      if (Math.abs(previous - lowRenderScale) >= 0.025)
        renderer.setPixelRatio(Math.min(devicePixelRatio, lowRenderScale));
    }

    const inf = renderer.info.render;
    $("debug").textContent =
      `${fps.toFixed(1)} FPS · ${frameMs.toFixed(1)} ms\n${inf.calls} appels · ${inf.triangles.toLocaleString()} triangles\n${world.chunks.filter((c) => c.g.visible).length}/${world.chunks.length} chunks visibles\n${innerWidth} × ${innerHeight} · DPR ${renderer.getPixelRatio().toFixed(2)}\nPosition ${state.player.x.toFixed(1)}, ${state.player.z.toFixed(1)}\n${renderer.info.memory.geometries} géométries · ${renderer.info.memory.textures} textures\nPNJ ${world.npcs
        .filter((n, i) => i === 0 || i === 3)
        .map((n) => n.name + " " + n.x.toFixed(1) + ", " + n.z.toFixed(1))
        .join(" · ")}`;
  }
  if (started) {
    const active = $("modal").hidden && !battle && !fishingSession;
    fishingSession?.update(dt,time);
    if (active) {
      advanceTime(dt);
      movePlayer(dt);
      saveElapsed += dt;
      if (saveElapsed > 20) {
        persist();
        saveElapsed = 0;
      }
    }
    if(!interior && !battle)world.update(dt, time, state, state.player.x, state.player.z);
    if (battle) battle.wild.mesh.visible = true;
    if(!interior && !battle)updateLighting();
    uiElapsed += dt;
    if (uiElapsed > 0.3) {
      updateUI();
      if (!$("toolbelt").children.length) renderToolbelt();
      uiElapsed = 0;
    }
    if (building) {
      preview.position.set(
        building.x,
        surfaceHeight(building.x, building.z),
        building.z,
      );
      preview.rotation.y = building.r;
      const valid = canPlace(state, building.x, building.z, (x, z, r) =>
        placementSolidAt(x, z, r), building.type, building.r, building.movingIndex
      );
      preview.traverse((o) => {
        if (o.isMesh) o.material.color.set(valid ? "#a0d4a4" : "#dc8272");
      });
      $("placeBtn").disabled = !valid;
    }
  } else world.update(dt, time, state, -9, 0);
  updateCamera(dt);
  foliageCutaway.value = started && !battle ? 1 : 0;
  if (player)
    foliageFocus.value.copy(player.position).add(new T.Vector3(0, 1, 0));
  foliageCamera.value.copy(camera.position);
  if(player)updateCutawayScreen(camera,renderer,foliageFocus.value);
  renderer.render(battle ? battle.stage.scene : currentScene(), camera);
}
window.addEventListener("resize", () => {
  camera.aspect = Math.max(1,innerWidth) / Math.max(1,innerHeight);
  camera.updateProjectionMatrix();
  applySettings();
  renderer.setSize(innerWidth, innerHeight);
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden && started) persist();
  input.keys.clear();
});
window.addEventListener("beforeunload", () => {
  if (started) persist();
});
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && started && !battle) $("hud").hidden = false;
});
// Read-only diagnostics, also rendered in the opt-in performance HUD.
window.ambreluneDiagnostics = () => ({
  fps,
  frameMs,
  drawCalls: renderer.info.render.calls,
  triangles: renderer.info.render.triangles,
  chunks: world.chunks.filter((c) => c.g.visible).length,
  errors: [...errors],
  state: JSON.parse(JSON.stringify(state)),
  webgl: renderer.capabilities.isWebGL2,
});
camera.position.set(26, 47, 39);
camera.lookAt(-12, 2, -6);

function setLoadingProgress(value, text = "") {
  const percent = Math.max(0, Math.min(100, Math.round(value)));
  const bar = $("loadingBar");
  const label = $("loadingPercent");
  const progress = document.querySelector(".loading-progress");
  if (bar) bar.style.width = `${percent}%`;
  if (label) label.textContent = `${percent} %`;
  if (progress) progress.setAttribute("aria-valuenow", String(percent));
  if (text && $("loadingText")) $("loadingText").textContent = text;
}

function waitForWorldModels(timeoutMs = 12000) {
  const actors = [
    ...world.npcs.map((n) => ({ mesh: n.mesh, key: "ready" })),
    ...world.wild.map((w) => ({ mesh: w.mesh, key: "modelReady" })),
  ];
  if (!actors.length) return Promise.resolve({ ready: 0, total: 0 });
  const startedAt = performance.now();
  return new Promise((resolve) => {
    const poll = () => {
      const ready = actors.filter(({ mesh, key }) => !!mesh?.userData?.[key]).length;
      setLoadingProgress(82 + (ready / actors.length) * 16, `Installation des habitants… ${ready}/${actors.length}`);
      if (ready >= actors.length || performance.now() - startedAt >= timeoutMs) {
        resolve({ ready, total: actors.length });
        return;
      }
      setTimeout(poll, 80);
    };
    poll();
  });
}

async function startup() {
  // Le décor du menu démarre toujours en mode léger. Une sauvegarde existante
  // retrouve sa qualité choisie uniquement au moment de « Reprendre ».
  state.settings.quality = "low";
  applySettings();
  setLoadingProgress(3, "Préparation des jardins…");

  let characterDone = 0;
  let characterTotal = 1;
  let monsterDone = 0;
  let monsterTotal = 1;
  const refreshAssetProgress = (label = "") => {
    const done = characterDone + monsterDone;
    const total = characterTotal + monsterTotal;
    setLoadingProgress(8 + (done / Math.max(1, total)) * 72, label ? `Chargement des modèles · ${label}` : "Chargement des modèles…");
  };

  const preload = Promise.all([
    preloadCharacterAssets((done, total, label) => {
      characterDone = done; characterTotal = total; refreshAssetProgress(label);
    }),
    preloadMonsterModels((done, total, label) => {
      monsterDone = done; monsterTotal = total; refreshAssetProgress(label);
    }),
  ]);

  // Un fichier corrompu ou une connexion lente ne doit jamais emprisonner le joueur
  // sur l'écran de chargement : les fallbacks procéduraux restent disponibles.
  await Promise.race([
    preload,
    new Promise((resolve) => setTimeout(resolve, 20000)),
  ]);

  await waitForWorldModels();
  setLoadingProgress(99, "Derniers préparatifs…");
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  setLoadingProgress(100, "Ambrelune est prête.");
  await new Promise((resolve) => setTimeout(resolve, 180));

  $("loading").hidden = true;
  $("intro").hidden = false;
  $("continueBtn").hidden = !load();
}

loop();
startup().catch((error) => {
  console.warn("[Ambrelune] Préchargement incomplet, démarrage avec fallbacks.", error);
  setLoadingProgress(100, "Ambrelune est prête.");
  $("loading").hidden = true;
  $("intro").hidden = false;
  $("continueBtn").hidden = !load();
});
if ("serviceWorker" in navigator)
  navigator.serviceWorker
    .register("./sw.js")
    .catch((e) => console.warn("Cache hors ligne indisponible", e));

// Development harness imports; no automatic test execution.
export { state, world, player, camera, renderer, input, begin, enterHome, leaveHome, openMenu, closeModal, startBuild, placeBuilding, cancelBuild, furnishingMenu, movePlayer, updateCamera, syncWorld, selectTool, fishing, startBattle, endBattle, interior, battle, applyMove };

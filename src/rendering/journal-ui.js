import { CROPS, BUILDABLES, FOOD, LABELS, stationAvailable } from '../systems/homestead.js';
import {
  ITEMS,
  RECIPES,
  species,
  ELEMENT_NAMES,
} from "../systems/data.js";
import { creaturePortrait3D } from "./creature-preview.js";
const drawings = {
  wood: '<path fill="#986845" d="m22 50 39-22 39 24-39 25z"/><path fill="#bc895a" d="M22 50v24l39 22V77z"/><path fill="#79533e" d="m61 77 39-25v23L61 96z"/><ellipse fill="#e1bb83" cx="41" cy="68" rx="16" ry="11" transform="rotate(30 41 68)"/><ellipse fill="none" cx="41" cy="68" rx="9" ry="6" transform="rotate(30 41 68)"/><path d="m62 43 24 12m-30-5 18 10"/>',
  stone:
    '<path fill="#879b99" d="m20 75 8-29 30-18 30 9 16 39-27 16-37-2z"/><path fill="#c3cebc" d="m28 46 30-18 14 28-29 12z"/><path fill="#657b82" d="m72 56 16-19 16 39-27 16z"/><path fill="none" d="m43 68-3 22m3-22 29-12 5 36"/>',
  fiber:
    '<path fill="#8aa461" d="M58 91Q20 61 31 28q29 14 27 63M62 88Q43 37 63 18q18 32-1 70M63 92q4-50 30-56 2 38-30 56"/><path fill="none" d="m42 41 17 43m6-49-4 49m21-31L66 84"/><path fill="#dcc18b" d="m46 73 29 2-2 12-25-3z"/>',
  crystal:
    '<path fill="#71c0b1" d="m38 46 20-29 25 27-5 42-25 14-24-26z"/><path fill="#c3efd4" d="m58 17 3 45-23-16z"/><path fill="#3b9e9d" d="m61 62 22-18-5 42-25 14z"/><path fill="#e7f8de" d="m61 62-8 38-15-54z"/><path stroke="#dfbe65" d="M93 22v16m-8-8h16M23 41v10m-5-5h10"/>',
  seed: '<path fill="#d6b681" d="m35 27 50 2 4 61-57 1z"/><path fill="#ecd9a8" d="m35 27 5-8 40 1 5 9z"/><path fill="#fff1d0" d="M40 42h40v35H40z"/><path fill="#7b9b54" d="M59 68q-18-20-4-22 12 7 4 22m1-5q2-20 15-15 1 13-15 15"/><path d="m40 84 37-1"/>',
  crop: '<path fill="#648c60" d="M57 87q-28-5-30-25 27-3 30 25m5 0q27-4 30-25-27-4-30 25"/><path fill="#cf7b97" d="M59 75C21 69 22 49 41 47 22 22 48 20 60 37 75 12 97 33 79 49 106 54 91 77 59 75z"/><circle fill="#efc878" cx="60" cy="52" r="13"/><path d="M60 67v27"/>',
  seal: '<circle fill="#ead7a5" cx="60" cy="59" r="32"/><circle fill="#649e9a" cx="60" cy="59" r="23"/><path fill="#cef0df" d="m60 37 8 15 15 7-15 7-8 15-8-15-15-7 15-7z"/><path fill="none" stroke="#d5b879" stroke-width="5" d="M38 25q20-20 43 2M37 89l-8 12m53-14 8 13"/>',
  potion:
    '<path fill="#d4e7cb" d="M49 20h23v24q22 11 19 37-3 18-30 18T31 81q-3-26 18-37z"/><path fill="#c8829c" d="M35 65q25 10 52 0v15q-1 14-26 14T35 80z"/><path fill="#c59a69" d="M46 18h29v14H46z"/><path fill="#fff3cf" d="M45 62h32v20H45z"/><path fill="#7b965f" d="M59 77q-11-11-5-15 13 1 5 15m2-2q1-15 11-13-1 12-11 13"/><path stroke="#fff9df" stroke-width="4" d="M41 50q-5 6-5 12"/>',
  fish: '<path fill="#d8a45d" d="M25 59Q51 26 88 48l18-14-1 41-19-10Q47 94 25 59z"/><path fill="#f0d596" d="M25 59q25 21 61 6-34 30-61-6"/><path fill="#b88659" d="m52 42 8-14 15 15M49 77l17 13 4-13"/><circle fill="#344b47" cx="39" cy="55" r="4"/><path fill="none" d="m54 49-6 12 8 11m15-18-4 8 5 7"/>',
  plank:
    '<path fill="#ae7f53" d="m20 47 66-18 15 17-66 23zM20 68l65-18 15 17-66 23z"/><path fill="#ddaf79" d="m20 47 15 22v9L20 55zm0 21 14 22v8L20 76z"/><path d="m37 47 45-12M44 55l44-14M39 75l43-18"/>',
  lamp: '<path fill="none" stroke-width="5" d="M49 33V20q11-14 23 0v13"/><path fill="#57796e" d="m36 40 24-17 25 17-8 5H43zM39 84h44v9H39z"/><path fill="#f7d67b" d="M43 45h35v39H43z"/><path fill="#fff0b9" d="m50 50 13-2-4 30-9 1z"/><path d="M43 45v39m35-39v39M60 45v39"/>',
  fence:
    '<path fill="#b98c5f" d="M22 48 98 33v11L22 60zm0 24 76-15v11L22 84z"/><path fill="#dab07b" d="m28 34 7-8 7 6v63l-14 3zm51-11 7-8 7 6v64l-14 3z"/><path d="M35 38v51m51-60v49"/>',
  bench:
    '<path fill="#8c674c" d="M31 64v30h8V69m43-15v31h8V53"/><path fill="#c69665" d="m23 61 62-14 16 14-66 18zM25 37l60-13v14L25 52zm0 19 60-14v12L25 70z"/><path d="m37 66 48-11M33 35v23m45-33v25"/>',
  bed: '<path fill="#b98558" d="m21 60 72-11 8 25-70 20z"/><path fill="#d9ae7d" d="m21 60 10 34-9-10-8-24z"/><path stroke="#5c8d59" d="M31 65V39m20 23V30m21 27V34m15 21V25"/><g fill="#dc91aa"><circle cx="30" cy="36" r="10"/><circle cx="72" cy="32" r="11"/></g><g fill="#eed192"><circle cx="51" cy="29" r="11"/><circle cx="87" cy="25" r="9"/></g><path d="m33 76 57-15"/>',
  workbench:
    '<path fill="#85614b" d="M29 57v39h8V61m47-15v38h8V44M33 81l52-13v6L33 88"/><path fill="#c4996c" d="m16 43 68-16 24 21-72 22z"/><path fill="#e1c599" d="m16 43 20 20 72-19v9L36 75 16 54z"/><path fill="#738b86" d="m47 32 7-9 23 11-7 9z"/><path stroke="#855d42" stroke-width="6" d="m62 37-9 16"/>',
  fertilizer:
    '<path fill="#b09a70" d="M42 28q17 7 35-1l-7 18q22 13 22 36Q88 101 60 100T29 82q-1-23 21-37z"/><path fill="#dccba4" d="m45 42 29 1-1 8-28-1z"/><ellipse fill="#ede0b6" cx="60" cy="75" rx="19" ry="16"/><path fill="#718f5e" d="M59 86q-25-26-10-25 16 1 10 25m2-1q-3-26 16-24 2 14-16 24"/>',
};
Object.assign(drawings,{
 chest:'<path fill="#b48a58" d="M23 40h74v48H23z"/><path fill="#d0aa72" d="M23 40q37-28 74 0v14H23z"/><path stroke="#66756b" stroke-width="7" d="M36 29v58m48-58v58"/><path fill="#efd08a" d="M53 48h14v16H53z"/>',
 sleepingBed:'<path fill="#8a6748" d="M22 43h77v44H22z"/><path fill="#eadebd" d="m25 38 56-14 21 43-64 20z"/><path fill="#7eaa8e" d="m29 51 61-15 13 33-63 20z"/><path fill="#fff2d5" d="m26 38 21-6 6 13-21 6z"/><path d="M24 76v23m72-22v17"/>',
 furnace:'<path fill="#8b9183" d="M29 28h60v67H29z"/><path fill="#a7ab94" d="m29 28 12-12h49l-1 12z"/><path fill="#3f4941" d="M41 55q20-27 36 0v27H41z"/><path fill="#edaa57" d="m49 78 4-22 9 11 7-14 4 25z"/>',
 table:'<path fill="#b29165" d="m17 46 68-22 23 27-65 21z"/><path fill="#82664b" d="M27 59v33h9V64m54-16v39h8V53M48 71v28h8V68"/>',
 chair:'<path fill="#b29165" d="M35 20h47v42H35zM27 65l49-13 17 19-48 16z"/><path d="M32 74v26m49-21v21M41 30v24m27-24v19"/>',
 shelf:'<path fill="#9c7852" d="M24 17h9v82h-9zm64 0h9v82h-9z"/><path stroke="#c4a879" stroke-width="9" d="M27 26h66M27 59h66M27 91h66"/>',
 rug:'<path fill="#b97f76" d="m12 62 69-37 30 34-71 39z"/><path fill="#e3c399" d="m29 62 50-26 18 20-53 29z"/><path fill="#7d9c88" d="m48 61 29-16 9 11-32 16z"/>',
 ore:'<path fill="#967961" d="m23 80 8-35 30-21 34 25 9 34-37 14z"/><path fill="#c58d55" d="m37 48 23-12 13 21-23 11zm28 29 15-13 12 14-21 11z"/>',
 coal:'<path fill="#46524c" d="m20 72 21-37 31-8 27 24-2 33-45 13z"/><path fill="#6a756c" d="m41 35 10 34 22-11-1-31z"/>',
 iron:'<path fill="#92a5a0" d="m17 65 21-26 52-10 13 32-18 20-48 12z"/><path fill="#c0ccc0" d="m38 39 52-10-5 27-49 14z"/>',
 cloth:'<path fill="#d8cfb6" d="m22 35 66-12 14 61-69 14z"/><path stroke="#9aa99b" d="m33 43 52-11M35 57l53-12M39 72l53-10M42 86l52-11"/>',
 wheat:'<path stroke="#aa894a" stroke-width="5" d="M58 98V22m-3 52L33 45m29 22 22-28"/><g fill="#e1bf6b"><ellipse cx="43" cy="38" rx="8" ry="14" transform="rotate(-35 43 38)"/><ellipse cx="69" cy="34" rx="8" ry="14" transform="rotate(35 69 34)"/><ellipse cx="46" cy="60" rx="8" ry="13" transform="rotate(-35 46 60)"/><ellipse cx="73" cy="58" rx="8" ry="13" transform="rotate(35 73 58)"/></g>',
 carrot:'<path fill="#83a36a" d="M68 42Q37 10 51 11l20 20q10-28 19-17L79 39z"/><path fill="#e0a35a" d="M73 38q25 13-41 63 3-57 24-64z"/><path d="m54 53 14 9m-24 3 10 5"/>',
 pumpkin:'<path fill="#9ea477" d="M58 30q-5-21 9-17l2 23z"/><ellipse fill="#d8a554" cx="60" cy="65" rx="39" ry="32"/><ellipse fill="#e7b666" cx="60" cy="65" rx="21" ry="32"/>',
 bread:'<path fill="#cb9858" d="M21 75q-2-44 44-47 36 0 39 42-39 35-83 5z"/><path stroke="#f1d5a0" stroke-width="6" d="m42 48 8 22m11-28 8 22m10-23 9 17"/>',
 stew:'<path fill="#b77756" d="M24 53q36 29 74 0-4 40-38 40T24 53"/><ellipse fill="#dfb26d" cx="61" cy="52" rx="37" ry="17"/><g fill="#799361"><circle cx="45" cy="51" r="7"/><circle cx="74" cy="55" r="6"/></g><path stroke="#e0cdb0" d="M48 32q-7-12 0-19m20 18q-7-12 0-19"/>'
});
drawings.stove=drawings.furnace;drawings.wardrobe=drawings.chest;drawings.composter=drawings.bed;drawings.grilledFish=drawings.fish;drawings.flax=drawings.fiber;drawings.flour=drawings.fertilizer;
for(const id of Object.keys(CROPS))if(id!=='seed')drawings[id]=drawings.seed.replace('#7b9b54',CROPS[id].color);
drawings.quality =
  drawings.crop.replace("#cf7b97", "#dfb24f").replace("#efc878", "#fff0ab") +
  '<path stroke="#b78a35" d="M91 22v12m-6-6h12"/>';
export function itemArt(id) {
  return `<svg class="item-art" viewBox="0 0 120 112" role="img" aria-label="${ITEMS[id] || id}"><ellipse cx="60" cy="98" rx="39" ry="6" fill="#42634e14"/><g stroke="#4b5746" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${drawings[id] || drawings.seed}</g></svg>`;
}
export function gauge(kind, value, max, label = kind.toUpperCase()) {
  const v = Math.max(0, Math.min(max, Number(value) || 0));
  const pct = max > 0 ? (v / max) * 100 : 0;
  const tone =
    kind === "pv"
      ? pct <= 25
        ? "critical"
        : pct <= 50
          ? "warning"
          : "healthy"
      : kind;
  return `<div class="stat-gauge ${tone}"><div class="gauge-label"><span>${label}</span><span>${v} / ${max}</span></div><div class="gauge-track" role="progressbar" aria-label="${label}" aria-valuemin="0" aria-valuemax="${max}" aria-valuenow="${v}"><i style="width:${pct}%"></i></div></div>`;
}

const ITEM_META = {
  wood: ["Ressource", "Bois brut récolté dans les bosquets d’Ambrelune."],
  stone: ["Ressource", "Pierre solide pour les ouvrages du jardin."],
  fiber: ["Ressource", "Fibres souples utilisées dans les tissages."],
  crystal: ["Rare", "Cristal chargé de sève, utile aux créations de résonance."],
  seed: ["Culture", "Graines prêtes à être semées dans votre potager."],
  crop: ["Récolte", "Roselles fraîches, utiles au marché et aux tisanes."],
  quality: ["Récolte rare", "Roselles dorées d’une qualité exceptionnelle."],
  seal: ["Lien", "Tissage lumineux permettant d’approcher une créature."],
  potion: ["Soin", "Tisane revigorante pour vos compagnons."],
  fish: ["Pêche", "Une truite ambrée pêchée dans la rivière."],
  plank: ["Matériau", "Planche travaillée prête pour l’artisanat."],
  lamp: ["Aménagement", "Une lanterne chaleureuse pour votre propriété."],
  fence: ["Aménagement", "Clôture tressée pour dessiner les contours du jardin."],
  bench: ["Aménagement", "Banc de jardin façonné en bois et pierre."],
  bed: ["Aménagement", "Jardinière décorative généreusement fleurie."],
  workbench: ["Atelier", "Établi de campagne pour votre terrain."],
  fertilizer: ["Culture", "Compost qui aide les cultures à donner le meilleur d’elles-mêmes."],
};

for (const r of RECIPES) if (!ITEM_META[r.id]) ITEM_META[r.id] = [BUILDABLES.includes(r.id) ? (['furnace','stove','composter'].includes(r.id) ? 'Atelier' : 'Mobilier') : FOOD[r.id] ? 'Cuisine' : 'Matériau', r.desc];
for (const [id, crop] of Object.entries(CROPS)) {
 if (!ITEM_META[id]) ITEM_META[id] = ['Semence', 'À planter et arroser au potager. Récolte : ' + crop.name + '.'];
 if (!ITEM_META[crop.item]) ITEM_META[crop.item] = ['Récolte', {wheat:'À moudre en farine pour préparer du pain.',carrot:'Pour la cuisine et le compost.',flax:'À transformer en toile sur un établi pour fabriquer du mobilier.',pumpkin:'Pour cuisiner un ragoût nourrissant.'}[crop.item]];
}
ITEM_META.ore = ['Minerai', 'À extraire à la pioche puis fondre avec du charbon dans une fonderie.'];

const ITEM_SECTIONS = [
  ["Ressources", ["wood", "stone", "fiber", "crystal", "plank", "ore", "coal", "iron", "cloth", "flour"]],
  ["Culture & récoltes", [...Object.keys(CROPS), "crop", "quality", "fertilizer", "fish", "wheat", "carrot", "flax", "pumpkin"]],
  ["Objets utiles", ["seal", "potion", ...Object.keys(FOOD)]],
  ["Aménagements", BUILDABLES],
];

const figure = (id, name, count) =>
  `<div class="object-figure">${itemArt(id)}${count !== undefined ? `<span class="item-count">${count}</span>` : ""}</div><div class="object-copy"><span class="object-kicker">${ITEM_META[id]?.[0] || "Objet"}</span><h3 class="object-name">${name || ITEMS[id]}</h3></div>`;

export function teamView(state) {
  return `<div class="menu-lead"><div><span class="section-kicker">ÉQUIPE ACTIVE</span><h3>Vos compagnons de voyage</h3><p>Gérez l’ordre de votre équipe, surveillez leur progression et choisissez qui vous accompagne au jardin.</p></div><div class="menu-stat"><small>COMPAGNONS</small><b>${state.team.length}</b></div></div><div class="companion-grid">${state.team
    .map((c, i) => {
      const sp = species(c.id);
      return `<article class="companion-card" style="--species:${sp.color};--species-accent:${sp.accent}"><div class="companion-rank">${i === 0 ? "ACTIF" : `N° ${i + 1}`}</div><div class="creature-heading">${creaturePortrait3D(c.id, "companion")}<div><span class="element-chip">${ELEMENT_NAMES[sp.element]}</span><h3>${sp.name}</h3><small>Niveau ${c.level} · ${sp.temper}</small></div></div><p class="companion-role">${sp.job || sp.desc}</p>${gauge("pv", c.hp, c.maxHp)}${gauge("xp", c.xp, c.level * 20)}<div class="card-actions"><button data-lead="${i}" ${i === 0 ? "disabled" : ""}>${i === 0 ? "En tête" : "Mettre en tête"}</button><button data-heal="${i}" ${!state.inventory.potion || c.hp === c.maxHp ? "disabled" : ""}>Soigner</button></div></article>`;
    })
    .join("")}</div><div class="menu-footer-action"><div><span class="section-kicker">AIDE AU JARDIN</span><p>${species(state.team[0].id).job || "Ce compagnon veille sur les cultures."}</p></div><button id="helper" class="premium-action">${state.flags.helper ? "Rappeler mon compagnon" : "L’affecter au jardin"}</button></div>`;
}

export function bagView(state) {
  const entries = Object.entries(state.inventory).filter(([, n]) => n > 0);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  const sections = ITEM_SECTIONS.map(([title, ids]) => {
    const items = ids.filter((id) => (state.inventory[id] || 0) > 0);
    if (!items.length) return "";
    return `<section class="inventory-section"><div class="inventory-section-title"><span>${title}</span><small>${items.reduce((s, id) => s + (state.inventory[id] || 0), 0)} objet(s)</small></div><div class="object-grid bag-grid">${items
      .map(
        (id) =>
          `<article class="object-card inventory-card">${figure(id, null, state.inventory[id])}<p class="object-description">${ITEM_META[id]?.[1] || "Ressource conservée pour vos prochaines créations."}</p>${CROPS[id]?`<button data-seed="${id}">${state.selectedSeed===id?"Sélectionnée":"Semer"}</button>`:FOOD[id]?`<button data-eat="${id}">Nourrir le compagnon</button>`:BUILDABLES.includes(id)?`<button data-build="${id}">Placer</button>`:""}</article>`,
      )
      .join("")}</div></section>`;
  }).join("");
  return `<div class="menu-lead"><div><span class="section-kicker">INVENTAIRE</span><h3>Le sac d’Ambrelune</h3><p>Tout ce que vous récoltez, fabriquez ou trouvez pendant votre voyage est rangé ici.</p></div><div class="inventory-summary"><div><small>OBJETS</small><b>${total}</b></div><div><small>AMBRES</small><b>◈ ${state.coins}</b></div></div></div><div class="equipment-strip" aria-label="Outils permanents">${[["hand","Lien"],["axe","Hache"],["pick","Pioche"],["hoe","Cultiver"],["water","Arrosoir"]].map(([id,label])=>`<button data-equip="${id}">${label}</button>`).join("")}</div><label class="inventory-search">Rechercher <input id="inventorySearch" type="search" placeholder="Bois, graines, mobilier…"></label>${sections || '<div class="empty premium-empty"><b>Votre sac est vide.</b><span>Explorez les jardins pour récolter vos premières ressources.</span></div>'}`;
}

export function craftView(state, canAfford) {
  return `<div class="menu-lead"><div><span class="section-kicker">ATELIER</span><h3>Façonner, tisser, construire</h3><p>Chaque création indique votre stock réel et les ressources nécessaires.</p></div><div class="menu-stat"><small>RECETTES</small><b>${RECIPES.length}</b></div></div><label class="inventory-search">Afficher <select id="craftFilter"><option value="all">Toutes les recettes</option><option value="ready">Fabricables maintenant</option><option value="furniture">Mobilier et ateliers</option><option value="food">Cuisine et soins</option><option value="resource">Matériaux et jardin</option></select></label><div class="object-grid recipe-grid">${RECIPES.map((r) => {
    const hasMaterials=canAfford(state,r.cost),hasStation=stationAvailable(state,r.station);
    const ready = hasMaterials && hasStation;
    return `<article data-category="${BUILDABLES.includes(r.id)?"furniture":FOOD[r.id]||r.id==="potion"?"food":"resource"}" class="object-card recipe-card ${ready ? "recipe-ready" : ""}"><div class="recipe-state">${ready ? "PRÊT" : !hasStation ? "ATELIER REQUIS" : "RESSOURCES MANQUANTES"}</div>${figure(r.id, r.name, r.count)}<p class="object-description">${r.desc}${r.station ? `<br><small>À proximité : ${ITEMS[r.station]}</small>` : ""}</p><div class="ingredients">${Object.entries(r.cost)
      .map(
        ([id, n]) =>
          `<div class="ingredient ${(state.inventory[id] || 0) < n ? "missing" : ""}" title="${ITEMS[id]} : ${state.inventory[id] || 0} disponibles, ${n} nécessaires">${itemArt(id)}<small>${ITEMS[id]}</small><b>${state.inventory[id] || 0}<em>/ ${n}</em></b></div>`,
      )
      .join("")}</div><button data-craft="${RECIPES.indexOf(r)}" aria-label="Fabriquer ${r.name}" ${!ready ? "disabled" : ""}>Fabriquer <span>→</span></button></article>`;
  }).join("")}</div>`;
}

export function gardenView(state) {
  const buildables = BUILDABLES;
  return `<div class="menu-lead"><div><span class="section-kicker">PROPRIÉTÉ</span><h3>Aménager votre jardin</h3><p>Placez vos créations dans la maison ou au jardin. Appui prolongé sur mobile ou double-clic sur PC pour les déplacer et les récupérer.</p></div><div class="menu-stat"><small>INSTALLÉS</small><b>${state.buildings.length}</b></div></div><div class="object-grid garden-grid">${buildables
    .map(
      (id) =>
        `<article class="object-card garden-card">${figure(id, null, state.inventory[id] || 0)}<p class="object-description">${ITEM_META[id]?.[1] || "Aménagement pour votre propriété."}</p><button data-build="${id}" aria-label="Placer ${ITEMS[id]}" ${!state.inventory[id] ? "disabled" : ""}>Placer <span>→</span></button></article>`,
    )
    .join("")}<article class="object-card garden-card">${figure("fertilizer", null, state.inventory.fertilizer || 0)}<p class="object-description">${ITEM_META.fertilizer[1]}</p><button id="fertilize" ${!state.inventory.fertilizer ? "disabled" : ""}>Fertiliser <span>→</span></button></article></div>${state.buildings.length ? `<div class="collection-head"><div><span class="section-kicker">DÉJÀ INSTALLÉ</span><h3>Votre jardin aujourd’hui</h3></div><small>${state.buildings.length} aménagement(s)</small></div><div class="object-grid installed-grid">${state.buildings.map((b, i) => `<article class="object-card installed-card">${figure(b.type)}<small>${b.location && b.location!=="world" ? "Maison · " + ((b.y||0)>3?"étage":"rez-de-chaussée") : "Jardin"}</small><button data-edit-object="${i}">Gérer / déplacer</button><button data-remove="${i}" aria-label="Récupérer ${ITEMS[b.type]}">Récupérer</button></article>`).join("")}</div>` : ""}`;
}

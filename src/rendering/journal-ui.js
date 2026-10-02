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

const ITEM_SECTIONS = [
  ["Ressources", ["wood", "stone", "fiber", "crystal", "plank"]],
  ["Culture & récoltes", ["seed", "crop", "quality", "fertilizer", "fish"]],
  ["Objets utiles", ["seal", "potion"]],
  ["Aménagements", ["lamp", "fence", "bench", "bed", "workbench"]],
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
          `<article class="object-card inventory-card">${figure(id, null, state.inventory[id])}<p class="object-description">${ITEM_META[id]?.[1] || "Objet conservé dans votre sac."}</p></article>`,
      )
      .join("")}</div></section>`;
  }).join("");
  return `<div class="menu-lead"><div><span class="section-kicker">INVENTAIRE</span><h3>Le sac d’Ambrelune</h3><p>Tout ce que vous récoltez, fabriquez ou trouvez pendant votre voyage est rangé ici.</p></div><div class="inventory-summary"><div><small>OBJETS</small><b>${total}</b></div><div><small>AMBRES</small><b>◈ ${state.coins}</b></div></div></div>${sections || '<div class="empty premium-empty"><b>Votre sac est vide.</b><span>Explorez les jardins pour récolter vos premières ressources.</span></div>'}`;
}

export function craftView(state, canAfford) {
  return `<div class="menu-lead"><div><span class="section-kicker">ATELIER</span><h3>Façonner, tisser, construire</h3><p>Chaque création indique votre stock réel et les ressources nécessaires.</p></div><div class="menu-stat"><small>RECETTES</small><b>${RECIPES.length}</b></div></div><div class="object-grid recipe-grid">${RECIPES.map((r) => {
    const ready = canAfford(state, r.cost);
    return `<article class="object-card recipe-card ${ready ? "recipe-ready" : ""}"><div class="recipe-state">${ready ? "PRÊT" : "RESSOURCES MANQUANTES"}</div>${figure(r.id, r.name, r.count)}<p class="object-description">${r.desc}</p><div class="ingredients">${Object.entries(r.cost)
      .map(
        ([id, n]) =>
          `<div class="ingredient ${(state.inventory[id] || 0) < n ? "missing" : ""}" title="${ITEMS[id]} : ${state.inventory[id] || 0} disponibles, ${n} nécessaires">${itemArt(id)}<small>${ITEMS[id]}</small><b>${state.inventory[id] || 0}<em>/ ${n}</em></b></div>`,
      )
      .join("")}</div><button data-craft="${r.id}" aria-label="Fabriquer ${r.name}" ${!ready ? "disabled" : ""}>Fabriquer <span>→</span></button></article>`;
  }).join("")}</div>`;
}

export function gardenView(state) {
  const buildables = ["lamp", "fence", "bench", "bed", "workbench"];
  return `<div class="menu-lead"><div><span class="section-kicker">PROPRIÉTÉ</span><h3>Aménager votre jardin</h3><p>Choisissez une création possédée puis placez-la librement sur votre terrain.</p></div><div class="menu-stat"><small>INSTALLÉS</small><b>${state.buildings.length}</b></div></div><div class="object-grid garden-grid">${buildables
    .map(
      (id) =>
        `<article class="object-card garden-card">${figure(id, null, state.inventory[id] || 0)}<p class="object-description">${ITEM_META[id]?.[1] || "Aménagement pour votre propriété."}</p><button data-build="${id}" aria-label="Placer ${ITEMS[id]}" ${!state.inventory[id] ? "disabled" : ""}>Placer <span>→</span></button></article>`,
    )
    .join("")}<article class="object-card garden-card">${figure("fertilizer", null, state.inventory.fertilizer || 0)}<p class="object-description">${ITEM_META.fertilizer[1]}</p><button id="fertilize" ${!state.inventory.fertilizer ? "disabled" : ""}>Fertiliser <span>→</span></button></article></div>${state.buildings.length ? `<div class="collection-head"><div><span class="section-kicker">DÉJÀ INSTALLÉ</span><h3>Votre jardin aujourd’hui</h3></div><small>${state.buildings.length} aménagement(s)</small></div><div class="object-grid installed-grid">${state.buildings.map((b, i) => `<article class="object-card installed-card">${figure(b.type)}<button data-remove="${i}" aria-label="Récupérer ${ITEMS[b.type]}">Récupérer</button></article>`).join("")}</div>` : ""}`;
}

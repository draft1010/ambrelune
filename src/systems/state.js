import { CROPS, stationAvailable, footprint, spaceOf } from "./homestead.js";
import { species, QUESTS, ITEMS } from "./data.js";
export const SAVE_KEY = "ambrelune.save.v1";
export function makeCreature(id, level = 3) {
  const c = species(id);
  return {
    id,
    level,
    xp: 0,
    maxHp: c.hp + level * 4,
    hp: c.hp + level * 4,
    energy: 30,
    status: null,
    guard: false,
  };
}
export function newState(starter = "velune", name = "Élo", color = "#657d95") {
  return {
    version: 1,
    location: "world",
    selectedSeed: "seed",
    name: name.slice(0, 24),
    color,
    player: { x: -9, z: 8 },
    time: 8,
    day: 1,
    weather: "soleil",
    coins: 120,
    team: [makeCreature(starter)],
    inventory: {
      wood: 0,
      stone: 0,
      fiber: 0,
      crystal: 0,
      seed: 12,
      crop: 0,
      seal: 8,
      potion: 3,
      fence: 2,
    },
    plots: [],
    buildings: [],
    depleted: {},
    flags: {},
    stats: { planted: 0, watered: 0, harvested: 0, captured: 0, battles: 0 },
    friendship: {},
    discovered: ["city"],
    quest: 0,
    settings: { quality: "low", pixel: false, sound: true, touch: false },
    playtime: 0,
  };
}
export function normalizeSave(raw) {
  if (
    !raw ||
    raw.version !== 1 ||
    !Array.isArray(raw.team) ||
    !raw.team.length ||
    !raw.player ||
    !Number.isFinite(raw.player.x) ||
    !Number.isFinite(raw.player.z)
  )
    throw Error("Sauvegarde incompatible");
  const base = newState();
  return {
    ...base,
    ...raw,
    stats: { ...base.stats, ...raw.stats },
    location: typeof raw.location==='string' && /^(world|home|house--?\d+--?\d+)$/.test(raw.location) ? raw.location : 'world',
    selectedSeed: CROPS[raw.selectedSeed] ? raw.selectedSeed : 'seed',
    inventory: Object.fromEntries(Object.entries({...base.inventory,...raw.inventory}).filter(([id,n])=>Object.hasOwn(ITEMS,id)&&Number.isFinite(n)&&n>=0).map(([id,n])=>[id,Math.floor(n)])),
    settings: { ...base.settings, ...raw.settings, quality:['low','medium','high','ultra'].includes(raw.settings?.quality)?raw.settings.quality:base.settings.quality },
    team: raw.team.map((c) => ({ ...makeCreature(c.id, c.level), ...c })),
    flags: { ...raw.flags },
    discovered: raw.discovered || ["city"],
  };
}
export function load(storage = localStorage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return null;
    const normalized = normalizeSave(JSON.parse(raw));
    // Repair/advance any quest whose condition was already fulfilled before loading.
    advanceQuest(normalized);
    return normalized;
  } catch {
    return null;
  }
}
export function save(s, storage = localStorage) {
  const previous = storage.getItem(SAVE_KEY);
  if (previous) storage.setItem(SAVE_KEY + ".backup", previous);
  storage.setItem(SAVE_KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
}
export function canAfford(s, cost) {
  return Object.entries(cost).every(([k, v]) => (s.inventory[k] || 0) >= v);
}
export function spend(s, cost) {
  if (!canAfford(s, cost)) return false;
  for (const [k, v] of Object.entries(cost)) s.inventory[k] -= v;
  return true;
}
export function add(s, id, n = 1) {
  s.inventory[id] = (s.inventory[id] || 0) + n;
}
export function craft(s, r) {
  if (!r || !stationAvailable(s,r.station) || !spend(s, r.cost)) return false;
  add(s, r.id, r.count);
  if (r.id === "potion") s.flags.brewed = true;
  advanceQuest(s);
  return true;
}
export function advanceQuest(s) {
  let advanced = false;
  while (s.quest < QUESTS.length - 1 && QUESTS[s.quest].test(s)) {
    s.quest++;
    s.coins += 35;
    advanced = true;
  }
  return advanced;
}
export function tickFarm(s, dt) {
  for (const p of s.plots) {
    if (p.stage < 1 || p.stage >= 4) continue;
    if (s.weather === "pluie") p.water = 1;
    if (p.water > 0) {
      p.growth = (p.growth || 0) + dt * (p.fertilized ? 1.5 : 1);
      p.water = Math.max(0, p.water - dt / 180);
      p.stage = Math.min(4, 1 + Math.floor(p.growth / ((CROPS[p.seed || "seed"]?.seconds || 84) / 3)));
    }
  }
}
export function farmAction(s, p, tool) {
  if (tool === "hoe") {
    if (p.stage === 0) {
      const seed = CROPS[s.selectedSeed] ? s.selectedSeed : "seed";
      if (!spend(s, { [seed]: 1 }))
        return "Vous n’avez plus de graines. Le marché en vend.";
      p.seed = seed;
      p.stage = 1;
      p.growth = 0;
      s.stats.planted++;
      return `${CROPS[seed].name} planté(e). Un peu d’eau pour commencer !`;
    }
    if (p.stage === 4) {
      const crop = CROPS[p.seed || "seed"] || CROPS.seed;
      const item = p.fertilized && crop.item === "crop" ? "quality" : crop.item;
      add(s, item, p.fertilized ? 2 : 1);
      add(s, crop.item, p.fertilized && crop.item === "crop" ? 1 : 0);
      add(s, p.seed || "seed", 1);
      s.stats.harvested++;
      p.stage = 0;
      p.growth = 0;
      p.water = 0;
      p.fertilized = false;
      return `${crop.name} récolté(e) · +1 graine`;
    }
    return "La roselle pousse quand sa terre reste humide.";
  }
  if (tool === "water") {
    if (p.stage === 0) return "Plantez une graine avec l’outil Cultiver.";
    if (p.water < 0.6) s.stats.watered++;
    p.water = 1;
    return "Terre arrosée. Le jardin vous remercie.";
  }
  if (p.stage === 4) return farmAction(s, p, "hoe");
  return p.stage
    ? "Équipez l’arrosoir pour prendre soin de la roselle."
    : "Équipez Cultiver pour planter une roselle.";
}
const strong = {
  nature: "eau",
  eau: "feu",
  feu: "nature",
  terre: "air",
  air: "nature",
  lumiere: "terre",
};
export function effectiveness(a, b) {
  return strong[a] === b ? 1.55 : strong[b] === a ? 0.7 : 1;
}
export function damage(attacker, defender, move, rng = Math.random) {
  if (!move.power) return { amount: 0, crit: false, effect: 1, miss: false };
  if (rng() > (move.accuracy ?? 1))
    return { amount: 0, miss: true, crit: false, effect: 1 };
  const a = species(attacker.id),
    d = species(defender.id),
    effect = effectiveness(move.element, d.element),
    crit = rng() < 0.09;
  let value =
    (((move.power * (a.atk + attacker.level * 2)) /
      (d.def + defender.level * 1.7)) *
      0.45 +
      3) *
    effect *
    (crit ? 1.5 : 1) *
    (0.9 + rng() * 0.2);
  if (defender.guard) value *= 0.45;
  return { amount: Math.max(1, Math.round(value)), effect, crit, miss: false };
}
export function captureChance(target) {
  return Math.min(
    0.92,
    Math.max(
      0.08,
      0.19 +
        (1 - target.hp / target.maxHp) * 0.64 +
        (target.status ? 0.16 : 0) -
        (species(target.id).rarity - 1) * 0.065,
    ),
  );
}
export function gainXp(c, amount) {
  c.xp += amount;
  let levels = 0;
  while (c.xp >= c.level * 20) {
    c.xp -= c.level * 20;
    c.level++;
    c.maxHp += 4;
    c.hp = c.maxHp;
    levels++;
  }
  return levels;
}
export function canPlace(s, x, z, collides, type='lamp', rotation=0, ignore=-1) {
 const location=s.location||'world', y=s.player.y||0, [w,d]=footprint(type,rotation);
 if(!Number.isFinite(x)||!Number.isFinite(z)) return false;
 // The indoor limits are the visible inner faces of the plaster walls: furniture may touch them exactly.
 if(location==='world' ? !(x-w/2>-44 && x+w/2<-15 && z-d/2>19 && z+d/2<42) : !(Math.abs(x)+w/2<=8.8750001 && Math.abs(z)+d/2<=7.8750001)) return false;
 // Keep the front door and the entire stair route clear, on both storeys.
 if(location!=='world' && ((Math.abs(x)<2 && z+d/2>5) || (x+w/2>5 && z-d/2<4))) return false;
 // Indoors the footprint itself already represents the object edge, so adding a probe radius would recreate a visible gap.
 const probeRadius=location==='world'?.12:0;
 for(const dx of [-w/2,0,w/2]) for(const dz of [-d/2,0,d/2]) if(collides(x+dx,z+dz,probeRadius)) return false;
 if(s.buildings.some((b,i)=>{
  if(i===ignore || spaceOf(b)!==location || Math.abs((b.y||0)-y)>1) return false;
  const [bw,bd]=footprint(b.type,b.r);
  if(type==='fence' && b.type==='fence') {
   // Fences may share an endpoint, including 90° corners, but may not occupy the same run.
   const ends=(cx,cz,r)=>{const hx=Math.cos(r)*.95,hz=-Math.sin(r)*.95;return [[cx+hx,cz+hz],[cx-hx,cz-hz]];};
   const touching=ends(x,z,rotation).some(a=>ends(b.x,b.z,b.r||0).some(c=>Math.hypot(a[0]-c[0],a[1]-c[1])<.025));
   // Endpoint sharing is only a connection when the two sections have distinct centres.
   if(touching && Math.hypot(b.x-x,b.z-z)>.9) return false;
   return Math.abs(b.x-x)<(w+bw)/2-.005 && Math.abs(b.z-z)<(d+bd)/2-.005;
  }
  return Math.abs(b.x-x)<(w+bw)/2+.15 && Math.abs(b.z-z)<(d+bd)/2+.15;
 })) return false;
 return location!=='world' || !s.plots.some(p=>Math.abs(p.x-x)<w/2+1.15 && Math.abs(p.z-z)<d/2+1.15);
}

import { species, QUESTS } from "./data.js";
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
    settings: { quality: "high", pixel: true, sound: true, touch: false },
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
    inventory: { ...base.inventory, ...raw.inventory },
    stats: { ...base.stats, ...raw.stats },
    settings: { ...base.settings, ...raw.settings },
    team: raw.team.map((c) => ({ ...makeCreature(c.id, c.level), ...c })),
    flags: { ...raw.flags },
    discovered: raw.discovered || ["city"],
  };
}
export function load(storage = localStorage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    return raw ? normalizeSave(JSON.parse(raw)) : null;
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
  if (!spend(s, r.cost)) return false;
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
      p.stage = Math.min(4, 1 + Math.floor(p.growth / 28));
    }
  }
}
export function farmAction(s, p, tool) {
  if (tool === "hoe") {
    if (p.stage === 0) {
      if (!spend(s, { seed: 1 }))
        return "Vous n’avez plus de graines. Le marché en vend.";
      p.stage = 1;
      p.growth = 0;
      s.stats.planted++;
      return "Roselle plantée. Un peu d’eau pour commencer !";
    }
    if (p.stage === 4) {
      const item = p.fertilized ? "quality" : "crop";
      add(s, item, p.fertilized ? 2 : 1);
      add(s, "crop", p.fertilized ? 1 : 0);
      add(s, "seed", 1);
      s.stats.harvested++;
      p.stage = 0;
      p.growth = 0;
      p.fertilized = false;
      return "Roselle récoltée · +1 graine";
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
export function canPlace(s, x, z, collides) {
  return (
    x > -44 &&
    x < -15 &&
    z > 19 &&
    z < 43 &&
    !collides(x, z, 0.65) &&
    !s.buildings.some((b) => Math.hypot(b.x - x, b.z - z) < 1.5) &&
    !s.plots.some((p) => Math.abs(p.x - x) < 1.4 && Math.abs(p.z - z) < 1.4)
  );
}

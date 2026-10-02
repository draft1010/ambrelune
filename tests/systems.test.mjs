import test from "node:test";
import assert from "node:assert/strict";
import {
  newState,
  makeCreature,
  normalizeSave,
  save,
  load,
  craft,
  spend,
  damage,
  captureChance,
  tickFarm,
  farmAction,
  canPlace,
  advanceQuest,
} from "../src/systems/state.js";
import { MOVES, RECIPES } from "../src/systems/data.js";
import { findPath } from "../src/systems/navigation.js";
import { stepNpc } from "../src/systems/npc-motion.js";

test("NPCs travel, pause near the player, and never walk into obstacles", () => {
  const npc = {
    x: 0,
    z: 0,
    phase: 0,
    route: [
      { x: 0, z: 0 },
      { x: 7, z: 0 },
    ],
  };
  const blocked = (x, z) => x > 2 && x < 4 && Math.abs(z) < 1.5;
  let travel = 0;
  for (let i = 0; i < 450; i++) {
    const old = { x: npc.x, z: npc.z };
    const motion = stepNpc(npc, 1 / 60, { x: 50, z: 50 }, blocked);
    const delta = Math.hypot(npc.x - old.x, npc.z - old.z);
    assert.equal(motion.moving, delta > 0.0001);
    assert.ok(!blocked(npc.x, npc.z));
    travel += delta;
  }
  assert.ok(travel > 6, "visible travel over several metres");
  const old = { x: npc.x, z: npc.z };
  assert.equal(
    stepNpc(npc, 1, { x: npc.x + 1, z: npc.z }, blocked).moving,
    false,
  );
  assert.equal(npc.x, old.x);
  assert.equal(npc.z, old.z);
});
test("navigation goes around walls without cutting diagonal corners", () => {
  const blocked = (x, z) => x === 2 && z >= -2 && z <= 2;
  const path = findPath({ x: 0, z: 0 }, { x: 4, z: 0 }, blocked);
  assert.ok(path.length > 4);
  assert.deepEqual(path.at(-1), { x: 4, z: 0 });
  assert.ok(path.every((p) => !blocked(p.x, p.z)));
  assert.deepEqual(findPath({ x: 0, z: 0 }, { x: 2, z: 0 }, blocked), []);
});
test("save roundtrip preserves buildings, crops and captured creatures", () => {
  const store = new Map(),
    storage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, v),
    };
  const s = newState();
  s.buildings.push({ type: "lamp", x: -25, z: 35, r: 0 });
  s.team.push(makeCreature("ondril", 5));
  s.plots.push({ stage: 2, water: 1, growth: 34 });
  save(s, storage);
  assert.deepEqual(load(storage).team, s.team);
  assert.deepEqual(load(storage).buildings, s.buildings);
  s.day++;
  save(s, storage);
  assert.ok(store.has("ambrelune.save.v1.backup"));
});
test("invalid and future saves are rejected without mutation", () => {
  assert.throws(() => normalizeSave({ version: 999 }));
  assert.throws(() =>
    normalizeSave({ version: 1, team: [], player: { x: 1, z: 1 } }),
  );
});
test("crafting debits exact materials and rejects insufficient resources atomically", () => {
  const s = newState();
  const r = RECIPES.find((r) => r.id === "lamp");
  assert.equal(craft(s, r), false);
  assert.equal(s.inventory.wood, 0);
  s.inventory.wood = 4;
  s.inventory.crystal = 1;
  assert.equal(craft(s, r), true);
  assert.equal(s.inventory.wood, 1);
  assert.equal(s.inventory.crystal, 0);
  assert.equal(s.inventory.lamp, 1);
});
test("seed to harvest requires water, yields produce and returns seed", () => {
  const s = newState(),
    p = { stage: 0, water: 0, growth: 0 };
  s.plots = [p];
  farmAction(s, p, "hoe");
  assert.equal(p.stage, 1);
  tickFarm(s, 40);
  assert.equal(p.stage, 1);
  farmAction(s, p, "water");
  tickFarm(s, 85);
  assert.equal(p.stage, 4);
  farmAction(s, p, "hoe");
  assert.equal(s.inventory.crop, 1);
  assert.equal(p.stage, 0);
  assert.equal(s.inventory.seed, 12);
});
test("rain waters crops and supports growth", () => {
  const s = newState();
  s.weather = "pluie";
  s.plots = [{ stage: 1, water: 0, growth: 0 }];
  tickFarm(s, 30);
  assert.equal(s.plots[0].stage, 2);
  assert.ok(s.plots[0].water > 0);
});
test("elemental advantages and guard affect actual damage", () => {
  const a = makeCreature("ondril"),
    b = makeCreature("brasile");
  const hit = damage(a, b, MOVES.onde, () => 0.5);
  b.guard = true;
  const guarded = damage(a, b, MOVES.onde, () => 0.5);
  assert.ok(hit.effect > 1);
  assert.ok(guarded.amount < hit.amount);
  assert.equal(damage(a, b, MOVES.onde, () => 0.999).miss, true);
});
test("capture improves with low health and status", () => {
  const c = makeCreature("moussier");
  const initial = captureChance(c);
  c.hp = 4;
  assert.ok(captureChance(c) > initial);
  const weak = captureChance(c);
  c.status = "somnolent";
  assert.ok(captureChance(c) > weak);
});
test("building only allowed inside property away from crops and solids", () => {
  const s = newState();
  s.plots = [{ x: -25, z: 29 }];
  assert.equal(
    canPlace(s, -25, 29, () => false),
    false,
  );
  assert.equal(
    canPlace(s, 20, 30, () => false),
    false,
  );
  assert.equal(
    canPlace(s, -20, 36, () => true),
    false,
  );
  assert.equal(
    canPlace(s, -20, 36, () => false),
    true,
  );
});
test("quest progression requires real farming and capture state", () => {
  const s = newState();
  assert.equal(advanceQuest(s), false);
  s.flags.metMaelle = true;
  advanceQuest(s);
  assert.equal(s.quest, 1);
  s.stats.planted = 3;
  s.stats.watered = 3;
  advanceQuest(s);
  assert.equal(s.quest, 2);
});

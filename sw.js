const CACHE = "ambrelune-v29-mobile-storage-fit";
const FILES = [
  "./src/systems/encounters.js",
  "./src/rendering/fountain.js",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./src/main.js",
  "./src/systems/homestead.js",
  "./src/rendering/interior.js",
  "./src/rendering/occlusion.js",
  "./src/rendering/fishing.js",
  "./src/rendering/art.js",
  "./src/rendering/character-assets.js",
  "./src/rendering/battle-stage.js",
  "./src/rendering/creature-preview.js",
  "./src/rendering/monster-models.js",
  "./src/rendering/icons.js",
  "./src/rendering/journal-ui.js",
  "./src/world/world.js",
  "./src/world/terrain.js",
  "./src/systems/data.js",
  "./src/systems/state.js",
  "./src/systems/audio.js",
  "./src/systems/input.js",
  "./src/systems/navigation.js",
  "./src/systems/npc-motion.js",
  "./src/rendering/village.js",
  "./vendor/three.module.js",
  "./vendor/three.core.js",
  "./assets/monsters/velune.gltf",
  "./assets/monsters/ondril.gltf",
  "./assets/monsters/brasile.gltf",
  "./assets/monsters/moussier.gltf",
  "./assets/monsters/vrille.gltf",
  "./assets/monsters/lumignon.gltf",
  "./assets/monsters/coralys.gltf",
  "./assets/monsters/gardien.gltf",
  "./assets/monsters/alizelle.gltf",
  "./assets/monsters/aurelievre.gltf",
  "./assets/monsters/dracendre.gltf",
  "./assets/monsters/galetis.gltf",
  "./assets/monsters/germousse.gltf",
  "./assets/monsters/melipom.gltf",
  "./assets/monsters/nivours.gltf",
  "./assets/monsters/rainette.gltf",
  "./assets/characters/base/Superhero_Female_FullBody.gltf",
  "./assets/characters/base/Superhero_Male_FullBody.gltf",
  "./assets/characters/hair/Hair_Beard.gltf",
  "./assets/characters/hair/Hair_Buns.gltf",
  "./assets/characters/hair/Hair_Buzzed.gltf",
  "./assets/characters/hair/Hair_BuzzedFemale.gltf",
  "./assets/characters/hair/Hair_Long.gltf",
  "./assets/characters/hair/Hair_SimpleParted.gltf",
  "./assets/characters/outfits/Female_Peasant.gltf",
  "./assets/characters/outfits/Female_Peasant_Alt.gltf",
  "./assets/characters/outfits/Female_Ranger.gltf",
  "./assets/characters/outfits/Female_Ranger_Alt.gltf",
  "./assets/characters/outfits/Male_Peasant.gltf",
  "./assets/characters/outfits/Male_Peasant_Alt.gltf",
  "./assets/characters/outfits/Male_Ranger.gltf",
  "./assets/characters/outfits/Male_Ranger_Player.gltf",
  "./assets/characters/base/Superhero_Female_FullBody.bin",
  "./assets/characters/base/Superhero_Male_FullBody.bin",
  "./assets/characters/hair/Hair_Beard.bin",
  "./assets/characters/hair/Hair_Buns.bin",
  "./assets/characters/hair/Hair_Buzzed.bin",
  "./assets/characters/hair/Hair_BuzzedFemale.bin",
  "./assets/characters/hair/Hair_Long.bin",
  "./assets/characters/hair/Hair_SimpleParted.bin",
  "./assets/characters/outfits/Female_Peasant.bin",
  "./assets/characters/outfits/Female_Ranger.bin",
  "./assets/characters/outfits/Male_Peasant.bin",
  "./assets/characters/outfits/Male_Ranger.bin",
  "./assets/characters/base/T_Eye_Brown.png",
  "./assets/characters/base/T_Eye_Normal_png.png",
  "./assets/characters/base/T_Hair_1_BaseColor.png",
  "./assets/characters/base/T_Hair_1_Normal_png.png",
  "./assets/characters/base/T_Hair_2_BaseColor.png",
  "./assets/characters/base/T_Hair_2_Normal.png",
  "./assets/characters/base/T_Superhero_Female_Dark_BaseColor.png",
  "./assets/characters/base/T_Superhero_Female_Normal.png",
  "./assets/characters/base/T_Superhero_Female_Roughness.png",
  "./assets/characters/base/T_Superhero_Male_Dark.png",
  "./assets/characters/base/T_Superhero_Male_Normal.png",
  "./assets/characters/base/T_Superhero_Male_Roughness.png",
  "./assets/characters/hair/T_Hair_1_BaseColor.png",
  "./assets/characters/hair/T_Hair_1_Normal.png",
  "./assets/characters/hair/T_Hair_2_BaseColor.png",
  "./assets/characters/hair/T_Hair_2_Normal.png",
  "./assets/characters/outfits/T_Peasant_2_BaseColor.png",
  "./assets/characters/outfits/T_Peasant_BaseColor.png",
  "./assets/characters/outfits/T_Peasant_Normal.png",
  "./assets/characters/outfits/T_Peasant_ORM.png",
  "./assets/characters/outfits/T_Ranger_3_BaseColor.png",
  "./assets/characters/outfits/T_Ranger_BaseColor.png",
  "./assets/characters/outfits/T_Ranger_Normal.png",
  "./assets/characters/outfits/T_Ranger_ORM.png",
  "./assets/characters/outfits/T_Regular_Female_Dark_BaseColor.png",
  "./assets/characters/outfits/T_Regular_Female_Normal.png",
  "./assets/characters/outfits/T_Regular_Female_Roughness.png",
  "./assets/characters/outfits/T_Regular_Male_Dark_BaseColor.png",
  "./assets/characters/outfits/T_Regular_Male_Normal.png",
  "./assets/characters/outfits/T_Regular_Male_Roughness.png",
  "./assets/characters/animations/UAL1_Standard.glb",
  "./assets/characters/animations/UAL2_Standard.glb",
  "./assets/terrain/grass_albedo.png",
  "./assets/terrain/grass_detail.png",
  "./assets/terrain/grass_normal.png",
  "./assets/terrain/moss_albedo.png",
  "./assets/terrain/moss_detail.png",
  "./assets/terrain/moss_normal.png",
  "./assets/terrain/soil_albedo.png",
  "./assets/terrain/soil_detail.png",
  "./assets/terrain/soil_normal.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(FILES))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("ambrelune-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;

  event.respondWith(
    fetch(event.request, { cache: "no-cache" })
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});

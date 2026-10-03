const CACHE = "ambrelune-v7.1-clean-hud-quest-hidden";
const FILES = [
  "./",
  "./index.html",
  "./style.css",
  "./manifest.webmanifest",
  "./assets/icon.svg",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./src/main.js",
  "./src/rendering/art.js",
  "./src/rendering/battle-stage.js",
  "./src/rendering/creature-preview.js",
  "./src/rendering/monster-models.js",
  "./src/rendering/icons.js",
  "./src/rendering/journal-ui.js",
  "./src/world/world.js",
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
    fetch(event.request)
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

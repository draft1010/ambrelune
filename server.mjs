import http from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL(".", import.meta.url));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".md": "text/plain; charset=utf-8",
};
http
  .createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (p === "/") p = "/index.html";
      const f = path.resolve(root, "." + p);
      if (!f.startsWith(root)) {
        res.writeHead(403).end();
        return;
      }
      const data = await readFile(f);
      res.writeHead(200, {
        "Content-Type": mime[path.extname(f)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(data);
    } catch {
      res.writeHead(404).end("Introuvable");
    }
  })
  .listen(Number(process.env.PORT) || 4173, "127.0.0.1", () =>
    console.log("Ambrelune : http://localhost:4173"),
  );

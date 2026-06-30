// /src/server.js
import { join } from "path";
import { config, MIME } from "./config.js";
import { handleApi } from "./api/index.js";
import { wsHandler } from "./ws/index.js";
import { seedFromConfig } from "./db/seed.js";
import logger from "./logger.js";

const log = logger.child({ module: "server" });

await seedFromConfig().catch((e) => log.error({ err: e }, "seed failed"));

function serveStatic(url) {
  const path = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = Bun.file(join(config.publicDir, path));
  return file.exists().then((ok) => {
    if (!ok) return new Response("Not Found", { status: 404 });
    const ext = path.slice(path.lastIndexOf("."));
    return new Response(file, {
      headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
    });
  });
}

Bun.serve({
  port: config.port,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return;
      return new Response("Upgrade failed", { status: 400 });
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(req, url);
    }

    return serveStatic(url);
  },
  websocket: wsHandler,
});

log.info(
  {
    port: config.port,
    mode: config.isProd ? "production" : "development",
    ws: `ws://localhost:${config.port}/ws`,
    api: `http://localhost:${config.port}/api/{bots,accounts,access,dashboard}`,
  },
  "BOIAuto server running"
);

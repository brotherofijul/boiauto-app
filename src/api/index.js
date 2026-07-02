// /src/api/index.js
import { json, error } from "../utils/response.js";
import logger from "../logger.js";
import { botsRouter } from "./bots.js";
import { accessRouter } from "./access.js";
import { automatesRouter } from "./automates.js";
import { dashboardRouter } from "./dashboard.js";

const log = logger.child({ module: "api" });

const routes = {
  bots: botsRouter,
  access: accessRouter,
  automates: automatesRouter,
  dashboard: dashboardRouter,
};

const RATE_WINDOW_MS = 10_000;
const RATE_MAX_REQUESTS = 100;
const ipHits = new Map();

function rateLimit(req) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const hits = ipHits.get(ip) || [];
  const recent = hits.filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  ipHits.set(ip, recent);
  if (recent.length > RATE_MAX_REQUESTS) {
    log.warn({ ip, count: recent.length, window: RATE_WINDOW_MS }, "rate limit threshold exceeded");
    return false;
  }
  if (ipHits.size > 10_000) {
    for (const [k, v] of ipHits) {
      if (v.length === 0 || now - v[v.length - 1] > RATE_WINDOW_MS) ipHits.delete(k);
    }
  }
  return true;
}

export async function handleApi(req, url) {
  const path = url.pathname.replace("/api/", "");
  const [resource, idStr] = path.split("/");
  const handler = routes[resource];

  if (!handler) {
    return error("Not found", 404);
  }

  if (!rateLimit(req)) {
    return error("Too many requests", 429);
  }

  const apiLog = log.child({ resource, method: req.method, id: idStr });
  try {
    return await handler(req, url, idStr, apiLog);
  } catch (e) {
    apiLog.error({ err: e.message }, "api error");
    return error("Internal server error", 500);
  }
}

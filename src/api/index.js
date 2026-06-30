// /src/api/index.js
import { json, error } from "../utils/response.js";
import logger from "../logger.js";
import { botsRouter } from "./bots.js";
import { accessRouter } from "./access.js";
import { accountsRouter } from "./accounts.js";
import { dashboardRouter } from "./dashboard.js";

const log = logger.child({ module: "api" });

const routes = {
  bots: botsRouter,
  access: accessRouter,
  accounts: accountsRouter,
  dashboard: dashboardRouter,
};

export async function handleApi(req, url) {
  const path = url.pathname.replace("/api/", "");
  const [resource, idStr] = path.split("/");
  const handler = routes[resource];

  if (!handler) {
    return error("Not found", 404);
  }

  const apiLog = log.child({ resource, method: req.method, id: idStr });
  try {
    return await handler(req, url, idStr, apiLog);
  } catch (e) {
    apiLog.error({ err: e.message }, "api error");
    return error("Internal server error", 500);
  }
}

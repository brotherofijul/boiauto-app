// /src/api/bots.js
import { json, error, readJson } from "../utils/response.js";
import { botsQueries } from "../db/queries/index.js";
import { genBotId, genToken } from "../utils/crypto.js";
import { BOT_TYPES } from "../config.js";
import { broadcastBotUpdate } from "../ws/index.js";
import { sanitizeName, sanitizeToken } from "../utils/validate.js";

export async function botsRouter(req, url, idStr, log) {
  if (idStr === "generate-token" && req.method === "POST") {
    const token = genToken();
    log.info({ token: token.slice(0, 12) + "..." }, "generated token");
    return json({ token });
  }

  if (idStr === "verify-token" && req.method === "POST") {
    const body = await readJson(req);
    if (!body?.token) return error("Token is required");
    const token = sanitizeToken(body.token);
    if (!token) return error("Invalid token format");
    const bot = botsQueries.getByToken(token);
    if (!bot) return error("Bot token not found", 404);
    log.info({ botId: bot.bot_id }, "bot token verified");
    return json(bot);
  }

  if (req.method === "GET") {
    const bots = botsQueries.list();
    log.debug({ count: bots.length }, "list bots");
    return json(bots);
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    if (!body?.token) return error("Token is required");
    const token = sanitizeToken(body.token);
    if (!token) return error("Invalid token format");
    const type = BOT_TYPES.includes(body.type) ? body.type : "Dual";
    const botId = genBotId();
    const name = sanitizeName(body.name) || botId;
    botsQueries.insert(botId, name, token, type);
    const bot = botsQueries.getByBotId(botId);
    broadcastBotUpdate(botId, bot);
    log.info({ botId, name, type }, "bot created");
    return json(bot, 201);
  }

  if (req.method === "PATCH" && idStr) {
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return error("Invalid id", 400);
    const body = await readJson(req);
    const bot = botsQueries.getById(id);
    if (!bot) return error("Bot not found", 404);
    const fields = {};
    if (body.name != null) {
      if (typeof body.name !== "string") return error("Invalid name");
      fields.name = sanitizeName(body.name) || null;
    }
    if (body.token != null) {
      const token = sanitizeToken(body.token);
      if (!token) return error("Invalid token format");
      fields.token = token;
    }
    if (body.type != null) fields.type = BOT_TYPES.includes(body.type) ? body.type : "Dual";
    botsQueries.update(id, fields);
    const updated = botsQueries.getById(id);
    broadcastBotUpdate(updated.bot_id, updated);
    log.info({ botId: updated.bot_id, fields: Object.keys(fields) }, "bot updated");
    return json(updated);
  }

  if (req.method === "DELETE" && idStr) {
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return error("Invalid id", 400);
    const bot = botsQueries.getById(id);
    botsQueries.remove(id);
    if (bot) broadcastBotUpdate(bot.bot_id, { deleted: true });
    log.info({ id }, "bot deleted");
    return json({ ok: true });
  }

  return error("Not found", 404);
}

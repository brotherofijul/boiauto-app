// /src/api/access.js
import { json, error, readJson } from "../utils/response.js";
import { accessQueries, botsQueries } from "../db/queries/index.js";
import { genAccessToken, genAccessId } from "../utils/crypto.js";
import { ACCESS_TYPES } from "../config.js";
import { sanitizeName, sanitizeToken, sanitizeBotId, isValidPrice } from "../utils/validate.js";

export async function accessRouter(req, url, idStr, log) {
  if (idStr === "verify-token" && req.method === "POST") {
    const body = await readJson(req);
    if (!body?.token) return error("Token is required");
    const token = sanitizeToken(body.token);
    if (!token) return error("Invalid token format");
    const access = accessQueries.getByToken(token);
    if (!access) return error("Access token not found", 404);
    const bot = botsQueries.getByBotId(access.bot_id);
    const result = {
      ...access,
      bot_name: bot?.name || "",
      bot_type: bot?.type || "",
      usage_count: accessQueries.countAccountsByAccess(access.access_id),
    };
    log.info({ accessId: access.access_id }, "access token verified");
    return json(result);
  }

  if (req.method === "GET") {
    return json(accessQueries.list());
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const botId = sanitizeBotId(body?.bot_id);
    if (!botId) return error("bot_id is required");
    const bot = botsQueries.getByBotId(botId);
    if (!bot) return error("Bot not found", 404);

    if (bot.type === "Dual") {
      const count = botsQueries.countAccessTokens(botId);
      if (count >= 2) {
        return error(`Bot ${bot.name} (Dual) allows max 2 access tokens`);
      }
    }

    const type = ACCESS_TYPES.includes(body.type) ? body.type : "Private";
    if (type === "Business" && !isValidPrice(body.price_per_day)) {
      return error("Business type requires price_per_day");
    }

    const name = sanitizeName(body.name);
    const token = genAccessToken();
    const accessId = genAccessId();
    const price = type === "Business" ? Number(body.price_per_day) || 0 : 0;
    accessQueries.insert(accessId, token, botId, name, type, price);
    const access = accessQueries.getByToken(token);
    log.info({ accessId, botId, type }, "access token created");
    return json(access, 201);
  }

  if (req.method === "PATCH" && idStr) {
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return error("Invalid id", 400);
    const body = await readJson(req);
    const fields = {};
    if (body.name != null) {
      if (typeof body.name !== "string") return error("Invalid name");
      fields.name = sanitizeName(body.name) || null;
    }
    accessQueries.update(id, fields);
    const updated = accessQueries.getById(id);
    if (!updated) return error("Access not found", 404);
    log.info({ id, fields: Object.keys(fields) }, "access updated");
    return json(updated);
  }

  if (req.method === "DELETE" && idStr) {
    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) return error("Invalid id", 400);
    accessQueries.remove(id);
    log.info({ id }, "access token deleted");
    return json({ ok: true });
  }

  return error("Not found", 404);
}

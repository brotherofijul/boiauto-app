// /src/api/access.js
import { json, error, readJson } from "../utils/response.js";
import { accessQueries, botsQueries } from "../db/queries/index.js";
import { genAccessToken, genAccessId } from "../utils/crypto.js";
import { ACCESS_TYPES } from "../config.js";

export async function accessRouter(req, url, idStr, log) {
  // Verify existing access token (login with token)
  if (idStr === "verify-token" && req.method === "POST") {
    const body = await readJson(req);
    if (!body?.token) return error("Token is required");
    const access = accessQueries.getByToken(body.token.trim());
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
    if (!body?.bot_id) return error("bot_id is required");
    const bot = botsQueries.getByBotId(body.bot_id);
    if (!bot) return error("Bot not found", 404);

    if (bot.type === "Dual") {
      const count = botsQueries.countAccessTokens(body.bot_id);
      if (count >= 2) {
        return error(`Bot ${bot.name} (Dual) allows max 2 access tokens`);
      }
    }

    const type = ACCESS_TYPES.includes(body.type) ? body.type : "Private";
    if (type === "Business" && (!body.price_per_day || body.price_per_day <= 0)) {
      return error("Business type requires price_per_day");
    }

    const token = genAccessToken();
    const accessId = genAccessId();
    const price = type === "Business" ? Number(body.price_per_day) || 0 : 0;
    accessQueries.insert(accessId, token, body.bot_id, body.name, type, price);
    const access = accessQueries.getByToken(token);
    log.info({ accessId, botId: body.bot_id, type }, "access token created");
    return json(access, 201);
  }

  if (req.method === "DELETE" && idStr) {
    const id = Number(idStr);
    accessQueries.remove(id);
    log.info({ id }, "access token deleted");
    return json({ ok: true });
  }

  return error("Not found", 404);
}

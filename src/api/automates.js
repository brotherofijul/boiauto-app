// /src/api/automates.js
import { json, error, readJson } from "../utils/response.js";
import { automatesQueries, accessQueries, botsQueries } from "../db/queries/index.js";
import { broadcastAutomateUpdate } from "../ws/index.js";

export async function automatesRouter(req, url, idStr, log) {
  if (req.method === "GET") {
    return json(automatesQueries.list());
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    if (!body?.bearer) return error("Bearer is required");
    if (!body?.access_id) return error("access_id is required");

    const access = accessQueries.getByAccessId(body.access_id);
    if (!access) return error("Access not found", 404);

    const usage = accessQueries.countAccountsByAccess(access.access_id);
    if (access.type !== "Shared" && usage >= 1) {
      return error(`${access.type} access allows max 1 automate`);
    }

    const bot = botsQueries.getByBotId(access.bot_id);
    automatesQueries.insert({
      name: body.name || `Account-${Date.now().toString(36).slice(-4)}`,
      bearer: body.bearer,
      bot_id: access.bot_id,
      access_id: access.access_id,
      type: access.type,
    });
    const list = automatesQueries.list();
    const acc = list[0];
    broadcastAutomateUpdate(acc.id, acc);
    log.info({ accountId: acc.id, name: acc.name, accessId: access.access_id }, "account created");
    return json(acc, 201);
  }

  if (req.method === "PATCH" && idStr) {
    const id = Number(idStr);
    const body = await readJson(req);
    const acc = automatesQueries.getById(id);
    if (!acc) return error("Account not found", 404);
    const allowed = [
      "name", "bearer", "skill_up_running", "auto_war_running",
      "auto_work_running", "current_level", "target_level",
      "pending_at", "balance", "diamond", "status", "skill", "pay",
    ];
    const fields = {};
    for (const k of allowed) if (k in body) fields[k] = body[k];
    if (body.access_id) {
      const access = accessQueries.getByAccessId(body.access_id);
      if (!access) return error("Access not found", 404);
      fields.bot_id = access.bot_id;
      fields.access_id = access.access_id;
      fields.type = access.type;
    }
    automatesQueries.update(id, fields);
    const updated = automatesQueries.getById(id);
    broadcastAutomateUpdate(id, updated);
    log.info({ accountId: id, fields: Object.keys(fields) }, "account updated");
    return json(updated);
  }

  if (req.method === "DELETE" && idStr) {
    const id = Number(idStr);
    automatesQueries.remove(id);
    log.info({ accountId: id }, "account deleted");
    return json({ ok: true });
  }

  return error("Not found", 404);
}

// /src/api/automates.js
import { json, error, readJson } from "../utils/response.js";
import { automatesQueries, accessQueries } from "../db/queries/index.js";
import { broadcastAutomateUpdate } from "../ws/index.js";
import { sanitizeBearer, sanitizeAccessId, sanitizeName } from "../utils/validate.js";

const AUTOMATE_ALLOWED_FIELDS = [
  "name", "bearer", "skill_up_running", "auto_war_running",
  "auto_work_running", "current_level", "target_level",
  "pending_at", "balance", "diamond", "status", "skill", "pay",
];

const NUMERIC_FIELDS = new Set([
  "skill_up_running", "auto_war_running", "auto_work_running",
  "current_level", "target_level", "pending_at",
  "balance", "diamond", "skill", "pay",
]);

const STRING_FIELDS = new Set(["name", "bearer", "status"]);

export async function automatesRouter(req, url, idStr, log) {
  if (req.method === "GET") {
    return json(automatesQueries.list());
  }

  if (req.method === "POST") {
    const body = await readJson(req);
    const bearer = sanitizeBearer(body?.bearer);
    if (!bearer) return error("Bearer is required");
    const accessId = sanitizeAccessId(body?.access_id);
    if (!accessId) return error("access_id is required");

    const access = accessQueries.getByAccessId(accessId);
    if (!access) return error("Access not found", 404);

    const usage = accessQueries.countAccountsByAccess(access.access_id);
    if (access.type !== "Shared" && usage >= 1) {
      return error(`${access.type} access allows max 1 automate`);
    }

    const name = sanitizeName(body.name) || `Account-${Date.now().toString(36).slice(-4)}`;
    automatesQueries.insert({
      name,
      bearer,
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
    if (!Number.isInteger(id) || id <= 0) return error("Invalid id", 400);
    const body = await readJson(req);
    const acc = automatesQueries.getById(id);
    if (!acc) return error("Account not found", 404);
    const fields = {};
    for (const k of AUTOMATE_ALLOWED_FIELDS) {
      if (!(k in body)) continue;
      const v = body[k];
      if (NUMERIC_FIELDS.has(k)) {
        if (typeof v !== "number" || !Number.isFinite(v)) {
          if (k === "balance" || k === "diamond" || k === "pending_at") {
            return error(`${k} must be a number`);
          }
          return error(`${k} must be a number`);
        }
        if (k === "skill_up_running" || k === "auto_war_running" || k === "auto_work_running") {
          fields[k] = v ? 1 : 0;
        } else {
          fields[k] = v;
        }
      } else if (STRING_FIELDS.has(k)) {
        if (typeof v !== "string") return error(`${k} must be a string`);
        if (k === "bearer") {
          const bearer = sanitizeBearer(v);
          if (!bearer) return error("Invalid bearer");
          fields.bearer = bearer;
        } else if (k === "name") {
          fields.name = sanitizeName(v) || null;
        } else {
          fields[k] = v.slice(0, 32);
        }
      }
    }
    if (body.access_id != null) {
      const accessId = sanitizeAccessId(body.access_id);
      if (!accessId) return error("Invalid access_id");
      const access = accessQueries.getByAccessId(accessId);
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
    if (!Number.isInteger(id) || id <= 0) return error("Invalid id", 400);
    automatesQueries.remove(id);
    log.info({ accountId: id }, "account deleted");
    return json({ ok: true });
  }

  return error("Not found", 404);
}

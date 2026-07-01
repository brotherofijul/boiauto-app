// src/db/queries/bots.js
import db from "../index.js";
import { updateFields } from "./helpers.js";

export const botsQueries = {
  list: () => db.query("SELECT * FROM bots ORDER BY created_at DESC").all(),
  getByBotId: (botId) => db.query("SELECT * FROM bots WHERE bot_id = ?").get(botId),
  getByToken: (token) => db.query("SELECT * FROM bots WHERE token = ?").get(token),
  getById: (id) => db.query("SELECT * FROM bots WHERE id = ?").get(id),
  insert: (botId, name, token, type) =>
    db.prepare("INSERT INTO bots (bot_id, name, token, type, status) VALUES (?, ?, ?, ?, 'connecting')")
      .run(botId, name, token, type),
  update: (id, fields) => updateFields("bots", id, fields, ["name", "token", "type"]),
  remove: (id) => db.prepare("DELETE FROM bots WHERE id = ?").run(id),
  setStatus: (botId, status) =>
    db.prepare("UPDATE bots SET status = ? WHERE bot_id = ?").run(status, botId),
  countAccessTokens: (botId) =>
    db.query("SELECT COUNT(*) as c FROM access_tokens WHERE bot_id = ?").get(botId).c,
};
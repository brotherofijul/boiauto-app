// /src/db/queries/access.js
import db from "../index.js";

export const accessQueries = {
  list: () => db.query(`
    SELECT a.*, b.name as bot_name, b.type as bot_type,
           (SELECT COUNT(*) FROM accounts acc WHERE acc.access_id = a.access_id) as usage_count
    FROM access_tokens a
    LEFT JOIN bots b ON a.bot_id = b.bot_id
    ORDER BY a.created_at DESC
  `).all(),
  getByAccessId: (accessId) => db.query("SELECT * FROM access_tokens WHERE access_id = ?").get(accessId),
  getByToken: (token) => db.query("SELECT * FROM access_tokens WHERE token = ?").get(token),
  insert: (accessId, token, botId, name, type, pricePerDay) =>
    db.prepare("INSERT INTO access_tokens (access_id, token, bot_id, name, type, price_per_day) VALUES (?, ?, ?, ?, ?, ?)")
      .run(accessId, token, botId, name || null, type || "Private", pricePerDay || 0),
  remove: (id) => db.prepare("DELETE FROM access_tokens WHERE id = ?").run(id),
  countByBot: (botId) =>
    db.query("SELECT COUNT(*) as c FROM access_tokens WHERE bot_id = ?").get(botId).c,
  countAccountsByAccess: (accessId) =>
    db.query("SELECT COUNT(*) as c FROM accounts WHERE access_id = ?").get(accessId).c,
};

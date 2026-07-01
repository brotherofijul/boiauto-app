// src/db/queries/automates.js
import db from "../index.js";
import { updateFields } from "./helpers.js";

const SELECT_WITH_JOINS = `
  SELECT a.*, b.name as bot_name, b.type as bot_type, b.status as bot_status_raw,
         ac.name as access_name, ac.type as access_type, ac.price_per_day as access_price
  FROM automates a
  LEFT JOIN bots b ON a.bot_id = b.bot_id
  LEFT JOIN access_tokens ac ON a.access_id = ac.access_id
`;

export const automatesQueries = {
  list: () => db.query(`${SELECT_WITH_JOINS} ORDER BY a.created_at DESC`).all(),
  getById: (id) => db.query(`${SELECT_WITH_JOINS} WHERE a.id = ?`).get(id),
  insert: ({ name, bearer, bot_id, access_id, type }) =>
    db.prepare(`INSERT INTO automates (name, bearer, bot_id, access_id, type, status)
                VALUES (?, ?, ?, ?, ?, 'offline')`)
      .run(name, bearer, bot_id, access_id, type || "Private"),
  update: (id, fields) => updateFields("automates", id, fields),
  remove: (id) => db.prepare("DELETE FROM automates WHERE id = ?").run(id),
};
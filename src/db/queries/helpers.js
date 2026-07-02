// src/db/queries/helpers.js
import db from "../index.js";

export function updateFields(table, id, fields, allowed = null) {
  const keys = allowed
    ? Object.keys(fields).filter((k) => allowed.includes(k))
    : Object.keys(fields);
  if (keys.length === 0) return;
  for (const k of keys) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(k)) {
      throw new Error(`Invalid column name: ${k}`);
    }
  }
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const vals = keys.map((k) => fields[k]);
  vals.push(id);
  db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...vals);
}

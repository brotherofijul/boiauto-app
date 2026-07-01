// src/db/queries/helpers.js
import db from "../index.js";

/**
 * Generic dynamic UPDATE helper.
 * Builds and executes UPDATE <table> SET col=? ... WHERE id=?
 * @param {string} table - Table name
 * @param {number} id - Row id
 * @param {object} fields - Key/value pairs to update
 * @param {string[]|null} allowed - Optional whitelist; if null, all keys are used
 */
export function updateFields(table, id, fields, allowed = null) {
  const keys = allowed
    ? Object.keys(fields).filter((k) => allowed.includes(k))
    : Object.keys(fields);
  if (keys.length === 0) return;
  const sets = keys.map((k) => `${k} = ?`).join(", ");
  const vals = keys.map((k) => fields[k]);
  vals.push(id);
  db.prepare(`UPDATE ${table} SET ${sets} WHERE id = ?`).run(...vals);
}
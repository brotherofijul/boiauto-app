// /src/db.js
import { Database } from "bun:sqlite";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { readFile } from "fs/promises";
import logger from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";

const DB_PATH = isProd
  ? join(__dirname, "..", "data.db")
  : ":memory:";

logger.info({ mode: isProd ? "production" : "development", db: DB_PATH }, "initializing database");

const db = new Database(DB_PATH, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

db.exec(`
  CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    token TEXT NOT NULL,
    type TEXT DEFAULT 'Dual' CHECK (type IN ('Dual','Shared')),
    rate_per_day REAL DEFAULT 0,
    status TEXT DEFAULT 'connecting' CHECK (status IN ('connecting','connected','disconnected','error')),
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS automates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bearer TEXT NOT NULL,
    bot_id TEXT,
    access_id TEXT,
    balance REAL DEFAULT 0,
    diamond INTEGER DEFAULT 0,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','error')),
    type TEXT DEFAULT 'Private',
    skill_up_running INTEGER DEFAULT 0,
    auto_war_running INTEGER DEFAULT 0,
    auto_work_running INTEGER DEFAULT 0,
    current_level INTEGER,
    target_level INTEGER,
    pending_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE SET NULL,
    FOREIGN KEY (access_id) REFERENCES access_tokens(access_id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS access_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_id TEXT UNIQUE NOT NULL,
    token TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    name TEXT,
    type TEXT DEFAULT 'Private' CHECK (type IN ('Private','Shared','Business')),
    price_per_day REAL DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_automates_bot_id ON accounts(bot_id);
  CREATE INDEX IF NOT EXISTS idx_automates_access_id ON accounts(access_id);
  CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
  CREATE INDEX IF NOT EXISTS idx_access_bot_id ON access_tokens(bot_id);
`);

export function genBotId() {
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return "bot_" + hex;
}

export function genToken() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16));
  const timestamp = Date.now();
  const data = `${Array.from(randomBytes).join("")}${timestamp}`;
  const hash = Bun.hash(data).toString(16).padStart(16, "0");
  return `bot_${hash}`;
}

export function genAccessId() {
  const bytes = crypto.getRandomValues(new Uint8Array(7));
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return "acc_" + hex;
}

export async function seedFromConfig() {
  const configPath = join(__dirname, "..", "bot.config.json");
  let config;
  try {
    config = JSON.parse(await readFile(configPath, "utf-8"));
  } catch (e) {
    logger.warn({ path: configPath, err: e.message }, "bot.config.json not found or invalid — skipping seed");
    return;
  }

  if (!config.token) {
    logger.warn("bot.config.json missing 'token' field — skipping seed");
    return;
  }

  const existing = db.query("SELECT * FROM bots WHERE token = ?").get(config.token);
  if (existing) {
    logger.info({ botId: existing.bot_id, name: existing.name }, "config bot already seeded");
    return;
  }

  const botId = config.bot_id || genBotId();
  const name = config.name || botId;
  const type = config.type === "Shared" ? "Shared" : "Dual";

  db.prepare("INSERT INTO bots (bot_id, name, token, type, rate_per_day, status) VALUES (?, ?, ?, ?, 0, ?)")
    .run(botId, name, config.token, type, "connecting");

  logger.info({ botId, name, type }, "bot seeded from bot.config.json");
}

export const queries = {
  listBots: () => db.query("SELECT * FROM bots ORDER BY created_at DESC").all(),
  getBotByBotId: (botId) => db.query("SELECT * FROM bots WHERE bot_id = ?").get(botId),
  getBotByToken: (token) => db.query("SELECT * FROM bots WHERE token = ?").get(token),
  getBotById: (id) => db.query("SELECT * FROM bots WHERE id = ?").get(id),
  insertBot: (botId, name, token, type) =>
    db.prepare("INSERT INTO bots (bot_id, name, token, type, status) VALUES (?, ?, ?, ?, 'connecting')")
      .run(botId, name, token, type),
  updateBot: (id, fields) => {
    const allowed = ["name", "token", "type"];
    const keys = Object.keys(fields).filter((k) => allowed.includes(k));
    if (keys.length === 0) return;
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    const vals = keys.map((k) => fields[k]);
    vals.push(id);
    db.prepare(`UPDATE bots SET ${sets} WHERE id = ?`).run(...vals);
  },
  deleteBot: (id) => db.prepare("DELETE FROM bots WHERE id = ?").run(id),
  setBotStatus: (botId, status) =>
    db.prepare("UPDATE bots SET status = ? WHERE bot_id = ?").run(status, botId),

  listAccounts: () => db.query(`
    SELECT a.*, b.name as bot_name, b.type as bot_type, b.status as bot_status_raw,
           ac.name as access_name, ac.type as access_type, ac.price_per_day as access_price
    FROM automates a
    LEFT JOIN bots b ON a.bot_id = b.bot_id
    LEFT JOIN access_tokens ac ON a.access_id = ac.access_id
    ORDER BY a.created_at DESC
  `).all(),
  getAccountById: (id) => db.query(`
    SELECT a.*, b.name as bot_name, b.type as bot_type, b.status as bot_status_raw,
           ac.name as access_name, ac.type as access_type, ac.price_per_day as access_price
    FROM automates a
    LEFT JOIN bots b ON a.bot_id = b.bot_id
    LEFT JOIN access_tokens ac ON a.access_id = ac.access_id
    WHERE a.id = ?
  `).get(id),
  insertAccount: ({ name, bearer, bot_id, access_id, type }) =>
    db.prepare(`INSERT INTO automates (name, bearer, bot_id, access_id, type, status)
                VALUES (?, ?, ?, ?, ?, 'offline')`)
      .run(name, bearer, bot_id, access_id, type || "Private"),
  updateAccount: (id, fields) => {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    const vals = keys.map((k) => fields[k]);
    vals.push(id);
    db.prepare(`UPDATE automates SET ${sets} WHERE id = ?`).run(...vals);
  },
  deleteAccount: (id) => db.prepare("DELETE FROM automates WHERE id = ?").run(id),

  listAccess: () => db.query(`
    SELECT a.*, b.name as bot_name, b.type as bot_type,
           (SELECT COUNT(*) FROM automates acc WHERE acc.access_id = a.access_id) as usage_count
    FROM access_tokens a
    LEFT JOIN bots b ON a.bot_id = b.bot_id
    ORDER BY a.created_at DESC
  `).all(),
  getAccessByAccessId: (accessId) => db.query("SELECT * FROM access_tokens WHERE access_id = ?").get(accessId),
  getAccessByToken: (token) => db.query("SELECT * FROM access_tokens WHERE token = ?").get(token),
  insertAccess: (accessId, token, botId, name, type, pricePerDay) =>
    db.prepare("INSERT INTO access_tokens (access_id, token, bot_id, name, type, price_per_day) VALUES (?, ?, ?, ?, ?, ?)")
      .run(accessId, token, botId, name || null, type || "Private", pricePerDay || 0),
  deleteAccess: (id) => db.prepare("DELETE FROM access_tokens WHERE id = ?").run(id),
  accessCountByBot: (botId) =>
    db.query("SELECT COUNT(*) as c FROM access_tokens WHERE bot_id = ?").get(botId).c,
  accountCountByAccess: (accessId) =>
    db.query("SELECT COUNT(*) as c FROM automates WHERE access_id = ?").get(accessId).c,
};

export default db;

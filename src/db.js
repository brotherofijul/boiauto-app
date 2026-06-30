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
    type TEXT DEFAULT 'Dual' CHECK (type IN ('Dual','Shared','Business','Custom')),
    rate_per_day REAL DEFAULT 0,
    status TEXT DEFAULT 'connecting' CHECK (status IN ('connecting','connected','disconnected','error')),
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bearer TEXT NOT NULL,
    bot_id TEXT,
    balance REAL DEFAULT 0,
    diamond INTEGER DEFAULT 0,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','error')),
    type TEXT DEFAULT 'Dual',
    skill_up_running INTEGER DEFAULT 0,
    auto_war_running INTEGER DEFAULT 0,
    auto_work_running INTEGER DEFAULT 0,
    current_level INTEGER,
    target_level INTEGER,
    pending_at INTEGER,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS access_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_id TEXT UNIQUE NOT NULL,
    token TEXT NOT NULL,
    bot_id TEXT NOT NULL,
    label TEXT,
    used INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (bot_id) REFERENCES bots(bot_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_accounts_bot_id ON accounts(bot_id);
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
  const type = config.type || "Dual";
  const rate = type === "Business" ? (config.rate_per_day || 0) : 0;

  db.prepare("INSERT INTO bots (bot_id, name, token, type, rate_per_day, status) VALUES (?, ?, ?, ?, ?, ?)")
    .run(botId, name, config.token, type, rate, "connecting");

  logger.info({ botId, name, type }, "bot seeded from bot.config.json");
}

export const queries = {
  listBots: () => db.query("SELECT * FROM bots ORDER BY created_at DESC").all(),
  getBotByBotId: (botId) => db.query("SELECT * FROM bots WHERE bot_id = ?").get(botId),
  getBotByToken: (token) => db.query("SELECT * FROM bots WHERE token = ?").get(token),
  getBotById: (id) => db.query("SELECT * FROM bots WHERE id = ?").get(id),
  insertBot: (botId, name, token, type, ratePerDay) =>
    db.prepare("INSERT INTO bots (bot_id, name, token, type, rate_per_day, status) VALUES (?, ?, ?, ?, ?, 'connecting')")
      .run(botId, name, token, type, ratePerDay || 0),
  updateBot: (id, fields) => {
    const allowed = ["name", "token", "type", "rate_per_day"];
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

  listAccounts: () => db.query("SELECT * FROM accounts ORDER BY created_at DESC").all(),
  getAccountById: (id) => db.query("SELECT * FROM accounts WHERE id = ?").get(id),
  insertAccount: ({ name, bearer, bot_id, balance, diamond, status, type }) =>
    db.prepare(`INSERT INTO accounts (name, bearer, bot_id, balance, diamond, status, type)
                VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(name, bearer, bot_id, balance || 0, diamond || 0, status || "offline", type || "Dual"),
  updateAccount: (id, fields) => {
    const keys = Object.keys(fields);
    if (keys.length === 0) return;
    const sets = keys.map((k) => `${k} = ?`).join(", ");
    const vals = keys.map((k) => fields[k]);
    vals.push(id);
    db.prepare(`UPDATE accounts SET ${sets} WHERE id = ?`).run(...vals);
  },
  deleteAccount: (id) => db.prepare("DELETE FROM accounts WHERE id = ?").run(id),
  accountCountByBot: (botId) =>
    db.query("SELECT COUNT(*) as c FROM accounts WHERE bot_id = ?").get(botId).c,

  listAccess: () => db.query(`
    SELECT a.*, b.name as bot_name, b.type as bot_type
    FROM access_tokens a
    LEFT JOIN bots b ON a.bot_id = b.bot_id
    ORDER BY a.created_at DESC
  `).all(),
  getAccessByToken: (token) => db.query("SELECT * FROM access_tokens WHERE token = ?").get(token),
  getAccessByBotId: (botId) => db.query("SELECT * FROM access_tokens WHERE bot_id = ? ORDER BY created_at DESC").all(),
  insertAccess: (accessId, token, botId, label) =>
    db.prepare("INSERT INTO access_tokens (access_id, token, bot_id, label) VALUES (?, ?, ?, ?)")
      .run(accessId, token, botId, label || null),
  deleteAccess: (id) => db.prepare("DELETE FROM access_tokens WHERE id = ?").run(id),
  accessCountByBot: (botId) =>
    db.query("SELECT COUNT(*) as c FROM access_tokens WHERE bot_id = ?").get(botId).c,
};

export default db;

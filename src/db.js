// /src/db.js
import { Database } from "bun:sqlite";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
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
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    balance REAL DEFAULT 0,
    diamond INTEGER DEFAULT 0,
    created_at INTEGER DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS bots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    bot_id TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    token TEXT NOT NULL,
    type TEXT DEFAULT 'Dual' CHECK (type IN ('Dual','Shared','Business')),
    rate_per_day REAL DEFAULT 0,
    status TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','error')),
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

  CREATE INDEX IF NOT EXISTS idx_accounts_bot_id ON accounts(bot_id);
  CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
`);

export const queries = {
  listBots: () => db.query("SELECT * FROM bots ORDER BY created_at DESC").all(),
  getBotByBotId: (botId) => db.query("SELECT * FROM bots WHERE bot_id = ?").get(botId),
  getBotByToken: (token) => db.query("SELECT * FROM bots WHERE token = ?").get(token),
  insertBot: (botId, name, token, type, ratePerDay) =>
    db.prepare("INSERT INTO bots (bot_id, name, token, type, rate_per_day) VALUES (?, ?, ?, ?, ?)")
      .run(botId, name, token, type, ratePerDay || 0),
  updateBot: (id, name, type, ratePerDay) =>
    db.prepare("UPDATE bots SET name = ?, type = ?, rate_per_day = ? WHERE id = ?")
      .run(name, type, ratePerDay || 0, id),
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

  listUsers: () => db.query("SELECT * FROM users ORDER BY name").all(),
  getUserByName: (name) => db.query("SELECT * FROM users WHERE name = ?").get(name),
  insertUser: (name, balance, diamond) =>
    db.prepare("INSERT OR IGNORE INTO users (name, balance, diamond) VALUES (?, ?, ?)").run(name, balance || 0, diamond || 0),
  randomUser: () => db.query("SELECT * FROM users ORDER BY RANDOM() LIMIT 1").get(),
};

export default db;

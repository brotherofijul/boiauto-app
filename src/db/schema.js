// /src/db/schema.js
export const schemaSql = `
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

  CREATE TABLE IF NOT EXISTS accounts (
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

  CREATE INDEX IF NOT EXISTS idx_accounts_bot_id ON accounts(bot_id);
  CREATE INDEX IF NOT EXISTS idx_accounts_access_id ON accounts(access_id);
  CREATE INDEX IF NOT EXISTS idx_bots_status ON bots(status);
  CREATE INDEX IF NOT EXISTS idx_access_bot_id ON access_tokens(bot_id);
`;

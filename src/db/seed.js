// /src/db/seed.js
import { readFile } from "fs/promises";
import { config } from "../config.js";
import logger from "../logger.js";
import db from "./index.js";
import { genBotId } from "../utils/crypto.js";

export async function seedFromConfig() {
  let cfg;
  try {
    cfg = JSON.parse(await readFile(config.botConfigPath, "utf-8"));
  } catch (e) {
    logger.warn({ path: config.botConfigPath, err: e.message }, "bot.config.json not found — skipping seed");
    return;
  }

  if (!cfg.token) {
    logger.warn("bot.config.json missing 'token' — skipping seed");
    return;
  }

  const existing = db.query("SELECT * FROM bots WHERE token = ?").get(cfg.token);
  if (existing) {
    logger.info({ botId: existing.bot_id, name: existing.name }, "config bot already seeded");
    return;
  }

  const botId = cfg.bot_id || genBotId();
  const name = cfg.name || botId;
  const type = cfg.type === "Shared" ? "Shared" : "Dual";

  db.prepare("INSERT INTO bots (bot_id, name, token, type, rate_per_day, status) VALUES (?, ?, ?, ?, 0, ?)")
    .run(botId, name, cfg.token, type, "connecting");

  logger.info({ botId, name, type }, "bot seeded from bot.config.json");
}

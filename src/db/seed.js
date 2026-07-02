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

  // Support both "bots" array and single-bot format (for backward compat)
  const bots = Array.isArray(cfg.bots) ? cfg.bots : [cfg];

  for (const botCfg of bots) {
    if (!botCfg.token) {
      logger.warn("bot config entry missing 'token' — skipping");
      continue;
    }

    const existing = db.query("SELECT * FROM bots WHERE token = ?").get(botCfg.token);
    if (existing) {
      logger.info({ botId: existing.bot_id, name: existing.name }, "config bot already seeded");
      continue;
    }

    const botId = botCfg.bot_id || genBotId();
    const name = botCfg.name || botId;
    const type = botCfg.type === "Shared" ? "Shared" : "Dual";
    const ratePerDay = Number(botCfg.rate_per_day) || 0;

    db.prepare("INSERT INTO bots (bot_id, name, token, type, rate_per_day, status) VALUES (?, ?, ?, ?, ?, ?)")
      .run(botId, name, botCfg.token, type, ratePerDay, "connecting");

    logger.info({ botId, name, type }, "bot seeded from bot.config.json");
  }
}

// /src/db/index.js
import { Database } from "bun:sqlite";
import { config } from "../config.js";
import logger from "../logger.js";
import { schemaSql } from "./schema.js";

const db = new Database(config.dbPath, { create: true });
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");
db.exec(schemaSql);

logger.info(
  { mode: config.isProd ? "production" : "development", db: config.dbPath },
  "database initialized"
);

export default db;

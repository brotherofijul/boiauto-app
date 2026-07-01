// /src/config.js
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

export const config = {
  isProd: process.env.NODE_ENV === "production",
  port: Number(process.env.PORT) || 3000,
  logLevel: process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug"),
  dbPath: process.env.NODE_ENV === "production" ? join(ROOT, "data.db") : ":memory:",
  publicDir: join(__dirname, "public"),
  rootDir: ROOT,
  botConfigPath: join(ROOT, "bot.config.json"),
  wsUrl: process.env.WS_URL || "ws://localhost:3000/ws",
  updateInterval: Number(process.env.UPDATE_INTERVAL) || 5000,
};

export const BOT_TYPES = ["Dual", "Shared"];
export const ACCESS_TYPES = ["Private", "Shared", "Business"];
export const BOT_STATUSES = ["connecting", "connected", "disconnected", "error"];
export const ACCOUNT_STATUSES = ["online", "offline", "error"];

export const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

export default config;

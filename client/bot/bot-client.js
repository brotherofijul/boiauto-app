// /client/bot/bot-client.js
import { parseArgs } from "node:util";
import { readFile } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import pino from "pino";

const __dirname = dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === "production";
const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  base: null,
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          levelFirst: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
          messageFormat: "{msg}",
        },
      },
});
const log = logger.child({ module: "bot-client" });

const {
  values: {
    server = process.env.WS_URL || "ws://localhost:3000/ws",
    token: tokenFlag,
    interval = process.env.UPDATE_INTERVAL || "5000",
    config: configFlag,
  },
} = parseArgs({
  options: {
    server: { type: "string", short: "s" },
    token: { type: "string", short: "t" },
    interval: { type: "string", short: "i" },
    config: { type: "string", short: "c" },
  },
});

let token = tokenFlag || process.env.BOT_TOKEN;

if (!token) {
  const configPath = resolve(configFlag || __dirname, "../../bot.config.json");
  try {
    const config = JSON.parse(await readFile(configPath, "utf-8"));
    const bot = Array.isArray(config.bots) ? config.bots[0] : config;
    if (bot?.token) {
      token = bot.token;
      log.info({ configPath, name: bot.name }, "loaded token from bot.config.json");
    }
  } catch (e) {
    log.warn({ configPath, err: e.message }, "could not read bot.config.json");
  }
}

if (!token) {
  log.error("Bot token required.");
  log.error("Options:");
  log.error("  1. Set BOT_TOKEN env var");
  log.error("  2. Pass --token <TOKEN>");
  log.error("  3. Put it in bot.config.json at project root");
  log.error("Get a bot token from: curl http://localhost:3000/api/bots | jq '.[] | {name,token}'");
  process.exit(1);
}

const UPDATE_INTERVAL = Number(interval);
let ws;
let botId = null;
let botName = null;
let heartbeatTimer = null;
let updateTimer = null;
let reconnectTimer = null;
let reconnectAttempts = 0;

function connect() {
  log.info({ server }, "connecting to WS server...");
  ws = new WebSocket(server);

  ws.addEventListener("open", () => {
    reconnectAttempts = 0;
    log.info("connected, authenticating...");
    ws.send(JSON.stringify({ type: "auth", role: "bot", token }));
  });

  ws.addEventListener("message", async (event) => {
    let msg;
    try { msg = JSON.parse(event.data); } catch { return; }

    switch (msg.type) {
      case "auth_ok":
        botId = msg.bot_id;
        botName = msg.name;
        log.info({ bot: botName, botId }, "authenticated");
        startHeartbeat();
        startStateUpdates();
        break;

      case "auth_failed":
        log.error({ message: msg.message }, "authentication failed");
        log.error("check your bot token — get one from GET /api/bots");
        process.exit(1);
        break;

      case "command":
        await handleCommand(msg);
        break;

      case "ping":
        ws.send(JSON.stringify({ type: "pong" }));
        break;
    }
  });

  ws.addEventListener("close", () => {
    log.warn("disconnected");
    stopTimers();
    scheduleReconnect();
  });

  ws.addEventListener("error", (e) => {
    log.error({ err: e.message || String(e) }, "ws error");
  });
}

function scheduleReconnect() {
  reconnectAttempts++;
  const delay = Math.min(1000 * 2 ** reconnectAttempts, 30000);
  log.info({ delay, attempt: reconnectAttempts }, "reconnecting");
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = setTimeout(connect, delay);
}

function startHeartbeat() {
  heartbeatTimer = setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "heartbeat" }));
    }
  }, 15000);
}

function startStateUpdates() {
  updateTimer = setInterval(() => {
    sendMockStateUpdate();
  }, UPDATE_INTERVAL);
  sendMockStateUpdate();
}

function stopTimers() {
  if (heartbeatTimer) clearInterval(heartbeatTimer);
  if (updateTimer) clearInterval(updateTimer);
  if (reconnectTimer) clearTimeout(reconnectTimer);
  heartbeatTimer = null;
  updateTimer = null;
  reconnectTimer = null;
}

function sendMockStateUpdate() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  const accountId = Math.floor(Math.random() * 5) + 1;
  const balance = Math.round((Math.random() * 250000) * 100) / 100;
  const diamond = Math.floor(Math.random() * 3000);
  const status = Math.random() > 0.1 ? "online" : "offline";

  const payload = {
    account_id: accountId,
    balance,
    diamond,
    status,
    current_level: Math.floor(Math.random() * 20) + 1,
    target_level: Math.floor(Math.random() * 20) + 2,
    pending_at: Date.now() + (Math.random() * 60000),
    timestamp: Date.now(),
  };

  ws.send(JSON.stringify({
    type: "state_update",
    account_id: accountId,
    payload,
  }));

  log.debug({ accountId, balance, diamond, status }, "state_update sent");
}

async function handleCommand(msg) {
  log.info({ command: msg.command, accountId: msg.account_id, payload: msg.payload }, "command received");

  switch (msg.command) {
    case "start_skill_up":
    case "start_auto_war":
    case "start_auto_work":
      ws.send(JSON.stringify({
        type: "state_update",
        account_id: msg.account_id,
        payload: {
          account_id: msg.account_id,
          status: "online",
          command_ack: msg.command,
          started_at: Date.now(),
        },
      }));
      log.info({ command: msg.command, accountId: msg.account_id }, "acknowledged: start");
      break;

    case "stop_skill_up":
    case "stop_auto_war":
    case "stop_auto_work":
      ws.send(JSON.stringify({
        type: "state_update",
        account_id: msg.account_id,
        payload: {
          account_id: msg.account_id,
          status: "offline",
          command_ack: msg.command,
          stopped_at: Date.now(),
        },
      }));
      log.info({ command: msg.command, accountId: msg.account_id }, "acknowledged: stop");
      break;

    default:
      log.warn({ command: msg.command }, "unknown command");
  }
}

process.on("SIGINT", () => {
  log.info("shutting down...");
  stopTimers();
  if (ws) ws.close();
  process.exit(0);
});

connect();

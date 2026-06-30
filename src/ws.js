// /src/ws.js
import { queries } from "./db.js";
import logger from "./logger.js";

const sockets = new Map();
const subscribers = new Set();

const log = logger.child({ module: "ws" });

function send(ws, obj) {
  try {
    ws.send(JSON.stringify(obj));
  } catch {}
}

function broadcastToSubscribers(payload, excludeWs = null) {
  const msg = JSON.stringify(payload);
  let sent = 0;
  for (const ws of subscribers) {
    if (ws === excludeWs) continue;
    try { ws.send(msg); sent++; } catch {}
  }
  return sent;
}

function findBotSocket(botId) {
  for (const [ws, ctx] of sockets) {
    if (ctx.role === "bot" && ctx.botId === botId) return ws;
  }
  return null;
}

export const wsHandler = {
  open(ws) {
    sockets.set(ws, { role: null, botId: null, subscribed: false });
    send(ws, { type: "hello", message: "Send {type:'auth', role:'bot'|'web', token?:string} to authenticate." });
    log.debug({ clientId: ws.id || "?" }, "connection opened");
  },

  async message(ws, raw) {
    let msg;
    try { msg = JSON.parse(raw); } catch {
      return send(ws, { type: "error", message: "Invalid JSON" });
    }

    const ctx = sockets.get(ws);
    if (!ctx) return;

    if (msg.type === "auth") {
      if (msg.role === "bot") {
        const bot = msg.token ? queries.getBotByToken(msg.token) : null;
        if (!bot) {
          log.warn({ token: msg.token?.slice(0, 12) + "..." }, "bot auth failed");
          return send(ws, { type: "auth_failed", message: "Invalid bot token" });
        }
        ctx.role = "bot";
        ctx.botId = bot.bot_id;
        queries.setBotStatus(bot.bot_id, "online");
        broadcastToSubscribers({ type: "bot_status", bot_id: bot.bot_id, status: "online" });
        send(ws, { type: "auth_ok", role: "bot", bot_id: bot.bot_id, name: bot.name });
        log.info({ bot: bot.name, botId: bot.bot_id }, "bot connected");
        return;
      }

      if (msg.role === "web") {
        ctx.role = "web";
        ctx.subscribed = true;
        subscribers.add(ws);
        send(ws, { type: "auth_ok", role: "web" });
        send(ws, { type: "snapshot", bots: queries.listBots(), accounts: queries.listAccounts() });
        log.debug("web subscriber connected");
        return;
      }

      return send(ws, { type: "auth_failed", message: "Unknown role" });
    }

    if (!ctx.role) {
      return send(ws, { type: "error", message: "Authenticate first" });
    }

    if (msg.type === "command" && ctx.role === "web") {
      const botWs = findBotSocket(msg.bot_id);
      if (!botWs) {
        log.warn({ botId: msg.bot_id }, "command target bot not connected");
        return send(ws, { type: "error", message: `Bot ${msg.bot_id} not connected` });
      }
      send(botWs, {
        type: "command",
        command: msg.command,
        account_id: msg.account_id,
        payload: msg.payload,
      });
      log.info({ botId: msg.bot_id, command: msg.command, accountId: msg.account_id }, "command forwarded");
      return;
    }

    if (msg.type === "state_update" && ctx.role === "bot") {
      const sent = broadcastToSubscribers({
        type: "state_update",
        bot_id: ctx.botId,
        account_id: msg.account_id,
        payload: msg.payload,
      });
      if (msg.payload && msg.payload.account_id != null) {
        queries.updateAccount(msg.payload.account_id, {
          balance: msg.payload.balance,
          diamond: msg.payload.diamond,
          status: msg.payload.status,
        });
      }
      log.debug({ botId: ctx.botId, accountId: msg.account_id, subscribers: sent }, "state_update broadcast");
      return;
    }

    if (msg.type === "heartbeat" && ctx.role === "bot") {
      return send(ws, { type: "heartbeat_ack", t: Date.now() });
    }

    if (msg.type === "ping") return send(ws, { type: "pong" });
  },

  close(ws) {
    const ctx = sockets.get(ws);
    if (ctx?.role === "bot" && ctx.botId) {
      queries.setBotStatus(ctx.botId, "offline");
      broadcastToSubscribers({ type: "bot_status", bot_id: ctx.botId, status: "offline" });
      log.info({ botId: ctx.botId }, "bot disconnected");
    }
    if (ctx?.role === "web") {
      subscribers.delete(ws);
      log.debug("web subscriber disconnected");
    }
    sockets.delete(ws);
  },
};

export function broadcastAccountUpdate(accountId, fields) {
  const sent = broadcastToSubscribers({ type: "account_update", account_id: accountId, fields });
  log.debug({ accountId, subscribers: sent }, "account_update broadcast");
}

export function broadcastBotUpdate(botId, fields) {
  const sent = broadcastToSubscribers({ type: "bot_update", bot_id: botId, fields });
  log.debug({ botId, subscribers: sent }, "bot_update broadcast");
}

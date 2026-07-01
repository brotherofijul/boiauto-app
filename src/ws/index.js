// /src/ws/index.js
import { botsQueries, automatesQueries } from "../db/queries/index.js";
import logger from "../logger.js";
import { WS_ROLES, WS_MESSAGES } from "./protocol.js";

const log = logger.child({ module: "ws" });

const sockets = new Map();
const subscribers = new Set();

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
    try {
      ws.send(msg);
      sent++;
    } catch {}
  }
  return sent;
}

function findBotSocket(botId) {
  for (const [ws, ctx] of sockets) {
    if (ctx.role === WS_ROLES.BOT && ctx.botId === botId) return ws;
  }
  return null;
}

export const wsHandler = {
  open(ws) {
    sockets.set(ws, { role: null, botId: null, subscribed: false });
    send(ws, {
      type: WS_MESSAGES.HELLO,
      message: "Send {type:'auth', role:'bot'|'web', token?:string} to authenticate.",
    });
    log.debug({ clientId: ws.id || "?" }, "connection opened");
  },

  async message(ws, raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch {
      return send(ws, { type: WS_MESSAGES.ERROR, message: "Invalid JSON" });
    }

    const ctx = sockets.get(ws);
    if (!ctx) return;

    if (msg.type === WS_MESSAGES.AUTH) {
      return handleAuth(ws, ctx, msg);
    }

    if (!ctx.role) {
      return send(ws, { type: WS_MESSAGES.ERROR, message: "Authenticate first" });
    }

    switch (msg.type) {
      case WS_MESSAGES.COMMAND:
        return handleCommand(ws, ctx, msg);
      case WS_MESSAGES.STATE_UPDATE:
        return handleStateUpdate(ws, ctx, msg);
      case WS_MESSAGES.HEARTBEAT:
        return send(ws, { type: WS_MESSAGES.HEARTBEAT_ACK, t: Date.now() });
      case WS_MESSAGES.PING:
        return send(ws, { type: WS_MESSAGES.PONG });
    }
  },

  close(ws) {
    const ctx = sockets.get(ws);
    if (ctx?.role === WS_ROLES.BOT && ctx.botId) {
      botsQueries.setStatus(ctx.botId, "disconnected");
      broadcastToSubscribers({
        type: WS_MESSAGES.BOT_STATUS,
        bot_id: ctx.botId,
        status: "disconnected",
      });
      log.info({ botId: ctx.botId }, "bot disconnected");
    }
    if (ctx?.role === WS_ROLES.WEB) {
      subscribers.delete(ws);
      log.debug("web subscriber disconnected");
    }
    sockets.delete(ws);
  },
};

function handleAuth(ws, ctx, msg) {
  if (msg.role === WS_ROLES.BOT) {
    const bot = msg.token ? botsQueries.getByToken(msg.token) : null;
    if (!bot) {
      log.warn({ token: msg.token?.slice(0, 12) + "..." }, "bot auth failed");
      return send(ws, { type: WS_MESSAGES.AUTH_FAILED, message: "Invalid bot token" });
    }
    ctx.role = WS_ROLES.BOT;
    ctx.botId = bot.bot_id;
    botsQueries.setStatus(bot.bot_id, "connected");
    broadcastToSubscribers({
      type: WS_MESSAGES.BOT_STATUS,
      bot_id: bot.bot_id,
      status: "connected",
    });
    send(ws, { type: WS_MESSAGES.AUTH_OK, role: WS_ROLES.BOT, bot_id: bot.bot_id, name: bot.name });
    log.info({ bot: bot.name, botId: bot.bot_id }, "bot connected");
    return;
  }

  if (msg.role === WS_ROLES.WEB) {
    ctx.role = WS_ROLES.WEB;
    ctx.subscribed = true;
    subscribers.add(ws);
    send(ws, { type: WS_MESSAGES.AUTH_OK, role: WS_ROLES.WEB });
    send(ws, {
      type: WS_MESSAGES.SNAPSHOT,
      bots: botsQueries.list(),
      accounts: automatesQueries.list(),
    });
    log.debug("web subscriber connected");
    return;
  }

  return send(ws, { type: WS_MESSAGES.AUTH_FAILED, message: "Unknown role" });
}

function handleCommand(ws, ctx, msg) {
  if (ctx.role !== WS_ROLES.WEB) return;
  const botWs = findBotSocket(msg.bot_id);
  if (!botWs) {
    log.warn({ botId: msg.bot_id }, "command target bot not connected");
    return send(ws, { type: WS_MESSAGES.ERROR, message: `Bot ${msg.bot_id} not connected` });
  }
  send(botWs, {
    type: WS_MESSAGES.COMMAND,
    command: msg.command,
    account_id: msg.account_id,
    payload: msg.payload,
  });
  log.info({ botId: msg.bot_id, command: msg.command, accountId: msg.account_id }, "command forwarded");
}

function handleStateUpdate(ws, ctx, msg) {
  if (ctx.role !== WS_ROLES.BOT) return;
  const sent = broadcastToSubscribers({
    type: WS_MESSAGES.STATE_UPDATE,
    bot_id: ctx.botId,
    account_id: msg.account_id,
    payload: msg.payload,
  });
  if (msg.payload && msg.payload.account_id != null) {
    automatesQueries.update(msg.payload.account_id, {
      balance: msg.payload.balance,
      diamond: msg.payload.diamond,
      status: msg.payload.status,
    });
  }
  log.debug({ botId: ctx.botId, accountId: msg.account_id, subscribers: sent }, "state_update broadcast");
}

export function broadcastAutomateUpdate(accountId, fields) {
  const sent = broadcastToSubscribers({ type: WS_MESSAGES.AUTOMATE_UPDATE, account_id: accountId, fields });
  log.debug({ accountId, subscribers: sent }, "account_update broadcast");
}

export function broadcastBotUpdate(botId, fields) {
  const sent = broadcastToSubscribers({ type: WS_MESSAGES.BOT_UPDATE, bot_id: botId, fields });
  log.debug({ botId, subscribers: sent }, "bot_update broadcast");
}

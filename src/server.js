// /src/server.js
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import db, { queries } from "./db.js";
import { wsHandler, broadcastAccountUpdate, broadcastBotUpdate } from "./ws.js";
import logger from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

const log = logger.child({ module: "server" });

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function readJson(req) {
  try { return await req.json(); } catch { return null; }
}

function genBotId() {
  return "bot_" + Math.random().toString(36).slice(2, 8);
}

function genToken() {
  return "tok_" + Array.from({ length: 24 }, () => Math.random().toString(36).slice(2, 3)).join("");
}

async function handleApi(req, url) {
  const path = url.pathname.replace("/api/", "");
  const [resource, idStr] = path.split("/");
  const id = idStr ? Number(idStr) : null;
  const apiLog = log.child({ resource, method: req.method, id });

  if (resource === "bots") {
    if (req.method === "GET") {
      const bots = queries.listBots();
      apiLog.debug({ count: bots.length }, "list bots");
      return json(bots);
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body?.token) {
        apiLog.warn("create bot: missing token");
        return json({ error: "Token is required" }, 400);
      }
      const type = body.type || "Dual";
      if (type === "Business" && (!body.rate_per_day || body.rate_per_day <= 0)) {
        apiLog.warn({ type }, "create bot: Business requires rate_per_day");
        return json({ error: "Business type requires rate_per_day" }, 400);
      }
      const botId = genBotId();
      const name = body.name || botId;
      queries.insertBot(botId, name, body.token, type, body.rate_per_day || 0);
      const bot = queries.getBotByBotId(botId);
      broadcastBotUpdate(botId, bot);
      apiLog.info({ botId, name, type }, "bot created");
      return json(bot, 201);
    }

    if (req.method === "PATCH" && id) {
      const body = await readJson(req);
      const bot = db.query("SELECT * FROM bots WHERE id = ?").get(id);
      if (!bot) return json({ error: "Bot not found" }, 404);
      const name = body.name ?? bot.name;
      const type = body.type ?? bot.type;
      const rate = type === "Business" ? (body.rate_per_day ?? bot.rate_per_day) : 0;
      if (type === "Business" && (!rate || rate <= 0)) {
        apiLog.warn({ type }, "update bot: Business requires rate_per_day");
        return json({ error: "Business type requires rate_per_day" }, 400);
      }
      queries.updateBot(id, name, type, rate);
      const updated = db.query("SELECT * FROM bots WHERE id = ?").get(id);
      broadcastBotUpdate(updated.bot_id, updated);
      apiLog.info({ botId: updated.bot_id, name, type }, "bot updated");
      return json(updated);
    }

    if (req.method === "DELETE" && id) {
      queries.deleteBot(id);
      apiLog.info({ id }, "bot deleted");
      return json({ ok: true });
    }
  }

  if (resource === "accounts") {
    if (req.method === "GET") {
      const accounts = queries.listAccounts();
      apiLog.debug({ count: accounts.length }, "list accounts");
      return json(accounts);
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body?.bearer) {
        apiLog.warn("create account: missing bearer");
        return json({ error: "Bearer is required" }, 400);
      }
      if (!body?.bot_id) {
        apiLog.warn("create account: missing bot_id");
        return json({ error: "bot_id is required" }, 400);
      }

      const bot = queries.getBotByBotId(body.bot_id);
      if (!bot) {
        apiLog.warn({ botId: body.bot_id }, "create account: bot not found");
        return json({ error: "Bot not found" }, 404);
      }

      const count = queries.accountCountByBot(body.bot_id);
      if ((bot.type === "Dual" || bot.type === "Business") && count >= 2) {
        apiLog.warn({ botId: bot.bot_id, type: bot.type, count }, "create account: bot full");
        return json({ error: `Bot ${bot.name} reached max 2 accounts limit (${bot.type})` }, 400);
      }

      queries.insertAccount({
        name: body.name || `Account-${Date.now().toString(36).slice(-4)}`,
        bearer: body.bearer,
        bot_id: body.bot_id,
        balance: 0,
        diamond: 0,
        status: bot.status,
        type: bot.type,
      });
      const list = queries.listAccounts();
      const acc = list[0];
      broadcastAccountUpdate(acc.id, acc);
      apiLog.info({ accountId: acc.id, name: acc.name, botId: body.bot_id }, "account created");
      return json(acc, 201);
    }

    if (req.method === "PATCH" && id) {
      const body = await readJson(req);
      const acc = queries.getAccountById(id);
      if (!acc) return json({ error: "Account not found" }, 404);
      const allowed = ["name", "bearer", "bot_id", "skill_up_running", "auto_war_running", "auto_work_running", "current_level", "target_level", "pending_at"];
      const fields = {};
      for (const k of allowed) if (k in body) fields[k] = body[k];
      if (body.bot_id) {
        const bot = queries.getBotByBotId(body.bot_id);
        if (!bot) return json({ error: "Bot not found" }, 404);
        fields.type = bot.type;
        fields.status = bot.status;
      }
      queries.updateAccount(id, fields);
      const updated = queries.getAccountById(id);
      broadcastAccountUpdate(id, updated);
      apiLog.info({ accountId: id, fields: Object.keys(fields) }, "account updated");
      return json(updated);
    }

    if (req.method === "DELETE" && id) {
      queries.deleteAccount(id);
      apiLog.info({ accountId: id }, "account deleted");
      return json({ ok: true });
    }
  }

  return json({ error: "Not found" }, 404);
}

function serveStatic(url) {
  let path = url.pathname === "/" ? "/index.html" : url.pathname;
  const file = Bun.file(join(PUBLIC, path));
  return file.exists().then((ok) => {
    if (!ok) return new Response("Not Found", { status: 404 });
    const ext = path.slice(path.lastIndexOf("."));
    return new Response(file, {
      headers: { "Content-Type": MIME[ext] || "application/octet-stream" },
    });
  });
}

Bun.serve({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === "/ws") {
      if (server.upgrade(req)) return;
      return new Response("Upgrade failed", { status: 400 });
    }

    if (url.pathname.startsWith("/api/")) {
      return handleApi(req, url);
    }

    return serveStatic(url);
  },
  websocket: wsHandler,
});

log.info({
  port: PORT,
  mode: isProd ? "production" : "development",
  ws: `ws://localhost:${PORT}/ws`,
  api: `http://localhost:${PORT}/api/{bots,accounts}`,
}, `BOIAuto server running`);

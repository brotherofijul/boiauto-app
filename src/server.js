// /src/server.js
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import db, { queries, genBotId, genToken, genAccessId, seedFromConfig } from "./db.js";
import { wsHandler, broadcastAccountUpdate, broadcastBotUpdate } from "./ws.js";
import logger from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "public");
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === "production";

const log = logger.child({ module: "server" });

await seedFromConfig().catch((e) => log.error({ err: e }, "seedFromConfig failed"));

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

async function handleApi(req, url) {
  const path = url.pathname.replace("/api/", "");
  const [resource, idStr] = path.split("/");
  const id = idStr ? Number(idStr) : null;
  const apiLog = log.child({ resource, method: req.method, id });

  if (resource === "bots") {
    if (idStr === "generate-token" && req.method === "POST") {
      const token = genToken();
      apiLog.info({ token: token.slice(0, 12) + "..." }, "generated token");
      return json({ token });
    }

    if (req.method === "GET") {
      const bots = queries.listBots();
      apiLog.debug({ count: bots.length }, "list bots");
      return json(bots);
    }

    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body?.token) return json({ error: "Token is required" }, 400);
      const type = body.type === "Shared" ? "Shared" : "Dual";
      const botId = genBotId();
      const name = body.name || botId;
      queries.insertBot(botId, name, body.token, type);
      const bot = queries.getBotByBotId(botId);
      broadcastBotUpdate(botId, bot);
      apiLog.info({ botId, name, type }, "bot created");
      return json(bot, 201);
    }

    if (req.method === "PATCH" && id) {
      const body = await readJson(req);
      const bot = queries.getBotById(id);
      if (!bot) return json({ error: "Bot not found" }, 404);
      const fields = {};
      if (body.name != null) fields.name = body.name;
      if (body.token != null) fields.token = body.token;
      if (body.type != null) fields.type = body.type === "Shared" ? "Shared" : "Dual";
      queries.updateBot(id, fields);
      const updated = queries.getBotById(id);
      broadcastBotUpdate(updated.bot_id, updated);
      apiLog.info({ botId: updated.bot_id, fields: Object.keys(fields) }, "bot updated");
      return json(updated);
    }

    if (req.method === "DELETE" && id) {
      queries.deleteBot(id);
      apiLog.info({ id }, "bot deleted");
      return json({ ok: true });
    }
  }

  if (resource === "accounts") {
    if (req.method === "GET") return json(queries.listAccounts());

    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body?.bearer) return json({ error: "Bearer is required" }, 400);
      if (!body?.access_id) return json({ error: "access_id is required" }, 400);

      const access = queries.getAccessByAccessId(body.access_id);
      if (!access) return json({ error: "Access not found" }, 404);

      const usage = queries.accountCountByAccess(access.access_id);
      if (access.type === "Private" && usage >= 1) {
        return json({ error: "Private access allows max 1 automate" }, 400);
      }
      if (access.type === "Business" && usage >= 1) {
        return json({ error: "Business access allows max 1 automate" }, 400);
      }

      const bot = queries.getBotByBotId(access.bot_id);
      queries.insertAccount({
        name: body.name || `Account-${Date.now().toString(36).slice(-4)}`,
        bearer: body.bearer,
        bot_id: access.bot_id,
        access_id: access.access_id,
        type: access.type,
      });
      const list = queries.listAccounts();
      const acc = list[0];
      broadcastAccountUpdate(acc.id, acc);
      apiLog.info({ accountId: acc.id, name: acc.name, accessId: access.access_id }, "account created");
      return json(acc, 201);
    }

    if (req.method === "PATCH" && id) {
      const body = await readJson(req);
      const acc = queries.getAccountById(id);
      if (!acc) return json({ error: "Account not found" }, 404);
      const allowed = ["name", "bearer", "skill_up_running", "auto_war_running", "auto_work_running", "current_level", "target_level", "pending_at", "balance", "diamond", "status"];
      const fields = {};
      for (const k of allowed) if (k in body) fields[k] = body[k];
      if (body.access_id) {
        const access = queries.getAccessByAccessId(body.access_id);
        if (!access) return json({ error: "Access not found" }, 404);
        fields.bot_id = access.bot_id;
        fields.access_id = access.access_id;
        fields.type = access.type;
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

  if (resource === "access") {
    if (req.method === "GET") return json(queries.listAccess());

    if (req.method === "POST") {
      const body = await readJson(req);
      if (!body?.bot_id) return json({ error: "bot_id is required" }, 400);
      const bot = queries.getBotByBotId(body.bot_id);
      if (!bot) return json({ error: "Bot not found" }, 404);

      if (bot.type === "Dual") {
        const count = queries.accessCountByBot(body.bot_id);
        if (count >= 2) {
          return json({ error: `Bot ${bot.name} (Dual) allows max 2 access tokens` }, 400);
        }
      }

      const type = ["Private", "Shared", "Business"].includes(body.type) ? body.type : "Private";
      if (type === "Business" && (!body.price_per_day || body.price_per_day <= 0)) {
        return json({ error: "Business type requires price_per_day" }, 400);
      }

      const token = genToken();
      const accessId = genAccessId();
      const price = type === "Business" ? Number(body.price_per_day) || 0 : 0;
      queries.insertAccess(accessId, token, body.bot_id, body.name, type, price);
      const access = db.query(`
        SELECT a.*, b.name as bot_name, b.type as bot_type,
               (SELECT COUNT(*) FROM accounts acc WHERE acc.access_id = a.access_id) as usage_count
        FROM access_tokens a
        LEFT JOIN bots b ON a.bot_id = b.bot_id
        WHERE a.token = ?
      `).get(token);
      apiLog.info({ accessId, botId: body.bot_id, type }, "access token created");
      return json(access, 201);
    }

    if (req.method === "DELETE" && id) {
      queries.deleteAccess(id);
      apiLog.info({ id }, "access token deleted");
      return json({ ok: true });
    }
  }

  if (resource === "dashboard" && req.method === "GET") {
    const bots = queries.listBots();
    const accounts = queries.listAccounts();
    const access = queries.listAccess();
    return json({
      total_automates: accounts.length,
      total_bots: bots.length,
      total_access: access.length,
      connected_bots: bots.filter((b) => b.status === "connected").length,
      online_automates: accounts.filter((a) => a.status === "online").length,
      running_skill: accounts.filter((a) => a.skill_up_running).length,
      running_training: accounts.filter((a) => a.auto_war_running).length,
      running_work: accounts.filter((a) => a.auto_work_running).length,
      total_balance: accounts.reduce((sum, a) => sum + (a.balance || 0), 0),
      total_diamond: accounts.reduce((sum, a) => sum + (a.diamond || 0), 0),
    });
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
  api: `http://localhost:${PORT}/api/{bots,accounts,access,dashboard}`,
}, `BOIAuto server running`);

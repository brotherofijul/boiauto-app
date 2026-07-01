// /tests/api.test.js
import { test, expect, describe, beforeAll, beforeEach, afterAll } from "bun:test";
import db from "../src/db/index.js";
import { botsQueries } from "../src/db/queries/bots.js";
import { accessQueries } from "../src/db/queries/access.js";
import { automatesQueries } from "../src/db/queries/automates.js";
import { handleApi } from "../src/api/index.js";
import { genBotId, genToken, genAccessId } from "../src/utils/crypto.js";

function makeReq(method, body) {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeUrl(pathname) {
  return new URL(`http://localhost${pathname}`);
}

function setupBot(opts = {}) {
  const botId = opts.bot_id || genBotId();
  const token = opts.token || genToken();
  botsQueries.insert(botId, opts.name || "TestBot", token, opts.type || "Dual");
  return { botId, token };
}

function setupAccess(botId, opts = {}) {
  const accessId = opts.access_id || genAccessId();
  const token = opts.token || genToken();
  accessQueries.insert(accessId, token, botId, opts.name, opts.type || "Private", opts.price || 0);
  return { accessId, token };
}

describe("API routes", () => {
  beforeEach(() => {
    db.exec("DELETE FROM bots");
    db.exec("DELETE FROM access_tokens");
    db.exec("DELETE FROM automates");
  });

  describe("bots", () => {
    test("GET /api/bots returns empty array initially", async () => {
      const res = await handleApi(makeReq("GET"), makeUrl("/api/bots"));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data).toEqual([]);
    });

    test("POST /api/bots creates a bot", async () => {
      const token = genToken();
      const res = await handleApi(
        makeReq("POST", { token, name: "MyBot", type: "Dual" }),
        makeUrl("/api/bots")
      );
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.name).toBe("MyBot");
      expect(data.token).toBe(token);
      expect(data.type).toBe("Dual");
      expect(data.status).toBe("connecting");
    });

    test("POST /api/bots rejects missing token", async () => {
      const res = await handleApi(makeReq("POST", { name: "X" }), makeUrl("/api/bots"));
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/token/i);
    });

    test("POST /api/bots/generate-token returns token", async () => {
      const res = await handleApi(makeReq("POST"), makeUrl("/api/bots/generate-token"));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.token.startsWith("bot_")).toBe(true);
    });

    test("PATCH /api/bots/:id updates bot", async () => {
      const { botId } = setupBot({ name: "Old" });
      const bot = botsQueries.getByBotId(botId);
      const res = await handleApi(
        makeReq("PATCH", { name: "New", type: "Shared" }),
        makeUrl(`/api/bots/${bot.id}`)
      );
      const data = await res.json();
      expect(data.name).toBe("New");
      expect(data.type).toBe("Shared");
    });

    test("DELETE /api/bots/:id removes bot", async () => {
      const { botId } = setupBot();
      const bot = botsQueries.getByBotId(botId);
      const res = await handleApi(makeReq("DELETE"), makeUrl(`/api/bots/${bot.id}`));
      expect(res.status).toBe(200);
      expect(botsQueries.getByBotId(botId)).toBeNull();
    });
  });

  describe("access", () => {
    test("POST /api/access creates access token", async () => {
      const { botId } = setupBot();
      const res = await handleApi(
        makeReq("POST", { bot_id: botId, name: "John", type: "Private" }),
        makeUrl("/api/access")
      );
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.token.startsWith("acc_")).toBe(true);
      expect(data.type).toBe("Private");
    });

    test("POST /api/access rejects Business without price_per_day", async () => {
      const { botId } = setupBot();
      const res = await handleApi(
        makeReq("POST", { bot_id: botId, type: "Business" }),
        makeUrl("/api/access")
      );
      expect(res.status).toBe(400);
    });

    test("POST /api/access accepts Business with price_per_day", async () => {
      const { botId } = setupBot();
      const res = await handleApi(
        makeReq("POST", { bot_id: botId, type: "Business", price_per_day: 5.0 }),
        makeUrl("/api/access")
      );
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.price_per_day).toBe(5.0);
    });

    test("POST /api/access Dual bot rejects after 2 tokens", async () => {
      const { botId } = setupBot({ type: "Dual" });
      setupAccess(botId);
      setupAccess(botId);
      const res = await handleApi(
        makeReq("POST", { bot_id: botId, type: "Private" }),
        makeUrl("/api/access")
      );
      expect(res.status).toBe(400);
    });

    test("POST /api/access Shared bot allows unlimited tokens", async () => {
      const { botId } = setupBot({ type: "Shared" });
      for (let i = 0; i < 5; i++) {
        const res = await handleApi(
          makeReq("POST", { bot_id: botId, type: "Private" }),
          makeUrl("/api/access")
        );
        expect(res.status).toBe(201);
      }
    });
  });

  describe("automates", () => {
    test("POST /api/automates creates account via access_id", async () => {
      const { botId } = setupBot();
      const { accessId } = setupAccess(botId, { type: "Private" });
      const res = await handleApi(
        makeReq("POST", { bearer: "bearer-tok", access_id: accessId }),
        makeUrl("/api/automates")
      );
      const data = await res.json();
      expect(res.status).toBe(201);
      expect(data.bearer).toBe("bearer-tok");
      expect(data.access_id).toBe(accessId);
      expect(data.bot_id).toBe(botId);
      expect(data.type).toBe("Private");
    });

    test("POST /api/automates rejects Private access after 1 account", async () => {
      const { botId } = setupBot();
      const { accessId } = setupAccess(botId, { type: "Private" });
      await handleApi(makeReq("POST", { bearer: "b1", access_id: accessId }), makeUrl("/api/automates"));
      const res = await handleApi(
        makeReq("POST", { bearer: "b2", access_id: accessId }),
        makeUrl("/api/automates")
      );
      expect(res.status).toBe(400);
    });

    test("POST /api/automates allows Shared access unlimited", async () => {
      const { botId } = setupBot();
      const { accessId } = setupAccess(botId, { type: "Shared" });
      for (let i = 0; i < 3; i++) {
        const res = await handleApi(
          makeReq("POST", { bearer: `b${i}`, access_id: accessId }),
          makeUrl("/api/automates")
        );
        expect(res.status).toBe(201);
      }
    });

    test("POST /api/automates rejects missing bearer", async () => {
      const { botId } = setupBot();
      const { accessId } = setupAccess(botId);
      const res = await handleApi(
        makeReq("POST", { access_id: accessId }),
        makeUrl("/api/automates")
      );
      expect(res.status).toBe(400);
    });

    test("POST /api/automates rejects missing access_id", async () => {
      const res = await handleApi(
        makeReq("POST", { bearer: "b" }),
        makeUrl("/api/automates")
      );
      expect(res.status).toBe(400);
    });
  });

  describe("dashboard", () => {
    test("GET /api/dashboard returns aggregated stats", async () => {
      const { botId } = setupBot();
      setupAccess(botId, { type: "Shared" });
      const res = await handleApi(makeReq("GET"), makeUrl("/api/dashboard"));
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.total_bots).toBe(1);
      expect(data.total_access).toBe(1);
      expect(data.total_automates).toBe(0);
      expect(data.connected_bots).toBe(0);
      expect(data.total_balance).toBe(0);
      expect(typeof data.running_skill).toBe("number");
    });
  });

  describe("unknown routes", () => {
    test("returns 404 for unknown resource", async () => {
      const res = await handleApi(makeReq("GET"), makeUrl("/api/unknown"));
      expect(res.status).toBe(404);
    });
  });
});

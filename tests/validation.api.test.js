// /tests/validation.api.test.js
import { test, expect, describe, beforeEach } from "bun:test";
import db from "../src/db/index.js";
import { botsQueries, accessQueries } from "../src/db/queries/index.js";
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

describe("API input validation", () => {
  beforeEach(() => {
    db.exec("DELETE FROM bots");
    db.exec("DELETE FROM access_tokens");
    db.exec("DELETE FROM automates");
  });

  describe("bots", () => {
    test("POST /api/bots rejects invalid token (XSS attempt)", async () => {
      const res = await handleApi(
        makeReq("POST", { token: "<script>alert(1)</script>", name: "X" }),
        makeUrl("/api/bots")
      );
      expect(res.status).toBe(400);
      const data = await res.json();
      expect(data.error).toMatch(/token/i);
    });

    test("POST /api/bots rejects token with spaces", async () => {
      const res = await handleApi(
        makeReq("POST", { token: "bot abc def", name: "X" }),
        makeUrl("/api/bots")
      );
      expect(res.status).toBe(400);
    });

    test("POST /api/bots/verify-token rejects invalid token format", async () => {
      const res = await handleApi(
        makeReq("POST", { token: "'; DROP TABLE bots; --" }),
        makeUrl("/api/bots/verify-token")
      );
      expect(res.status).toBe(400);
    });

    test("PATCH /api/bots/:id with non-string name returns 400", async () => {
      const { botId } = setupBot();
      const bot = botsQueries.getByBotId(botId);
      const res = await handleApi(
        makeReq("PATCH", { name: 123 }),
        makeUrl(`/api/bots/${bot.id}`)
      );
      expect(res.status).toBe(400);
    });

    test("PATCH /api/bots/:id with invalid id returns 400", async () => {
      const res = await handleApi(
        makeReq("PATCH", { name: "X" }),
        makeUrl("/api/bots/abc")
      );
      expect(res.status).toBe(400);
    });
  });

  describe("access", () => {
    test("POST /api/access rejects bot_id with wrong prefix", async () => {
      const res = await handleApi(
        makeReq("POST", { bot_id: "acc_abcdef", type: "Private" }),
        makeUrl("/api/access")
      );
      expect(res.status).toBe(400);
    });

    test("POST /api/access rejects Business with negative price", async () => {
      const { botId } = setupBot();
      const res = await handleApi(
        makeReq("POST", { bot_id: botId, type: "Business", price_per_day: -5 }),
        makeUrl("/api/access")
      );
      expect(res.status).toBe(400);
    });

    test("POST /api/access rejects Business with NaN price", async () => {
      const { botId } = setupBot();
      const res = await handleApi(
        makeReq("POST", { bot_id: botId, type: "Business", price_per_day: "abc" }),
        makeUrl("/api/access")
      );
      expect(res.status).toBe(400);
    });
  });

  describe("automates", () => {
    test("POST /api/automates rejects bearer with XSS", async () => {
      const { botId } = setupBot();
      const { accessId } = setupAccess(botId, { type: "Shared" });
      const res = await handleApi(
        makeReq("POST", { bearer: "<img src=x onerror=alert(1)>", access_id: accessId }),
        makeUrl("/api/automates")
      );
      expect(res.status).toBe(400);
    });

    test("POST /api/automates rejects invalid access_id format", async () => {
      const res = await handleApi(
        makeReq("POST", { bearer: "b", access_id: "not-an-access-id" }),
        makeUrl("/api/automates")
      );
      expect(res.status).toBe(400);
    });
  });
});

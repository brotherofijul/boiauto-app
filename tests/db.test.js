// /tests/db.test.js
import { test, expect, describe, beforeAll, beforeEach } from "bun:test";
import db from "../src/db/index.js";
import { botsQueries } from "../src/db/queries/bots.js";
import { accessQueries } from "../src/db/queries/access.js";
import { automatesQueries } from "../src/db/queries/automates.js";
import { genBotId, genToken, genAccessId } from "../src/utils/crypto.js";

function createTestBot(opts = {}) {
  const botId = opts.bot_id || genBotId();
  const token = opts.token || genToken();
  const name = opts.name || "TestBot";
  const type = opts.type || "Dual";
  botsQueries.insert(botId, name, token, type);
  return { botId, token, name, type };
}

function createTestAccess(botId, opts = {}) {
  const accessId = opts.access_id || genAccessId();
  const token = opts.token || genToken();
  const type = opts.type || "Private";
  const price = opts.price || 0;
  accessQueries.insert(accessId, token, botId, opts.name, type, price);
  return { accessId, token, type };
}

describe("database", () => {
  describe("bots queries", () => {
    beforeEach(() => {
      db.exec("DELETE FROM bots");
      db.exec("DELETE FROM access_tokens");
      db.exec("DELETE FROM automates");
    });

    test("insert and getByBotId", () => {
      const { botId, token, name } = createTestBot();
      const bot = botsQueries.getByBotId(botId);
      expect(bot).toBeDefined();
      expect(bot.bot_id).toBe(botId);
      expect(bot.token).toBe(token);
      expect(bot.name).toBe(name);
      expect(bot.status).toBe("connecting");
    });

    test("list returns all bots", () => {
      createTestBot({ name: "Bot1" });
      createTestBot({ name: "Bot2" });
      const list = botsQueries.list();
      expect(list.length).toBe(2);
    });

    test("getByToken finds by token", () => {
      const { botId, token } = createTestBot();
      const bot = botsQueries.getByToken(token);
      expect(bot.bot_id).toBe(botId);
    });

    test("setStatus updates status", () => {
      const { botId } = createTestBot();
      botsQueries.setStatus(botId, "connected");
      const bot = botsQueries.getByBotId(botId);
      expect(bot.status).toBe("connected");
    });

    test("update changes allowed fields only", () => {
      const { botId } = createTestBot();
      const bot = botsQueries.getByBotId(botId);
      botsQueries.update(bot.id, { name: "NewName", type: "Shared" });
      const updated = botsQueries.getByBotId(botId);
      expect(updated.name).toBe("NewName");
      expect(updated.type).toBe("Shared");
    });

    test("update ignores disallowed fields", () => {
      const { botId } = createTestBot();
      const bot = botsQueries.getByBotId(botId);
      botsQueries.update(bot.id, { status: "connected" });
      const updated = botsQueries.getByBotId(botId);
      expect(updated.status).toBe("connecting");
    });

    test("remove deletes bot", () => {
      const { botId } = createTestBot();
      const bot = botsQueries.getByBotId(botId);
      botsQueries.remove(bot.id);
      expect(botsQueries.getByBotId(botId)).toBeNull();
    });

    test("CHECK constraint rejects invalid type", () => {
      expect(() => {
        const botId = genBotId();
        const token = genToken();
        db.prepare("INSERT INTO bots (bot_id, name, token, type, status) VALUES (?, ?, ?, ?, 'connecting')")
          .run(botId, "BadBot", token, "Invalid");
      }).toThrow();
    });
  });

  describe("access queries", () => {
    beforeEach(() => {
      db.exec("DELETE FROM bots");
      db.exec("DELETE FROM access_tokens");
      db.exec("DELETE FROM automates");
    });

    test("insert and getByAccessId", () => {
      const { botId } = createTestBot();
      const { accessId, token, type } = createTestAccess(botId, { type: "Shared" });
      const access = accessQueries.getByAccessId(accessId);
      expect(access).toBeDefined();
      expect(access.access_id).toBe(accessId);
      expect(access.token).toBe(token);
      expect(access.type).toBe(type);
    });

    test("list returns access with bot_name + usage_count", () => {
      const { botId, name: botName } = createTestBot({ name: "MyBot" });
      createTestAccess(botId, { name: "Token1" });
      createTestAccess(botId, { name: "Token2" });
      const list = accessQueries.list();
      expect(list.length).toBe(2);
      expect(list[0].bot_name).toBe(botName);
      expect(list[0].usage_count).toBe(0);
    });

    test("countAutomatesByAccess counts linked automates", () => {
      const { botId } = createTestBot();
      const { accessId } = createTestAccess(botId, { type: "Shared" });
      automatesQueries.insert({ name: "Acc1", bearer: "b1", bot_id: botId, access_id: accessId, type: "Shared" });
      automatesQueries.insert({ name: "Acc2", bearer: "b2", bot_id: botId, access_id: accessId, type: "Shared" });
      expect(accessQueries.countAccountsByAccess(accessId)).toBe(2);
    });

    test("Business type stores price_per_day", () => {
      const { botId } = createTestBot();
      const { accessId } = createTestAccess(botId, { type: "Business", price: 5.5 });
      const access = accessQueries.getByAccessId(accessId);
      expect(access.price_per_day).toBe(5.5);
    });

    test("removing bot cascades to access tokens", () => {
      const { botId } = createTestBot();
      const { accessId } = createTestAccess(botId);
      const bot = botsQueries.getByBotId(botId);
      botsQueries.remove(bot.id);
      expect(accessQueries.getByAccessId(accessId)).toBeNull();
    });
  });

  describe("automates queries", () => {
    beforeEach(() => {
      db.exec("DELETE FROM bots");
      db.exec("DELETE FROM access_tokens");
      db.exec("DELETE FROM automates");
    });

    test("insert and getById", () => {
      const { botId } = createTestBot();
      const { accessId } = createTestAccess(botId);
      automatesQueries.insert({ name: "Acc", bearer: "tok", bot_id: botId, access_id: accessId, type: "Private" });
      const list = automatesQueries.list();
      expect(list.length).toBe(1);
      expect(list[0].name).toBe("Acc");
      expect(list[0].access_name).toBeNull();
      expect(list[0].bot_name).toBeDefined();
    });

    test("update changes fields", () => {
      const { botId } = createTestBot();
      const { accessId } = createTestAccess(botId);
      automatesQueries.insert({ name: "Acc", bearer: "tok", bot_id: botId, access_id: accessId, type: "Private" });
      const acc = automatesQueries.list()[0];
      automatesQueries.update(acc.id, { balance: 100.5, status: "online" });
      const updated = automatesQueries.getById(acc.id);
      expect(updated.balance).toBe(100.5);
      expect(updated.status).toBe("online");
    });
  });
});

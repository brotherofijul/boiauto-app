// /tests/crypto.test.js
import { test, expect, describe } from "bun:test";
import { genBotId, genToken, genAccessId, genAccessToken, randomHex, maskToken } from "../src/utils/crypto.js";

describe("crypto utils", () => {
  describe("genBotId", () => {
    test("returns string starting with 'bot_'", () => {
      const id = genBotId();
      expect(id.startsWith("bot_")).toBe(true);
    });

    test("generates unique ids", () => {
      const ids = new Set(Array.from({ length: 100 }, () => genBotId()));
      expect(ids.size).toBe(100);
    });

    test("has 14 hex chars after prefix (7 bytes)", () => {
      const id = genBotId();
      expect(id.length).toBe(4 + 14);
    });
  });

  describe("genToken", () => {
    test("returns string starting with 'bot_'", () => {
      const token = genToken();
      expect(token.startsWith("bot_")).toBe(true);
    });

    test("generates unique tokens", () => {
      const tokens = new Set(Array.from({ length: 100 }, () => genToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe("genAccessId", () => {
    test("returns string starting with 'acc_'", () => {
      const id = genAccessId();
      expect(id.startsWith("acc_")).toBe(true);
    });

    test("generates unique ids", () => {
      const ids = new Set(Array.from({ length: 100 }, () => genAccessId()));
      expect(ids.size).toBe(100);
    });
  });

  describe("genAccessToken", () => {
    test("returns string starting with 'acc_'", () => {
      const token = genAccessToken();
      expect(token.startsWith("acc_")).toBe(true);
    });

    test("generates unique tokens", () => {
      const tokens = new Set(Array.from({ length: 100 }, () => genAccessToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe("randomHex", () => {
    test("returns correct length for given bytes", () => {
      expect(randomHex(1).length).toBe(2);
      expect(randomHex(7).length).toBe(14);
      expect(randomHex(16).length).toBe(32);
    });

    test("only contains hex chars", () => {
      const hex = randomHex(32);
      expect(/^[0-9a-f]+$/.test(hex)).toBe(true);
    });
  });

  describe("maskToken", () => {
    test("returns '—' for empty", () => {
      expect(maskToken("")).toBe("—");
      expect(maskToken(null)).toBe("—");
      expect(maskToken(undefined)).toBe("—");
    });

    test("returns all bullets for short tokens (<=8)", () => {
      expect(maskToken("ab")).toBe("••");
      expect(maskToken("12345678")).toBe("••••••••");
    });

    test("masks middle, keeps first 4 + last 4", () => {
      const masked = maskToken("abcdefghijklmnop");
      expect(masked.startsWith("abcd")).toBe(true);
      expect(masked.endsWith("mnop")).toBe(true);
      expect(masked.length).toBeGreaterThan(8);
    });
  });
});

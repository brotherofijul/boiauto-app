// /tests/validate.test.js
import { test, expect, describe } from "bun:test";
import {
  sanitizeName,
  sanitizeToken,
  sanitizeBearer,
  sanitizeAccessId,
  sanitizeBotId,
  isValidPrice,
  clampInt,
  LIMITS,
} from "../src/utils/validate.js";

describe("validate utils", () => {
  describe("sanitizeName", () => {
    test("trims and slices to NAME_MAX", () => {
      expect(sanitizeName("  john  ")).toBe("john");
      const long = "x".repeat(LIMITS.NAME_MAX + 50);
      expect(sanitizeName(long).length).toBe(LIMITS.NAME_MAX);
    });

    test("returns null for non-strings", () => {
      expect(sanitizeName(null)).toBeNull();
      expect(sanitizeName(undefined)).toBeNull();
      expect(sanitizeName(123)).toBeNull();
    });

    test("returns empty string for whitespace-only", () => {
      expect(sanitizeName("   ")).toBe("");
    });
  });

  describe("sanitizeToken", () => {
    test("accepts valid token", () => {
      expect(sanitizeToken("bot_abc123")).toBe("bot_abc123");
      expect(sanitizeToken("acc_xyz.def-789")).toBe("acc_xyz.def-789");
    });

    test("rejects empty/too long", () => {
      expect(sanitizeToken("")).toBeNull();
      expect(sanitizeToken("   ")).toBeNull();
      const long = "x".repeat(LIMITS.TOKEN_MAX + 1);
      expect(sanitizeToken(long)).toBeNull();
    });

    test("rejects invalid chars (XSS prevention)", () => {
      expect(sanitizeToken("<script>alert(1)</script>")).toBeNull();
      expect(sanitizeToken("bot token with spaces")).toBeNull();
      expect(sanitizeToken("bot'OR'1'='1")).toBeNull();
    });
  });

  describe("sanitizeBearer", () => {
    test("accepts non-empty string under limit", () => {
      expect(sanitizeBearer("abc123")).toBe("abc123");
    });

    test("rejects empty / non-string / over limit", () => {
      expect(sanitizeBearer("")).toBeNull();
      expect(sanitizeBearer(null)).toBeNull();
      expect(sanitizeBearer(123)).toBeNull();
      expect(sanitizeBearer("x".repeat(LIMITS.BEARER_MAX + 1))).toBeNull();
    });
  });

  describe("sanitizeAccessId / sanitizeBotId", () => {
    test("accepts correctly prefixed ids", () => {
      expect(sanitizeAccessId("acc_abcdef123")).toBe("acc_abcdef123");
      expect(sanitizeBotId("bot_abcdef123")).toBe("bot_abcdef123");
    });

    test("rejects wrong prefix", () => {
      expect(sanitizeAccessId("bot_abcdef")).toBeNull();
      expect(sanitizeBotId("acc_abcdef")).toBeNull();
    });

    test("rejects invalid chars", () => {
      expect(sanitizeAccessId("acc_abc'OR'1")).toBeNull();
      expect(sanitizeBotId("bot_abc<script>")).toBeNull();
    });
  });

  describe("isValidPrice", () => {
    test("accepts positive finite numbers", () => {
      expect(isValidPrice(5)).toBe(true);
      expect(isValidPrice(5.5)).toBe(true);
      expect(isValidPrice("10")).toBe(true);
    });

    test("rejects zero, negative, NaN, Infinity, too large", () => {
      expect(isValidPrice(0)).toBe(false);
      expect(isValidPrice(-1)).toBe(false);
      expect(isValidPrice(NaN)).toBe(false);
      expect(isValidPrice(Infinity)).toBe(false);
      expect(isValidPrice(LIMITS.PRICE_MAX + 1)).toBe(false);
    });
  });

  describe("clampInt", () => {
    test("clamps to range", () => {
      expect(clampInt(5, 0, 10)).toBe(5);
      expect(clampInt(-1, 0, 10)).toBe(0);
      expect(clampInt(20, 0, 10)).toBe(10);
    });

    test("truncates floats", () => {
      expect(clampInt(5.9, 0, 10)).toBe(5);
    });

    test("returns min for non-numbers", () => {
      expect(clampInt("abc", 0, 10)).toBe(0);
      expect(clampInt(NaN, 0, 10)).toBe(0);
    });
  });
});

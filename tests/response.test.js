// /tests/response.test.js
import { test, expect, describe } from "bun:test";
import { json, error, readJson } from "../src/utils/response.js";

describe("response utils", () => {
  test("json returns Response with correct content-type", async () => {
    const res = json({ ok: true });
    expect(res).toBeInstanceOf(Response);
    expect(res.headers.get("Content-Type")).toBe("application/json");
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  test("json accepts custom status", () => {
    const res = json({ created: true }, 201);
    expect(res.status).toBe(201);
  });

  test("error returns 400 by default with error field", async () => {
    const res = error("Bad request");
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Bad request");
  });

  test("error accepts custom status", () => {
    const res = error("Not found", 404);
    expect(res.status).toBe(404);
  });

  test("readJson parses JSON body", async () => {
    const req = new Request("http://x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foo: "bar" }),
    });
    const data = await readJson(req);
    expect(data).toEqual({ foo: "bar" });
  });

  test("readJson returns null for invalid JSON", async () => {
    const req = new Request("http://x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const data = await readJson(req);
    expect(data).toBeNull();
  });
});

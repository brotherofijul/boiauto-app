// /tests/ws.test.js
import { test, expect, describe } from "bun:test";
import { WS_ROLES, WS_MESSAGES, BOT_COMMANDS } from "../src/ws/protocol.js";

describe("WS protocol constants", () => {
  test("WS_ROLES has bot and web", () => {
    expect(WS_ROLES.BOT).toBe("bot");
    expect(WS_ROLES.WEB).toBe("web");
  });

  test("WS_MESSAGES contains all expected types", () => {
    expect(WS_MESSAGES.AUTH).toBe("auth");
    expect(WS_MESSAGES.AUTH_OK).toBe("auth_ok");
    expect(WS_MESSAGES.AUTH_FAILED).toBe("auth_failed");
    expect(WS_MESSAGES.STATE_UPDATE).toBe("state_update");
    expect(WS_MESSAGES.COMMAND).toBe("command");
    expect(WS_MESSAGES.HEARTBEAT).toBe("heartbeat");
    expect(WS_MESSAGES.PING).toBe("ping");
    expect(WS_MESSAGES.PONG).toBe("pong");
  });

  test("BOT_COMMANDS has start/stop for each feature", () => {
    expect(BOT_COMMANDS.START_SKILL_UP).toBe("start_skill_up");
    expect(BOT_COMMANDS.STOP_SKILL_UP).toBe("stop_skill_up");
    expect(BOT_COMMANDS.START_AUTO_WAR).toBe("start_auto_war");
    expect(BOT_COMMANDS.STOP_AUTO_WAR).toBe("stop_auto_war");
    expect(BOT_COMMANDS.START_AUTO_WORK).toBe("start_auto_work");
    expect(BOT_COMMANDS.STOP_AUTO_WORK).toBe("stop_auto_work");
  });
});

// /src/ws/protocol.js
export const WS_ROLES = {
  BOT: "bot",
  WEB: "web",
};

export const WS_MESSAGES = {
  HELLO: "hello",
  AUTH: "auth",
  AUTH_OK: "auth_ok",
  AUTH_FAILED: "auth_failed",
  COMMAND: "command",
  STATE_UPDATE: "state_update",
  HEARTBEAT: "heartbeat",
  HEARTBEAT_ACK: "heartbeat_ack",
  PING: "ping",
  PONG: "pong",
  SNAPSHOT: "snapshot",
  BOT_STATUS: "bot_status",
  BOT_UPDATE: "bot_update",
  ACCOUNT_UPDATE: "account_update",
  ERROR: "error",
};

export const BOT_COMMANDS = {
  START_SKILL_UP: "start_skill_up",
  STOP_SKILL_UP: "stop_skill_up",
  START_AUTO_WAR: "start_auto_war",
  STOP_AUTO_WAR: "stop_auto_war",
  START_AUTO_WORK: "start_auto_work",
  STOP_AUTO_WORK: "stop_auto_work",
};

// /src/logger.js
import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

const transport = isProd
  ? undefined
  : {
      target: "pino-pretty",
      options: {
        colorize: true,
        levelFirst: true,
        translateTime: "HH:MM:ss",
        ignore: "pid,hostname",
        singleLine: false,
        messageFormat: "{msg}",
      },
    };

export const logger = pino({
  level: process.env.LOG_LEVEL || (isProd ? "info" : "debug"),
  base: null,
  transport,
});

export default logger;

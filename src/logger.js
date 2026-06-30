// /src/logger.js
import pino from "pino";
import { config } from "./config.js";

const transport = config.isProd
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
  level: config.logLevel,
  base: null,
  transport,
});

export default logger;

const levels = {
  info: "INFO",
  warn: "WARN",
  error: "ERROR",
  debug: "DEBUG",
};

const log = (level, message, meta = {}) => {
  const entry = {
    timestamp: new Date().toISOString(),
    level: levels[level] ?? "INFO",
    message,
    ...(Object.keys(meta).length > 0 && { meta }),
  };

  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
};

const logger = {
  info:  (msg, meta = {}) => log("info",  msg, meta),
  warn:  (msg, meta = {}) => log("warn",  msg, meta),
  error: (msg, meta = {}) => log("error", msg, meta),
  debug: (msg, meta = {}) => {
    if (process.env.NODE_ENV === "development") {
      log("debug", msg, meta);
    }
  },
};

export default logger;
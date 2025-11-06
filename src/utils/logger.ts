type LogLevel = "debug" | "info" | "warn" | "error";

const levelPriority: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const envLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
const activeLevel = levelPriority[envLevel] ?? levelPriority.info;

function base(fields?: Record<string, unknown>) {
  return {
    ts: new Date().toISOString(),
    ...fields,
  };
}

function write(level: LogLevel, message: string, fields?: Record<string, unknown>) {
  if (levelPriority[level] < activeLevel) return;
  const line = JSON.stringify({ level, msg: message, ...base(fields) });
  // eslint-disable-next-line no-console
  console.log(line);
}

export const logger = {
  debug: (msg: string, fields?: Record<string, unknown>) => write("debug", msg, fields),
  info: (msg: string, fields?: Record<string, unknown>) => write("info", msg, fields),
  warn: (msg: string, fields?: Record<string, unknown>) => write("warn", msg, fields),
  error: (msg: string, fields?: Record<string, unknown>) => write("error", msg, fields),
};



import * as fs from "fs";
import * as path from "path";

const LOG_DIR = process.env.LOG_DIR || "./logs";

type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  component: string;
  message: string;
  data?: unknown;
  durationMs?: number;
}

function ensureLogDir() {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  } catch {
    // ignore — may not have fs access in some environments
  }
}

function formatEntry(entry: LogEntry): string {
  const parts = [
    `[${entry.timestamp}]`,
    `[${entry.level.padEnd(5)}]`,
    `[${entry.component}]`,
    entry.message,
  ];
  if (entry.durationMs !== undefined) {
    parts.push(`(${entry.durationMs}ms)`);
  }
  if (entry.data) {
    const dataStr =
      typeof entry.data === "string"
        ? entry.data
        : JSON.stringify(entry.data, null, 2);
    // Truncate very large data
    parts.push(dataStr.length > 2000 ? dataStr.substring(0, 2000) + "..." : dataStr);
  }
  return parts.join(" ");
}

function writeToFile(entry: LogEntry, filename: string) {
  try {
    ensureLogDir();
    const filePath = path.join(LOG_DIR, filename);
    const line = formatEntry(entry) + "\n";
    fs.appendFileSync(filePath, line);
  } catch {
    // silent fail — logging should never crash the app
  }
}

export function createLogger(component: string) {
  const log = (level: LogLevel, message: string, data?: unknown, durationMs?: number) => {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      component,
      message,
      data,
      durationMs,
    };

    // Always write to console
    const formatted = formatEntry(entry);
    if (level === "ERROR") {
      console.error(formatted);
    } else if (level === "WARN") {
      console.warn(formatted);
    } else {
      console.log(formatted);
    }

    // Write to combined log file
    writeToFile(entry, "nightshift.log");

    // Write errors to separate error log
    if (level === "ERROR") {
      writeToFile(entry, "error.log");
    }

    // Write agent-specific logs
    if (component.startsWith("agent")) {
      writeToFile(entry, "agent.log");
    }
  };

  return {
    debug: (msg: string, data?: unknown) => log("DEBUG", msg, data),
    info: (msg: string, data?: unknown) => log("INFO", msg, data),
    warn: (msg: string, data?: unknown) => log("WARN", msg, data),
    error: (msg: string, data?: unknown) => log("ERROR", msg, data),
    /** Log with duration tracking */
    timed: (msg: string, durationMs: number, data?: unknown) =>
      log("INFO", msg, data, durationMs),
  };
}

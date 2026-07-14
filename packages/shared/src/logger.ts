import { mkdirSync, appendFileSync, readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  data?: unknown;
}

const GLYPH: Record<LogLevel, string> = {
  debug: "\x1b[2m●\x1b[0m",
  info: "\x1b[38;2;124;140;255m●\x1b[0m",
  warn: "\x1b[38;2;255;182;72m▲\x1b[0m",
  error: "\x1b[38;2;255;107;74m✕\x1b[0m",
};

let globalMinLevel: LogLevel = "info";
let logFilePath: string | null = null;

function getLogDir(): string {
  const dir = join(homedir(), ".korvid", "logs");
  mkdirSync(dir, { recursive: true });
  return dir;
}

function getLogFile(): string {
  if (logFilePath) return logFilePath;
  const today = new Date().toISOString().slice(0, 10);
  logFilePath = join(getLogDir(), `${today}.log`);
  return logFilePath;
}

export function setLogLevel(level: LogLevel): void {
  globalMinLevel = level;
}

export function getLogLevel(): LogLevel {
  return globalMinLevel;
}

export function createLogger(module: string) {
  function log(level: LogLevel, message: string, data?: unknown): void {
    if (LEVEL_PRIORITY[level] < LEVEL_PRIORITY[globalMinLevel]) return;

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      data,
    };

    // Write to file
    try {
      const line = JSON.stringify(entry) + "\n";
      appendFileSync(getLogFile(), line, "utf-8");
    } catch {}

    // Write to stderr (keep stdout clean for CLI output)
    const glyph = GLYPH[level];
    const ts = entry.timestamp.slice(11, 19);
    const mod = `\x1b[2m${module}\x1b[0m`;
    const dataStr = data !== undefined ? ` \x1b[2m${JSON.stringify(data)}\x1b[0m` : "";
    process.stderr.write(`  ${glyph} ${ts} ${mod} ${message}${dataStr}\n`);
  }

  return {
    debug: (msg: string, data?: unknown) => log("debug", msg, data),
    info: (msg: string, data?: unknown) => log("info", msg, data),
    warn: (msg: string, data?: unknown) => log("warn", msg, data),
    error: (msg: string, data?: unknown) => log("error", msg, data),
  };
}

export function readRecentLogs(lines: number = 50): LogEntry[] {
  const file = getLogFile();
  if (!existsSync(file)) return [];
  try {
    const content = readFileSync(file, "utf-8");
    const allLines = content.trim().split("\n").filter(Boolean);
    return allLines.slice(-lines).map((line) => {
      try { return JSON.parse(line) as LogEntry; }
      catch { return { timestamp: new Date().toISOString(), level: "info" as LogLevel, module: "unknown", message: line }; }
    });
  } catch {
    return [];
  }
}

export function formatLogEntry(entry: LogEntry): string {
  const glyph = GLYPH[entry.level];
  const ts = entry.timestamp.slice(11, 19);
  const mod = `\x1b[2m${entry.module}\x1b[0m`;
  const dataStr = entry.data !== undefined ? ` \x1b[2m${JSON.stringify(entry.data)}\x1b[0m` : "";
  return `  ${glyph} ${ts} ${mod} ${entry.message}${dataStr}`;
}

import { Command } from "commander";
import * as p from "@clack/prompts";
import { readRecentLogs, formatLogEntry, setLogLevel, getLogLevel } from "@korvid/shared/logger.js";

export const logsCommand = new Command("logs")
  .description("View recent Korvid logs")
  .option("-n, --lines <n>", "Number of lines to show", "50")
  .option("-l, --level <level>", "Filter by level (debug/info/warn/error)")
  .option("-f, --follow", "Follow log output (live)")
  .action(async (opts) => {
    p.intro("Korvid Logs");

    const level = opts.level as string | undefined;
    if (level && ["debug", "info", "warn", "error"].includes(level)) {
      setLogLevel(level as any);
    }

    const lines = parseInt(opts.lines, 10) || 50;
    let logs = readRecentLogs(lines);

    if (level) {
      const minPriority: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
      const min = minPriority[level] ?? 0;
      logs = logs.filter((e) => (minPriority[e.level] ?? 0) >= min);
    }

    if (logs.length === 0) {
      p.log.info("No logs found. Logs are written to ~/.korvid/logs/");
    } else {
      for (const entry of logs) {
        console.log(formatLogEntry(entry));
      }
    }

    if (opts.follow) {
      p.log.info("Following logs... (Ctrl+C to stop)");
      let lastSize = 0;
      try {
        const { readFileSync, existsSync } = await import("node:fs");
        const { join } = await import("node:path");
        const { homedir } = await import("node:os");
        const logFile = join(homedir(), ".korvid", "logs", `${new Date().toISOString().slice(0, 10)}.log`);

        const poll = setInterval(() => {
          if (!existsSync(logFile)) return;
          try {
            const content = readFileSync(logFile, "utf-8");
            if (content.length > lastSize) {
              const newContent = content.slice(lastSize);
              lastSize = content.length;
              const newLines = newContent.trim().split("\n").filter(Boolean);
              for (const line of newLines) {
                try {
                  const entry = JSON.parse(line);
                  if (level) {
                    const minP: Record<string, number> = { debug: 0, info: 1, warn: 2, error: 3 };
                    if ((minP[entry.level] ?? 0) < (minP[level] ?? 0)) continue;
                  }
                  console.log(formatLogEntry(entry));
                } catch {}
              }
            }
          } catch {}
        }, 1000);

        process.on("SIGINT", () => { clearInterval(poll); process.exit(0); });
        await new Promise(() => {});
      } catch {}
    }

    p.outro("");
  });

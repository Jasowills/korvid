import { execFileSync } from "node:child_process";
import { z } from "zod";
import type { Tool } from "./types.js";

const openAppParams = z.object({
  name: z.string().min(1).max(200).describe("Application name to open (e.g. 'Finder', 'Safari', 'Visual Studio Code')"),
});

const closeAppParams = z.object({
  name: z.string().min(1).max(200).describe("Application name to close"),
  force: z.boolean().optional().describe("Force quit (default: false, uses SIGTERM first)"),
});

const listAppsParams = z.object({
  filter: z.string().optional().describe("Filter apps by name substring"),
});

function validateAppName(name: string): boolean {
  return /^[a-zA-Z0-9\s.\-_]+$/.test(name);
}

export const openAppTool: Tool = {
  name: "open_app",
  description: "Open an application",
  parameters: openAppParams,
  dangerous: false,
  category: "app",
  async execute(params) {
    const p = openAppParams.parse(params);
    if (!validateAppName(p.name)) {
      return { success: false, output: "", error: "Invalid application name" };
    }
    try {
      const platform = process.platform;
      if (platform === "darwin") {
        execFileSync("open", ["-a", p.name], { timeout: 10000, stdio: "pipe" });
      } else if (platform === "win32") {
        execFileSync("cmd", ["/c", "start", "", p.name], { timeout: 10000, stdio: "pipe" });
      } else {
        execFileSync("xdg-open", [p.name], { timeout: 10000, stdio: "pipe" });
      }
      return { success: true, output: `Opened ${p.name}` };
    } catch (err) {
      return { success: false, output: "", error: `Failed to open ${p.name}: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

export const closeAppTool: Tool = {
  name: "close_app",
  description: "Close/quit an application",
  parameters: closeAppParams,
  dangerous: true,
  category: "app",
  async execute(params) {
    const p = closeAppParams.parse(params);
    if (!validateAppName(p.name)) {
      return { success: false, output: "", error: "Invalid application name" };
    }
    try {
      const platform = process.platform;
      if (platform === "win32") {
        const flag = p.force ? "/F" : "";
        execFileSync("taskkill", ["/IM", `${p.name}.exe`, flag].filter(Boolean), { timeout: 10000, stdio: "pipe" });
      } else if (p.force) {
        execFileSync("killall", ["-9", p.name], { timeout: 10000, stdio: "pipe" });
      } else {
        try {
          execFileSync("killall", [p.name], { timeout: 5000, stdio: "pipe" });
        } catch {
          execFileSync("killall", ["-9", p.name], { timeout: 5000, stdio: "pipe" });
        }
      }
      return { success: true, output: `Closed ${p.name}` };
    } catch (err) {
      return { success: false, output: "", error: `Failed to close ${p.name}: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

export const listAppsTool: Tool = {
  name: "list_apps",
  description: "List currently running applications",
  parameters: listAppsParams,
  dangerous: false,
  category: "app",
  async execute(params) {
    const p = listAppsParams.parse(params);
    try {
      const platform = process.platform;
      let output: string;
      if (platform === "win32") {
        output = execFileSync("tasklist", ["/FO", "CSV", "/NH"], { timeout: 5000, encoding: "utf-8" });
        output = output.split("\n").map((line) => {
          const match = line.match(/"([^"]+)"/);
          return match?.[1] ?? "";
        }).filter(Boolean).join("\n");
      } else if (platform === "darwin") {
        output = execFileSync("ps", ["-axco", "comm"], { timeout: 5000, encoding: "utf-8" });
      } else {
        output = execFileSync("ps", ["-eo", "comm", "--sort=-comm"], { timeout: 5000, encoding: "utf-8" });
      }
      let apps = output.split("\n").filter((l) => l.trim() && !l.startsWith("-") && !l.startsWith("COMMAND"));
      if (p.filter) {
        const filterLower = p.filter.toLowerCase();
        apps = apps.filter((a) => a.toLowerCase().includes(filterLower));
      }
      return { success: true, output: apps.join("\n"), metadata: { count: apps.length } };
    } catch (err) {
      return { success: false, output: "", error: `Failed to list apps: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

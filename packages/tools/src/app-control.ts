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
  // Only allow alphanumeric, spaces, hyphens, dots, and common app name chars
  return /^[a-zA-Z0-9\s.\-_]+$/.test(name);
}

export const openAppTool: Tool = {
  name: "open_app",
  description: "Open an application on the Mac",
  parameters: openAppParams,
  dangerous: false,
  category: "app",
  async execute(params) {
    const p = openAppParams.parse(params);
    if (!validateAppName(p.name)) {
      return { success: false, output: "", error: "Invalid application name" };
    }
    try {
      execFileSync("open", ["-a", p.name], { timeout: 10000, stdio: "pipe" });
      return { success: true, output: `Opened ${p.name}` };
    } catch (err) {
      return { success: false, output: "", error: `Failed to open ${p.name}: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

export const closeAppTool: Tool = {
  name: "close_app",
  description: "Close/quit an application on the Mac",
  parameters: closeAppParams,
  dangerous: true,
  category: "app",
  async execute(params) {
    const p = closeAppParams.parse(params);
    if (!validateAppName(p.name)) {
      return { success: false, output: "", error: "Invalid application name" };
    }
    try {
      if (p.force) {
        execFileSync("killall", ["-9", p.name], { timeout: 10000, stdio: "pipe" });
      } else {
        try {
          execFileSync("killall", [p.name], { timeout: 5000, stdio: "pipe" });
        } catch {
          // SIGTERM may not work, escalate to SIGKILL
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
      const output = execFileSync("ps", ["-axco", "comm"], { timeout: 5000, encoding: "utf-8" });
      let apps = output.split("\n").filter((l) => l.trim() && !l.startsWith("-"));
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

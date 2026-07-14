import { execFileSync } from "node:child_process";
import { z } from "zod";
import type { Tool } from "./types.js";

const BLOCKED_PATTERNS = [/rm\s+(-\w*\s+)*\/($|\s)/, /mkfs/, /dd\s+if=/, /\:\(\)\{.*\|\:.*\}\;/];

const runCommandParams = z.object({
  command: z.string().min(1).describe("Shell command to execute"),
  cwd: z.string().optional().describe("Working directory (defaults to current)"),
  timeout: z.number().optional().describe("Timeout in milliseconds (default: 30000)"),
});

export const runCommandTool: Tool = {
  name: "run_command",
  description: "Execute a shell command (use with caution — destructive commands require confirmation)",
  parameters: runCommandParams,
  dangerous: true,
  category: "system",
  async execute(params) {
    const p = runCommandParams.parse(params);

    // Check for blocked patterns
    for (const blocked of BLOCKED_PATTERNS) {
      if (blocked.test(p.command)) {
        return { success: false, output: "", error: `Blocked dangerous command pattern` };
      }
    }

    const timeout = Math.min(p.timeout ?? 30000, 60000);

    try {
      const isWin = process.platform === "win32";
      const shell = isWin ? "cmd.exe" : "sh";
      const flag = isWin ? "/c" : "-c";

      const result = execFileSync(shell, [flag, p.command], {
        timeout,
        encoding: "utf-8",
        cwd: p.cwd,
        stdio: ["pipe", "pipe", "pipe"],
        maxBuffer: 1024 * 1024,
      });
      return { success: true, output: result || "(no output)" };
    } catch (err: unknown) {
      const execErr = err as { status?: number; stderr?: string; message?: string };
      return {
        success: false,
        output: execErr.stderr ?? "",
        error: `Command failed (exit ${execErr.status ?? "unknown"}): ${execErr.message ?? String(err)}`,
        metadata: { exitCode: execErr.status },
      };
    }
  },
};

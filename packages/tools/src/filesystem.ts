import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync, readdirSync, statSync, realpathSync } from "node:fs";
import { resolve, join } from "node:path";
import { z } from "zod";
import type { Tool } from "./types.js";

const BLOCKED_PATHS = ["/etc", "/System", "/usr/bin", "/usr/sbin"];
const MAX_FILE_SIZE = 1024 * 1024; // 1MB

function isPathSafe(filePath: string): { safe: boolean; reason?: string } {
  const resolved = resolve(filePath);
  let realPath: string;
  try {
    realPath = realpathSync(resolve(filePath));
  } catch {
    realPath = resolved;
  }
  // Check both the logical path and the real path (after symlink resolution)
  for (const pathToCheck of [resolved, realPath]) {
    for (const blocked of BLOCKED_PATHS) {
      if (pathToCheck === blocked || pathToCheck.startsWith(blocked + "/")) {
        return { safe: false, reason: `Path ${pathToCheck} is in blocked directory ${blocked}` };
      }
    }
  }
  return { safe: true };
}

const listFilesParams = z.object({
  path: z.string().describe("Directory path to list"),
  recursive: z.boolean().optional().describe("List recursively (default: false)"),
  maxDepth: z.number().optional().describe("Max recursion depth (default: 2)"),
});

const readFileParams = z.object({
  path: z.string().describe("File path to read"),
  maxBytes: z.number().optional().describe("Max bytes to read (default: 1MB)"),
});

const writeFileParams = z.object({
  path: z.string().describe("File path to write"),
  content: z.string().describe("Content to write"),
  append: z.boolean().optional().describe("Append instead of overwrite (default: false)"),
});

export const listFilesTool: Tool = {
  name: "list_files",
  description: "List files in a directory",
  parameters: listFilesParams,
  dangerous: false,
  category: "filesystem",
  async execute(params) {
    const p = listFilesParams.parse(params);
    const safety = isPathSafe(p.path);
    if (!safety.safe) return { success: false, output: "", error: safety.reason };

    try {
      const dirPath = resolve(p.path);
      const maxDepth = p.recursive ? (p.maxDepth ?? 2) : 1;
      const entries: string[] = [];

      function walk(dir: string, depth: number) {
        if (depth > maxDepth) return;
        for (const entry of readdirSync(dir)) {
          const full = join(dir, entry);
          const rel = full.slice(dirPath.length + 1);
          const stat = statSync(full);
          const prefix = stat.isDirectory() ? "📁" : "📄";
          entries.push(`${prefix} ${rel}${stat.isDirectory() ? "/" : ` (${stat.size}B)`}`);
          if (stat.isDirectory() && depth < maxDepth) walk(full, depth + 1);
        }
      }

      walk(dirPath, 1);
      return { success: true, output: entries.join("\n") || "(empty directory)", metadata: { count: entries.length } };
    } catch (err) {
      return { success: false, output: "", error: `Failed to list files: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

export const readFileTool: Tool = {
  name: "read_file",
  description: "Read the contents of a file",
  parameters: readFileParams,
  dangerous: false,
  category: "filesystem",
  async execute(params) {
    const p = readFileParams.parse(params);
    const safety = isPathSafe(p.path);
    if (!safety.safe) return { success: false, output: "", error: safety.reason };

    try {
      const filePath = resolve(p.path);
      const stat = statSync(filePath);
      const maxBytes = p.maxBytes ?? MAX_FILE_SIZE;
      if (stat.size > maxBytes) {
        return { success: false, output: "", error: `File too large: ${stat.size} bytes (max: ${maxBytes})` };
      }

      const content = readFileSync(filePath, "utf-8");
      return { success: true, output: content, metadata: { size: stat.size, path: filePath } };
    } catch (err) {
      return { success: false, output: "", error: `Failed to read file: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

export const writeFileTool: Tool = {
  name: "write_file",
  description: "Write content to a file (creates or overwrites)",
  parameters: writeFileParams,
  dangerous: true,
  category: "filesystem",
  async execute(params) {
    const p = writeFileParams.parse(params);
    const safety = isPathSafe(p.path);
    if (!safety.safe) return { success: false, output: "", error: safety.reason };

    try {
      const filePath = resolve(p.path);
      writeFileSync(filePath, p.content, { flag: p.append ? "a" : "w" });
      const bytesWritten = Buffer.byteLength(p.content, "utf-8");
      return { success: true, output: `Written ${bytesWritten} bytes to ${filePath}` };
    } catch (err) {
      return { success: false, output: "", error: `Failed to write file: ${err instanceof Error ? err.message : String(err)}` };
    }
  },
};

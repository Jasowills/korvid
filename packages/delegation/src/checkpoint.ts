import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";

export interface Checkpoint {
  hash: string;
  message: string;
  timestamp: number;
}

function validateGitHash(hash: string): boolean {
  return /^[0-9a-f]{40}$/.test(hash) || /^[0-9a-f]{7,40}$/.test(hash);
}

function sanitizeCommitMessage(message: string): string {
  // Remove characters that could break shell quoting
  return message.replace(/["`$\\]/g, "").replace(/\n/g, " ").slice(0, 200);
}

export function createCheckpoint(opts: { workspacePath: string; message: string }): Checkpoint | null {
  const { workspacePath, message } = opts;

  if (!existsSync(workspacePath)) return null;

  try {
    // Check if it's a git repo
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: workspacePath,
      stdio: "pipe",
    });

    // Stage all changes
    execFileSync("git", ["add", "-A"], {
      cwd: workspacePath,
      stdio: "pipe",
      timeout: 10000,
    });

    // Check if there are changes to commit
    const status = execFileSync("git", ["status", "--porcelain"], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    if (!status) return null; // Nothing to commit

    // Create checkpoint commit with sanitized message
    const commitMsg = sanitizeCommitMessage(`[korvid-checkpoint] ${message}`);
    execFileSync("git", ["commit", "-m", commitMsg, "--allow-empty"], {
      cwd: workspacePath,
      stdio: "pipe",
      timeout: 10000,
    });

    const hash = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    const timestampStr = execFileSync("git", ["log", "-1", "--format=%cI"], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    return { hash, message: commitMsg, timestamp: new Date(timestampStr).getTime() || Date.now() };
  } catch {
    return null;
  }
}

export function listCheckpoints(workspacePath: string, limit = 20): Checkpoint[] {
  if (!existsSync(workspacePath)) return [];

  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: workspacePath,
      stdio: "pipe",
    });

    const log = execFileSync("git", ["log", `--max-count=${limit}`, "--grep=korvid-checkpoint", "--format=%H %cI %s"], {
      cwd: workspacePath,
      encoding: "utf-8",
      timeout: 5000,
    }).trim();

    if (!log) return [];

    return log.split("\n").map((line) => {
      const [hash, timestamp, ...rest] = line.split(" ");
      return {
        hash: hash!,
        message: rest.join(" ").replace(/^\[korvid-checkpoint\]\s*/, ""),
        timestamp: new Date(timestamp!).getTime() || Date.now(),
      };
    });
  } catch {
    return [];
  }
}

export function rollbackToCheckpoint(workspacePath: string, hash: string): boolean {
  if (!validateGitHash(hash)) return false;
  try {
    execFileSync("git", ["reset", "--hard", hash], {
      cwd: workspacePath,
      stdio: "pipe",
      timeout: 10000,
    });
    return true;
  } catch {
    return false;
  }
}

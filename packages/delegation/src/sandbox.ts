import { execFileSync, spawn } from "node:child_process";
import { mkdirSync, existsSync, rmSync, cpSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir, homedir } from "node:os";

export interface Sandbox {
  id: string;
  workDir: string;
  create(): Promise<void>;
  run(command: string, opts?: { timeout?: number; env?: Record<string, string> }): Promise<{ stdout: string; stderr: string; exitCode: number }>;
  destroy(): Promise<void>;
}

function validateWorkspacePath(path: string): boolean {
  return resolve(path) === path && !/[;&|`$()]/.test(path);
}

let dockerAvailable: boolean | null = null;

function isDockerAvailable(): boolean {
  if (dockerAvailable !== null) return dockerAvailable;
  try {
    execFileSync("docker", ["info"], { timeout: 5000, stdio: "pipe" });
    dockerAvailable = true;
  } catch {
    dockerAvailable = false;
  }
  return dockerAvailable;
}

async function createGitWorktree(workDir: string, workspacePath?: string) {
  if (!workspacePath || !existsSync(workspacePath)) return;

  if (!validateWorkspacePath(workspacePath)) {
    throw new Error("Invalid workspace path");
  }

  try {
    execFileSync("git", ["rev-parse", "--is-inside-work-tree"], {
      cwd: workspacePath,
      stdio: "pipe",
    });

    const branchName = `delegation-${Date.now()}`;
    execFileSync("git", ["worktree", "add", workDir, "-b", branchName], {
      cwd: workspacePath,
      stdio: "pipe",
      timeout: 30000,
    });
  } catch {
    cpSync(workspacePath, workDir, { recursive: true });
  }
}

function runInDocker(containerName: string, command: string, timeout: number) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
    const proc = spawn("docker", ["exec", containerName, "sh", "-c", command], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ stdout, stderr: stderr + "\n[SANDBOX] Killed: timeout exceeded", exitCode: -1 });
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? -1 });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: -1 });
    });
  });
}

function runLocal(workDir: string, command: string, timeout: number, env?: Record<string, string>) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve) => {
    // Only pass safe env vars — never leak the full process.env
    const safeEnv: Record<string, string> = {
      PATH: process.env.PATH ?? (process.platform === "win32" ? "C:\\Windows\\system32;C:\\Windows" : "/usr/local/bin:/usr/bin:/bin"),
      HOME: process.env.HOME ?? process.env.USERPROFILE ?? homedir(),
      USER: process.env.USER ?? process.env.USERNAME ?? "unknown",
      NODE_ENV: process.env.NODE_ENV ?? "production",
      ...(env ?? {}),
    };

    const isWin = process.platform === "win32";
    const shell = isWin ? "cmd.exe" : "sh";
    const flag = isWin ? "/c" : "-c";

    const proc = spawn(shell, [flag, command], {
      cwd: workDir,
      env: safeEnv,
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    proc.stdout?.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr?.on("data", (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill("SIGKILL");
      resolve({ stdout, stderr: stderr + "\n[SANDBOX] Killed: timeout exceeded", exitCode: -1 });
    }, timeout);

    proc.on("close", (code) => {
      clearTimeout(timer);
      resolve({ stdout, stderr, exitCode: code ?? -1 });
    });

    proc.on("error", (err) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: err.message, exitCode: -1 });
    });
  });
}

export function createSandbox(opts: {
  id?: string;
  image?: string;
  workspacePath?: string;
  networkAllowlist?: string[];
  cpuLimit?: string;
  memoryLimit?: string;
  timeoutMinutes?: number;
  useDocker?: boolean;
}): Sandbox {
  const id = opts.id ?? `sandbox-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const workDir = join(tmpdir(), "korvid-sandbox", id);
  const useDocker = opts.useDocker !== false && isDockerAvailable();
  const image = opts.image ?? "node:20-slim";
  const containerName = `korvid-sandbox-${id}`;

  return {
    id,
    workDir,

    async create() {
      mkdirSync(workDir, { recursive: true });

      if (useDocker) {
        try {
          const args = [
            "run", "-d",
            "--name", containerName,
            "-v", `${workDir}:/workspace`,
            "-w", "/workspace",
          ];

          if (opts.cpuLimit) args.push("--cpus", opts.cpuLimit);
          if (opts.memoryLimit) args.push("--memory", opts.memoryLimit);

          if (opts.networkAllowlist && opts.networkAllowlist.length > 0) {
            args.push("--network", "korvid-sandbox-net");
          } else {
            args.push("--network", "none");
          }

          args.push(image, "sleep", String((opts.timeoutMinutes ?? 30) * 60));

          execFileSync("docker", args, { timeout: 60000, stdio: "pipe" });
          console.log(`[sandbox] Docker container ${containerName} created`);
        } catch (err) {
          console.warn(`[sandbox] Docker creation failed, falling back to git worktree: ${err}`);
          await createGitWorktree(workDir, opts.workspacePath);
        }
      } else {
        await createGitWorktree(workDir, opts.workspacePath);
      }
    },

    async run(command: string, opts2?: { timeout?: number; env?: Record<string, string> }) {
      const timeout = opts2?.timeout ?? (opts.timeoutMinutes ?? 30) * 60 * 1000;

      if (useDocker) {
        return runInDocker(containerName, command, timeout);
      }

      return runLocal(workDir, command, timeout, opts2?.env);
    },

    async destroy() {
      if (useDocker) {
        try {
          execFileSync("docker", ["rm", "-f", containerName], { stdio: "pipe", timeout: 10000 });
        } catch {
          // ignore
        }
      }

      try {
        execFileSync("git", ["worktree", "remove", workDir, "--force"], {
          stdio: "pipe",
          timeout: 10000,
        });
      } catch {
        // ignore
      }

      if (existsSync(workDir)) {
        rmSync(workDir, { recursive: true, force: true });
      }
    },
  };
}

export function checkDockerAvailable(): boolean {
  return isDockerAvailable();
}

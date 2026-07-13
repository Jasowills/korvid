import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { type KorvidConfig } from "@korvid/shared";
import { WebSocket } from "ws";

function findOpenClawBinary(): string {
  // Try to find openclaw in pnpm node_modules structure
  const pkgDir = dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = join(pkgDir, "..", "..", "..");

  const candidates = [
    // pnpm workspace: deep path in .pnpm
    join(workspaceRoot, "node_modules", ".pnpm", "openclaw@2026.6.11", "node_modules", "openclaw", "openclaw.mjs"),
    // pnpm hoisted
    join(workspaceRoot, "node_modules", "openclaw", "openclaw.mjs"),
    // Global install
    "/usr/local/bin/openclaw",
    // HOME local
    join(process.env.HOME ?? "~", ".local", "bin", "openclaw"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  // Fallback: try PATH
  return "openclaw";
}

export interface OpenClawBridge {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
  send(message: Record<string, unknown>): Promise<unknown>;
}

export function createOpenClawBridge(config: KorvidConfig): OpenClawBridge {
  let process: ChildProcess | null = null;
  let ws: WebSocket | null = null;
  let connected = false;
  let messageId = 0;
  const pending = new Map<
    number,
    { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();

  const openclawPort = config.gateway.port + 1;

  return {
    async connect() {
      // Spawn OpenClaw gateway process
      const openclawBin = findOpenClawBinary();
      const args = ["gateway", "start"];

      process = spawn(openclawBin, args, {
        stdio: ["ignore", "pipe", "pipe"],
        env: {
          ...globalThis.process.env,
          OPENCLAW_GATEWAY_PORT: String(openclawPort),
        },
      });

      process.stdout?.on("data", (data: Buffer) => {
        const line = data.toString().trim();
        if (line.includes("Gateway ready") || line.includes("listening on")) {
          connected = true;
        }
      });

      process.stderr?.on("data", (data: Buffer) => {
        console.error(`[openclaw] ${data.toString().trim()}`);
      });

      // Wait for the gateway to be ready, then connect via WebSocket
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("OpenClaw gateway failed to start within 30s"));
        }, 30_000);

        const check = setInterval(() => {
          if (connected) {
            clearInterval(check);
            clearTimeout(timeout);
            resolve();
          }
        }, 500);

        process!.on("error", (err) => {
          clearInterval(check);
          clearTimeout(timeout);
          reject(err);
        });

        process!.on("exit", (code) => {
          if (code !== null && code !== 0) {
            clearInterval(check);
            clearTimeout(timeout);
            reject(new Error(`OpenClaw exited with code ${code}`));
          }
        });
      });

      // Connect WebSocket to OpenClaw gateway
      ws = new WebSocket(`ws://127.0.0.1:${openclawPort}`);

      ws.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.id && pending.has(msg.id)) {
            const p = pending.get(msg.id)!;
            clearTimeout(p.timer);
            pending.delete(msg.id);
            if (msg.error) {
              p.reject(new Error(msg.error));
            } else {
              p.resolve(msg.result);
            }
          }
        } catch {
          // ignore
        }
      });

      ws.on("close", () => {
        connected = false;
      });

      await new Promise<void>((resolve, reject) => {
        ws!.on("open", () => resolve());
        ws!.on("error", reject);
      });
    },

    async disconnect() {
      for (const [, p] of pending) {
        clearTimeout(p.timer);
        p.reject(new Error("Bridge disconnecting"));
      }
      pending.clear();

      if (ws) {
        ws.close();
        ws = null;
      }

      if (process) {
        process.kill("SIGTERM");
        process = null;
      }

      connected = false;
    },

    isConnected() {
      return connected && ws?.readyState === WebSocket.OPEN;
    },

    async send(message: Record<string, unknown>): Promise<unknown> {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        throw new Error("Not connected to OpenClaw gateway");
      }

      const id = ++messageId;
      const payload = { ...message, id };

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`Request ${id} timed out`));
        }, 30_000);

        pending.set(id, { resolve, reject, timer });
        ws!.send(JSON.stringify(payload));
      });
    },
  };
}

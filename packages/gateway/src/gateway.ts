import { EventEmitter } from "node:events";
import { existsSync, readFileSync } from "node:fs";
import { join, dirname, resolve, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { type KorvidConfig } from "@korvid/shared";
import { WebSocketServer, type WebSocket } from "ws";
import http from "node:http";
import { randomBytes } from "node:crypto";
import { createMemoryStore, type MemoryStore, type MemoryNode } from "@korvid/memory";

export interface GatewayInstance {
  start(): Promise<void>;
  stop(): Promise<void>;
  isRunning(): boolean;
  getPort(): number;
  broadcast(msg: Record<string, unknown>): void;
  on(event: string, handler: (...args: unknown[]) => void): void;
  generateToken(): string;
  getMemory(): MemoryStore;
}

interface ClientState {
  ws: WebSocket;
  subscribed: boolean;
  authenticated: boolean;
  ip: string;
}

export function createGateway(config: KorvidConfig): GatewayInstance {
  const emitter = new EventEmitter();
  let running = false;
  let httpServer: http.Server | null = null;
  let wss: WebSocketServer | null = null;
  const clients = new Map<WebSocket, ClientState>();
  const startTime = Date.now();

  // Pipeline state for broadcasting
  let pipelineState = "idle";
  let activeNodes: string[] = [];
  let activityLog: { id: string; timestamp: number; type: string; message: string; status: string }[] = [];
  let tools: { id: string; name: string; status: string; startTime: number; endTime?: number; durationMs?: number }[] = [];
  let cost = { totalTokens: 0, totalCostUsd: 0, budgetCapUsd: config.safety.budgetCapUsd, budgetUsedPercent: 0, byTask: [] as any[], byTool: {} as Record<string, { calls: number; totalMs: number; errors: number }> };
  let delegationEvents: { id: string; timestamp: number; type: string; agent: string; status: string; request: string }[] = [];
  let toolPermissions = config.safety.toolPermissions;

  // Memory store
  const memory = createMemoryStore({ dataDir: config.memory.coreMemoryPath });

  // Auth token
  let authToken = config.gateway.auth.token;
  if (!authToken) {
    authToken = randomBytes(32).toString("hex");
  }

  function authenticateClient(ws: WebSocket, token: string | undefined): boolean {
    if (!authToken) return true;
    return token === authToken;
  }

  const ALLOWED_ORIGINS = new Set([
    `http://127.0.0.1:${config.gateway.port}`,
    `http://localhost:${config.gateway.port}`,
  ]);

  function setCorsHeaders(res: http.IncomingMessage, serverRes: http.ServerResponse) {
    const origin = res.headers.origin;
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      serverRes.setHeader("Access-Control-Allow-Origin", origin);
    }
    serverRes.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    serverRes.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Auth-Token");
    serverRes.setHeader("Access-Control-Max-Age", "86400");
  }

  function broadcastToSubscribers(msg: Record<string, unknown>) {
    const data = JSON.stringify(msg);
    for (const [, client] of clients) {
      if (client.subscribed && client.authenticated && client.ws.readyState === 1) {
        client.ws.send(data);
      }
    }
  }

  // Memory sync: periodically broadcast memory nodes
  let memorySyncInterval: ReturnType<typeof setInterval> | null = null;

  function startMemorySync() {
    memorySyncInterval = setInterval(async () => {
      await memory.load();
      const nodes = memory.toGraphNodes();
      const stats = memory.getStats();
      broadcastToSubscribers({ type: "memory_update", nodes, stats });
    }, 10000); // Every 10 seconds
  }

  return {
    async start() {
      const port = config.gateway.port;

      // Load memory
      await memory.load();

      httpServer = http.createServer((req, res) => {
        if (req.method === "OPTIONS") {
          setCorsHeaders(req, res);
          res.statusCode = 204;
          res.end();
          return;
        }

        setCorsHeaders(req, res);

        if (req.url === "/health") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, gateway: true, uptime: Date.now() - startTime }));
          return;
        }

        if (req.url === "/api/token" && req.method === "POST") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ token: authToken }));
          return;
        }

        if (req.url === "/api/memory") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            core: memory.getAllCore(),
            nodes: memory.toGraphNodes(),
          }));
          return;
        }

        if (req.url === "/api/delegation-events") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(delegationEvents.slice(-50)));
          return;
        }

        // Tool permissions API
        if (req.url === "/api/tool-permissions") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          if (req.method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify(toolPermissions));
            return;
          }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
              try {
                const perms = JSON.parse(body);
                if (typeof perms !== "object" || perms === null || Array.isArray(perms)) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: "Expected object" }));
                  return;
                }
                // Validate each permission entry has required fields
                for (const [key, val] of Object.entries(perms)) {
                  if (typeof val !== "object" || val === null || typeof (val as any).level !== "string") {
                    res.statusCode = 400;
                    res.end(JSON.stringify({ error: `Invalid permission entry for "${key}": must have a "level" string` }));
                    return;
                  }
                }
                toolPermissions = perms;
                broadcastToSubscribers({ type: "tool_permissions", permissions: toolPermissions });
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ ok: true, permissions: toolPermissions }));
              } catch (err) {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Invalid JSON" }));
              }
            });
            return;
          }
        }

        // Memory API
        if (req.url === "/api/memory/stats") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(memory.getStats()));
          return;
        }

        if (req.url === "/api/memory/consolidate" && req.method === "POST") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          const merged = memory.consolidateEpisodic();
          const stats = memory.getStats();
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: true, merged, stats }));
          return;
        }

        // Suggestions API
        if (req.url === "/api/suggestions") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ enabled: config.suggestions?.enabled ?? false }));
          return;
        }

        // Integrations API
        if (req.url === "/api/integrations/status") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          const cal = config.integrations?.calendar ?? { enabled: false, provider: "ical" };
          const email = config.integrations?.email ?? { enabled: false, provider: "gmail" };
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ calendar: cal, email }));
          return;
        }

        // Triggers API
        if (req.url === "/api/triggers") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          if (req.method === "GET") {
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ triggers: config.triggers ?? { enabled: false, port: 3848, verifySignatures: true } }));
            return;
          }
          if (req.method === "POST") {
            let body = "";
            req.on("data", (chunk) => body += chunk);
            req.on("end", () => {
              try {
                const payload = JSON.parse(body);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ ok: true, triggers: config.triggers ?? { enabled: false, port: 3848, verifySignatures: true } }));
              } catch {
                res.statusCode = 400;
                res.end(JSON.stringify({ error: "Invalid JSON" }));
              }
            });
            return;
          }
        }

        // Workflows API
        if (req.url === "/api/workflows") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ enabled: config.workflows?.enabled ?? false, maxConcurrent: config.workflows?.maxConcurrent ?? 3 }));
          return;
        }

        // Voice personality API
        if (req.url === "/api/voice-personality") {
          const token = req.headers["x-auth-token"] as string;
          if (!authenticateClient(null as any, token)) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Unauthorized" }));
            return;
          }
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({
            activeProfile: config.voicePersonality?.activeProfile ?? "jarvis",
            customProfiles: config.voicePersonality?.customProfiles ?? [],
          }));
          return;
        }

        // Static dashboard files
        const dashboardDist = getDashboardDistPath();
        if (dashboardDist && req.url) {
          const urlPath = normalize(req.url).replace(/\.\./g, "");
          const filePath = resolve(join(dashboardDist, urlPath === "/" ? "index.html" : urlPath));
          if (!filePath.startsWith(resolve(dashboardDist))) {
            res.statusCode = 403;
            res.end("Forbidden");
            return;
          }
          if (existsSync(filePath)) {
            const ext = filePath.split(".").pop();
            const mimeTypes: Record<string, string> = {
              html: "text/html", js: "application/javascript", css: "text/css",
              json: "application/json", svg: "image/svg+xml",
            };
            res.setHeader("Content-Type", mimeTypes[ext ?? ""] ?? "application/octet-stream");
            res.end(readFileSync(filePath));
            return;
          }
          const indexPath = join(dashboardDist, "index.html");
          if (existsSync(indexPath)) {
            res.setHeader("Content-Type", "text/html");
            res.end(readFileSync(indexPath));
            return;
          }
        }
        res.statusCode = 404;
        res.end("Not found");
      });

      wss = new WebSocketServer({ server: httpServer });

      wss.on("connection", (ws, req) => {
        const ip = (req.headers["x-forwarded-for"] as string) ?? req.socket.remoteAddress ?? "unknown";
        clients.set(ws, { ws, subscribed: false, authenticated: false, ip });

        const url = new URL(req.url ?? "/", `http://localhost`);
        const token = url.searchParams.get("token");
        const isAuthenticated = authenticateClient(ws, token ?? undefined);

        if (isAuthenticated) {
          const client = clients.get(ws);
          if (client) client.authenticated = true;
          ws.send(JSON.stringify({ type: "auth", ok: true }));
        }

        ws.on("close", () => clients.delete(ws));

        ws.on("message", (data) => {
          try {
            const msg = JSON.parse(data.toString());
            const client = clients.get(ws);
            if (!client?.authenticated && msg.type !== "health") {
              ws.send(JSON.stringify({ type: "error", message: "Authentication required" }));
              return;
            }

            emitter.emit("client:message", msg, ws);

            if (msg.type === "health") {
              ws.send(JSON.stringify({
                type: "health", ok: true, gateway: true, openclaw: false,
                uptime: Date.now() - startTime,
              }));
            } else if (msg.type === "subscribe") {
              if (client) client.subscribed = true;
              const memoryNodes = memory.toGraphNodes();
              const stats = memory.getStats();
              ws.send(JSON.stringify({
                type: "state",
                payload: {
                  pipelineState, activeNodes, memoryNodes,
                  activityLog: activityLog.slice(0, 50),
                  cost, tools: tools.slice(-20),
                  delegationEvents: delegationEvents.slice(-20),
                  uptime: Date.now() - startTime,
                  toolPermissions,
                  memoryStats: stats,
                  suggestions: config.suggestions ?? { enabled: false },
                  integrations: config.integrations ?? {},
                  workflows: config.workflows ?? {},
                  voicePersonality: config.voicePersonality ?? {},
                  triggers: config.triggers ?? {},
                },
              }));
            } else if (msg.type === "interrupt") {
              emitter.emit("interrupt");
              broadcastToSubscribers({
                type: "activity",
                entry: { id: `int-${Date.now()}`, timestamp: Date.now(), type: "interrupt", message: "User requested interrupt", status: "completed" },
              });
            } else if (msg.type === "delegation_event") {
              const event = {
                id: msg.id ?? `del-${Date.now()}`,
                timestamp: Date.now(),
                type: msg.eventType ?? "unknown",
                agent: msg.agent ?? "unknown",
                status: msg.status ?? "running",
                request: String(msg.request ?? "").slice(0, 200),
              };
              delegationEvents.push(event);
              broadcastToSubscribers({ type: "delegation_event", event });
            } else if (msg.type === "agent_output") {
              // Stream agent output to dashboard
              broadcastToSubscribers({
                type: "activity",
                entry: {
                  id: `agent-${Date.now()}`,
                  timestamp: Date.now(),
                  type: "reasoning",
                  message: String(msg.output ?? "").slice(0, 500),
                  status: msg.status ?? "running",
                },
              });
            } else if (msg.type === "streaming_token") {
              broadcastToSubscribers({
                type: "streaming_token",
                token: String(msg.token ?? ""),
                done: !!msg.done,
              });
            }
          } catch {
            // ignore
          }
        });
      });

      await new Promise<void>((resolve) => {
        httpServer!.listen(port, "127.0.0.1", () => resolve());
      });

      running = true;
      startMemorySync();
      emitter.emit("ready");

      console.log(`[korvid] Gateway ready on port ${port}`);
      console.log(`[korvid] Dashboard: http://127.0.0.1:${port}`);
      console.log(`[korvid] Auth token: ${authToken}`);
    },

    async stop() {
      running = false;
      if (memorySyncInterval) clearInterval(memorySyncInterval);

      for (const [, client] of clients) {
        client.ws.close();
      }
      clients.clear();

      if (wss) { wss.close(); wss = null; }
      if (httpServer) {
        await new Promise<void>((resolve) => { httpServer!.close(() => resolve()); });
        httpServer = null;
      }

      emitter.emit("stopped");
      console.log("[korvid] Gateway stopped");
    },

    isRunning() { return running; },
    getPort() { return config.gateway.port; },
    broadcast(msg: Record<string, unknown>) { broadcastToSubscribers(msg); },
    on(event: string, handler: (...args: unknown[]) => void) { emitter.on(event, handler); },
    generateToken() { authToken = randomBytes(32).toString("hex"); return authToken; },
    getMemory() { return memory; },
  };
}

function getDashboardDistPath(): string | null {
  const pkgDir = dirname(fileURLToPath(import.meta.url));
  const dashboardDist = join(pkgDir, "..", "..", "dashboard", "dist");
  if (existsSync(dashboardDist)) return dashboardDist;
  return null;
}

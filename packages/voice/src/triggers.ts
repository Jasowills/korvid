import { EventEmitter } from "node:events";
import http from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";

export interface TriggerEvent {
  id: string;
  source: string;
  type: string;
  payload: Record<string, unknown>;
  timestamp: number;
  signature?: string;
}

export interface WebhookTrigger {
  id: string;
  name: string;
  source: string;
  secret?: string;
  enabled: boolean;
  filter?: (event: TriggerEvent) => boolean;
}

export interface TriggerManager {
  start(port?: number): Promise<void>;
  stop(): Promise<void>;
  register(trigger: Omit<WebhookTrigger, "id">): WebhookTrigger;
  unregister(id: string): boolean;
  list(): WebhookTrigger[];
  onTrigger(cb: (event: TriggerEvent) => void): void;
  emitManual(source: string, type: string, payload: Record<string, unknown>): void;
}

const DEFAULT_PORT = 3848;

export function createTriggerManager(): TriggerManager {
  const emitter = new EventEmitter();
  const triggers = new Map<string, WebhookTrigger>();
  let server: http.Server | null = null;
  let idCounter = 0;

  function genId(): string {
    return `wh-${Date.now()}-${(idCounter++).toString(36)}`;
  }

  function verifySignature(payload: string, signature: string, secret: string): boolean {
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    try {
      return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  return {
    async start(port = DEFAULT_PORT) {
      server = http.createServer((req, res) => {
        if (req.method === "OPTIONS") {
          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
          res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Webhook-Signature");
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.method === "GET" && req.url === "/triggers") {
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(Array.from(triggers.values()).map((t) => ({ ...t, filter: undefined }))));
          return;
        }

        if (req.method === "POST" && req.url?.startsWith("/webhook/")) {
          const source = req.url.slice(9);
          let body = "";

          req.on("data", (chunk) => { body += chunk; });
          req.on("end", () => {
            const trigger = Array.from(triggers.values()).find(
              (t) => t.source === source && t.enabled
            );

            if (!trigger) {
              res.statusCode = 404;
              res.end(JSON.stringify({ error: `No trigger for source: ${source}` }));
              return;
            }

            // Verify signature if secret is set
            if (trigger.secret) {
              const sig = req.headers["x-webhook-signature"] as string;
              if (!sig || !verifySignature(body, sig, trigger.secret)) {
                res.statusCode = 401;
                res.end(JSON.stringify({ error: "Invalid signature" }));
                return;
              }
            }

            try {
              const payload = JSON.parse(body);
              const event: TriggerEvent = {
                id: genId(),
                source,
                type: payload.type ?? "webhook",
                payload,
                timestamp: Date.now(),
              };

              // Apply filter if set
              if (trigger.filter && !trigger.filter(event)) {
                res.statusCode = 200;
                res.end(JSON.stringify({ ok: true, filtered: true }));
                return;
              }

              emitter.emit("trigger", event);
              res.statusCode = 200;
              res.end(JSON.stringify({ ok: true, id: event.id }));
            } catch (err) {
              res.statusCode = 400;
              res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
          });
          return;
        }

        res.statusCode = 404;
        res.end("Not found");
      });

      await new Promise<void>((resolve) => server!.listen(port, "127.0.0.1", () => resolve()));
      console.log(`[triggers] Webhook server listening on port ${port}`);
    },

    async stop() {
      if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
        server = null;
      }
    },

    register(trigger): WebhookTrigger {
      const full: WebhookTrigger = { ...trigger, id: genId() };
      triggers.set(full.id, full);
      console.log(`[triggers] Registered: ${full.name} (${full.source})`);
      return full;
    },

    unregister(id: string): boolean {
      return triggers.delete(id);
    },

    list(): WebhookTrigger[] {
      return Array.from(triggers.values());
    },

    onTrigger(cb: (event: TriggerEvent) => void) {
      emitter.on("trigger", cb);
    },

    emitManual(source, type, payload) {
      const event: TriggerEvent = {
        id: genId(),
        source,
        type,
        payload,
        timestamp: Date.now(),
      };
      emitter.emit("trigger", event);
    },
  };
}

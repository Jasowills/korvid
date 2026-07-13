import { WebSocket } from "ws";
import { type KorvidConfig } from "@korvid/shared";

export interface HealthStatus {
  ok: boolean;
  gateway: boolean;
  openclaw: boolean;
  port: number;
  uptime: number;
  error?: string;
}

export async function healthCheck(config: KorvidConfig): Promise<HealthStatus> {
  const port = config.gateway.port;
  const startTime = Date.now();

  return new Promise<HealthStatus>((resolve) => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);

    const timeout = setTimeout(() => {
      ws.close();
      resolve({
        ok: false,
        gateway: false,
        openclaw: false,
        port,
        uptime: 0,
        error: "Connection timeout (5s)",
      });
    }, 5000);

    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "health" }));
    });

    ws.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "health") {
          clearTimeout(timeout);
          ws.close();
          resolve({
            ok: true,
            gateway: true,
            openclaw: msg.openclaw ?? false,
            port,
            uptime: msg.uptime ?? Date.now() - startTime,
          });
        }
      } catch {
        // ignore
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timeout);
      resolve({
        ok: false,
        gateway: false,
        openclaw: false,
        port,
        uptime: 0,
        error: err.message,
      });
    });
  });
}

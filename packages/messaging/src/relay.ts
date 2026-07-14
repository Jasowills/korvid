import type { Message, MessageBridge, MessageQueueItem } from "./types.js";

export interface MessageRelay {
  registerBridge(bridge: MessageBridge): void;
  relay(msg: Message): Promise<void>;
  getQueue(): MessageQueueItem[];
  retryFailed(): Promise<void>;
  onRelay(handler: (msg: Message, platform: string) => void): void;
}

export function createMessageRelay(opts?: { maxRetries?: number; retryDelayMs?: number; maxQueueSize?: number }): MessageRelay {
  const bridges = new Map<string, MessageBridge>();
  const queue: MessageQueueItem[] = [];
  const relayHandlers: ((msg: Message, platform: string) => void)[] = [];
  const maxRetries = opts?.maxRetries ?? 3;
  const retryDelayMs = opts?.retryDelayMs ?? 5000;
  const maxQueueSize = opts?.maxQueueSize ?? 100;

  return {
    registerBridge(bridge: MessageBridge) {
      bridges.set(bridge.platform, bridge);
    },

    async relay(msg: Message) {
      // Send to all bridges except the originating platform
      const sends: Promise<{ platform: string; success: boolean; error?: string }>[] = [];

      for (const [platform, bridge] of bridges) {
        if (platform === msg.platform) continue;
        if (!bridge.enabled) continue;

        sends.push(
          bridge.send(msg).then((result) => ({
            platform,
            success: result.success,
            error: result.error,
          }))
        );
      }

      const results = await Promise.all(sends);

      for (const result of results) {
        if (result.success) {
          for (const handler of relayHandlers) handler(msg, result.platform);
        } else {
          // Enqueue for retry (respect max queue size to prevent unbounded growth)
          if (queue.length < maxQueueSize) {
            queue.push({
              message: { ...msg, metadata: { ...msg.metadata, relayTarget: result.platform } },
              attempts: 1,
              maxAttempts: maxRetries,
              nextRetryAt: Date.now() + retryDelayMs,
              lastError: result.error,
            });
          } else {
            console.log(`[messaging] Retry queue full, dropping message to ${result.platform}`);
          }
        }
      }
    },

    getQueue() {
      return [...queue];
    },

    async retryFailed() {
      const now = Date.now();
      const ready = queue.filter((item) => item.nextRetryAt <= now);
      const notReady = queue.filter((item) => item.nextRetryAt > now);

      queue.length = 0;
      queue.push(...notReady);

      for (const item of ready) {
        const targetPlatform = (item.message.metadata?.relayTarget as string) ?? "";
        const bridge = bridges.get(targetPlatform);
        if (!bridge) continue;

        const result = await bridge.send(item.message);
        if (!result.success && item.attempts < item.maxAttempts) {
          queue.push({
            ...item,
            attempts: item.attempts + 1,
            nextRetryAt: Date.now() + retryDelayMs * item.attempts,
            lastError: result.error,
          });
        } else if (!result.success) {
          console.log(`[messaging] Dropping message after ${item.attempts} retries: ${item.lastError}`);
        }
      }
    },

    onRelay(handler: (msg: Message, platform: string) => void) {
      relayHandlers.push(handler);
    },
  };
}

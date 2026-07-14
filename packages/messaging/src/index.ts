export const MESSAGING_VERSION = "0.1.0";

export { type Message, type MessageBridge, type MessageResult, type MessageQueueItem } from "./types.js";
export { createWhatsAppBridge } from "./whatsapp.js";
export { createTelegramBridge, validateTelegramToken } from "./telegram.js";
export { createMessageRelay, type MessageRelay } from "./relay.js";

import type { KorvidConfig } from "@korvid/shared";
import type { MessageBridge } from "./types.js";
import { createWhatsAppBridge } from "./whatsapp.js";
import { createTelegramBridge } from "./telegram.js";
import { createMessageRelay, type MessageRelay } from "./relay.js";

export interface MessagingSystem {
  relay: MessageRelay;
  bridges: MessageBridge[];
  start(): Promise<void>;
  stop(): Promise<void>;
}

export function createMessagingSystem(config: KorvidConfig): MessagingSystem {
  const relay = createMessageRelay();
  const bridges: MessageBridge[] = [];

  if (config.messaging.whatsapp.enabled) {
    const wa = createWhatsAppBridge(config);
    relay.registerBridge(wa);
    bridges.push(wa);
  }

  if (config.messaging.telegram.enabled) {
    const tg = createTelegramBridge(config);
    relay.registerBridge(tg);
    bridges.push(tg);
  }

  return {
    relay,
    bridges,
    async start() {
      for (const bridge of bridges) {
        await bridge.start();
      }
      console.log(`[messaging] System started with ${bridges.length} bridge(s)`);
    },
    async stop() {
      for (const bridge of bridges) {
        await bridge.stop();
      }
      console.log("[messaging] System stopped");
    },
  };
}

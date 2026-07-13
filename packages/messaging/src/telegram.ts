import type { KorvidConfig } from "@korvid/shared";
import type { Message, MessageBridge, MessageResult } from "./types.js";

export function createTelegramBridge(config: KorvidConfig): MessageBridge {
  const botToken = config.messaging.telegram.botToken;
  const enabled = config.messaging.telegram.enabled && !!botToken;
  const handlers: ((msg: Message) => void)[] = [];
  let polling = false;
  let pollOffset = 0;

  return {
    platform: "telegram",
    enabled,

    async send(msg: Message): Promise<MessageResult> {
      if (!enabled) return { success: false, error: "Telegram not configured" };
      if (!botToken) return { success: false, error: "No bot token" };

      try {
        const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: msg.to,
            text: msg.text,
            parse_mode: "Markdown",
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          return { success: false, error: `Telegram API error: ${res.status} ${err}` };
        }

        const data = (await res.json()) as { result?: { message_id: number } };
        return { success: true, messageId: String(data.result?.message_id ?? "") };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    onMessage(handler: (msg: Message) => void) {
      handlers.push(handler);
    },

    async start() {
      if (!enabled || !botToken) return;
      polling = true;
      console.log("[messaging] Telegram bridge started (long-polling)");

      while (polling) {
        try {
          const res = await fetch(
            `https://api.telegram.org/bot${botToken}/getUpdates?offset=${pollOffset}&timeout=30`
          );
          if (!res.ok) break;

          const data = (await res.json()) as {
            ok: boolean;
            result: { update_id: number; message?: { message_id: number; chat: { id: number }; text: string; from?: { first_name: string } } }[];
          };

          for (const update of data.result ?? []) {
            pollOffset = update.update_id + 1;
            const tgMsg = update.message;
            if (!tgMsg?.text) continue;

            const allowFrom = config.messaging.telegram.allowFrom;
            if (allowFrom.length > 0 && !allowFrom.includes(String(tgMsg.chat.id))) continue;

            const message: Message = {
              id: `tg-${tgMsg.message_id}`,
              platform: "telegram",
              from: String(tgMsg.chat.id),
              to: "korvid",
              text: tgMsg.text,
              timestamp: Date.now(),
              metadata: { firstName: tgMsg.from?.first_name },
            };

            for (const handler of handlers) handler(message);
          }
        } catch {
          if (polling) await new Promise((r) => setTimeout(r, 5000));
        }
      }
    },

    async stop() {
      polling = false;
      console.log("[messaging] Telegram bridge stopped");
    },
  };
}

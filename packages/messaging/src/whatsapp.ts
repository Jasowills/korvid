import { createHmac, timingSafeEqual } from "node:crypto";
import type { KorvidConfig } from "@korvid/shared";
import type { Message, MessageBridge, MessageResult } from "./types.js";

export function createWhatsAppBridge(config: KorvidConfig): MessageBridge {
  const webhookToken = config.messaging.whatsapp.botToken;
  const appSecret = config.messaging.whatsapp.appSecret;
  const enabled = config.messaging.whatsapp.enabled && !!webhookToken;
  const handlers: ((msg: Message) => void)[] = [];

  return {
    platform: "whatsapp",
    enabled,

    async send(msg: Message): Promise<MessageResult> {
      if (!enabled) return { success: false, error: "WhatsApp not configured" };
      if (!webhookToken) return { success: false, error: "No bot token" };

      try {
        const res = await fetch(`https://graph.facebook.com/v18.0/${webhookToken}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${webhookToken}`,
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: msg.to,
            type: "text",
            text: { body: msg.text },
          }),
        });

        if (!res.ok) {
          const err = await res.text();
          return { success: false, error: `WhatsApp API error: ${res.status} ${err}` };
        }

        const data = (await res.json()) as { messages?: { id: string }[] };
        return { success: true, messageId: data.messages?.[0]?.id };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    onMessage(handler: (msg: Message) => void) {
      handlers.push(handler);
    },

    async start() {
      if (!enabled) return;
      console.log("[messaging] WhatsApp bridge started (webhook mode)");
    },

    async stop() {
      console.log("[messaging] WhatsApp bridge stopped");
    },

    _handlers: handlers,
    _appSecret: appSecret,
  } as MessageBridge & { _handlers: typeof handlers; _appSecret: string | undefined };
}

export function verifyWhatsAppSignature(
  body: string,
  signature: string | undefined,
  appSecret: string | undefined
): boolean {
  if (!appSecret || !signature) return !appSecret; // If no secret configured, allow (backward compat)

  const expectedSig = signature.replace("sha256=", "");
  const hmac = createHmac("sha256", appSecret).update(body).digest("hex");

  try {
    return timingSafeEqual(Buffer.from(hmac, "hex"), Buffer.from(expectedSig, "hex"));
  } catch {
    return false;
  }
}

export function handleWhatsAppWebhook(
  body: Record<string, unknown>,
  handlers: ((msg: Message) => void)[]
): Message | null {
  const entry = (body.entry as Record<string, unknown>[])?.[0];
  const changes = (entry?.changes as Record<string, unknown>[])?.[0];
  const value = changes?.value as Record<string, unknown> | undefined;
  const messages = value?.messages as Record<string, unknown>[] | undefined;
  const msg = messages?.[0];

  if (!msg || typeof msg.from !== "string" || typeof msg.text !== "object") return null;

  const textObj = msg.text as { body?: string };
  if (!textObj.body) return null;

  const message: Message = {
    id: (msg.id as string) ?? `wa-${Date.now()}`,
    platform: "whatsapp",
    from: msg.from,
    to: "korvid",
    text: textObj.body,
    timestamp: Date.now(),
    metadata: { waTimestamp: msg.timestamp },
  };

  for (const handler of handlers) handler(message);
  return message;
}

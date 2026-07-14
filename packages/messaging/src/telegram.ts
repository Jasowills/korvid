import { Bot, Context } from "grammy";
import type { KorvidConfig } from "@korvid/shared";
import type { Message, MessageBridge, MessageResult } from "./types.js";

interface PairingRequest {
  code: string;
  chatId: number;
  firstName: string;
  createdAt: number;
}

const PAIRING_EXPIRY_MS = 60 * 60 * 1000;
const MAX_PENDING_PAIRINGS = 3;

function generatePairingCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

export async function validateTelegramToken(token: string): Promise<{ ok: boolean; botName?: string; error?: string }> {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`);
    const data = (await res.json()) as { ok: boolean; result?: { username?: string; first_name?: string }; description?: string };
    if (data.ok && data.result) {
      return { ok: true, botName: data.result.username ?? data.result.first_name };
    }
    return { ok: false, error: data.description ?? "Invalid token" };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export function createTelegramBridge(config: KorvidConfig): MessageBridge {
  const tgConfig = config.messaging.telegram;
  const botToken = tgConfig.botToken;
  const enabled = tgConfig.enabled && !!botToken;
  const handlers: ((msg: Message) => void)[] = [];
  let bot: Bot | null = null;
  const pendingPairings: PairingRequest[] = [];
  const allowedChats = new Set(tgConfig.allowFrom.map(Number));
  const isPairingMode = tgConfig.dmPolicy === "pairing";

  function isAllowed(chatId: number): boolean {
    if (allowedChats.has(chatId)) return true;
    if (!isPairingMode) return false;
    return pendingPairings.some((p) => p.chatId === chatId);
  }

  function handlePairingResponse(chatId: number, text: string): boolean {
    const idx = pendingPairings.findIndex(
      (p) => p.chatId === chatId || p.code.toUpperCase() === text.trim().toUpperCase()
    );
    if (idx === -1) return false;
    const req = pendingPairings[idx];
    pendingPairings.splice(idx, 1);
    allowedChats.add(chatId);
    console.log(`[messaging] Telegram: paired ${req.firstName} (${chatId})`);
    return true;
  }

  function pruneExpiredPairings(): void {
    const now = Date.now();
    for (let i = pendingPairings.length - 1; i >= 0; i--) {
      if (now - pendingPairings[i].createdAt > PAIRING_EXPIRY_MS) {
        pendingPairings.splice(i, 1);
      }
    }
  }

  return {
    platform: "telegram",
    enabled,

    async send(msg: Message): Promise<MessageResult> {
      if (!enabled) return { success: false, error: "Telegram not configured" };
      if (!bot) return { success: false, error: "Telegram bot not started" };

      try {
        const chatId = Number(msg.to);
        const result = await bot.api.sendMessage(chatId, msg.text);
        return { success: true, messageId: String(result.message_id) };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    onMessage(handler: (msg: Message) => void) {
      handlers.push(handler);
    },

    async start() {
      if (!enabled || !botToken) return;

      bot = new Bot(botToken);

      bot.command("start", async (ctx) => {
        await ctx.reply("Korvid is online. Send a message to begin.");
      });

      bot.command("pair", async (ctx) => {
        if (!isPairingMode) {
          await ctx.reply("Pairing mode is not enabled.");
          return;
        }
        const chatId = ctx.chat.id;
        const firstName = ctx.from?.first_name ?? "Unknown";
        if (allowedChats.has(chatId)) {
          await ctx.reply("You are already paired.");
          return;
        }
        const existing = pendingPairings.filter((p) => p.chatId === chatId);
        for (const p of existing) {
          pendingPairings.splice(pendingPairings.indexOf(p), 1);
        }
        if (pendingPairings.length >= MAX_PENDING_PAIRINGS) {
          pendingPairings.shift();
        }
        const code = generatePairingCode();
        pendingPairings.push({ code, chatId, firstName, createdAt: Date.now() });
        await ctx.reply(`Your pairing code is: *${code}*\n\nReply with this code to pair.`, { parse_mode: "Markdown" });
        console.log(`[messaging] Telegram: pairing request from ${firstName} (${chatId}), code: ${code}`);
      });

      bot.on("message:text", async (ctx) => {
        const chatId = ctx.chat.id;
        const text = ctx.message.text;
        const firstName = ctx.from?.first_name ?? "Unknown";

        if (!isAllowed(chatId)) {
          if (isPairingMode) {
            const existing = pendingPairings.filter((p) => p.chatId === chatId);
            for (const p of existing) {
              pendingPairings.splice(pendingPairings.indexOf(p), 1);
            }
            if (pendingPairings.length >= MAX_PENDING_PAIRINGS) {
              pendingPairings.shift();
            }
            const code = generatePairingCode();
            pendingPairings.push({ code, chatId, firstName, createdAt: Date.now() });
            await ctx.reply(
              `You're not paired with Korvid. Your pairing code is: *${code}*\n\n` +
                `Reply with this code to pair, or ask the owner to add your ID (${chatId}) to the allowlist.`,
              { parse_mode: "Markdown" }
            );
            console.log(`[messaging] Telegram: pairing request from ${firstName} (${chatId}), code: ${code}`);
          } else {
            console.log(`[messaging] Telegram: blocked message from unlisted chat ${chatId}`);
          }
          return;
        }

        if (isPairingMode && handlePairingResponse(chatId, text)) {
          await ctx.reply("Paired! You can now talk to Korvid.");
          return;
        }

        const message: Message = {
          id: `tg-${ctx.message.message_id}`,
          platform: "telegram",
          from: String(chatId),
          to: "korvid",
          text,
          timestamp: Date.now(),
          metadata: { firstName },
        };

        for (const handler of handlers) handler(message);
      });

      bot.catch((err) => {
        console.error("[messaging] Telegram bot error:", err);
      });

      setInterval(pruneExpiredPairings, 60_000);

      console.log("[messaging] Telegram: starting long-polling...");
      bot.start({ onStart: () => console.log("[messaging] Telegram: connected") });
    },

    async stop() {
      if (bot) {
        bot.stop();
        bot = null;
      }
      console.log("[messaging] Telegram: stopped");
    },
  };
}

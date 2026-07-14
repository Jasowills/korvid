import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  type WASocket,
  type ConnectionState,
  type proto,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { homedir } from "node:os";
import type { KorvidConfig } from "@korvid/shared";
import type { Message, MessageBridge, MessageResult } from "./types.js";

const logger = pino({ level: "silent" });

function isUserJid(jid: string | null | undefined): boolean {
  if (!jid) return false;
  return jid.endsWith("@s.whatsapp.net");
}

export interface PairingRequest {
  code: string;
  jid: string;
  name: string;
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

function getAuthDir(config: KorvidConfig): string {
  const raw = config.messaging.whatsapp.authDir ?? "~/.korvid/credentials/whatsapp";
  return resolve(raw.replace(/^~/, homedir()));
}

export function createWhatsAppBridge(config: KorvidConfig): MessageBridge {
  const waConfig = config.messaging.whatsapp;
  const enabled = waConfig.enabled;
  const handlers: ((msg: Message) => void)[] = [];
  let sock: WASocket | null = null;
  let connectionState: ConnectionState["connection"] = "close";
  const pendingPairings: PairingRequest[] = [];
  const allowedNumbers = new Set(waConfig.allowFrom);
  const isPairingMode = waConfig.dmPolicy === "pairing";

  function isAllowed(senderJid: string): boolean {
    const phone = senderJid.replace(/@s\.whatsapp\.net$/, "");
    if (allowedNumbers.has(phone)) return true;
    if (!isPairingMode) return false;
    return pendingPairings.some((p) => p.jid === senderJid);
  }

  function handlePairingResponse(senderJid: string, text: string): boolean {
    const phone = senderJid.replace(/@s\.whatsapp\.net$/, "");
    const idx = pendingPairings.findIndex(
      (p) => p.jid === senderJid || p.code.toUpperCase() === text.trim().toUpperCase()
    );
    if (idx === -1) return false;
    const req = pendingPairings[idx];
    pendingPairings.splice(idx, 1);
    allowedNumbers.add(phone);
    console.log(`[messaging] WhatsApp: paired ${req.name ?? phone} (${phone})`);
    return true;
  }

  async function ensureAuthDir(): Promise<string> {
    const dir = getAuthDir(config);
    await mkdir(dir, { recursive: true });
    return dir;
  }

  async function onMessage(msg: proto.IWebMessageInfo): Promise<void> {
    if (!msg.message || !msg.key?.remoteJid) return;
    const senderJid = msg.key.remoteJid;
    if (!isUserJid(senderJid)) return;
    if (senderJid === sock?.user?.id) return;

    const text =
      msg.message.conversation ??
      msg.message.extendedTextMessage?.text ??
      msg.message.buttonsResponseMessage?.selectedDisplayText ??
      msg.message.listResponseMessage?.singleSelectReply?.selectedRowId ??
      "";
    if (!text) return;

    const pushName = msg.pushName ?? "Unknown";
    const phone = senderJid.replace(/@s\.whatsapp\.net$/, "");

    if (!isAllowed(senderJid)) {
      if (isPairingMode) {
        const existing = pendingPairings.filter((p) => p.jid === senderJid);
        for (const p of existing) {
          pendingPairings.splice(pendingPairings.indexOf(p), 1);
        }
        if (pendingPairings.length >= MAX_PENDING_PAIRINGS) {
          pendingPairings.shift();
        }
        const code = generatePairingCode();
        pendingPairings.push({ code, jid: senderJid, name: pushName, createdAt: Date.now() });
        await sock?.sendMessage(senderJid, {
          text: `You're not paired with Korvid. Your pairing code is: *${code}*\n\nReply with this code to pair, or ask the owner to add your number (${phone}) to the allowlist.`,
        });
        console.log(`[messaging] WhatsApp: pairing request from ${pushName} (${phone}), code: ${code}`);
      } else {
        console.log(`[messaging] WhatsApp: blocked message from unlisted ${phone}`);
      }
      return;
    }

    if (isPairingMode && handlePairingResponse(senderJid, text)) {
      await sock?.sendMessage(senderJid, { text: `Paired! You can now talk to Korvid.` });
      return;
    }

    const message: Message = {
      id: msg.key?.id ?? `wa-${Date.now()}`,
      platform: "whatsapp",
      from: phone,
      to: "korvid",
      text,
      timestamp: msg.messageTimestamp ? Number(msg.messageTimestamp) * 1000 : Date.now(),
      metadata: { pushName },
    };

    for (const handler of handlers) handler(message);
  }

  async function startSocket(): Promise<void> {
    const authDir = await ensureAuthDir();
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    sock = makeWASocket({
      version,
      auth: state,
      logger,
      printQRInTerminal: false,
      browser: ["Korvid", "Safari", "3.0"],
      markOnlineOnConnect: false,
    });

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", async (update) => {
      const { connection, lastDisconnect, qr } = update;
      connectionState = connection ?? "close";

      if (qr) {
        const { default: qrcode } = await import("qrcode-terminal");
        console.log("\n[messaging] WhatsApp: scan this QR code to link:\n");
        qrcode.generate(qr, { small: true });
        console.log("");
      }

      if (connection === "open") {
        console.log("[messaging] WhatsApp: connected");
      }

      if (connection === "close") {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        console.log(`[messaging] WhatsApp: disconnected (code ${statusCode}), reconnecting: ${shouldReconnect}`);
        if (shouldReconnect) {
          setTimeout(() => startSocket(), 3000);
        } else {
          console.log("[messaging] WhatsApp: logged out — run 'korvid channels login --channel whatsapp' to re-link");
        }
      }
    });

    sock.ev.on("messages.upsert", async (upsert) => {
      if (upsert.type !== "notify") return;
      for (const msg of upsert.messages) {
        await onMessage(msg);
      }
    });
  }

  function pruneExpiredPairings(): void {
    const now = Date.now();
    for (let i = pendingPairings.length - 1; i >= 0; i--) {
      if (now - pendingPairings[i].createdAt > PAIRING_EXPIRY_MS) {
        pendingPairings.splice(i, 1);
      }
    }
  }

  setInterval(pruneExpiredPairings, 60_000);

  return {
    platform: "whatsapp",
    enabled,

    async send(msg: Message): Promise<MessageResult> {
      if (!enabled) return { success: false, error: "WhatsApp not configured" };
      if (!sock || connectionState !== "open") {
        return { success: false, error: "WhatsApp not connected — gateway may not be running" };
      }

      try {
        const jid = msg.to.includes("@") ? msg.to : `${msg.to}@s.whatsapp.net`;
        const result = await sock.sendMessage(jid, { text: msg.text });
        return { success: true, messageId: result?.key?.id ?? undefined };
      } catch (err) {
        return { success: false, error: err instanceof Error ? err.message : String(err) };
      }
    },

    onMessage(handler: (msg: Message) => void) {
      handlers.push(handler);
    },

    async start() {
      if (!enabled) return;
      console.log("[messaging] WhatsApp: starting Baileys connection...");
      await startSocket();
    },

    async stop() {
      if (sock) {
        sock.end(undefined);
        sock = null;
      }
      console.log("[messaging] WhatsApp: stopped");
    },
  } satisfies MessageBridge;
}

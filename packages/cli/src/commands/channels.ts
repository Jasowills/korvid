import { Command } from "commander";
import * as p from "@clack/prompts";
import { loadConfig, writeConfig, configExists } from "@korvid/shared/config-file.js";
import { validateTelegramToken } from "@korvid/messaging";

function cancelGuard<T>(value: T | symbol): T | never {
  if (p.isCancel(value)) {
    p.cancel("aborted.");
    process.exit(0);
  }
  return value as T;
}

async function loginWhatsApp(): Promise<void> {
  p.log.info("WhatsApp uses QR linking (like WhatsApp Web).");
  p.log.info("You'll scan a QR code with your phone's WhatsApp → Settings → Linked Devices.");
  p.log.info("Use a real phone number (VoIP/virtual numbers may be blocked by WhatsApp).");
  p.log.info("");

  const confirm = await p.confirm({
    message: "Ready to generate the QR code?",
    initialValue: true,
  });
  if (p.isCancel(confirm) || !confirm) {
    p.cancel("aborted.");
    return;
  }

  const s = p.spinner();
  s.start("Starting Baileys connection (waiting for QR)...");

  try {
    const { createWhatsAppBridge } = await import("@korvid/messaging");
    const config = loadConfig();
    config.messaging.whatsapp.enabled = true;
    writeConfig(config);

    const bridge = createWhatsAppBridge(config);
    await bridge.start();

    s.stop("Waiting for QR scan...");
    p.log.info("Scan the QR code above with your phone.");
    p.log.info("Press Ctrl+C to cancel.");

    await new Promise(() => {});
  } catch (err) {
    s.stop("Failed to start WhatsApp connection");
    p.log.error(err instanceof Error ? err.message : String(err));
  }
}

async function addTelegram(): Promise<void> {
  p.log.info("Telegram uses a bot token from @BotFather.");
  p.log.info("Create a bot: https://t.me/BotFather → /newbot → copy the token.");
  p.log.info("");

  const token = cancelGuard(
    await p.text({
      message: "Paste your Telegram bot token:",
      placeholder: "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
      validate(value) {
        if (!value || !/^\d+:[A-Za-z0-9_-]+$/.test(value)) {
          return "Invalid token format. Expected:数字:字母数字";
        }
      },
    })
  );

  const s = p.spinner();
  s.start("Validating bot token...");

  const result = await validateTelegramToken(token);
  if (!result.ok) {
    s.stop("Token validation failed");
    p.log.error(`Error: ${result.error}`);
    return;
  }
  s.stop(`Bot verified: @${result.botName}`);

  const dmPolicy = cancelGuard(
    await p.select({
      message: "DM security posture?",
      options: [
        { value: "pairing", label: "Pairing (Recommended) — new senders get a code to pair" },
        { value: "allowlist", label: "Allowlist — only pre-approved user IDs can message" },
      ],
      initialValue: "pairing",
    })
  );

  let allowFrom: string[] = [];
  if (dmPolicy === "allowlist") {
    const ids = cancelGuard(
      await p.text({
        message: "Comma-separated Telegram user IDs:",
        placeholder: "123456789,987654321",
      })
    );
    allowFrom = ids.split(",").map((s) => s.trim()).filter(Boolean);
  }

  const config = loadConfig();
  config.messaging.telegram.enabled = true;
  config.messaging.telegram.botToken = token;
  config.messaging.telegram.dmPolicy = dmPolicy as "pairing" | "allowlist";
  config.messaging.telegram.allowFrom = allowFrom;
  writeConfig(config);

  p.note(
    `  Channel: Telegram\n  Bot: @${result.botName}\n  DM policy: ${dmPolicy}` +
      (allowFrom.length ? `\n  Allowlist: ${allowFrom.join(", ")}` : ""),
    "Telegram configured"
  );
  p.outro("Telegram bot will start when the gateway runs.");
}

const loginCommand = new Command("login")
  .description("Link a messaging channel via QR code")
  .option("--channel <channel>", "Channel to login (whatsapp)")
  .action(async (opts) => {
    p.intro("Korvid Channels — Login");

    if (!configExists()) {
      p.log.error("No config found. Run 'korvid init' first.");
      process.exit(1);
    }

    const channel = opts.channel ?? cancelGuard(
      await p.select({
        message: "Which channel?",
        options: [{ value: "whatsapp", label: "WhatsApp (QR link)" }],
      })
    );

    if (channel === "whatsapp") {
      await loginWhatsApp();
    } else {
      p.log.error(`Unknown channel: ${channel}`);
    }
  });

const addCommand = new Command("add")
  .description("Add a messaging channel with credentials")
  .option("--channel <channel>", "Channel to add (telegram)")
  .action(async (opts) => {
    p.intro("Korvid Channels — Add");

    if (!configExists()) {
      p.log.error("No config found. Run 'korvid init' first.");
      process.exit(1);
    }

    const channel = opts.channel ?? cancelGuard(
      await p.select({
        message: "Which channel?",
        options: [{ value: "telegram", label: "Telegram (bot token)" }],
      })
    );

    if (channel === "telegram") {
      await addTelegram();
    } else {
      p.log.error(`Unknown channel: ${channel}`);
    }
  });

const statusCommand = new Command("status")
  .description("Show status of messaging channels")
  .action(() => {
    p.intro("Korvid Channels — Status");
    try {
      const config = loadConfig();
      const lines: string[] = [];

      const wa = config.messaging.whatsapp;
      lines.push(`  ${wa.enabled ? "\x1b[38;2;124;140;255m●\x1b[0m" : "\x1b[2m○\x1b[0m"} WhatsApp: ${wa.enabled ? "enabled" : "disabled"}`);
      if (wa.enabled) {
        lines.push(`    DM policy: ${wa.dmPolicy}`);
        lines.push(`    Allowlist: ${wa.allowFrom.length} number(s)`);
        lines.push(`    Auth dir: ${wa.authDir}`);
      }

      const tg = config.messaging.telegram;
      lines.push(`  ${tg.enabled ? "\x1b[38;2;124;140;255m●\x1b[0m" : "\x1b[2m○\x1b[0m"} Telegram: ${tg.enabled ? "enabled" : "disabled"}`);
      if (tg.enabled) {
        lines.push(`    DM policy: ${tg.dmPolicy}`);
        lines.push(`    Allowlist: ${tg.allowFrom.length} user(s)`);
      }

      p.note(lines.join("\n"), "Channels");
    } catch {
      p.log.error("No config found. Run 'korvid init' first.");
    }
    p.outro("");
  });

export const channelsCommand = new Command("channels")
  .description("Manage messaging channel integrations")
  .addCommand(loginCommand)
  .addCommand(addCommand)
  .addCommand(statusCommand);

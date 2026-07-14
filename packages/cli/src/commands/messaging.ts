import { Command } from "commander";
import * as p from "@clack/prompts";
import { loadConfig } from "@korvid/shared/config-file.js";
import { createMessagingSystem } from "@korvid/messaging";

export const messagingCommand = new Command("messaging")
  .description("Start messaging bridges (legacy — prefer 'korvid channels')")
  .option("--start", "Start messaging bridges")
  .action(async (opts) => {
    p.intro("Korvid Messaging");

    let config;
    try {
      config = loadConfig();
    } catch (err) {
      p.log.error(err instanceof Error ? err.message : String(err));
      process.exit(1);
    }

    const wa = config.messaging.whatsapp;
    const tg = config.messaging.telegram;
    const lines: string[] = [];
    lines.push(`  ${wa.enabled ? "\x1b[38;2;124;140;255m●\x1b[0m" : "\x1b[2m○\x1b[0m"} WhatsApp: ${wa.enabled ? "enabled" : "disabled"}`);
    if (wa.enabled) lines.push(`    DM policy: ${wa.dmPolicy}`);
    lines.push(`  ${tg.enabled ? "\x1b[38;2;124;140;255m●\x1b[0m" : "\x1b[2m○\x1b[0m"} Telegram: ${tg.enabled ? "enabled" : "disabled"}`);
    if (tg.enabled) lines.push(`    DM policy: ${tg.dmPolicy}`);

    p.note(lines.join("\n"), "Channels");

    if (opts.start) {
      const system = createMessagingSystem(config);
      const s = p.spinner();
      s.start("Starting bridges...");
      await system.start();
      s.stop("Bridges running");

      process.on("SIGINT", async () => {
        await system.stop();
        process.exit(0);
      });

      await new Promise(() => {});
    } else {
      p.log.info("Start with: korvid messaging --start");
      p.log.info("Manage channels: korvid channels status");
    }

    p.outro("");
  });

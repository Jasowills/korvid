import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "@korvid/shared/config-file.js";
import { createMessagingSystem } from "@korvid/messaging";
import { STATUS_GLYPH } from "../brand.js";

export const messagingCommand = new Command("messaging")
  .description("Manage messaging bridges")
  .option("--status", "Show bridge status")
  .option("--start", "Start messaging bridges")
  .action(async (opts) => {
    console.log(chalk.dim("\n  messaging\n"));

    let config;
    try {
      config = loadConfig();
    } catch (err) {
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${err instanceof Error ? err.message : err}`));
      process.exit(1);
    }

    const system = createMessagingSystem(config);

    if (opts.status || (!opts.start)) {
      console.log(chalk.dim("  bridges:"));
      console.log(`  whatsapp: ${config.messaging.whatsapp.enabled ? chalk.hex("#7C8CFF")(STATUS_GLYPH.active) : chalk.dim(STATUS_GLYPH.idle)} ${chalk.dim(config.messaging.whatsapp.enabled ? "enabled" : "disabled")}`);
      console.log(`  telegram: ${config.messaging.telegram.enabled ? chalk.hex("#7C8CFF")(STATUS_GLYPH.active) : chalk.dim(STATUS_GLYPH.idle)} ${chalk.dim(config.messaging.telegram.enabled ? "enabled" : "disabled")}`);
      console.log(chalk.dim(`  active: ${system.bridges.length}`));
      console.log();
    }

    if (opts.start) {
      console.log(chalk.dim("  starting bridges..."));
      await system.start();
      console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} bridges running`));
      console.log(chalk.dim("  Ctrl+C to stop\n"));

      process.on("SIGINT", async () => {
        await system.stop();
        process.exit(0);
      });

      await new Promise(() => {});
    }
  });

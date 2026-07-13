import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "@korvid/shared/config-file.js";
import { healthCheck } from "@korvid/gateway";
import { STATUS_GLYPH } from "../brand.js";

export const statusCommand = new Command("status")
  .description("Check Korvid gateway health")
  .action(async () => {
    let config;
    try {
      config = loadConfig();
    } catch (err) {
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${err instanceof Error ? err.message : err}`));
      console.error(chalk.dim('  run "korvid init" first.'));
      process.exit(1);
    }

    console.log(chalk.dim("\n  checking health...\n"));

    const health = await healthCheck(config);

    if (health.ok) {
      console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} gateway: running`));
      console.log(chalk.dim(`  openclaw: ${health.openclaw ? "connected" : "standalone"}`));
      console.log(chalk.dim(`  port: ${health.port}`));
    } else {
      console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} gateway: not reachable`));
      if (health.error) {
        console.log(chalk.dim(`  ${health.error}`));
      }
    }

    console.log();
  });

#!/usr/bin/env node

import { Command } from "commander";
import { brandBoot, brandFooter } from "./brand.js";
import { initCommand } from "./commands/init.js";
import { startCommand } from "./commands/start.js";
import { statusCommand } from "./commands/status.js";
import { voiceCommand } from "./commands/voice.js";
import { delegateCommand } from "./commands/delegate.js";
import { toolsCommand } from "./commands/tools.js";
import { messagingCommand } from "./commands/messaging.js";
import { visionCommand } from "./commands/vision.js";
import { memoryCommand } from "./commands/memory.js";
import { doctorCommand } from "./commands/doctor.js";
import { modelsCommand } from "./commands/models.js";
import { channelsCommand } from "./commands/channels.js";
import { configExists, loadConfig } from "@korvid/shared/config-file.js";

const program = new Command();

program
  .name("korvid")
  .description("personal ai assistant")
  .version("0.1.0");

program.addCommand(initCommand);
program.addCommand(startCommand);
program.addCommand(statusCommand);
program.addCommand(voiceCommand);
program.addCommand(delegateCommand);
program.addCommand(toolsCommand);
program.addCommand(messagingCommand);
program.addCommand(visionCommand);
program.addCommand(memoryCommand);
program.addCommand(doctorCommand);
program.addCommand(modelsCommand);
program.addCommand(channelsCommand);

// ── Bare command routing ──────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const hasSubcommand = args.length > 0 && !args[0].startsWith("-");

  if (!hasSubcommand) {
    if (args.includes("--help") || args.includes("-h")) {
      console.log(brandBoot());
      console.log(brandFooter());
      console.log("");
      program.help();
    } else if (!configExists()) {
      console.log(brandBoot());
      await program.parseAsync(["node", "korvid", "init"]);
    } else {
      try {
        const config = loadConfig();
        console.log(brandBoot());
        console.log(brandFooter());
        console.log("");
        console.log("  Korvid is configured.");
        console.log("");
        console.log("  Quick start:");
        console.log("    korvid voice    — start talking");
        console.log("    korvid doctor   — check system");
        console.log("    korvid models   — manage models");
        console.log("");
      } catch {
        console.log(brandBoot());
        await program.parseAsync(["node", "korvid", "doctor"]);
      }
    }
  } else {
    program.parse();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

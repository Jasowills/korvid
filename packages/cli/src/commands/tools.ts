import { Command } from "commander";
import chalk from "chalk";
import { createDefaultRegistry, toolsToFunctionSchema } from "@korvid/tools";
import { STATUS_GLYPH } from "../brand.js";

export const toolsCommand = new Command("tools")
  .description("List available PC control tools")
  .option("--json", "Output as JSON")
  .action((opts) => {
    const registry = createDefaultRegistry();
    const tools = registry.list();

    if (opts.json) {
      const schema = toolsToFunctionSchema(tools);
      console.log(JSON.stringify(schema, null, 2));
      return;
    }

    console.log(chalk.dim("\n  tools\n"));
    for (const tool of tools) {
      const danger = tool.dangerous ? chalk.hex("#FF6B4A")(" !") : "";
      const cat = chalk.dim(tool.category);
      console.log(`  ${chalk.hex("#7C8CFF")(STATUS_GLYPH.active)} ${chalk.bold(tool.name)}${danger} ${cat}`);
      console.log(chalk.dim(`    ${tool.description}`));
    }
    console.log(chalk.dim(`\n  ${tools.length} tools\n`));
  });

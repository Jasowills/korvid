import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "@korvid/shared/config-file.js";
import { detectAgents, createDelegationLoop } from "@korvid/delegation";
import { STATUS_GLYPH } from "../brand.js";

export const delegateCommand = new Command("delegate")
  .description("Delegate a coding task to an AI agent")
  .argument("<request>", "Description of the task to delegate")
  .option("-r, --repo <path>", "Target repository path (defaults to cwd)")
  .option("--dry-run", "Generate spec without delegating")
  .action(async (request: string, opts) => {
    console.log(chalk.dim("\n  delegation\n"));

    console.log(chalk.dim("  detecting agents..."));
    const agents = detectAgents();
    const available = agents.filter((a) => a.available);

    if (available.length === 0) {
      console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} no coding agents found.`));
      console.log(chalk.dim("  install one of:"));
      console.log(chalk.dim("    opencode:  npm install -g opencode"));
      console.log(chalk.dim("    claude:    npm install -g @anthropic-ai/claude-code"));
      process.exit(1);
    }

    for (const agent of agents) {
      const icon = agent.available ? chalk.hex("#7C8CFF")(STATUS_GLYPH.active) : chalk.dim(STATUS_GLYPH.idle);
      const version = agent.version ? chalk.dim(` ${agent.version}`) : "";
      console.log(`  ${icon} ${agent.name}${version}`);
    }

    if (opts.dryRun) {
      const { generateSpec, formatSpecForAgent } = await import("@korvid/delegation");
      const agent = available[0]!;
      const spec = generateSpec(request, agent.id);
      console.log(chalk.dim("\n  spec:\n"));
      console.log(formatSpecForAgent(spec));
      process.exit(0);
    }

    let config;
    try {
      config = loadConfig();
    } catch (err) {
      console.error(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} ${err instanceof Error ? err.message : err}`));
      console.error(chalk.dim('  run "korvid init" first.'));
      process.exit(1);
    }

    const loop = createDelegationLoop(config);

    loop.on("event", (event: any) => {
      const icons: Record<string, string> = {
        spec_generated: "◇",
        agent_selected: "◆",
        delegation_started: "▶",
        sandbox_created: "□",
        agent_running: "◐",
        validation_started: "○",
        validation_passed: "●",
        validation_failed: "✕",
        retry: "↻",
        escalated: "!",
        completed: "●",
        error: "✕",
      };
      const icon = icons[event.type] ?? "·";
      const color = event.type.includes("failed") || event.type.includes("error")
        ? "#FF6B4A"
        : event.type.includes("passed") || event.type.includes("completed")
          ? "#48BB78"
          : "#7C8CFF";
      console.log(`  ${chalk.hex(color)(icon)} ${chalk.dim(event.type)}: ${JSON.stringify(event.data).slice(0, 100)}`);
    });

    console.log(chalk.dim(`\n  request: "${request.slice(0, 80)}${request.length > 80 ? "..." : ""}"\n`));

    const result = await loop.run(request, {
      workspacePath: opts.repo ?? process.cwd(),
    });

    console.log();
    if (result.success) {
      console.log(chalk.hex("#48BB78")(`  ${STATUS_GLYPH.active} completed in ${result.attempts} attempt(s)`));
      console.log(chalk.dim(`  agent: ${result.agent.name}`));
      console.log(chalk.dim(`  checkpoints: ${result.checkpoints.length}`));
      if (result.validationResult) {
        console.log(chalk.dim(`  tests: ${result.validationResult.testsRun} run, ${result.validationResult.testsFailed} failed`));
      }
    } else {
      console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} failed after ${result.attempts} attempt(s)`));
      if (result.escalatedToUser) {
        console.log(chalk.hex("#FF6B4A")(`\n  escalated:\n  ${result.escalatedToUser}`));
      }
      if (result.error) {
        console.log(chalk.dim(`  ${result.error}`));
      }
    }

    console.log();
  });

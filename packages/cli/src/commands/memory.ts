import { Command } from "commander";
import chalk from "chalk";
import { loadConfig } from "@korvid/shared/config-file.js";
import { createMemoryStore } from "@korvid/memory";
import { STATUS_GLYPH } from "../brand.js";

export const memoryCommand = new Command("memory")
  .description("Manage memory stores")
  .addCommand(
    new Command("list")
      .description("List all core memory entries")
      .action(async () => {
        const config = await loadConfig();
        const store = createMemoryStore({ dataDir: config.memory.coreMemoryPath });
        await store.load();
        const entries = store.getAllCore();
        if (entries.length === 0) {
          console.log(chalk.dim("  no entries. korvid memory set <key> <value>"));
          return;
        }
        console.log(chalk.dim("\n  core memory\n"));
        for (const entry of entries) {
          console.log(`  ${chalk.hex("#7C8CFF")(STATUS_GLYPH.active)} ${chalk.bold(entry.key)} = ${entry.value} ${chalk.dim(`[${entry.category}]`)}`);
        }
        console.log();
      })
  )
  .addCommand(
    new Command("set")
      .description("Set a core memory entry")
      .argument("<key>", "Memory key")
      .argument("<value>", "Memory value")
      .option("-c, --category <category>", "Category: user, system, preference, fact", "user")
      .action(async (key: string, value: string, opts: { category: string }) => {
        const config = await loadConfig();
        const store = createMemoryStore({ dataDir: config.memory.coreMemoryPath });
        await store.load();
        store.setCore(key, value, opts.category as any);
        await store.save();
        console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} ${key} = ${value}`));
      })
  )
  .addCommand(
    new Command("get")
      .description("Get a core memory entry")
      .argument("<key>", "Memory key")
      .action(async (key: string) => {
        const config = await loadConfig();
        const store = createMemoryStore({ dataDir: config.memory.coreMemoryPath });
        await store.load();
        const entry = store.getCore(key);
        if (entry) {
          console.log(`  ${entry.key} = ${entry.value} ${chalk.dim(`[${entry.category}]`)}`);
        } else {
          console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} no entry for "${key}"`));
        }
      })
  )
  .addCommand(
    new Command("search")
      .description("Search memory by query")
      .argument("<query>", "Search query")
      .option("-l, --limit <n>", "Max results", "10")
      .action(async (query: string, opts: { limit: string }) => {
        const config = await loadConfig();
        const store = createMemoryStore({ dataDir: config.memory.coreMemoryPath });
        await store.load();
        const coreResults = store.searchCore(query);
        const episodicResults = store.searchEpisodic(query, parseInt(opts.limit));

        if (coreResults.length === 0 && episodicResults.length === 0) {
          console.log(chalk.dim(`  no results for "${query}"`));
          return;
        }

        if (coreResults.length > 0) {
          console.log(chalk.dim("\n  core:"));
          for (const e of coreResults) {
            console.log(`  ${chalk.hex("#7C8CFF")(STATUS_GLYPH.active)} ${e.key} = ${e.value}`);
          }
        }
        if (episodicResults.length > 0) {
          console.log(chalk.dim("\n  episodic:"));
          for (const e of episodicResults) {
            console.log(`  ${chalk.dim(`[${new Date(e.timestamp).toLocaleTimeString()}]`)} ${e.summary}`);
          }
        }
        console.log();
      })
  )
  .addCommand(
    new Command("delete")
      .description("Delete a core memory entry")
      .argument("<key>", "Memory key")
      .action(async (key: string) => {
        const config = await loadConfig();
        const store = createMemoryStore({ dataDir: config.memory.coreMemoryPath });
        await store.load();
        const deleted = store.deleteCore(key);
        if (deleted) {
          await store.save();
          console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} deleted "${key}"`));
        } else {
          console.log(chalk.hex("#FF6B4A")(`  ${STATUS_GLYPH.error} no entry for "${key}"`));
        }
      })
  )
  .addCommand(
    new Command("recent")
      .description("Show recent episodic memories")
      .option("-l, --limit <n>", "Max results", "10")
      .action(async (opts: { limit: string }) => {
        const config = await loadConfig();
        const store = createMemoryStore({ dataDir: config.memory.coreMemoryPath });
        await store.load();
        const entries = store.getRecentEpisodic(parseInt(opts.limit));
        if (entries.length === 0) {
          console.log(chalk.dim("  no episodic memories yet."));
          return;
        }
        console.log(chalk.dim("\n  recent episodic\n"));
        for (const entry of entries) {
          const date = new Date(entry.timestamp).toLocaleTimeString();
          console.log(`  ${chalk.dim(`[${date}]`)} ${entry.summary} ${chalk.dim(`(${entry.importance.toFixed(1)})`)}`);
        }
        console.log();
      })
  )
  .addCommand(
    new Command("add-episodic")
      .description("Add an episodic memory entry")
      .argument("<summary>", "Brief summary")
      .argument("[details]", "Detailed description")
      .option("-t, --tags <tags>", "Comma-separated tags", "")
      .option("-i, --importance <n>", "Importance (0-1)", "0.5")
      .action(async (summary: string, details: string, opts: { tags: string; importance: string }) => {
        const config = await loadConfig();
        const store = createMemoryStore({ dataDir: config.memory.coreMemoryPath });
        await store.load();
        const tags = opts.tags ? opts.tags.split(",").map((t: string) => t.trim()) : [];
        store.addEpisodic(summary, details || summary, tags, parseFloat(opts.importance));
        await store.save();
        console.log(chalk.hex("#7C8CFF")(`  ${STATUS_GLYPH.active} added: ${summary}`));
      })
  );

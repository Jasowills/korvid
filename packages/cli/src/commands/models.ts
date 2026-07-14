import { Command } from "commander";
import * as p from "@clack/prompts";
import { execFileSync } from "node:child_process";
import { loadConfig, writeConfig, configExists } from "@korvid/shared/config-file.js";

function cancelGuard<T>(value: T | symbol): T | never {
  if (p.isCancel(value)) {
    p.cancel("aborted.");
    process.exit(0);
  }
  return value as T;
}

function getOllamaModels(): string[] {
  try {
    const res = execFileSync("ollama", ["list"], {
      timeout: 5000,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return res
      .trim()
      .split("\n")
      .slice(1)
      .map((l) => l.split(/\s+/)[0])
      .filter(Boolean);
  } catch {
    return [];
  }
}

const PROVIDER_DEFAULTS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  google: "gemini-2.5-flash",
  groq: "llama-3.1-8b-instant",
  openrouter: "openrouter/auto",
};

export const modelsCommand = new Command("models")
  .description("Manage reasoning models")
  .addCommand(
    new Command("list")
      .description("Show current model selection and available options")
      .action(async () => {
        p.intro("Models");

        if (!configExists()) {
          p.log.error("No config found. Run: korvid init");
          return;
        }

        const config = loadConfig();

        // Current selection
        const lines: string[] = [];
        lines.push(`  Reasoning:  ${config.models.reasoning.provider}/${config.models.reasoning.model}`);
        lines.push(`  Fast:       ${config.models.fast.provider}/${config.models.fast.model}`);
        if (config.models.vision) {
          lines.push(`  Vision:     ${config.models.vision.provider}/${config.models.vision.model}`);
        }

        p.note(lines.join("\n"), "Current selection");

        // Available models (if Ollama)
        if (config.models.reasoning.provider === "ollama") {
          const models = getOllamaModels();
          if (models.length > 0) {
            p.note(models.map((m) => `  ${m}`).join("\n"), "Available Ollama models");
          } else {
            p.log.warn("No Ollama models found. Pull one: ollama pull llama3.2");
          }
        }

        p.outro("");
      })
  )
  .addCommand(
    new Command("set")
      .description("Change model selection interactively")
      .option("--reasoning <provider/model>", "Set reasoning model (e.g., ollama/llama3.2)")
      .option("--fast <provider/model>", "Set fast model (e.g., groq/llama-3.1-8b-instant)")
      .action(async (opts) => {
        p.intro("Models");

        if (!configExists()) {
          p.log.error("No config found. Run: korvid init");
          return;
        }

        const config = loadConfig();

        if (opts.reasoning) {
          const [provider, ...modelParts] = opts.reasoning.split("/");
          const model = modelParts.join("/");
          config.models.reasoning = {
            ...config.models.reasoning,
            provider: provider as any,
            model: model || config.models.reasoning.model,
          };
          p.log.step(`Reasoning model: ${provider}/${model || config.models.reasoning.model}`);
        }

        if (opts.fast) {
          const [provider, ...modelParts] = opts.fast.split("/");
          const model = modelParts.join("/");
          config.models.fast = {
            ...config.models.fast,
            provider: provider as any,
            model: model || config.models.fast.model,
          };
          p.log.step(`Fast model: ${provider}/${model || config.models.fast.model}`);
        }

        if (!opts.reasoning && !opts.fast) {
          // Interactive mode
          const tier = cancelGuard(
            await p.select({
              message: "Which model tier?",
              options: [
                { value: "reasoning", label: "Reasoning model", hint: config.models.reasoning.provider + "/" + config.models.reasoning.model },
                { value: "fast", label: "Fast model", hint: config.models.fast.provider + "/" + config.models.fast.model },
              ],
            })
          );

          const provider = cancelGuard(
            await p.select({
              message: "Provider:",
              options: [
                { value: "ollama", label: "Ollama", hint: "Local, free" },
                { value: "anthropic", label: "Anthropic", hint: "Claude" },
                { value: "openai", label: "OpenAI", hint: "GPT" },
                { value: "google", label: "Google Gemini", hint: "Gemini" },
                { value: "groq", label: "Groq", hint: "Fast inference" },
                { value: "openrouter", label: "OpenRouter", hint: "Multi-provider" },
              ],
              initialValue: tier === "reasoning" ? config.models.reasoning.provider : config.models.fast.provider,
            })
          );

          let model: string;
          if (provider === "ollama") {
            const models = getOllamaModels();
            if (models.length > 0) {
              model = cancelGuard(
                await p.select({
                  message: "Model:",
                  options: models.map((m) => ({ value: m, label: m })),
                  initialValue: models[0],
                })
              );
            } else {
              model = cancelGuard(await p.text({ message: "Model name:", defaultValue: "llama3.2" }));
            }
          } else {
            model = cancelGuard(
              await p.text({
                message: "Model name:",
                defaultValue: PROVIDER_DEFAULTS[provider] || "",
              })
            );
          }

          if (tier === "reasoning") {
            config.models.reasoning = { ...config.models.reasoning, provider: provider as any, model };
          } else {
            config.models.fast = { ...config.models.fast, provider: provider as any, model };
          }
        }

        const s = p.spinner();
        s.start("Saving");
        writeConfig(config);
        s.stop("Models updated");

        p.note(
          `  Reasoning: ${config.models.reasoning.provider}/${config.models.reasoning.model}\n  Fast:      ${config.models.fast.provider}/${config.models.fast.model}`,
          "New selection"
        );

        p.outro("Done.");
      })
  );

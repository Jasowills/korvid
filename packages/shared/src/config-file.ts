import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import JSON5 from "json5";
import { KorvidConfigSchema, type KorvidConfig } from "./config.js";

const KORVID_HOME = process.env.KORVID_HOME ?? join(homedir(), ".korvid");
const CONFIG_PATH = process.env.KORVID_CONFIG_PATH ?? join(KORVID_HOME, "korvid.json");

export function getConfigPath(): string {
  return CONFIG_PATH;
}

export function getKorvidHome(): string {
  return KORVID_HOME;
}

export function loadConfig(configPath?: string): KorvidConfig {
  const path = configPath ?? CONFIG_PATH;

  if (!existsSync(path)) {
    throw new Error(
      `Config not found at ${path}. Run "korvid init" to create one.`
    );
  }

  const raw = readFileSync(path, "utf-8");
  const parsed = JSON5.parse(raw);
  const result = KorvidConfigSchema.safeParse(parsed);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid config at ${path}:\n${issues}`);
  }

  return result.data;
}

export function writeConfig(config: KorvidConfig, configPath?: string): void {
  const path = configPath ?? CONFIG_PATH;
  const dir = dirname(path);

  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(path, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

export function configExists(configPath?: string): boolean {
  return existsSync(configPath ?? CONFIG_PATH);
}

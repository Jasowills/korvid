import { execFileSync } from "node:child_process";

export const ENV_KEY_MAP: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
  google: "GOOGLE_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
  deepgram: "DEEPGRAM_API_KEY",
  elevenlabs: "ELEVENLABS_API_KEY",
  cartesia: "CARTESIA_API_KEY",
};

export const PROVIDER_DEFAULTS: Record<string, string> = {
  anthropic: "claude-sonnet-4-6",
  openai: "gpt-4o",
  google: "gemini-2.5-flash",
  groq: "llama-3.1-8b-instant",
  openrouter: "openrouter/auto",
};

export const FAST_MODEL_DEFAULTS: Record<string, string> = {
  groq: "llama-3.1-8b-instant",
  ollama: "llama3.2",
  google: "gemini-2.5-flash",
};

export function detectEnvKey(provider: string): string | undefined {
  const envVar = ENV_KEY_MAP[provider];
  if (!envVar) return undefined;
  const val = process.env[envVar];
  return val && val.length > 0 ? val : undefined;
}

export function checkInstalled(cmd: string, args: string[]): boolean {
  try {
    execFileSync(cmd, args, { timeout: 5000, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

export function platformHint(tool: string, brewPkg?: string): string {
  const pl = process.platform;
  if (pl === "darwin") return `brew install ${brewPkg ?? tool}`;
  if (pl === "win32") return `choco install ${brewPkg ?? tool}`;
  return `apt install ${brewPkg ?? tool}`;
}

export function getOllamaModels(): string[] {
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

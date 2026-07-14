import { z } from "zod";

// ── Model Provider Config ──────────────────────────────────────────

const ModelProviderSchema = z.object({
  provider: z.enum(["anthropic", "openai", "google", "groq", "ollama", "openrouter"]),
  model: z.string(),
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
});

// ── STT Provider Config ────────────────────────────────────────────

const STTProviderSchema = z.object({
  provider: z.enum(["local-whisper", "groq", "deepgram"]),
  apiKey: z.string().optional(),
  model: z.string().optional(),
  streaming: z.boolean().default(false),
});

// ── TTS Provider Config ────────────────────────────────────────────

const TTSProviderSchema = z.object({
  provider: z.enum(["local", "elevenlabs", "cartesia"]),
  apiKey: z.string().optional(),
  voiceId: z.string().optional(),
  model: z.string().optional(),
});

// ── Wake Word Config ───────────────────────────────────────────────

const WakeWordConfigSchema = z.object({
  engine: z.enum(["porcupine", "openwakeword", "manual"]).default("manual"),
  keyword: z.string().default("korvid"),
  sensitivity: z.number().min(0).max(1).default(0.5),
});

// ── Delegation Config ──────────────────────────────────────────────

const DelegationConfigSchema = z.object({
  preferredAgent: z.string().optional(),
  maxAttempts: z.number().int().min(1).max(20).default(3),
  maxWallClockMinutes: z.number().min(1).max(120).default(30),
  maxCostUsd: z.number().min(0).default(5.0),
  sandboxImage: z.string().default("openclaw-sandbox:bookworm-slim"),
  networkAllowlist: z.array(z.string()).default([]),
});

// ── Tool Permissions ───────────────────────────────────────────────

const ToolPermissionsSchema = z.object({
  enabled: z.boolean().default(true),
  allow: z.array(z.string()).default([]),
  deny: z.array(z.string()).default([]),
  requireConfirmation: z.array(z.string()).default([]),
}).default({});

// ── Safety Config ──────────────────────────────────────────────────

const SafetyConfigSchema = z.object({
  requireConfirmationFor: z
    .array(z.enum(["deploy", "delete", "spend", "message", "call"]))
    .default(["deploy", "delete", "spend", "message", "call"]),
  budgetCapUsd: z.number().min(0).default(50.0),
  budgetWarnPercent: z.number().min(0).max(100).default(80),
  toolPermissions: ToolPermissionsSchema,
});

// ── Memory Config ──────────────────────────────────────────────────

const MemoryConfigSchema = z.object({
  noMemoryList: z.array(z.string()).default([]),
  coreMemoryPath: z.string().default("~/.korvid/memory/core"),
  episodicMemoryPath: z.string().default("~/.korvid/memory/episodic"),
  edgesPath: z.string().default("~/.korvid/memory/edges.json"),
});

// ── Suggestions Config ─────────────────────────────────────────────

const SuggestionsConfigSchema = z.object({
  enabled: z.boolean().default(false),
  checkIntervalMs: z.number().min(60000).max(3600000).default(300000),
  maxSuggestions: z.number().min(1).max(20).default(5),
  useReasoning: z.boolean().default(false),
});

// ── Integrations Config ────────────────────────────────────────────

const IntegrationsConfigSchema = z.object({
  calendar: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(["google", "apple", "ical"]).default("ical"),
    apiKey: z.string().optional(),
  }).default({ enabled: false }),
  email: z.object({
    enabled: z.boolean().default(false),
    provider: z.enum(["gmail", "imap", "exchange"]).default("gmail"),
    apiKey: z.string().optional(),
  }).default({ enabled: false }),
});

// ── Workflow Config ────────────────────────────────────────────────

const WorkflowConfigSchema = z.object({
  enabled: z.boolean().default(false),
  maxConcurrent: z.number().min(1).max(10).default(3),
  defaultTimeoutMs: z.number().min(5000).max(600000).default(60000),
});

// ── Voice Personality Config ───────────────────────────────────────

const VoicePersonalityConfigSchema = z.object({
  activeProfile: z.string().default("jarvis"),
  customProfiles: z.array(z.object({
    name: z.string(),
    personality: z.enum(["formal", "casual", "dry", "friendly", "technical"]),
    verbosity: z.enum(["terse", "normal", "verbose"]),
    humor: z.number().min(0).max(1),
    warmth: z.number().min(0).max(1),
    formality: z.number().min(0).max(1),
    customTraits: z.array(z.string()).optional(),
    systemPromptOverride: z.string().optional(),
  })).default([]),
});

// ── Webhook/Trigger Config ─────────────────────────────────────────

const TriggersConfigSchema = z.object({
  enabled: z.boolean().default(false),
  port: z.number().int().min(1024).max(65535).default(3848),
  verifySignatures: z.boolean().default(true),
});

// ── Dashboard Config ───────────────────────────────────────────────

const DashboardConfigSchema = z.object({
  enabled: z.boolean().default(true),
  port: z.number().int().min(1024).max(65535).default(3847),
});

// ── Gateway Config ─────────────────────────────────────────────────

const GatewayConfigSchema = z.object({
  port: z.number().int().min(1024).max(65535).default(3847),
  auth: z
    .object({
      token: z.string().optional(),
    })
    .default({}),
});

// ── Messaging Config ───────────────────────────────────────────────

const DmPolicySchema = z.enum(["pairing", "allowlist"]);

const MessagingConfigSchema = z.object({
  whatsapp: z
    .object({
      enabled: z.boolean().default(false),
      accountId: z.string().optional(),
      authDir: z.string().default("~/.korvid/credentials/whatsapp"),
      dmPolicy: DmPolicySchema.default("pairing"),
      allowFrom: z.array(z.string()).default([]),
    })
    .default({ enabled: false }),
  telegram: z
    .object({
      enabled: z.boolean().default(false),
      botToken: z.string().optional(),
      dmPolicy: DmPolicySchema.default("pairing"),
      allowFrom: z.array(z.string()).default([]),
    })
    .default({ enabled: false }),
});

// ── Clap Activation Config ─────────────────────────────────────────

const ClapActivationConfigSchema = z.object({
  enabled: z.boolean().default(false),
  clapWindowMs: z.number().min(200).max(2000).default(700),
  sensitivity: z.number().min(0).max(1).default(0.5),
});

// ── Voice Config ───────────────────────────────────────────────────

const VoiceConfigSchema = z.object({
  wakeWord: WakeWordConfigSchema.default({}),
  stt: STTProviderSchema.default({ provider: "local-whisper" }),
  tts: TTSProviderSchema.default({ provider: "local" }),
  interruptionEnabled: z.boolean().default(true),
  sessionPersist: z.boolean().default(true),
  sessionPath: z.string().default("~/.korvid/session"),
  vad: z.boolean().default(false),
  vadSilenceMs: z.number().min(200).max(5000).default(1500),
  clapActivation: ClapActivationConfigSchema.default({}),
});

// ── Main Korvid Config ─────────────────────────────────────────────

export const KorvidConfigSchema = z.object({
  $schema: z.string().optional(),

  // Model tiers
  models: z
    .object({
      reasoning: ModelProviderSchema.default({
        provider: "ollama",
        model: "llama3.2",
      }),
      fast: ModelProviderSchema.default({
        provider: "ollama",
        model: "llama3.2",
      }),
      vision: ModelProviderSchema.optional(),
    })
    .default({}),

  // Voice pipeline
  voice: VoiceConfigSchema.default({}),

  // Gateway
  gateway: GatewayConfigSchema.default({}),

  // Dashboard
  dashboard: DashboardConfigSchema.default({}),

  // Delegation
  delegation: DelegationConfigSchema.default({}),

  // Safety
  safety: SafetyConfigSchema.default({}),

  // Memory
  memory: MemoryConfigSchema.default({}),

  // Proactive suggestions
  suggestions: SuggestionsConfigSchema.default({}),

  // Calendar/Email integrations
  integrations: IntegrationsConfigSchema.default({}),

  // Workflow engine
  workflows: WorkflowConfigSchema.default({}),

  // Voice personality
  voicePersonality: VoicePersonalityConfigSchema.default({}),

  // Webhook triggers
  triggers: TriggersConfigSchema.default({}),

  // Messaging bridges
  messaging: MessagingConfigSchema.default({}),
});

export type KorvidConfig = z.infer<typeof KorvidConfigSchema>;
export type ModelProvider = z.infer<typeof ModelProviderSchema>;
export type STTProvider = z.infer<typeof STTProviderSchema>;
export type TTSProvider = z.infer<typeof TTSProviderSchema>;
export type DelegationConfig = z.infer<typeof DelegationConfigSchema>;
export type SafetyConfig = z.infer<typeof SafetyConfigSchema>;
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
export type ToolPermissions = z.infer<typeof ToolPermissionsSchema>;
export type ClapActivationConfig = z.infer<typeof ClapActivationConfigSchema>;

# Korvid

> A self-hosted, voice-first AI assistant that delegates work, controls your PC, and validates its own output.

Korvid is a personal Jarvis-style AI system. It runs on your machine, uses your API keys, and keeps your data local. Voice, text, or message it. It thinks, acts, and confirms before doing anything irreversible.

---

## Features

| Capability | What it does |
|---|---|
| **Voice pipeline** | VAD-powered listening, STT (Deepgram, Whisper, Groq), multi-model reasoning, TTS (ElevenLabs, Cartesia, macOS). Interrupts when you speak. Clap-to-wake. |
| **Autonomous delegation** | Hands coding tasks to sub-agents (OpenCode, Claude Code). Writes specs, runs sandboxed, validates with tests + typecheck, retries on failure, auto-rollback on low confidence. |
| **PC control** | Screenshots, clipboard, file read/write, terminal commands, app open/close. All permission-gated with path guardrails. |
| **Persistent memory** | Core facts (key-value), episodic events (timestamped), relationship edges (graph). Consolidates similar entries. Builds a knowledge graph over time. |
| **Self-validation** | Simulate mode dry-runs changes against your test suite. Debrief reviews what happened. Auto-rollback on low confidence. Git checkpoints before every delegation. |
| **Safety by default** | Confirmation gates for deploys, deletes, spending, messaging. Budget caps. Deny-takes-precedence permission system. |
| **Multi-model** | Claude, GPT-4o, Gemini, Ollama (local), Groq, OpenRouter. Native tool calling for OpenAI, Anthropic, Google, Ollama. |
| **Messaging bridges** | WhatsApp Business API, Telegram Bot API. Bidirectional relay with retry queue. |
| **Vision** | Screenshot analysis, OCR (macOS Vision framework), live camera capture, Ollama vision models. |
| **Browser automation** | Playwright-based navigation, screenshots, click, type, get text. Multi-context management. |
| **Calendar & email** | Google Calendar, iCal, Gmail, IMAP. Read events, summarize inbox, draft responses. |
| **Webhook triggers** | React to GitHub pushes, form submissions, cron schedules. External event processing. |
| **Proactive suggestions** | Learns patterns, suggests next steps, reminders, automations based on observations. |
| **Streaming** | Real-time token streaming for reasoning (all providers) and STT (Deepgram WebSocket). Dashboard shows live thinking. |
| **Task chaining** | Multi-step workflows. "Check my calendar, then email the team" — one command, multiple actions. |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Korvid Gateway                    │
│               HTTP + WebSocket :3847                 │
├──────────┬──────────┬──────────┬───────────┬────────┤
│  Voice   │  Tools   │ Delegat. │  Memory   │ Vision │
│ Pipeline │ Registry │   Loop   │   Store   │ Browser│
├──────────┴──────────┴──────────┴───────────┴────────┤
│                  Reasoning Client                     │
│       Claude · GPT-4o · Gemini · Ollama · Groq      │
├──────────────────────────────────────────────────────┤
│                    Dashboard                          │
│              React + Three.js 3D Graph                │
└──────────────────────────────────────────────────────┘
```

### Packages

| Package | Description |
|---|---|
| `@korvid/shared` | Zod config schema, config file I/O |
| `@korvid/cli` | CLI entry point, 10 commands |
| `@korvid/gateway` | HTTP + WebSocket server, REST API |
| `@korvid/voice` | Voice pipeline, STT/TTS, reasoning, VAD, sounds |
| `@korvid/dashboard` | React + Vite frontend, 3D BrainView |
| `@korvid/tools` | PC control tools (screenshot, clipboard, files, terminal) |
| `@korvid/delegation` | AI agent delegation loop (spec, sandbox, validate, retry) |
| `@korvid/messaging` | WhatsApp/Telegram bridges |
| `@korvid/vision` | Screenshot analysis, OCR, camera |
| `@korvid/browser` | Playwright browser automation |
| `@korvid/memory` | Core/episodic memory store, graph edges |
| `@korvid/integrations` | Calendar/email integration |
| `@korvid/site` | Landing page (React, Three.js, Vite) |

### Voice pipeline state machine

```
idle → listening → processing → speaking → idle
         ↑                         │
         └─── interruption ────────┘
```

- Wake word (Porcupine, OpenWakeWord, Ctrl+K, clap detection)
- STT (Deepgram streaming, local Whisper, Groq)
- Multi-turn reasoning with 20-message history
- TTS (ElevenLabs, Cartesia, macOS `say`)
- Session persistence across restarts

---

## Quick start

### Install

```bash
curl -fsSL https://korvid.ai/install.sh | bash
```

or

```bash
npm install -g korvid
```

### Initialize

```bash
korvid init
```

Guided setup wizard configures your model providers, STT/TTS engines, and safety preferences. Use `--defaults` for non-interactive mode.

### Start

```bash
korvid start
```

Gateway starts on port 3847. Dashboard opens at `http://127.0.0.1:3847`.

### Use

```bash
# Voice interaction
korvid voice --trigger

# Direct text input (skip STT)
korvid voice --text "what time is it"

# Delegate a coding task
korvid delegate "add error handling to the auth module"

# List available tools
korvid tools

# Check system status
korvid status
```

---

## CLI commands

| Command | Description |
|---|---|
| `korvid init` | Interactive setup wizard. `--defaults` for non-interactive. |
| `korvid start` | Start the gateway daemon with dashboard. |
| `korvid status` | Health check: gateway, voice, memory, tools. |
| `korvid voice` | Voice pipeline. `--trigger` for one-shot, `--text` for direct input. |
| `korvid delegate <task>` | Delegate coding task to sub-agent. `--repo` for target path, `--dry-run` for spec preview. |
| `korvid tools` | List registered tools. `--json` for OpenAI function schema. |
| `korvid messaging` | Messaging bridge management. `--status`, `--start`. |
| `korvid vision` | Vision commands. `--capture`, `--analyze <path>`, `--ocr <path>`. |
| `korvid memory` | Memory operations. `list`, `get`, `set`, `delete`, `search`, `recent`, `add-episodic`. |
| `korvid doctor` | Diagnostics: check dependencies, config, connectivity. |

---

## Configuration

All configuration lives in `~/.korvid/korvid.json`. Every field is Zod-validated.

### Top-level sections

```jsonc
{
  "models": {
    "reasoning": { "provider": "anthropic", "model": "claude-sonnet-4-20250514" },
    "fast": { "provider": "groq", "model": "llama-3.3-70b-versatile" },
    "vision": { "provider": "ollama", "model": "llava" }
  },
  "voice": {
    "wakeWord": "manual",
    "stt": { "provider": "deepgram", "model": "nova-3" },
    "tts": { "provider": "elevenlabs" },
    "vad": true,
    "clapActivation": { "enabled": false },
    "sessionPersist": true
  },
  "safety": {
    "requireConfirmationFor": ["deploy", "delete", "spend", "message"],
    "budgetCap": 50,
    "toolPermissions": {
      "enabled": true,
      "allow": ["screenshot", "read_file", "list_files"],
      "deny": ["run_command"],
      "requireConfirmation": ["write_file", "run_command"]
    }
  },
  "delegation": {
    "preferredAgent": "opencode",
    "maxAttempts": 4,
    "maxWallClockMinutes": 15
  },
  "memory": {
    "core": "~/.korvid/memory/core.json",
    "episodic": "~/.korvid/memory/episodic",
    "edges": "~/.korvid/memory/edges.json"
  },
  "gateway": { "port": 3847 },
  "dashboard": { "enabled": true },
  "messaging": {
    "whatsapp": { "enabled": false },
    "telegram": { "enabled": false }
  },
  "integrations": {
    "calendar": { "provider": "google" },
    "email": { "provider": "gmail" }
  },
  "voicePersonality": { "active": "jarvis" },
  "triggers": { "port": 3848 },
  "workflows": { "maxConcurrent": 3 },
  "suggestions": { "enabled": true }
}
```

### Supported providers

| Category | Providers |
|---|---|
| **Reasoning** | Anthropic, OpenAI, Google Gemini, Ollama (local), Groq, OpenRouter |
| **STT** | Deepgram (streaming + batch), local Whisper, Groq STT |
| **TTS** | ElevenLabs, Cartesia, macOS built-in (`say`) |
| **Wake word** | Porcupine, OpenWakeWord, Keyboard (Ctrl+K), Clap detection |
| **Calendar** | Google Calendar, Apple iCal, local .ics files |
| **Email** | Gmail, any IMAP provider |
| **Delegation** | OpenCode, Claude Code |

---

## REST API

All endpoints require `x-auth-token` header (except `/health` and `/api/token`).

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Unauthenticated health check |
| `POST` | `/api/token` | Returns auth token |
| `GET` | `/api/memory` | Core entries + graph nodes |
| `GET` | `/api/memory/stats` | Memory statistics |
| `POST` | `/api/memory/consolidate` | Merge similar episodic entries |
| `GET` | `/api/delegation-events` | Recent delegation events |
| `GET/POST` | `/api/tool-permissions` | Tool permission config |
| `GET` | `/api/suggestions` | Suggestion engine status |
| `GET` | `/api/integrations/status` | Calendar/email integration status |
| `GET/POST` | `/api/triggers` | Webhook trigger config |
| `GET` | `/api/workflows` | Workflow engine status |
| `GET` | `/api/voice-personality` | Voice personality config |

### WebSocket

Connect to `ws://127.0.0.1:3847?token=<token>` for real-time state updates.

Messages received:
- `state` — full gateway state snapshot on connect
- `activity` — tool calls, reasoning, STT/TTS events
- `delegation_event` — delegation loop lifecycle events
- `memory_update` — memory graph node updates (every 10s)
- `streaming_token` — real-time reasoning tokens
- `partial_transcript` — live STT transcription

Messages sent:
- `subscribe` — request state updates
- `interrupt` — hard interrupt all in-progress actions

---

## Memory system

| Store | Location | Format |
|---|---|---|
| Core | `~/.korvid/memory/core.json` | Key-value facts |
| Episodic | `~/.korvid/memory/episodic/` | Timestamped event files |
| Edges | `~/.korvid/memory/edges.json` | Relationship graph |

- **Consolidation**: Merges episodic entries with >60% cosine similarity within 7-day window
- **Graph export**: Converts memory entries to 3D graph nodes for dashboard visualization
- **Search**: Cosine similarity search across episodic entries, key lookup for core

---

## Dashboard

Served at `http://127.0.0.1:3847` when the gateway runs.

- **BrainView**: 3D node graph visualization (react-three-fiber) showing memory entries, active nodes, connection edges, thinking particles
- **Activity Panel**: Real-time feed of reasoning, tool calls, STT/TTS events
- **Diagnostics**: Budget usage, token count, tool call stats
- **Tool Permissions**: Per-tool Allow/Deny/Confirm checkboxes
- **Memory Panel**: Memory stats, consolidation trigger
- **Delegation Timeline**: Horizontal scrollable event timeline
- **Suggestions**: Proactive suggestion cards
- **Integrations**: Calendar/email connection status

---

## Safety model

Korvid defaults to safe. Every irreversible action requires explicit confirmation.

### Permission tiers

| Tier | Examples | Default |
|---|---|---|
| **Read-only** | `screenshot`, `read_file`, `list_files`, `clipboard_read` | Allow |
| **Read-write** | `write_file`, `clipboard_write`, `open_app` | Confirm |
| **Destructive** | `run_command`, `close_app` | Confirm + deny list |

### Rules

- **Deny always wins.** If a tool is in both allow and deny lists, it is denied.
- **Budget caps.** Token limits, API call budgets, cost ceilings. Korvid stops before exceeding thresholds.
- **Path guardrails.** File system access blocked for `/etc`, `/System`, `/usr/bin`, `/usr/sbin`, `/private`. Screenshots only to `/tmp`.
- **WebSocket auth.** Token-based gateway authentication. No unauthenticated access.
- **HMAC verification.** WhatsApp webhook signatures verified with timing-safe comparison.

---

## Development

### Prerequisites

- Node.js >= 22.22.3
- pnpm (`npm install -g pnpm`)

### Setup

```bash
git clone https://github.com/Jasowills/korvid.git
cd korvid
pnpm install
pnpm run --filter=@korvid/shared build
```

### Run

```bash
# Start gateway + dashboard
pnpm start

# Development mode (hot reload)
pnpm dev

# Landing site
pnpm site:dev
```

### Test

```bash
# All packages
pnpm test

# Single package
cd packages/<name> && pnpm vitest run
```

### Type check

```bash
pnpm typecheck
```

### Build

```bash
# Build shared package first (required by other packages)
pnpm run --filter=@korvid/shared build

# Build everything
pnpm build

# Build landing site
pnpm site:build
```

### Project structure

```
korvid/
├── packages/
│   ├── shared/          # Zod config schema, file I/O
│   ├── cli/             # Commander.js CLI, 10 commands
│   ├── gateway/         # HTTP + WebSocket server
│   ├── voice/           # Voice pipeline, STT/TTS, VAD
│   ├── dashboard/       # React + Vite + Three.js frontend
│   ├── tools/           # PC control tool registry
│   ├── delegation/      # Agent delegation loop
│   ├── messaging/       # WhatsApp/Telegram bridges
│   ├── vision/          # Screenshot, OCR, camera
│   ├── browser/         # Playwright automation
│   ├── memory/          # Core/episodic memory store
│   └── integrations/    # Calendar, email
├── site/                # Landing page (React, Three.js)
├── package.json
├── pnpm-workspace.yaml
└── AGENTS.md
```

### Code style

- 2-space indentation
- Single quotes
- Trailing commas in multiline
- No semicolons (except in statements)
- `const` over `let`
- Explicit return types on exported functions
- `Record<string, T>` over `Map` for serializable data

---

## Brand

| Token | Value | Usage |
|---|---|---|
| Obsidian | `#12151A` | Background |
| Graphite | `#1C2126` | Surface |
| Slate | `#2A3138` | Borders |
| Bone | `#E8EAED` | Primary text |
| Sheen | `#7C8CFF` | Active states (accent) |
| Ember | `#FF6B4A` | Warnings, confirmations only |

**Typography**: IBM Plex Mono (code/CLI), Space Grotesk (body/UI)

**Status glyphs**: `●` active, `○` idle, `◐` processing, `✕` error

**Voice**: Plain, active, direct. No filler. Dry wit earned, not constant.

---

## Roadmap

- [ ] Live TTS testing with ElevenLabs/Cartesia API keys
- [ ] Voice end-to-end testing with microphone
- [ ] Docker sandbox verification
- [ ] OpenClaw gateway integration
- [ ] Dashboard real-time reasoning trace animation
- [ ] Persistent browser context for multi-step workflows
- [ ] Native function calling for all providers

---

## License

MIT

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes
4. Run tests (`pnpm test`)
5. Run typecheck (`pnpm typecheck`)
6. Commit your changes
7. Push to the branch and open a Pull Request

All contributions must pass the full test suite and typecheck before merging.

---

## Acknowledgments

Built with [OpenCode](https://opencode.ai), [Deepgram](https://deepgram.com), [Anthropic](https://anthropic.com), [Playwright](https://playwright.dev), [Three.js](https://threejs.org), and [Vite](https://vitejs.dev).

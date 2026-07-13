# AGENTS.md — Korvid Conventions

## Project Structure
pnpm monorepo with 13 workspace packages:
- `@korvid/shared` — Zod config schema, config file I/O
- `@korvid/cli` — CLI entry point, commands
- `@korvid/gateway` — HTTP+WebSocket server, REST API
- `@korvid/voice` — Voice pipeline, STT/TTS, reasoning, sounds
- `@korvid/dashboard` — React+Vite frontend
- `@korvid/tools` — PC control tools (screenshot, clipboard, files, etc.)
- `@korvid/delegation` — AI agent delegation loop
- `@korvid/messaging` — WhatsApp/Telegram bridges
- `@korvid/vision` — Screenshot analysis, OCR, camera
- `@korvid/browser` — Playwright browser automation
- `@korvid/memory` — Core/episodic memory store
- `@korvid/integrations` — Calendar/email integration

## Language & Runtime
- Pure TypeScript throughout
- Node.js LTS, ESM modules (`"type": "module"`)
- Zod for schema validation
- All `execSync` calls use argument arrays (never string interpolation)

## Testing
- **Test runner**: vitest
- **Run tests**: `pnpm run -r test` (all packages)
- **Run single package**: `pnpm vitest run` in package dir
- **Test location**: `*.test.ts` co-located with source

## Type Checking
- **Command**: `pnpm run -r typecheck`
- **Must pass** before any commit

## Build
- **Shared package must be built first**: `pnpm run --filter=@korvid/shared build`
- **Dashboard build**: `pnpm run --filter=@korvid/dashboard build`

## Code Style
- 2-space indentation
- Single quotes for strings
- Trailing commas in multiline
- No semicolons (except in statements)
- Prefer `const` over `let`
- Explicit return types on exported functions
- `Record<string, T>` over `Map` for serializable data

## Brand Identity
- **Colors**: Obsidian `#12151A`, Graphite `#1C2126`, Slate `#2A3138`, Bone `#E8EAED`, Sheen `#7C8CFF`, Ember `#FF6B4A`
- **Typography**: IBM Plex Mono (code/CLI), Space Grotesk (body/UI)
- **Copy voice**: Plain, active, direct. No filler, no forced warmth, no apology-by-default. Dry wit earned, not constant.
- **CLI**: Use `●` (active), `○` (idle), `◐` (processing), `✕` (error) as status glyphs
- **Dashboard**: Dark theme only. Sheen for active states, Ember for warnings/confirmations only.

## Security
- Never log secrets or API keys
- All file paths validated before access
- `realpathSync` to resolve symlinks before path checks
- WebSocket auth via token query parameter
- Tool permissions: deny takes precedence over allow

## Gateway REST API
All endpoints require `x-auth-token` header (except `/health` and `/api/token`):
- `GET /health` — unauthenticated health check
- `POST /api/token` — returns auth token
- `GET /api/memory` — core entries + graph nodes
- `GET /api/memory/stats` — memory statistics
- `POST /api/memory/consolidate` — merge similar episodic entries
- `GET /api/delegation-events` — recent delegation events
- `GET/POST /api/tool-permissions` — tool permission config
- `GET /api/suggestions` — suggestion engine status
- `GET /api/integrations/status` — calendar/email integration status
- `GET/POST /api/triggers` — webhook trigger config
- `GET /api/workflows` — workflow engine status
- `GET /api/voice-personality` — voice personality config

## Voice Pipeline
State machine: `idle → listening → processing → speaking → idle`
- Config: `voice.vad`, `voice.clapActivation`, `voice.personality`
- Multi-turn: maintains 20-turn `ChatMessage[]` history
- Session persistence: saves to `~/.korvid/session/history.json`
- Streaming: `reasoning.stream()` yields `StreamChunk` tokens

## Memory Store
- Core: key-value facts in `~/.korvid/memory/core.json`
- Episodic: timestamped events in `~/.korvid/memory/episodic/`
- Edges: relationship graph in `~/.korvid/memory/edges.json`
- Consolidation: merges entries with >60% cosine similarity

## pnpm
- Path: `~/.local/bin/pnpm`
- Must use `export PATH="$HOME/.local/bin:$PATH"` before pnpm commands
- `pnpm approve-builds` needed after first install for native deps

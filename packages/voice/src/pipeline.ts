import { EventEmitter } from "node:events";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { ChatMessage, ToolDefinition, ReasoningResult } from "./reasoning.js";
import { captureAudio } from "./audio-capture.js";
import { createVAD } from "./vad.js";
import { getGreeting } from "./greetings.js";
import { createSuggestionEngine } from "./suggestions.js";
import type { WorkshopLogStore } from "./workshop-log.js";
import type { FocusMode } from "./focus-mode.js";
import type { DebriefMode } from "./debrief-mode.js";

export type PipelineState = "idle" | "listening" | "processing" | "speaking";

export interface PipelineEvent {
  state: PipelineState;
  transcript?: string;
  response?: string;
  latencyMs?: number;
  error?: string;
  partialTranscript?: string;
  streamingToken?: string;
}

export interface VoicePipeline {
  start(): Promise<void>;
  stop(): Promise<void>;
  trigger(): void;
  triggerListen(): void;
  getState(): PipelineState;
  getHistory(): ChatMessage[];
  clearHistory(): void;
  isLogging(): boolean;
  isLockdown(): boolean;
  getDebrief(): DebriefMode | undefined;
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
}

const MAX_HISTORY = 20;
const SUMMARIZE_THRESHOLD = 15; // Start summarizing when history exceeds this
const SYSTEM_PROMPT = "You are Korvid. Concise, direct, no filler. Responses under 3 sentences unless asked for detail. Plain language, active voice. Dry wit only when earned.";

function expandHome(p: string): string {
  return p.replace(/^~/, homedir());
}

export function createVoicePipeline(deps: {
  wakeWord: { onWake: (cb: () => void) => void; start: () => Promise<void>; stop: () => Promise<void> };
  stt: { transcribe: (audio: Buffer) => Promise<string>; transcribeStream?: (stream: NodeJS.ReadableStream, onPartial?: (text: string, isFinal: boolean) => void) => Promise<string> };
  reasoning: {
    prompt: (text: string) => Promise<string>;
    chat: (messages: ChatMessage[], tools?: ToolDefinition[]) => Promise<ReasoningResult>;
    stream?: (messages: ChatMessage[], tools?: ToolDefinition[]) => AsyncIterable<{ text: string; done: boolean; toolCalls?: any[] }>;
  };
  tts: { speak: (text: string, opts?: { onInterrupt?: () => void }) => Promise<void>; stop: () => void };
  sounds: { play: (name: string) => Promise<void> };
  clapDetector?: { on: (event: string, handler: (...args: unknown[]) => void) => void; processAudio: (chunk: Buffer) => void; stop: () => void };
  config?: { sessionPersist?: boolean; sessionPath?: string; vad?: boolean; vadSilenceMs?: number };
  tools?: { definitions: ToolDefinition[]; execute: (name: string, args: Record<string, unknown>) => Promise<string> };
  memory?: { store: any; onSuggestion?: (suggestion: any) => void };
  personality?: { getActive: () => any; buildSystemPrompt: (profile: any) => string };
  triggers?: { onTrigger: (cb: (event: any) => void) => void; start: () => Promise<void>; stop: () => Promise<void> };
  workshopLog?: WorkshopLogStore;
  focusMode?: FocusMode;
  debrief?: DebriefMode;
}): VoicePipeline {
  const emitter = new EventEmitter();
  let state: PipelineState = "idle";

  const sessionPersist = deps.config?.sessionPersist ?? false;
  const sessionPath = deps.config?.sessionPath
    ? expandHome(deps.config.sessionPath)
    : join(homedir(), ".korvid", "session");

  const useVAD = deps.config?.vad ?? false;
  const vadSilenceMs = deps.config?.vadSilenceMs ?? 1500;

  // Set up suggestion engine if memory is provided
  let suggestionEngine: any = null;
  if (deps.memory?.store) {
    suggestionEngine = createSuggestionEngine({ memory: deps.memory.store });
    if (deps.memory.onSuggestion) {
      suggestionEngine.onSuggestion(deps.memory.onSuggestion);
    }
  }

  // Build system prompt from personality if provided
  const systemPrompt = deps.personality
    ? deps.personality.buildSystemPrompt(deps.personality.getActive())
    : SYSTEM_PROMPT;

  const history: ChatMessage[] = [
    { role: "system", content: systemPrompt },
  ];

  let summarizedContext = ""; // Stores the summary of older turns

  if (sessionPersist) loadSession();

  // Handle webhook trigger events
  function handleTriggerEvent(event: any) {
    if (state !== "idle") return;
    console.log(`[triggers] Received trigger: ${event.source}/${event.type}`);
    // Process trigger as a voice command
    const triggerMessage = `Webhook trigger from ${event.source}: ${event.type}. Payload: ${JSON.stringify(event.payload)}`;
    processUserInput(triggerMessage);
  }

  // Process user input (either from voice or trigger)
  async function processUserInput(input: string) {
    if (state !== "idle") return;
    
    state = "processing";
    emitter.emit("state", "processing");
    emit({ state: "processing", transcript: input });

    history.push({ role: "user", content: input });

    try {
      let response: string;

      if (deps.reasoning.stream) {
        let fullText = "";
        for await (const chunk of deps.reasoning.stream(history, deps.tools?.definitions)) {
          if (chunk.text) {
            fullText += chunk.text;
            emitter.emit("streaming_token", chunk.text);
            emit({ state: "processing", streamingToken: chunk.text });
          }
        }
        response = fullText;
      } else {
        const result = await deps.reasoning.chat(history, deps.tools?.definitions);
        response = result.text;
      }

      history.push({ role: "assistant", content: response });
      if (sessionPersist) saveSession();

      setState("speaking");
      await deps.tts.speak(response);
      setState("idle");
    } catch (err) {
      console.error(`[voice] Trigger processing error: ${err}`);
      setState("idle");
    }
  }

  function emit(event: PipelineEvent) {
    emitter.emit("pipeline", event);
    emitter.emit(event.state, event);
  }

  function loadSession() {
    const histPath = join(sessionPath, "history.json");
    try {
      if (existsSync(histPath)) {
        const saved = JSON.parse(readFileSync(histPath, "utf-8"));
        if (Array.isArray(saved)) {
          // Legacy format: just history array
          history.length = 1;
          for (const msg of saved.slice(0, MAX_HISTORY)) {
            if (msg.role === "system") continue;
            history.push(msg);
          }
          console.log(`[voice] Restored ${history.length - 1} conversation turns from session`);
        } else if (saved.history && Array.isArray(saved.history)) {
          // New format: { history, summarizedContext }
          history.length = 1;
          summarizedContext = saved.summarizedContext || "";
          for (const msg of saved.history.slice(0, MAX_HISTORY)) {
            if (msg.role === "system") continue;
            history.push(msg);
          }
          console.log(`[voice] Restored ${history.length - 1} conversation turns from session`);
          if (summarizedContext) {
            console.log(`[voice] Restored summarized context: "${summarizedContext.slice(0, 50)}..."`);
          }
        }
      }
    } catch { /* ignore */ }
  }

  function saveSession() {
    try {
      mkdirSync(sessionPath, { recursive: true });
      const sessionData = {
        history,
        summarizedContext,
      };
      writeFileSync(join(sessionPath, "history.json"), JSON.stringify(sessionData, null, 2));
    } catch (err) {
      console.error(`[voice] Failed to save session: ${err}`);
    }
  }

  async function summarizeOldTurns(): Promise<void> {
    // Only summarize if we have enough history
    if (history.length <= SUMMARIZE_THRESHOLD) return;

    // Get the older turns (excluding system prompt and recent turns)
    const turnsToSummarize = history.slice(1, history.length - 5);
    if (turnsToSummarize.length < 3) return;

    // Create a summary prompt
    const summaryPrompt: ChatMessage[] = [
      { role: "system", content: "Summarize the following conversation history in 2-3 sentences. Focus on key topics, decisions, and user preferences. Be concise." },
      { role: "user", content: turnsToSummarize.map(m => `${m.role}: ${m.content}`).join("\n") },
    ];

    try {
      // Use the reasoning client to generate a summary
      const result = await deps.reasoning.chat(summaryPrompt);
      if (result.text) {
        summarizedContext = result.text;
        console.log(`[voice] Summarized ${turnsToSummarize.length} turns into context`);

        // Remove the summarized turns, keeping system prompt and recent turns
        history.splice(1, turnsToSummarize.length);
      }
    } catch (err) {
      console.error(`[voice] Failed to summarize turns: ${err}`);
      // Fallback to truncation
      history.splice(1, turnsToSummarize.length);
    }
  }

  async function handleWake() {
    if (state !== "idle") return;
    await runTurn();
  }

  async function handleClapActivation() {
    if (state !== "idle") return;

    console.log("[clap-detector] Clap activation triggered!");

    // Play boot-up sound sequence
    await deps.sounds.play("clap-boot");

    // Speak a greeting
    const greeting = getGreeting();
    console.log(`[clap-detector] Greeting: "${greeting}"`);

    // Enter listening state after greeting
    state = "listening";
    emitter.emit("state", "listening");
    emit({ state: "listening", partialTranscript: greeting });

    // Speak the greeting, then listen for command
    await deps.tts.speak(greeting, {
      onInterrupt: () => {
        console.log("[clap-detector] Interrupted during greeting");
        deps.tts.stop();
        setState("idle");
      },
    });

    // Now listen for the user's command
    await runTurn();
  }

  // Check if transcript is a mode command
  function checkModeCommands(transcript: string): boolean {
    const lower = transcript.toLowerCase().trim();

    // Workshop log commands
    if (lower.startsWith("start a log") || lower.startsWith("log this")) {
      const tagMatch = lower.match(/(?:log this for|log for) (.+)/);
      const tag = tagMatch ? tagMatch[1].trim() : undefined;
      if (deps.workshopLog) {
        const log = deps.workshopLog.startLog(tag);
        console.log(`[workshop] Log started: ${log.id}${tag ? ` for "${tag}"` : ""}`);
        deps.sounds.play("log-start");
      }
      return true;
    }

    if (lower === "end log" || lower === "stop logging") {
      if (deps.workshopLog) {
        const active = deps.workshopLog.getActiveLog();
        if (active) {
          deps.workshopLog.endLog(active.id);
          console.log(`[workshop] Log ended: ${active.id}`);
          deps.sounds.play("log-end");
        }
      }
      return true;
    }

    if (lower.startsWith("summarize") && lower.includes("log")) {
      // Handle log summarization
      if (deps.workshopLog) {
        const active = deps.workshopLog.getActiveLog();
        if (active) {
          deps.workshopLog.summarizeLog(active.id).then((summary) => {
            deps.tts.speak(summary);
          });
        }
      }
      return true;
    }

    // Focus/lockdown commands
    if (lower === "lockdown" || lower === "focus mode") {
      if (deps.focusMode) {
        deps.focusMode.activate({ reason: "User activated lockdown" });
        deps.sounds.play("lockdown-start");
      }
      return true;
    }

    if (lower === "end lockdown") {
      if (deps.focusMode) {
        const heldItems = deps.focusMode.deactivate();
        if (deps.debrief && heldItems.length > 0) {
          for (const item of heldItems) {
            deps.debrief.recordEvent("held_item", item.message, item.priority);
          }
        }
        deps.sounds.play("lockdown-end");
      }
      return true;
    }

    return false;
  }

  async function runTurn() {
    state = "listening";
    const totalStart = Date.now();
    emitter.emit("state", "listening");
    emit({ state: "listening" });
    deps.sounds.play("wake-ack");

    try {
      let transcript: string;

      if (useVAD) {
        // VAD mode: continuous listening until silence
        transcript = await listenWithVAD();
      } else {
        // Fixed-duration mode
        console.log("[voice] Recording audio...");
        const audioBuffer = await captureAudio(10000);
        const sttLatency = Date.now() - totalStart;

        if (audioBuffer.length > 0) {
          if (deps.stt.transcribeStream) {
            const { Readable } = await import("node:stream");
            const stream = Readable.from(audioBuffer);
            transcript = await deps.stt.transcribeStream(stream, (partial: string) => {
              emitter.emit("partial_transcript", partial);
              emit({ state: "listening", partialTranscript: partial });
            });
          } else {
            transcript = await deps.stt.transcribe(audioBuffer);
          }
        } else {
          console.log("[voice] No audio captured (install sox for mic support)");
          transcript = "";
        }
      }

      if (!transcript || transcript.trim().length === 0) {
        setState("idle");
        return;
      }

      console.log(`[voice] STT: "${transcript}"`);

      // Check for mode commands first
      if (checkModeCommands(transcript)) {
        setState("idle");
        return;
      }

      // Handle workshop log mode - capture without response
      if (deps.workshopLog?.getActiveLog()) {
        const log = deps.workshopLog.getActiveLog()!;
        deps.workshopLog.addEntry(log.id, transcript);
        deps.sounds.play("log-capture");
        setState("idle");
        return;
      }

      // Handle focus mode - suppress proactive responses
      if (deps.focusMode?.isActive()) {
        // Direct requests still work, but proactive items are suppressed
        // For now, continue processing but debrief will handle held items
      }

      // Reasoning with streaming
      setState("processing");
      const reasoningStart = Date.now();

      history.push({ role: "user", content: transcript });

      // Summarize old turns if history is getting too long
      if (history.length > SUMMARIZE_THRESHOLD) {
        await summarizeOldTurns();
      }

      // Ensure we don't exceed MAX_HISTORY
      while (history.length > MAX_HISTORY + 1) {
        history.splice(1, 1);
      }

      let response: string;

      if (deps.reasoning.stream) {
        // Streaming reasoning
        let fullText = "";
        for await (const chunk of deps.reasoning.stream(history, deps.tools?.definitions)) {
          if (chunk.text) {
            fullText += chunk.text;
            emitter.emit("streaming_token", chunk.text);
            emit({ state: "processing", streamingToken: chunk.text });
          }
          if (chunk.toolCalls && chunk.toolCalls.length > 0 && deps.tools) {
            // Handle tool calls
            for (const toolCall of chunk.toolCalls) {
              console.log(`[voice] Tool call: ${toolCall.function.name}`);
              const args = JSON.parse(toolCall.function.arguments);
              const result = await deps.tools.execute(toolCall.function.name, args);
              history.push({ role: "tool", content: result, name: toolCall.function.name });
              // Re-run reasoning with tool result
              const toolResult = await deps.reasoning.chat(history, deps.tools.definitions);
              fullText += toolResult.text;
              emitter.emit("streaming_token", toolResult.text);
              emit({ state: "processing", streamingToken: toolResult.text });
            }
          }
        }
        response = fullText;
      } else {
        // Non-streaming fallback
        const result = await deps.reasoning.chat(history, deps.tools?.definitions);
        
        // Handle tool calls if present
        if (result.toolCalls && result.toolCalls.length > 0 && deps.tools) {
          let toolResponse = result.text;
          for (const toolCall of result.toolCalls) {
            console.log(`[voice] Tool call: ${toolCall.function.name}`);
            const args = JSON.parse(toolCall.function.arguments);
            const toolResult = await deps.tools.execute(toolCall.function.name, args);
            history.push({ role: "tool", content: toolResult, name: toolCall.function.name });
            // Re-run reasoning with tool result
            const nextResult = await deps.reasoning.chat(history, deps.tools.definitions);
            toolResponse += nextResult.text;
          }
          response = toolResponse;
        } else {
          response = result.text;
        }
      }

      const reasoningLatency = Date.now() - reasoningStart;
      console.log(`[voice] Reasoning (${reasoningLatency}ms): "${response.slice(0, 80)}..."`);

      history.push({ role: "assistant", content: response });
      if (sessionPersist) saveSession();

      // TTS
      setState("speaking");
      const ttsStart = Date.now();

      await deps.tts.speak(response, {
        onInterrupt: () => {
          console.log("[voice] Interrupted during speech");
          deps.tts.stop();
          setState("idle");
        },
      });

      const ttsLatency = Date.now() - ttsStart;
      const totalLatency = Date.now() - totalStart;
      console.log(`[voice] TTS (${ttsLatency}ms), Total (${totalLatency}ms)`);

      emit({ state: "idle", transcript, response, latencyMs: totalLatency });
      setState("idle");
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[voice] Pipeline error: ${error}`);
      deps.sounds.play("failure");
      emit({ state: "idle", error });
      setState("idle");
    }
  }

  async function listenWithVAD(): Promise<string> {
    const vad = createVAD({ silenceThresholdMs: vadSilenceMs });
    const { Readable } = await import("node:stream");

    console.log("[voice] VAD listening... (speak, then pause to stop)");

    // Capture audio continuously and feed to VAD
    const chunks: Buffer[] = [];
    let speechStarted = false;

    return new Promise<string>((resolve) => {
      vad.on("speech_start", () => {
        speechStarted = true;
        console.log("[voice] Speech detected");
        emitter.emit("partial_transcript", "(listening...)");
        emit({ state: "listening", partialTranscript: "(listening...)" });
      });

      vad.on("speech_end", async () => {
        console.log("[voice] Speech ended, transcribing...");
        const audio = Buffer.concat(chunks);
        chunks.length = 0;

        if (audio.length === 0) {
          resolve("");
          return;
        }

        let transcript: string;
        if (deps.stt.transcribeStream) {
          const stream = Readable.from(audio);
          transcript = await deps.stt.transcribeStream(stream, (partial: string) => {
            emitter.emit("partial_transcript", partial);
            emit({ state: "listening", partialTranscript: partial });
          });
        } else {
          transcript = await deps.stt.transcribe(audio);
        }
        resolve(transcript);
      });

      vad.on("silence", () => {
        if (speechStarted) {
          emitter.emit("partial_transcript", "");
        }
      });

      // Start continuous audio capture
      const captureAudioChunk = async () => {
        try {
          const buffer = await captureAudio(200);
          if (buffer.length > 0 && state === "listening") {
            chunks.push(buffer);
            vad.processAudio(buffer);
            captureAudioChunk(); // recursive for continuous capture
          }
        } catch {
          // capture failed
        }
      };

      captureAudioChunk();

      // Safety timeout
      setTimeout(() => {
        if (state === "listening") {
          vad.stop();
          resolve(Buffer.concat(chunks).length > 0 ? "" : "");
        }
      }, 30000);
    });
  }

  function setState(newState: PipelineState) {
    state = newState;
    emitter.emit("state", newState);
  }

  return {
    async start() {
      deps.wakeWord.onWake(handleWake);
      await deps.wakeWord.start();

      // Integrate clap detector if provided
      if (deps.clapDetector) {
        deps.clapDetector.on("clap", handleClapActivation);
        console.log("[voice] Clap detector active");
      }

      // Start suggestion engine if available
      if (suggestionEngine) {
        suggestionEngine.start();
        console.log("[voice] Suggestion engine started");
      }

      // Set up trigger listener if provided
      if (deps.triggers) {
        deps.triggers.onTrigger(handleTriggerEvent);
        console.log("[voice] Trigger listener active");
      }

      console.log("[voice] Pipeline started, listening for wake word...");
    },

    async stop() {
      deps.tts.stop();
      await deps.wakeWord.stop();
      if (deps.clapDetector) deps.clapDetector.stop();
      if (suggestionEngine) suggestionEngine.stop();
      if (sessionPersist) saveSession();
      setState("idle");
      console.log("[voice] Pipeline stopped");
    },

    trigger() {
      handleWake();
    },

    triggerListen() {
      if (state === "idle") {
        runTurn();
      }
    },

    getState() { return state; },
    getHistory() { return [...history]; },
    clearHistory() {
      history.length = 1;
      if (sessionPersist) saveSession();
      console.log("[voice] Conversation history cleared");
    },

    isLogging() {
      return deps.workshopLog?.getActiveLog() !== undefined;
    },

    isLockdown() {
      return deps.focusMode?.isActive() ?? false;
    },

    getDebrief() {
      return deps.debrief;
    },

    on(event: string, handler: (...args: unknown[]) => void) { emitter.on(event, handler); },
    off(event: string, handler: (...args: unknown[]) => void) { emitter.off(event, handler); },
  };
}

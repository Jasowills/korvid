export { createVoicePipeline, type VoicePipeline, type PipelineState } from "./pipeline.js";
export { createWakeWordDetector, type WakeWordDetector } from "./wake-word.js";
export { createClapDetector, type ClapDetector, type ClapDetectorOptions, generateClapAudio, generateDoubleClapAudio, generateKnockAudio } from "./clap-detector.js";
export { createSTT, type STTEngine } from "./stt.js";
export { createTTS, type TTSEngine } from "./tts.js";
export { createReasoningClient, type ReasoningClient, type ChatMessage, type ToolDefinition, type ReasoningResult, type StreamChunk } from "./reasoning.js";
export { SoundLibrary, type SoundName } from "./sounds.js";
export { createAudioCapture, captureAudio, type AudioCapture } from "./audio-capture.js";
export { createVAD, type VAD, type VADOptions, generateSilentAudio, generateNoisyAudio } from "./vad.js";
export { getGreeting, getTimeAwarePrefix } from "./greetings.js";
export { createSuggestionEngine, type SuggestionEngine, type Suggestion } from "./suggestions.js";
export { createWorkflowEngine, type WorkflowEngine, type Workflow, type TaskChain, type WorkflowStep } from "./workflow.js";
export { createWorkflowTools, executeWorkflowTool, type WorkflowToolDeps } from "./workflow-tools.js";
export { createVoicePersonalityManager, type VoicePersonalityManager, type VoiceProfile } from "./personality.js";
export { createTriggerManager, type TriggerManager, type TriggerEvent, type WebhookTrigger } from "./triggers.js";
export { createIntegrationTools, executeIntegrationTool, type IntegrationToolDeps } from "./integration-tools.js";

// Workshop Log (Dictaphone Mode)
export { createWorkshopLogStore, type WorkshopLogStore, type WorkshopLog, type LogEntry } from "./workshop-log.js";

// Focus/Lockdown Mode
export { createFocusMode, type FocusMode, type HeldItem } from "./focus-mode.js";

// Risk Estimation (shared by Confidence Readout and Simulate Mode)
export { createRiskEstimator, type RiskEstimator, type RiskEstimate, type RiskFactor, type DeploymentContext, type ActionContext } from "./risk-estimation.js";

// Debrief Mode
export { createDebriefMode, type DebriefMode, type DebriefItem } from "./debrief-mode.js";

// Simulate/Dry-Run Mode
export { createSimulateMode, type SimulateMode, type SimulationResult, type SimulationContext, type ValidationResultPreview } from "./simulate-mode.js";

// Pre-Approved Auto-Rollback
export { createAutoRollback, type AutoRollback, type RollbackThreshold, type PostDeployMetrics, type RollbackEvent } from "./auto-rollback.js";

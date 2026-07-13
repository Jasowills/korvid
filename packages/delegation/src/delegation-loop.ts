import { EventEmitter } from "node:events";
import { type KorvidConfig } from "@korvid/shared";
import { detectAgents, getPreferredAgent, type AgentInfo } from "./agent-detection.js";
import { generateSpec, formatSpecForAgent, type Spec } from "./spec-generator.js";
import { createSandbox, type Sandbox } from "./sandbox.js";
import { createCheckpoint, type Checkpoint } from "./checkpoint.js";
import { createValidator, type ValidationResult } from "./validator.js";

export interface DelegationEvent {
  type: "spec_generated" | "agent_selected" | "delegation_started" | "sandbox_created" |
        "agent_running" | "validation_started" | "validation_passed" | "validation_failed" |
        "retry" | "escalated" | "completed" | "error";
  timestamp: number;
  data: Record<string, unknown>;
}

export interface DelegationLoop {
  run(request: string, opts?: { workspacePath?: string }): Promise<DelegationResult>;
  on(event: string, handler: (...args: unknown[]) => void): void;
}

export interface DelegationResult {
  success: boolean;
  spec: Spec;
  agent: AgentInfo;
  attempts: number;
  validationResult?: ValidationResult;
  checkpoints: Checkpoint[];
  error?: string;
  escalatedToUser?: string;
}

export function createDelegationLoop(config: KorvidConfig): DelegationLoop {
  const emitter = new EventEmitter();
  const validator = createValidator();

  function emit(type: DelegationEvent["type"], data: Record<string, unknown> = {}) {
    const event: DelegationEvent = { type, timestamp: Date.now(), data };
    emitter.emit("event", event);
    console.log(`[delegation] ${type}: ${JSON.stringify(data).slice(0, 200)}`);
  }

  return {
    async run(request: string, opts?: { workspacePath?: string }): Promise<DelegationResult> {
      const startTime = Date.now();
      const maxAttempts = config.delegation.maxAttempts;
      const maxWallClockMs = config.delegation.maxWallClockMinutes * 60 * 1000;

      // Step 1: Detect agents
      emit("delegation_started", { request: request.slice(0, 100) });

      const agent = getPreferredAgent(config.delegation.preferredAgent);
      if (!agent) {
        const error = "No coding agent found. Install opencode or claude: npm install -g opencode";
        emit("error", { error });
        return {
          success: false,
          spec: generateSpec(request, "unknown"),
          agent: { id: "unknown", name: "None", available: false },
          attempts: 0,
          checkpoints: [],
          error,
          escalatedToUser: error,
        };
      }

      emit("agent_selected", { agent: agent.id, name: agent.name, version: agent.version });

      // Step 2: Generate spec
      const spec = generateSpec(request, agent.id);
      emit("spec_generated", { specId: spec.id, title: spec.title });

      const checkpoints: Checkpoint[] = [];
      let lastValidation: ValidationResult | undefined;
      let attempts = 0;

      // Step 3: Delegation loop
      while (attempts < maxAttempts) {
        // Check wall clock
        if (Date.now() - startTime > maxWallClockMs) {
          emit("escalated", { reason: "Wall clock limit exceeded" });
          return {
            success: false,
            spec,
            agent,
            attempts,
            validationResult: lastValidation,
            checkpoints,
            error: `Wall clock limit (${config.delegation.maxWallClockMinutes}min) exceeded`,
            escalatedToUser: "Delegation timed out. Please try a simpler approach or increase the time limit.",
          };
        }

        attempts++;
        const sandboxId = `${spec.id}-attempt-${attempts}`;
        const sandbox = createSandbox({
          id: sandboxId,
          workspacePath: opts?.workspacePath,
          timeoutMinutes: config.delegation.maxWallClockMinutes,
        });

        try {
          // Create sandbox
          emit("sandbox_created", { sandboxId, workDir: sandbox.workDir });
          await sandbox.create();

          // Checkpoint before delegation
          if (opts?.workspacePath) {
            const cp = createCheckpoint({
              workspacePath: opts.workspacePath,
              message: `Pre-delegation checkpoint (attempt ${attempts})`,
            });
            if (cp) checkpoints.push(cp);
          }

          // Step 3a: Write spec to sandbox
          const specContent = formatSpecForAgent(spec);
          await sandbox.run(`echo '${specContent.replace(/'/g, "'\\''")}' > /tmp/spec.md`);

          // Step 3b: Run the coding agent
          emit("agent_running", { agent: agent.id, attempt: attempts, sandboxId });

          let agentResult: { stdout: string; stderr: string; exitCode: number };

          if (agent.id === "opencode") {
            agentResult = await sandbox.run(
              `cd "${sandbox.workDir}" && opencode -y "Read /tmp/spec.md and implement the requirements described in it. After implementing, run the test suite and commit your changes." 2>&1`,
              { timeout: (config.delegation.maxWallClockMinutes - 2) * 60 * 1000 }
            );
          } else if (agent.id === "claude") {
            agentResult = await sandbox.run(
              `cd "${sandbox.workDir}" && claude -y "Read /tmp/spec.md and implement the requirements described in it. After implementing, run the test suite and commit your changes." 2>&1`,
              { timeout: (config.delegation.maxWallClockMinutes - 2) * 60 * 1000 }
            );
          } else {
            agentResult = { stdout: "", stderr: "Unknown agent", exitCode: 1 };
          }

          // Checkpoint after delegation
          if (opts?.workspacePath) {
            const cp = createCheckpoint({
              workspacePath: opts.workspacePath,
              message: `Post-delegation checkpoint (attempt ${attempts})`,
            });
            if (cp) checkpoints.push(cp);
          }

          // Step 4: Self-validate
          emit("validation_started", { attempt: attempts });
          const validation = await validator.validate(sandbox, spec);
          lastValidation = validation;

          if (validation.passed) {
            emit("validation_passed", {
              attempt: attempts,
              testsRun: validation.testsRun,
              testsFailed: validation.testsFailed,
            });

            // Merge changes back if workspace path provided
            let mergeSuccess = true;
            if (opts?.workspacePath) {
              try {
                const { execFileSync } = await import("node:child_process");
                execFileSync("git", ["merge", "--no-edit", sandbox.workDir], {
                  cwd: opts.workspacePath,
                  timeout: 30000,
                  stdio: "pipe",
                });
              } catch {
                mergeSuccess = false;
                emit("retry", { reason: "Merge conflicts" });
              }
            }

            if (!mergeSuccess) {
              return {
                success: false,
                spec,
                agent,
                attempts,
                validationResult: validation,
                checkpoints,
                error: "Merge conflicts — manual resolution required",
                escalatedToUser: "Code was written and validated but could not be merged automatically due to conflicts.",
              };
            }

            return {
              success: true,
              spec,
              agent,
              attempts,
              validationResult: validation,
              checkpoints,
            };
          }

          // Validation failed — retry or escalate
          emit("validation_failed", {
            attempt: attempts,
            testsFailed: validation.testsFailed,
            errors: validation.errors,
          });

          // Generate revision feedback
          spec.description += `\n\n## Previous attempt (attempt ${attempts}) failed validation:\n${validation.errors.join("\n")}\n\nPlease fix these issues.`;

        } catch (err) {
          emit("error", { error: err instanceof Error ? err.message : String(err), attempt: attempts });
        } finally {
          await sandbox.destroy().catch(() => {});
        }
      }

      // All attempts exhausted — escalate
      emit("escalated", { attempts, reason: "Max attempts exceeded" });
      return {
        success: false,
        spec,
        agent,
        attempts,
        validationResult: lastValidation,
        checkpoints,
        error: `Max attempts (${maxAttempts}) exhausted without passing validation`,
        escalatedToUser: `I tried ${attempts} times but couldn't complete the task. Here's what was attempted:\n${checkpoints.map((c) => `- ${c.message}`).join("\n")}\nLast validation: ${lastValidation?.errors.join(", ") ?? "N/A"}`,
      };
    },

    on(event: string, handler: (...args: unknown[]) => void) {
      emitter.on(event, handler);
    },
  };
}

export type StepStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export interface WorkflowStep {
  id: string;
  name: string;
  type: "reasoning" | "tool" | "condition" | "transform";
  config: Record<string, unknown>;
  dependsOn?: string[];
  status: StepStatus;
  result?: unknown;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  steps: WorkflowStep[];
  status: "idle" | "running" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
}

export interface TaskChain {
  id: string;
  name: string;
  trigger: string;
  steps: WorkflowStep[];
  enabled: boolean;
  lastRun?: number;
}

export interface WorkflowEngine {
  createWorkflow(name: string, steps: Omit<WorkflowStep, "id" | "status">[]): Workflow;
  runWorkflow(id: string, context?: Record<string, unknown>): Promise<Workflow>;
  getWorkflow(id: string): Workflow | undefined;
  listWorkflows(): Workflow[];
  createChain(name: string, trigger: string, steps: Omit<WorkflowStep, "id" | "status">[]): TaskChain;
  runChain(name: string, input?: Record<string, unknown>): Promise<Record<string, unknown>>;
  listChains(): TaskChain[];
}

const MAX_CONCURRENT = 3;

export function createWorkflowEngine(deps: {
  reasoning?: { prompt: (text: string) => Promise<string>; chat: (messages: { role: string; content: string }[]) => Promise<{ text: string }> };
  tools?: { execute: (name: string, params: Record<string, unknown>) => Promise<{ success: boolean; output: string; error?: string }> };
}): WorkflowEngine {
  const workflows = new Map<string, Workflow>();
  const chains = new Map<string, TaskChain>();

  let idCounter = 0;
  function genId(): string {
    return `wf-${Date.now()}-${(idCounter++).toString(36)}`;
  }

  async function executeStep(step: WorkflowStep, context: Record<string, unknown>): Promise<unknown> {
    step.status = "running";
    step.startedAt = Date.now();

    try {
      let result: unknown;

      switch (step.type) {
        case "reasoning":
          if (!deps.reasoning) throw new Error("No reasoning client available");
          const prompt = interpolate(step.config.prompt as string, context);
          const response = await deps.reasoning.prompt(prompt);
          result = response;
          break;

        case "tool":
          if (!deps.tools) throw new Error("No tools available");
          const toolResult = await deps.tools.execute(
            step.config.tool as string,
            step.config.params as Record<string, unknown> ?? {}
          );
          if (!toolResult.success) throw new Error(toolResult.error ?? "Tool execution failed");
          result = toolResult.output;
          break;

        case "condition":
          const condition = evaluateCondition(step.config.condition as string, context);
          if (!condition) {
            step.status = "skipped";
            return null;
          }
          result = condition;
          break;

        case "transform":
          result = applyTransform(step.config.transform as string, context, step.config.input as string);
          break;

        default:
          throw new Error(`Unknown step type: ${step.type}`);
      }

      step.status = "completed";
      step.result = result;
      step.completedAt = Date.now();
      return result;
    } catch (err) {
      step.status = "failed";
      step.error = err instanceof Error ? err.message : String(err);
      step.completedAt = Date.now();
      throw err;
    }
  }

  function interpolate(template: string, context: Record<string, unknown>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => String(context[key] ?? ""));
  }

  function evaluateCondition(condition: string, context: Record<string, unknown>): boolean {
    // Simple condition evaluation
    // Supports: "exists(key)", "equals(key,value)", "gt(key,value)", "lt(key,value)"
    const match = condition.match(/^(\w+)\((.+)\)$/);
    if (!match) return true;

    const [, op, args] = match;
    const parts = args.split(",").map((s) => s.trim());

    switch (op) {
      case "exists":
        return context[parts[0]] !== undefined;
      case "equals":
        return String(context[parts[0]]) === parts[1];
      case "gt":
        return Number(context[parts[0]]) > Number(parts[1]);
      case "lt":
        return Number(context[parts[0]]) < Number(parts[1]);
      default:
        return true;
    }
  }

  function applyTransform(transform: string, context: Record<string, unknown>, inputKey?: string): unknown {
    const input = inputKey ? context[inputKey] : context;
    switch (transform) {
      case "stringify":
        return JSON.stringify(input);
      case "uppercase":
        return String(input).toUpperCase();
      case "lowercase":
        return String(input).toLowerCase();
      case "slice":
        return String(input).slice(0, 100);
      default:
        return input;
    }
  }

  return {
    createWorkflow(name, steps): Workflow {
      const workflow: Workflow = {
        id: genId(),
        name,
        steps: steps.map((s) => ({ ...s, id: genId(), status: "pending" as const })),
        status: "idle",
        createdAt: Date.now(),
      };
      workflows.set(workflow.id, workflow);
      return workflow;
    },

    async runWorkflow(id, context = {}): Promise<Workflow> {
      const workflow = workflows.get(id);
      if (!workflow) throw new Error(`Workflow not found: ${id}`);

      workflow.status = "running";

      try {
        for (const step of workflow.steps) {
          if (step.dependsOn?.some((depId) => {
            const dep = workflow.steps.find((s) => s.id === depId);
            return dep?.status !== "completed";
          })) {
            step.status = "skipped";
            continue;
          }

          await executeStep(step, context);

          // Store result in context for dependent steps
          if (step.result !== undefined) {
            context[step.name] = step.result;
          }
        }

        workflow.status = "completed";
      } catch (err) {
        workflow.status = "failed";
      }

      workflow.completedAt = Date.now();
      return workflow;
    },

    getWorkflow(id) { return workflows.get(id); },
    listWorkflows() { return Array.from(workflows.values()); },

    createChain(name, trigger, steps): TaskChain {
      const chain: TaskChain = {
        id: genId(),
        name,
        trigger,
        steps: steps.map((s) => ({ ...s, id: genId(), status: "pending" as const })),
        enabled: true,
      };
      chains.set(name, chain);
      return chain;
    },

    async runChain(name, input = {}): Promise<Record<string, unknown>> {
      const chain = chains.get(name);
      if (!chain) throw new Error(`Chain not found: ${name}`);
      if (!chain.enabled) throw new Error(`Chain disabled: ${name}`);

      const context = { ...input };
      chain.lastRun = Date.now();

      for (const step of chain.steps) {
        const result = await executeStep(step, context);
        if (result !== undefined && result !== null) {
          context[step.name] = result;
        }
      }

      return context;
    },

    listChains() { return Array.from(chains.values()); },
  };
}

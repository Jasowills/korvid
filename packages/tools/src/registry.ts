import { z } from "zod";
import type { KorvidConfig, ToolPermissions } from "@korvid/shared";
import type { Tool, ToolCall, ToolCallResult, ToolParameters, ToolResult } from "./types.js";

export interface ToolBudget {
  byTool: Record<string, { calls: number; totalMs: number; errors: number; totalTokens: number }>;
  totalCalls: number;
  totalMs: number;
  totalErrors: number;
}

export interface ToolRegistry {
  register(tool: Tool): void;
  get(name: string): Tool | undefined;
  list(): Tool[];
  listByCategory(category: string): Tool[];
  execute(name: string, params: ToolParameters, config: KorvidConfig): Promise<ToolCallResult>;
  getBudget(): ToolBudget;
  resetBudget(): void;
  setPermissions(perms: ToolPermissions): void;
}

export function createToolRegistry(): ToolRegistry {
  const tools = new Map<string, Tool>();
  let permissions: ToolPermissions = { enabled: true, allow: [], deny: [], requireConfirmation: [] };
  const budget: ToolBudget = {
    byTool: {},
    totalCalls: 0,
    totalMs: 0,
    totalErrors: 0,
  };

  function recordCall(name: string, durationMs: number, success: boolean) {
    budget.totalCalls++;
    budget.totalMs += durationMs;
    if (!success) budget.totalErrors++;

    if (!budget.byTool[name]) {
      budget.byTool[name] = { calls: 0, totalMs: 0, errors: 0, totalTokens: 0 };
    }
    budget.byTool[name].calls++;
    budget.byTool[name].totalMs += durationMs;
    if (!success) budget.byTool[name].errors++;
  }

  function isToolAllowed(name: string): { allowed: boolean; reason?: string } {
    if (!permissions.enabled) return { allowed: true };

    // Explicit deny takes precedence
    if (permissions.deny.length > 0) {
      const denied = permissions.deny.some((pattern) =>
        pattern === name || name.startsWith(pattern.replace("*", ""))
      );
      if (denied) return { allowed: false, reason: `Tool "${name}" is denied by policy` };
    }

    // If allow list exists, tool must be in it
    if (permissions.allow.length > 0) {
      const allowed = permissions.allow.some((pattern) =>
        pattern === name || name.startsWith(pattern.replace("*", ""))
      );
      if (!allowed) return { allowed: false, reason: `Tool "${name}" is not in the allow list` };
    }

    return { allowed: true };
  }

  function requiresConfirmation(name: string): boolean {
    return permissions.requireConfirmation.some((pattern) =>
      pattern === name || name.startsWith(pattern.replace("*", ""))
    );
  }

  return {
    register(tool: Tool) {
      tools.set(tool.name, tool);
    },

    get(name: string): Tool | undefined {
      return tools.get(name);
    },

    list(): Tool[] {
      return Array.from(tools.values());
    },

    listByCategory(category: string): Tool[] {
      return Array.from(tools.values()).filter((t) => t.category === category);
    },

    async execute(name: string, params: ToolParameters, config: KorvidConfig): Promise<ToolCallResult> {
      const tool = tools.get(name);
      if (!tool) {
        return {
          id: `call-${Date.now()}`,
          name,
          parameters: params,
          timestamp: Date.now(),
          result: { success: false, output: "", error: `Tool not found: ${name}` },
          durationMs: 0,
          confirmed: false,
        };
      }

      // Permission check
      const permission = isToolAllowed(name);
      if (!permission.allowed) {
        recordCall(name, 0, false);
        return {
          id: `call-${Date.now()}`,
          name,
          parameters: params,
          timestamp: Date.now(),
          result: { success: false, output: "", error: permission.reason },
          durationMs: 0,
          confirmed: false,
        };
      }

      // Safety + policy confirmation check
      const needsConfirm = tool.dangerous || requiresConfirmation(name);
      const confirmed = !needsConfirm || config.safety.requireConfirmationFor.some(
        (category) => isToolInCategory(name, category)
      );

      const call: ToolCall = {
        id: `call-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        parameters: params,
        timestamp: Date.now(),
      };

      const start = Date.now();
      let result: ToolResult;

      try {
        result = await tool.execute(params);
      } catch (err) {
        result = {
          success: false,
          output: "",
          error: err instanceof Error ? err.message : String(err),
        };
      }

      const durationMs = Date.now() - start;
      recordCall(name, durationMs, result.success);

      return {
        ...call,
        result,
        durationMs,
        confirmed,
      };
    },

    getBudget() {
      return { ...budget };
    },

    resetBudget() {
      budget.byTool = {};
      budget.totalCalls = 0;
      budget.totalMs = 0;
      budget.totalErrors = 0;
    },

    setPermissions(perms: ToolPermissions) {
      permissions = perms;
    },
  };
}

function isToolInCategory(toolName: string, category: string): boolean {
  const categoryMap: Record<string, string[]> = {
    deploy: ["run_command"],
    delete: ["write_file", "run_command"],
    spend: [],
    message: [],
    call: [],
  };
  return categoryMap[category]?.includes(toolName) ?? false;
}

export function toolsToFunctionSchema(tools: Tool[]): Record<string, unknown>[] {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: {
        type: "object",
        properties: Object.fromEntries(
          Object.entries(tool.parameters.shape).map(([key, schema]) => [
            key,
            zodToJsonSchema(schema as z.ZodTypeAny),
          ])
        ),
        required: Object.keys(tool.parameters.shape),
      },
    },
  }));
}

function zodToJsonSchema(schema: z.ZodTypeAny): Record<string, unknown> {
  if (schema instanceof z.ZodString) return { type: "string" };
  if (schema instanceof z.ZodNumber) return { type: "number" };
  if (schema instanceof z.ZodBoolean) return { type: "boolean" };
  if (schema instanceof z.ZodArray) return { type: "array", items: zodToJsonSchema(schema._def.type) };
  if (schema instanceof z.ZodOptional) return { ...zodToJsonSchema(schema._def.innerType), optional: true };
  return { type: "string" };
}

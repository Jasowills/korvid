import { z } from "zod";

export const ToolParameterSchema = z.record(z.string(), z.unknown());
export type ToolParameters = z.infer<typeof ToolParameterSchema>;

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: z.ZodObject<z.ZodRawShape>;
  dangerous: boolean;
  category: "system" | "filesystem" | "app" | "clipboard" | "network";
}

export interface ToolResult {
  success: boolean;
  output: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export type ToolExecutor = (params: ToolParameters) => Promise<ToolResult>;

export interface Tool extends ToolDefinition {
  execute: ToolExecutor;
}

export interface ToolCall {
  id: string;
  name: string;
  parameters: ToolParameters;
  timestamp: number;
}

export interface ToolCallResult extends ToolCall {
  result: ToolResult;
  durationMs: number;
  confirmed: boolean;
}

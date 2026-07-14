export const TOOLS_VERSION = "0.1.0";

export { type Tool, type ToolResult, type ToolCall, type ToolCallResult, type ToolParameters } from "./types.js";
export { createToolRegistry, toolsToFunctionSchema, type ToolRegistry, type ToolBudget } from "./registry.js";
export { screenshotTool } from "./screenshot.js";
export { openAppTool, closeAppTool, listAppsTool } from "./app-control.js";
export { clipboardReadTool, clipboardWriteTool } from "./clipboard.js";
export { listFilesTool, readFileTool, writeFileTool } from "./filesystem.js";
export { runCommandTool } from "./command.js";
export { visualizeTool } from "./visualize.js";
export { createToolCallingReasoning, type ToolCallingReasoningClient, type ToolCallingResult } from "./tool-calling.js";

import { createToolRegistry, type ToolRegistry } from "./registry.js";
import { screenshotTool } from "./screenshot.js";
import { openAppTool, closeAppTool, listAppsTool } from "./app-control.js";
import { clipboardReadTool, clipboardWriteTool } from "./clipboard.js";
import { listFilesTool, readFileTool, writeFileTool } from "./filesystem.js";
import { runCommandTool } from "./command.js";
import { visualizeTool } from "./visualize.js";

export function createDefaultRegistry(): ToolRegistry {
  const registry = createToolRegistry();
  registry.register(screenshotTool);
  registry.register(openAppTool);
  registry.register(closeAppTool);
  registry.register(listAppsTool);
  registry.register(clipboardReadTool);
  registry.register(clipboardWriteTool);
  registry.register(listFilesTool);
  registry.register(readFileTool);
  registry.register(writeFileTool);
  registry.register(runCommandTool);
  registry.register(visualizeTool);
  return registry;
}

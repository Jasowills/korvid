import type { KorvidConfig } from "@korvid/shared";
import type { ToolCallResult } from "./types.js";
import { toolsToFunctionSchema, type ToolRegistry } from "./registry.js";

export interface ToolCallingReasoningClient {
  promptWithTools(text: string, tools: ToolRegistry, config: KorvidConfig): Promise<ToolCallingResult>;
}

export interface ToolCallingResult {
  response: string;
  toolCalls: ToolCallResult[];
  allToolsPassed: boolean;
}

export function createToolCallingReasoning(config: KorvidConfig): ToolCallingReasoningClient {
  const provider = config.models.reasoning.provider;

  return {
    async promptWithTools(text: string, tools: ToolRegistry, korvidConfig: KorvidConfig): Promise<ToolCallingResult> {
      const toolCalls: ToolCallResult[] = [];
      const functionSchema = toolsToFunctionSchema(tools.list());
      const toolMap = new Map(tools.list().map((t) => [t.name, t]));

      // Build messages with tool context
      const toolDescriptions = functionSchema
        .map((s: Record<string, unknown>) => {
          const fn = s.function as Record<string, unknown>;
          return `- ${fn.name}: ${fn.description}`;
        })
        .join("\n");

      const enhancedPrompt = `${text}

Available tools:
${toolDescriptions}

To use a tool, respond with a JSON block:
\`\`\`tool
{"name": "tool_name", "params": {"param": "value"}}
\`\`\`

You may use multiple tools by including multiple tool blocks. After using tools, summarize the results.`;

      // Call reasoning provider
      let response: string;
      switch (provider) {
        case "ollama":
          response = await callOllamaWithTools(config.models.reasoning.model, enhancedPrompt);
          break;
        case "anthropic":
          response = await callAnthropicWithTools(config.models.reasoning.model, enhancedPrompt, config.models.reasoning.apiKey!);
          break;
        case "openai":
          response = await callOpenAIWithTools(config.models.reasoning.model, enhancedPrompt, config.models.reasoning.apiKey!);
          break;
        default:
          response = await callOllamaWithTools(config.models.reasoning.model, enhancedPrompt);
      }

      // Parse tool calls from response
      const toolCallRegex = /```tool\n(\{.*?\})\n```/gs;
      let match;
      while ((match = toolCallRegex.exec(response)) !== null) {
        try {
          const parsed = JSON.parse(match[1]) as { name: string; params: Record<string, unknown> };
          const result = await tools.execute(parsed.name, parsed.params ?? {}, korvidConfig);
          toolCalls.push(result);
        } catch {
          // Skip malformed tool calls
        }
      }

      return {
        response,
        toolCalls,
        allToolsPassed: toolCalls.every((tc) => tc.result.success),
      };
    },
  };
}

async function callOllamaWithTools(model: string, text: string): Promise<string> {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: text }],
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
  const data = await res.json() as { message?: { content?: string } };
  return data.message?.content ?? "";
}

async function callAnthropicWithTools(model: string, text: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 2048, messages: [{ role: "user", content: text }] }),
  });
  if (!res.ok) throw new Error(`Anthropic error: ${res.status}`);
  const data = await res.json() as { content?: { text: string }[] };
  return data.content?.[0]?.text ?? "";
}

async function callOpenAIWithTools(model: string, text: string, apiKey: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages: [{ role: "user", content: text }] }),
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json() as { choices?: { message?: { content: string } }[] };
  return data.choices?.[0]?.message?.content ?? "";
}

import type { KorvidConfig } from "@korvid/shared";

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_call_id?: string;
  tool_calls?: ToolCall[];
  name?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

export interface ToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export interface ReasoningResult {
  text: string;
  toolCalls?: ToolCall[];
}

export interface StreamChunk {
  text: string;
  done: boolean;
  toolCalls?: ToolCall[];
}

export interface ReasoningClient {
  prompt(text: string): Promise<string>;
  chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ReasoningResult>;
  stream?(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<StreamChunk>;
}

const FETCH_TIMEOUT = 30000;

function withTimeout(signal?: AbortSignal): { signal: AbortSignal; timeout: ReturnType<typeof setTimeout> } {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), FETCH_TIMEOUT);
  if (signal) {
    signal.addEventListener("abort", () => ac.abort(), { once: true });
  }
  return { signal: ac.signal, timeout };
}

function clearTimeouts(timeout: ReturnType<typeof setTimeout>) {
  clearTimeout(timeout);
}

export function createReasoningClient(config: KorvidConfig): ReasoningClient {
  const provider = config.models.reasoning.provider;
  const model = config.models.reasoning.model;
  const apiKey = config.models.reasoning.apiKey;

  const client: ReasoningClient = {
    async prompt(text: string): Promise<string> {
      const result = await client.chat([{ role: "user", content: text }]);
      return result.text;
    },

    async chat(messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ReasoningResult> {
      switch (provider) {
        case "ollama":
          return callOllama(model, messages, tools);
        case "anthropic":
          return callAnthropic(model, messages, apiKey!, tools);
        case "openai":
        case "groq":
          return callOpenAICompatible(provider, model, messages, apiKey!, tools);
        case "google":
          return callGoogle(model, messages, apiKey!, tools);
        default:
          throw new Error(`Unsupported reasoning provider: ${provider}`);
      }
    },

    async *stream(messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<StreamChunk> {
      switch (provider) {
        case "ollama":
          yield* streamOllama(model, messages, tools);
          break;
        case "anthropic":
          yield* streamAnthropic(model, messages, apiKey!, tools);
          break;
        case "openai":
        case "groq":
          yield* streamOpenAICompatible(provider, model, messages, apiKey!, tools);
          break;
        case "google":
          yield* streamGoogle(model, messages, apiKey!, tools);
          break;
        default:
          throw new Error(`Streaming not supported for provider: ${provider}`);
      }
    },
  };

  return client;
}

// ── Ollama (local, streaming) ─────────────────────────────────────

async function callOllama(model: string, messages: ChatMessage[], tools?: ToolDefinition[]): Promise<ReasoningResult> {
  const { signal, timeout } = withTimeout();
  try {
    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: false,
    };
    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: t.function,
      }));
    }

    const res = await fetch("http://localhost:11434/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });

    clearTimeouts(timeout);

    if (!res.ok) {
      throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as {
      message?: {
        content?: string;
        tool_calls?: { function: { name: string; arguments: string } }[];
      };
    };

    const toolCalls = data.message?.tool_calls?.map((tc, i) => ({
      id: `tc-${Date.now()}-${i}`,
      type: "function" as const,
      function: { name: tc.function.name, arguments: tc.function.arguments },
    }));

    return {
      text: data.message?.content ?? "",
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
    };
  } catch (e: any) {
    clearTimeouts(timeout);
    if (e.name === "AbortError") throw new Error("Ollama request timed out (30s)");
    throw e;
  }
}

async function* streamOllama(model: string, messages: ChatMessage[], tools?: ToolDefinition[]): AsyncIterable<StreamChunk> {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  };
  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: t.function,
    }));
  }

  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${await res.text()}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const chunk = JSON.parse(line) as {
          message?: { content?: string };
          done?: boolean;
        };
        const text = chunk.message?.content ?? "";
        if (text) {
          yield { text, done: !!chunk.done };
        }
        if (chunk.done) {
          yield { text: "", done: true };
          return;
        }
      } catch { /* skip malformed lines */ }
    }
  }

  yield { text: "", done: true };
}

// ── Anthropic (streaming) ─────────────────────────────────────────

async function callAnthropic(model: string, messages: ChatMessage[], apiKey: string, tools?: ToolDefinition[]): Promise<ReasoningResult> {
  const { signal, timeout } = withTimeout();
  try {
    const systemMsg = messages.find((m) => m.role === "system");
    const nonSystem = messages.filter((m) => m.role !== "system");

    const body: Record<string, unknown> = {
      model,
      max_tokens: 4096,
      messages: nonSystem.map((m) => ({ role: m.role, content: m.content })),
    };
    if (systemMsg) body.system = systemMsg.content;
    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        name: t.function.name,
        description: t.function.description,
        input_schema: t.function.parameters,
      }));
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(body),
      signal,
    });

    clearTimeouts(timeout);

    if (!res.ok) {
      throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as {
      content?: ({ type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: Record<string, unknown> })[];
    };

    let text = "";
    const toolCalls: ToolCall[] = [];

    for (const block of data.content ?? []) {
      if (block.type === "text") {
        text += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          type: "function",
          function: { name: block.name, arguments: JSON.stringify(block.input) },
        });
      }
    }

    return { text, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  } catch (e: any) {
    clearTimeouts(timeout);
    if (e.name === "AbortError") throw new Error("Anthropic request timed out (30s)");
    throw e;
  }
}

async function* streamAnthropic(model: string, messages: ChatMessage[], apiKey: string, tools?: ToolDefinition[]): AsyncIterable<StreamChunk> {
  const systemMsg = messages.find((m) => m.role === "system");
  const nonSystem = messages.filter((m) => m.role !== "system");

  const body: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    stream: true,
    messages: nonSystem.map((m) => ({ role: m.role, content: m.content })),
  };
  if (systemMsg) body.system = systemMsg.content;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Anthropic error: ${res.status} ${await res.text()}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        yield { text: "", done: true };
        return;
      }
      try {
        const event = JSON.parse(data) as {
          type: string;
          delta?: { type: string; text?: string };
        };
        if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
          yield { text: event.delta.text ?? "", done: false };
        }
      } catch { /* skip malformed */ }
    }
  }

  yield { text: "", done: true };
}

// ── OpenAI-compatible (streaming) ─────────────────────────────────

async function callOpenAICompatible(
  provider: "openai" | "groq",
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  tools?: ToolDefinition[]
): Promise<ReasoningResult> {
  const baseUrl = provider === "openai" ? "https://api.openai.com" : "https://api.groq.com/openai";
  const { signal, timeout } = withTimeout();
  try {
    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };
    if (tools && tools.length > 0) {
      body.tools = tools.map((t) => ({
        type: "function",
        function: t.function,
      }));
      body.tool_choice = "auto";
    }

    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });

    clearTimeouts(timeout);

    if (!res.ok) {
      throw new Error(`${provider} error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as {
      choices?: { message?: { content?: string; tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[] } }[];
    };

    const choice = data.choices?.[0]?.message;
    return {
      text: choice?.content ?? "",
      toolCalls: choice?.tool_calls && choice.tool_calls.length > 0 ? choice.tool_calls : undefined,
    };
  } catch (e: any) {
    clearTimeouts(timeout);
    if (e.name === "AbortError") throw new Error(`${provider} request timed out (30s)`);
    throw e;
  }
}

async function* streamOpenAICompatible(
  provider: "openai" | "groq",
  model: string,
  messages: ChatMessage[],
  apiKey: string,
  tools?: ToolDefinition[]
): AsyncIterable<StreamChunk> {
  const baseUrl = provider === "openai" ? "https://api.openai.com" : "https://api.groq.com/openai";

  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    stream: true,
  };
  if (tools && tools.length > 0) {
    body.tools = tools.map((t) => ({
      type: "function",
      function: t.function,
    }));
    body.tool_choice = "auto";
  }

  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`${provider} error: ${res.status} ${await res.text()}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") {
        yield { text: "", done: true };
        return;
      }
      try {
        const chunk = JSON.parse(data) as {
          choices?: { delta?: { content?: string } }[];
        };
        const text = chunk.choices?.[0]?.delta?.content;
        if (text) {
          yield { text, done: false };
        }
      } catch { /* skip malformed */ }
    }
  }

  yield { text: "", done: true };
}

// ── Google Gemini (streaming) ─────────────────────────────────────

async function callGoogle(model: string, messages: ChatMessage[], apiKey: string, tools?: ToolDefinition[]): Promise<ReasoningResult> {
  const { signal, timeout } = withTimeout();
  try {
    const contents = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const body: Record<string, unknown> = { contents };
    if (tools && tools.length > 0) {
      body.tools = [
        {
          function_declarations: tools.map((t) => ({
            name: t.function.name,
            description: t.function.description,
            parameters: t.function.parameters,
          })),
        },
      ];
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal,
      }
    );

    clearTimeouts(timeout);

    if (!res.ok) {
      throw new Error(`Google error: ${res.status} ${await res.text()}`);
    }

    const data = await res.json() as {
      candidates?: { content?: { parts?: ({ text: string } | { functionCall: { name: string; args: Record<string, unknown> } })[] } }[];
    };

    let text = "";
    const toolCalls: ToolCall[] = [];

    for (const part of data.candidates?.[0]?.content?.parts ?? []) {
      if ("text" in part) {
        text += part.text;
      } else if ("functionCall" in part) {
        toolCalls.push({
          id: `tc-${Date.now()}-${toolCalls.length}`,
          type: "function",
          function: { name: part.functionCall.name, arguments: JSON.stringify(part.functionCall.args) },
        });
      }
    }

    return { text, toolCalls: toolCalls.length > 0 ? toolCalls : undefined };
  } catch (e: any) {
    clearTimeouts(timeout);
    if (e.name === "AbortError") throw new Error("Google request timed out (30s)");
    throw e;
  }
}

async function* streamGoogle(model: string, messages: ChatMessage[], apiKey: string, tools?: ToolDefinition[]): AsyncIterable<StreamChunk> {
  const contents = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const body: Record<string, unknown> = { contents, generationConfig: { stream: true } };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }
  );

  if (!res.ok) {
    throw new Error(`Google error: ${res.status} ${await res.text()}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Google streams JSON array chunks
    const arrayStart = buffer.indexOf("[");
    if (arrayStart === -1) continue;

    const arrayEnd = buffer.indexOf("]", arrayStart + 1);
    if (arrayEnd === -1) continue;

    try {
      const chunkStr = buffer.slice(arrayStart, arrayEnd + 1);
      const chunks = JSON.parse(chunkStr) as {
        candidates?: { content?: { parts?: { text: string }[] } }[];
      }[];

      for (const chunk of chunks) {
        for (const part of chunk.candidates?.[0]?.content?.parts ?? []) {
          if (part.text) {
            yield { text: part.text, done: false };
          }
        }
      }

      buffer = buffer.slice(arrayEnd + 1);
    } catch { /* partial JSON, wait for more */ }
  }

  yield { text: "", done: true };
}

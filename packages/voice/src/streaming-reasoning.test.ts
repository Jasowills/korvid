import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createServer, type Server } from "node:http";

let server: Server;
let baseUrl: string;

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      const url = req.url ?? "";

      if (url === "/api/chat") {
        // Ollama streaming format
        res.writeHead(200, { "Content-Type": "application/x-ndjson" });
        const chunks = [
          JSON.stringify({ message: { content: "Hello" }, done: false }),
          JSON.stringify({ message: { content: " world" }, done: false }),
          JSON.stringify({ message: { content: "!" }, done: true }),
        ];
        for (const chunk of chunks) {
          res.write(chunk + "\n");
        }
        res.end();
      } else if (url.includes("/v1/chat/completions")) {
        // OpenAI streaming format
        const parsed = JSON.parse(body);
        expect(parsed.stream).toBe(true);

        res.writeHead(200, { "Content-Type": "text/event-stream" });
        const events = [
          'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
          'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
          'data: {"choices":[{"delta":{"content" :"!"}}]}\n\n',
          'data: [DONE]\n\n',
        ];
        for (const event of events) {
          res.write(event);
        }
        res.end();
      } else if (url.includes("/v1/messages")) {
        // Anthropic streaming format
        const parsed = JSON.parse(body);
        expect(parsed.stream).toBe(true);

        res.writeHead(200, { "Content-Type": "text/event-stream" });
        const events = [
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hello"}}\n\n',
          'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":" from Anthropic"}}\n\n',
          'data: [DONE]\n\n',
        ];
        for (const event of events) {
          res.write(event);
        }
        res.end();
      } else {
        res.writeHead(404);
        res.end("Not found");
      }
    });
  });

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const addr = server.address();
      if (addr && typeof addr === "object") {
        baseUrl = `http://127.0.0.1:${addr.port}`;
      }
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

describe("Streaming reasoning API formats", () => {
  it("Ollama streams newline-delimited JSON chunks", async () => {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "test", messages: [], stream: true }),
    });

    expect(res.ok).toBe(true);
    const text = await res.text();
    const lines = text.trim().split("\n");

    expect(lines.length).toBe(3);
    expect(JSON.parse(lines[0]).message.content).toBe("Hello");
    expect(JSON.parse(lines[1]).message.content).toBe(" world");
    expect(JSON.parse(lines[2]).done).toBe(true);
  });

  it("OpenAI streams SSE with data: prefix", async () => {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer test" },
      body: JSON.stringify({ model: "test", messages: [], stream: true }),
    });

    expect(res.ok).toBe(true);
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.startsWith("data: "));

    expect(lines.length).toBe(4); // 3 chunks + DONE
    expect(JSON.parse(lines[0].slice(6)).choices[0].delta.content).toBe("Hello");
    expect(lines[3].slice(6).trim()).toBe("[DONE]");
  });

  it("Anthropic streams SSE with event types", async () => {
    const res = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": "test",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({ model: "test", max_tokens: 100, messages: [], stream: true }),
    });

    expect(res.ok).toBe(true);
    const text = await res.text();
    const lines = text.split("\n").filter((l) => l.startsWith("data: "));

    expect(lines.length).toBe(3); // 2 chunks + DONE
    const firstEvent = JSON.parse(lines[0].slice(6));
    expect(firstEvent.type).toBe("content_block_delta");
    expect(firstEvent.delta.text).toBe("Hello");
  });
});

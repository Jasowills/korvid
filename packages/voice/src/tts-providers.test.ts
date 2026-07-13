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
      const headers = req.headers;

      if (url.includes("/v1/text-to-speech/") && url.includes("/stream")) {
        expect(headers["xi-api-key"]).toBe("test-key");
        expect(headers["content-type"]).toBe("application/json");

        const parsed = JSON.parse(body);
        expect(parsed.text).toBe("Hello world");
        expect(parsed.model_id).toBe("eleven_monolingual_v1");
        expect(parsed.voice_settings).toBeDefined();

        res.writeHead(200, { "Content-Type": "audio/mpeg" });
        res.end(Buffer.from([0xff, 0xfb, 0x90, 0x00]));
      } else if (url === "/tts/bytes") {
        expect(headers["x-api-key"]).toBe("test-key");

        const parsed = JSON.parse(body);
        expect(parsed.transcript).toBe("Hello from Cartesia");
        expect(parsed.model_id).toBe("sonic-2");
        expect(parsed.voice.id).toBe("test-voice");

        res.writeHead(200, { "Content-Type": "audio/mpeg" });
        res.end(Buffer.from([0xff, 0xfb, 0x90, 0x01]));
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

describe("ElevenLabs TTS API format", () => {
  it("sends correct request to /v1/text-to-speech/{voice}/stream", async () => {
    const res = await fetch(`${baseUrl}/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM/stream`, {
      method: "POST",
      headers: {
        "xi-api-key": "test-key",
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: "Hello world",
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    });

    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    const data = await res.arrayBuffer();
    expect(data.byteLength).toBeGreaterThan(0);
  });

  it("returns error for invalid endpoint", async () => {
    const res = await fetch(`${baseUrl}/v1/text-to-speech/invalid/wrong-path`, {
      method: "POST",
      headers: { "xi-api-key": "test-key", "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test" }),
    });
    expect(res.status).toBe(404);
  });
});

describe("Cartesia TTS API format", () => {
  it("sends correct request to /tts/bytes", async () => {
    const res = await fetch(`${baseUrl}/tts/bytes`, {
      method: "POST",
      headers: {
        "x-api-key": "test-key",
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        model_id: "sonic-2",
        transcript: "Hello from Cartesia",
        voice: { id: "test-voice" },
        output_format: { container: "mp3", encoding: "mp3", sample_rate: 44100 },
      }),
    });

    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type")).toBe("audio/mpeg");
    const data = await res.arrayBuffer();
    expect(data.byteLength).toBeGreaterThan(0);
  });
});

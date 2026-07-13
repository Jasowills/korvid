import { describe, it, expect } from "vitest";
import { createMessageRelay } from "../src/relay.js";
import type { Message, MessageBridge } from "../src/types.js";

function createMockBridge(platform: string, enabled = true): MessageBridge & { sent: Message[] } {
  const sent: Message[] = [];
  return {
    platform,
    enabled,
    sent,
    async send(msg: Message) {
      sent.push(msg);
      return { success: true, messageId: `mock-${Date.now()}` };
    },
    onMessage() {},
    async start() {},
    async stop() {},
  };
}

describe("MessageRelay", () => {
  it("relays to other bridges", async () => {
    const relay = createMessageRelay();
    const wa = createMockBridge("whatsapp");
    const tg = createMockBridge("telegram");
    relay.registerBridge(wa);
    relay.registerBridge(tg);

    const msg: Message = {
      id: "test-1",
      platform: "voice",
      from: "user",
      to: "all",
      text: "Hello",
      timestamp: Date.now(),
    };

    await relay.relay(msg);
    expect(wa.sent.length).toBe(1);
    expect(tg.sent.length).toBe(1);
    expect(wa.sent[0].text).toBe("Hello");
  });

  it("skips originating platform", async () => {
    const relay = createMessageRelay();
    const wa = createMockBridge("whatsapp");
    relay.registerBridge(wa);

    const msg: Message = {
      id: "test-2",
      platform: "whatsapp",
      from: "user",
      to: "korvid",
      text: "From WA",
      timestamp: Date.now(),
    };

    await relay.relay(msg);
    expect(wa.sent.length).toBe(0);
  });

  it("queues failed messages for retry", async () => {
    const relay = createMessageRelay({ maxRetries: 2, retryDelayMs: 0 });
    const failingBridge: MessageBridge = {
      platform: "failing",
      enabled: true,
      async send() { return { success: false, error: "Network error" }; },
      onMessage() {},
      async start() {},
      async stop() {},
    };
    relay.registerBridge(failingBridge);

    const msg: Message = {
      id: "test-3",
      platform: "voice",
      from: "user",
      to: "all",
      text: "Test",
      timestamp: Date.now(),
    };

    await relay.relay(msg);
    expect(relay.getQueue().length).toBe(1);
    expect(relay.getQueue()[0].attempts).toBe(1);
  });
});

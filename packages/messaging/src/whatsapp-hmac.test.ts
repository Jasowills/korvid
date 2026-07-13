import { describe, it, expect } from "vitest";
import { verifyWhatsAppSignature } from "./whatsapp.js";

describe("WhatsApp HMAC verification", () => {
  it("returns true when no app secret is configured (backward compat)", () => {
    expect(verifyWhatsAppSignature("body", "sha256=abc", undefined)).toBe(true);
  });

  it("returns true for valid signature", () => {
    const { createHmac } = require("node:crypto");
    const secret = "my-app-secret";
    const body = '{"entry":[{"changes":[{"value":{"messages":[]}}]}]}';
    const sig = createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyWhatsAppSignature(body, `sha256=${sig}`, secret)).toBe(true);
  });

  it("returns false for invalid signature", () => {
    expect(verifyWhatsAppSignature("body", "sha256=invalidsig", "my-secret")).toBe(false);
  });

  it("returns false for missing signature with secret configured", () => {
    expect(verifyWhatsAppSignature("body", undefined, "my-secret")).toBe(false);
  });

  it("handles signature without sha256= prefix", () => {
    const { createHmac } = require("node:crypto");
    const secret = "test-secret";
    const body = "test-body";
    const sig = createHmac("sha256", secret).update(body).digest("hex");

    expect(verifyWhatsAppSignature(body, sig, secret)).toBe(true);
  });
});

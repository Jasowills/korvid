import { describe, it, expect, beforeEach } from "vitest";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createBrowserClient } from "../src/browser.js";
import type { BrowserTool } from "../src/types.js";

describe("BrowserClient", () => {
  let client: ReturnType<typeof createBrowserClient>;

  beforeEach(() => {
    client = createBrowserClient({ screenshotDir: join(tmpdir(), "korvid-browser-test") });
  });

  it("has required tools", () => {
    const names = client.tools.map((t: BrowserTool) => t.name);
    expect(names).toContain("browser_navigate");
    expect(names).toContain("browser_screenshot");
    expect(names).toContain("browser_click");
    expect(names).toContain("browser_type");
    expect(names).toContain("browser_get_text");
    expect(names).toContain("browser_evaluate");
  });

  it("validates URLs", async () => {
    const nav = client.tools.find((t: BrowserTool) => t.name === "browser_navigate")!;
    await expect(nav.execute({ url: "ftp://bad.com" })).rejects.toThrow("Only http/https");
    await expect(nav.execute({ url: "not-a-url" })).rejects.toThrow("Invalid URL");
  });

  it("validates selectors", async () => {
    const click = client.tools.find((t: BrowserTool) => t.name === "browser_click")!;
    await expect(click.execute({})).rejects.toThrow("selector is required");
  });
});

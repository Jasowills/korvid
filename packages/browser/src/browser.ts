import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { BrowserContext, BrowserTool, BrowserToolResult } from "./types.js";

let idCounter = 0;
function genId(): string {
  return `browser-${Date.now()}-${(idCounter++).toString(36)}`;
}

function validateUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error(`Only http/https URLs allowed, got ${parsed.protocol}`);
    }
    return parsed.href;
  } catch (e: any) {
    throw new Error(`Invalid URL: ${e.message}`);
  }
}

function sanitizePath(path: string): string {
  return path.replace(/[^a-zA-Z0-9_\-\/\.]/g, "_").slice(0, 200);
}

export function createBrowserClient(opts?: { screenshotDir?: string; timeout?: number }): BrowserContext {
  const screenshotDir = opts?.screenshotDir ?? join(tmpdir(), "korvid-browser");
  const timeout = opts?.timeout ?? 30000;

  if (!existsSync(screenshotDir)) {
    mkdirSync(screenshotDir, { recursive: true });
  }

  const contexts = new Map<string, { page: any; browser: any }>();
  let defaultContextId: string | null = null;

  async function getOrCreateContext(id?: string): Promise<{ page: any; browser: any; contextId: string }> {
    const contextId = id ?? defaultContextId;
    if (contextId && contexts.has(contextId)) {
      return { ...contexts.get(contextId)!, contextId };
    }
    try {
      const pw = await import("playwright");
      const browser = await pw.chromium.launch({ headless: true });
      const context = await browser.newContext();
      const page = await context.newPage();
      const newId = genId();
      contexts.set(newId, { page, browser });
      if (!defaultContextId) defaultContextId = newId;
      return { page, browser, contextId: newId };
    } catch {
      throw new Error("Playwright not available — install with pnpm add -F @korvid/browser playwright");
    }
  }

  const tools: BrowserTool[] = [
    {
      name: "browser_navigate",
      description: "Navigate to a URL in the browser",
      parameters: {
        url: { type: "string", description: "URL to navigate to" },
        contextId: { type: "string", description: "Optional browser context ID" },
      },
      async execute(params: Record<string, string>): Promise<BrowserToolResult> {
        const url = validateUrl(params.url);
        const { page, contextId } = await getOrCreateContext(params.contextId);
        await page.goto(url, { waitUntil: "domcontentloaded", timeout });
        const title = await page.title();
        return { success: true, data: { title, url, contextId }, screenshotPath: undefined };
      },
    },
    {
      name: "browser_screenshot",
      description: "Take a screenshot of the current page",
      parameters: {
        contextId: { type: "string", description: "Optional browser context ID" },
        fullPage: { type: "string", description: "Capture full page (true/false)" },
      },
      async execute(params: Record<string, string>): Promise<BrowserToolResult> {
        const { page, contextId } = await getOrCreateContext(params.contextId);
        const filename = `screenshot-${Date.now()}.png`;
        const filepath = join(screenshotDir, filename);
        await page.screenshot({ path: filepath, fullPage: params.fullPage === "true" });
        return { success: true, data: { filepath, contextId }, screenshotPath: filepath };
      },
    },
    {
      name: "browser_click",
      description: "Click an element on the page",
      parameters: {
        selector: { type: "string", description: "CSS selector" },
        contextId: { type: "string", description: "Optional browser context ID" },
      },
      async execute(params: Record<string, string>): Promise<BrowserToolResult> {
        if (!params.selector) throw new Error("selector is required");
        const { page, contextId } = await getOrCreateContext(params.contextId);
        await page.click(params.selector, { timeout });
        return { success: true, data: { clicked: params.selector, contextId } };
      },
    },
    {
      name: "browser_type",
      description: "Type text into an input field",
      parameters: {
        selector: { type: "string", description: "CSS selector" },
        text: { type: "string", description: "Text to type" },
        contextId: { type: "string", description: "Optional browser context ID" },
      },
      async execute(params: Record<string, string>): Promise<BrowserToolResult> {
        if (!params.selector || !params.text) throw new Error("selector and text are required");
        const { page, contextId } = await getOrCreateContext(params.contextId);
        await page.fill(params.selector, params.text, { timeout });
        return { success: true, data: { filled: params.selector, text: params.text, contextId } };
      },
    },
    {
      name: "browser_get_text",
      description: "Extract text content from the page or an element",
      parameters: {
        selector: { type: "string", description: "Optional CSS selector" },
        contextId: { type: "string", description: "Optional browser context ID" },
      },
      async execute(params: Record<string, string>): Promise<BrowserToolResult> {
        const { page, contextId } = await getOrCreateContext(params.contextId);
        const text = params.selector
          ? await page.locator(params.selector).textContent({ timeout })
          : await page.textContent("body", { timeout });
        return { success: true, data: { text: text ?? "", contextId } };
      },
    },
    {
      name: "browser_evaluate",
      description: "Run JavaScript in the page context",
      parameters: {
        script: { type: "string", description: "JavaScript to evaluate" },
        contextId: { type: "string", description: "Optional browser context ID" },
      },
      async execute(params: Record<string, string>): Promise<BrowserToolResult> {
        if (!params.script) throw new Error("script is required");
        const { page, contextId } = await getOrCreateContext(params.contextId);
        const result = await page.evaluate(params.script);
        return { success: true, data: { result, contextId } };
      },
    },
  ];

  return {
    tools,
    async close(contextId?: string) {
      if (contextId) {
        const ctx = contexts.get(contextId);
        if (ctx) {
          await ctx.browser?.close();
          contexts.delete(contextId);
          if (defaultContextId === contextId) defaultContextId = null;
        }
      } else {
        for (const [id, ctx] of contexts) {
          await ctx.browser?.close();
        }
        contexts.clear();
        defaultContextId = null;
      }
    },
    getDefaultContextId() {
      return defaultContextId;
    },
  };
}

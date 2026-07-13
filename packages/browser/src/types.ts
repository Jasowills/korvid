export interface BrowserTool {
  name: string;
  description: string;
  parameters: Record<string, { type: string; description: string; required?: boolean }>;
  execute(params: Record<string, string>): Promise<BrowserToolResult>;
}

export interface BrowserToolResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  screenshotPath?: string;
}

export interface BrowserContext {
  tools: BrowserTool[];
  close(contextId?: string): Promise<void>;
  getDefaultContextId(): string | null;
}

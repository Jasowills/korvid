import { z } from "zod";
import type { Tool } from "./types.js";

const vizParams = z.object({
  type: z.enum(["chart", "diagram", "table", "markdown", "code", "clear"]).describe("Visualization type"),
  title: z.string().optional().describe("Title for the visualization"),
  chartKind: z.enum(["line", "bar", "pie", "area"]).optional().describe("Chart type (for type=chart)"),
  data: z.array(z.record(z.unknown())).optional().describe("Chart data as array of objects (for type=chart)"),
  xKey: z.string().optional().describe("X-axis data key (for type=chart)"),
  yKeys: z.array(z.string()).optional().describe("Y-axis data keys (for type=chart)"),
  colors: z.array(z.string()).optional().describe("Custom colors for chart series"),
  columns: z.array(z.string()).optional().describe("Table column headers (for type=table)"),
  rows: z.array(z.array(z.unknown())).optional().describe("Table rows (for type=table)"),
  content: z.string().optional().describe("Markdown, Mermaid diagram, or code content"),
  language: z.string().optional().describe("Language for code blocks (for type=code)"),
});

async function execute(params: Record<string, unknown>): Promise<{ success: boolean; output: string; error?: string }> {
  const parsed = vizParams.safeParse(params);
  if (!parsed.success) {
    return { success: false, output: "", error: `Invalid parameters: ${parsed.error.message}` };
  }

  const viz = parsed.data;

  // Validate chart-specific fields
  if (viz.type === "chart") {
    if (!viz.data || !viz.xKey || !viz.yKeys) {
      return { success: false, output: "", error: "Charts require data, xKey, and yKeys" };
    }
  }
  if (viz.type === "diagram" || viz.type === "markdown" || viz.type === "code") {
    if (!viz.content) {
      return { success: false, output: "", error: `${viz.type} requires content` };
    }
  }
  if (viz.type === "table") {
    if (!viz.columns || !viz.rows) {
      return { success: false, output: "", error: "Tables require columns and rows" };
    }
  }

  // Post to gateway
  try {
    const gatewayUrl = process.env.KORVID_GATEWAY_URL ?? "http://127.0.0.1:3847";
    const authToken = process.env.KORVID_AUTH_TOKEN ?? "";

    const res = await fetch(`${gatewayUrl}/api/visualize`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Auth-Token": authToken,
      },
      body: JSON.stringify(viz),
    });

    if (!res.ok) {
      return { success: false, output: "", error: `Gateway returned ${res.status}` };
    }

    return {
      success: true,
      output: `Visualization ${viz.type} pushed to dashboard${viz.title ? `: ${viz.title}` : ""}`,
    };
  } catch (err) {
    return { success: false, output: "", error: `Failed to reach gateway: ${String(err)}` };
  }
}

export const visualizeTool: Tool = {
  name: "visualize",
  description: "Push a visualization to the dashboard. Supports charts (line/bar/pie/area), Mermaid diagrams, tables, markdown, and code blocks. The visualization appears as an overlay on the main dashboard view.",
  parameters: vizParams,
  dangerous: false,
  category: "system",
  execute,
};

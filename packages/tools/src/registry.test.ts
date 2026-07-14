import { describe, it, expect } from "vitest";
import { createDefaultRegistry, toolsToFunctionSchema } from "../src/index.js";

describe("ToolRegistry", () => {
  const registry = createDefaultRegistry();

  it("registers all default tools", () => {
    const tools = registry.list();
    expect(tools.length).toBe(11);
  });

  it("can get tool by name", () => {
    expect(registry.get("screenshot")).toBeDefined();
    expect(registry.get("nonexistent")).toBeUndefined();
  });

  it("filters by category", () => {
    const fsTools = registry.listByCategory("filesystem");
    expect(fsTools.length).toBe(3);
    expect(fsTools.map((t) => t.name)).toContain("list_files");
    expect(fsTools.map((t) => t.name)).toContain("read_file");
    expect(fsTools.map((t) => t.name)).toContain("write_file");
  });

  it("generates function schema for LLM consumption", () => {
    const schema = toolsToFunctionSchema(registry.list());
    expect(schema.length).toBe(11);
    expect(schema[0]).toHaveProperty("type", "function");
    expect((schema[0] as any).function).toHaveProperty("name");
    expect((schema[0] as any).function).toHaveProperty("parameters");
  });
});

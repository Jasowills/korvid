import { describe, it, expect, vi, beforeEach } from "vitest";
import { createWorkflowTools, executeWorkflowTool } from "./workflow-tools.js";

describe("WorkflowTools", () => {
  const mockEngine = {
    createWorkflow: vi.fn().mockReturnValue({
      id: "wf-1",
      name: "test-workflow",
      steps: [{ name: "step1", type: "reasoning", config: {} }],
      status: "idle",
    }),
    runWorkflow: vi.fn().mockResolvedValue({ status: "completed" }),
    getWorkflow: vi.fn(),
    listWorkflows: vi.fn().mockReturnValue([
      { id: "wf-1", name: "test-workflow", status: "idle", steps: [{ name: "step1" }] },
    ]),
    createChain: vi.fn(),
    runChain: vi.fn(),
    listChains: vi.fn(),
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates workflow tools with correct structure", () => {
    const tools = createWorkflowTools({ engine: mockEngine });
    expect(tools).toHaveLength(3);
    expect(tools[0].type).toBe("function");
    expect(tools[0].function.name).toBe("run_workflow");
    expect(tools[1].function.name).toBe("list_workflows");
    expect(tools[2].function.name).toBe("create_workflow");
  });

  it("executes run_workflow tool", async () => {
    const result = await executeWorkflowTool({ engine: mockEngine }, "run_workflow", {
      workflow_name: "test-workflow",
    });
    expect(result).toContain("completed");
    expect(mockEngine.runWorkflow).toHaveBeenCalled();
  });

  it("executes list_workflows tool", async () => {
    const result = await executeWorkflowTool({ engine: mockEngine }, "list_workflows", {});
    expect(result).toContain("test-workflow");
  });

  it("executes create_workflow tool", async () => {
    const result = await executeWorkflowTool({ engine: mockEngine }, "create_workflow", {
      name: "new-workflow",
      steps: [{ name: "step1", type: "reasoning", config: { prompt: "test" } }],
    });
    expect(result).toContain("Created workflow");
    expect(mockEngine.createWorkflow).toHaveBeenCalled();
  });

  it("returns error for unknown workflow", async () => {
    const result = await executeWorkflowTool({ engine: mockEngine }, "run_workflow", {
      workflow_name: "nonexistent",
    });
    expect(result).toContain("not found");
  });

  it("returns unknown tool error for invalid tool", async () => {
    const result = await executeWorkflowTool({ engine: mockEngine }, "invalid_tool", {});
    expect(result).toBe("Unknown tool: invalid_tool");
  });
});

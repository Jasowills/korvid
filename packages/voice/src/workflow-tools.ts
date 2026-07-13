import type { ToolDefinition } from "./reasoning.js";
import type { WorkflowEngine } from "./workflow.js";

export interface WorkflowToolDeps {
  engine: WorkflowEngine;
}

export function createWorkflowTools(deps: WorkflowToolDeps): ToolDefinition[] {
  return [
    {
      type: "function",
      function: {
        name: "run_workflow",
        description: "Execute a workflow by name with optional context parameters",
        parameters: {
          type: "object",
          properties: {
            workflow_name: {
              type: "string",
              description: "Name of the workflow to run",
            },
            context: {
              type: "object",
              description: "Context parameters to pass to the workflow",
            },
          },
          required: ["workflow_name"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "list_workflows",
        description: "List all available workflows",
        parameters: {
          type: "object",
          properties: {},
          required: [],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "create_workflow",
        description: "Create a new workflow with steps",
        parameters: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "Name of the workflow",
            },
            description: {
              type: "string",
              description: "Description of the workflow",
            },
            steps: {
              type: "array",
              description: "Array of workflow steps",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  type: { type: "string", enum: ["reasoning", "tool", "condition", "transform"] },
                  config: { type: "object" },
                  dependsOn: { type: "array", items: { type: "string" } },
                },
                required: ["name", "type", "config"],
              },
            },
          },
          required: ["name", "steps"],
        },
      },
    },
  ];
}

export async function executeWorkflowTool(
  deps: WorkflowToolDeps,
  toolName: string,
  args: Record<string, unknown>
): Promise<string> {
  const { engine } = deps;

  switch (toolName) {
    case "run_workflow": {
      const workflowName = args.workflow_name as string;
      const context = (args.context as Record<string, unknown>) ?? {};
      
      // Find workflow by name
      const workflows = engine.listWorkflows();
      const workflow = workflows.find((w) => w.name === workflowName);
      
      if (!workflow) {
        return `Workflow "${workflowName}" not found. Available workflows: ${workflows.map((w) => w.name).join(", ")}`;
      }

      const result = await engine.runWorkflow(workflow.id, context);
      return `Workflow "${workflowName}" completed with status: ${result.status}`;
    }

    case "list_workflows": {
      const workflows = engine.listWorkflows();
      if (workflows.length === 0) {
        return "No workflows available.";
      }
      return workflows
        .map((w) => `- ${w.name}: ${w.status} (${w.steps.length} steps)`)
        .join("\n");
    }

    case "create_workflow": {
      const name = args.name as string;
      const description = args.description as string;
      const steps = args.steps as Array<{
        name: string;
        type: string;
        config: Record<string, unknown>;
        dependsOn?: string[];
      }>;

      const workflow = engine.createWorkflow(
        name,
        steps.map((s) => ({
          name: s.name,
          type: s.type as "reasoning" | "tool" | "condition" | "transform",
          config: s.config,
          dependsOn: s.dependsOn,
        }))
      );

      return `Created workflow "${workflow.name}" with ${workflow.steps.length} steps. ID: ${workflow.id}`;
    }

    default:
      return `Unknown tool: ${toolName}`;
  }
}

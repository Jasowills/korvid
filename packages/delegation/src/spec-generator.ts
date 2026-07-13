import { type AgentId } from "./agent-detection.js";

export interface Spec {
  id: string;
  title: string;
  description: string;
  requirements: string[];
  acceptanceCriteria: string[];
  scope: string;
  outOfScope: string[];
  targetAgent: AgentId;
  createdAt: number;
}

export function generateSpec(request: string, agentId: AgentId): Spec {
  const id = `spec-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // Parse the request into structured spec components
  const lines = request.split("\n").map((l) => l.trim()).filter(Boolean);
  const title = lines[0] ?? "Untitled Task";
  const description = lines.slice(1).join("\n") || request;

  // Extract requirements (lines starting with "must", "should", "needs to")
  const requirements = lines.filter((l) =>
    /^(must|should|needs? to|shall|required|implement|add|create|fix)/i.test(l)
  );

  // Extract acceptance criteria (lines starting with "when", "given", "then", "verify")
  const acceptanceCriteria = lines.filter((l) =>
    /^(when|given|then|verify|test|expect|confirm|ensure)/i.test(l)
  );

  return {
    id,
    title,
    description,
    requirements: requirements.length > 0 ? requirements : [`Implement: ${title}`],
    acceptanceCriteria: acceptanceCriteria.length > 0 ? acceptanceCriteria : ["Change works without regressions"],
    scope: title,
    outOfScope: [
      "Do not modify files outside the target scope",
      "Do not add new dependencies unless absolutely required",
      "Do not change existing tests unless needed for the new feature",
    ],
    targetAgent: agentId,
    createdAt: Date.now(),
  };
}

export function formatSpecForAgent(spec: Spec): string {
  return `# Task Specification

## Title
${spec.title}

## Description
${spec.description}

## Requirements
${spec.requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}

## Acceptance Criteria
${spec.acceptanceCriteria.map((c, i) => `${i + 1}. ${c}`).join("\n")}

## Scope
${spec.scope}

## Out of Scope
${spec.outOfScope.map((o) => `- ${o}`).join("\n")}

## Instructions
1. Read the existing codebase before making changes
2. Implement the requirements above
3. Run the test suite to verify no regressions
4. Commit your changes with a descriptive message
5. Report what was done and any issues encountered
`;
}

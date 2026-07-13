import type { RiskEstimate, DeploymentContext } from "./risk-estimation.js";
import { createRiskEstimator } from "./risk-estimation.js";

export interface SimulationResult {
  id: string;
  action: string;
  wouldPass: boolean;
  estimatedRisk: RiskEstimate;
  validationPreview: ValidationResultPreview;
  recommendations: string[];
  timestamp: number;
}

export interface ValidationResultPreview {
  testsWouldRun: boolean;
  testsEstimatedToPass: boolean;
  typeCheckWouldPass: boolean;
  lintWouldPass: boolean;
  filesAffected: string[];
  estimatedTestCount?: number;
}

export interface SimulateMode {
  simulate(context: SimulationContext): Promise<SimulationResult>;
  explainResult(result: SimulationResult): string;
}

export interface SimulationContext {
  description: string;
  filesChanged: string[];
  changeType: "feature" | "fix" | "refactor" | "config" | "test" | "unknown";
  hasTests?: boolean;
  testCoverage?: number;
  workspacePath: string;
}

export function createSimulateMode(deps: {
  reasoning?: { prompt: (text: string) => Promise<string> };
  validator?: {
    validate: (workspacePath: string, spec?: { requirements?: string[] }) => Promise<{
      passed: boolean;
      testsRun: number;
      testsFailed: number;
      output: string;
      errors: string[];
    }>;
  };
}): SimulateMode {
  const riskEstimator = createRiskEstimator();
  let idCounter = 0;

  function genId(): string {
    return `sim-${Date.now()}-${(idCounter++).toString(36)}`;
  }

  async function simulate(context: SimulationContext): Promise<SimulationResult> {
    // Build a validation preview based on available information
    const validationPreview = buildValidationPreview(context);

    // Estimate deployment context for risk assessment
    const deploymentContext: DeploymentContext = {
      testsRun: validationPreview.estimatedTestCount ?? 0,
      testsPassed: validationPreview.testsEstimatedToPass ? (validationPreview.estimatedTestCount ?? 0) : 0,
      testsFailed: validationPreview.testsEstimatedToPass ? 0 : (validationPreview.estimatedTestCount ?? 0),
      typeCheckPassed: validationPreview.typeCheckWouldPass,
      lintPassed: validationPreview.lintWouldPass,
      validationRan: (validationPreview.estimatedTestCount ?? 0) > 0,
      filesChanged: context.filesChanged.length,
      linesChanged: 0, // Unknown in simulation
    };

    const estimatedRisk = riskEstimator.estimateDeployment(deploymentContext);

    // Generate recommendations
    const recommendations = generateRecommendations(context, validationPreview, estimatedRisk);

    return {
      id: genId(),
      action: context.description,
      wouldPass: estimatedRisk.confidence > 0.6,
      estimatedRisk,
      validationPreview,
      recommendations,
      timestamp: Date.now(),
    };
  }

  function buildValidationPreview(context: SimulationContext): ValidationResultPreview {
    // Heuristic-based estimation
    const isTestFile = (f: string) => f.includes(".test.") || f.includes(".spec.") || f.includes("__tests__");
    const isConfigFile = (f: string) => f.includes("config") || f.includes(".json") || f.includes(".yaml") || f.includes(".yml");
    const isTypeFile = (f: string) => f.endsWith(".ts") || f.endsWith(".tsx");

    const testFilesChanged = context.filesChanged.filter(isTestFile);
    const configFilesChanged = context.filesChanged.filter(isConfigFile);
    const typeFilesChanged = context.filesChanged.filter(isTypeFile);

    // Tests would likely pass if only test files or docs changed
    const testsEstimatedToPass = testFilesChanged.length === 0 || context.changeType === "test";

    // Type check would pass for config changes, likely fail for type file changes
    const typeCheckWouldPass = typeFilesChanged.length === 0 || context.changeType === "config";

    // Lint usually passes unless there are many changes
    const lintWouldPass = context.filesChanged.length < 15;

    return {
      testsWouldRun: context.hasTests !== false,
      testsEstimatedToPass,
      typeCheckWouldPass,
      lintWouldPass,
      filesAffected: context.filesChanged,
      estimatedTestCount: context.testCoverage ? Math.round(context.testCoverage * 10) : undefined,
    };
  }

  function generateRecommendations(
    context: SimulationContext,
    preview: ValidationResultPreview,
    risk: RiskEstimate
  ): string[] {
    const recs: string[] = [];

    if (!preview.testsEstimatedToPass) {
      recs.push("Run tests before deploying — some test files were modified");
    }

    if (!preview.typeCheckWouldPass) {
      recs.push("Type definitions were changed — verify type compatibility");
    }

    if (context.filesChanged.length > 10) {
      recs.push("Large change set — consider breaking into smaller PRs");
    }

    if (risk.confidence < 0.5) {
      recs.push("Low confidence — consider running full validation in sandbox first");
    }

    if (context.changeType === "fix" && !preview.testsEstimatedToPass) {
      recs.push("Bug fix without test changes — verify fix doesn't break existing tests");
    }

    return recs;
  }

  function explainResult(result: SimulationResult): string {
    const lines = [
      `Simulation: ${result.action}`,
      "",
      `Would pass: ${result.wouldPass ? "Yes" : "No"}`,
      "",
      riskEstimator.explainEstimate(result.estimatedRisk),
    ];

    if (result.recommendations.length > 0) {
      lines.push("", "Recommendations:");
      for (const rec of result.recommendations) {
        lines.push(`  - ${rec}`);
      }
    }

    return lines.join("\n");
  }

  return {
    simulate,
    explainResult,
  };
}

export interface RiskEstimate {
  confidence: number; // 0-1
  reasoning: string;
  factors: RiskFactor[];
  timestamp: number;
}

export interface RiskFactor {
  name: string;
  impact: "positive" | "negative" | "neutral";
  weight: number; // 0-1
  description: string;
}

export interface RiskEstimator {
  estimateDeployment(context: DeploymentContext): RiskEstimate;
  estimateAction(context: ActionContext): RiskEstimate;
  explainEstimate(estimate: RiskEstimate): string;
}

export interface DeploymentContext {
  testsRun: number;
  testsPassed: number;
  testsFailed: number;
  typeCheckPassed: boolean;
  lintPassed: boolean;
  validationRan: boolean;
  filesChanged: number;
  linesChanged: number;
  hasBreakingChanges?: boolean;
  previousFailures?: number;
  knownRiskyAreas?: string[];
}

export interface ActionContext {
  actionType: "deploy" | "merge" | "delete" | "spend" | "message" | "call" | "rollback";
  hasConfirmation: boolean;
  validationPassed?: boolean;
  testCoverage?: number;
  previousSuccessRate?: number;
  reversible: boolean;
  description: string;
}

export function createRiskEstimator(): RiskEstimator {
  function estimateDeployment(context: DeploymentContext): RiskEstimate {
    const factors: RiskFactor[] = [];
    let confidence = 0.5; // Start neutral

    // Test results
    if (context.validationRan) {
      const testPassRate = context.testsRun > 0 ? context.testsPassed / context.testsRun : 0;
      if (testPassRate >= 0.95) {
        factors.push({
          name: "Test coverage",
          impact: "positive",
          weight: 0.3,
          description: `${context.testsPassed}/${context.testsRun} tests passing`,
        });
        confidence += 0.2;
      } else if (testPassRate >= 0.8) {
        factors.push({
          name: "Test coverage",
          impact: "neutral",
          weight: 0.2,
          description: `${context.testsPassed}/${context.testsRun} tests passing — some failures`,
        });
        confidence += 0.05;
      } else {
        factors.push({
          name: "Test coverage",
          impact: "negative",
          weight: 0.3,
          description: `${context.testsFailed} test failures`,
        });
        confidence -= 0.2;
      }
    } else {
      factors.push({
        name: "Validation not run",
        impact: "negative",
        weight: 0.4,
        description: "No tests were executed against this change",
      });
      confidence -= 0.15;
    }

    // Type checking
    if (context.typeCheckPassed) {
      factors.push({
        name: "Type checking",
        impact: "positive",
        weight: 0.15,
        description: "Type check passed cleanly",
      });
      confidence += 0.1;
    } else {
      factors.push({
        name: "Type checking",
        impact: "negative",
        weight: 0.2,
        description: "Type check failed",
      });
      confidence -= 0.15;
    }

    // Linting
    if (context.lintPassed) {
      factors.push({
        name: "Linting",
        impact: "positive",
        weight: 0.1,
        description: "Lint check passed",
      });
      confidence += 0.05;
    }

    // Scale of change
    if (context.filesChanged > 10) {
      factors.push({
        name: "Change scale",
        impact: "negative",
        weight: 0.15,
        description: `Large change: ${context.filesChanged} files, ${context.linesChanged} lines`,
      });
      confidence -= 0.1;
    } else if (context.filesChanged <= 3) {
      factors.push({
        name: "Change scale",
        impact: "positive",
        weight: 0.1,
        description: `Small change: ${context.filesChanged} files`,
      });
      confidence += 0.05;
    }

    // Breaking changes
    if (context.hasBreakingChanges) {
      factors.push({
        name: "Breaking changes",
        impact: "negative",
        weight: 0.2,
        description: "Contains breaking changes",
      });
      confidence -= 0.15;
    }

    // Known risky areas
    if (context.knownRiskyAreas && context.knownRiskyAreas.length > 0) {
      factors.push({
        name: "Known risk areas",
        impact: "negative",
        weight: 0.15,
        description: `Risky areas: ${context.knownRiskyAreas.join(", ")}`,
      });
      confidence -= 0.1;
    }

    // Clamp confidence
    confidence = Math.max(0.05, Math.min(0.95, confidence));

    return {
      confidence,
      reasoning: generateDeploymentReasoning(confidence, factors, context),
      factors,
      timestamp: Date.now(),
    };
  }

  function estimateAction(context: ActionContext): RiskEstimate {
    const factors: RiskFactor[] = [];
    let confidence = 0.5;

    // Reversibility
    if (context.reversible) {
      factors.push({
        name: "Reversibility",
        impact: "positive",
        weight: 0.3,
        description: "Action can be undone",
      });
      confidence += 0.15;
    } else {
      factors.push({
        name: "Reversibility",
        impact: "negative",
        weight: 0.3,
        description: "Action is irreversible",
      });
      confidence -= 0.1;
    }

    // Validation
    if (context.validationPassed) {
      factors.push({
        name: "Validation",
        impact: "positive",
        weight: 0.25,
        description: "Validation checks passed",
      });
      confidence += 0.15;
    } else if (context.validationPassed === false) {
      factors.push({
        name: "Validation",
        impact: "negative",
        weight: 0.3,
        description: "Validation checks failed",
      });
      confidence -= 0.2;
    }

    // Previous success rate
    if (context.previousSuccessRate !== undefined) {
      if (context.previousSuccessRate > 0.9) {
        factors.push({
          name: "Historical success",
          impact: "positive",
          weight: 0.2,
          description: `${Math.round(context.previousSuccessRate * 100)}% historical success rate`,
        });
        confidence += 0.1;
      } else if (context.previousSuccessRate < 0.7) {
        factors.push({
          name: "Historical success",
          impact: "negative",
          weight: 0.2,
          description: `${Math.round(context.previousSuccessRate * 100)}% historical success rate`,
        });
        confidence -= 0.1;
      }
    }

    // Confirmation already given
    if (context.hasConfirmation) {
      factors.push({
        name: "User confirmed",
        impact: "positive",
        weight: 0.15,
        description: "Action was explicitly confirmed by user",
      });
      confidence += 0.05;
    }

    confidence = Math.max(0.05, Math.min(0.95, confidence));

    return {
      confidence,
      reasoning: generateActionReasoning(confidence, factors, context),
      factors,
      timestamp: Date.now(),
    };
  }

  function explainEstimate(estimate: RiskEstimate): string {
    const pct = Math.round(estimate.confidence * 100);
    const lines = [`Confidence: ${pct}%`, "", estimate.reasoning];

    if (estimate.factors.length > 0) {
      lines.push("", "Factors:");
      for (const f of estimate.factors) {
        const icon = f.impact === "positive" ? "+" : f.impact === "negative" ? "-" : "~";
        lines.push(`  [${icon}] ${f.name}: ${f.description}`);
      }
    }

    return lines.join("\n");
  }

  function generateDeploymentReasoning(
    confidence: number,
    factors: RiskFactor[],
    context: DeploymentContext
  ): string {
    const pct = Math.round(confidence * 100);

    if (!context.validationRan) {
      return `${pct}% confidence — no validation was run against this change. I don't have enough information to estimate this confidently.`;
    }

    const positive = factors.filter((f) => f.impact === "positive");
    const negative = factors.filter((f) => f.impact === "negative");

    let reasoning = `${pct}% confidence.`;

    if (positive.length > 0) {
      reasoning += ` Strengths: ${positive.map((f) => f.description).join("; ")}.`;
    }
    if (negative.length > 0) {
      reasoning += ` Risks: ${negative.map((f) => f.description).join("; ")}.`;
    }

    return reasoning;
  }

  function generateActionReasoning(
    confidence: number,
    factors: RiskFactor[],
    context: ActionContext
  ): string {
    const pct = Math.round(confidence * 100);

    if (!context.validationPassed && context.validationPassed !== undefined) {
      return `${pct}% confidence — validation failed for this action.`;
    }

    if (context.reversible) {
      return `${pct}% confidence. This action is reversible, so the risk is lower.`;
    }

    return `${pct}% confidence for ${context.actionType}: ${context.description}`;
  }

  return {
    estimateDeployment,
    estimateAction,
    explainEstimate,
  };
}

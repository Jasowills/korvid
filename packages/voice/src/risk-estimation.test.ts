import { describe, it, expect } from "vitest";
import { createRiskEstimator } from "./risk-estimation.js";

describe("RiskEstimator", () => {
  const estimator = createRiskEstimator();

  describe("estimateDeployment", () => {
    it("returns high confidence for well-tested changes", () => {
      const estimate = estimator.estimateDeployment({
        testsRun: 50,
        testsPassed: 50,
        testsFailed: 0,
        typeCheckPassed: true,
        lintPassed: true,
        validationRan: true,
        filesChanged: 3,
        linesChanged: 50,
      });

      expect(estimate.confidence).toBeGreaterThan(0.7);
      expect(estimate.factors.length).toBeGreaterThan(0);
      expect(estimate.reasoning).toContain("passing");
    });

    it("returns low confidence for failed tests", () => {
      const estimate = estimator.estimateDeployment({
        testsRun: 20,
        testsPassed: 10,
        testsFailed: 10,
        typeCheckPassed: false,
        lintPassed: true,
        validationRan: true,
        filesChanged: 5,
        linesChanged: 200,
      });

      expect(estimate.confidence).toBeLessThan(0.5);
    });

    it("returns lower confidence when validation not run", () => {
      const estimate = estimator.estimateDeployment({
        testsRun: 0,
        testsPassed: 0,
        testsFailed: 0,
        typeCheckPassed: false,
        lintPassed: false,
        validationRan: false,
        filesChanged: 5,
        linesChanged: 100,
      });

      expect(estimate.confidence).toBeLessThan(0.5);
      expect(estimate.reasoning).toContain("don't have enough information");
    });

    it("accounts for breaking changes", () => {
      const withBreaking = estimator.estimateDeployment({
        testsRun: 10,
        testsPassed: 10,
        testsFailed: 0,
        typeCheckPassed: true,
        lintPassed: true,
        validationRan: true,
        filesChanged: 2,
        linesChanged: 50,
        hasBreakingChanges: true,
      });

      const withoutBreaking = estimator.estimateDeployment({
        testsRun: 10,
        testsPassed: 10,
        testsFailed: 0,
        typeCheckPassed: true,
        lintPassed: true,
        validationRan: true,
        filesChanged: 2,
        linesChanged: 50,
        hasBreakingChanges: false,
      });

      expect(withBreaking.confidence).toBeLessThan(withoutBreaking.confidence);
    });
  });

  describe("estimateAction", () => {
    it("returns higher confidence for reversible actions", () => {
      const reversible = estimator.estimateAction({
        actionType: "deploy",
        hasConfirmation: true,
        validationPassed: true,
        reversible: true,
        description: "Deploy to staging",
      });

      const irreversible = estimator.estimateAction({
        actionType: "deploy",
        hasConfirmation: true,
        validationPassed: true,
        reversible: false,
        description: "Deploy to production",
      });

      expect(reversible.confidence).toBeGreaterThan(irreversible.confidence);
    });
  });

  describe("explainEstimate", () => {
    it("generates readable explanation", () => {
      const estimate = estimator.estimateDeployment({
        testsRun: 10,
        testsPassed: 10,
        testsFailed: 0,
        typeCheckPassed: true,
        lintPassed: true,
        validationRan: true,
        filesChanged: 2,
        linesChanged: 30,
      });

      const explanation = estimator.explainEstimate(estimate);
      expect(explanation).toContain("Confidence:");
      expect(explanation).toContain("Factors:");
    });
  });
});

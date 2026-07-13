import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAutoRollback } from "./auto-rollback.js";

describe("AutoRollback", () => {
  let rollback: ReturnType<typeof createAutoRollback>;

  beforeEach(() => {
    rollback = createAutoRollback();
  });

  it("configures and retrieves threshold", () => {
    rollback.configure({ maxErrorRate: 0.1, maxTestFailureRate: 0.2 });
    const threshold = rollback.getThreshold();
    expect(threshold.maxErrorRate).toBe(0.1);
    expect(threshold.maxTestFailureRate).toBe(0.2);
  });

  it("detects threshold breach on error rate", () => {
    rollback.configure({ maxErrorRate: 0.1 });

    const breached = rollback.checkThreshold({
      errorRate: 0.15,
      testFailureRate: 0,
      timestamp: Date.now(),
    });

    expect(breached).toBe(true);
  });

  it("does not trigger when within threshold", () => {
    rollback.configure({ maxErrorRate: 0.1 });

    const breached = rollback.checkThreshold({
      errorRate: 0.05,
      testFailureRate: 0,
      timestamp: Date.now(),
    });

    expect(breached).toBe(false);
  });

  it("detects threshold breach on test failure rate", () => {
    rollback.configure({ maxTestFailureRate: 0.1 });

    const breached = rollback.checkThreshold({
      errorRate: 0,
      testFailureRate: 0.15,
      timestamp: Date.now(),
    });

    expect(breached).toBe(true);
  });

  it("records rollback events", () => {
    rollback.recordRollback({
      reason: "Error rate exceeded threshold",
      metrics: { errorRate: 0.15, testFailureRate: 0, timestamp: Date.now() },
      reverted: true,
      report: "Rolled back to checkpoint abc123",
    });

    const history = rollback.getRollbackHistory();
    expect(history).toHaveLength(1);
    expect(history[0].reason).toContain("Error rate");
  });

  it("emits rollback events", () => {
    const handler = vi.fn();
    rollback.onRollback(handler);

    rollback.recordRollback({
      reason: "Test failure",
      metrics: { errorRate: 0, testFailureRate: 0.2, timestamp: Date.now() },
      reverted: true,
      report: "Rolled back",
    });

    expect(handler).toHaveBeenCalled();
  });

  it("supports custom conditions", () => {
    rollback.configure({
      customCondition: (metrics) => metrics.custom?.status === "critical",
    });

    const breached = rollback.checkThreshold({
      errorRate: 0,
      testFailureRate: 0,
      timestamp: Date.now(),
      custom: { status: "critical" },
    });

    expect(breached).toBe(true);
  });
});

import { EventEmitter } from "node:events";

export interface RollbackThreshold {
  maxErrorRate?: number; // 0-1, e.g., 0.1 = 10%
  maxTestFailureRate?: number; // 0-1
  maxResponseTimeMs?: number;
  customCondition?: (metrics: PostDeployMetrics) => boolean;
}

export interface PostDeployMetrics {
  errorRate: number;
  testFailureRate: number;
  responseTimeMs?: number;
  logsAnalyzed?: number;
  timestamp: number;
  custom?: Record<string, unknown>;
}

export interface RollbackEvent {
  id: string;
  triggeredAt: number;
  reason: string;
  metrics: PostDeployMetrics;
  checkpointHash?: string;
  reverted: boolean;
  report: string;
}

export interface AutoRollback {
  configure(threshold: RollbackThreshold): void;
  getThreshold(): RollbackThreshold;
  checkThreshold(metrics: PostDeployMetrics): boolean;
  recordRollback(event: Omit<RollbackEvent, "id" | "triggeredAt">): void;
  getRollbackHistory(): RollbackEvent[];
  onRollback(cb: (event: RollbackEvent) => void): void;
}

export function createAutoRollback(): AutoRollback {
  const emitter = new EventEmitter();
  let threshold: RollbackThreshold = {};
  const rollbackHistory: RollbackEvent[] = [];
  let idCounter = 0;

  function genId(): string {
    return `rb-${Date.now()}-${(idCounter++).toString(36)}`;
  }

  function configure(newThreshold: RollbackThreshold) {
    threshold = newThreshold;
    console.log(`[rollback] Threshold configured: ${JSON.stringify(threshold)}`);
  }

  function getThreshold(): RollbackThreshold {
    return { ...threshold };
  }

  function checkThreshold(metrics: PostDeployMetrics): boolean {
    // Returns true if threshold is breached (should trigger rollback)
    if (threshold.maxErrorRate !== undefined && metrics.errorRate > threshold.maxErrorRate) {
      console.log(`[rollback] Error rate ${metrics.errorRate} exceeds threshold ${threshold.maxErrorRate}`);
      return true;
    }

    if (threshold.maxTestFailureRate !== undefined && metrics.testFailureRate > threshold.maxTestFailureRate) {
      console.log(`[rollback] Test failure rate ${metrics.testFailureRate} exceeds threshold ${threshold.maxTestFailureRate}`);
      return true;
    }

    if (threshold.maxResponseTimeMs !== undefined && metrics.responseTimeMs !== undefined && metrics.responseTimeMs > threshold.maxResponseTimeMs) {
      console.log(`[rollback] Response time ${metrics.responseTimeMs}ms exceeds threshold ${threshold.maxResponseTimeMs}ms`);
      return true;
    }

    if (threshold.customCondition && threshold.customCondition(metrics)) {
      console.log("[rollback] Custom condition triggered");
      return true;
    }

    return false;
  }

  function recordRollback(event: Omit<RollbackEvent, "id" | "triggeredAt">) {
    const fullEvent: RollbackEvent = {
      ...event,
      id: genId(),
      triggeredAt: Date.now(),
    };

    rollbackHistory.push(fullEvent);
    console.log(`[rollback] Recorded: ${fullEvent.reason}`);

    emitter.emit("rollback", fullEvent);
  }

  function getRollbackHistory(): RollbackEvent[] {
    return [...rollbackHistory];
  }

  return {
    configure,
    getThreshold,
    checkThreshold,
    recordRollback,
    getRollbackHistory,
    onRollback: (cb) => emitter.on("rollback", cb),
  };
}

import { BRAND, rgba } from "../lib/brand.js";
import type { CostInfo } from "../lib/types.js";

interface DiagnosticsPanelProps {
  cost: CostInfo;
  memoryStats?: { coreCount: number; episodicCount: number; edgeCount: number };
}

export function DiagnosticsPanel({ cost, memoryStats }: DiagnosticsPanelProps) {
  const budgetPercent = Math.min(cost.budgetUsedPercent, 100);
  const isOverBudget = cost.budgetUsedPercent > 80;

  return (
    <div style={{
      background: rgba(BRAND.color.surface, 0.5),
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${BRAND.color["glass-border"]}`,
      borderRadius: 10,
      margin: "0 10px 8px 10px",
      padding: "12px 14px",
    }}>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 10,
        fontWeight: 500,
        color: BRAND.color["text-muted"],
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}>
        diagnostics
      </div>

      {/* Budget bar */}
      <div style={{ marginBottom: 12 }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          fontFamily: BRAND.font.mono,
          fontSize: 11,
          marginBottom: 5,
        }}>
          <span style={{ color: BRAND.color.white, opacity: 0.8 }}>budget</span>
          <span style={{ color: isOverBudget ? BRAND.color.ember : BRAND.color["text-secondary"] }}>
            ${cost.totalCostUsd.toFixed(2)} / ${cost.budgetCapUsd}
          </span>
        </div>
        <div style={{
          height: 3,
          background: rgba(BRAND.color.border, 0.5),
          borderRadius: 2,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${budgetPercent}%`,
            background: isOverBudget ? BRAND.color.ember : BRAND.color.sheen,
            borderRadius: 2,
            transition: "width 0.4s ease",
            boxShadow: isOverBudget ? `0 0 8px ${rgba(BRAND.color.ember, 0.4)}` : `0 0 8px ${rgba(BRAND.color.sheen, 0.3)}`,
          }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
        <StatBox label="tokens" value={formatNumber(cost.totalTokens)} />
        <StatBox label="memory" value={memoryStats ? String(memoryStats.coreCount + memoryStats.episodicCount) : "—"} />
        <StatBox label="edges" value={memoryStats ? String(memoryStats.edgeCount) : "—"} />
      </div>

      {/* Tool usage */}
      {Object.keys(cost.byTool).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            fontFamily: BRAND.font.mono,
            fontSize: 9,
            color: BRAND.color["text-muted"],
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}>
            tools
          </div>
          {Object.entries(cost.byTool).slice(0, 4).map(([name, info]) => {
            const t = info as { calls: number; totalMs: number; errors: number };
            return (
              <div key={name} style={{
                display: "flex",
                justifyContent: "space-between",
                fontFamily: BRAND.font.mono,
                fontSize: 10,
                padding: "2px 0",
              }}>
                <span style={{ color: BRAND.color.white, opacity: 0.7 }}>{name}</span>
                <span style={{ color: BRAND.color["text-muted"] }}>
                  {t.calls}x
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: rgba(BRAND.color.bg, 0.6),
      borderRadius: 6,
      padding: "6px 8px",
      textAlign: "center",
      border: `1px solid ${rgba(BRAND.color.border, 0.3)}`,
    }}>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 13,
        fontWeight: 500,
        color: BRAND.color.white,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 8,
        color: BRAND.color["text-muted"],
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return String(n);
}

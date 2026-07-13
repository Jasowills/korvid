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
      background: BRAND.color.graphite,
      borderTop: `1px solid ${BRAND.color.slate}`,
      padding: "12px 16px",
    }}>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 11,
        color: BRAND.color.slate,
        letterSpacing: "0.05em",
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
          marginBottom: 4,
        }}>
          <span style={{ color: BRAND.color.bone }}>budget</span>
          <span style={{ color: isOverBudget ? BRAND.color.ember : BRAND.color.slate }}>
            ${cost.totalCostUsd.toFixed(2)} / ${cost.budgetCapUsd}
          </span>
        </div>
        <div style={{
          height: 4,
          background: BRAND.color.slate,
          borderRadius: 2,
          overflow: "hidden",
        }}>
          <div style={{
            height: "100%",
            width: `${budgetPercent}%`,
            background: isOverBudget ? BRAND.color.ember : BRAND.color.sheen,
            borderRadius: 2,
            transition: "width 0.3s ease",
          }} />
        </div>
      </div>

      {/* Stats grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 8,
      }}>
        <StatBox label="tokens" value={String(cost.totalTokens)} />
        <StatBox label="memory" value={memoryStats ? String(memoryStats.coreCount + memoryStats.episodicCount) : "—"} />
        <StatBox label="edges" value={memoryStats ? String(memoryStats.edgeCount) : "—"} />
      </div>

      {/* Tool usage */}
      {Object.keys(cost.byTool).length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{
            fontFamily: BRAND.font.mono,
            fontSize: 10,
            color: BRAND.color.slate,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            marginBottom: 6,
          }}>
            tool usage
          </div>
          {Object.entries(cost.byTool).map(([name, info]) => { const typedInfo = info as { calls: number; totalMs: number; errors: number }; return (
            <div key={name} style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: BRAND.font.mono,
              fontSize: 11,
              padding: "2px 0",
            }}>
              <span style={{ color: BRAND.color.bone }}>{name}</span>
              <span style={{ color: BRAND.color.slate }}>
                {typedInfo.calls} calls · {typedInfo.totalMs > 0 ? `${Math.round(typedInfo.totalMs / typedInfo.calls)}ms avg` : "—"}
              </span>
            </div>
          ); })}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: BRAND.color.obsidian,
      borderRadius: 4,
      padding: "6px 8px",
      textAlign: "center",
    }}>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 14,
        fontWeight: 500,
        color: BRAND.color.bone,
      }}>
        {value}
      </div>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 9,
        color: BRAND.color.slate,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginTop: 2,
      }}>
        {label}
      </div>
    </div>
  );
}

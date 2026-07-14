import { BRAND } from "../lib/brand.js";
import type { MemoryNode, MemoryStats } from "../lib/types.js";

interface MemoryPanelProps {
  nodes: MemoryNode[];
  stats?: MemoryStats;
  onConsolidate?: () => void;
}

const NODE_COLORS: Record<string, string> = {
  fact: BRAND.color.sheen,
  episodic: "#9F7AEA",
  project: "#48BB78",
  tool: "#ED8936",
  tag: "#63B3ED",
};

export function MemoryPanel({ nodes, stats, onConsolidate }: MemoryPanelProps) {
  return (
    <div style={{
      background: "rgba(13,15,18,0.3)",
      borderTop: `1px solid ${BRAND.color.border}`,
      padding: "12px 16px",
    }}>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 11,
        color: BRAND.color.border,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}>
        memory
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <StatBox label="core" value={stats ? String(stats.coreCount) : "—"} />
        <StatBox label="episodic" value={stats ? String(stats.episodicCount) : "—"} />
        <StatBox label="edges" value={stats ? String(stats.edgeCount ?? 0) : "—"} />
      </div>

      {/* Consolidate button */}
      {onConsolidate && (
        <button
          onClick={onConsolidate}
          style={{
            width: "100%",
            background: BRAND.color.bg,
            border: `1px solid ${BRAND.color.border}`,
            borderRadius: 4,
            padding: "6px 0",
            fontFamily: BRAND.font.mono,
            fontSize: 11,
            color: BRAND.color.white,
            cursor: "pointer",
            marginBottom: 10,
          }}
        >
          consolidate
        </button>
      )}

      {/* Node list */}
      <div style={{ maxHeight: 120, overflow: "auto" }}>
        {nodes.slice(0, 10).map((node) => (
          <div key={node.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 0",
            borderBottom: `1px solid ${BRAND.color.bg}`,
          }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: NODE_COLORS[node.type] ?? BRAND.color.border,
              flexShrink: 0,
            }} />
            <span style={{
              fontFamily: BRAND.font.mono,
              fontSize: 11,
              color: BRAND.color.white,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {node.label ?? node.id}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: BRAND.color.bg,
      borderRadius: 4,
      padding: "6px 8px",
      textAlign: "center",
    }}>
      <div style={{ fontFamily: BRAND.font.mono, fontSize: 14, fontWeight: 500, color: BRAND.color.white }}>
        {value}
      </div>
      <div style={{ fontFamily: BRAND.font.mono, fontSize: 9, color: BRAND.color.border, letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 2 }}>
        {label}
      </div>
    </div>
  );
}

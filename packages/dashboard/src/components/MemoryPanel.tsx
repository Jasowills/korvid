import { BRAND, rgba } from "../lib/brand.js";
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
        memory
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 10 }}>
        <StatBox label="core" value={stats ? String(stats.coreCount) : "—"} />
        <StatBox label="episodes" value={stats ? String(stats.episodicCount) : "—"} />
        <StatBox label="edges" value={stats ? String(stats.edgeCount ?? 0) : "—"} />
      </div>

      {/* Consolidate */}
      {onConsolidate && (
        <button
          onClick={onConsolidate}
          style={{
            width: "100%",
            background: rgba(BRAND.color.sheen, 0.08),
            border: `1px solid ${rgba(BRAND.color.sheen, 0.2)}`,
            borderRadius: 6,
            padding: "5px 0",
            fontFamily: BRAND.font.mono,
            fontSize: 10,
            fontWeight: 500,
            color: BRAND.color.sheen,
            cursor: "pointer",
            marginBottom: 10,
            letterSpacing: "0.05em",
            transition: "all 0.15s ease",
          }}
        >
          consolidate
        </button>
      )}

      {/* Node list */}
      <div style={{ maxHeight: 100, overflow: "auto" }}>
        {nodes.slice(0, 8).map((node) => (
          <div key={node.id} style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "3px 0",
          }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: NODE_COLORS[node.type] ?? BRAND.color["text-muted"],
              flexShrink: 0,
              boxShadow: `0 0 4px ${rgba(NODE_COLORS[node.type] ?? BRAND.color["text-muted"], 0.4)}`,
            }} />
            <span style={{
              fontFamily: BRAND.font.mono,
              fontSize: 10,
              color: BRAND.color.white,
              opacity: 0.8,
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
      background: rgba(BRAND.color.bg, 0.6),
      borderRadius: 6,
      padding: "5px 8px",
      textAlign: "center",
      border: `1px solid ${rgba(BRAND.color.border, 0.3)}`,
    }}>
      <div style={{ fontFamily: BRAND.font.mono, fontSize: 13, fontWeight: 500, color: BRAND.color.white }}>
        {value}
      </div>
      <div style={{ fontFamily: BRAND.font.mono, fontSize: 8, color: BRAND.color["text-muted"], letterSpacing: "0.08em", textTransform: "uppercase", marginTop: 1 }}>
        {label}
      </div>
    </div>
  );
}

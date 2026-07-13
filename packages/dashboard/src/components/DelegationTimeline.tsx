import { BRAND } from "../lib/brand.js";
import type { DelegationEvent } from "../lib/types.js";

interface DelegationTimelineProps {
  events: DelegationEvent[];
}

const TYPE_ICONS: Record<string, string> = {
  delegation_started: "▶",
  agent_selected: "◆",
  spec_generated: "◇",
  sandbox_created: "□",
  agent_running: "◐",
  validation_started: "○",
  validation_passed: "●",
  validation_failed: "✕",
  retry: "↻",
  escalated: "!",
  completed: "●",
  error: "✕",
};

const STATUS_BORDER: Record<string, string> = {
  running: BRAND.color.sheen,
  completed: "#48BB78",
  failed: BRAND.color.ember,
};

export function DelegationTimeline({ events }: DelegationTimelineProps) {
  if (events.length === 0) return null;

  return (
    <div style={{
      maxHeight: 140,
      overflow: "auto",
      background: BRAND.color.graphite,
      borderTop: `1px solid ${BRAND.color.slate}`,
      padding: "10px 16px",
    }}>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 11,
        color: BRAND.color.slate,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 8,
      }}>
        delegation
      </div>

      <div style={{ display: "flex", gap: 2, overflowX: "auto", paddingBottom: 4 }}>
        {events.map((event) => (
          <div
            key={event.id}
            style={{
              minWidth: 100,
              maxWidth: 160,
              padding: "6px 8px",
              background: BRAND.color.obsidian,
              borderRadius: 4,
              borderLeft: `2px solid ${STATUS_BORDER[event.status] ?? BRAND.color.slate}`,
              flexShrink: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
              <span style={{
                fontFamily: BRAND.font.mono,
                fontSize: 10,
                color: STATUS_BORDER[event.status] ?? BRAND.color.slate,
              }}>
                {TYPE_ICONS[event.type] ?? "·"}
              </span>
              <span style={{
                fontFamily: BRAND.font.mono,
                fontSize: 9,
                color: BRAND.color.slate,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}>
                {event.type.replace(/_/g, " ")}
              </span>
            </div>
            <div style={{
              fontFamily: BRAND.font.mono,
              fontSize: 10,
              color: BRAND.color.bone,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {event.request?.slice(0, 40) ?? ""}
            </div>
            <div style={{
              fontFamily: BRAND.font.mono,
              fontSize: 9,
              color: BRAND.color.slate,
              marginTop: 2,
            }}>
              {new Date(event.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

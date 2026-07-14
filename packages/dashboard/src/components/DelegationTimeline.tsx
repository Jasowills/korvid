import { BRAND, rgba } from "../lib/brand.js";
import type { DelegationEvent } from "../lib/types.js";

interface DelegationTimelineProps {
  events: DelegationEvent[];
}

const STATUS_COLOR: Record<string, string> = {
  running: BRAND.color.sheen,
  completed: "#4ADE80",
  failed: BRAND.color.ember,
};

export function DelegationTimeline({ events }: DelegationTimelineProps) {
  if (events.length === 0) return null;

  return (
    <div style={{
      maxHeight: 120,
      overflow: "auto",
      background: rgba(BRAND.color.surface, 0.4),
      borderTop: `1px solid ${BRAND.color.border}`,
      padding: "8px 16px",
    }}>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 9,
        fontWeight: 500,
        color: BRAND.color["text-muted"],
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom: 6,
      }}>
        delegation
      </div>

      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {events.slice(0, 8).map((event) => (
          <div
            key={event.id}
            style={{
              minWidth: 110,
              maxWidth: 160,
              padding: "5px 8px",
              background: rgba(BRAND.color.bg, 0.6),
              borderRadius: 6,
              border: `1px solid ${rgba(BRAND.color.border, 0.3)}`,
              borderLeft: `2px solid ${STATUS_COLOR[event.status] ?? BRAND.color.border}`,
              flexShrink: 0,
            }}
          >
            <div style={{
              fontFamily: BRAND.font.mono,
              fontSize: 8,
              color: STATUS_COLOR[event.status] ?? BRAND.color["text-muted"],
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              marginBottom: 2,
            }}>
              {event.type.replace(/_/g, " ")}
            </div>
            <div style={{
              fontFamily: BRAND.font.mono,
              fontSize: 9,
              color: BRAND.color.white,
              opacity: 0.7,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}>
              {event.request?.slice(0, 40) ?? ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

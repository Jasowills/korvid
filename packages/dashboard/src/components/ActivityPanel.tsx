import { BRAND, rgba, STATUS_ICON, STATUS_COLOR } from "../lib/brand.js";
import type { ActivityEntry } from "../lib/types.js";

interface ActivityPanelProps {
  activityLog: ActivityEntry[];
  onInterrupt?: () => void;
  pipelineState: string;
}

const TYPE_ICONS: Record<string, string> = {
  reasoning: "◆",
  tool: "⚙",
  stt: "♪",
  tts: "▶",
  error: "✕",
  interrupt: "■",
};

export function ActivityPanel({ activityLog, onInterrupt, pipelineState }: ActivityPanelProps) {
  const isActive = pipelineState !== "idle";

  return (
    <div style={{
      background: rgba(BRAND.color.surface, 0.5),
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${BRAND.color["glass-border"]}`,
      borderRadius: 10,
      margin: "0 10px 8px 10px",
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "10px 14px",
        borderBottom: `1px solid ${BRAND.color.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{
          fontFamily: BRAND.font.mono,
          fontSize: 10,
          fontWeight: 500,
          color: BRAND.color["text-muted"],
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          activity
        </span>
        {isActive && onInterrupt && (
          <button
            onClick={onInterrupt}
            aria-label="Interrupt"
            style={{
              background: rgba(BRAND.color.ember, 0.15),
              color: BRAND.color.ember,
              border: `1px solid ${rgba(BRAND.color.ember, 0.3)}`,
              borderRadius: 5,
              padding: "3px 10px",
              fontFamily: BRAND.font.mono,
              fontSize: 10,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.05em",
              transition: "all 0.15s ease",
            }}
          >
            STOP
          </button>
        )}
      </div>

      {/* Feed */}
      <div style={{ maxHeight: 180, overflowY: "auto", overflowX: "hidden" }}>
        {activityLog.length === 0 && (
          <div style={{
            padding: "20px 14px",
            fontFamily: BRAND.font.mono,
            fontSize: 11,
            color: BRAND.color["text-muted"],
            textAlign: "center",
            opacity: 0.5,
          }}>
            idle
          </div>
        )}
        {activityLog.slice(0, 20).map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "5px 14px",
              borderBottom: `1px solid ${rgba(BRAND.color.border, 0.2)}`,
              animation: "fadeIn 0.15s ease-out",
            }}
          >
            <span style={{
              fontFamily: BRAND.font.mono,
              fontSize: 11,
              color: entry.type === "error" ? BRAND.color.ember : BRAND.color["text-muted"],
              flexShrink: 0,
              marginTop: 1,
            }}>
              {TYPE_ICONS[entry.type] ?? "·"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: BRAND.font.mono,
                fontSize: 11,
                color: BRAND.color.white,
                lineHeight: 1.4,
                wordBreak: "break-word",
                opacity: 0.9,
              }}>
                {entry.message.slice(0, 160)}
              </div>
              <div style={{
                fontFamily: BRAND.font.mono,
                fontSize: 9,
                color: BRAND.color["text-muted"],
                marginTop: 1,
              }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
            {entry.status && (
              <span style={{
                fontFamily: BRAND.font.mono,
                fontSize: 9,
                color: STATUS_COLOR[entry.status as keyof typeof STATUS_COLOR] ?? BRAND.color["text-muted"],
                flexShrink: 0,
                marginTop: 2,
              }}>
                {STATUS_ICON[entry.status as keyof typeof STATUS_ICON] ?? ""}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

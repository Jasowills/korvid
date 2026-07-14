import { BRAND, STATUS_ICON, STATUS_COLOR } from "../lib/brand.js";
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
      flex: 1,
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      background: "rgba(13,15,18,0.3)",
      borderLeft: "none",
    }}>
      {/* Header */}
      <div style={{
        padding: "12px 16px",
        borderBottom: `1px solid ${BRAND.color.border}`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}>
        <span style={{
          fontFamily: BRAND.font.mono,
          fontSize: 11,
          color: BRAND.color.border,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          activity
        </span>
        {isActive && onInterrupt && (
          <button
            onClick={onInterrupt}
            aria-label="Interrupt current action"
            style={{
              background: BRAND.color.ember,
              color: "#fff",
              border: "none",
              borderRadius: 4,
              padding: "4px 10px",
              fontFamily: BRAND.font.mono,
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.03em",
            }}
          >
            INTERRUPT
          </button>
        )}
      </div>

      {/* Activity feed */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 0" }}>
        {activityLog.length === 0 && (
          <div style={{
            padding: "24px 16px",
            fontFamily: BRAND.font.mono,
            fontSize: 12,
            color: BRAND.color.border,
            textAlign: "center",
          }}>
            no activity
          </div>
        )}
        {activityLog.map((entry) => (
          <div
            key={entry.id}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              padding: "6px 16px",
              borderBottom: `1px solid ${rgba(BRAND.color.border, 0.3)}`,
              animation: "fadeIn 0.2s ease-out",
            }}
          >
            <span style={{
              fontFamily: BRAND.font.mono,
              fontSize: 12,
              color: TYPE_ICONS[entry.type] === "✕" ? BRAND.color.ember : BRAND.color.border,
              flexShrink: 0,
              marginTop: 1,
            }}>
              {TYPE_ICONS[entry.type] ?? "·"}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: BRAND.font.mono,
                fontSize: 12,
                color: BRAND.color.white,
                lineHeight: 1.4,
                wordBreak: "break-word",
              }}>
                {entry.message.slice(0, 200)}
              </div>
              <div style={{
                fontFamily: BRAND.font.mono,
                fontSize: 10,
                color: BRAND.color.border,
                marginTop: 2,
              }}>
                {new Date(entry.timestamp).toLocaleTimeString()}
              </div>
            </div>
            {entry.status && (
              <span style={{
                fontFamily: BRAND.font.mono,
                fontSize: 10,
                color: STATUS_COLOR[entry.status as keyof typeof STATUS_COLOR] ?? BRAND.color.border,
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

function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

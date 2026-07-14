import { BRAND, rgba } from "../lib/brand.js";

interface HeaderProps {
  connectionState: string;
  pipelineState: string;
  uptime: number;
}

export function Header({ connectionState, pipelineState, uptime }: HeaderProps) {
  const uptimeStr = formatUptime(uptime);
  const isOnline = connectionState === "connected";
  const isIdle = pipelineState === "idle";

  return (
    <header style={{
      gridColumn: "1 / -1",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      height: 52,
      background: rgba(BRAND.color.surface, 0.4),
      backdropFilter: "blur(32px) saturate(1.5)",
      WebkitBackdropFilter: "blur(32px) saturate(1.5)",
      borderBottom: `1px solid ${BRAND.color["glass-border"]}`,
      fontFamily: BRAND.font.mono,
      zIndex: 100,
    }}>
      {/* Left: Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {/* Orb indicator */}
        <div style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: !isIdle ? BRAND.color.sheen : isOnline ? BRAND.color["text-muted"] : BRAND.color.ember,
          boxShadow: !isIdle
            ? `0 0 16px ${rgba(BRAND.color.sheen, 0.6)}, 0 0 4px ${rgba(BRAND.color.sheen, 0.4)}`
            : isOnline
              ? `0 0 8px ${rgba(BRAND.color["text-muted"], 0.3)}`
              : `0 0 8px ${rgba(BRAND.color.ember, 0.4)}`,
          transition: "all 0.4s ease",
          animation: !isIdle ? "statusPulse 2s ease-in-out infinite" : "none",
        }} />
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: "-0.03em",
          color: BRAND.color.white,
          fontFamily: BRAND.font.display,
        }}>
          korvid
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 500,
          color: BRAND.color["text-muted"],
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          marginLeft: 2,
        }}>
          v0.1
        </span>
      </div>

      {/* Right: Status */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        {/* Connection */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: isOnline ? "#4ADE80" : BRAND.color.ember,
            boxShadow: isOnline ? "0 0 8px rgba(74,222,128,0.4)" : `0 0 8px ${rgba(BRAND.color.ember, 0.4)}`,
            animation: isOnline ? "glowPulse 3s ease-in-out infinite" : "none",
          }} />
          <span style={{
            fontSize: 11,
            color: BRAND.color["text-secondary"],
          }}>
            {isOnline ? "online" : "offline"}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: BRAND.color.border }} />

        {/* Pipeline state */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            color: !isIdle ? BRAND.color.sheen : BRAND.color["text-muted"],
            fontSize: 10,
            animation: !isIdle ? "sheenPulse 2s ease-in-out infinite" : "none",
          }}>
            {!isIdle ? "◐" : "○"}
          </span>
          <span style={{
            fontSize: 11,
            color: !isIdle ? BRAND.color.sheen : BRAND.color["text-secondary"],
            fontWeight: !isIdle ? 500 : 400,
            transition: "color 0.3s ease",
          }}>
            {pipelineState}
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 16, background: BRAND.color.border }} />

        {/* Uptime */}
        <span style={{
          fontSize: 11,
          color: BRAND.color["text-muted"],
          fontVariantNumeric: "tabular-nums",
        }}>
          {uptimeStr}
        </span>
      </div>
    </header>
  );
}

function formatUptime(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

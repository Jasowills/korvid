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
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      height: 44,
      background: rgba(BRAND.color.surface, 0.3),
      backdropFilter: "blur(24px)",
      borderBottom: `1px solid ${BRAND.color["glass-border"]}`,
      fontFamily: BRAND.font.mono,
      fontSize: 11,
      zIndex: 100,
    }}>
      {/* Left: Brand */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: !isIdle ? BRAND.color.sheen : isOnline ? "#3A3F44" : BRAND.color.ember,
          boxShadow: !isIdle
            ? `0 0 12px ${rgba(BRAND.color.sheen, 0.6)}, 0 0 4px ${rgba(BRAND.color.sheen, 0.3)}`
            : isOnline
              ? `0 0 6px rgba(74,222,128,0.2)`
              : `0 0 8px ${rgba(BRAND.color.ember, 0.4)}`,
          transition: "all 0.3s ease",
          animation: !isIdle ? "statusPulse 2s ease-in-out infinite" : "none",
        }} />
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: "-0.02em",
          color: BRAND.color.white,
          fontFamily: BRAND.font.display,
        }}>
          korvid
        </span>
      </div>

      {/* Center: Status pills */}
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <StatusPill
          label="connection"
          value={isOnline ? "online" : "offline"}
          color={isOnline ? "#4ADE80" : BRAND.color.ember}
          pulse={isOnline}
        />
        <StatusPill
          label="pipeline"
          value={pipelineState}
          color={!isIdle ? BRAND.color.sheen : BRAND.color["text-muted"]}
          pulse={!isIdle}
        />
        <StatusPill
          label="uptime"
          value={uptimeStr}
          color={BRAND.color["text-secondary"]}
          mono
        />
      </div>

      {/* Right: Version */}
      <div style={{
        fontSize: 10,
        color: BRAND.color["text-muted"],
        letterSpacing: "0.05em",
      }}>
        v0.1
      </div>
    </header>
  );
}

function StatusPill({ label, value, color, pulse, mono }: {
  label: string;
  value: string;
  color: string;
  pulse?: boolean;
  mono?: boolean;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        fontSize: 9,
        color: BRAND.color["text-muted"],
        textTransform: "uppercase",
        letterSpacing: "0.1em",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: 11,
        color,
        fontWeight: 500,
        fontFamily: mono ? BRAND.font.mono : "inherit",
        fontVariantNumeric: mono ? "tabular-nums" : undefined,
        animation: pulse ? "sheenPulse 2s ease-in-out infinite" : "none",
      }}>
        {value}
      </span>
    </div>
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

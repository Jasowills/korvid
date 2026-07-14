import { BRAND, STATUS_ICON } from "../lib/brand.js";

interface HeaderProps {
  connectionState: string;
  pipelineState: string;
  uptime: number;
}

export function Header({ connectionState, pipelineState, uptime }: HeaderProps) {
  const uptimeStr = formatUptime(uptime);
  const pipelineColor = pipelineState === "idle" ? BRAND.color["text-muted"]
    : pipelineState === "listening" ? BRAND.color.sheen
    : pipelineState === "processing" ? BRAND.color.sheen
    : BRAND.color.white;

  return (
    <header style={{
      gridColumn: "1 / -1",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      height: 48,
      background: "rgba(13,15,18,0.4)",
      backdropFilter: "blur(24px) saturate(1.4)",
      WebkitBackdropFilter: "blur(24px) saturate(1.4)",
      borderBottom: `1px solid ${BRAND.color["glass-border"]}`,
      fontFamily: BRAND.font.mono,
      zIndex: 100,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Orb icon */}
        <div style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: pipelineState !== "idle" ? BRAND.color.sheen : BRAND.color["text-muted"],
          boxShadow: pipelineState !== "idle" ? `0 0 12px rgba(124,140,255,0.5)` : "none",
          transition: "all 0.3s ease",
        }} />
        <span style={{
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: BRAND.color.white,
        }}>
          korvid
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{
            color: connectionState === "connected" ? BRAND.color.sheen : BRAND.color.ember,
            fontSize: 8,
          }}>
            {STATUS_ICON[connectionState === "connected" ? "active" : "error"]}
          </span>
          <span style={{ color: BRAND.color["text-muted"], fontFamily: BRAND.font.mono, fontSize: 11 }}>
            {connectionState}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ color: pipelineColor, fontSize: 8 }}>
            {pipelineState === "processing" ? STATUS_ICON.processing : STATUS_ICON.idle}
          </span>
          <span style={{ color: BRAND.color.white, fontFamily: BRAND.font.mono, fontSize: 11 }}>
            {pipelineState}
          </span>
        </div>

        <span style={{ color: BRAND.color["text-muted"], fontFamily: BRAND.font.mono, fontSize: 11 }}>
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

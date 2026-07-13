import { BRAND, rgba, STATUS_ICON } from "../lib/brand.js";

interface HeaderProps {
  connectionState: string;
  pipelineState: string;
  uptime: number;
}

export function Header({ connectionState, pipelineState, uptime }: HeaderProps) {
  const uptimeStr = formatUptime(uptime);
  const pipelineColor = pipelineState === "idle" ? BRAND.color.slate
    : pipelineState === "listening" ? BRAND.color.sheen
    : pipelineState === "processing" ? BRAND.color.sheen
    : BRAND.color.bone;

  return (
    <header style={{
      gridColumn: "1 / -1",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      height: 56,
      background: BRAND.color.graphite,
      borderBottom: `1px solid ${BRAND.color.slate}`,
      fontFamily: BRAND.font.mono,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{
          fontSize: 16,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: BRAND.color.bone,
        }}>
          korvid
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 13 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            color: connectionState === "connected" ? BRAND.color.sheen : BRAND.color.ember,
            fontSize: 10,
          }}>
            {STATUS_ICON[connectionState === "connected" ? "active" : "error"]}
          </span>
          <span style={{ color: BRAND.color.slate, fontFamily: BRAND.font.mono, fontSize: 12 }}>
            {connectionState}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ color: pipelineColor, fontSize: 10 }}>
            {pipelineState === "processing" ? STATUS_ICON.processing : STATUS_ICON.idle}
          </span>
          <span style={{ color: BRAND.color.bone, fontFamily: BRAND.font.mono, fontSize: 12 }}>
            {pipelineState}
          </span>
        </div>

        <span style={{ color: BRAND.color.slate, fontFamily: BRAND.font.mono, fontSize: 12 }}>
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

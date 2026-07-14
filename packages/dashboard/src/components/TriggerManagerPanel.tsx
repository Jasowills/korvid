import { useEffect, useState } from "react";
import { BRAND } from "../lib/brand.js";

interface TriggerManagerPanelProps {}

interface TriggerStatus {
  enabled: boolean;
  port: number;
  verifySignatures: boolean;
}

export function TriggerManagerPanel(_props: TriggerManagerPanelProps) {
  const [status, setStatus] = useState<TriggerStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/triggers");
        if (res.ok) {
          const data = await res.json();
          setStatus(data.triggers ?? data);
        }
      } catch {}
    };
    fetchStatus();
  }, []);

  if (!status) return null;

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
        triggers
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 11, color: BRAND.color.white }}>
            {status.enabled ? `port ${status.port}` : "disabled"}
          </div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.border, marginTop: 2 }}>
            hmac verification: {status.verifySignatures ? "on" : "off"}
          </div>
        </div>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: status.enabled ? "#48BB78" : BRAND.color.border,
        }} />
      </div>
    </div>
  );
}

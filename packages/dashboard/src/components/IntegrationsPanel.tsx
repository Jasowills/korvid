import { useEffect, useState } from "react";
import { BRAND, rgba } from "../lib/brand.js";

interface IntegrationStatus {
  calendar: { enabled: boolean; provider: string };
  email: { enabled: boolean; provider: string };
}

export function IntegrationsPanel() {
  const [status, setStatus] = useState<IntegrationStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/integrations/status");
        if (res.ok) setStatus(await res.json());
      } catch {}
    };
    fetchStatus();
    const interval = setInterval(fetchStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!status) return null;

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
        marginBottom: 8,
      }}>
        integrations
      </div>

      <IntegrationRow name="calendar" provider={status.calendar.provider} enabled={status.calendar.enabled} />
      <IntegrationRow name="email" provider={status.email.provider} enabled={status.email.enabled} />
    </div>
  );
}

function IntegrationRow({ name, provider, enabled }: { name: string; provider: string; enabled: boolean }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "4px 0",
    }}>
      <span style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.white, opacity: 0.8 }}>{name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: BRAND.font.mono, fontSize: 9, color: BRAND.color["text-muted"] }}>{provider}</span>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: enabled ? "#4ADE80" : BRAND.color["text-muted"],
          boxShadow: enabled ? "0 0 6px rgba(74,222,128,0.4)" : "none",
        }} />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BRAND } from "../lib/brand.js";

interface IntegrationsPanelProps {}

interface IntegrationStatus {
  calendar: { enabled: boolean; provider: string };
  email: { enabled: boolean; provider: string };
}

export function IntegrationsPanel(_props: IntegrationsPanelProps) {
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
      <span style={{ fontFamily: BRAND.font.mono, fontSize: 11, color: BRAND.color.white }}>{name}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.border }}>{provider}</span>
        <span style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: enabled ? "#48BB78" : BRAND.color.border,
        }} />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { BRAND, rgba } from "../lib/brand.js";

interface WorkflowStatus {
  enabled: boolean;
  maxConcurrent: number;
}

export function WorkflowManager() {
  const [status, setStatus] = useState<WorkflowStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/workflows");
        if (res.ok) setStatus(await res.json());
      } catch {}
    };
    fetchStatus();
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
        workflows
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.white, opacity: 0.8 }}>
            {status.enabled ? "enabled" : "disabled"}
          </div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 9, color: BRAND.color["text-muted"], marginTop: 2 }}>
            max concurrent: {status.maxConcurrent}
          </div>
        </div>
        <div style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: status.enabled ? "#4ADE80" : BRAND.color["text-muted"],
          boxShadow: status.enabled ? "0 0 6px rgba(74,222,128,0.4)" : "none",
        }} />
      </div>
    </div>
  );
}

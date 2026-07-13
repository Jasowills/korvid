import { useEffect, useState } from "react";
import { BRAND } from "../lib/brand.js";

interface WorkflowManagerProps {}

interface WorkflowStatus {
  enabled: boolean;
  maxConcurrent: number;
  defaultTimeoutMs?: number;
}

export function WorkflowManager(_props: WorkflowManagerProps) {
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
      background: BRAND.color.graphite,
      borderTop: `1px solid ${BRAND.color.slate}`,
      padding: "12px 16px",
    }}>
      <div style={{
        fontFamily: BRAND.font.mono,
        fontSize: 11,
        color: BRAND.color.slate,
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        marginBottom: 10,
      }}>
        workflows
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 11, color: BRAND.color.bone }}>
            {status.enabled ? "enabled" : "disabled"}
          </div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.slate, marginTop: 2 }}>
            max concurrent: {status.maxConcurrent}
          </div>
        </div>
        <span style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: status.enabled ? "#48BB78" : BRAND.color.slate,
        }} />
      </div>
    </div>
  );
}

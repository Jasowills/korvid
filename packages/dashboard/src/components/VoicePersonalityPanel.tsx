import { useEffect, useState } from "react";
import { BRAND, rgba } from "../lib/brand.js";

interface PersonalityStatus {
  activeProfile: string;
  customProfiles: { name: string; personality: string }[];
}

const PROFILE_DESCRIPTIONS: Record<string, string> = {
  jarvis: "dry, concise",
  friday: "friendly, warm",
  ada: "technical, precise",
  butler: "formal, measured",
};

export function VoicePersonalityPanel() {
  const [status, setStatus] = useState<PersonalityStatus | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/voice-personality");
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
        voice
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 11, color: BRAND.color.white, fontWeight: 500 }}>
            {status.activeProfile}
          </div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 9, color: BRAND.color["text-muted"], marginTop: 2 }}>
            {PROFILE_DESCRIPTIONS[status.activeProfile] ?? "custom"}
          </div>
        </div>
        <span style={{
          fontFamily: BRAND.font.mono,
          fontSize: 8,
          color: BRAND.color.sheen,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "2px 6px",
          borderRadius: 3,
          background: rgba(BRAND.color.sheen, 0.1),
          border: `1px solid ${rgba(BRAND.color.sheen, 0.2)}`,
        }}>
          active
        </span>
      </div>
    </div>
  );
}

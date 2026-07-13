import { useEffect, useState } from "react";
import { BRAND } from "../lib/brand.js";

interface VoicePersonalityPanelProps {}

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

export function VoicePersonalityPanel(_props: VoicePersonalityPanelProps) {
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
        voice personality
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 12, color: BRAND.color.bone }}>
            {status.activeProfile}
          </div>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.slate, marginTop: 2 }}>
            {PROFILE_DESCRIPTIONS[status.activeProfile] ?? "custom"}
          </div>
        </div>
        <span style={{
          fontFamily: BRAND.font.mono,
          fontSize: 9,
          color: BRAND.color.sheen,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "2px 6px",
          borderRadius: 2,
          background: BRAND.color.obsidian,
        }}>
          active
        </span>
      </div>

      {status.customProfiles.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <div style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.slate, marginBottom: 4 }}>custom profiles</div>
          {status.customProfiles.map((p) => (
            <div key={p.name} style={{
              fontFamily: BRAND.font.mono,
              fontSize: 11,
              color: BRAND.color.bone,
              padding: "2px 0",
            }}>
              {p.name} · <span style={{ color: BRAND.color.slate }}>{p.personality}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import { BRAND } from "../lib/brand.js";
import type { Suggestion } from "../lib/types.js";

interface SuggestionsPanelProps {
  suggestions?: Suggestion[];
}

const TYPE_COLORS: Record<string, string> = {
  reminder: "#ED8936",
  follow_up: BRAND.color.sheen,
  context: "#48BB78",
  proactive: "#9F7AEA",
};

export function SuggestionsPanel({ suggestions: propSuggestions }: SuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>(propSuggestions ?? []);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (propSuggestions) {
      setSuggestions(propSuggestions);
      return;
    }
    const fetchSuggestions = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/suggestions");
        if (res.ok) {
          const data = await res.json();
          if (data.suggestions) setSuggestions(data.suggestions);
        }
      } catch {}
      setLoading(false);
    };
    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, 300000);
    return () => clearInterval(interval);
  }, [propSuggestions]);

  if (suggestions.length === 0 && !loading) return null;

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
        suggestions
      </div>

      {suggestions.map((s) => (
        <div key={s.id} style={{
          padding: "6px 0",
          borderBottom: `1px solid ${BRAND.color.bg}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
            <span style={{
              fontFamily: BRAND.font.mono,
              fontSize: 9,
              color: TYPE_COLORS[s.type] ?? BRAND.color.border,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "1px 4px",
              borderRadius: 2,
              background: BRAND.color.bg,
            }}>
              {s.type}
            </span>
          </div>
          <div style={{
            fontFamily: BRAND.font.body,
            fontSize: 12,
            color: BRAND.color.white,
            lineHeight: 1.4,
          }}>
            {s.message}
          </div>
          {s.context && (
            <div style={{
              fontFamily: BRAND.font.mono,
              fontSize: 10,
              color: BRAND.color.border,
              marginTop: 2,
            }}>
              {s.context}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

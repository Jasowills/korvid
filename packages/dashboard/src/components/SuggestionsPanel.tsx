import { useEffect, useState } from "react";
import { BRAND, rgba } from "../lib/brand.js";
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
        suggestions
      </div>

      {suggestions.slice(0, 3).map((s) => (
        <div key={s.id} style={{
          padding: "6px 0",
          borderBottom: `1px solid ${rgba(BRAND.color.border, 0.2)}`,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
            <span style={{
              fontFamily: BRAND.font.mono,
              fontSize: 8,
              color: TYPE_COLORS[s.type] ?? BRAND.color["text-muted"],
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "1px 5px",
              borderRadius: 3,
              background: rgba(TYPE_COLORS[s.type] ?? BRAND.color["text-muted"], 0.1),
            }}>
              {s.type}
            </span>
          </div>
          <div style={{
            fontFamily: BRAND.font.body,
            fontSize: 11,
            color: BRAND.color.white,
            opacity: 0.85,
            lineHeight: 1.4,
          }}>
            {s.message}
          </div>
        </div>
      ))}
    </div>
  );
}

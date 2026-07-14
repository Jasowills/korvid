export const BRAND = {
  color: {
    bg: "#050507",
    surface: "#0D0F12",
    "surface-2": "#14171C",
    border: "#1E2127",
    white: "#FFFFFF",
    "text-secondary": "#9CA0A6",
    "text-muted": "#5A5E64",
    sheen: "#7C8CFF",
    ember: "#FF6B4A",
    glass: "rgba(13,15,18,0.6)",
    "glass-border": "rgba(255,255,255,0.06)",
  },
  font: {
    display: "'Space Grotesk', system-ui, sans-serif",
    body: "'Space Grotesk', system-ui, sans-serif",
    mono: "'IBM Plex Mono', 'Menlo', monospace",
  },
  motion: {
    sheenPulse: "2s ease-in-out infinite",
    flyToDuration: "600ms",
  },
} as const;

export type BrandColor = keyof typeof BRAND.color;

export function rgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export const STATUS_ICON = {
  active: "●",
  idle: "○",
  processing: "◐",
  error: "✕",
} as const;

export const STATUS_COLOR = {
  active: BRAND.color.sheen,
  idle: BRAND.color["text-muted"],
  processing: BRAND.color.sheen,
  error: BRAND.color.ember,
} as const;

export const BRAND = {
  color: {
    obsidian: "#12151A",
    graphite: "#1C2126",
    slate: "#2A3138",
    bone: "#E8EAED",
    sheen: "#7C8CFF",
    ember: "#FF6B4A",
  },
  font: {
    mono: "'IBM Plex Mono', 'Menlo', monospace",
    body: "'Space Grotesk', system-ui, sans-serif",
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
  idle: BRAND.color.slate,
  processing: BRAND.color.sheen,
  error: BRAND.color.ember,
} as const;

export const BRAND = {
  color: {
    obsidian: "#0E1013",
    graphite: "#191C20",
    slate: "#2A2E33",
    ash: "#6B7076",
    bone: "#EDEEF0",
    sheen: "#7C8CFF",
    spark: "#FFB648",
    ember: "#FF6B4A",
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
  idle: BRAND.color.slate,
  processing: BRAND.color.sheen,
  error: BRAND.color.ember,
} as const;

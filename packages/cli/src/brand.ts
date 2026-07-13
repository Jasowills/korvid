export const BRAND_CLI = {
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
  },
} as const;

export const STATUS_GLYPH = {
  active: "●",
  idle: "○",
  processing: "◐",
  error: "✕",
} as const;

export function brandBoot() {
  const lines = [
    "",
    "  ██╗  ██╗██╗████████╗██╗  ██╗██╗   ██╗██████╗ ",
    "  ██║ ██╔╝██║╚══██╔╝██║  ██║██║   ██║██╔══██╗",
    "  █████╔╝ ██║   ██║  ███████║██║   ██║██████╔╝",
    "  ██╔═██╗ ██║   ██║  ██╔══██║██║   ██║██╔══██╗",
    "  ██║  ██╗██║   ██║  ██║  ██║╚██████╔╝██████╔╝",
    "  ╚═╝  ╚═╝╚═╝   ╚═╝  ╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ",
    "",
  ];

  const sheenHueStart = 230;
  const sheenHueEnd = 270;

  const colored = lines.map((line, lineIdx) => {
    if (lineIdx === 0 || lineIdx === lines.length - 1) return line;
    const chars = [...line];
    return chars.map((ch, i) => {
      const progress = i / Math.max(chars.length - 1, 1);
      const hue = sheenHueStart + (sheenHueEnd - sheenHueStart) * progress;
      const r = Math.round(124 + (127 - 124) * progress);
      const g = Math.round(140 + (100 - 140) * progress);
      const b = Math.round(255);
      return `\x1b[38;2;${r};${g};${b}m${ch}\x1b[0m`;
    }).join("");
  });

  return colored.join("\n");
}

export function brandFooter() {
  return `\n  \x1b[2mkorvid v0.1.0 — personal ai assistant\x1b[0m`;
}

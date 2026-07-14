import { useEffect, useRef, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from "recharts";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BRAND } from "../lib/brand.js";

export type VizType = "chart" | "diagram" | "table" | "markdown" | "code" | "clear";

export interface VizData {
  type: VizType;
  title?: string;
  chartKind?: "line" | "bar" | "pie" | "area";
  data?: Record<string, unknown>[];
  xKey?: string;
  yKeys?: string[];
  colors?: string[];
  columns?: string[];
  rows?: unknown[][];
  content?: string;
  language?: string;
}

interface Props {
  viz: VizData | null;
  onClose: () => void;
}

const SHEEN_COLORS = ["#7C8CFF", "#9F7AEA", "#48BB78", "#ED8936", "#63B3ED", "#F6AD55", "#FC8181"];

function ChartRenderer({ viz }: { viz: VizData }) {
  const { chartKind, data, xKey, yKeys, colors } = viz;
  if (!data || !xKey || !yKeys) return null;
  const palette = colors ?? SHEEN_COLORS;

  const tooltipStyle = {
    contentStyle: {
      background: BRAND.color.surface,
      border: `1px solid ${BRAND.color.border}`,
      borderRadius: 6,
      fontFamily: BRAND.font.mono,
      fontSize: 11,
      color: BRAND.color.white,
    },
  };

  const axisStyle = { fontSize: 10, fontFamily: BRAND.font.mono, fill: "#5A5E64" };

  if (chartKind === "line") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2127" />
          <XAxis dataKey={xKey} tick={axisStyle} stroke="#1E2127" />
          <YAxis tick={axisStyle} stroke="#1E2127" />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontFamily: BRAND.font.mono, fontSize: 10 }} />
          {yKeys.map((key, i) => (
            <Line key={key} type="monotone" dataKey={key} stroke={palette[i % palette.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartKind === "bar") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2127" />
          <XAxis dataKey={xKey} tick={axisStyle} stroke="#1E2127" />
          <YAxis tick={axisStyle} stroke="#1E2127" />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontFamily: BRAND.font.mono, fontSize: 10 }} />
          {yKeys.map((key, i) => (
            <Bar key={key} dataKey={key} fill={palette[i % palette.length]} radius={[3, 3, 0, 0]} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartKind === "pie") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <PieChart>
          <Pie data={data} dataKey={yKeys[0]} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} label>
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip {...tooltipStyle} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartKind === "area") {
    return (
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E2127" />
          <XAxis dataKey={xKey} tick={axisStyle} stroke="#1E2127" />
          <YAxis tick={axisStyle} stroke="#1E2127" />
          <Tooltip {...tooltipStyle} />
          <Legend wrapperStyle={{ fontFamily: BRAND.font.mono, fontSize: 10 }} />
          {yKeys.map((key, i) => (
            <Area key={key} type="monotone" dataKey={key} stroke={palette[i % palette.length]} fill={palette[i % palette.length]} fillOpacity={0.15} strokeWidth={2} />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

function MermaidRenderer({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          theme: "dark",
          themeVariables: {
            primaryColor: "#7C8CFF",
            primaryTextColor: "#FFFFFF",
            primaryBorderColor: "#1E2127",
            lineColor: "#5A5E64",
            secondaryColor: "#0D0F12",
            tertiaryColor: "#14171C",
            fontFamily: "IBM Plex Mono, monospace",
            fontSize: "12px",
          },
        });
        const id = `mermaid-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(id, content);
        if (!cancelled) setSvg(rendered);
      } catch (err) {
        if (!cancelled) setSvg(`<pre style="color:#FF6B4A">Mermaid error: ${String(err)}</pre>`);
      }
    })();
    return () => { cancelled = true; };
  }, [content]);

  return <div ref={ref} dangerouslySetInnerHTML={{ __html: svg }} style={{ overflow: "auto" }} />;
}

function TableRenderer({ columns, rows }: { columns?: string[]; rows?: unknown[][] }) {
  if (!columns || !rows) return null;
  return (
    <div style={{ overflow: "auto", maxHeight: 300 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: BRAND.font.mono, fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} style={{
                textAlign: "left", padding: "6px 10px", borderBottom: `1px solid ${BRAND.color.border}`,
                color: BRAND.color.sheen, fontWeight: 500, position: "sticky", top: 0,
                background: BRAND.color.surface,
              }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.02)" }}>
              {row.map((cell, j) => (
                <td key={j} style={{
                  padding: "5px 10px", borderBottom: `1px solid ${BRAND.color.border}`,
                  color: BRAND.color.white,
                }}>{String(cell ?? "")}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CodeRenderer({ content, language }: { content?: string; language?: string }) {
  return (
    <pre style={{
      margin: 0, padding: 14, background: "#0A0C0F", borderRadius: 6,
      border: `1px solid ${BRAND.color.border}`, overflow: "auto",
      fontFamily: BRAND.font.mono, fontSize: 12, lineHeight: 1.6,
      color: BRAND.color.white,
    }}>
      <code>{content ?? ""}</code>
    </pre>
  );
}

export function VisualizationPanel({ viz, onClose }: Props) {
  if (!viz || viz.type === "clear") return null;

  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 10, display: "flex", flexDirection: "column",
      background: "rgba(5,5,7,0.92)", backdropFilter: "blur(24px)",
      border: `1px solid ${BRAND.color.border}`, borderRadius: 8,
      margin: 12, overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: `1px solid ${BRAND.color.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ color: BRAND.color.sheen, fontSize: 13, fontFamily: BRAND.font.mono }}>
            {viz.type === "chart" ? `● ${viz.chartKind ?? "chart"}` :
             viz.type === "diagram" ? "◆ diagram" :
             viz.type === "table" ? "▦ table" :
             viz.type === "code" ? "» code" : "¶ markdown"}
          </span>
          {viz.title && (
            <span style={{ fontFamily: BRAND.font.display, fontSize: 14, fontWeight: 600, color: BRAND.color.white }}>
              {viz.title}
            </span>
          )}
        </div>
        <button onClick={onClose} style={{
          background: "none", border: `1px solid ${BRAND.color.border}`, borderRadius: 4,
          color: BRAND.color.white, cursor: "pointer", padding: "2px 8px",
          fontFamily: BRAND.font.mono, fontSize: 11,
        }}>✕</button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: "auto", padding: 16 }}>
        {viz.type === "chart" && <ChartRenderer viz={viz} />}
        {viz.type === "diagram" && viz.content && <MermaidRenderer content={viz.content} />}
        {viz.type === "table" && <TableRenderer columns={viz.columns} rows={viz.rows} />}
        {viz.type === "code" && <CodeRenderer content={viz.content} language={viz.language} />}
        {viz.type === "markdown" && viz.content && (
          <div style={{ fontFamily: BRAND.font.body, fontSize: 14, lineHeight: 1.7, color: BRAND.color.white }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{viz.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

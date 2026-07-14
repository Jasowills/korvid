import { useState } from "react";
import { BRAND } from "../lib/brand.js";
import type { ToolPermissions } from "../lib/types.js";

interface ToolPermissionsPanelProps {
  permissions: ToolPermissions;
  onUpdate?: (perms: ToolPermissions) => void;
}

const TOOLS = [
  "screenshot", "open_app", "close_app", "list_apps",
  "clipboard_read", "clipboard_write", "list_files",
  "read_file", "write_file", "run_command",
];

export function ToolPermissionsPanel({ permissions, onUpdate }: ToolPermissionsPanelProps) {
  const [localPerms, setLocalPerms] = useState<ToolPermissions>(permissions);

  const toggle = (tool: string, list: "allow" | "deny" | "requireConfirmation") => {
    const current = localPerms[list] ?? [];
    const next = current.includes(tool) ? current.filter((t: string) => t !== tool) : [...current, tool];
    const updated = { ...localPerms, [list]: next };
    setLocalPerms(updated);
    onUpdate?.(updated);
  };

  const toggleAll = () => {
    const updated = { ...localPerms, enabled: !localPerms.enabled };
    setLocalPerms(updated);
    onUpdate?.(updated);
  };

  return (
    <div style={{
      background: "rgba(13,15,18,0.3)",
      borderTop: `1px solid ${BRAND.color.border}`,
      padding: "12px 16px",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: BRAND.font.mono,
          fontSize: 11,
          color: BRAND.color.border,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          tool permissions
        </span>
        <button
          onClick={toggleAll}
          aria-label={localPerms.enabled ? "Disable tool permissions" : "Enable tool permissions"}
          style={{
            background: localPerms.enabled ? BRAND.color.sheen : BRAND.color.border,
            color: localPerms.enabled ? "#fff" : BRAND.color.white,
            border: "none",
            borderRadius: 4,
            padding: "2px 8px",
            fontFamily: BRAND.font.mono,
            fontSize: 10,
            cursor: "pointer",
          }}
        >
          {localPerms.enabled ? "ON" : "OFF"}
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto auto", gap: "4px 8px", alignItems: "center" }}>
        <span style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.border, textTransform: "uppercase" }}>tool</span>
        <span style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.border, textTransform: "uppercase", textAlign: "center" }}>allow</span>
        <span style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.border, textTransform: "uppercase", textAlign: "center" }}>deny</span>
        <span style={{ fontFamily: BRAND.font.mono, fontSize: 10, color: BRAND.color.border, textTransform: "uppercase", textAlign: "center" }}>confirm</span>

        {TOOLS.map((tool) => (
          <Row
            key={tool}
            tool={tool}
            perms={localPerms}
            onToggle={(list) => toggle(tool, list)}
          />
        ))}
      </div>
    </div>
  );
}

function Row({ tool, perms, onToggle }: { tool: string; perms: ToolPermissions; onToggle: (list: "allow" | "deny" | "requireConfirmation") => void }) {
  const isChecked = (list: "allow" | "deny" | "requireConfirmation") =>
    (perms[list] ?? []).includes(tool);

  return (
    <>
      <span style={{ fontFamily: BRAND.font.mono, fontSize: 11, color: BRAND.color.white }}>{tool}</span>
      {(["allow", "deny", "requireConfirmation"] as const).map((list) => (
        <label key={list} style={{ textAlign: "center", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={isChecked(list)}
            onChange={() => onToggle(list)}
            aria-label={`${list} ${tool}`}
            style={{ accentColor: BRAND.color.sheen }}
          />
        </label>
      ))}
    </>
  );
}

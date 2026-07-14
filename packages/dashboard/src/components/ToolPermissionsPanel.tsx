import { useState } from "react";
import { BRAND, rgba } from "../lib/brand.js";
import type { ToolPermissions } from "../lib/types.js";

interface ToolPermissionsPanelProps {
  permissions: ToolPermissions;
  onUpdate?: (perms: ToolPermissions) => void;
}

const TOOLS = [
  "screenshot", "open_app", "close_app", "list_apps",
  "clipboard_read", "clipboard_write", "list_files",
  "read_file", "write_file", "run_command", "visualize",
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
      background: rgba(BRAND.color.surface, 0.5),
      backdropFilter: "blur(20px)",
      WebkitBackdropFilter: "blur(20px)",
      border: `1px solid ${BRAND.color["glass-border"]}`,
      borderRadius: 10,
      margin: "0 10px 8px 10px",
      padding: "12px 14px",
    }}>
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
      }}>
        <span style={{
          fontFamily: BRAND.font.mono,
          fontSize: 10,
          fontWeight: 500,
          color: BRAND.color["text-muted"],
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}>
          tools
        </span>
        <button
          onClick={toggleAll}
          aria-label={localPerms.enabled ? "Disable" : "Enable"}
          style={{
            background: localPerms.enabled ? rgba(BRAND.color.sheen, 0.15) : rgba(BRAND.color["text-muted"], 0.15),
            color: localPerms.enabled ? BRAND.color.sheen : BRAND.color["text-muted"],
            border: `1px solid ${localPerms.enabled ? rgba(BRAND.color.sheen, 0.3) : rgba(BRAND.color["text-muted"], 0.3)}`,
            borderRadius: 5,
            padding: "2px 8px",
            fontFamily: BRAND.font.mono,
            fontSize: 9,
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "0.05em",
          }}
        >
          {localPerms.enabled ? "ON" : "OFF"}
        </button>
      </div>

      <div style={{ maxHeight: 140, overflowY: "auto" }}>
        {TOOLS.map((tool) => (
          <div key={tool} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "3px 0",
          }}>
            <span style={{
              fontFamily: BRAND.font.mono,
              fontSize: 10,
              color: BRAND.color.white,
              opacity: 0.8,
            }}>
              {tool}
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              {(["allow", "deny", "requireConfirmation"] as const).map((list) => (
                <label key={list} style={{ cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={(localPerms[list] ?? []).includes(tool)}
                    onChange={() => toggle(tool, list)}
                    aria-label={`${list} ${tool}`}
                    style={{ accentColor: BRAND.color.sheen, width: 12, height: 12 }}
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { Canvas } from "@react-three/fiber";
import { BRAND } from "./lib/brand.js";
import { useGatewayState } from "./hooks/useGatewayState.js";
import { Orb } from "./components/Orb.js";
import { Header } from "./components/Header.js";
import { BrainView } from "./components/BrainView.js";
import { ActivityPanel } from "./components/ActivityPanel.js";
import { DiagnosticsPanel } from "./components/DiagnosticsPanel.js";
import { ToolPermissionsPanel } from "./components/ToolPermissionsPanel.js";
import { MemoryPanel } from "./components/MemoryPanel.js";
import { SuggestionsPanel } from "./components/SuggestionsPanel.js";
import { IntegrationsPanel } from "./components/IntegrationsPanel.js";
import { DelegationTimeline } from "./components/DelegationTimeline.js";
import { WorkflowManager } from "./components/WorkflowManager.js";
import { VoicePersonalityPanel } from "./components/VoicePersonalityPanel.js";
import { TriggerManagerPanel } from "./components/TriggerManagerPanel.js";

export function App() {
  const state = useGatewayState();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const handleInterrupt = () => {
    (state as any).interrupt?.();
  };

  const handleConsolidate = async () => {
    try {
      await fetch("/api/memory/consolidate", { method: "POST" });
    } catch {}
  };

  const connectionState = state.connected ? "connected" : "disconnected";
  const isActive = state.pipelineState !== "idle";

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 320px",
      gridTemplateRows: "48px 1fr",
      height: "100vh",
      background: BRAND.color.bg,
      color: BRAND.color.white,
      fontFamily: BRAND.font.body,
    }}>
      <Header
        connectionState={connectionState}
        pipelineState={state.pipelineState}
        uptime={state.uptime}
      />

      {/* Left column: Orb + Brain + Timeline */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
        {/* Orb + Memory Graph overlay */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Orb centered */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 200,
            height: 200,
            zIndex: 2,
            pointerEvents: "none",
          }}>
            <Canvas camera={{ position: [0, 0, 2], fov: 45 }}>
              <Orb active={isActive} />
            </Canvas>
          </div>

          {/* Memory graph behind Orb */}
          <BrainView
            memoryNodes={state.memoryNodes}
            pipelineState={state.pipelineState}
            streamingText={state.streamingText ?? ""}
            partialTranscript={state.partialTranscript ?? ""}
            connectionState={connectionState}
            activeNodes={state.activeNodes}
            onNodeClick={setSelectedNodeId}
          />

          {/* Pipeline state label */}
          {state.pipelineState !== "idle" && (
            <div style={{
              position: "absolute",
              bottom: 20,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: BRAND.font.mono,
              fontSize: 11,
              color: BRAND.color.sheen,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              animation: "sheenPulse 2s ease-in-out infinite",
              textShadow: "0 0 20px rgba(124,140,255,0.4)",
            }}>
              {state.pipelineState === "processing" ? "thinking" : state.pipelineState}
            </div>
          )}

          {/* Partial transcript */}
          {state.partialTranscript && (
            <div style={{
              position: "absolute",
              bottom: 48,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(5,5,7,0.8)",
              backdropFilter: "blur(12px)",
              border: `1px solid ${BRAND.color["glass-border"]}`,
              borderRadius: 8,
              padding: "6px 14px",
              fontFamily: BRAND.font.mono,
              fontSize: 12,
              color: BRAND.color.sheen,
              maxWidth: "80%",
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
            }}>
              <span style={{ opacity: 0.4, marginRight: 6 }}>hearing:</span>
              {state.partialTranscript}
              <span style={{ animation: "blink 1s infinite", marginLeft: 2 }}>|</span>
            </div>
          )}

          {/* Streaming response */}
          {state.streamingText && (
            <div style={{
              position: "absolute",
              bottom: 80,
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(5,5,7,0.8)",
              backdropFilter: "blur(12px)",
              border: `1px solid rgba(124,140,255,0.15)`,
              borderRadius: 8,
              padding: "6px 14px",
              fontFamily: BRAND.font.body,
              fontSize: 12,
              color: BRAND.color.white,
              maxWidth: "80%",
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
            }}>
              {state.streamingText}
              <span style={{ animation: "blink 1s infinite", marginLeft: 2, color: BRAND.color.sheen }}>|</span>
            </div>
          )}
        </div>

        <DelegationTimeline events={state.delegationEvents} />
      </div>

      {/* Right sidebar — glassmorphic panels */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderLeft: `1px solid ${BRAND.color.border}`,
        background: "rgba(13,15,18,0.3)",
      }}>
        <ActivityPanel
          activityLog={state.activityLog}
          onInterrupt={handleInterrupt}
          pipelineState={state.pipelineState}
        />
        <DiagnosticsPanel
          cost={state.cost}
          memoryStats={state.memoryStats}
        />
        <ToolPermissionsPanel
          permissions={state.toolPermissions}
        />
        <MemoryPanel
          nodes={state.memoryNodes}
          stats={state.memoryStats}
          onConsolidate={handleConsolidate}
        />
        <SuggestionsPanel />
        <IntegrationsPanel />
        <WorkflowManager />
        <VoicePersonalityPanel />
        <TriggerManagerPanel />
      </div>
    </div>
  );
}

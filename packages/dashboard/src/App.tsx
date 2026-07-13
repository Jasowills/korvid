import { useState } from "react";
import { BRAND } from "./lib/brand.js";
import { useGatewayState } from "./hooks/useGatewayState.js";
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

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 340px",
      gridTemplateRows: "56px 1fr",
      height: "100vh",
      background: BRAND.color.obsidian,
      color: BRAND.color.bone,
      fontFamily: BRAND.font.body,
    }}>
      <Header
        connectionState={connectionState}
        pipelineState={state.pipelineState}
        uptime={state.uptime}
      />

      {/* Left column: Brain + Timeline */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <BrainView
          memoryNodes={state.memoryNodes}
          pipelineState={state.pipelineState}
          streamingText={state.streamingText ?? ""}
          partialTranscript={state.partialTranscript ?? ""}
          connectionState={connectionState}
          activeNodes={state.activeNodes}
          onNodeClick={setSelectedNodeId}
        />
        <DelegationTimeline events={state.delegationEvents} />
      </div>

      {/* Right sidebar */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        borderLeft: `1px solid ${BRAND.color.slate}`,
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

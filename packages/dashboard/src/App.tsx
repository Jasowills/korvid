import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { BRAND, rgba } from "./lib/brand.js";
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
import { VisualizationPanel } from "./components/VisualizationPanel.js";

const PANEL_STYLE: React.CSSProperties = {
  background: "rgba(13,15,18,0.5)",
  backdropFilter: "blur(20px) saturate(1.3)",
  WebkitBackdropFilter: "blur(20px) saturate(1.3)",
  border: `1px solid ${BRAND.color["glass-border"]}`,
  borderRadius: 10,
  padding: "12px 14px",
  margin: "0 10px 8px 10px",
};

export function App() {
  const state = useGatewayState();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [bootSoundPlayed, setBootSoundPlayed] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (state.connected && !bootSoundPlayed) {
      setBootSoundPlayed(true);
      playBootSound();
    }
  }, [state.connected, bootSoundPlayed]);

  function playBootSound() {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const now = ctx.currentTime;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(200, now);
      osc1.frequency.exponentialRampToValueAtTime(800, now + 0.3);
      gain1.gain.setValueAtTime(0.08, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.4);

      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "square";
      osc2.frequency.setValueAtTime(1200, now + 0.15);
      gain2.gain.setValueAtTime(0.04, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.25);

      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = "sine";
      osc3.frequency.setValueAtTime(1047, now + 0.25);
      gain3.gain.setValueAtTime(0.06, now + 0.25);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc3.connect(gain3).connect(ctx.destination);
      osc3.start(now + 0.25);
      osc3.stop(now + 0.6);

      const osc4 = ctx.createOscillator();
      const gain4 = ctx.createGain();
      osc4.type = "sine";
      osc4.frequency.setValueAtTime(1319, now + 0.35);
      gain4.gain.setValueAtTime(0.04, now + 0.35);
      gain4.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc4.connect(gain4).connect(ctx.destination);
      osc4.start(now + 0.35);
      osc4.stop(now + 0.7);
    } catch {}
  }

  function playClapSound() {
    try {
      const ctx = audioCtxRef.current ?? new AudioContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1047, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.15);
    } catch {}
  }

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
  const hasViz = state.viz && state.viz.type !== "clear";

  const prevStateRef = useRef(state.pipelineState);
  useEffect(() => {
    if (state.pipelineState === "listening" && prevStateRef.current !== "listening") {
      playClapSound();
    }
    prevStateRef.current = state.pipelineState;
  }, [state.pipelineState]);

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr 340px",
      gridTemplateRows: "52px 1fr",
      height: "100vh",
      background: BRAND.color.bg,
      color: BRAND.color.white,
      fontFamily: BRAND.font.body,
      overflow: "hidden",
    }}>
      <Header
        connectionState={connectionState}
        pipelineState={state.pipelineState}
        uptime={state.uptime}
      />

      {/* Left column: Orb + Brain + Timeline */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        position: "relative",
        borderRight: `1px solid ${BRAND.color.border}`,
      }}>
        {/* Orb + Memory Graph overlay */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          {/* Ambient background glow */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: isActive
              ? `radial-gradient(circle, ${rgba(BRAND.color.sheen, 0.06)} 0%, transparent 70%)`
              : `radial-gradient(circle, ${rgba(BRAND.color.sheen, 0.02)} 0%, transparent 70%)`,
            transition: "background 0.8s ease",
            pointerEvents: "none",
            zIndex: 0,
          }} />

          {/* Orb centered */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 220,
            height: 220,
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

          {/* Visualization overlay */}
          {hasViz && (
            <VisualizationPanel
              viz={state.viz}
              onClose={() => {
                try {
                  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
                  const host = window.location.hostname || "127.0.0.1";
                  const ws = new WebSocket(`${protocol}//${host}:3847`);
                  ws.onopen = () => {
                    ws.send(JSON.stringify({ type: "subscribe" }));
                    ws.send(JSON.stringify({ type: "visualize", viz: { type: "clear" } }));
                    ws.close();
                  };
                } catch {}
              }}
            />
          )}

          {/* Pipeline state label */}
          {state.pipelineState !== "idle" && (
            <div style={{
              position: "absolute",
              bottom: 24,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: BRAND.font.mono,
              fontSize: 11,
              fontWeight: 500,
              color: BRAND.color.sheen,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              animation: "sheenPulse 2s ease-in-out infinite",
              textShadow: `0 0 24px ${rgba(BRAND.color.sheen, 0.4)}`,
              padding: "4px 12px",
              borderRadius: 4,
              background: rgba(BRAND.color.sheen, 0.05),
            }}>
              {state.pipelineState === "processing" ? "thinking" : state.pipelineState}
            </div>
          )}

          {/* Partial transcript */}
          {state.partialTranscript && (
            <div style={{
              position: "absolute",
              bottom: 56,
              left: "50%",
              transform: "translateX(-50%)",
              background: rgba(BRAND.color.bg, 0.85),
              backdropFilter: "blur(16px)",
              border: `1px solid ${BRAND.color["glass-border"]}`,
              borderRadius: 10,
              padding: "8px 18px",
              fontFamily: BRAND.font.mono,
              fontSize: 13,
              color: BRAND.color.sheen,
              maxWidth: "80%",
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
              boxShadow: `0 4px 24px ${rgba(BRAND.color.sheen, 0.08)}`,
            }}>
              <span style={{ opacity: 0.35, marginRight: 6, fontSize: 11 }}>hearing</span>
              {state.partialTranscript}
              <span style={{ animation: "blink 1s infinite", marginLeft: 2, opacity: 0.5 }}>|</span>
            </div>
          )}

          {/* Streaming response */}
          {state.streamingText && (
            <div style={{
              position: "absolute",
              bottom: 96,
              left: "50%",
              transform: "translateX(-50%)",
              background: rgba(BRAND.color.bg, 0.85),
              backdropFilter: "blur(16px)",
              border: `1px solid ${rgba(BRAND.color.sheen, 0.12)}`,
              borderRadius: 10,
              padding: "8px 18px",
              fontFamily: BRAND.font.body,
              fontSize: 13,
              color: BRAND.color.white,
              maxWidth: "80%",
              textAlign: "center",
              animation: "fadeIn 0.2s ease-out",
              boxShadow: `0 4px 24px ${rgba(BRAND.color.sheen, 0.06)}`,
              lineHeight: 1.5,
            }}>
              {state.streamingText}
              <span style={{ animation: "blink 1s infinite", marginLeft: 2, color: BRAND.color.sheen, opacity: 0.6 }}>|</span>
            </div>
          )}
        </div>

        <DelegationTimeline events={state.delegationEvents} />
      </div>

      {/* Right sidebar */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: rgba(BRAND.color.surface, 0.3),
      }}>
        <div style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          paddingTop: 8,
          paddingBottom: 16,
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
    </div>
  );
}

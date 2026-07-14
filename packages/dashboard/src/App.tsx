import { useState, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import { BRAND, rgba } from "./lib/brand.js";
import { useGatewayState } from "./hooks/useGatewayState.js";
import { Orb } from "./components/Orb.js";
import { Header } from "./components/Header.js";
import { BrainView } from "./components/BrainView.js";
import { Greeting } from "./components/Greeting.js";
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

export function App() {
  const state = useGatewayState();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [audioReady, setAudioReady] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const pendingBootSound = useRef(false);

  useEffect(() => {
    const initAudio = () => {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContext();
        setAudioReady(true);
      }
    };
    document.addEventListener("click", initAudio, { once: true });
    document.addEventListener("keydown", initAudio, { once: true });
    return () => {
      document.removeEventListener("click", initAudio);
      document.removeEventListener("keydown", initAudio);
    };
  }, []);

  useEffect(() => {
    if (state.connected && audioReady && !pendingBootSound.current) {
      pendingBootSound.current = true;
      playBootSound();
    }
  }, [state.connected, audioReady]);

  function playBootSound() {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
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
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
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
      display: "flex",
      flexDirection: "column",
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

      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1fr 320px",
        overflow: "hidden",
      }}>
        {/* Left: Orb + Brain */}
        <div style={{
          position: "relative",
          overflow: "hidden",
          borderRight: `1px solid ${BRAND.color["glass-border"]}`,
        }}>
          {/* Ambient void glow */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: isActive
              ? `radial-gradient(circle, ${rgba(BRAND.color.sheen, 0.1)} 0%, ${rgba(BRAND.color.sheen, 0.04)} 30%, transparent 60%)`
              : `radial-gradient(circle, ${rgba(BRAND.color.sheen, 0.03)} 0%, transparent 50%)`,
            transition: "background 1.5s ease",
            pointerEvents: "none",
            zIndex: 0,
            animation: isActive ? "orbGlowActive 4s ease-in-out infinite" : "orbGlow 8s ease-in-out infinite",
          }} />

          {/* Brain particles (behind Orb) */}
          <BrainView
            memoryNodes={state.memoryNodes}
            pipelineState={state.pipelineState}
            streamingText={state.streamingText ?? ""}
            partialTranscript={state.partialTranscript ?? ""}
            connectionState={connectionState}
            activeNodes={state.activeNodes}
            onNodeClick={setSelectedNodeId}
          />

          {/* Orb centered */}
          <div style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 320,
            height: 320,
            zIndex: 2,
            pointerEvents: "none",
            animation: "float 10s ease-in-out infinite",
          }}>
            <Canvas camera={{ position: [0, 0, 2.4], fov: 38 }}>
              <Orb active={isActive} />
            </Canvas>
          </div>

          {/* Greeting overlay */}
          <Greeting connected={state.connected} />

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

          {/* Pipeline state indicator */}
          {state.pipelineState !== "idle" && (
            <div style={{
              position: "absolute",
              bottom: 32,
              left: "50%",
              transform: "translateX(-50%)",
              fontFamily: BRAND.font.mono,
              fontSize: 11,
              fontWeight: 500,
              color: BRAND.color.sheen,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              animation: "sheenPulse 2s ease-in-out infinite",
              textShadow: `0 0 20px ${rgba(BRAND.color.sheen, 0.5)}`,
              padding: "6px 16px",
              borderRadius: 4,
              background: rgba(BRAND.color.sheen, 0.06),
              border: `1px solid ${rgba(BRAND.color.sheen, 0.12)}`,
              backdropFilter: "blur(12px)",
            }}>
              {state.pipelineState === "processing" ? "thinking" : state.pipelineState}
            </div>
          )}

          {/* Partial transcript */}
          {state.partialTranscript && (
            <div style={{
              position: "absolute",
              bottom: 72,
              left: "50%",
              transform: "translateX(-50%)",
              background: rgba(BRAND.color.bg, 0.9),
              backdropFilter: "blur(20px)",
              border: `1px solid ${rgba(BRAND.color.sheen, 0.15)}`,
              borderRadius: 8,
              padding: "8px 20px",
              fontFamily: BRAND.font.mono,
              fontSize: 13,
              color: BRAND.color.sheen,
              maxWidth: "70%",
              textAlign: "center",
              animation: "fadeIn 0.15s ease-out",
              boxShadow: `0 0 30px ${rgba(BRAND.color.sheen, 0.1)}`,
            }}>
              <span style={{ opacity: 0.4, marginRight: 8, fontSize: 10 }}>listening</span>
              {state.partialTranscript}
              <span style={{ animation: "blink 1s infinite", marginLeft: 2, opacity: 0.5 }}>|</span>
            </div>
          )}

          {/* Streaming response */}
          {state.streamingText && (
            <div style={{
              position: "absolute",
              bottom: 112,
              left: "50%",
              transform: "translateX(-50%)",
              background: rgba(BRAND.color.bg, 0.9),
              backdropFilter: "blur(20px)",
              border: `1px solid ${rgba(BRAND.color.sheen, 0.1)}`,
              borderRadius: 8,
              padding: "10px 22px",
              fontFamily: BRAND.font.body,
              fontSize: 14,
              color: BRAND.color.white,
              maxWidth: "70%",
              textAlign: "center",
              animation: "fadeIn 0.15s ease-out",
              boxShadow: `0 0 40px ${rgba(BRAND.color.sheen, 0.08)}`,
              lineHeight: 1.6,
            }}>
              {state.streamingText}
              <span style={{ animation: "blink 1s infinite", marginLeft: 2, color: BRAND.color.sheen, opacity: 0.6 }}>|</span>
            </div>
          )}

          {/* Delegation timeline at bottom */}
          <DelegationTimeline events={state.delegationEvents} />
        </div>

        {/* Right: Command panels */}
        <div style={{
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          background: rgba(BRAND.color.surface, 0.2),
        }}>
          <div style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            padding: "8px 0",
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
    </div>
  );
}

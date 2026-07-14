import { useState, useEffect, useRef, useCallback } from "react";
import { type GatewayState, EMPTY_STATE } from "../lib/types.js";

const INITIAL_RECONNECT_DELAY = 1000;
const MAX_RECONNECT_DELAY = 30000;

export function useGatewayState(): GatewayState {
  const [state, setState] = useState<GatewayState>(EMPTY_STATE);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectAttempts = useRef(0);

  const connect = useCallback(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname || "127.0.0.1";
    const port = 3847;
    const url = `${protocol}//${host}:${port}`;

    let ws: WebSocket;
    try {
      ws = new WebSocket(url);
    } catch {
      scheduleReconnect();
      return;
    }
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = INITIAL_RECONNECT_DELAY;
      reconnectAttempts.current = 0;
      setState((s) => ({ ...s, connected: true }));
      ws.send(JSON.stringify({ type: "subscribe" }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "state") {
          setState((s) => ({ ...s, ...msg.payload, streamingText: undefined, streamingDone: false }));
        } else if (msg.type === "activity") {
          setState((s) => ({
            ...s,
            activityLog: [msg.entry, ...s.activityLog].slice(0, 100),
          }));
        } else if (msg.type === "pipeline") {
          setState((s) => ({ ...s, pipelineState: msg.state }));
        } else if (msg.type === "cost") {
          setState((s) => ({ ...s, cost: msg.cost }));
        } else if (msg.type === "nodes") {
          setState((s) => ({ ...s, memoryNodes: msg.nodes }));
        } else if (msg.type === "tool") {
          setState((s) => ({
            ...s,
            tools: updateTool(s.tools, msg.tool),
          }));
        } else if (msg.type === "delegation_event") {
          setState((s) => ({
            ...s,
            delegationEvents: [msg.event, ...s.delegationEvents].slice(0, 50),
          }));
        } else if (msg.type === "memory_update") {
          setState((s) => ({ ...s, memoryNodes: msg.nodes, memoryStats: msg.stats ?? s.memoryStats }));
        } else if (msg.type === "partial_transcript") {
          setState((s) => ({ ...s, partialTranscript: msg.text }));
        } else if (msg.type === "streaming_token") {
          setState((s) => {
            const prev = s.streamingText ?? "";
            return {
              ...s,
              streamingText: prev + msg.token,
              streamingDone: !!msg.done,
            };
          });
        } else if (msg.type === "tool_permissions") {
          setState((s) => ({ ...s, toolPermissions: msg.permissions }));
        } else if (msg.type === "visualize") {
          setState((s) => ({ ...s, viz: msg.viz ?? null }));
        }
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setState((s) => ({ ...s, connected: false, partialTranscript: undefined }));
      scheduleReconnect();
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  function scheduleReconnect() {
    if (reconnectTimer.current) clearTimeout(reconnectTimer.current);

    const delay = reconnectDelay.current;
    const jitter = delay * 0.2 * Math.random();
    const nextDelay = Math.min(delay + jitter, MAX_RECONNECT_DELAY);

    reconnectTimer.current = setTimeout(() => {
      reconnectAttempts.current++;
      reconnectDelay.current = nextDelay;
      connect();
    }, delay);
  }

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      reconnectAttempts.current = 0;
      wsRef.current?.close();
    };
  }, [connect]);

  const sendInterrupt = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "interrupt" }));
    }
  }, []);

  useEffect(() => {
    (state as any).interrupt = sendInterrupt;
  }, [state, sendInterrupt]);

  return state;
}

function updateTool(existing: any[], tool: any): any[] {
  const idx = existing.findIndex((t) => t.id === tool.id);
  if (idx >= 0) {
    const updated = [...existing];
    updated[idx] = { ...updated[idx], ...tool };
    return updated;
  }
  return [...existing, tool].slice(-20);
}

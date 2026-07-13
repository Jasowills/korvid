import { useRef, useMemo, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { BRAND, rgba } from "../lib/brand.js";
import type { MemoryNode } from "../lib/types.js";

interface BrainViewProps {
  memoryNodes: MemoryNode[];
  pipelineState: string;
  streamingText: string;
  partialTranscript: string;
  connectionState: string;
  activeNodes: string[];
  onNodeClick?: (nodeId: string) => void;
}

const NODE_COLORS: Record<string, string> = {
  fact: BRAND.color.sheen,
  episodic: "#9F7AEA",
  project: "#48BB78",
  tool: "#ED8936",
  tag: "#63B3ED",
};

function GraphNode({
  node,
  isActive,
  onClick,
}: {
  node: MemoryNode;
  isActive: boolean;
  onClick?: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = NODE_COLORS[node.type] ?? BRAND.color.sheen;
  const prefersReducedMotion = useMemo(() => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current || prefersReducedMotion) return;
    const t = clock.getElapsedTime();
    if (isActive) {
      meshRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
    } else {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <group position={[node.x ?? 0, node.y ?? 0, node.z ?? 0]}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      >
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive ? color : "#000000"}
          emissiveIntensity={isActive ? 0.8 : 0}
          transparent
          opacity={isActive ? 1 : 0.7}
        />
      </mesh>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.15}
        color={BRAND.color.bone}
        anchorX="center"
        anchorY="bottom"
        font={BRAND.font.mono}
        maxWidth={2}
      >
        {node.label?.slice(0, 20) ?? node.id}
      </Text>
    </group>
  );
}

function GraphEdges({ nodes }: { nodes: MemoryNode[] }) {
  const edges = useMemo(() => {
    const result: { from: MemoryNode; to: MemoryNode }[] = [];
    for (const node of nodes) {
      if (!node.connections) continue;
      for (const connId of node.connections) {
        const target = nodes.find((n) => n.id === connId);
        if (target) result.push({ from: node, to: target });
      }
    }
    return result;
  }, [nodes]);

  return (
    <>
      {edges.map((edge, i) => (
        <Line
          key={`edge-${i}`}
          points={[
            [edge.from.x ?? 0, edge.from.y ?? 0, edge.from.z ?? 0],
            [edge.to.x ?? 0, edge.to.y ?? 0, edge.to.z ?? 0],
          ]}
          color={BRAND.color.slate}
          lineWidth={1}
          transparent
          opacity={0.4}
        />
      ))}
    </>
  );
}

function ThinkingParticles() {
  const groupRef = useRef<THREE.Group>(null);
  const count = 20;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    const geo = groupRef.current.children[0] as THREE.Points;
    if (geo?.geometry) {
      const posAttr = geo.geometry.getAttribute("position") as THREE.BufferAttribute;
      for (let i = 0; i < count; i++) {
        posAttr.array[i * 3 + 1] += Math.sin(t + i) * 0.002;
      }
      posAttr.needsUpdate = true;
    }
  });

  return (
    <group ref={groupRef}>
      <points>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[positions, 3]}
            array={positions}
            count={count}
            itemSize={3}
          />
        </bufferGeometry>
        <pointsMaterial
          color={BRAND.color.sheen}
          size={0.05}
          transparent
          opacity={0.6}
          sizeAttenuation
        />
      </points>
    </group>
  );
}

function Scene({
  memoryNodes,
  pipelineState,
  activeNodes,
  onNodeClick,
}: {
  memoryNodes: MemoryNode[];
  pipelineState: string;
  activeNodes: string[];
  onNodeClick?: (nodeId: string) => void;
}) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.8} />
      <GraphEdges nodes={memoryNodes} />
      {memoryNodes.map((node) => (
        <GraphNode
          key={node.id}
          node={node}
          isActive={activeNodes.includes(node.id)}
          onClick={() => onNodeClick?.(node.id)}
        />
      ))}
      {pipelineState === "processing" && <ThinkingParticles />}
      <OrbitControls
        enableDamping
        dampingFactor={0.1}
        maxDistance={20}
        minDistance={3}
      />
    </>
  );
}

export function BrainView({
  memoryNodes,
  pipelineState,
  streamingText,
  partialTranscript,
  connectionState,
  activeNodes,
  onNodeClick,
}: BrainViewProps) {
  const prefersReducedMotion = useMemo(() => {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: BRAND.color.obsidian }}
      >
        <Scene
          memoryNodes={memoryNodes}
          pipelineState={pipelineState}
          activeNodes={activeNodes}
          onNodeClick={onNodeClick}
        />
      </Canvas>

      {/* Header bar */}
      <div style={{
        position: "absolute",
        top: 12,
        left: 16,
        right: 16,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        pointerEvents: "none",
      }}>
        <div style={{
          fontFamily: BRAND.font.mono,
          fontSize: 11,
          color: BRAND.color.slate,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
        }}>
          memory graph
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 11, fontFamily: BRAND.font.mono }}>
          {Object.entries(NODE_COLORS).map(([type, color]) => (
            <span key={type} style={{ color: BRAND.color.slate, display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
              {type}
            </span>
          ))}
        </div>
      </div>

      {/* Connection dot */}
      <div style={{
        position: "absolute",
        top: 12,
        right: 16,
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: connectionState === "connected" ? BRAND.color.sheen : BRAND.color.ember,
        animation: connectionState === "connected" ? `sheenPulse ${BRAND.motion.sheenPulse}` : "none",
      }} />

      {/* Partial transcript overlay */}
      {partialTranscript && (
        <div style={{
          position: "absolute",
          bottom: 60,
          left: "50%",
          transform: "translateX(-50%)",
          background: rgba(BRAND.color.obsidian, 0.85),
          border: `1px solid ${BRAND.color.slate}`,
          borderRadius: 8,
          padding: "8px 16px",
          fontFamily: BRAND.font.mono,
          fontSize: 13,
          color: BRAND.color.sheen,
          maxWidth: "80%",
          textAlign: "center",
          animation: "fadeIn 0.2s ease-out",
        }}>
          <span style={{ opacity: 0.5, marginRight: 6 }}>hearing:</span>
          {partialTranscript}
          <span style={{ animation: "blink 1s infinite", marginLeft: 2 }}>|</span>
        </div>
      )}

      {/* Streaming response overlay */}
      {streamingText && (
        <div style={{
          position: "absolute",
          bottom: 16,
          left: "50%",
          transform: "translateX(-50%)",
          background: rgba(BRAND.color.obsidian, 0.85),
          border: `1px solid ${BRAND.color.sheen}`,
          borderRadius: 8,
          padding: "8px 16px",
          fontFamily: BRAND.font.body,
          fontSize: 13,
          color: BRAND.color.bone,
          maxWidth: "80%",
          textAlign: "center",
          animation: "fadeIn 0.2s ease-out",
        }}>
          {streamingText}
          <span style={{ animation: "blink 1s infinite", marginLeft: 2, color: BRAND.color.sheen }}>|</span>
        </div>
      )}

      {/* Pipeline state overlay */}
      {pipelineState !== "idle" && (
        <div style={{
          position: "absolute",
          top: 40,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: BRAND.font.mono,
          fontSize: 11,
          color: BRAND.color.sheen,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.7,
          animation: `sheenPulse ${BRAND.motion.sheenPulse}`,
        }}>
          {pipelineState === "processing" ? "thinking" : pipelineState}
        </div>
      )}
    </div>
  );
}

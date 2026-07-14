import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import * as THREE from "three";
import { BRAND } from "../lib/brand.js";
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

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
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
          opacity={isActive ? 1 : 0.6}
        />
      </mesh>
      <Text
        position={[0, 0.5, 0]}
        fontSize={0.12}
        color={BRAND.color.white}
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
          color={BRAND.color.border}
          lineWidth={1}
          transparent
          opacity={0.3}
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
          size={0.04}
          transparent
          opacity={0.5}
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
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
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
  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: BRAND.color.bg }}
      >
        <Scene
          memoryNodes={memoryNodes}
          pipelineState={pipelineState}
          activeNodes={activeNodes}
          onNodeClick={onNodeClick}
        />
      </Canvas>

      {/* Legend */}
      <div style={{
        position: "absolute",
        top: 12,
        right: 16,
        display: "flex",
        gap: 10,
        fontSize: 10,
        fontFamily: BRAND.font.mono,
        color: BRAND.color["text-muted"],
      }}>
        {Object.entries(NODE_COLORS).map(([type, color]) => (
          <span key={type} style={{ display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, display: "inline-block" }} />
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}

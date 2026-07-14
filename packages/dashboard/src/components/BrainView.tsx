import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Text, Line } from "@react-three/drei";
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
    const float = Math.sin(t * 0.8 + (node.x ?? 0) * 2) * 0.05;
    meshRef.current.position.y = (node.y ?? 0) + float;
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
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={isActive ? color : "#000000"}
          emissiveIntensity={isActive ? 1.2 : 0}
          transparent
          opacity={isActive ? 1 : 0.5}
        />
      </mesh>
      <Text
        position={[0, 0.3, 0]}
        fontSize={0.08}
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
          color={BRAND.color.sheen}
          lineWidth={1}
          transparent
          opacity={0.2}
        />
      ))}
    </>
  );
}

function AmbientParticles({ count = 40 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<any[]>([]);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      x: (Math.random() - 0.5) * 12,
      y: (Math.random() - 0.5) * 8,
      z: (Math.random() - 0.5) * 6 - 2,
      speed: 0.1 + Math.random() * 0.3,
      phase: Math.random() * Math.PI * 2,
      size: 0.02 + Math.random() * 0.03,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      mesh.position.x = p.x + Math.sin(t * p.speed + p.phase) * 0.3;
      mesh.position.y = p.y + Math.cos(t * p.speed * 0.7 + p.phase) * 0.2;
      mesh.position.z = p.z + Math.sin(t * p.speed * 0.5 + p.phase * 2) * 0.1;
      const m = mesh.material as THREE.MeshBasicMaterial;
      m.opacity = 0.15 + Math.sin(t * 1.5 + p.phase) * 0.1;
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
          position={[p.x, p.y, p.z]}
        >
          <sphereGeometry args={[p.size, 8, 8]} />
          <meshBasicMaterial
            color={BRAND.color.sheen}
            transparent
            opacity={0.2}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function ThinkingParticles() {
  const groupRef = useRef<THREE.Group>(null);
  const count = 30;
  const meshRefs = useRef<any[]>([]);

  const particles = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      angle: (i / count) * Math.PI * 2,
      radius: 1.5 + Math.random() * 0.5,
      speed: 0.5 + Math.random() * 0.5,
      y: (Math.random() - 0.5) * 2,
    }));
  }, [count]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    particles.forEach((p, i) => {
      const mesh = meshRefs.current[i];
      if (!mesh) return;
      const angle = p.angle + t * p.speed;
      mesh.position.x = Math.cos(angle) * p.radius;
      mesh.position.z = Math.sin(angle) * p.radius;
      mesh.position.y = p.y + Math.sin(t * 2 + i) * 0.3;
      const m = mesh.material as THREE.MeshBasicMaterial;
      m.opacity = 0.3 + Math.sin(t * 3 + i) * 0.2;
    });
  });

  return (
    <group ref={groupRef}>
      {particles.map((p, i) => (
        <mesh
          key={i}
          ref={(el) => { if (el) meshRefs.current[i] = el; }}
        >
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial
            color={BRAND.color.sheen}
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      ))}
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
      <ambientLight intensity={0.15} />
      <pointLight position={[5, 5, 5]} intensity={0.3} color={BRAND.color.sheen} />

      <AmbientParticles count={memoryNodes.length > 0 ? 20 : 40} />

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
    <div style={{
      position: "absolute",
      inset: 0,
      overflow: "hidden",
      pointerEvents: "none",
    }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene
          memoryNodes={memoryNodes}
          pipelineState={pipelineState}
          activeNodes={activeNodes}
          onNodeClick={onNodeClick}
        />
      </Canvas>

      {/* Legend */}
      {memoryNodes.length > 0 && (
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
      )}
    </div>
  );
}

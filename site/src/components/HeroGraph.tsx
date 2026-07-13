import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const SHEEN = '#7C8CFF'
const SLATE = '#2A3138'
const OBSIDIAN = '#12151A'

interface NodeData {
  id: string
  pos: [number, number, number]
  color: string
  size: number
}

function generateNodes(): NodeData[] {
  const count = 24
  const nodes: NodeData[] = []
  const spread = 5

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2
    const phi = Math.acos(2 * ((i + 0.5) / count) - 1)
    const r = spread * (0.5 + Math.random() * 0.5)

    nodes.push({
      id: `n-${i}`,
      pos: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      color: i % 5 === 0 ? SHEEN : SLATE,
      size: i % 5 === 0 ? 0.12 : 0.06 + Math.random() * 0.04,
    })
  }
  return nodes
}

function generateEdges(nodes: NodeData[]): { from: number; to: number }[] {
  const edges: { from: number; to: number }[] = []
  for (let i = 0; i < nodes.length; i++) {
    const connectionCount = 1 + Math.floor(Math.random() * 2)
    for (let c = 0; c < connectionCount; c++) {
      const j = (i + 1 + Math.floor(Math.random() * 6)) % nodes.length
      if (i !== j) edges.push({ from: i, to: j })
    }
  }
  return edges
}

function GraphNode({ node, pulsePhase }: { node: NodeData; pulsePhase: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const isSheen = node.color === SHEEN

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const drift = Math.sin(t * 0.3 + pulsePhase) * 0.02
    ref.current.position.set(
      node.pos[0] + drift,
      node.pos[1] + Math.cos(t * 0.2 + pulsePhase) * 0.015,
      node.pos[2] + Math.sin(t * 0.25 + pulsePhase) * 0.01,
    )
    if (isSheen) {
      const pulse = 0.4 + Math.sin(t * 0.8 + pulsePhase) * 0.3
      ref.current.scale.setScalar(1 + pulse * 0.3)
      const mat = ref.current.material as THREE.MeshStandardMaterial
      mat.emissiveIntensity = pulse
    }
  })

  return (
    <mesh ref={ref} position={node.pos}>
      <sphereGeometry args={[node.size, 12, 12]} />
      <meshStandardMaterial
        color={node.color}
        emissive={isSheen ? SHEEN : '#000000'}
        emissiveIntensity={isSheen ? 0.5 : 0}
        transparent
        opacity={isSheen ? 0.9 : 0.5}
      />
    </mesh>
  )
}

function GraphEdges({ nodes, edges }: { nodes: NodeData[]; edges: { from: number; to: number }[] }) {
  const lines = useMemo(() => {
    return edges.map((e, i) => {
      const a = nodes[e.from]
      const b = nodes[e.to]
      return new Float32Array([
        a.pos[0], a.pos[1], a.pos[2],
        b.pos[0], b.pos[1], b.pos[2],
      ])
    })
  }, [nodes, edges])

  return (
    <group>
      {lines.map((pts, i) => (
        <line key={i}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              args={[pts, 3]}
              array={pts}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color={SLATE} transparent opacity={0.2} />
        </line>
      ))}
    </group>
  )
}

function Scene() {
  const nodes = useMemo(() => generateNodes(), [])
  const edges = useMemo(() => generateEdges(nodes), [nodes])

  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[8, 8, 8]} intensity={0.4} color={SHEEN} />
      <pointLight position={[-8, -4, -6]} intensity={0.2} />
      <GraphEdges nodes={nodes} edges={edges} />
      {nodes.map((node, i) => (
        <GraphNode key={node.id} node={node} pulsePhase={i * 0.7} />
      ))}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.3}
        maxPolarAngle={Math.PI * 0.7}
        minPolarAngle={Math.PI * 0.3}
      />
    </>
  )
}

export function HeroGraph() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      opacity: visible ? 1 : 0,
      transition: 'opacity 1.5s ease-out',
      pointerEvents: 'none',
    }}>
      <Canvas
        camera={{ position: [0, 0, 10], fov: 45 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
      {/* Gradient vignette to blend graph edges into background */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse at center, transparent 30%, var(--color-obsidian) 75%)`,
        pointerEvents: 'none',
      }} />
    </div>
  )
}

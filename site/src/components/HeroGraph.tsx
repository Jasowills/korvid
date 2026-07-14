import { useRef, useMemo, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { Orb } from './Orb'

const SHEEN = new THREE.Color('#7C8CFF')
const DIM = new THREE.Color('#2A2E33')
const ASH = new THREE.Color('#555960')

interface GraphNode {
  pos: [number, number, number]
  label: string
  size: number
  accent: boolean
  phase: number
}

interface GraphEdge {
  from: number
  to: number
}

function buildGraph(): { nodes: GraphNode[]; edges: GraphEdge[] } {
  const labels = [
    'Documents', 'Projects', 'Notes', 'Calendar', 'Email',
    'WhatsApp', 'Telegram', 'Claude', 'GPT-4o', 'Gemini',
    'Ollama', 'Deepgram', 'ElevenLabs', 'Screenshots', 'Clipboard',
    'Terminal', 'Files', 'Memory', 'Voice', 'Tools',
    'Contacts', 'Photos', 'Music', 'Downloads', 'Desktop',
  ]
  const nodes: GraphNode[] = labels.map((label, i) => {
    const phi = Math.acos(1 - 2 * (i + 0.5) / labels.length)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    const r = 2.8 + (Math.random() - 0.5) * 1.2
    const accent = i % 5 === 0
    return {
      pos: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      label,
      size: accent ? 0.055 + Math.random() * 0.03 : 0.02 + Math.random() * 0.015,
      accent,
      phase: Math.random() * Math.PI * 2,
    }
  })

  const edges: GraphEdge[] = []
  for (let i = 0; i < nodes.length; i++) {
    const count = 1 + Math.floor(Math.random() * 2)
    for (let c = 0; c < count; c++) {
      const j = (i + 1 + Math.floor(Math.random() * 6)) % nodes.length
      if (i !== j) edges.push({ from: i, to: j })
    }
  }
  return { nodes, edges }
}

function GraphNodeMesh({ node, index, opacity }: { node: GraphNode; index: number; opacity: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const base = useMemo(() => new THREE.Vector3(...node.pos), [node.pos])

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return
    const t = clock.getElapsedTime()
    const drift = Math.sin(t * 0.12 + index * 0.4) * 0.012
    ref.current.position.set(base.x + drift, base.y + Math.cos(t * 0.08 + node.phase) * 0.008, base.z)
    ref.current.scale.setScalar(opacity)
    matRef.current.opacity = (node.accent ? 0.85 : 0.3) * opacity
    if (node.accent) {
      matRef.current.emissiveIntensity = (0.3 + Math.sin(t * 0.4 + node.phase) * 0.4) * opacity
    }
  })

  return (
    <mesh ref={ref} position={node.pos}>
      <sphereGeometry args={[node.size, 12, 12]} />
      <meshStandardMaterial
        ref={matRef}
        color={node.accent ? SHEEN : DIM}
        emissive={node.accent ? SHEEN : new THREE.Color('#000')}
        emissiveIntensity={node.accent ? 0.3 : 0}
        transparent
        opacity={0.3}
        roughness={0.3}
        metalness={0.1}
      />
    </mesh>
  )
}

function GraphEdges({ nodes, edges, opacity }: { nodes: GraphNode[]; edges: GraphEdge[]; opacity: number }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      const line = child as THREE.Line
      const mat = line.material as THREE.LineBasicMaterial
      mat.opacity = (0.04 + Math.sin(t * 0.15 + i * 0.3) * 0.02) * opacity
    })
  })

  return (
    <group ref={ref}>
      {edges.map(({ from, to }, i) => {
        const a = nodes[from]
        const b = nodes[to]
        const pts = new Float32Array([...a.pos, ...b.pos])
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute attach="attributes-position" args={[pts, 3]} array={pts} count={2} itemSize={3} />
            </bufferGeometry>
            <lineBasicMaterial color={ASH} transparent opacity={0.05} />
          </line>
        )
      })}
    </group>
  )
}

function CameraController({ scroll }: { scroll: number }) {
  const { camera } = useThree()
  useFrame(() => {
    const targetZ = 8 - scroll * 2.5
    const targetY = scroll * 1.2
    camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetZ, 0.035)
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, 0.035)
  })
  return null
}

function Scene({ scroll }: { scroll: number }) {
  const { nodes, edges } = useMemo(() => buildGraph(), [])
  const orbActive = scroll < 0.1
  const graphOpacity = Math.min(Math.max((scroll - 0.08) / 0.35, 0), 1)

  return (
    <>
      <ambientLight intensity={0.06} />
      <pointLight position={[4, 4, 4]} intensity={0.15} color={SHEEN} />
      <Orb active={orbActive} scale={1.1} />
      {graphOpacity > 0.01 && (
        <group>
          <GraphEdges nodes={nodes} edges={edges} opacity={graphOpacity} />
          {nodes.map((node, i) => (
            <GraphNodeMesh key={i} node={node} index={i} opacity={graphOpacity} />
          ))}
        </group>
      )}
      <CameraController scroll={scroll} />
    </>
  )
}

export function HeroScene() {
  const [scroll, setScroll] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const heroH = window.innerHeight
      setScroll(Math.min(window.scrollY / heroH, 1))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 8], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Scene scroll={scroll} />
      </Canvas>

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 55% 45% at 50% 50%, transparent 0%, rgba(10,12,15,0.5) 55%, var(--bg) 85%)',
      }} />
    </div>
  )
}

import { useRef, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const SHEEN = new THREE.Color('#7C8CFF')
const SPARK = new THREE.Color('#FFB648')
const SLATE = new THREE.Color('#2A3138')

interface NodeData {
  pos: [number, number, number]
  color: THREE.Color
  size: number
  phase: number
  orbitRadius: number
  orbitSpeed: number
}

function generateGraph(): { nodes: NodeData[]; edges: [number, number][] } {
  const nodes: NodeData[] = []
  const edges: [number, number][] = []
  const count = 36

  for (let i = 0; i < count; i++) {
    const isSheen = i % 6 === 0
    const isSpark = i % 9 === 0
    const phi = Math.acos(1 - 2 * (i + 0.5) / count)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    const r = 3.2 + (Math.random() - 0.5) * 1.8

    const color = isSpark ? SPARK : isSheen ? SHEEN : SLATE

    nodes.push({
      pos: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      color,
      size: (isSheen || isSpark) ? 0.09 + Math.random() * 0.06 : 0.025 + Math.random() * 0.03,
      phase: Math.random() * Math.PI * 2,
      orbitRadius: 0.015 + Math.random() * 0.025,
      orbitSpeed: 0.12 + Math.random() * 0.18,
    })
  }

  for (let i = 0; i < count; i++) {
    const connections = 1 + Math.floor(Math.random() * 2)
    for (let c = 0; c < connections; c++) {
      const j = (i + 1 + Math.floor(Math.random() * 5)) % count
      if (i !== j) edges.push([i, j])
    }
  }

  return { nodes, edges }
}

function LivingNode({ data, index }: { data: NodeData; index: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const matRef = useRef<THREE.MeshStandardMaterial>(null)
  const basePos = useMemo(() => new THREE.Vector3(...data.pos), [data.pos])
  const isAccent = data.color.equals(SHEEN) || data.color.equals(SPARK)

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return
    const t = clock.getElapsedTime()

    const drift = Math.sin(t * data.orbitSpeed + index * 0.3) * data.orbitRadius
    const drift2 = Math.cos(t * data.orbitSpeed * 0.7 + data.phase) * data.orbitRadius * 0.5

    ref.current.position.set(
      basePos.x + drift,
      basePos.y + drift2,
      basePos.z + Math.sin(t * 0.1 + index) * 0.008,
    )

    if (isAccent) {
      const pulse = 0.3 + Math.sin(t * 0.5 + data.phase) * 0.5
      matRef.current.emissiveIntensity = pulse
      ref.current.scale.setScalar(1 + pulse * 0.35)
    } else {
      const breathe = 0.88 + Math.sin(t * 0.18 + data.phase) * 0.12
      ref.current.scale.setScalar(breathe)
    }
  })

  return (
    <mesh ref={ref} position={data.pos}>
      <sphereGeometry args={[data.size, 14, 14]} />
      <meshStandardMaterial
        ref={matRef}
        color={data.color}
        emissive={isAccent ? data.color : new THREE.Color('#000000')}
        emissiveIntensity={isAccent ? 0.5 : 0}
        transparent
        opacity={isAccent ? 0.95 : 0.35}
        roughness={0.25}
        metalness={0.15}
      />
    </mesh>
  )
}

function LivingEdges({ nodes, edges }: { nodes: NodeData[]; edges: [number, number][] }) {
  const ref = useRef<THREE.Group>(null)

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    ref.current.children.forEach((child, i) => {
      const line = child as THREE.Line
      const mat = line.material as THREE.LineBasicMaterial
      mat.opacity = 0.06 + Math.sin(t * 0.25 + i * 0.4) * 0.04
    })
  })

  return (
    <group ref={ref}>
      {edges.map(([from, to], i) => {
        const a = nodes[from]
        const b = nodes[to]
        const points = new Float32Array([
          a.pos[0], a.pos[1], a.pos[2],
          b.pos[0], b.pos[1], b.pos[2],
        ])
        return (
          <line key={i}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                args={[points, 3]}
                array={points}
                count={2}
                itemSize={3}
              />
            </bufferGeometry>
            <lineBasicMaterial color={SLATE} transparent opacity={0.08} />
          </line>
        )
      })}
    </group>
  )
}

function AmbientParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 80

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 16
      pos[i * 3 + 1] = (Math.random() - 0.5) * 16
      pos[i * 3 + 2] = (Math.random() - 0.5) * 16
    }
    return pos
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const posAttr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3 + 1] += Math.sin(t * 0.12 + i) * 0.002
      posAttr.array[i * 3] += Math.cos(t * 0.08 + i * 0.5) * 0.0015
    }
    posAttr.needsUpdate = true
    ref.current.rotation.y = t * 0.015
  })

  return (
    <points ref={ref}>
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
        color={SHEEN}
        size={0.018}
        transparent
        opacity={0.25}
        sizeAttenuation
        depthWrite={false}
      />
    </points>
  )
}

function CameraRig() {
  const { camera } = useThree()
  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    camera.position.x = Math.sin(t * 0.04) * 0.25
    camera.position.y = Math.cos(t * 0.035) * 0.18
  })
  return null
}

function Scene() {
  const { nodes, edges } = useMemo(() => generateGraph(), [])
  return (
    <>
      <ambientLight intensity={0.12} />
      <pointLight position={[10, 10, 10]} intensity={0.35} color={SHEEN} />
      <pointLight position={[-8, -4, -6]} intensity={0.2} color={SPARK} />
      <pointLight position={[0, 0, 0]} intensity={0.08} color={SHEEN} distance={8} />
      <LivingEdges nodes={nodes} edges={edges} />
      {nodes.map((node, i) => (
        <LivingNode key={i} data={node} index={i} />
      ))}
      <AmbientParticles />
      <CameraRig />
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={0.12}
        maxPolarAngle={Math.PI * 0.65}
        minPolarAngle={Math.PI * 0.35}
      />
    </>
  )
}

export function HeroGraph() {
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>

      {/* Deep vignette */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse 65% 55% at 50% 50%, transparent 0%, rgba(18,21,26,0.3) 45%, var(--color-obsidian) 78%)`,
        pointerEvents: 'none',
      }} />

      {/* Sheen ambient glow — top left */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '20%',
        width: '45%',
        height: '55%',
        background: 'radial-gradient(ellipse at center, rgba(124,140,255,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'drift 18s ease-in-out infinite',
      }} />

      {/* Spark ambient glow — bottom right */}
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '15%',
        width: '35%',
        height: '45%',
        background: 'radial-gradient(ellipse at center, rgba(255,182,72,0.04) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'drift 22s ease-in-out infinite reverse',
      }} />
    </div>
  )
}

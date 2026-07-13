import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

const SHEEN = new THREE.Color('#7C8CFF')
const SLATE = new THREE.Color('#2A3138')
const EMBER = new THREE.Color('#FF6B4A')

interface NodeData {
  pos: [number, number, number]
  isSheen: boolean
  size: number
  phase: number
  orbitRadius: number
  orbitSpeed: number
  orbitOffset: number
}

function generateGraph(): { nodes: NodeData[]; edges: [number, number][] } {
  const nodes: NodeData[] = []
  const edges: [number, number][] = []
  const count = 32

  for (let i = 0; i < count; i++) {
    const isSheen = i % 7 === 0
    const phi = Math.acos(1 - 2 * (i + 0.5) / count)
    const theta = Math.PI * (1 + Math.sqrt(5)) * i
    const r = 3.5 + (Math.random() - 0.5) * 1.5

    nodes.push({
      pos: [
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      ],
      isSheen,
      size: isSheen ? 0.1 + Math.random() * 0.06 : 0.03 + Math.random() * 0.03,
      phase: Math.random() * Math.PI * 2,
      orbitRadius: 0.02 + Math.random() * 0.03,
      orbitSpeed: 0.15 + Math.random() * 0.2,
      orbitOffset: i * 0.3,
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

  useFrame(({ clock }) => {
    if (!ref.current || !matRef.current) return
    const t = clock.getElapsedTime()

    const drift = Math.sin(t * data.orbitSpeed + data.orbitOffset) * data.orbitRadius
    const drift2 = Math.cos(t * data.orbitSpeed * 0.7 + data.phase) * data.orbitRadius * 0.5

    ref.current.position.set(
      basePos.x + drift,
      basePos.y + drift2,
      basePos.z + Math.sin(t * 0.1 + index) * 0.01,
    )

    if (data.isSheen) {
      const pulse = 0.3 + Math.sin(t * 0.6 + data.phase) * 0.4
      matRef.current.emissiveIntensity = pulse
      ref.current.scale.setScalar(1 + pulse * 0.4)
    } else {
      const breathe = 0.85 + Math.sin(t * 0.2 + data.phase) * 0.15
      ref.current.scale.setScalar(breathe)
    }
  })

  const color = data.isSheen ? SHEEN : SLATE

  return (
    <mesh ref={ref} position={data.pos}>
      <sphereGeometry args={[data.size, 16, 16]} />
      <meshStandardMaterial
        ref={matRef}
        color={color}
        emissive={data.isSheen ? SHEEN : new THREE.Color('#000000')}
        emissiveIntensity={data.isSheen ? 0.5 : 0}
        transparent
        opacity={data.isSheen ? 0.95 : 0.4}
        roughness={0.3}
        metalness={0.1}
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
      const pulse = 0.08 + Math.sin(t * 0.3 + i * 0.5) * 0.04
      mat.opacity = pulse
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
            <lineBasicMaterial color={SLATE} transparent opacity={0.1} />
          </line>
        )
      })}
    </group>
  )
}

function AmbientParticles() {
  const ref = useRef<THREE.Points>(null)
  const count = 60

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14
      pos[i * 3 + 1] = (Math.random() - 0.5) * 14
      pos[i * 3 + 2] = (Math.random() - 0.5) * 14
    }
    return pos
  }, [])

  useFrame(({ clock }) => {
    if (!ref.current) return
    const t = clock.getElapsedTime()
    const posAttr = ref.current.geometry.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < count; i++) {
      posAttr.array[i * 3 + 1] += Math.sin(t * 0.15 + i) * 0.003
      posAttr.array[i * 3] += Math.cos(t * 0.1 + i * 0.5) * 0.002
    }
    posAttr.needsUpdate = true
    ref.current.rotation.y = t * 0.02
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
        size={0.02}
        transparent
        opacity={0.3}
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
    camera.position.x = Math.sin(t * 0.05) * 0.3
    camera.position.y = Math.cos(t * 0.04) * 0.2
  })

  return null
}

function Scene() {
  const { nodes, edges } = useMemo(() => generateGraph(), [])

  return (
    <>
      <ambientLight intensity={0.15} />
      <pointLight position={[10, 10, 10]} intensity={0.3} color={SHEEN} />
      <pointLight position={[-10, -5, -8]} intensity={0.15} color={EMBER} />
      <pointLight position={[0, 0, 0]} intensity={0.1} color={SHEEN} distance={8} />

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
        autoRotateSpeed={0.15}
        maxPolarAngle={Math.PI * 0.65}
        minPolarAngle={Math.PI * 0.35}
      />
    </>
  )
}

export function HeroGraph() {
  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      pointerEvents: 'none',
    }}>
      <Canvas
        camera={{ position: [0, 0, 9], fov: 50 }}
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
      >
        <Scene />
      </Canvas>

      {/* Vignette — deep radial fade */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `radial-gradient(ellipse 70% 60% at 50% 50%, transparent 0%, rgba(18,21,26,0.4) 50%, var(--color-obsidian) 80%)`,
        pointerEvents: 'none',
      }} />

      {/* Top ambient glow */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        left: '30%',
        width: '40%',
        height: '50%',
        background: 'radial-gradient(ellipse at center, rgba(124,140,255,0.06) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'drift 20s ease-in-out infinite',
      }} />

      {/* Bottom ambient glow */}
      <div style={{
        position: 'absolute',
        bottom: '-10%',
        right: '20%',
        width: '30%',
        height: '40%',
        background: 'radial-gradient(ellipse at center, rgba(255,107,74,0.03) 0%, transparent 70%)',
        pointerEvents: 'none',
        animation: 'drift 25s ease-in-out infinite reverse',
      }} />
    </div>
  )
}

import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface Raven3DProps {
  scrollProgress?: number
  mousePosition?: { x: number; y: number }
}

const BODY = new THREE.Color('#1a1d22')
const FEATHER = new THREE.Color('#22262c')
const SHEEN = new THREE.Color('#7C8CFF')
const BEAK = new THREE.Color('#2a2d33')
const SPARK = new THREE.Color('#FFB648')

interface PartDef {
  name: string
  pos: Float32Array
  color: THREE.Color
  sheen?: boolean
  spark?: boolean
  dir: readonly [number, number, number]
  head?: boolean
}

function tri(pts: [number, number, number][]): Float32Array {
  const d: number[] = []
  for (let i = 1; i < pts.length - 1; i++) {
    for (const p of [pts[0], pts[i], pts[i + 1]]) d.push(p[0], p[1], p[2])
  }
  return new Float32Array(d)
}

const Y = -0.75

function buildParts(): PartDef[] {
  const b: [number, number, number][] = [
    [0, .45 + Y, 0], [.3, 0 + Y, .15], [.35, -.4 + Y, .1],
    [0, -.65 + Y, 0], [-.35, -.4 + Y, .1], [-.3, 0 + Y, .15], [0, .2 + Y, .3],
  ]
  const h: [number, number, number][] = [
    [0, .65 + Y, .05], [.2, .5 + Y, .12], [.2, .35 + Y, .08],
    [0, .3 + Y, .05], [-.2, .35 + Y, .08], [-.2, .5 + Y, .12], [0, .55 + Y, .18],
  ]
  return [
    ...([
      [tri([b[6], b[0], b[1]]), [0, .3, 0], BODY],
      [tri([b[6], b[1], b[2]]), [.3, .1, 0], BODY],
      [tri([b[6], b[2], b[3]]), [.3, -.2, 0], BODY],
      [tri([b[6], b[3], b[4]]), [-.3, -.2, 0], BODY],
      [tri([b[6], b[4], b[5]]), [-.3, .1, 0], BODY],
      [tri([b[6], b[5], b[0]]), [0, .3, .2], BODY],
      [tri([b[0], b[3], b[1]]), [0, 0, -.3], FEATHER],
      [tri([b[3], b[0], b[4]]), [0, 0, -.3], FEATHER],
    ] as const).map(([p, d, c], i) => ({
      name: `body${i}`, pos: p, color: c, dir: d,
    })),
    {
      name: 'chestL', pos: tri([[0, .3 + Y, .32], [.25, .05 + Y, .22], [0, -.3 + Y, .2]]),
      color: SHEEN, sheen: true, dir: [0, 0, .4],
    },
    {
      name: 'chestR', pos: tri([[0, .3 + Y, .32], [-.25, .05 + Y, .22], [0, -.3 + Y, .2]]),
      color: SHEEN, sheen: true, dir: [0, 0, .4],
    },
    ...([
      [tri([h[6], h[0], h[1]]), [0, .5, 0]],
      [tri([h[6], h[1], h[2]]), [.2, .4, 0]],
      [tri([h[6], h[2], h[3]]), [.2, .3, 0]],
      [tri([h[6], h[3], h[4]]), [-.2, .3, 0]],
      [tri([h[6], h[4], h[5]]), [-.2, .4, 0]],
      [tri([h[6], h[5], h[0]]), [0, .4, .2]],
    ] as const).map(([p, d], i) => ({
      name: `head${i}`, pos: p, color: BODY, dir: d, head: true,
    })),
    {
      name: 'headSheen', pos: tri([[0, .6 + Y, .2], [.15, .48 + Y, .15], [-.15, .48 + Y, .15]]),
      color: SHEEN, sheen: true, dir: [0, .4, .2], head: true,
    },
    {
      name: 'beakT', pos: tri([[.18, .5 + Y, .12], [.55, .46 + Y, .08], [.18, .42 + Y, .1]]),
      color: BEAK, dir: [.5, .1, 0], head: true,
    },
    {
      name: 'beakB', pos: tri([[.18, .42 + Y, .1], [.55, .46 + Y, .08], [.18, .38 + Y, .06]]),
      color: BEAK, dir: [.5, -.1, 0], head: true,
    },
    {
      name: 'beakTip', pos: tri([[.48, .47 + Y, .08], [.58, .46 + Y, .06], [.48, .45 + Y, .07]]),
      color: SPARK, spark: true, dir: [.6, 0, 0], head: true,
    },
    ...([
      [tri([[-.3, .1 + Y, .1], [-.8, -.1 + Y, -.05], [-.3, -.15 + Y, .05]]), [-.5, .2, 0], BODY],
      [tri([[-.3, 0 + Y, .08], [-.7, -.25 + Y, -.1], [-.3, -.25 + Y, .02]]), [-.5, -.1, -.2], FEATHER],
      [tri([[-.3, -.1 + Y, .06], [-.6, -.4 + Y, -.12], [-.3, -.35 + Y, -.02]]), [-.5, -.3, -.2], BODY],
      [tri([[-.28, .05 + Y, .12], [-.65, .05 + Y, 0], [-.3, -.05 + Y, .08]]), [-.5, .1, 0], SHEEN],
    ] as const).map(([p, d, c], i) => ({
      name: `lw${i}`, pos: p, color: c, sheen: c === SHEEN, dir: d,
    })),
    ...([
      [tri([[.3, .05 + Y, .05], [.6, -.15 + Y, -.08], [.3, -.2 + Y, 0]]), [.5, .2, -.2], BODY],
      [tri([[.3, -.05 + Y, .02], [.55, -.3 + Y, -.1], [.3, -.3 + Y, -.05]]), [.5, -.1, -.2], FEATHER],
      [tri([[.28, 0 + Y, .06], [.5, -.05 + Y, -.02], [.3, -.1 + Y, .02]]), [.5, .1, -.1], BODY],
    ] as const).map(([p, d, c], i) => ({
      name: `rw${i}`, pos: p, color: c, dir: d,
    })),
    ...([
      [tri([[0, -.55 + Y, -.1], [.15, -.9 + Y, -.2], [-.1, -.6 + Y, -.15]]), [.1, -.5, -.3], BODY],
      [tri([[-.05, -.55 + Y, -.12], [-.2, -.85 + Y, -.18], [-.15, -.55 + Y, -.1]]), [-.1, -.5, -.3], FEATHER],
      [tri([[.05, -.5 + Y, -.08], [.25, -.82 + Y, -.15], [.1, -.55 + Y, -.1]]), [.2, -.5, -.3], BODY],
      [tri([[0, -.52 + Y, -.11], [.05, -.88 + Y, -.22], [-.05, -.88 + Y, -.2]]), [0, -.5, -.4], FEATHER],
    ] as const).map(([p, d, c], i) => ({
      name: `tail${i}`, pos: p, color: c, dir: d,
    })),
    {
      name: 'crn1', pos: tri([[-.02, .7 + Y, .06], [.05, .9 + Y, .03], [.08, .7 + Y, .05]]),
      color: BODY, dir: [0, .6, 0], head: true,
    },
    {
      name: 'crn2', pos: tri([[.05, .68 + Y, .08], [.15, .88 + Y, .02], [.12, .68 + Y, .06]]),
      color: SHEEN, sheen: true, dir: [.2, .6, 0], head: true,
    },
    {
      name: 'crn3', pos: tri([[-.08, .68 + Y, .07], [-.05, .85 + Y, .01], [0, .68 + Y, .05]]),
      color: FEATHER, dir: [-.2, .6, 0], head: true,
    },
  ]
}

function Part({
  part, idx, scroll,
}: { part: PartDef; idx: number; scroll: number }) {
  const ref = useRef<THREE.Mesh>(null)
  const mat = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    if (!ref.current || !mat.current) return
    const t = clock.getElapsedTime()

    if (scroll < 0.3) {
      ref.current.position.set(0, 0, 0)
      mat.current.opacity = 1
      mat.current.transparent = false
    } else if (scroll < 0.6) {
      const p = (scroll - 0.3) / 0.3
      ref.current.position.set(
        part.dir[0] * p * 0.4, part.dir[1] * p * 0.4, part.dir[2] * p * 0.4,
      )
      mat.current.opacity = 1 - p * 0.6
      mat.current.transparent = true
    } else {
      const p = (scroll - 0.6) / 0.4
      const s = 0.4 + p * 0.8
      ref.current.position.set(
        part.dir[0] * s, part.dir[1] * s + Math.sin(t * 0.3 + idx) * 0.1, part.dir[2] * s,
      )
      mat.current.opacity = Math.max(0, 0.4 - p * 0.4)
      mat.current.transparent = true
      ref.current.rotation.x = t * 0.2 + idx * 0.5
      ref.current.rotation.z = Math.sin(t * 0.15 + idx) * 0.3
    }

    if (part.sheen) {
      mat.current.emissiveIntensity = 0.3 + Math.sin(t * 0.5 + idx * 0.7) * 0.25
      const hue = (Math.sin(t * 0.12 + idx * 0.3) + 1) / 2
      const c = SHEEN.clone().offsetHSL(hue * 0.08 - 0.04, 0, 0)
      mat.current.emissive.copy(c)
    }
    if (part.spark) {
      mat.current.emissiveIntensity = 0.5 + Math.sin(t * 0.8) * 0.3
    }
  })

  const em = part.sheen ? SHEEN : part.spark ? SPARK : new THREE.Color(0)
  return (
    <mesh ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[part.pos, 3]} array={part.pos} count={part.pos.length / 3} itemSize={3} />
      </bufferGeometry>
      <meshStandardMaterial
        ref={mat} color={part.color} emissive={em}
        emissiveIntensity={part.sheen ? 0.5 : part.spark ? 0.6 : 0}
        roughness={part.sheen ? 0.2 : 0.6} metalness={part.sheen ? 0.3 : 0.05} flatShading
      />
    </mesh>
  )
}

function Eye({ pos, scroll }: { pos: [number, number, number]; scroll: number }) {
  const m = useRef<THREE.MeshStandardMaterial>(null)
  const g = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    if (m.current) m.current.emissiveIntensity = 0.6 + Math.sin(clock.getElapsedTime() * 0.7) * 0.3
    if (g.current) g.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 0.5) * 0.15)
  })

  const op = scroll < 0.3 ? 1 : scroll < 0.6 ? 1 - (scroll - 0.3) / 0.3 * 0.8 : Math.max(0, 0.2 - (scroll - 0.6) / 0.4 * 0.2)
  return (
    <group position={pos}>
      <mesh ref={g}>
        <sphereGeometry args={[0.06, 8, 8]} />
        <meshStandardMaterial color={SHEEN} emissive={SHEEN} emissiveIntensity={0.8} transparent opacity={0.3 * op} depthWrite={false} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.035, 6, 6]} />
        <meshStandardMaterial ref={m} color={SHEEN} emissive={SHEEN} emissiveIntensity={0.6} transparent opacity={op} />
      </mesh>
    </group>
  )
}

export function Raven3D({ scrollProgress = 0, mousePosition }: Raven3DProps) {
  const root = useRef<THREE.Group>(null)
  const head = useRef<THREE.Group>(null)
  const parts = useMemo(() => buildParts(), [])

  useFrame(({ clock }) => {
    if (!root.current) return
    const t = clock.getElapsedTime()
    root.current.position.y = Math.sin(t * 0.8) * 0.02
    if (mousePosition) {
      root.current.rotation.y = THREE.MathUtils.lerp(root.current.rotation.y, mousePosition.x * 0.15, 0.05)
      root.current.rotation.x = THREE.MathUtils.lerp(root.current.rotation.x, mousePosition.y * 0.08, 0.05)
    }
    if (head.current) {
      head.current.rotation.z = Math.sin(t * 0.4) * 0.035
      head.current.rotation.x = Math.sin(t * 0.3 + 1) * 0.02
    }
  })

  const bodyParts = parts.filter(p => !p.head)
  const headParts = parts.filter(p => p.head)

  return (
    <group ref={root}>
      {bodyParts.map((p, i) => (
        <Part key={p.name} part={p} idx={i} scroll={scrollProgress} />
      ))}
      <group ref={head}>
        {headParts.map((p, i) => (
          <Part key={p.name} part={p} idx={i + bodyParts.length} scroll={scrollProgress} />
        ))}
        <Eye pos={[0.12, -.2, .18]} scroll={scrollProgress} />
        <Eye pos={[-.08, -.2, .2]} scroll={scrollProgress} />
      </group>
    </group>
  )
}

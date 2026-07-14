import { useRef, useEffect, useState, useCallback } from 'react'

interface Node {
  x: number
  y: number
  vx: number
  vy: number
  label: string
  size: number
  accent: boolean
  targetX: number
  targetY: number
}

interface Edge {
  from: number
  to: number
}

const LABELS = [
  'Documents', 'Projects', 'Calendar', 'Email', 'WhatsApp',
  'Telegram', 'Claude', 'GPT-4o', 'Gemini', 'Ollama',
  'Deepgram', 'ElevenLabs', 'Screenshots', 'Terminal', 'Files',
  'Memory', 'Voice', 'Contacts', 'Photos', 'Clipboard',
]

export function GraphDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const nodesRef = useRef<Node[]>([])
  const edgesRef = useRef<Edge[]>([])
  const animRef = useRef<number>(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const hoverRef = useRef(-1)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const init = useCallback((w: number, h: number) => {
    const cx = w / 2
    const cy = h / 2
    const nodes: Node[] = LABELS.map((label, i) => {
      const angle = (i / LABELS.length) * Math.PI * 2
      const r = 80 + Math.random() * 120
      const x = cx + Math.cos(angle) * r
      const y = cy + Math.sin(angle) * r
      const accent = i % 4 === 0
      return {
        x, y,
        vx: 0, vy: 0,
        label,
        size: accent ? 5 + Math.random() * 3 : 2.5 + Math.random() * 2,
        accent,
        targetX: x,
        targetY: y,
      }
    })

    const edges: Edge[] = []
    for (let i = 0; i < nodes.length; i++) {
      const count = 1 + Math.floor(Math.random() * 2)
      for (let c = 0; c < count; c++) {
        const j = (i + 1 + Math.floor(Math.random() * 5)) % nodes.length
        if (i !== j) edges.push({ from: i, to: j })
      }
    }

    nodesRef.current = nodes
    edgesRef.current = edges
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = rect.width + 'px'
      canvas.style.height = rect.height + 'px'
      ctx.scale(dpr, dpr)
      if (nodesRef.current.length === 0) {
        init(rect.width, rect.height)
      }
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(container)

    const onMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    canvas.addEventListener('mousemove', onMouse)

    let t = 0
    const draw = () => {
      t += 0.016
      const rect = container.getBoundingClientRect()
      const w = rect.width
      const h = rect.height
      const nodes = nodesRef.current
      const edges = edgesRef.current
      const mx = mouseRef.current.x
      const my = mouseRef.current.y

      ctx.clearRect(0, 0, w, h)

      // Physics: gentle floating + mouse repulsion
      let hov = -1
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const dx = mx - n.x
        const dy = my - n.y
        const dist = Math.sqrt(dx * dx + dy * dy)

        if (dist < 30) hov = i

        // Gentle return to target
        n.vx += (n.targetX - n.x) * 0.008
        n.vy += (n.targetY - n.y) * 0.008

        // Mouse repulsion
        if (dist < 100 && dist > 0) {
          const force = (100 - dist) / 100 * 0.5
          n.vx -= (dx / dist) * force
          n.vy -= (dy / dist) * force
        }

        // Floating
        n.vx += Math.sin(t * 0.3 + i * 0.7) * 0.02
        n.vy += Math.cos(t * 0.25 + i * 0.5) * 0.02

        // Damping
        n.vx *= 0.92
        n.vy *= 0.92

        n.x += n.vx
        n.y += n.vy

        // Bounds
        n.x = Math.max(20, Math.min(w - 20, n.x))
        n.y = Math.max(20, Math.min(h - 20, n.y))
      }
      hoverRef.current = hov
      setHoveredNode(hov >= 0 ? nodes[hov].label : null)

      // Draw edges
      ctx.lineWidth = 0.5
      for (const edge of edges) {
        const a = nodes[edge.from]
        const b = nodes[edge.to]
        const isHighlighted = hov === edge.from || hov === edge.to
        ctx.strokeStyle = isHighlighted
          ? 'rgba(255,255,255,0.15)'
          : 'rgba(255,255,255,0.04)'
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.lineTo(b.x, b.y)
        ctx.stroke()
      }

      // Draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i]
        const isHovered = hov === i
        const pulse = Math.sin(t * 0.5 + i * 0.3) * 0.15

        // Glow for accent nodes
        if (n.accent) {
          ctx.beginPath()
          ctx.arc(n.x, n.y, n.size * 3, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(124, 140, 255, ${0.04 + pulse * 0.02})`
          ctx.fill()
        }

        // Node
        ctx.beginPath()
        ctx.arc(n.x, n.y, isHovered ? n.size * 1.5 : n.size, 0, Math.PI * 2)
        if (n.accent) {
          ctx.fillStyle = `rgba(255, 255, 255, ${0.8 + pulse})`
        } else {
          ctx.fillStyle = isHovered ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.2)'
        }
        ctx.fill()

        // Label on hover
        if (isHovered) {
          ctx.font = '11px "IBM Plex Mono", monospace'
          ctx.fillStyle = 'rgba(255,255,255,0.9)'
          ctx.textAlign = 'center'
          ctx.fillText(n.label, n.x, n.y - n.size - 8)
        }
      }

      animRef.current = requestAnimationFrame(draw)
    }

    animRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animRef.current)
      ro.disconnect()
      canvas.removeEventListener('mousemove', onMouse)
    }
  }, [init])

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        minHeight: 400,
        borderRadius: 16,
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.04)',
        background: 'rgba(5, 5, 7, 0.8)',
        backdropFilter: 'blur(8px)',
        cursor: 'crosshair',
      }}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />

      {/* Corner marks */}
      <div style={{ position: 'absolute', top: 12, left: 12, width: 16, height: 16, borderTop: '1px solid rgba(255,255,255,0.08)', borderLeft: '1px solid rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', top: 12, right: 12, width: 16, height: 16, borderTop: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: 12, left: 12, width: 16, height: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', borderLeft: '1px solid rgba(255,255,255,0.08)' }} />
      <div style={{ position: 'absolute', bottom: 12, right: 12, width: 16, height: 16, borderBottom: '1px solid rgba(255,255,255,0.08)', borderRight: '1px solid rgba(255,255,255,0.08)' }} />

      {/* Label */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 20,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--text-muted)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        {hoveredNode || 'memory graph'}
      </div>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'

const TERMINAL_LINES = [
  { cmd: 'korvid status', out: '● gateway ready on :3847' },
  { cmd: 'korvid voice --trigger', out: '◐ listening... processing... response delivered' },
  { cmd: 'korvid delegate "refactor auth module"', out: '● spec generated → agent selected → validated ✓' },
  { cmd: 'korvid memory search "api keys"', out: '● 3 core entries, 12 episodic events matched' },
  { cmd: 'korvid tools', out: '● 10 tools registered across 5 categories' },
  { cmd: 'korvid vision --capture --analyze', out: '● screenshot captured → analyzed via llava' },
]

const CAPABILITIES = [
  'voice pipeline · stt → reason → tts',
  'autonomous delegation · spec → sandbox → validate',
  'pc control · screenshots, files, apps, terminal',
  'persistent memory · core facts, episodic events, graph',
  'self-validation · simulate, debrief, auto-rollback',
  'safety layer · confirmations, budget caps, permissions',
  'multi-model · claude, gpt-4o, gemini, ollama, groq',
  'messaging · whatsapp, telegram bridges',
  'vision · ocr, screen analysis, live camera',
  'browser automation · playwright, navigation, screenshots',
  'calendar & email · google calendar, gmail, imap',
  'webhook triggers · github, cron, external events',
]

function HudRing({ size, speed, dash }: { size: number; speed: number; dash?: string }) {
  const r = size / 2 - 2
  const circ = 2 * Math.PI * r
  return (
    <svg
      width={size}
      height={size}
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: `translate(-50%, -50%) rotate(${speed > 0 ? 0 : 90}deg)`,
        animation: `hudRotate ${Math.abs(speed)}s linear infinite${speed < 0 ? ' reverse' : ''}`,
        pointerEvents: 'none',
      }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="rgba(124,140,255,0.12)"
        strokeWidth={1}
        strokeDasharray={dash || `${circ * 0.08} ${circ * 0.04}`}
      />
    </svg>
  )
}

function TypingTerminal() {
  const [lineIdx, setLineIdx] = useState(0)
  const [charIdx, setCharIdx] = useState(0)
  const [showOut, setShowOut] = useState(false)
  const [outputIdx, setOutputIdx] = useState(0)
  const [displayLines, setDisplayLines] = useState<{ cmd: string; out: string }[]>([])
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const line = TERMINAL_LINES[lineIdx]
    if (!line) {
      const timeout = setTimeout(() => {
        setLineIdx(0)
        setCharIdx(0)
        setShowOut(false)
        setOutputIdx(0)
        setDisplayLines([])
      }, 4000)
      return () => clearTimeout(timeout)
    }

    if (!showOut) {
      if (charIdx < line.cmd.length) {
        const t = setTimeout(() => setCharIdx(c => c + 1), 28 + Math.random() * 40)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setShowOut(true), 300)
        return () => clearTimeout(t)
      }
    } else {
      if (outputIdx < line.out.length) {
        const t = setTimeout(() => setOutputIdx(o => o + 1), 12)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => {
          setDisplayLines(prev => [...prev.slice(-2), { cmd: line.cmd, out: line.out }])
          setLineIdx(i => i + 1)
          setCharIdx(0)
          setShowOut(false)
          setOutputIdx(0)
        }, 1800)
        return () => clearTimeout(t)
      }
    }
  }, [lineIdx, charIdx, showOut, outputIdx])

  useEffect(() => {
    if (ref.current) {
      ref.current.scrollTop = ref.current.scrollHeight
    }
  }, [displayLines, showOut, outputIdx])

  const currentLine = TERMINAL_LINES[lineIdx]

  return (
    <div ref={ref} style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      lineHeight: 1.7,
      color: 'var(--text-muted)',
      height: '100%',
      overflow: 'hidden',
      padding: '2px 0',
    }}>
      {displayLines.map((l, i) => (
        <div key={i}>
          <div><span style={{ color: 'var(--sheen)' }}>●</span> <span style={{ color: 'var(--text-secondary)' }}>$ {l.cmd}</span></div>
          <div style={{ color: 'var(--text-muted)', paddingLeft: 10 }}>{l.out}</div>
        </div>
      ))}
      {currentLine && (
        <div>
          <div>
            <span style={{ color: 'var(--sheen)' }}>●</span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>$ {currentLine.cmd.slice(0, charIdx)}</span>
            {!showOut && <span style={{
              display: 'inline-block',
              width: 6,
              height: 13,
              background: 'var(--sheen)',
              marginLeft: 1,
              verticalAlign: 'middle',
              animation: 'cursorBlink 1s step-end infinite',
            }} />}
          </div>
          {showOut && (
            <div style={{ color: 'var(--text-muted)', paddingLeft: 10 }}>
              {currentLine.out.slice(0, outputIdx)}
              {outputIdx < currentLine.out.length && (
                <span style={{
                  display: 'inline-block',
                  width: 5,
                  height: 11,
                  background: 'var(--sheen)',
                  marginLeft: 1,
                  verticalAlign: 'middle',
                  animation: 'cursorBlink 1s step-end infinite',
                }} />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Waveform() {
  const bars = 32
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 2,
      height: 24,
    }}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          style={{
            width: 2,
            borderRadius: 1,
            background: 'var(--sheen)',
            opacity: 0.4,
            animation: `waveform ${0.8 + Math.random() * 1.2}s ease-in-out ${i * 0.04}s infinite alternate`,
          }}
        />
      ))}
    </div>
  )
}

function StatusPanel({ label, value, bar }: { label: string; value: string; bar?: number }) {
  return (
    <div style={{
      padding: '10px 14px',
      background: 'rgba(5, 5, 7, 0.7)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(124, 140, 255, 0.08)',
      borderRadius: 8,
      minWidth: 140,
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 9,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: 6,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 13,
        fontWeight: 500,
        color: 'var(--white)',
        marginBottom: bar !== undefined ? 6 : 0,
      }}>
        {value}
      </div>
      {bar !== undefined && (
        <div style={{
          height: 2,
          borderRadius: 1,
          background: 'rgba(255,255,255,0.06)',
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            borderRadius: 1,
            background: 'var(--sheen)',
            width: `${bar}%`,
            transition: 'width 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }} />
        </div>
      )}
    </div>
  )
}

function Particles() {
  const particles = useRef(
    Array.from({ length: 40 }, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 1 + Math.random() * 2,
      duration: 15 + Math.random() * 25,
      delay: Math.random() * -20,
      opacity: 0.15 + Math.random() * 0.3,
    }))
  ).current

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: '50%',
            background: 'var(--white)',
            opacity: p.opacity,
            animation: `particleDrift ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  )
}

function CornerBracket({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const size = 28
  const weight = 1
  const color = 'rgba(124, 140, 255, 0.15)'
  const style: React.CSSProperties = { position: 'absolute' }

  if (position === 'tl') {
    Object.assign(style, { top: 0, left: 0, width: size, height: size, borderTop: `${weight}px solid ${color}`, borderLeft: `${weight}px solid ${color}` })
  } else if (position === 'tr') {
    Object.assign(style, { top: 0, right: 0, width: size, height: size, borderTop: `${weight}px solid ${color}`, borderRight: `${weight}px solid ${color}` })
  } else if (position === 'bl') {
    Object.assign(style, { bottom: 0, left: 0, width: size, height: size, borderBottom: `${weight}px solid ${color}`, borderLeft: `${weight}px solid ${color}` })
  } else {
    Object.assign(style, { bottom: 0, right: 0, width: size, height: size, borderBottom: `${weight}px solid ${color}`, borderRight: `${weight}px solid ${color}` })
  }

  return <div style={style} />
}

export function JarvisHero() {
  const [time, setTime] = useState('')
  const [capIdx, setCapIdx] = useState(0)
  const [show, setShow] = useState(false)
  const [graphOpacity, setGraphOpacity] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 200)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const onScroll = () => {
      const heroH = window.innerHeight
      const scroll = Math.min(window.scrollY / heroH, 1)
      setGraphOpacity(Math.min(Math.max((scroll - 0.08) / 0.35, 0), 1))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    const update = () => {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }))
    }
    update()
    const i = setInterval(update, 1000)
    return () => clearInterval(i)
  }, [])

  useEffect(() => {
    const i = setInterval(() => {
      setCapIdx(c => (c + 1) % CAPABILITIES.length)
    }, 3000)
    return () => clearInterval(i)
  }, [])

  const heroOpacity = 1 - graphOpacity
  const hudScale = 0.95 + graphOpacity * 0.05

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      zIndex: 2,
      pointerEvents: 'none',
      opacity: heroOpacity,
      transform: `scale(${hudScale})`,
      transition: 'opacity 0.1s linear',
    }}>
      <Particles />

      {/* Scan line */}
      <div style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        pointerEvents: 'none',
        opacity: 0.4,
      }}>
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(124,140,255,0.08), transparent)',
          animation: 'scanline 8s linear infinite',
        }} />
      </div>

      {/* HUD Rings around Orb center */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 340,
        height: 340,
        opacity: show ? 1 : 0,
        transition: 'opacity 1.5s ease-out 0.5s',
      }}>
        <HudRing size={340} speed={45} dash="4 8" />
        <HudRing size={290} speed={-60} dash="12 6" />
        <HudRing size={240} speed={30} dash="2 10" />
      </div>

      {/* Center content over Orb */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
        opacity: show ? 1 : 0,
        transition: 'opacity 1s ease-out 0.3s',
      }}>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(48px, 10vw, 88px)',
          fontWeight: 700,
          letterSpacing: '-0.04em',
          color: 'var(--white)',
          lineHeight: 0.95,
          marginBottom: 8,
          textShadow: '0 0 60px rgba(124,140,255,0.15)',
        }}>
          Korvid
        </h1>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--sheen)',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          opacity: 0.7,
        }}>
          system online
        </div>
      </div>

      {/* ── TOP-LEFT: Logo + version ── */}
      <div style={{
        position: 'absolute',
        top: 80,
        left: 48,
        opacity: show ? 1 : 0,
        transition: 'opacity 1s ease-out 0.6s',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 4,
        }}>
          korvid v0.1.0
        </div>
        <div style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: 'var(--sheen)',
          boxShadow: '0 0 10px var(--sheen-glow)',
          animation: 'orbPulse 3s ease-in-out infinite',
        }} />
      </div>

      {/* ── TOP-RIGHT: Timestamp + heartbeat ── */}
      <div style={{
        position: 'absolute',
        top: 80,
        right: 48,
        textAlign: 'right',
        opacity: show ? 1 : 0,
        transition: 'opacity 1s ease-out 0.8s',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 22,
          fontWeight: 500,
          color: 'var(--white)',
          letterSpacing: '0.06em',
          marginBottom: 4,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {time}
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-muted)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          heartbeat ●
        </div>
      </div>

      {/* ── LEFT PANELS: Status ── */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: 48,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: show ? 1 : 0,
        transition: 'opacity 1s ease-out 1s',
      }}>
        <StatusPanel label="reasoning" value="claude sonnet 4" bar={72} />
        <StatusPanel label="stt" value="deepgram nova-3" />
        <StatusPanel label="tts" value="cartesia" />
        <StatusPanel label="tokens" value="12,847" bar={45} />
      </div>

      {/* ── RIGHT PANELS: Metrics ── */}
      <div style={{
        position: 'absolute',
        top: '50%',
        right: 48,
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        opacity: show ? 1 : 0,
        transition: 'opacity 1s ease-out 1.2s',
      }}>
        <StatusPanel label="latency" value="142ms" />
        <StatusPanel label="memory" value="347 entries" bar={68} />
        <StatusPanel label="tools" value="10 active" />
        <StatusPanel label="uptime" value="4h 23m" />
      </div>

      {/* ── BOTTOM-LEFT: Terminal ── */}
      <div style={{
        position: 'absolute',
        bottom: 60,
        left: 48,
        width: 400,
        height: 150,
        opacity: show ? 1 : 0,
        transition: 'opacity 1s ease-out 1.4s',
      }}>
        <div style={{
          position: 'relative',
          height: '100%',
          padding: '14px 16px',
          background: 'rgba(5, 5, 7, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(124, 140, 255, 0.08)',
          borderRadius: 8,
          overflow: 'hidden',
        }}>
          <CornerBracket position="tl" />
          <CornerBracket position="tr" />
          <CornerBracket position="bl" />
          <CornerBracket position="br" />
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            command log
          </div>
          <TypingTerminal />
        </div>
      </div>

      {/* ── BOTTOM-RIGHT: Waveform + capability ── */}
      <div style={{
        position: 'absolute',
        bottom: 60,
        right: 48,
        width: 320,
        opacity: show ? 1 : 0,
        transition: 'opacity 1s ease-out 1.6s',
      }}>
        <div style={{
          padding: '14px 16px',
          background: 'rgba(5, 5, 7, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(124, 140, 255, 0.08)',
          borderRadius: 8,
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 8,
          }}>
            active capability
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--white)',
            marginBottom: 10,
            minHeight: 18,
            transition: 'opacity 0.3s',
          }}>
            {CAPABILITIES[capIdx]}
          </div>
          <Waveform />
        </div>
      </div>

      {/* ── Corner brackets on main viewport ── */}
      <div style={{ position: 'absolute', top: 24, left: 24, opacity: show ? 0.3 : 0, transition: 'opacity 1s ease-out 2s' }}>
        <CornerBracket position="tl" />
      </div>
      <div style={{ position: 'absolute', top: 24, right: 24, opacity: show ? 0.3 : 0, transition: 'opacity 1s ease-out 2s' }}>
        <CornerBracket position="tr" />
      </div>
      <div style={{ position: 'absolute', bottom: 24, left: 24, opacity: show ? 0.3 : 0, transition: 'opacity 1s ease-out 2s' }}>
        <CornerBracket position="bl" />
      </div>
      <div style={{ position: 'absolute', bottom: 24, right: 24, opacity: show ? 0.3 : 0, transition: 'opacity 1s ease-out 2s' }}>
        <CornerBracket position="br" />
      </div>
    </div>
  )
}

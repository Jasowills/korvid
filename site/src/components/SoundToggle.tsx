import { useState, useRef, useCallback, useEffect } from 'react'

export function SoundToggle() {
  const [muted, setMuted] = useState(true)
  const ctxRef = useRef<AudioContext | null>(null)
  const nodesRef = useRef<OscillatorNode[]>([])
  const gainsRef = useRef<GainNode[]>([])

  const startSound = useCallback(() => {
    if (ctxRef.current) return
    const ctx = new AudioContext()
    ctxRef.current = ctx

    const oscs: OscillatorNode[] = []
    const gains: GainNode[] = []

    const configs = [
      { freq: 82, gain: 0.035, lfoFreq: 0.15, lfoDepth: 0.015 },
      { freq: 123, gain: 0.018, lfoFreq: 0.08, lfoDepth: 0.008 },
      { freq: 165, gain: 0.008, lfoFreq: 0.12, lfoDepth: 0.004 },
    ]

    for (const cfg of configs) {
      const osc = ctx.createOscillator()
      osc.type = 'sine'
      osc.frequency.value = cfg.freq

      const gain = ctx.createGain()
      gain.gain.value = 0

      const lfo = ctx.createOscillator()
      lfo.type = 'sine'
      lfo.frequency.value = cfg.lfoFreq
      const lfoGain = ctx.createGain()
      lfoGain.gain.value = cfg.lfoDepth
      lfo.connect(lfoGain)
      lfoGain.connect(gain.gain)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start()
      lfo.start()

      gain.gain.setTargetAtTime(cfg.gain, ctx.currentTime, 0.8)

      oscs.push(osc, lfo)
      gains.push(gain)
    }

    nodesRef.current = oscs
    gainsRef.current = gains
  }, [])

  const stopSound = useCallback(() => {
    if (!ctxRef.current) return
    const ctx = ctxRef.current
    for (const g of gainsRef.current) {
      g.gain.setTargetAtTime(0, ctx.currentTime, 0.3)
    }
    setTimeout(() => {
      for (const o of nodesRef.current) {
        try { o.stop() } catch {}
      }
      nodesRef.current = []
      gainsRef.current = []
      ctxRef.current = null
    }, 500)
  }, [])

  const toggle = useCallback(() => {
    if (muted) {
      startSound()
    } else {
      stopSound()
    }
    setMuted(!muted)
  }, [muted, startSound, stopSound])

  useEffect(() => {
    return () => stopSound()
  }, [stopSound])

  return (
    <button
      onClick={toggle}
      aria-label={muted ? 'Unmute sound' : 'Mute sound'}
      style={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 200,
        width: 40,
        height: 40,
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.06)',
        background: 'rgba(13, 15, 18, 0.5)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        color: muted ? 'var(--text-muted)' : 'var(--white)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'
        e.currentTarget.style.color = 'var(--white)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'
        e.currentTarget.style.color = muted ? 'var(--text-muted)' : 'var(--white)'
      }}
    >
      {muted ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  )
}

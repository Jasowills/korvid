import { useEffect, useState } from 'react'

type Pose = 'idle' | 'listening' | 'alert' | 'asleep'

interface RavenProps {
  pose?: Pose
  size?: number
  className?: string
}

export function Raven({ pose = 'idle', size = 200, className }: RavenProps) {
  const [blinkOpen, setBlinkOpen] = useState(true)

  useEffect(() => {
    if (pose === 'asleep') return
    const interval = setInterval(() => {
      setBlinkOpen(false)
      setTimeout(() => setBlinkOpen(true), 150)
    }, 3000 + Math.random() * 2000)
    return () => clearInterval(interval)
  }, [pose])

  const sheenOpacity = pose === 'listening' ? 0.9 : pose === 'alert' ? 0.7 : 0.4
  const bodyColor = '#1a1d22'
  const featherDark = '#0f1114'
  const featherMid = '#22262c'
  const eyeGlow = pose === 'listening' ? '#7C8CFF' : pose === 'alert' ? '#FFB648' : '#7C8CFF'
  const headTilt = pose === 'listening' ? -8 : pose === 'alert' ? 3 : 0
  const wingLift = pose === 'alert' ? -6 : 0

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        animation: pose !== 'asleep' ? 'idleBreathe 4s ease-in-out infinite' : 'none',
      }}
    >
      <svg
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          width: '100%',
          height: '100%',
          animation: pose !== 'asleep' ? 'featherShift 8s ease-in-out infinite' : 'none',
        }}
      >
        <defs>
          <linearGradient id="sheenGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#7C8CFF" stopOpacity={sheenOpacity * 0.3} />
            <stop offset="40%" stopColor="#9FA8FF" stopOpacity={sheenOpacity * 0.6} />
            <stop offset="70%" stopColor="#7C8CFF" stopOpacity={sheenOpacity * 0.8} />
            <stop offset="100%" stopColor="#6B7AE6" stopOpacity={sheenOpacity * 0.4} />
          </linearGradient>
          <linearGradient id="sparkGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#FFB648" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#FF9F1C" stopOpacity="0.3" />
          </linearGradient>
          <radialGradient id="eyeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={eyeGlow} stopOpacity="0.9" />
            <stop offset="60%" stopColor={eyeGlow} stopOpacity="0.4" />
            <stop offset="100%" stopColor={eyeGlow} stopOpacity="0" />
          </radialGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Body — faceted geometric shape */}
        <g transform={`translate(100,100) rotate(${headTilt}) translate(-100,-100)`}>
          {/* Tail feathers */}
          <polygon points="60,140 40,180 55,175 70,160" fill={featherDark} opacity="0.8" />
          <polygon points="70,135 50,175 65,170 80,155" fill={featherMid} opacity="0.7" />
          <polygon points="80,130 60,170 75,165 90,148" fill={bodyColor} opacity="0.9" />

          {/* Left wing */}
          <g style={{ transform: `translateY(${wingLift}px)`, transition: 'transform 0.5s ease' }}>
            <polygon points="55,95 20,120 35,130 60,115" fill={featherDark} />
            <polygon points="50,100 25,125 40,132 58,118" fill={featherMid} />
            <polygon points="48,105 30,128 42,133 55,120" fill={bodyColor} />
            {/* Sheen highlight on wing */}
            <polygon points="52,102 32,124 42,130 56,116" fill="url(#sheenGrad)" opacity="0.5" />
          </g>

          {/* Right wing (behind body) */}
          <g style={{ transform: `translateY(${wingLift * 0.7}px)`, transition: 'transform 0.5s ease' }}>
            <polygon points="140,95 170,115 160,130 138,118" fill={featherDark} opacity="0.6" />
            <polygon points="142,100 165,118 155,130 140,120" fill={featherMid} opacity="0.5" />
          </g>

          {/* Body core — angular/faceted */}
          <polygon points="80,70 120,70 135,100 125,140 75,140 65,100" fill={bodyColor} />
          <polygon points="80,70 100,65 120,70 135,100 120,95 80,90" fill={featherMid} opacity="0.6" />

          {/* Chest highlight */}
          <polygon points="85,85 115,85 120,110 110,135 90,135 80,110" fill={featherDark} opacity="0.4" />

          {/* Sheen iridescence across body */}
          <polygon points="80,70 120,70 135,100 125,140 75,140 65,100" fill="url(#sheenGrad)" opacity="0.35" />

          {/* Head — angular */}
          <polygon points="85,55 115,55 125,70 115,85 85,85 75,70" fill={bodyColor} />
          <polygon points="85,55 100,48 115,55 125,70 110,68 90,65" fill={featherMid} opacity="0.5" />

          {/* Crown feathers — geometric tufts */}
          <polygon points="95,48 100,35 105,48" fill={featherDark} />
          <polygon points="102,46 108,30 110,45" fill={bodyColor} opacity="0.8" />
          <polygon points="88,50 92,38 96,50" fill={featherMid} opacity="0.6" />

          {/* Beak — sharp, angular */}
          <polygon points="115,68 140,72 135,78 115,76" fill="#2a2d33" />
          <polygon points="115,68 140,72 130,74 115,71" fill="url(#sparkGrad)" opacity="0.3" />
          {/* Beak tip highlight */}
          <polygon points="135,71 140,72 137,76 134,74" fill={featherMid} opacity="0.7" />

          {/* Eye — with glow */}
          <circle cx="108" cy="66" r="6" fill="url(#eyeGlow)" filter="url(#glow)" />
          <circle cx="108" cy="66" r="3.5" fill={eyeGlow} opacity={blinkOpen ? 1 : 0.1} style={{ transition: 'opacity 0.1s' }} />
          {blinkOpen && (
            <circle cx="109.5" cy="64.5" r="1.2" fill="white" opacity="0.8" />
          )}

          {/* Left eye (partially visible) */}
          <circle cx="92" cy="66" r="4" fill="url(#eyeGlow)" filter="url(#glow)" opacity="0.5" />
          <circle cx="92" cy="66" r="2.5" fill={eyeGlow} opacity={blinkOpen ? 0.6 : 0.1} style={{ transition: 'opacity 0.1s' }} />

          {/* Feet */}
          <line x1="90" y1="140" x2="85" y2="165" stroke="#2a2d33" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="110" y1="140" x2="115" y2="165" stroke="#2a2d33" strokeWidth="2.5" strokeLinecap="round" />
          {/* Talons */}
          <line x1="85" y1="165" x2="78" y2="170" stroke="#2a2d33" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="85" y1="165" x2="88" y2="172" stroke="#2a2d33" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="115" y1="165" x2="122" y2="170" stroke="#2a2d33" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="115" y1="165" x2="112" y2="172" stroke="#2a2d33" strokeWidth="1.5" strokeLinecap="round" />

          {/* Perch line */}
          <line x1="70" y1="172" x2="130" y2="172" stroke="var(--color-slate)" strokeWidth="1" opacity="0.3" />
        </g>

        {/* Asleep Z's */}
        {pose === 'asleep' && (
          <g opacity="0.3">
            <text x="130" y="50" fontFamily="var(--font-mono)" fontSize="12" fill="var(--color-sheen)" style={{ animation: 'sparkle 3s ease-in-out infinite' }}>z</text>
            <text x="145" y="38" fontFamily="var(--font-mono)" fontSize="16" fill="var(--color-sheen)" style={{ animation: 'sparkle 3s ease-in-out infinite 0.5s' }}>z</text>
            <text x="158" y="24" fontFamily="var(--font-mono)" fontSize="20" fill="var(--color-sheen)" style={{ animation: 'sparkle 3s ease-in-out infinite 1s' }}>z</text>
          </g>
        )}
      </svg>
    </div>
  )
}

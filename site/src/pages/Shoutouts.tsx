import { useState, useEffect, useRef } from 'react'

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(16px)',
        transition: `opacity 0.6s ease-out ${delay}ms, transform 0.6s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export function Shoutouts() {
  return (
    <div style={{ padding: '120px 40px 80px', maxWidth: 720, margin: '0 auto' }}>
      <AnimatedSection>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-slate)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 16,
        }}>
          shoutouts
        </div>
        <h1 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: 600,
          color: 'var(--color-bone)',
          marginBottom: 12,
        }}>
          what people are saying
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--color-slate)',
          marginBottom: 48,
          lineHeight: 1.7,
        }}>
          genuine community mentions and testimonials will appear here
          as people start using korvid. no fabricated quotes.
        </p>
      </AnimatedSection>

      <AnimatedSection delay={100}>
        <div style={{
          border: '1px dashed var(--color-slate)',
          borderRadius: 8,
          padding: '80px 32px',
          textAlign: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 32,
            color: 'var(--color-slate)',
            marginBottom: 16,
            opacity: 0.4,
          }}>
            ○
          </div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            color: 'var(--color-slate)',
            marginBottom: 8,
          }}>
            coming soon
          </div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'var(--color-slate)',
            opacity: 0.6,
          }}>
            this page will fill with real quotes as the community grows.
          </div>
        </div>
      </AnimatedSection>
    </div>
  )
}

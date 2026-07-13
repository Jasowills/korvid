import { RevealBlock } from '../hooks/useScrollReveal.tsx'

export function Shoutouts() {
  return (
    <div style={{ padding: '120px 48px 100px', maxWidth: 720, margin: '0 auto' }}>
      <RevealBlock>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--color-sheen)',
          textTransform: 'uppercase',
          letterSpacing: '0.15em',
          marginBottom: 20,
          opacity: 0.7,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 16,
            height: 1,
            background: 'var(--color-sheen)',
            opacity: 0.4,
          }} />
          shoutouts
        </div>
        <h1 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 600,
          color: 'var(--color-bone)',
          marginBottom: 12,
          letterSpacing: '-0.03em',
        }}>
          what people are saying
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'rgba(232,234,237,0.4)',
          marginBottom: 64,
          lineHeight: 1.7,
        }}>
          genuine community mentions and testimonials will appear here
          as people start using korvid. no fabricated quotes.
        </p>
      </RevealBlock>

      <RevealBlock delay={100}>
        <div style={{
          position: 'relative',
          border: '1px dashed rgba(42,49,56,0.4)',
          borderRadius: 8,
          padding: '96px 32px',
          textAlign: 'center',
          overflow: 'hidden',
        }}>
          {/* Corner marks */}
          <div style={{
            position: 'absolute',
            top: 16,
            left: 16,
            width: 16,
            height: 16,
            borderTop: '1px solid rgba(124,140,255,0.15)',
            borderLeft: '1px solid rgba(124,140,255,0.15)',
          }} />
          <div style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 16,
            height: 16,
            borderTop: '1px solid rgba(124,140,255,0.15)',
            borderRight: '1px solid rgba(124,140,255,0.15)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: 16,
            left: 16,
            width: 16,
            height: 16,
            borderBottom: '1px solid rgba(124,140,255,0.15)',
            borderLeft: '1px solid rgba(124,140,255,0.15)',
          }} />
          <div style={{
            position: 'absolute',
            bottom: 16,
            right: 16,
            width: 16,
            height: 16,
            borderBottom: '1px solid rgba(124,140,255,0.15)',
            borderRight: '1px solid rgba(124,140,255,0.15)',
          }} />

          {/* Center glyph */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 32,
            color: 'rgba(42,49,56,0.4)',
            marginBottom: 20,
          }}>
            ○
          </div>

          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 16,
            fontWeight: 500,
            color: 'rgba(232,234,237,0.5)',
            marginBottom: 8,
          }}>
            coming soon
          </div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 13,
            color: 'rgba(232,234,237,0.25)',
            maxWidth: 320,
            margin: '0 auto',
            lineHeight: 1.6,
          }}>
            this page will fill with real quotes as the community grows.
            nothing here until someone actually says it.
          </div>
        </div>
      </RevealBlock>
    </div>
  )
}

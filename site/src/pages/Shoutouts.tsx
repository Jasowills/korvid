import { RevealBlock } from '../hooks/useScrollReveal'

export function Shoutouts() {
  return (
    <div style={{ padding: '100px 48px', maxWidth: 720, margin: '0 auto' }}>
      <RevealBlock>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14,
        }}>
          Shoutouts
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          What people are saying
        </h1>
        <p style={{
          fontSize: 15, color: 'var(--text-secondary)',
          marginBottom: 56, lineHeight: 1.7,
        }}>
          Genuine community mentions will appear here as people use Korvid.
        </p>
      </RevealBlock>

      <RevealBlock delay={80}>
        <div style={{
          border: '1px dashed rgba(255,255,255,0.06)',
          borderRadius: 10,
          padding: '72px 32px',
          textAlign: 'center',
          background: 'rgba(13, 15, 18, 0.4)',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--border)',
            margin: '0 auto 18px',
          }} />
          <div style={{
            fontSize: 15, fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: 6,
          }}>
            Coming soon
          </div>
          <div style={{
            fontSize: 13, color: 'var(--text-muted)',
            maxWidth: 260, margin: '0 auto', lineHeight: 1.6,
          }}>
            Nothing here until someone actually says it.
          </div>
        </div>
      </RevealBlock>
    </div>
  )
}

import { Link } from 'react-router-dom'
import { Raven } from './Raven'

export function Footer() {
  return (
    <footer style={{
      position: 'relative',
      borderTop: '1px solid rgba(42,49,56,0.3)',
      padding: '48px',
    }}>
      <div style={{
        position: 'absolute',
        top: -1,
        left: '30%',
        right: '30%',
        height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(124,140,255,0.15), transparent)',
      }} />

      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        gap: 48,
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <Raven pose="asleep" size={48} />
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--color-bone)',
              marginBottom: 4,
            }}>
              korvid
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'rgba(232,234,237,0.25)',
              letterSpacing: '0.03em',
            }}>
              personal ai assistant
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 72 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-slate)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 14,
            }}>
              product
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { to: '/', label: 'home' },
                { to: '/integrations', label: 'integrations' },
                { to: '/shoutouts', label: 'shoutouts' },
              ].map(({ to, label }) => (
                <Link key={to} to={to} style={{
                  fontFamily: 'var(--font-body)',
                  fontSize: 13,
                  color: 'rgba(232,234,237,0.4)',
                  textDecoration: 'none',
                  transition: 'color 0.3s',
                }}>
                  {label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: 'var(--color-slate)',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              marginBottom: 14,
            }}>
              links
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a href="https://github.com/Jasowills/korvid" target="_blank" rel="noopener noreferrer" style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'rgba(232,234,237,0.4)',
                textDecoration: 'none',
                transition: 'color 0.3s',
              }}>
                github
              </a>
              <a href="https://github.com/Jasowills/korvid/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" style={{
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                color: 'rgba(232,234,237,0.4)',
                textDecoration: 'none',
                transition: 'color 0.3s',
              }}>
                license
              </a>
            </div>
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1100,
        margin: '32px auto 0',
        paddingTop: 20,
        borderTop: '1px solid rgba(42,49,56,0.2)',
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'rgba(232,234,237,0.15)',
        display: 'flex',
        justifyContent: 'space-between',
        letterSpacing: '0.05em',
      }}>
        <span>built on openclaw</span>
        <span>v0.1.0</span>
      </div>
    </footer>
  )
}

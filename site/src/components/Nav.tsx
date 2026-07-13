import { Link, useLocation } from 'react-router-dom'

const linkStyle = (active: boolean): React.CSSProperties => ({
  fontFamily: 'var(--font-mono)',
  fontSize: 13,
  color: active ? 'var(--color-sheen)' : 'var(--color-slate)',
  letterSpacing: '0.03em',
  transition: 'color 0.2s',
  textDecoration: 'none',
})

export function Nav() {
  const { pathname } = useLocation()

  return (
    <nav style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 40px',
      height: 56,
      background: 'rgba(18, 21, 26, 0.85)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-slate)',
    }}>
      <Link to="/" style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--color-bone)',
        letterSpacing: '-0.02em',
        textDecoration: 'none',
      }}>
        korvid
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link to="/integrations" style={linkStyle(pathname === '/integrations')}>
          integrations
        </Link>
        <Link to="/shoutouts" style={linkStyle(pathname === '/shoutouts')}>
          shoutouts
        </Link>
        <a
          href="https://github.com/Jasowills/korvid"
          target="_blank"
          rel="noopener noreferrer"
          style={linkStyle(false)}
        >
          github
        </a>
      </div>
    </nav>
  )
}

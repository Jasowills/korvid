import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'

export function Nav() {
  const { pathname } = useLocation()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
      padding: '0 48px',
      height: 56,
      background: scrolled ? 'rgba(18, 21, 26, 0.92)' : 'rgba(18, 21, 26, 0.6)',
      backdropFilter: 'blur(20px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      borderBottom: `1px solid ${scrolled ? 'rgba(42, 49, 56, 0.8)' : 'rgba(42, 49, 56, 0.3)'}`,
      transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    }}>
      <Link to="/" style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--color-bone)',
        letterSpacing: '-0.02em',
        textDecoration: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}>
        <span style={{
          display: 'inline-block',
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: 'var(--color-sheen)',
          boxShadow: '0 0 8px rgba(124,140,255,0.4)',
          animation: 'sheenPulse 3s ease-in-out infinite',
        }} />
        korvid
      </Link>

      <div style={{ display: 'flex', alignItems: 'center', gap: 36 }}>
        {[
          { to: '/integrations', label: 'integrations' },
          { to: '/shoutouts', label: 'shoutouts' },
        ].map(({ to, label }) => (
          <Link
            key={to}
            to={to}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              color: pathname === to ? 'var(--color-sheen)' : 'rgba(232,234,237,0.35)',
              letterSpacing: '0.04em',
              textDecoration: 'none',
              transition: 'color 0.3s',
              position: 'relative',
            }}
          >
            {label}
            {pathname === to && (
              <span style={{
                position: 'absolute',
                bottom: -4,
                left: 0,
                right: 0,
                height: 1,
                background: 'var(--color-sheen)',
                boxShadow: '0 0 8px rgba(124,140,255,0.5)',
              }} />
            )}
          </Link>
        ))}
        <a
          href="https://github.com/Jasowills/korvid"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'rgba(232,234,237,0.35)',
            letterSpacing: '0.04em',
            textDecoration: 'none',
            transition: 'color 0.3s',
          }}
        >
          github
        </a>
      </div>
    </nav>
  )
}

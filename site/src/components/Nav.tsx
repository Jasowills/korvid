import { Link, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Raven } from './Raven'

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
      background: scrolled ? 'rgba(18, 21, 26, 0.92)' : 'rgba(18, 21, 26, 0.5)',
      backdropFilter: 'blur(24px) saturate(1.3)',
      WebkitBackdropFilter: 'blur(24px) saturate(1.3)',
      borderBottom: `1px solid ${scrolled ? 'rgba(42, 49, 56, 0.7)' : 'rgba(42, 49, 56, 0.2)'}`,
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
        gap: 10,
      }}>
        <Raven pose="idle" size={24} />
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
            fontSize: 11,
            color: 'var(--color-bone)',
            letterSpacing: '0.04em',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '5px 12px',
            border: '1px solid rgba(42,49,56,0.5)',
            borderRadius: 5,
            background: 'rgba(28,33,38,0.4)',
            transition: 'all 0.3s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(124,140,255,0.3)'
            e.currentTarget.style.background = 'rgba(124,140,255,0.06)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(42,49,56,0.5)'
            e.currentTarget.style.background = 'rgba(28,33,38,0.4)'
          }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" fill="currentColor"/>
          </svg>
          star
        </a>
      </div>
    </nav>
  )
}

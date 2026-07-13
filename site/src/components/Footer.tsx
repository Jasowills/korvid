import { Link } from 'react-router-dom'

export function Footer() {
  return (
    <footer style={{
      borderTop: '1px solid var(--color-slate)',
      padding: '40px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 40,
      flexWrap: 'wrap',
    }}>
      <div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--color-bone)',
          marginBottom: 8,
        }}>
          korvid
        </div>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: 'var(--color-slate)',
        }}>
          personal ai assistant
        </div>
      </div>

      <div style={{ display: 'flex', gap: 64 }}>
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-slate)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 12,
          }}>
            product
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <Link to="/" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-bone)', opacity: 0.7, textDecoration: 'none' }}>home</Link>
            <Link to="/integrations" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-bone)', opacity: 0.7, textDecoration: 'none' }}>integrations</Link>
            <Link to="/shoutouts" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-bone)', opacity: 0.7, textDecoration: 'none' }}>shoutouts</Link>
          </div>
        </div>

        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-slate)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 12,
          }}>
            links
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <a href="https://github.com/Jasowills/korvid" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-bone)', opacity: 0.7, textDecoration: 'none' }}>github</a>
            <a href="https://github.com/Jasowills/korvid/blob/main/LICENSE" target="_blank" rel="noopener noreferrer" style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-bone)', opacity: 0.7, textDecoration: 'none' }}>license</a>
          </div>
        </div>
      </div>

      <div style={{
        width: '100%',
        paddingTop: 24,
        marginTop: 16,
        borderTop: '1px solid var(--color-slate)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        color: 'var(--color-slate)',
        display: 'flex',
        justifyContent: 'space-between',
      }}>
        <span>built on openclaw</span>
        <span>v0.1.0</span>
      </div>
    </footer>
  )
}

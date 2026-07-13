import { Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Integrations } from './pages/Integrations'
import { Shoutouts } from './pages/Shoutouts'
import { Nav } from './components/Nav'
import { Footer } from './components/Footer'

export function App() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Nav />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/integrations" element={<Integrations />} />
          <Route path="/shoutouts" element={<Shoutouts />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}

import { Routes, Route } from 'react-router-dom'
import { Landing } from './pages/Landing'
import { Integrations } from './pages/Integrations'
import { Shoutouts } from './pages/Shoutouts'
import { Nav } from './components/Nav'

export function App() {
  return (
    <div style={{ minHeight: '100vh' }}>
      <Nav />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/integrations" element={<Integrations />} />
        <Route path="/shoutouts" element={<Shoutouts />} />
      </Routes>
    </div>
  )
}

import { useState, useEffect, useRef } from 'react'

interface Integration {
  name: string
  category: string
  description: string
  status: 'built' | 'planned'
}

const integrations: Integration[] = [
  // Reasoning models
  { name: 'Ollama', category: 'reasoning', description: 'local models, no API key needed', status: 'built' },
  { name: 'Anthropic', category: 'reasoning', description: 'claude opus, sonnet, haiku', status: 'built' },
  { name: 'OpenAI', category: 'reasoning', description: 'gpt-4o, o1, o3', status: 'built' },
  { name: 'Google', category: 'reasoning', description: 'gemini 2.5 pro, flash', status: 'built' },
  { name: 'Groq', category: 'reasoning', description: 'fast inference, llama models', status: 'built' },
  { name: 'OpenRouter', category: 'reasoning', description: 'multi-model gateway', status: 'built' },

  // Speech-to-text
  { name: 'Local Whisper', category: 'speech-to-text', description: 'offline, no API key', status: 'built' },
  { name: 'Groq STT', category: 'speech-to-text', description: 'fast cloud transcription', status: 'built' },
  { name: 'Deepgram', category: 'speech-to-text', description: 'streaming + batch transcription', status: 'built' },

  // Text-to-speech
  { name: 'Local (macOS say)', category: 'text-to-speech', description: 'built-in, no API key', status: 'built' },
  { name: 'ElevenLabs', category: 'text-to-speech', description: 'high-quality neural voices', status: 'built' },
  { name: 'Cartesia', category: 'text-to-speech', description: 'low-latency streaming tts', status: 'built' },

  // Wake word
  { name: 'Porcupine', category: 'wake-word', description: 'on-device wake word detection', status: 'built' },
  { name: 'OpenWakeWord', category: 'wake-word', description: 'open-source wake word', status: 'built' },
  { name: 'Manual (Ctrl+K)', category: 'wake-word', description: 'keyboard trigger, always works', status: 'built' },

  // Messaging
  { name: 'WhatsApp', category: 'messaging', description: 'via WhatsApp Business API', status: 'built' },
  { name: 'Telegram', category: 'messaging', description: 'via Telegram Bot API', status: 'built' },

  // Calendar & Email
  { name: 'Google Calendar', category: 'calendar', description: 'read upcoming events', status: 'built' },
  { name: 'iCal', category: 'calendar', description: 'local calendar files', status: 'built' },
  { name: 'Gmail', category: 'email', description: 'read and summarize emails', status: 'built' },
  { name: 'IMAP', category: 'email', description: 'any imap-compatible provider', status: 'built' },

  // Coding agents
  { name: 'OpenCode', category: 'delegation', description: 'primary coding agent', status: 'built' },
  { name: 'Claude Code', category: 'delegation', description: 'alternative coding agent', status: 'built' },
]

const categories = [
  { key: 'reasoning', label: 'reasoning models' },
  { key: 'speech-to-text', label: 'speech-to-text' },
  { key: 'text-to-speech', label: 'text-to-speech' },
  { key: 'wake-word', label: 'wake word' },
  { key: 'messaging', label: 'messaging' },
  { key: 'calendar', label: 'calendar' },
  { key: 'email', label: 'email' },
  { key: 'delegation', label: 'delegation agents' },
]

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

export function Integrations() {
  return (
    <div style={{ padding: '120px 40px 80px', maxWidth: 960, margin: '0 auto' }}>
      <AnimatedSection>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--color-slate)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 16,
        }}>
          integrations
        </div>
        <h1 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(28px, 5vw, 40px)',
          fontWeight: 600,
          color: 'var(--color-bone)',
          marginBottom: 12,
        }}>
          what korvid connects to
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--color-slate)',
          marginBottom: 48,
          maxWidth: 560,
          lineHeight: 1.7,
        }}>
          every integration listed here is actually built and tested.
          this page updates as features ship.
        </p>
      </AnimatedSection>

      {categories.map((cat, catIdx) => {
        const items = integrations.filter(i => i.category === cat.key)
        if (items.length === 0) return null
        return (
          <AnimatedSection key={cat.key} delay={catIdx * 60}>
            <div style={{ marginBottom: 40 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--color-sheen)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 16,
                paddingBottom: 8,
                borderBottom: '1px solid var(--color-slate)',
              }}>
                {cat.label}
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 12,
              }}>
                {items.map(item => (
                  <div key={item.name} style={{
                    padding: '16px 20px',
                    background: 'var(--color-graphite)',
                    border: '1px solid var(--color-slate)',
                    borderRadius: 6,
                  }}>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 14,
                      fontWeight: 600,
                      color: 'var(--color-bone)',
                      marginBottom: 4,
                    }}>
                      {item.name}
                    </div>
                    <div style={{
                      fontFamily: 'var(--font-body)',
                      fontSize: 13,
                      color: 'var(--color-slate)',
                    }}>
                      {item.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </AnimatedSection>
        )
      })}
    </div>
  )
}

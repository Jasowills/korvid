import { useState } from 'react'
import { RevealBlock } from '../hooks/useScrollReveal.tsx'

interface Integration {
  name: string
  category: string
  description: string
  icon: string
}

const integrations: Integration[] = [
  { name: 'Ollama', category: 'reasoning', description: 'local models, no API key', icon: '◉' },
  { name: 'Anthropic', category: 'reasoning', description: 'claude opus, sonnet, haiku', icon: '◉' },
  { name: 'OpenAI', category: 'reasoning', description: 'gpt-4o, o1, o3', icon: '◉' },
  { name: 'Google', category: 'reasoning', description: 'gemini 2.5 pro, flash', icon: '◉' },
  { name: 'Groq', category: 'reasoning', description: 'fast inference, llama', icon: '◉' },
  { name: 'OpenRouter', category: 'reasoning', description: 'multi-model gateway', icon: '◉' },

  { name: 'Local Whisper', category: 'speech-to-text', description: 'offline transcription', icon: '◎' },
  { name: 'Groq STT', category: 'speech-to-text', description: 'fast cloud transcription', icon: '◎' },
  { name: 'Deepgram', category: 'speech-to-text', description: 'streaming + batch', icon: '◎' },

  { name: 'Local (macOS)', category: 'text-to-speech', description: 'built-in, no API key', icon: '◎' },
  { name: 'ElevenLabs', category: 'text-to-speech', description: 'neural voices', icon: '◎' },
  { name: 'Cartesia', category: 'text-to-speech', description: 'low-latency streaming', icon: '◎' },

  { name: 'Porcupine', category: 'wake-word', description: 'on-device detection', icon: '◇' },
  { name: 'OpenWakeWord', category: 'wake-word', description: 'open-source wake word', icon: '◇' },
  { name: 'Manual (Ctrl+K)', category: 'wake-word', description: 'keyboard trigger', icon: '◇' },

  { name: 'WhatsApp', category: 'messaging', description: 'Business API bridge', icon: '△' },
  { name: 'Telegram', category: 'messaging', description: 'Bot API bridge', icon: '△' },

  { name: 'Google Calendar', category: 'calendar', description: 'read upcoming events', icon: '□' },
  { name: 'iCal', category: 'calendar', description: 'local calendar files', icon: '□' },

  { name: 'Gmail', category: 'email', description: 'read and summarize', icon: '□' },
  { name: 'IMAP', category: 'email', description: 'any imap provider', icon: '□' },

  { name: 'OpenCode', category: 'delegation', description: 'primary coding agent', icon: '⬡' },
  { name: 'Claude Code', category: 'delegation', description: 'alternative agent', icon: '⬡' },
]

const categories = [
  { key: 'reasoning', label: 'reasoning models', count: 6 },
  { key: 'speech-to-text', label: 'speech-to-text', count: 3 },
  { key: 'text-to-speech', label: 'text-to-speech', count: 3 },
  { key: 'wake-word', label: 'wake word', count: 3 },
  { key: 'messaging', label: 'messaging', count: 2 },
  { key: 'calendar', label: 'calendar', count: 2 },
  { key: 'email', label: 'email', count: 2 },
  { key: 'delegation', label: 'delegation agents', count: 2 },
]

function IntegrationCard({ item, index }: { item: Integration; index: number }) {
  const [hovered, setHovered] = useState(false)

  return (
    <RevealBlock delay={index * 40}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          padding: '18px 20px',
          background: hovered ? 'rgba(28, 33, 38, 0.5)' : 'rgba(28, 33, 38, 0.2)',
          border: `1px solid ${hovered ? 'rgba(124,140,255,0.12)' : 'rgba(42,49,56,0.3)'}`,
          borderRadius: 6,
          transition: 'all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          cursor: 'default',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
        }}
      >
        <span style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          color: hovered ? 'var(--color-sheen)' : 'var(--color-slate)',
          transition: 'color 0.3s',
          marginTop: 2,
          flexShrink: 0,
        }}>
          {item.icon}
        </span>
        <div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--color-bone)',
            marginBottom: 3,
          }}>
            {item.name}
          </div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 12,
            color: 'rgba(232,234,237,0.35)',
          }}>
            {item.description}
          </div>
        </div>
      </div>
    </RevealBlock>
  )
}

export function Integrations() {
  return (
    <div style={{ padding: '120px 48px 100px', maxWidth: 960, margin: '0 auto' }}>
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
          integrations
        </div>
        <h1 style={{
          fontFamily: 'var(--font-body)',
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 600,
          color: 'var(--color-bone)',
          marginBottom: 12,
          letterSpacing: '-0.03em',
        }}>
          what korvid connects to
        </h1>
        <p style={{
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'rgba(232,234,237,0.4)',
          marginBottom: 64,
          maxWidth: 520,
          lineHeight: 1.7,
        }}>
          every integration listed here is built and tested.
          this page updates as features ship.
        </p>
      </RevealBlock>

      {/* Summary line */}
      <RevealBlock delay={100}>
        <div style={{
          display: 'flex',
          gap: 32,
          marginBottom: 56,
          paddingBottom: 24,
          borderBottom: '1px solid rgba(42,49,56,0.3)',
          flexWrap: 'wrap',
        }}>
          {categories.map(cat => (
            <div key={cat.key} style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: 6,
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 20,
                fontWeight: 600,
                color: 'var(--color-bone)',
              }}>
                {cat.count}
              </span>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-slate)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}>
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </RevealBlock>

      {categories.map((cat, catIdx) => {
        const items = integrations.filter(i => i.category === cat.key)
        return (
          <RevealBlock key={cat.key} delay={catIdx * 60}>
            <div style={{ marginBottom: 48 }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                color: 'var(--color-sheen)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 16,
                paddingBottom: 10,
                borderBottom: '1px solid rgba(42,49,56,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                <span style={{
                  width: 4,
                  height: 4,
                  borderRadius: '50%',
                  background: 'var(--color-sheen)',
                  opacity: 0.5,
                }} />
                {cat.label}
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--color-slate)',
                  marginLeft: 4,
                }}>
                  {cat.count}
                </span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
                gap: 10,
              }}>
                {items.map((item, i) => (
                  <IntegrationCard key={item.name} item={item} index={catIdx * 3 + i} />
                ))}
              </div>
            </div>
          </RevealBlock>
        )
      })}
    </div>
  )
}

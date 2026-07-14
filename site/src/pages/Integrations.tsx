import { useState } from 'react'
import { RevealBlock } from '../hooks/useScrollReveal'

interface Integration {
  name: string
  category: string
  description: string
  icon?: string
  iconSvg?: string
}

/* SVG brand icons — monochrome white */
const ICONS: Record<string, string> = {
  claude: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M4.709 15.955l4.72-8.647c.447-.816 1.278-1.308 2.163-1.308.885 0 1.716.492 2.163 1.308l4.72 8.647c.654 1.191-.162 2.645-1.404 2.645H6.113c-1.242 0-2.058-1.454-1.404-2.645zm5.29-5.533l2.472-4.512a.693.693 0 011.232 0l2.472 4.512H9.999z"/></svg>`,
  openai: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.282 9.821a5.985 5.985 0 00-.516-4.91 6.046 6.046 0 00-6.51-2.9A6.065 6.065 0 0014.98 2.1a5.985 5.985 0 00-3.998 2.9 6.046 6.046 0 00.743 7.097 5.98 5.98 0 00.51 4.911 6.051 6.051 0 006.515 2.9A5.985 5.985 0 0013.26 24a6.056 6.056 0 005.772-4.206 5.99 5.99 0 003.997-2.9 6.056 6.056 0 00-.747-7.073zM13.26 22.43a4.476 4.476 0 01-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 00.392-.681v-6.737l2.02 1.168a.071.071 0 01.038.052v5.583a4.504 4.504 0 01-4.494 4.494zM3.6 18.304a4.47 4.47 0 01-.535-3.014l.142.085 4.783 2.759a.771.771 0 00.78 0l5.843-3.369v2.332a.08.08 0 01-.033.062L9.74 19.95a4.5 4.5 0 01-6.14-1.646zM2.34 7.896a4.485 4.485 0 012.366-1.973V11.6a.766.766 0 00.388.676l5.815 3.355-2.02 1.168a.076.076 0 01-.071 0l-4.83-2.786A4.504 4.504 0 012.34 7.872zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 01.071 0l4.83 2.791a4.494 4.494 0 01-.676 8.105v-5.678a.79.79 0 00-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 00-.785 0L9.409 9.23V6.897a.066.066 0 01.028-.061l4.83-2.787a4.5 4.5 0 016.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 01-.038-.057V6.075a4.5 4.5 0 017.375-3.453l-.142.08L8.704 5.46a.795.795 0 00-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z"/></svg>`,
  google: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>`,
  ollama: `<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="5" r="2"/><circle cx="12" cy="19" r="2"/><circle cx="5" cy="8.5" r="2"/><circle cx="19" cy="8.5" r="2"/><circle cx="5" cy="15.5" r="2"/><circle cx="19" cy="15.5" r="2"/></svg>`,
  groq: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>`,
  openrouter: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  deepgram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14.5c-2.49 0-4.5-2.01-4.5-4.5S9.51 7.5 12 7.5s4.5 2.01 4.5 4.5-2.01 4.5-4.5 4.5zm0-5.5c-.55 0-1 .45-1 1s.45 1 1 1 1-.45 1-1-.45-1-1-1z"/></svg>`,
  elevenlabs: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 3v18M8 8v8M4 11v2M16 8v8M20 11v2"/></svg>`,
  cartesia: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>`,
  apple: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>`,
  porcupine: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2 4 4.5.5-3.25 3 .75 4.5L12 12l-4 2 .75-4.5L5.5 6.5 10 6z"/></svg>`,
  wave: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 12c1-3 3-5 5-5s4 5 5 5 3-5 5-5 4 2 5 5"/></svg>`,
  keyboard: `<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="20" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/><rect x="5" y="7" width="2" height="2" rx="0.5"/><rect x="9" y="7" width="2" height="2" rx="0.5"/><rect x="13" y="7" width="2" height="2" rx="0.5"/><rect x="17" y="7" width="2" height="2" rx="0.5"/><rect x="6" y="12" width="12" height="2" rx="0.5"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>`,
  telegram: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/></svg>`,
  gmail: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 010 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"/></svg>`,
  imap: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>`,
  opencode: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M9.4 16.6L4.8 12l4.6-4.6L8 6l-6 6 6 6 1.4-1.4zm5.2 0l4.6-4.6-4.6-4.6L16 6l6 6-6 6-1.4-1.4z"/></svg>`,
  mic: `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5z"/><path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>`,
}

const integrations: Integration[] = [
  { name: 'Claude', category: 'reasoning', description: 'Opus, Sonnet, Haiku', iconSvg: ICONS.claude },
  { name: 'GPT-4o', category: 'reasoning', description: 'OpenAI flagship', iconSvg: ICONS.openai },
  { name: 'Gemini', category: 'reasoning', description: 'Google 2.5 Pro, Flash', iconSvg: ICONS.google },
  { name: 'Ollama', category: 'reasoning', description: 'Local models, no API key', iconSvg: ICONS.ollama },
  { name: 'Groq', category: 'reasoning', description: 'Fast inference, Llama', iconSvg: ICONS.groq },
  { name: 'OpenRouter', category: 'reasoning', description: 'Multi-model gateway', iconSvg: ICONS.openrouter },
  { name: 'Deepgram', category: 'speech-to-text', description: 'Streaming + batch', iconSvg: ICONS.deepgram },
  { name: 'Local Whisper', category: 'speech-to-text', description: 'Offline transcription', iconSvg: ICONS.mic },
  { name: 'Groq STT', category: 'speech-to-text', description: 'Fast cloud transcription', iconSvg: ICONS.groq },
  { name: 'ElevenLabs', category: 'text-to-speech', description: 'Neural voices', iconSvg: ICONS.elevenlabs },
  { name: 'Cartesia', category: 'text-to-speech', description: 'Low-latency streaming', iconSvg: ICONS.cartesia },
  { name: 'macOS TTS', category: 'text-to-speech', description: 'Built-in, no API key', iconSvg: ICONS.apple },
  { name: 'Porcupine', category: 'wake-word', description: 'On-device detection', iconSvg: ICONS.porcupine },
  { name: 'OpenWakeWord', category: 'wake-word', description: 'Open-source wake word', iconSvg: ICONS.wave },
  { name: 'Keyboard', category: 'wake-word', description: 'Ctrl+K trigger', iconSvg: ICONS.keyboard },
  { name: 'WhatsApp', category: 'messaging', description: 'Business API bridge', iconSvg: ICONS.whatsapp },
  { name: 'Telegram', category: 'messaging', description: 'Bot API bridge', iconSvg: ICONS.telegram },
  { name: 'Google Calendar', category: 'calendar', description: 'Read upcoming events', iconSvg: ICONS.google },
  { name: 'iCal', category: 'calendar', description: 'Local calendar files', iconSvg: ICONS.apple },
  { name: 'Gmail', category: 'email', description: 'Read and summarize', iconSvg: ICONS.gmail },
  { name: 'IMAP', category: 'email', description: 'Any IMAP provider', iconSvg: ICONS.imap },
  { name: 'OpenCode', category: 'delegation', description: 'Primary coding agent', iconSvg: ICONS.opencode },
  { name: 'Claude Code', category: 'delegation', description: 'Alternative agent', iconSvg: ICONS.claude },
]

const categories = [
  { key: 'reasoning', label: 'Reasoning models' },
  { key: 'speech-to-text', label: 'Speech-to-text' },
  { key: 'text-to-speech', label: 'Text-to-speech' },
  { key: 'wake-word', label: 'Wake word' },
  { key: 'messaging', label: 'Messaging' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'email', label: 'Email' },
  { key: 'delegation', label: 'Delegation agents' },
]

function Card({ item }: { item: Integration }) {
  const [h, setH] = useState(false)
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: '14px 16px',
        background: h ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: `1px solid ${h ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
        borderRadius: 8,
        transition: 'all 0.2s',
        cursor: 'default',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      {item.iconSvg && (
        <div
          style={{
            width: 28,
            height: 28,
            flexShrink: 0,
            color: h ? 'var(--white)' : 'var(--text-muted)',
            transition: 'color 0.2s',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          dangerouslySetInnerHTML={{ __html: item.iconSvg.replace('<svg ', '<svg width="100%" height="100%" ') }}
        />
      )}
      <div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 2,
        }}>{item.name}</div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{item.description}</div>
      </div>
    </div>
  )
}

export function Integrations() {
  return (
    <div style={{ padding: '100px 48px', maxWidth: 960, margin: '0 auto' }}>
      <RevealBlock>
        <div style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14,
        }}>
          Integrations
        </div>
        <h1 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 5vw, 44px)',
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          Everything Korvid connects to
        </h1>
        <p style={{
          fontSize: 15, color: 'var(--text-secondary)',
          marginBottom: 56, maxWidth: 480, lineHeight: 1.7,
        }}>
          Every integration is built and tested. BYO API keys — nothing runs on our servers.
        </p>
      </RevealBlock>

      {categories.map((cat, ci) => {
        const items = integrations.filter(i => i.category === cat.key)
        return (
          <RevealBlock key={cat.key} delay={ci * 30}>
            <div style={{ marginBottom: 36 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em',
                marginBottom: 10, paddingBottom: 8,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                {cat.label}
                <span style={{ marginLeft: 8, opacity: 0.4 }}>{items.length}</span>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 8,
              }}>
                {items.map(item => <Card key={item.name} item={item} />)}
              </div>
            </div>
          </RevealBlock>
        )
      })}
    </div>
  )
}

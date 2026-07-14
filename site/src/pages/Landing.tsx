import { useState, useEffect } from 'react'
import { HeroScene } from '../components/HeroGraph'
import { JarvisHero } from '../components/JarvisHero'
import { SoundToggle } from '../components/SoundToggle'
import { GraphDemo } from '../components/GraphDemo'
import { RevealBlock } from '../hooks/useScrollReveal'

const INSTALL_CURL = 'curl -fsSL https://korvid.ai/install.sh | bash'
const INSTALL_NPM = 'npm install -g korvid'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      style={{
        background: 'transparent',
        border: `1px solid ${copied ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.08)'}`,
        color: copied ? 'var(--white)' : 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        padding: '5px 12px',
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.2s',
        letterSpacing: '0.03em',
        textTransform: 'uppercase',
        fontWeight: 500,
      }}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 11,
      color: 'var(--text-muted)',
      textTransform: 'uppercase',
      letterSpacing: '0.1em',
      marginBottom: 14,
    }}>
      {children}
    </div>
  )
}

function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'rgba(13, 15, 18, 0.5)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 12,
      ...style,
    }}>
      {children}
    </div>
  )
}

/* ─── Features ─── */
const FEATURES = [
  { icon: '◐', title: 'Voice-first interaction', desc: 'VAD-powered listening. Your choice of TTS. Interrupts gracefully when you speak. Clap-to-wake for hands-free activation.' },
  { icon: '●', title: 'Autonomous delegation', desc: 'Hands off coding tasks to sub-agents. Writes specs, runs sandboxed, tests its own output before showing you.' },
  { icon: '○', title: 'PC control', desc: 'Screenshots, clipboard, files, terminal, app management — all permission-gated. Nothing runs without your rules.' },
  { icon: '◆', title: 'Persistent memory', desc: 'Core facts, episodic events, relationship edges. Consolidates similar entries. Builds a knowledge graph over time.' },
  { icon: '⬡', title: 'Self-validation', desc: 'Simulate mode dry-runs changes against your test suite. Debrief reviews what happened. Auto-rollback on low confidence.' },
  { icon: '△', title: 'Safety by default', desc: 'Confirmation for deploys, deletes, spending, messaging. Budget caps. Deny-takes-precedence permission system.' },
  { icon: '□', title: 'Tool permissions', desc: 'Granular allow/deny rules per tool. Configure what Korvid can and cannot touch. Deny always wins.' },
  { icon: '▽', title: 'Context summarization', desc: 'Long conversations get compressed automatically. Keeps context window efficient without losing important details.' },
  { icon: '○', title: 'Proactive suggestions', desc: 'Learns your patterns. Suggests next steps, reminders, and automations based on what it observes.' },
  { icon: '◈', title: 'Calendar & email', desc: 'Read upcoming events, summarize inbox, draft responses. Google Calendar, iCal, Gmail, any IMAP provider.' },
  { icon: '◎', title: 'Task chaining', desc: 'Multi-step workflows. "Check my calendar, then email the team about the delay" — one command, multiple actions.' },
  { icon: '◇', title: 'Webhook triggers', desc: 'React to external events. GitHub pushes, form submissions, cron schedules — Korvid responds to your infrastructure.' },
]

function FeatureCard({ icon, title, desc, i }: { icon: string; title: string; desc: string; i: number }) {
  const [h, setH] = useState(false)
  return (
    <RevealBlock delay={i * 40}>
      <div
        onMouseEnter={() => setH(true)}
        onMouseLeave={() => setH(false)}
        style={{
          padding: '20px 18px',
          background: h ? 'rgba(255,255,255,0.03)' : 'transparent',
          border: `1px solid ${h ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
          borderRadius: 10,
          transition: 'all 0.2s',
          cursor: 'default',
        }}
      >
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 14,
          color: 'var(--sheen)',
          marginBottom: 10,
          opacity: h ? 1 : 0.35,
          transition: 'opacity 0.2s',
        }}>
          {icon}
        </div>
        <div style={{
          fontFamily: 'var(--font-display)',
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 5,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.6,
        }}>
          {desc}
        </div>
      </div>
    </RevealBlock>
  )
}

/* ─── Integrations ─── */
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

const INTEGRATIONS: { category: string; items: { name: string; desc: string; icon?: string }[] }[] = [
  { category: 'Reasoning', items: [
    { name: 'Claude', desc: 'Opus, Sonnet, Haiku', icon: ICONS.claude },
    { name: 'GPT-4o', desc: 'OpenAI flagship', icon: ICONS.openai },
    { name: 'Gemini', desc: 'Google 2.5 Pro, Flash', icon: ICONS.google },
    { name: 'Ollama', desc: 'Local models', icon: ICONS.ollama },
    { name: 'Groq', desc: 'Fast inference', icon: ICONS.groq },
    { name: 'OpenRouter', desc: 'Multi-model gateway', icon: ICONS.openrouter },
  ]},
  { category: 'Speech-to-text', items: [
    { name: 'Deepgram', desc: 'Streaming + batch', icon: ICONS.deepgram },
    { name: 'Whisper', desc: 'Offline transcription', icon: ICONS.mic },
    { name: 'Groq STT', desc: 'Fast cloud', icon: ICONS.groq },
  ]},
  { category: 'Text-to-speech', items: [
    { name: 'ElevenLabs', desc: 'Neural voices', icon: ICONS.elevenlabs },
    { name: 'Cartesia', desc: 'Low-latency', icon: ICONS.cartesia },
    { name: 'macOS TTS', desc: 'Built-in', icon: ICONS.apple },
  ]},
  { category: 'Wake word', items: [
    { name: 'Porcupine', desc: 'On-device', icon: ICONS.porcupine },
    { name: 'OpenWakeWord', desc: 'Open-source', icon: ICONS.wave },
    { name: 'Keyboard', desc: 'Ctrl+K', icon: ICONS.keyboard },
  ]},
  { category: 'Messaging', items: [
    { name: 'WhatsApp', desc: 'Business API', icon: ICONS.whatsapp },
    { name: 'Telegram', desc: 'Bot API', icon: ICONS.telegram },
  ]},
  { category: 'Productivity', items: [
    { name: 'Google Calendar', desc: 'Upcoming events', icon: ICONS.google },
    { name: 'iCal', desc: 'Local files', icon: ICONS.apple },
    { name: 'Gmail', desc: 'Read & summarize', icon: ICONS.gmail },
    { name: 'IMAP', desc: 'Any provider', icon: ICONS.imap },
  ]},
  { category: 'Delegation', items: [
    { name: 'OpenCode', desc: 'Primary agent', icon: ICONS.opencode },
    { name: 'Claude Code', desc: 'Alternative agent', icon: ICONS.claude },
  ]},
]

function IntegrationsSection() {
  return (
    <section style={{ padding: '80px 48px', maxWidth: 1000, margin: '0 auto' }}>
      <RevealBlock>
        <SectionLabel>Integrations</SectionLabel>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          Everything it connects to
        </h2>
        <p style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 48,
          maxWidth: 480,
          lineHeight: 1.7,
        }}>
          Every integration is built and tested. BYO API keys — nothing runs on our servers.
        </p>
      </RevealBlock>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 16,
      }}>
        {INTEGRATIONS.map((cat, ci) => (
          <RevealBlock key={cat.category} delay={ci * 40}>
            <GlassCard style={{ padding: '18px 20px' }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: '1px solid rgba(255,255,255,0.04)',
              }}>
                {cat.category}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {cat.items.map(item => (
                  <div key={item.name} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '3px 0',
                  }}>
                    {item.icon && (
                      <div
                        style={{
                          width: 18,
                          height: 18,
                          flexShrink: 0,
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        dangerouslySetInnerHTML={{ __html: item.icon.replace('<svg ', '<svg width="100%" height="100%" ') }}
                      />
                    )}
                    <div>
                      <span style={{
                        fontSize: 13,
                        fontWeight: 500,
                        color: 'var(--white)',
                      }}>{item.name}</span>
                      <span style={{
                        fontSize: 12,
                        color: 'var(--text-muted)',
                        marginLeft: 6,
                      }}>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </RevealBlock>
        ))}
      </div>
    </section>
  )
}

/* ─── Phone / Voice ─── */
function VoicePhoneSection() {
  return (
    <section style={{ padding: '80px 48px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1px 1fr', gap: '0 48px', alignItems: 'start' }}>
        <RevealBlock>
          <GlassCard style={{ padding: '28px 24px' }}>
            <SectionLabel>Voice pipeline</SectionLabel>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--white)',
              marginBottom: 14,
            }}>
              Speak to it. It speaks back.
            </h3>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 10 }}>VAD-powered listening with your choice of STT and TTS providers. Interrupts gracefully when you speak. Clap-to-wake for hands-free activation.</p>
              <p>Multi-turn conversation with 20-message history. Session persistence across restarts. Streaming reasoning tokens.</p>
            </div>
          </GlassCard>
        </RevealBlock>

        <div style={{
          width: 1, minHeight: 200,
          background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.06), transparent)',
        }} />

        <RevealBlock delay={80}>
          <GlassCard style={{ padding: '28px 24px' }}>
            <SectionLabel>Phone access</SectionLabel>
            <h3 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 22,
              fontWeight: 600,
              color: 'var(--white)',
              marginBottom: 14,
            }}>
              Reach it from anywhere.
            </h3>
            <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
              <p style={{ marginBottom: 10 }}>WhatsApp and Telegram bridges. Send a voice note, get a response. Calendar checks, reminders, quick questions — all from your phone.</p>
              <p>No app to install. Works with the messaging apps you already use.</p>
            </div>
          </GlassCard>
        </RevealBlock>
      </div>
    </section>
  )
}

/* ─── Graph demo ─── */
function GraphSection() {
  return (
    <section style={{ padding: '80px 48px', maxWidth: 1000, margin: '0 auto' }}>
      <RevealBlock>
        <SectionLabel>Memory graph</SectionLabel>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          What Korvid holds in mind
        </h2>
        <p style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 32,
          maxWidth: 520,
          lineHeight: 1.7,
        }}>
          This is a live representation of Korvid's memory graph — folders, tools, integrations, 
          and past context, all connected. Move your cursor to interact.
        </p>
      </RevealBlock>

      <RevealBlock delay={80}>
        <div style={{ height: 420 }}>
          <GraphDemo />
        </div>
      </RevealBlock>
    </section>
  )
}

/* ─── Install ─── */
function InstallSection() {
  const [method, setMethod] = useState<'curl' | 'npm'>('curl')
  const [glow, setGlow] = useState(false)
  const cmd = method === 'curl' ? INSTALL_CURL : INSTALL_NPM

  useEffect(() => {
    const i = setInterval(() => {
      setGlow(true)
      setTimeout(() => setGlow(false), 1500)
    }, 5000)
    return () => clearInterval(i)
  }, [])

  return (
    <section style={{ padding: '80px 48px', maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
      <RevealBlock>
        <SectionLabel>Get started</SectionLabel>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 28,
          letterSpacing: '-0.02em',
        }}>
          Install in one line
        </h2>

        {/* Method toggle */}
        <div style={{
          display: 'inline-flex',
          gap: 4,
          padding: 3,
          borderRadius: 8,
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: 20,
        }}>
          {(['curl', 'npm'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 11,
                fontWeight: 500,
                padding: '6px 16px',
                borderRadius: 6,
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                background: method === m ? 'rgba(255,255,255,0.08)' : 'transparent',
                color: method === m ? 'var(--white)' : 'var(--text-muted)',
              }}
            >
              {m}
            </button>
          ))}
        </div>

        <GlassCard style={{
          padding: '18px 22px',
          position: 'relative',
          overflow: 'hidden',
          borderColor: glow ? 'rgba(124,140,255,0.15)' : undefined,
          boxShadow: glow ? '0 0 40px rgba(124,140,255,0.05)' : undefined,
          transition: 'border-color 0.3s, box-shadow 0.3s',
        }}>
          {glow && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(124,140,255,0.2), transparent)',
              animation: 'scanline 1.5s linear',
            }} />
          )}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            flexWrap: 'wrap',
          }}>
            <code style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              color: 'var(--white)',
              userSelect: 'all',
            }}>
              {cmd}
            </code>
            <CopyButton text={cmd} />
          </div>
        </GlassCard>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-muted)',
          marginTop: 14,
        }}>
          requires Node.js 18+ · macOS, Linux, Windows
        </div>

        <div style={{
          marginTop: 24,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}>
          <GlassCard style={{ padding: '14px 16px', textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              Windows
            </div>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
              irm https://korvid.ai/install.ps1 | iex
            </code>
          </GlassCard>
          <GlassCard style={{ padding: '14px 16px', textAlign: 'left' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>
              After install
            </div>
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
              korvid init
            </code>
          </GlassCard>
        </div>
      </RevealBlock>
    </section>
  )
}

/* ─── How it works ─── */
function HowItWorks() {
  const steps = [
    { glyph: '◐', label: 'Wake', desc: 'Voice, keyboard, or message triggers Korvid' },
    { glyph: '▷', label: 'Listen', desc: 'STT transcribes your speech to text' },
    { glyph: '◆', label: 'Reason', desc: 'Multi-model brain processes your intent' },
    { glyph: '⬡', label: 'Act', desc: 'Tools, delegation, or integrations execute' },
    { glyph: '●', label: 'Respond', desc: 'TTS speaks back, or messages you directly' },
  ]

  return (
    <section style={{ padding: '80px 48px', maxWidth: 960, margin: '0 auto' }}>
      <RevealBlock>
        <SectionLabel>Architecture</SectionLabel>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          How it works
        </h2>
        <p style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 48,
          maxWidth: 460,
          lineHeight: 1.7,
        }}>
          Five stages. Every request flows through the full pipeline.
          No cloud dependency. Your machine runs the whole thing.
        </p>
      </RevealBlock>

      <div style={{
        display: 'flex',
        alignItems: 'stretch',
        gap: 0,
        overflowX: 'auto',
        padding: '0 0 20px',
      }}>
        {steps.map((step, i) => (
          <RevealBlock key={step.label} delay={i * 80}>
            <div style={{
              flex: '1 1 0',
              minWidth: 150,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              position: 'relative',
            }}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div style={{
                  position: 'absolute',
                  top: 28,
                  right: -1,
                  width: '100%',
                  height: 1,
                  background: 'linear-gradient(90deg, rgba(124,140,255,0.2), rgba(124,140,255,0.05))',
                  zIndex: 0,
                }} />
              )}

              <div style={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                border: '1px solid rgba(124,140,255,0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)',
                fontSize: 18,
                color: 'var(--sheen)',
                background: 'rgba(5,5,7,0.8)',
                marginBottom: 14,
                position: 'relative',
                zIndex: 1,
              }}>
                {step.glyph}
              </div>

              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 15,
                fontWeight: 600,
                color: 'var(--white)',
                marginBottom: 6,
              }}>
                {step.label}
              </div>
              <div style={{
                fontSize: 12,
                color: 'var(--text-muted)',
                lineHeight: 1.5,
                maxWidth: 140,
              }}>
                {step.desc}
              </div>
            </div>
          </RevealBlock>
        ))}
      </div>
    </section>
  )
}

/* ─── Self-validation ─── */
function SelfValidation() {
  const steps = [
    {
      num: '01',
      title: 'Simulate',
      desc: 'Dry-run changes against your test suite before touching production. See exactly what would happen without the risk.',
      glyph: '▷',
    },
    {
      num: '02',
      title: 'Debrief',
      desc: 'After every action, Korvid reviews what it did. Compares intent to outcome. Logs the full trace for your inspection.',
      glyph: '◎',
    },
    {
      num: '03',
      title: 'Auto-rollback',
      desc: 'Confidence too low? Changes automatically revert. Git checkpoints before every delegation. You approve before anything ships.',
      glyph: '⟲',
    },
  ]

  return (
    <section style={{ padding: '80px 48px', maxWidth: 960, margin: '0 auto' }}>
      <RevealBlock>
        <SectionLabel>Validation</SectionLabel>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          Trusts itself so you don't have to
        </h2>
        <p style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 48,
          maxWidth: 500,
          lineHeight: 1.7,
        }}>
          Korvid validates every action before it reaches your system.
          Three-layer safety net. Zero guesswork.
        </p>
      </RevealBlock>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: 12,
      }}>
        {steps.map((step, i) => (
          <RevealBlock key={step.num} delay={i * 60}>
            <div style={{
              padding: '28px 24px',
              border: '1px solid rgba(124,140,255,0.08)',
              borderRadius: 10,
              position: 'relative',
              overflow: 'hidden',
            }}>
              {/* Background glow */}
              <div style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 120,
                height: 120,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(124,140,255,0.06), transparent)',
                pointerEvents: 'none',
              }} />

              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--sheen)',
                letterSpacing: '0.1em',
                marginBottom: 12,
                opacity: 0.6,
              }}>
                {step.num}
              </div>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 22,
                color: 'var(--sheen)',
                marginBottom: 14,
                opacity: 0.5,
              }}>
                {step.glyph}
              </div>
              <div style={{
                fontFamily: 'var(--font-display)',
                fontSize: 18,
                fontWeight: 600,
                color: 'var(--white)',
                marginBottom: 10,
              }}>
                {step.title}
              </div>
              <div style={{
                fontSize: 13,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
              }}>
                {step.desc}
              </div>
            </div>
          </RevealBlock>
        ))}
      </div>
    </section>
  )
}

/* ─── Safety ─── */
function SafetySection() {
  const rules = [
    { icon: '⛔', label: 'Confirmation gates', desc: 'Deploys, deletes, spending, messaging — all require your explicit approval before execution.' },
    { icon: '◈', label: 'Budget caps', desc: 'Token limits, API call budgets, cost ceilings. Korvid stops before it exceeds your thresholds.' },
    { icon: '△', label: 'Deny wins', desc: 'Granular allow/deny rules per tool. When allow and deny conflict, deny always takes precedence.' },
    { icon: '◻', label: 'Path guardrails', desc: 'File system access blocked for /etc, /System, /usr/bin. Screenshots only to /tmp. No ambient capture.' },
    { icon: '●', label: 'Permission tiers', desc: 'Read-only, read-write, and destructive tiers. Each tool is categorized. You control what each tier can touch.' },
    { icon: '◯', label: 'WebSocket auth', desc: 'Token-based gateway authentication. No unauthenticated access to your system. Health endpoint excluded.' },
  ]

  return (
    <section style={{ padding: '80px 48px', maxWidth: 960, margin: '0 auto' }}>
      <RevealBlock>
        <SectionLabel>Safety</SectionLabel>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(28px, 4vw, 40px)',
          fontWeight: 600,
          color: 'var(--white)',
          marginBottom: 12,
          letterSpacing: '-0.02em',
        }}>
          Locked down by default
        </h2>
        <p style={{
          fontSize: 15,
          color: 'var(--text-secondary)',
          marginBottom: 48,
          maxWidth: 500,
          lineHeight: 1.7,
        }}>
          Safety is not a feature. It is the architecture.
          Every action passes through permission checks before execution.
        </p>
      </RevealBlock>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: 10,
      }}>
        {rules.map((rule, i) => (
          <RevealBlock key={rule.label} delay={i * 40}>
            <SafetyCard {...rule} />
          </RevealBlock>
        ))}
      </div>
    </section>
  )
}

function SafetyCard({ icon, label, desc }: { icon: string; label: string; desc: string }) {
  const [h, setH] = useState(false)
  return (
    <div
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        padding: '20px 18px',
        background: h ? 'rgba(255,255,255,0.03)' : 'transparent',
        border: `1px solid ${h ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'}`,
        borderRadius: 10,
        transition: 'all 0.2s',
        cursor: 'default',
      }}
    >
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 16,
        color: 'var(--sheen)',
        marginBottom: 10,
        opacity: h ? 1 : 0.4,
        transition: 'opacity 0.2s',
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: 15,
        fontWeight: 600,
        color: 'var(--white)',
        marginBottom: 5,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 13,
        color: 'var(--text-secondary)',
        lineHeight: 1.6,
      }}>
        {desc}
      </div>
    </div>
  )
}

/* ─── Open source ─── */
function OpenSourceSection() {
  return (
    <section style={{ padding: '80px 48px', maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
      <RevealBlock>
        <div style={{
          padding: '48px 40px',
          border: '1px solid rgba(124,140,255,0.08)',
          borderRadius: 12,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Background glow */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 300,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(124,140,255,0.04), transparent)',
            pointerEvents: 'none',
          }} />

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            marginBottom: 18,
          }}>
            Open source
          </div>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(24px, 3.5vw, 34px)',
            fontWeight: 600,
            color: 'var(--white)',
            marginBottom: 14,
            letterSpacing: '-0.02em',
          }}>
            Built in the open
          </h2>
          <p style={{
            fontSize: 15,
            color: 'var(--text-secondary)',
            lineHeight: 1.7,
            marginBottom: 28,
            maxWidth: 440,
            margin: '0 auto 28px',
          }}>
            Korvid is open source. Read the code, fork it, contribute.
            Your AI assistant should be as transparent as the tools it uses.
          </p>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <a
              href="https://github.com/Jasowills/korvid"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '10px 20px',
                border: '1px solid rgba(124,140,255,0.2)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--white)',
                textDecoration: 'none',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'rgba(124,140,255,0.4)'
                e.currentTarget.style.background = 'rgba(124,140,255,0.06)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'rgba(124,140,255,0.2)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              View on GitHub
            </a>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--text-muted)',
            }}>
              MIT License
            </span>
          </div>
        </div>
      </RevealBlock>
    </section>
  )
}

/* ─── Main ─── */
export function Landing() {
  return (
    <>
      <SoundToggle />

      {/* ═══════════ HERO ═══════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        overflow: 'hidden',
      }}>
        <HeroScene />
        <JarvisHero />

        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 120,
          background: 'linear-gradient(transparent, var(--bg))',
          pointerEvents: 'none',
          zIndex: 3,
        }} />
      </section>

      {/* ═══════════ HOW IT WORKS ═══════════ */}
      <HowItWorks />

      {/* ═══════════ CAPABILITIES ═══════════ */}
      <section style={{ padding: '80px 48px', maxWidth: 1060, margin: '0 auto' }}>
        <RevealBlock>
          <SectionLabel>Capabilities</SectionLabel>
          <h2 style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 600,
            color: 'var(--white)',
            marginBottom: 44,
            letterSpacing: '-0.02em',
          }}>
            Built for builders
          </h2>
        </RevealBlock>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 10,
        }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} {...f} i={i} />
          ))}
        </div>
      </section>

      {/* ═══════════ SELF-VALIDATION ═══════════ */}
      <SelfValidation />

      {/* ═══════════ GRAPH DEMO ═══════════ */}
      <GraphSection />

      {/* ═══════════ SAFETY ═══════════ */}
      <SafetySection />

      {/* ═══════════ INTEGRATIONS ═══════════ */}
      <IntegrationsSection />

      {/* ═══════════ VOICE + PHONE ═══════════ */}
      <VoicePhoneSection />

      {/* ═══════════ INSTALL ═══════════ */}
      <InstallSection />

      {/* ═══════════ OPEN SOURCE ═══════════ */}
      <OpenSourceSection />

      {/* ═══════════ FOOTER ═══════════ */}
      <footer style={{
        borderTop: '1px solid rgba(255,255,255,0.04)',
        padding: '36px 48px',
        maxWidth: 1000,
        margin: '40px auto 0',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 20,
        }}>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--white)',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%',
              background: 'var(--text-muted)',
            }} />
            Korvid
          </div>
          <div style={{ display: 'flex', gap: 28 }}>
            <a href="https://github.com/Jasowills/korvid" target="_blank" rel="noopener noreferrer" style={{
              fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500,
              color: 'var(--text-muted)',
            }}>
              GitHub
            </a>
            <span style={{
              fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)',
            }}>
              v0.1.0
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}

import { useState, useEffect, useRef } from 'react'
import { HeroGraph } from '../components/HeroGraph'

const installCmd = 'curl -fsSL https://korvid.ai/install.sh | bash'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      style={{
        background: 'none',
        border: `1px solid var(--color-slate)`,
        color: copied ? 'var(--color-sheen)' : 'var(--color-slate)',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        padding: '6px 12px',
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 0.2s',
        whiteSpace: 'nowrap',
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
      color: 'var(--color-slate)',
      textTransform: 'uppercase',
      letterSpacing: '0.12em',
      marginBottom: 16,
    }}>
      {children}
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{
      padding: '24px 0',
      borderTop: '1px solid var(--color-slate)',
    }}>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: 16,
        color: 'var(--color-sheen)',
        marginBottom: 8,
      }}>
        {icon}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 16,
        fontWeight: 600,
        color: 'var(--color-bone)',
        marginBottom: 8,
      }}>
        {title}
      </div>
      <div style={{
        fontFamily: 'var(--font-body)',
        fontSize: 14,
        color: 'var(--color-slate)',
        lineHeight: 1.6,
        maxWidth: 400,
      }}>
        {description}
      </div>
    </div>
  )
}

function AnimatedSection({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.15 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(24px)',
        transition: `opacity 0.7s ease-out ${delay}ms, transform 0.7s ease-out ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

export function Landing() {
  return (
    <>
      {/* ── Hero ────────────────────────────────────────────── */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 40px 80px',
        overflow: 'hidden',
      }}>
        <HeroGraph />

        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 680 }}>
          {/* Wordmark */}
          <h1 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(48px, 8vw, 80px)',
            fontWeight: 600,
            letterSpacing: '-0.04em',
            color: 'var(--color-bone)',
            marginBottom: 24,
            lineHeight: 1,
          }}>
            korvid
          </h1>

          {/* Tagline */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(16px, 2.5vw, 20px)',
            color: 'var(--color-slate)',
            lineHeight: 1.6,
            marginBottom: 48,
            maxWidth: 520,
            margin: '0 auto 48px',
          }}>
            self-hosted, voice-first personal ai assistant.
            <br />
            delegates work. controls your pc. validates its own output.
          </p>

          {/* Install command */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--color-graphite)',
            border: '1px solid var(--color-slate)',
            borderRadius: 8,
            padding: '12px 20px',
            marginBottom: 16,
          }}>
            <span style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              color: 'var(--color-sheen)',
              userSelect: 'all',
            }}>
              {installCmd}
            </span>
            <CopyButton text={installCmd} />
          </div>

          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 12,
            color: 'var(--color-slate)',
          }}>
            requires node.js 18+ · macOS, linux, windows
          </div>
        </div>

        {/* Bottom fade */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: 'linear-gradient(transparent, var(--color-obsidian))',
          pointerEvents: 'none',
        }} />
      </section>

      {/* ── Quick Start ─────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', maxWidth: 720, margin: '0 auto' }}>
        <AnimatedSection>
          <SectionLabel>quick start</SectionLabel>
          <h2 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--color-bone)',
            marginBottom: 32,
          }}>
            install in one line
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div style={{
            background: 'var(--color-graphite)',
            border: '1px solid var(--color-slate)',
            borderRadius: 8,
            padding: 20,
            marginBottom: 24,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-slate)',
              marginBottom: 8,
            }}>
              macOS / linux
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              color: 'var(--color-sheen)',
              userSelect: 'all',
            }}>
              {installCmd}
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={200}>
          <div style={{
            background: 'var(--color-graphite)',
            border: '1px solid var(--color-slate)',
            borderRadius: 8,
            padding: 20,
            marginBottom: 32,
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-slate)',
              marginBottom: 8,
            }}>
              windows (powershell)
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              color: 'var(--color-sheen)',
              userSelect: 'all',
            }}>
              irm https://korvid.ai/install.ps1 | iex
            </div>
          </div>
        </AnimatedSection>

        <AnimatedSection delay={300}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'var(--color-slate)',
            lineHeight: 1.7,
          }}>
            <p style={{ marginBottom: 12 }}>
              the installer checks for node.js, sets up pnpm, and installs the korvid CLI.
              after install, run <code style={{
                background: 'var(--color-graphite)',
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: 13,
                color: 'var(--color-sheen)',
              }}>korvid init</code> — it walks you through provider keys, voice setup, and memory configuration.
            </p>
            <p>
              everything lives in <code style={{
                background: 'var(--color-graphite)',
                padding: '2px 6px',
                borderRadius: 3,
                fontSize: 13,
                color: 'var(--color-sheen)',
              }}>~/.korvid/</code>. your data, your machine, your keys.
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section style={{ padding: '80px 40px', maxWidth: 1100, margin: '0 auto' }}>
        <AnimatedSection>
          <SectionLabel>what it does</SectionLabel>
          <h2 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--color-bone)',
            marginBottom: 48,
          }}>
            built for builders
          </h2>
        </AnimatedSection>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '0 48px',
        }}>
          <AnimatedSection delay={0}>
            <FeatureCard
              icon="◐"
              title="voice-first interaction"
              description="talk to it naturally. it listens with VAD, responds with your chosen TTS provider, and interrupts gracefully when you speak."
            />
          </AnimatedSection>
          <AnimatedSection delay={80}>
            <FeatureCard
              icon="●"
              title="delegates coding work"
              description="hand off a build, it picks an agent, writes the spec, runs it in a sandbox, and tests its own work before showing you the result."
            />
          </AnimatedSection>
          <AnimatedSection delay={160}>
            <FeatureCard
              icon="○"
              title="controls your PC"
              description="screenshots, clipboard, file management, terminal commands, app control — all permission-gated, nothing runs without your rules."
            />
          </AnimatedSection>
          <AnimatedSection delay={240}>
            <FeatureCard
              icon="◆"
              title="remembers everything"
              description="core facts, episodic memories, relationship edges. consolidates similar entries. builds a graph of what it knows about your work."
            />
          </AnimatedSection>
          <AnimatedSection delay={320}>
            <FeatureCard
              icon="⬡"
              title="validates itself"
              description="simulate mode dry-runs changes against your test suite. debrief mode reviews what happened. auto-rollback reverts if confidence is low."
            />
          </AnimatedSection>
          <AnimatedSection delay={400}>
            <FeatureCard
              icon="△"
              title="safety by default"
              description="confirmation for deploys, deletes, spending, messaging. budget caps. tool permissions with deny-takes-precedence. no ambient capture."
            />
          </AnimatedSection>
        </div>
      </section>

      {/* ── How it's different ──────────────────────────────── */}
      <section style={{ padding: '80px 40px', maxWidth: 720, margin: '0 auto' }}>
        <AnimatedSection>
          <SectionLabel>how it's different</SectionLabel>
          <h2 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--color-bone)',
            marginBottom: 32,
          }}>
            built on openclaw, not a fork of it
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'var(--color-slate)',
            lineHeight: 1.8,
          }}>
            <p style={{ marginBottom: 16 }}>
              openclaw is the foundation — the runtime, the sandbox, the agent execution layer.
              korvid sits on top of it as a single, unified assistant with its own voice pipeline,
              memory system, tool permissions, and delegation logic.
            </p>
            <p style={{ marginBottom: 16 }}>
              where openclaw is a chat-first bot framework, korvid is voice-first with real
              autonomous validation. it doesn't just run code — it tests its own work,
              estimates risk, and rolls back when it's not confident.
            </p>
            <p>
              openclaw handles the hard parts of sandboxed execution.
              korvid handles the hard parts of being useful.
            </p>
          </div>
        </AnimatedSection>
      </section>

      {/* ── Testimonials placeholder ────────────────────────── */}
      <section style={{ padding: '80px 40px', maxWidth: 720, margin: '0 auto' }}>
        <AnimatedSection>
          <SectionLabel>shoutouts</SectionLabel>
          <h2 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 28,
            fontWeight: 600,
            color: 'var(--color-bone)',
            marginBottom: 16,
          }}>
            what people are saying
          </h2>
        </AnimatedSection>

        <AnimatedSection delay={100}>
          <div style={{
            border: '1px dashed var(--color-slate)',
            borderRadius: 8,
            padding: '48px 32px',
            textAlign: 'center',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 14,
              color: 'var(--color-slate)',
              marginBottom: 8,
            }}>
              ○
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 14,
              color: 'var(--color-slate)',
            }}>
              no testimonials yet. this section will fill with real quotes as people use korvid.
            </div>
          </div>
        </AnimatedSection>
      </section>
    </>
  )
}

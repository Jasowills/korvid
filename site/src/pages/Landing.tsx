import { useState, useEffect, useRef } from 'react'
import { HeroGraph } from '../components/HeroGraph'
import { RevealBlock } from '../hooks/useScrollReveal'

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
        background: copied ? 'rgba(124,140,255,0.1)' : 'transparent',
        border: `1px solid ${copied ? 'rgba(124,140,255,0.3)' : 'var(--color-slate)'}`,
        color: copied ? 'var(--color-sheen)' : 'var(--color-slate)',
        fontFamily: 'var(--font-mono)',
        fontSize: 11,
        padding: '6px 14px',
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 0.3s',
        whiteSpace: 'nowrap',
        letterSpacing: '0.05em',
        textTransform: 'uppercase',
      }}
    >
      {copied ? '● copied' : 'copy'}
    </button>
  )
}

function SectionTag({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 8,
      fontFamily: 'var(--font-mono)',
      fontSize: 10,
      color: 'var(--color-sheen)',
      textTransform: 'uppercase',
      letterSpacing: '0.15em',
      marginBottom: 20,
      opacity: 0.7,
    }}>
      <span style={{
        width: 16,
        height: 1,
        background: 'var(--color-sheen)',
        opacity: 0.4,
      }} />
      {children}
    </div>
  )
}

function FeatureCard({
  glyph,
  title,
  description,
  index,
}: {
  glyph: string
  title: string
  description: string
  index: number
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <RevealBlock delay={index * 80}>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          position: 'relative',
          padding: '32px 28px',
          background: hovered ? 'rgba(28, 33, 38, 0.6)' : 'transparent',
          border: `1px solid ${hovered ? 'rgba(124,140,255,0.15)' : 'rgba(42,49,56,0.4)'}`,
          borderRadius: 8,
          transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          cursor: 'default',
          overflow: 'hidden',
        }}
      >
        {/* Corner accent */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: hovered ? 40 : 0,
          height: 1,
          background: 'var(--color-sheen)',
          transition: 'width 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 1,
          height: hovered ? 40 : 0,
          background: 'var(--color-sheen)',
          transition: 'height 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }} />

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 18,
          color: 'var(--color-sheen)',
          marginBottom: 16,
          opacity: hovered ? 1 : 0.6,
          transition: 'opacity 0.3s',
        }}>
          {glyph}
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 16,
          fontWeight: 600,
          color: 'var(--color-bone)',
          marginBottom: 10,
          letterSpacing: '-0.01em',
        }}>
          {title}
        </div>
        <div style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: 'rgba(232,234,237,0.45)',
          lineHeight: 1.7,
        }}>
          {description}
        </div>
      </div>
    </RevealBlock>
  )
}

function ComparisonBlock() {
  return (
    <RevealBlock>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1px 1fr',
        gap: '0 48px',
        alignItems: 'start',
      }}>
        {/* Left: Korvid */}
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-sheen)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 16,
          }}>
            korvid
          </div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'rgba(232,234,237,0.6)',
            lineHeight: 1.8,
          }}>
            voice-first. autonomous validation. self-hosted. built on openclaw's
            execution layer with its own memory, delegation, and safety systems.
          </div>
        </div>

        {/* Divider */}
        <div style={{
          width: 1,
          height: '100%',
          minHeight: 80,
          background: 'linear-gradient(to bottom, transparent, var(--color-slate), transparent)',
        }} />

        {/* Right: openclaw */}
        <div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-slate)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            marginBottom: 16,
          }}>
            openclaw
          </div>
          <div style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'rgba(232,234,237,0.35)',
            lineHeight: 1.8,
          }}>
            chat-first bot framework. sandboxed execution. the foundation korvid
            is built on — handles the hard parts of running code safely.
          </div>
        </div>
      </div>
    </RevealBlock>
  )
}

function InstallMoment() {
  const [glowing, setGlowing] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => {
      setGlowing(true)
      setTimeout(() => setGlowing(false), 2000)
    }, 6000)
    return () => clearInterval(interval)
  }, [])

  return (
    <RevealBlock>
      <div style={{
        position: 'relative',
        background: 'var(--color-graphite)',
        border: `1px solid ${glowing ? 'rgba(124,140,255,0.25)' : 'var(--color-slate)'}`,
        borderRadius: 12,
        padding: '28px 32px',
        transition: 'border-color 0.6s',
        boxShadow: glowing ? '0 0 60px rgba(124,140,255,0.08)' : 'none',
      }}>
        {/* Scanline effect on glow */}
        {glowing && (
          <div style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 12,
            overflow: 'hidden',
            pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background: 'linear-gradient(90deg, transparent, rgba(124,140,255,0.3), transparent)',
              animation: 'scanline 2s linear',
            }} />
          </div>
        )}

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--color-slate)',
          textTransform: 'uppercase',
          letterSpacing: '0.12em',
          marginBottom: 12,
        }}>
          install
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}>
          <code style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 15,
            color: 'var(--color-sheen)',
            userSelect: 'all',
            letterSpacing: '-0.01em',
          }}>
            {installCmd}
          </code>
          <CopyButton text={installCmd} />
        </div>

        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'rgba(232,234,237,0.25)',
          marginTop: 12,
        }}>
          requires node.js 18+ · macos, linux, windows
        </div>
      </div>
    </RevealBlock>
  )
}

export function Landing() {
  const [heroVisible, setHeroVisible] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setHeroVisible(true), 200)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {/* ═══════════════════════════════════════════════════════ HERO */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '120px 48px 100px',
        overflow: 'hidden',
      }}>
        <HeroGraph />

        <div style={{
          position: 'relative',
          zIndex: 1,
          textAlign: 'center',
          maxWidth: 740,
          opacity: heroVisible ? 1 : 0,
          transform: heroVisible ? 'none' : 'translateY(30px)',
          transition: 'all 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}>
          {/* Status line */}
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--color-slate)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
            marginBottom: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}>
            <span style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: 'var(--color-sheen)',
              boxShadow: '0 0 8px rgba(124,140,255,0.5)',
              animation: 'sheenPulse 3s ease-in-out infinite',
            }} />
            system operational
          </div>

          {/* Wordmark — massive */}
          <h1 style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(64px, 12vw, 120px)',
            fontWeight: 600,
            letterSpacing: '-0.06em',
            color: 'var(--color-bone)',
            marginBottom: 28,
            lineHeight: 0.9,
            position: 'relative',
          }}>
            korvid
            {/* Sheen underline accent */}
            <span style={{
              position: 'absolute',
              bottom: -4,
              left: '50%',
              transform: 'translateX(-50%)',
              width: heroVisible ? 60 : 0,
              height: 2,
              background: 'var(--color-sheen)',
              boxShadow: '0 0 20px rgba(124,140,255,0.4)',
              transition: 'width 1.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) 0.8s',
            }} />
          </h1>

          {/* Tagline */}
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(16px, 2.2vw, 20px)',
            color: 'rgba(232,234,237,0.5)',
            lineHeight: 1.7,
            marginBottom: 56,
            maxWidth: 480,
            margin: '0 auto 56px',
          }}>
            self-hosted, voice-first personal ai assistant.
            <br />
            <span style={{ color: 'rgba(232,234,237,0.7)' }}>
              delegates work. controls your pc. validates its own output.
            </span>
          </p>

          {/* Install command */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(28, 33, 38, 0.7)',
            border: '1px solid rgba(42, 49, 56, 0.5)',
            borderRadius: 8,
            padding: '14px 20px',
            backdropFilter: 'blur(8px)',
            animation: heroVisible ? 'sheenGlow 6s ease-in-out infinite' : 'none',
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
            fontSize: 11,
            color: 'rgba(232,234,237,0.2)',
            marginTop: 16,
            letterSpacing: '0.05em',
          }}>
            requires node.js 18+ · macOS, linux, windows
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{
          position: 'absolute',
          bottom: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
          opacity: heroVisible ? 0.3 : 0,
          transition: 'opacity 1s ease-out 1.5s',
          animation: 'drift 3s ease-in-out infinite',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            color: 'var(--color-slate)',
            letterSpacing: '0.15em',
            textTransform: 'uppercase',
          }}>
            scroll
          </div>
          <div style={{
            width: 1,
            height: 24,
            background: 'linear-gradient(to bottom, var(--color-slate), transparent)',
          }} />
        </div>

        {/* Bottom gradient */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 200,
          background: 'linear-gradient(transparent, var(--color-obsidian))',
          pointerEvents: 'none',
        }} />
      </section>

      {/* ═══════════════════════════════════════════════════ QUICK START */}
      <section style={{
        padding: '100px 48px',
        maxWidth: 720,
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Diagonal accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: -100,
          width: 1,
          height: '100%',
          background: 'linear-gradient(to bottom, transparent, rgba(124,140,255,0.08), transparent)',
          transform: 'rotate(5deg)',
          pointerEvents: 'none',
        }} />

        <RevealBlock>
          <SectionTag>01 — quick start</SectionTag>
          <h2 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 600,
            color: 'var(--color-bone)',
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            install in one line
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'rgba(232,234,237,0.4)',
            marginBottom: 40,
          }}>
            the installer handles everything. you handle the configuration.
          </p>
        </RevealBlock>

        <RevealBlock delay={100}>
          <InstallMoment />
        </RevealBlock>

        <RevealBlock delay={200}>
          <div style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 16,
          }}>
            <div style={{
              background: 'var(--color-graphite)',
              border: '1px solid rgba(42,49,56,0.4)',
              borderRadius: 8,
              padding: '16px 20px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-slate)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}>
                windows
              </div>
              <code style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'rgba(124,140,255,0.7)',
              }}>
                irm https://korvid.ai/install.ps1 | iex
              </code>
            </div>

            <div style={{
              background: 'var(--color-graphite)',
              border: '1px solid rgba(42,49,56,0.4)',
              borderRadius: 8,
              padding: '16px 20px',
            }}>
              <div style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 10,
                color: 'var(--color-slate)',
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                marginBottom: 8,
              }}>
                after install
              </div>
              <code style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 13,
                color: 'rgba(124,140,255,0.7)',
              }}>
                korvid init
              </code>
            </div>
          </div>
        </RevealBlock>

        <RevealBlock delay={300}>
          <div style={{
            marginTop: 32,
            fontFamily: 'var(--font-body)',
            fontSize: 14,
            color: 'rgba(232,234,237,0.35)',
            lineHeight: 1.8,
          }}>
            <code style={{
              background: 'rgba(28,33,38,0.6)',
              padding: '2px 8px',
              borderRadius: 3,
              fontSize: 13,
              color: 'rgba(124,140,255,0.6)',
            }}>korvid init</code> walks you through provider keys, voice setup, and memory configuration.
            everything lives in <code style={{
              background: 'rgba(28,33,38,0.6)',
              padding: '2px 8px',
              borderRadius: 3,
              fontSize: 13,
              color: 'rgba(124,140,255,0.6)',
            }}>~/.korvid/</code>.
            your data. your machine. your keys.
          </div>
        </RevealBlock>
      </section>

      {/* ═══════════════════════════════════════════════════ FEATURES */}
      <section style={{
        padding: '100px 48px',
        maxWidth: 1100,
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Background accent */}
        <div style={{
          position: 'absolute',
          top: '20%',
          right: -200,
          width: 400,
          height: 400,
          background: 'radial-gradient(ellipse at center, rgba(124,140,255,0.03) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <RevealBlock>
          <SectionTag>02 — capabilities</SectionTag>
          <h2 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 600,
            color: 'var(--color-bone)',
            marginBottom: 12,
            letterSpacing: '-0.02em',
          }}>
            built for builders
          </h2>
          <p style={{
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'rgba(232,234,237,0.4)',
            marginBottom: 56,
          }}>
            every feature is something you can actually use today.
          </p>
        </RevealBlock>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: 16,
        }}>
          <FeatureCard
            glyph="◐"
            title="voice-first interaction"
            description="talk to it naturally. VAD listens, your chosen TTS responds, it interrupts gracefully when you speak. no wake word required."
            index={0}
          />
          <FeatureCard
            glyph="●"
            title="delegates coding work"
            description="hand off a build. it picks an agent, writes the spec, runs it sandboxed, and tests its own work before showing you."
            index={1}
          />
          <FeatureCard
            glyph="○"
            title="controls your PC"
            description="screenshots, clipboard, files, terminal, apps — all permission-gated. nothing runs without your rules."
            index={2}
          />
          <FeatureCard
            glyph="◆"
            title="remembers everything"
            description="core facts, episodic memories, relationship edges. consolidates similar entries. builds a graph of what it knows."
            index={3}
          />
          <FeatureCard
            glyph="⬡"
            title="validates itself"
            description="simulate mode dry-runs changes against your test suite. debrief reviews what happened. auto-rollback reverts if confidence is low."
            index={4}
          />
          <FeatureCard
            glyph="△"
            title="safety by default"
            description="confirmation for deploys, deletes, spending, messaging. budget caps. deny-takes-precedence permissions. no ambient capture."
            index={5}
          />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════ HOW IT'S DIFFERENT */}
      <section style={{
        padding: '100px 48px',
        maxWidth: 800,
        margin: '0 auto',
        position: 'relative',
      }}>
        {/* Subtle horizontal rule */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(42,49,56,0.4), transparent)',
        }} />

        <RevealBlock>
          <SectionTag>03 — positioning</SectionTag>
          <h2 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 600,
            color: 'var(--color-bone)',
            marginBottom: 40,
            letterSpacing: '-0.02em',
          }}>
            built on openclaw, not a fork of it
          </h2>
        </RevealBlock>

        <ComparisonBlock />

        <RevealBlock delay={100}>
          <div style={{
            marginTop: 48,
            fontFamily: 'var(--font-body)',
            fontSize: 15,
            color: 'rgba(232,234,237,0.4)',
            lineHeight: 1.8,
          }}>
            <p style={{ marginBottom: 16 }}>
              openclaw handles the hard parts of sandboxed execution.
            </p>
            <p>
              <span style={{ color: 'rgba(232,234,237,0.65)' }}>
                korvid handles the hard parts of being useful.
              </span>
            </p>
          </div>
        </RevealBlock>
      </section>

      {/* ═══════════════════════════════════════════════════ TESTIMONIALS */}
      <section style={{
        padding: '100px 48px',
        maxWidth: 720,
        margin: '0 auto',
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          left: '10%',
          right: '10%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(42,49,56,0.4), transparent)',
        }} />

        <RevealBlock>
          <SectionTag>04 — community</SectionTag>
          <h2 style={{
            fontFamily: 'var(--font-body)',
            fontSize: 'clamp(28px, 4vw, 36px)',
            fontWeight: 600,
            color: 'var(--color-bone)',
            marginBottom: 40,
            letterSpacing: '-0.02em',
          }}>
            what people are saying
          </h2>
        </RevealBlock>

        <RevealBlock delay={100}>
          <div style={{
            border: '1px dashed rgba(42,49,56,0.5)',
            borderRadius: 8,
            padding: '64px 32px',
            textAlign: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Corner marks */}
            <div style={{
              position: 'absolute',
              top: 12,
              left: 12,
              width: 12,
              height: 12,
              borderTop: '1px solid rgba(124,140,255,0.2)',
              borderLeft: '1px solid rgba(124,140,255,0.2)',
            }} />
            <div style={{
              position: 'absolute',
              bottom: 12,
              right: 12,
              width: 12,
              height: 12,
              borderBottom: '1px solid rgba(124,140,255,0.2)',
              borderRight: '1px solid rgba(124,140,255,0.2)',
            }} />

            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 24,
              color: 'rgba(42,49,56,0.5)',
              marginBottom: 16,
            }}>
              ○
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              color: 'rgba(232,234,237,0.3)',
              marginBottom: 8,
            }}>
              no testimonials yet.
            </div>
            <div style={{
              fontFamily: 'var(--font-body)',
              fontSize: 13,
              color: 'rgba(232,234,237,0.2)',
            }}>
              this section will fill with real quotes as people use korvid.
            </div>
          </div>
        </RevealBlock>
      </section>
    </>
  )
}

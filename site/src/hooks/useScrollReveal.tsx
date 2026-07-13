import { useEffect, useRef, useState, useCallback } from 'react'

interface UseScrollRevealOptions {
  threshold?: number
  rootMargin?: string
  delay?: number
}

export function useScrollReveal(options: UseScrollRevealOptions = {}) {
  const { threshold = 0.15, rootMargin = '0px 0px -60px 0px', delay = 0 } = options
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), delay)
          obs.disconnect()
        }
      },
      { threshold, rootMargin }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold, rootMargin, delay])

  return { ref, visible }
}

export function RevealBlock({
  children,
  delay = 0,
  direction = 'up',
  style,
}: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'left' | 'right' | 'fade'
  style?: React.CSSProperties
}) {
  const { ref, visible } = useScrollReveal({ delay })

  const transforms: Record<string, string> = {
    up: 'translateY(40px)',
    left: 'translateX(-40px)',
    right: 'translateX(40px)',
    fade: 'none',
  }

  return (
    <div
      ref={ref}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : transforms[direction],
        transition: `opacity 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms, transform 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94) ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

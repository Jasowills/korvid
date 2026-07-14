import { useEffect, useRef } from 'react'

export function JarvisVoice() {
  const spoken = useRef(false)

  useEffect(() => {
    if (spoken.current) return
    if (!window.speechSynthesis) return

    const speak = () => {
      if (spoken.current) return
      spoken.current = true

      const utter = new SpeechSynthesisUtterance('All systems fully operational')
      utter.rate = 0.85
      utter.pitch = 0.6
      utter.volume = 0.8

      const voices = window.speechSynthesis.getVoices()
      const preferred = voices.find(v =>
        v.name.includes('Alex') ||
        v.name.includes('Fred') ||
        v.name.includes('Daniel') ||
        v.name.includes('Google UK English Male') ||
        v.name.includes('Samantha') ||
        (v.lang.startsWith('en') && v.name.toLowerCase().includes('male'))
      )
      if (preferred) utter.voice = preferred

      window.speechSynthesis.speak(utter)
    }

    // Wait for user gesture (click or key) before speaking
    const onInteraction = () => {
      window.removeEventListener('click', onInteraction)
      window.removeEventListener('keydown', onInteraction)
      setTimeout(speak, 300)
    }
    window.addEventListener('click', onInteraction)
    window.addEventListener('keydown', onInteraction)

    return () => {
      window.removeEventListener('click', onInteraction)
      window.removeEventListener('keydown', onInteraction)
      window.speechSynthesis?.cancel()
    }
  }, [])

  return null
}

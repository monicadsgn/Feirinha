import { useEffect, useRef, useState } from 'react'

/** Reconhecimento de voz do próprio navegador (Chrome/Android e Safari/iPhone), em pt-BR. */

interface Rec {
  lang: string
  interimResults: boolean
  continuous: boolean
  start: () => void
  stop: () => void
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

const Ctor = (() => {
  if (typeof window === 'undefined') return null
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
})()

export const speechSupported = !!Ctor

export function useSpeech(onFinal: (text: string) => void) {
  const [listening, setListening] = useState(false)
  const [partial, setPartial] = useState('')
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Rec | null>(null)
  const cb = useRef(onFinal)
  cb.current = onFinal

  useEffect(() => () => rec.current?.stop(), [])

  const start = () => {
    if (!Ctor) return
    setError(null)
    setPartial('')
    const r = new Ctor()
    r.lang = 'pt-BR'
    r.interimResults = true
    r.continuous = false
    r.onresult = (e) => {
      let text = ''
      let final = false
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i]![0]!.transcript
        if (e.results[i]!.isFinal) final = true
      }
      setPartial(text)
      if (final) cb.current(text)
    }
    r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Libere o microfone pro Feirinha nas configurações do navegador.' : 'Não entendi. Tente de novo.')
    r.onend = () => setListening(false)
    rec.current = r
    r.start()
    setListening(true)
  }

  const stop = () => rec.current?.stop()

  return { listening, partial, error, start, stop }
}

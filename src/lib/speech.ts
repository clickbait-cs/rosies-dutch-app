// Dutch audio uses the browser's built-in voices (text-to-speech), and the
// speaking exercises use the browser's speech recognition. Chrome and Edge
// support both best.

let dutchVoice: SpeechSynthesisVoice | null | undefined

function findVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const voices = speechSynthesis.getVoices()
  return (
    voices.find((v) => v.lang === 'nl-NL' && /google|natural|online/i.test(v.name)) ??
    voices.find((v) => v.lang === 'nl-NL') ??
    voices.find((v) => v.lang.startsWith('nl')) ??
    null
  )
}

if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  speechSynthesis.onvoiceschanged = () => (dutchVoice = findVoice())
}

export function canSpeak(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function hasDutchVoice(): boolean {
  if (dutchVoice === undefined) dutchVoice = findVoice()
  return !!dutchVoice
}

export function say(text: string, rate = 0.9) {
  if (!canSpeak()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'nl-NL'
  if (dutchVoice === undefined) dutchVoice = findVoice()
  if (dutchVoice) u.voice = dutchVoice
  u.rate = rate
  speechSynthesis.speak(u)
}

// Speech recognition is still prefixed in most browsers.
type Recognition = {
  lang: string
  interimResults: boolean
  maxAlternatives: number
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void
  onerror: (e: { error: string }) => void
  onend: () => void
  start: () => void
  stop: () => void
}

function recognitionClass(): (new () => Recognition) | null {
  const w = window as unknown as Record<string, unknown>
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => Recognition) | null
}

export function canRecognize(): boolean {
  return typeof window !== 'undefined' && !!recognitionClass()
}

/** Listen once and return what the browser thinks was said (several guesses). */
export function listen(): { promise: Promise<string[]>; stop: () => void } {
  const Rec = recognitionClass()
  if (!Rec) return { promise: Promise.reject(new Error('unsupported')), stop: () => {} }
  const rec = new Rec()
  rec.lang = 'nl-NL'
  rec.interimResults = false
  rec.maxAlternatives = 5
  const promise = new Promise<string[]>((resolve, reject) => {
    let heard: string[] = []
    rec.onresult = (e) => {
      const first = e.results[0]
      heard = Array.from({ length: first.length }, (_, i) => first[i].transcript)
    }
    rec.onerror = (e) => reject(new Error(e.error))
    rec.onend = () => resolve(heard)
  })
  rec.start()
  return { promise, stop: () => rec.stop() }
}

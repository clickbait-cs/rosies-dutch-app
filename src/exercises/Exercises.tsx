// The different kinds of exercise. Each one shows the question and lets the
// learner answer; the lesson player (screens/Lesson.tsx) does the checking.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Exercise } from '../lib/exercises'
import type { Answer } from '../lib/grade'
import { checkSpoken } from '../lib/check'
import { canRecognize, listen, say } from '../lib/speech'
import { shuffle, makeRng } from '../lib/random'
import { useApp } from '../state'
import { Button, Speaker } from '../components/ui'

export interface ExerciseProps<E extends Exercise = Exercise> {
  ex: E
  answer: Answer | null
  setAnswer: (a: Answer | null) => void
  locked: boolean // true while the feedback panel is showing
  /** for exercises that check themselves (match, speak) */
  onDone: (correct: boolean, note?: string) => void
}

type Of<K extends Exercise['kind']> = Extract<Exercise, { kind: K }>

/** Plays the audio once when the exercise appears. */
function useAutoplay(text: string | undefined) {
  const { progress } = useApp()
  useEffect(() => {
    if (text && progress.settings.listening) {
      const id = window.setTimeout(() => say(text, progress.settings.speechRate), 250)
      return () => window.clearTimeout(id)
    }
  }, [text]) // eslint-disable-line react-hooks/exhaustive-deps
}

function Prompt({ text, audio }: { text: string; audio?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {audio && <Speaker text={audio} />}
      {text && <p className="whitespace-pre-line text-2xl font-bold text-slate-800">{text}</p>}
    </div>
  )
}

function ListenOnly({ audio }: { audio: string }) {
  return (
    <div className="flex items-center justify-center gap-4 py-4">
      <Speaker text={audio} size="lg" />
      <Speaker text={audio} size="md" slow />
    </div>
  )
}

// ------------------------------------------------------------------ choice

export function Choice({ ex, answer, setAnswer, locked }: ExerciseProps<Of<'choice'>>) {
  useAutoplay(ex.audio)
  // keys 1-4 pick an option on a keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (locked || (e.target as HTMLElement).tagName === 'INPUT') return
      const n = Number(e.key)
      if (n >= 1 && n <= ex.options.length) setAnswer(ex.options[n - 1])
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [ex, locked, setAnswer])

  return (
    <div className="space-y-6">
      {ex.prompt ? <Prompt text={ex.prompt} audio={ex.audio} /> : <ListenOnly audio={ex.audio!} />}
      <div className={`grid gap-3 ${ex.options.length === 2 ? 'grid-cols-2' : 'sm:grid-cols-2'}`}>
        {ex.options.map((o, i) => (
          <button
            key={o}
            type="button"
            disabled={locked}
            onClick={() => setAnswer(o)}
            className={`flex items-center gap-3 rounded-2xl border-2 border-b-4 p-4 text-left text-lg font-semibold transition ${
              answer === o ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg border-2 border-slate-200 text-sm text-slate-400 sm:flex">
              {i + 1}
            </span>
            {o}
          </button>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------- match

export function Match({ ex, locked, onDone }: ExerciseProps<Of<'match'>>) {
  const { progress } = useApp()
  // Shuffle both columns with one random generator (two generators created in
  // the same millisecond would shuffle them identically), and make sure the
  // pairs never end up side by side in the same order.
  const [left, right] = useMemo(() => {
    const rng = makeRng()
    const l = shuffle(ex.pairs, rng)
    let r = shuffle(ex.pairs, rng)
    for (let i = 0; i < 10 && r.some((p, j) => p === l[j]); i++) r = shuffle(ex.pairs, rng)
    return [l.map((p) => p.nl), r.map((p) => p.en)]
  }, [ex])
  const [selNl, setSelNl] = useState<string | null>(null)
  const [selEn, setSelEn] = useState<string | null>(null)
  const [done, setDone] = useState<string[]>([]) // matched Dutch words
  const [bad, setBad] = useState<string[]>([])
  const mistakes = useRef(0)

  useEffect(() => {
    if (!selNl || !selEn) return
    const pair = ex.pairs.find((p) => p.nl === selNl)!
    if (pair.en === selEn) {
      const next = [...done, selNl]
      setDone(next)
      if (next.length === ex.pairs.length) onDone(mistakes.current === 0)
    } else {
      mistakes.current++
      setBad([selNl, selEn])
      window.setTimeout(() => setBad([]), 600)
    }
    setSelNl(null)
    setSelEn(null)
  }, [selNl, selEn]) // eslint-disable-line react-hooks/exhaustive-deps

  const cls = (active: boolean, matched: boolean, wrong: boolean) =>
    `w-full rounded-2xl border-2 border-b-4 p-3 text-lg font-semibold transition ${
      matched
        ? 'border-slate-100 bg-slate-50 text-slate-300'
        : wrong
          ? 'border-red-400 bg-red-50 text-red-600'
          : active
            ? 'border-sky-400 bg-sky-50 text-sky-700'
            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    }`

  const matchedEn = done.map((nl) => ex.pairs.find((p) => p.nl === nl)!.en)
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-3">
        {left.map((nl) => (
          <button
            key={nl}
            type="button"
            disabled={locked || done.includes(nl)}
            className={cls(selNl === nl, done.includes(nl), bad.includes(nl))}
            onClick={() => {
              if (progress.settings.listening) say(nl, progress.settings.speechRate)
              setSelNl(nl)
            }}
          >
            {nl}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {right.map((en) => (
          <button
            key={en}
            type="button"
            disabled={locked || matchedEn.includes(en)}
            className={cls(selEn === en, matchedEn.includes(en), bad.includes(en))}
            onClick={() => setSelEn(en)}
          >
            {en}
          </button>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------- tiles

export function Tiles({ ex, answer, setAnswer, locked }: ExerciseProps<Of<'tiles'>>) {
  useAutoplay(ex.audio)
  // we store the positions of the chosen tiles, so repeated words work
  const [chosen, setChosen] = useState<number[]>([])
  useEffect(() => {
    setChosen([])
  }, [ex])
  useEffect(() => {
    if (answer === null && chosen.length) setChosen([])
  }, [answer]) // eslint-disable-line react-hooks/exhaustive-deps

  const update = (next: number[]) => {
    setChosen(next)
    setAnswer(next.length ? next.map((i) => ex.tiles[i]) : null)
  }

  return (
    <div className="space-y-6">
      {ex.prompt ? <Prompt text={ex.prompt} /> : <ListenOnly audio={ex.audio!} />}
      <div className="flex min-h-[4.5rem] flex-wrap content-start gap-2 border-b-2 border-t-2 border-slate-200 py-3">
        {chosen.map((i) => (
          <button
            key={i}
            type="button"
            disabled={locked}
            onClick={() => update(chosen.filter((c) => c !== i))}
            className="rounded-xl border-2 border-b-4 border-slate-200 bg-white px-3 py-2 text-lg font-semibold text-slate-700"
          >
            {ex.tiles[i]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {ex.tiles.map((tile, i) => {
          const used = chosen.includes(i)
          return (
            <button
              key={i}
              type="button"
              disabled={locked || used}
              onClick={() => update([...chosen, i])}
              className={`rounded-xl border-2 border-b-4 px-3 py-2 text-lg font-semibold ${
                used ? 'border-slate-200 bg-slate-200 text-transparent' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              {tile}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// -------------------------------------------------------------------- type

/** Dutch letters that are awkward to type on an English keyboard. */
const SPECIAL = ['é', 'ë', 'è', 'ï', 'ö', 'ü']

export function TypeAnswer({ ex, answer, setAnswer, locked }: ExerciseProps<Of<'type'>>) {
  const { t } = useApp()
  useAutoplay(ex.audio)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
  }, [ex])
  const value = (answer as string) ?? ''
  return (
    <div className="space-y-5">
      {ex.prompt ? <Prompt text={ex.prompt} audio={ex.audio} /> : <ListenOnly audio={ex.audio!} />}
      <input
        ref={ref}
        value={value}
        disabled={locked}
        onChange={(e) => setAnswer(e.target.value || null)}
        placeholder={t('typeHere')}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        lang="nl"
        className="w-full rounded-2xl border-2 border-slate-200 bg-slate-50 p-4 text-xl outline-none focus:border-sky-400"
      />
      <div className="flex gap-2">
        {SPECIAL.map((ch) => (
          <button
            key={ch}
            type="button"
            disabled={locked}
            onClick={() => (setAnswer(value + ch), ref.current?.focus())}
            className="rounded-lg border-2 border-slate-200 px-2.5 py-1 font-semibold text-slate-600 hover:bg-slate-50"
          >
            {ch}
          </button>
        ))}
      </div>
    </div>
  )
}

// ------------------------------------------------------------------- speak

export function Speak({ ex, locked, onDone }: ExerciseProps<Of<'speak'>>) {
  const { t } = useApp()
  const [state, setState] = useState<'idle' | 'listening' | 'heard'>('idle')
  const [heard, setHeard] = useState('')
  const stopRef = useRef<() => void>(() => {})
  const supported = canRecognize()

  const start = () => {
    if (state === 'listening') return stopRef.current()
    const { promise, stop } = listen()
    stopRef.current = stop
    setState('listening')
    promise
      .then((guesses) => {
        setHeard(guesses[0] ?? '')
        setState('heard')
        onDone(checkSpoken(guesses, ex.text), guesses[0] ? `${t('heard')} “${guesses[0]}”` : undefined)
      })
      .catch(() => setState('idle'))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Prompt text={ex.text} audio={ex.text} />
        <p className="text-slate-500">{ex.en}</p>
      </div>
      {supported ? (
        <Button variant="blue" className="w-full py-5 text-lg normal-case" disabled={locked && state !== 'listening'} onClick={start}>
          🎤 {state === 'listening' ? t('listening') : t('tapToSpeak')}
        </Button>
      ) : (
        <p className="rounded-xl bg-slate-100 p-4 text-slate-600">{t('speechUnsupported')}</p>
      )}
      {heard && (
        <p className="text-slate-500">
          {t('heard')} “{heard}”
        </p>
      )}
    </div>
  )
}

export function ExerciseView(props: ExerciseProps) {
  const { ex } = props
  switch (ex.kind) {
    case 'choice':
      return <Choice {...(props as ExerciseProps<Of<'choice'>>)} />
    case 'match':
      return <Match {...(props as ExerciseProps<Of<'match'>>)} />
    case 'tiles':
      return <Tiles {...(props as ExerciseProps<Of<'tiles'>>)} />
    case 'type':
      return <TypeAnswer {...(props as ExerciseProps<Of<'type'>>)} />
    case 'speak':
      return <Speak {...(props as ExerciseProps<Of<'speak'>>)} />
  }
}

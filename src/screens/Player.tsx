// Runs a list of exercises (a lesson or a review). Mistakes come back at the
// end of the lesson, like in Duolingo. At the end we show the result screen.

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Exercise } from '../lib/exercises'
import { Runner } from './Runner'
import { Button, ProgressBar } from '../components/ui'
import { useApp } from '../state'

export interface PlayerResult {
  /** share of exercises answered right the first time */
  accuracy: number
  /** [item id, right first time?] for spaced repetition */
  answers: [string, boolean][]
}

interface Props {
  exercises: Exercise[]
  onFinish: (r: PlayerResult) => void
  onQuit: () => void
}

export function Player({ exercises, onFinish, onQuit }: Props) {
  const { t } = useApp()
  const [queue, setQueue] = useState<{ ex: Exercise; retry: boolean }[]>(() => exercises.map((ex) => ({ ex, retry: false })))
  const [pos, setPos] = useState(0)
  const [answers, setAnswers] = useState<[string, boolean][]>([])
  const [firstTry, setFirstTry] = useState<boolean[]>([])
  const [disabled, setDisabled] = useState<{ listening: boolean; speaking: boolean }>({ listening: false, speaking: false })

  const visible = useMemo(
    () => queue.filter((q, i) => i < pos || !(q.ex.needs && disabled[q.ex.needs])),
    [queue, pos, disabled],
  )
  const current = visible[pos]
  const done = visible.filter((_, i) => i < pos && !visible[i].retry).length
  const total = visible.filter((q) => !q.retry).length

  const reported = useRef(false)
  useEffect(() => {
    if (current || reported.current) return
    reported.current = true
    const accuracy = firstTry.length ? firstTry.filter(Boolean).length / firstTry.length : 1
    onFinish({ accuracy, answers })
  }, [current]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!current) return null

  const complete = (correct: boolean) => {
    if (!current.retry) {
      setFirstTry((f) => [...f, correct])
      setAnswers((a) => [...a, ...current.ex.itemIds.map((id) => [id, correct] as [string, boolean])])
    }
    // wrong answers come back once at the end
    const nextQueue = correct || current.retry ? visible : [...visible, { ex: current.ex, retry: true }]
    setQueue(nextQueue)
    setPos(pos + 1)
  }

  const disable = (what: 'listening' | 'speaking') => {
    setDisabled((d) => ({ ...d, [what]: true }))
    setQueue(visible) // keep what was already shown
  }

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="mx-auto flex w-full max-w-2xl items-center gap-4 px-4 pt-5">
        <button
          type="button"
          aria-label={t('quit')}
          onClick={() => (confirm(t('quitConfirm')) ? onQuit() : undefined)}
          className="text-2xl font-bold text-slate-400 hover:text-slate-600"
        >
          ✕
        </button>
        <ProgressBar value={total ? done / total : 0} className="flex-1" />
      </div>
      <Runner key={`${pos}:${disabled.listening}:${disabled.speaking}`} ex={current.ex} onComplete={complete} onDisable={disable} />
    </div>
  )
}

export function ResultScreen({
  title,
  accuracy,
  xp,
  message,
  onContinue,
  onRetry,
}: {
  title: string
  accuracy: number
  xp: number
  message?: string
  onContinue: () => void
  onRetry?: () => void
}) {
  const { t } = useApp()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-white p-6 text-center">
      <div className="text-7xl">{onRetry ? '💪' : '🎉'}</div>
      <h1 className="text-3xl font-extrabold text-slate-800">{title}</h1>
      {message && <p className="max-w-md text-lg text-slate-600">{message}</p>}
      <div className="flex gap-4">
        <div className="w-40 rounded-2xl border-2 border-amber-400 bg-amber-50 p-4">
          <p className="text-xs font-extrabold uppercase text-amber-600">{t('xpEarned')}</p>
          <p className="whitespace-nowrap text-3xl font-extrabold text-amber-600">⭐ {xp}</p>
        </div>
        <div className="w-40 rounded-2xl border-2 border-green-400 bg-green-50 p-4">
          <p className="text-xs font-extrabold uppercase text-green-600">{t('accuracy')}</p>
          <p className="whitespace-nowrap text-3xl font-extrabold text-green-600">🎯 {Math.round(accuracy * 100)}%</p>
        </div>
      </div>
      <div className="flex w-full max-w-sm flex-col gap-3">
        {onRetry && (
          <Button variant="blue" onClick={onRetry}>
            {t('practiceAgain')}
          </Button>
        )}
        <Button onClick={onContinue}>{t('continue')}</Button>
      </div>
    </div>
  )
}

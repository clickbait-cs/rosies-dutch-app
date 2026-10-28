// First-time screen: start from scratch, or take the placement test.

import { useMemo, useState } from 'react'
import { chapters } from '../content'
import { placementQuestions } from '../lib/exercises'
import { answerPlacement, startPlacement, type PlacementState } from '../lib/placement'
import { makeRng } from '../lib/random'
import { applyPlacement } from '../lib/session'
import { useApp } from '../state'
import { Button, Card, ProgressBar } from '../components/ui'
import { Runner } from './Runner'

export function PlacementChoice({ onTest, onDone }: { onTest: () => void; onDone: () => void }) {
  const { t, update } = useApp()
  const beginner = () => {
    update((p) => ({ ...p, placement: { done: true, startChapter: chapters[0].id } }))
    onDone()
  }
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-lg space-y-4">
        <h1 className="text-center text-3xl font-extrabold text-slate-800">{t('placementTitle')}</h1>
        <button type="button" onClick={beginner} className="w-full text-left">
          <Card className="border-b-4 hover:bg-green-50">
            <p className="text-4xl">🌱</p>
            <p className="mt-2 text-xl font-extrabold text-slate-800">{t('beginner')}</p>
            <p className="text-slate-500">{t('beginnerText')}</p>
          </Card>
        </button>
        <button type="button" onClick={onTest} className="w-full text-left">
          <Card className="border-b-4 hover:bg-sky-50">
            <p className="text-4xl">🧭</p>
            <p className="mt-2 text-xl font-extrabold text-slate-800">{t('placementTest')}</p>
            <p className="text-slate-500">{t('placementText')}</p>
          </Card>
        </button>
      </div>
    </div>
  )
}

export function PlacementTest({ onExit }: { onExit: () => void }) {
  const { t, update } = useApp()
  const rng = useMemo(() => makeRng(), [])
  // three questions prepared per chapter; we use 2 or 3 of them
  const questions = useMemo(() => chapters.map((ch) => placementQuestions(ch, rng)), [rng])
  const [state, setState] = useState<PlacementState>(startPlacement)

  const answer = (correct: boolean) => {
    const next = answerPlacement(state, correct, chapters.length)
    if (next.finished) update((p) => applyPlacement(p, chapters, next.startAt))
    setState(next)
  }

  if (state.finished) {
    const ch = chapters[Math.min(state.startAt, chapters.length - 1)]
    const all = state.chapter >= chapters.length
    const name = `${t('book', { n: ch.book })}, ${t('chapter', { n: ch.number })} (${ch.titleNl})`
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-white p-6 text-center">
        <p className="text-7xl">🧭</p>
        <h1 className="text-3xl font-extrabold text-slate-800">{all ? t('placementAll') : t('placementResult')}</h1>
        <p className="max-w-md text-lg text-slate-600">{t('placementResultText', { chapter: name })}</p>
        <Button className="w-full max-w-sm" onClick={onExit}>
          {t('continue')}
        </Button>
      </div>
    )
  }

  const ch = chapters[state.chapter]
  const ex = questions[state.chapter][state.asked]
  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <div className="mx-auto w-full max-w-2xl space-y-2 px-4 pt-5">
        <div className="flex items-center gap-4">
          <button type="button" aria-label={t('quit')} onClick={onExit} className="text-2xl font-bold text-slate-400 hover:text-slate-600">
            ✕
          </button>
          <ProgressBar value={state.chapter / chapters.length} className="flex-1" />
        </div>
        <p className="text-sm font-bold text-slate-400">
          {t('placementProgress', { chapter: `${t('book', { n: ch.book })} · ${t('chapter', { n: ch.number })}` })}
        </p>
      </div>
      <Runner key={`${state.chapter}-${state.asked}`} ex={ex} onComplete={answer} allowDontKnow />
    </div>
  )
}

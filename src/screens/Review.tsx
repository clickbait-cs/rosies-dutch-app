// Review: practise the words that are due again (spaced repetition).

import { useState } from 'react'
import { buildReview, type Exercise } from '../lib/exercises'
import { dueItems } from '../lib/srs'
import { dayKey } from '../lib/dates'
import { makeRng } from '../lib/random'
import { applyAnswers } from '../lib/session'
import { addXp } from '../lib/progress'
import { useApp } from '../state'
import { Button, Card } from '../components/ui'
import { Player, ResultScreen, type PlayerResult } from './Player'

/** Shown inside the layout. */
export function ReviewHome({ start }: { start: () => void }) {
  const { t, progress } = useApp()
  const due = dueItems(progress.srs, dayKey()).length
  return (
    <Card className="space-y-4 text-center">
      <p className="text-6xl">🔁</p>
      <h1 className="text-2xl font-extrabold text-slate-800">{t('review')}</h1>
      <p className="text-slate-500">{t('reviewIntro')}</p>
      <p className="text-lg font-bold text-slate-700">{due ? t('reviewDue', { n: due }) : t('reviewNone')}</p>
      {due > 0 && (
        <Button variant="blue" className="w-full" onClick={start}>
          {t('reviewStart')}
        </Button>
      )}
    </Card>
  )
}

/** The review session itself (full screen). */
export function ReviewSession({ onExit }: { onExit: () => void }) {
  const { t, progress, update } = useApp()
  const [exercises] = useState<Exercise[]>(() => buildReview(dueItems(progress.srs, dayKey()), makeRng(), progress.settings))
  const [result, setResult] = useState<PlayerResult | null>(null)

  const finish = (r: PlayerResult) => {
    update((p) => addXp(applyAnswers(p, r.answers), 10))
    setResult(r)
  }

  if (result) return <ResultScreen title={t('lessonDone')} accuracy={result.accuracy} xp={10} onContinue={onExit} />
  return <Player exercises={exercises} onFinish={finish} onQuit={onExit} />
}

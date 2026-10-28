// A lesson: a short start screen (new words or grammar), the exercises, then the result.

import { useState } from 'react'
import { chapters, withArticle } from '../content'
import { buildLesson, lessonWords, LESSONS, PASS_MARK, type Exercise } from '../lib/exercises'
import { makeRng } from '../lib/random'
import { finishLesson, lessonOutcome, type LessonOutcome } from '../lib/session'
import { useApp } from '../state'
import { Button, Card, Speaker, TipContent, ViReveal } from '../components/ui'
import { Player, ResultScreen, type PlayerResult } from './Player'
import { lessonTitle } from './Home'

export function Lesson({ chapterId, index, onExit }: { chapterId: string; index: number; onExit: () => void }) {
  const { t, progress, update } = useApp()
  const ch = chapters.find((c) => c.id === chapterId)!
  const [stage, setStage] = useState<'intro' | 'play' | 'result'>('intro')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [result, setResult] = useState<{ accuracy: number; outcome: LessonOutcome } | null>(null)
  const kind = LESSONS[index].kind

  const start = () => {
    setExercises(buildLesson(ch, index, makeRng(), progress.settings))
    setStage('play')
  }

  const finish = (r: PlayerResult) => {
    update((p) => finishLesson(p, ch, index, r.accuracy, r.answers).progress)
    setResult({ accuracy: r.accuracy, outcome: lessonOutcome(index, r.accuracy) })
    setStage('result')
  }

  if (stage === 'play') return <Player exercises={exercises} onFinish={finish} onQuit={onExit} />

  if (stage === 'result' && result) {
    const isCheck = kind === 'check'
    return (
      <ResultScreen
        title={isCheck ? (result.outcome.passed ? t('checkPassed') : t('chapter', { n: ch.number })) : t('lessonDone')}
        message={isCheck && !result.outcome.passed ? t('checkFailed', { pass: PASS_MARK * 100 }) : undefined}
        accuracy={result.accuracy}
        xp={result.outcome.xp}
        onContinue={onExit}
        onRetry={isCheck && !result.outcome.passed ? start : undefined}
      />
    )
  }

  // ---- intro
  const words = lessonWords(ch, index)
  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <button type="button" onClick={onExit} className="text-2xl font-bold text-slate-400 hover:text-slate-600">
          ✕
        </button>
        <div>
          <p className="text-sm font-extrabold uppercase tracking-wider text-green-600">
            {t('book', { n: ch.book })} · {t('chapter', { n: ch.number })} · {ch.titleNl}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-800">{lessonTitle(t, index)}</h1>
        </div>

        {words.length > 0 && (
          <Card>
            <h2 className="mb-3 font-extrabold text-slate-700">{t('wordsIntro')}</h2>
            <ul className="divide-y divide-slate-100">
              {words.map((w) => (
                <li key={w.nl} className="flex items-center gap-3 py-2">
                  <Speaker text={withArticle(w)} size="sm" />
                  <span className="font-bold text-slate-800">{withArticle(w)}</span>
                  <span className="text-slate-500">{w.en}</span>
                  <span className="ml-auto text-right text-sm text-amber-700">🇻🇳 {w.vi}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}

        {kind === 'grammar' &&
          ch.grammar.map((g) => (
            <Card key={g.title}>
              <h2 className="text-xl font-extrabold text-slate-800">{g.title}</h2>
              <p className="mb-2 text-sm font-semibold text-amber-700">🇻🇳 {g.titleVi}</p>
              <p className="whitespace-pre-line text-slate-700">{g.en}</p>
              <ViReveal text={g.vi} className="mt-3" />
              <ul className="mt-4 space-y-2">
                {g.examples.map((ex) => (
                  <li key={ex.nl} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2">
                    <Speaker text={ex.nl} size="sm" />
                    <div>
                      <p className="font-bold text-slate-800">{ex.nl}</p>
                      <p className="text-sm text-slate-500">{ex.en}</p>
                    </div>
                  </li>
                ))}
              </ul>
              {g.tip && (
                <details className="mt-4 rounded-xl bg-sky-50 p-3">
                  <summary className="cursor-pointer font-bold text-sky-700">💡 {t('tipTitle')}</summary>
                  <div className="mt-3">
                    <TipContent id={g.tip} />
                  </div>
                </details>
              )}
            </Card>
          ))}

        <Button className="w-full" onClick={start}>
          {t('start')}
        </Button>
      </div>
    </div>
  )
}

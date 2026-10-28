// A longer text with comprehension questions. The text stays on screen while
// answering, like in a real reading exam.

import { useState } from 'react'
import { findReading } from '../content'
import { addXp } from '../lib/progress'
import { useApp } from '../state'
import { Button, Card, Speaker } from '../components/ui'

export function Reading({ textId, onExit }: { textId: string; onExit: () => void }) {
  const { t, update } = useApp()
  const text = findReading(textId)!
  const [answers, setAnswers] = useState<(number | null)[]>(() => text.questions.map(() => null))
  const [checked, setChecked] = useState(false)
  const [showEn, setShowEn] = useState(false)

  const score = text.questions.filter((q, i) => answers[i] === q.answer).length
  const check = () => {
    setChecked(true)
    const fraction = score / text.questions.length
    update((p) => {
      const best = Math.max(p.reading[text.id] ?? 0, fraction)
      return addXp({ ...p, reading: { ...p.reading, [text.id]: best } }, 10 + score * 2)
    })
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-5xl space-y-5 px-4 py-6">
        <button type="button" aria-label={t('quit')} onClick={onExit} className="text-2xl font-bold text-slate-400 hover:text-slate-600">
          ✕
        </button>
        <div className="grid gap-5 lg:grid-cols-2">
          {/* the text */}
          <Card className="h-fit space-y-4 lg:sticky lg:top-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-sky-500">📰 {t('lessonReading')}</p>
            <div className="flex items-start justify-between gap-3">
              <h1 className="text-2xl font-extrabold text-slate-800">{text.title}</h1>
              <Speaker text={`${text.title}. ${text.text}`} />
            </div>
            <div className="space-y-3 text-lg leading-relaxed text-slate-800">
              {text.text.split('\n\n').map((para, i) => (
                <p key={i} className="whitespace-pre-line">
                  {para}
                </p>
              ))}
            </div>
            <p className="text-xs text-slate-400">
              {t('sourceLabel')}:{' '}
              {text.source ? (
                <a href={text.source.url} target="_blank" rel="noreferrer" className="underline">
                  {text.source.name} ({text.source.license})
                </a>
              ) : (
                t('writtenFor')
              )}
            </p>
            <details className="rounded-xl bg-amber-50 p-3">
              <summary className="cursor-pointer font-bold text-amber-800">🇻🇳 {t('wordsInText')}</summary>
              <ul className="mt-2 space-y-1 text-sm">
                {text.glossary.map((g) => (
                  <li key={g.nl}>
                    <b>{g.nl}</b> – {g.en} · <span className="text-amber-800">{g.vi}</span>
                  </li>
                ))}
              </ul>
            </details>
          </Card>

          {/* the questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-800">{t('questions')}</h2>
              <button type="button" onClick={() => setShowEn(!showEn)} className="text-sm font-bold text-sky-600 underline">
                {t('showQuestionEn')}
              </button>
            </div>
            {text.questions.map((q, qi) => (
              <Card key={qi} className="space-y-3">
                <p className="font-bold text-slate-800">
                  {qi + 1}. {q.q}
                </p>
                {showEn && <p className="text-sm text-slate-500">{q.qEn}</p>}
                <div className="grid gap-2">
                  {q.options.map((o, oi) => {
                    const chosen = answers[qi] === oi
                    const right = checked && oi === q.answer
                    const wrong = checked && chosen && oi !== q.answer
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={checked}
                        onClick={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))}
                        className={`rounded-xl border-2 px-3 py-2 text-left ${
                          right
                            ? 'border-green-400 bg-green-50 text-green-800'
                            : wrong
                              ? 'border-red-400 bg-red-50 text-red-700'
                              : chosen
                                ? 'border-sky-400 bg-sky-50 text-sky-700'
                                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {o}
                      </button>
                    )
                  })}
                </div>
              </Card>
            ))}
            {checked ? (
              <Card className="space-y-3 text-center">
                <p className="text-2xl font-extrabold text-slate-800">{t('score', { n: score, total: text.questions.length })}</p>
                <Button className="w-full" onClick={onExit}>
                  {t('continue')}
                </Button>
              </Card>
            ) : (
              <Button className="w-full" disabled={answers.some((a) => a === null)} onClick={check}>
                {t('checkAnswers')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Shows one exercise with the Check button and the green/red feedback panel.
// Used by lessons, reviews and the placement test.

import { useCallback, useEffect, useState } from 'react'
import type { Exercise } from '../lib/exercises'
import { gradeAnswer, isPass, type Answer, type Grade } from '../lib/grade'
import { ExerciseView } from '../exercises/Exercises'
import { Button, Modal, TipModal, ViReveal } from '../components/ui'
import { useApp } from '../state'
import { sendReport } from '../lib/cloud'

interface Feedback {
  grade: Grade
  expected: string
  note?: string
}

interface Props {
  ex: Exercise
  onComplete: (correct: boolean) => void
  /** placement test: show an "I don't know" button */
  allowDontKnow?: boolean
  /** turn off listening or speaking exercises for this session */
  onDisable?: (what: 'listening' | 'speaking') => void
}

export function Runner({ ex, onComplete, allowDontKnow, onDisable }: Props) {
  const { t, progress, update } = useApp()
  const [answer, setAnswer] = useState<Answer | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [tipOpen, setTipOpen] = useState<string | null>(null)
  const [reporting, setReporting] = useState(false)

  // reset when a new exercise arrives
  useEffect(() => {
    setAnswer(null)
    setFeedback(null)
    // Show the Vietnamese tip automatically the first time a hard concept comes up.
    if (ex.tip && !progress.seenTips.includes(ex.tip)) {
      setTipOpen(ex.tip)
      update((p) => ({ ...p, seenTips: [...p.seenTips, ex.tip!] }))
    }
  }, [ex]) // eslint-disable-line react-hooks/exhaustive-deps

  const check = useCallback(() => {
    if (feedback || answer === null) return
    const r = gradeAnswer(ex, answer)
    setFeedback({ grade: r.grade, expected: r.expected })
  }, [answer, ex, feedback])

  const giveUp = () => setFeedback({ grade: 'wrong', expected: expectedOf(ex) })

  const selfGraded = useCallback((correct: boolean, note?: string) => {
    setFeedback({ grade: correct ? 'correct' : 'wrong', expected: ex.kind === 'speak' ? ex.text : '', note })
  }, [ex])

  const next = useCallback(() => {
    if (feedback) onComplete(isPass(feedback.grade))
  }, [feedback, onComplete])

  // Enter = Check / Continue
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || tipOpen || reporting) return
      e.preventDefault()
      if (feedback) next()
      else check()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [feedback, next, check, tipOpen, reporting])

  const good = feedback && isPass(feedback.grade)
  const selfChecking = ex.kind === 'match' || ex.kind === 'speak'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            {ex.isNew && <p className="mb-1 text-xs font-extrabold tracking-widest text-purple-500">{t('newWord')}</p>}
            <h2 className="text-2xl font-extrabold text-slate-800">{t(`i_${ex.instruction}`)}</h2>
          </div>
          {ex.tip && (
            <button type="button" onClick={() => setTipOpen(ex.tip!)} className="shrink-0 rounded-xl bg-sky-50 px-3 py-1.5 text-sm font-bold text-sky-600">
              💡 {t('tipTitle')}
            </button>
          )}
        </div>
        <ExerciseView ex={ex} answer={answer} setAnswer={setAnswer} locked={!!feedback} onDone={selfGraded} />
        {!feedback && ex.kind !== 'match' && <ViReveal text={ex.vi} className="mt-6" />}
      </div>

      {/* bottom bar */}
      <div className={`border-t-2 ${feedback ? (good ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50') : 'border-slate-200 bg-white'}`}>
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          {feedback ? (
            <FeedbackText feedback={feedback} ex={ex} onTip={() => ex.tip && setTipOpen(ex.tip)} onReport={() => setReporting(true)} />
          ) : (
            <div className="flex flex-wrap gap-2">
              {allowDontKnow && (
                <Button variant="secondary" onClick={giveUp}>
                  {t('dontKnow')}
                </Button>
              )}
              {!allowDontKnow && ex.needs && onDisable && (
                <Button variant="ghost" onClick={() => onDisable(ex.needs!)}>
                  {ex.needs === 'listening' ? t('cantListenNow') : t('cantSpeakNow')}
                </Button>
              )}
              {!allowDontKnow && ex.kind === 'speak' && (
                <Button variant="ghost" onClick={() => onComplete(true)}>
                  {t('skip')}
                </Button>
              )}
            </div>
          )}
          {feedback ? (
            <div className="flex flex-col gap-2 sm:flex-row-reverse">
              <Button variant={good ? 'primary' : 'danger'} className="sm:min-w-40" onClick={next}>
                {t('continue')}
              </Button>
              {/* self-check: a lucky guess counts as a mistake, so the word comes back */}
              {good && (
                <Button variant="secondary" className="normal-case" title={t('guessedHint')} onClick={() => onComplete(false)}>
                  🤔 {t('guessed')}
                </Button>
              )}
            </div>
          ) : (
            !selfChecking && (
              <Button className="sm:min-w-40" disabled={answer === null} onClick={check}>
                {t('check')}
              </Button>
            )
          )}
        </div>
      </div>

      {tipOpen && <TipModal id={tipOpen} onClose={() => setTipOpen(null)} />}
      {reporting && <ReportModal ex={ex} answer={answer} onClose={() => setReporting(false)} />}
    </div>
  )
}

function expectedOf(ex: Exercise): string {
  switch (ex.kind) {
    case 'choice':
      return ex.reveal ?? ex.answer
    case 'tiles':
      return ex.answer
    case 'type':
      return ex.answers[0]
    case 'speak':
      return ex.text
    case 'match':
      return ''
  }
}

function FeedbackText({ feedback, ex, onTip, onReport }: { feedback: Feedback; ex: Exercise; onTip: () => void; onReport: () => void }) {
  const { t } = useApp()
  const { grade, expected, note } = feedback
  const good = isPass(grade)
  const title =
    grade === 'correct' ? t('correct') : grade === 'typo' ? t('almost') : grade === 'article' ? t('missingArticle') : t('wrong')
  const meaning = 'reveal' in ex && ex.reveal && ex.reveal !== expected ? ex.reveal : null
  return (
    <div className={good ? 'text-green-700' : 'text-red-700'}>
      <p className="text-xl font-extrabold">
        {good ? '✅ ' : '❌ '}
        {title}
      </p>
      {grade !== 'correct' && expected && <p className="mt-1 text-lg font-semibold">{expected}</p>}
      {meaning && (
        <p className="mt-1 text-slate-600">
          {t('meaning')} {meaning}
        </p>
      )}
      {note && <p className="mt-1 text-slate-600">{note}</p>}
      {ex.vi && <p className="mt-1 text-amber-800">🇻🇳 {ex.vi.split('\n')[0]}</p>}
      <div className="mt-2 flex flex-wrap gap-4 text-sm font-bold">
        {!good && ex.tip && (
          <button type="button" onClick={onTip} className="text-sky-600 underline">
            💡 {t('tipTitle')} (🇻🇳)
          </button>
        )}
        <button type="button" onClick={onReport} className="text-slate-500 underline">
          🚩 {t('report')}
        </button>
      </div>
    </div>
  )
}

function ReportModal({ ex, answer, onClose }: { ex: Exercise; answer: Answer | null; onClose: () => void }) {
  const { t, user } = useApp()
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sent' | 'error'>('idle')
  const send = async () => {
    try {
      const exercise = JSON.stringify({ ...ex, given: answer })
      await sendReport({ uid: user?.uid ?? 'guest', exercise, message, createdAt: Date.now() })
      setStatus('sent')
      window.setTimeout(onClose, 1200)
    } catch {
      setStatus('error')
    }
  }
  return (
    <Modal onClose={onClose}>
      <h3 className="mb-3 text-xl font-extrabold">🚩 {t('report')}</h3>
      {status === 'sent' ? (
        <p className="text-green-700">{t('reportThanks')}</p>
      ) : (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('reportPlaceholder')}
            className="h-28 w-full rounded-2xl border-2 border-slate-200 p-3 outline-none focus:border-sky-400"
          />
          {status === 'error' && <p className="mt-2 text-sm text-red-600">{t('sync_notSetUp')}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>
              {t('cancel')}
            </Button>
            <Button onClick={send}>{t('reportSend')}</Button>
          </div>
        </>
      )}
    </Modal>
  )
}

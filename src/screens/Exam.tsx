// Exam practice for the naturalisation / civic integration exam (A2):
// KNM (knowledge of Dutch society), reading, listening, writing and speaking.
// This is practice in the style of the exam, not the official exam.

import { useState } from 'react'
import { examReading, examWriting, knmTopics, listeningItems, speakingTasks } from '../content'
import type { ExamQuestion } from '../content/types'
import { addXp } from '../lib/progress'
import { checkSpoken } from '../lib/check'
import { canRecognize, listen, sayAll } from '../lib/speech'
import { useApp } from '../state'
import { Button, Card, Speaker } from '../components/ui'

export type ExamActivity =
  | { kind: 'knm'; id: string }
  | { kind: 'listening'; id: string }
  | { kind: 'speaking' }
  | { kind: 'reading'; id: string }
  | { kind: 'writing'; id: string }

/** The exam tab: an overview of the five parts. */
export function ExamHome({ open }: { open: (a: ExamActivity) => void }) {
  const { t, progress } = useApp()
  const lang = progress.settings.uiLang
  const pct = (v?: number) => (v === undefined ? null : `${Math.round(v * 100)}%`)
  const Row = ({ label, score, onClick }: { label: string; score: string | null; onClick: () => void }) => (
    <button type="button" onClick={onClick} className="flex w-full items-center justify-between rounded-xl border-2 border-slate-200 bg-white px-4 py-3 text-left font-semibold text-slate-700 hover:bg-slate-50">
      <span>{label}</span>
      {score ? <span className="text-sm font-bold text-green-600">✓ {score}</span> : <span className="text-slate-300">›</span>}
    </button>
  )
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold text-slate-800">🎓 {t('exam')}</h1>
      <Card className="space-y-2 border-amber-300 bg-amber-50 text-sm text-amber-900">
        <p className="font-bold">{t('examIntroTitle')}</p>
        <p>{t('examIntro')}</p>
        <p>
          {t('examOfficial')}{' '}
          <a href="https://www.inburgeren.nl" target="_blank" rel="noreferrer" className="font-bold underline">
            inburgeren.nl
          </a>
        </p>
      </Card>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold text-slate-800">🏛️ KNM · {t('examKnm')}</h2>
        {knmTopics.map((k) => (
          <Row key={k.id} label={`${k.icon} ${k.title} · ${lang === 'vi' ? k.titleVi : k.titleEn}`} score={pct(progress.exam[k.id])} onClick={() => open({ kind: 'knm', id: k.id })} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold text-slate-800">📖 Lezen · {t('lessonReading')}</h2>
        {examReading.map((r) => (
          <Row key={r.id} label={r.title} score={pct(progress.reading[r.id])} onClick={() => open({ kind: 'reading', id: r.id })} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold text-slate-800">🎧 Luisteren · {t('examListening')}</h2>
        {listeningItems.map((l) => (
          <Row key={l.id} label={l.title} score={pct(progress.exam[l.id])} onClick={() => open({ kind: 'listening', id: l.id })} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold text-slate-800">✍️ Schrijven · {t('lessonWriting')}</h2>
        {examWriting.map((w) => (
          <Row key={w.id} label={w.title} score={progress.writing[w.id] ? '' : null} onClick={() => open({ kind: 'writing', id: w.id })} />
        ))}
      </section>

      <section className="space-y-2">
        <h2 className="text-xl font-extrabold text-slate-800">🗣️ Spreken · {t('examSpeaking')}</h2>
        <Row label={t('examSpeakingAll', { n: speakingTasks.length })} score={pct(progress.exam['speaking'])} onClick={() => open({ kind: 'speaking' })} />
      </section>
    </div>
  )
}

/** Multiple-choice questions one at a time, with an explanation after each answer. Used for KNM and listening. */
export function ExamQuiz({ id, onExit }: { id: string; onExit: () => void }) {
  const { t, progress, update } = useApp()
  const knm = knmTopics.find((k) => k.id === id)
  const item = listeningItems.find((l) => l.id === id)
  const questions: ExamQuestion[] = knm?.questions ?? item?.questions ?? []
  const [i, setI] = useState(0)
  const [chosen, setChosen] = useState<number | null>(null)
  const [right, setRight] = useState(0)
  const [showEn, setShowEn] = useState(false)
  const [showViWhy, setShowViWhy] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)
  const done = i >= questions.length
  const q = questions[i]

  const playDialogue = () => {
    if (item) sayAll(item.lines.map((l) => l.text), progress.settings.speechRate)
  }

  const next = () => {
    const nextI = i + 1
    if (nextI >= questions.length) {
      const score = right / questions.length
      update((p) => addXp({ ...p, exam: { ...p.exam, [id]: Math.max(p.exam[id] ?? 0, score) } }, 10 + right * 2))
    }
    setI(nextI)
    setChosen(null)
    setShowViWhy(false)
  }

  const choose = (oi: number) => {
    if (chosen !== null) return
    setChosen(oi)
    if (oi === q.answer) setRight(right + 1)
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <button type="button" aria-label={t('quit')} onClick={onExit} className="text-2xl font-bold text-slate-400 hover:text-slate-600">
          ✕
        </button>
        <h1 className="text-2xl font-extrabold text-slate-800">
          {knm ? `${knm.icon} ${knm.title}` : `🎧 ${item?.title}`}
        </h1>

        {item && (
          <Card className="space-y-3">
            <div className="flex items-center gap-3">
              <Button variant="blue" onClick={playDialogue}>
                🔊 {t('examPlay')}
              </Button>
              <button type="button" onClick={() => setShowTranscript(!showTranscript)} className="text-sm font-bold text-sky-600 underline">
                {t('examTranscript')}
              </button>
            </div>
            {showTranscript && (
              <div className="space-y-1 text-slate-700">
                {item.lines.map((l, k) => (
                  <p key={k}>
                    <b>{l.speaker}:</b> {l.text}
                  </p>
                ))}
              </div>
            )}
          </Card>
        )}

        {done ? (
          <Card className="space-y-4 text-center">
            <p className="text-5xl">🎉</p>
            <p className="text-2xl font-extrabold text-slate-800">{t('score', { n: right, total: questions.length })}</p>
            <Button className="w-full" onClick={onExit}>
              {t('continue')}
            </Button>
          </Card>
        ) : (
          <Card className="space-y-4">
            <p className="text-sm font-bold text-slate-400">
              {i + 1} / {questions.length}
            </p>
            <div className="flex items-start gap-3">
              <p className="flex-1 text-xl font-bold text-slate-800">{q.q}</p>
              <Speaker text={q.q} size="sm" />
            </div>
            <button type="button" onClick={() => setShowEn(!showEn)} className="text-sm font-bold text-sky-600 underline">
              {t('showQuestionEn')}
            </button>
            {showEn && <p className="text-slate-500">{q.qEn}</p>}
            <div className="grid gap-2">
              {q.options.map((o, oi) => (
                <button
                  key={oi}
                  type="button"
                  onClick={() => choose(oi)}
                  className={`rounded-xl border-2 px-3 py-3 text-left ${
                    chosen === null
                      ? 'border-slate-200 bg-white hover:bg-slate-50'
                      : oi === q.answer
                        ? 'border-green-400 bg-green-50 text-green-800'
                        : oi === chosen
                          ? 'border-red-400 bg-red-50 text-red-700'
                          : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
            {chosen !== null && (
              <div className="space-y-2">
                <p className={`font-extrabold ${chosen === q.answer ? 'text-green-700' : 'text-red-700'}`}>
                  {chosen === q.answer ? `✅ ${t('correct')}` : `❌ ${t('wrong')} ${q.options[q.answer]}`}
                </p>
                {q.why && <p className="text-slate-600">{q.why}</p>}
                {q.whyVi && (
                  <>
                    <button type="button" onClick={() => setShowViWhy(!showViWhy)} className="text-sm font-bold text-amber-700 underline">
                      🇻🇳 {t('showVietnamese')}
                    </button>
                    {showViWhy && <p className="rounded-xl bg-amber-50 p-3 text-amber-900">{q.whyVi}</p>}
                  </>
                )}
                <Button className="w-full" onClick={next}>
                  {t('continue')}
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}

/** Speaking practice: hear the question, answer out loud, compare with an example. */
export function ExamSpeaking({ onExit }: { onExit: () => void }) {
  const { t, update } = useApp()
  const [i, setI] = useState(0)
  const [heard, setHeard] = useState('')
  const [state, setState] = useState<'idle' | 'listening' | 'done'>('idle')
  const [showModel, setShowModel] = useState(false)
  const [showVi, setShowVi] = useState(false)
  const task = speakingTasks[i]
  const supported = canRecognize()

  const record = () => {
    const { promise } = listen()
    setState('listening')
    promise.then((g) => (setHeard(g[0] ?? ''), setState('done'))).catch(() => setState('idle'))
  }

  const next = () => {
    if (i + 1 >= speakingTasks.length) {
      update((p) => addXp({ ...p, exam: { ...p.exam, speaking: 1 } }, 20))
      onExit()
      return
    }
    setI(i + 1)
    setHeard('')
    setState('idle')
    setShowModel(false)
    setShowVi(false)
  }

  // a rough sign of a good answer: long enough, and some words of the example used
  const enough = heard.split(/\s+/).filter(Boolean).length >= 8
  const overlap = heard ? checkSpoken([heard], task.model.split('.')[0]) : false

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
        <button type="button" aria-label={t('quit')} onClick={onExit} className="text-2xl font-bold text-slate-400 hover:text-slate-600">
          ✕
        </button>
        <p className="text-sm font-bold text-slate-400">
          🗣️ {i + 1} / {speakingTasks.length}
        </p>
        <Card className="space-y-3">
          <p className="text-lg text-slate-800">{task.situation}</p>
          <p className="text-sm text-slate-500">{task.situationEn}</p>
          <button type="button" onClick={() => setShowVi(!showVi)} className="text-sm font-bold text-amber-700 underline">
            🇻🇳 {t('showVietnamese')}
          </button>
          {showVi && <p className="rounded-xl bg-amber-50 p-3 text-amber-900">{task.situationVi}</p>}
        </Card>
        <Card className="space-y-3">
          <div className="flex items-center gap-3">
            <Speaker text={task.question} />
            <p className="text-xl font-bold text-slate-800">“{task.question}”</p>
          </div>
          <p className="text-sm text-slate-500">{t('examSpeakTip')}</p>
          {supported ? (
            <Button variant="blue" className="w-full py-4 normal-case" disabled={state === 'listening'} onClick={record}>
              🎤 {state === 'listening' ? t('listening') : t('tapToSpeak')}
            </Button>
          ) : (
            <p className="rounded-xl bg-slate-100 p-3 text-slate-600">{t('speechUnsupported')}</p>
          )}
          {heard && (
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-sm font-bold text-slate-500">{t('heard')}</p>
              <p className="text-slate-800">“{heard}”</p>
              <p className="mt-2 text-sm text-slate-600">{enough ? `👍 ${t('examSpeakLong')}` : `💡 ${t('examSpeakShort')}`}{overlap ? ' ✨' : ''}</p>
            </div>
          )}
          <button type="button" onClick={() => setShowModel(!showModel)} className="text-sm font-bold text-sky-600 underline">
            📝 {t('modelAnswer')}
          </button>
          {showModel && (
            <div className="space-y-1 rounded-xl bg-green-50 p-3">
              <div className="flex items-start gap-2">
                <p className="flex-1 text-green-900">{task.model}</p>
                <Speaker text={task.model} size="sm" />
              </div>
              <p className="text-sm text-slate-500">{task.modelEn}</p>
            </div>
          )}
        </Card>
        <Button className="w-full" onClick={next}>
          {i + 1 >= speakingTasks.length ? t('continue') : t('examNext')}
        </Button>
      </div>
    </div>
  )
}

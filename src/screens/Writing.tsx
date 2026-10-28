// A free writing task. The learner writes, then compares with the example
// answer and a checklist. The text is also sent to the supporter, who can
// reply with feedback (later this could be done by AI as well).

import { useEffect, useState } from 'react'
import { writingTasks } from '../content'
import { saveWriting, watchWritings, type Writing as WritingDoc } from '../lib/cloud'
import { addXp } from '../lib/progress'
import { dayKey } from '../lib/dates'
import { useApp } from '../state'
import { Button, Card, ViReveal } from '../components/ui'

const SPECIAL = ['é', 'ë', 'è', 'ï', 'ö', 'ü']

export const countWords = (text: string) => text.trim().split(/\s+/).filter(Boolean).length

export function Writing({ taskId, onExit }: { taskId: string; onExit: () => void }) {
  const { t, progress, update, user } = useApp()
  const task = writingTasks.find((w) => w.id === taskId)!
  const saved = progress.writing[task.id]
  const [text, setText] = useState(saved?.text ?? '')
  const [done, setDone] = useState(!!saved)
  const [sent, setSent] = useState<'no' | 'cloud' | 'local'>('no')
  const [ticks, setTicks] = useState<boolean[]>(() => task.checklist.map(() => false))
  const [showEn, setShowEn] = useState(false)
  const [remote, setRemote] = useState<WritingDoc | null>(null)
  const words = countWords(text)

  // show feedback from the supporter, if there is any
  useEffect(() => {
    if (!user) return
    return watchWritings(user.uid, (list) => setRemote(list.find((w) => w.taskId === task.id) ?? null), () => {})
  }, [user, task.id])

  const submit = async () => {
    update((p) => addXp({ ...p, writing: { ...p.writing, [task.id]: { text, day: dayKey() } } }, saved ? 5 : 20))
    setDone(true)
    try {
      if (!user) throw new Error('guest')
      await saveWriting(user.uid, task.id, text)
      setSent('cloud')
    } catch {
      setSent('local')
    }
  }

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <button type="button" aria-label={t('quit')} onClick={onExit} className="text-2xl font-bold text-slate-400 hover:text-slate-600">
          ✕
        </button>
        <Card className="space-y-3">
          <p className="text-xs font-extrabold uppercase tracking-wider text-purple-500">✍️ {t('lessonWriting')}</p>
          <h1 className="text-2xl font-extrabold text-slate-800">{task.title}</h1>
          <p className="text-slate-700">{task.task}</p>
          <ViReveal text={task.taskVi} />
        </Card>

        {!done ? (
          <Card className="space-y-3">
            <h2 className="font-extrabold text-slate-700">{t('yourText')}</h2>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={t('writeHere')}
              lang="nl"
              spellCheck={false}
              className="h-64 w-full rounded-2xl border-2 border-slate-200 bg-white p-4 text-lg leading-relaxed outline-none focus:border-sky-400"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                {SPECIAL.map((ch) => (
                  <button key={ch} type="button" onClick={() => setText(text + ch)} className="rounded-lg border-2 border-slate-200 px-2.5 py-1 font-semibold text-slate-600">
                    {ch}
                  </button>
                ))}
              </div>
              <span className={`text-sm font-bold ${words >= task.minWords ? 'text-green-600' : 'text-slate-400'}`}>
                {t('wordCount', { n: words, min: task.minWords })}
              </span>
            </div>
            <Button className="w-full" disabled={words < task.minWords} onClick={submit}>
              {t('submitText')}
            </Button>
          </Card>
        ) : (
          <>
            <Card className="space-y-2">
              <h2 className="font-extrabold text-slate-700">{t('yourText')}</h2>
              <p className="whitespace-pre-line text-lg leading-relaxed text-slate-800">{text}</p>
              {sent !== 'no' && <p className="text-sm text-slate-500">{sent === 'cloud' ? t('sentToSupporter') : t('savedLocally')}</p>}
            </Card>

            {remote?.feedback && remote.text === text && (
              <Card className="space-y-2 border-pink-300 bg-pink-50">
                <h2 className="font-extrabold text-pink-800">💌 {t('feedbackFrom')}</h2>
                <p className="whitespace-pre-line text-pink-900">{remote.feedback}</p>
              </Card>
            )}

            <Card className="space-y-3">
              <h2 className="font-extrabold text-slate-700">✅ {t('checklist')}</h2>
              {task.checklist.map((c, i) => (
                <label key={i} className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    checked={ticks[i]}
                    onChange={() => setTicks(ticks.map((x, j) => (j === i ? !x : x)))}
                    className="mt-1 h-5 w-5 accent-green-500"
                  />
                  <span>
                    <span className="text-slate-800">{c.en}</span>
                    <span className="block text-sm text-amber-700">🇻🇳 {c.vi}</span>
                  </span>
                </label>
              ))}
            </Card>

            <Card className="space-y-2">
              <h2 className="font-extrabold text-slate-700">📝 {t('modelAnswer')}</h2>
              <p className="whitespace-pre-line leading-relaxed text-slate-800">{task.model}</p>
              <button type="button" onClick={() => setShowEn(!showEn)} className="text-sm font-bold text-sky-600 underline">
                {t('showTranslation')}
              </button>
              {showEn && <p className="text-sm text-slate-500">{task.modelEn}</p>}
            </Card>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="secondary" className="flex-1" onClick={() => (setDone(false), setSent('no'))}>
                {t('writeAgain')}
              </Button>
              <Button className="flex-1" onClick={onExit}>
                {t('continue')}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

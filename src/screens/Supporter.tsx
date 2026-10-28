// The supporter's dashboard: how the learner is doing, plus cheer messages.

import { useEffect, useState } from 'react'
import { LEARNER_UID } from '../config'
import { deleteCheer, deleteReport, listReports, sendCheer, watchCheers, watchLearner, type Cheer, type Report } from '../lib/cloud'
import { currentStreak, emptyProgress, type Progress } from '../lib/progress'
import { addDays, dayKey } from '../lib/dates'
import { weakestItems } from '../lib/srs'
import { chapters, itemById, itemLabel } from '../content'
import { useApp } from '../state'
import { Button, Card } from '../components/ui'

export function Supporter() {
  const { t, user } = useApp()
  const [data, setData] = useState<{ progress: Progress; name: string } | null>(null)
  const [cheers, setCheers] = useState<Cheer[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [text, setText] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!LEARNER_UID) return
    const fail = (e: unknown) => setError(String((e as Error).message ?? e))
    const a = watchLearner(LEARNER_UID, setData, fail)
    const b = watchCheers(LEARNER_UID, setCheers, fail)
    listReports().then(setReports).catch(fail)
    return () => (a(), b())
  }, [])

  const p = data?.progress ?? emptyProgress()
  const name = data?.name?.split(' ')[0] || 'Rosie'
  const today = dayKey()
  const days = Array.from({ length: 14 }, (_, i) => addDays(today, i - 13))
  const maxXp = Math.max(p.dailyGoal, ...days.map((d) => p.daily[d] ?? 0))
  const weakest = weakestItems(p.srs, 10)
    .map((id) => itemById.get(id))
    .filter((x) => !!x)
  const send = async () => {
    if (!text.trim() || !user) return
    await sendCheer(user.uid, LEARNER_UID, text.trim())
    setText('')
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold text-slate-800">💌 {t('supporterTitle', { name })}</h1>
      {error && <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {!data && <p className="text-slate-500">{t('learnerNotYet')}</p>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label={t('streak')} value={`🔥 ${currentStreak(p)}`} />
        <Stat label={t('totalXp')} value={`⭐ ${p.xp}`} />
        <Stat label={t('chaptersDone')} value={`👑 ${chapters.filter((c) => p.chapters[c.id]?.done).length}/${chapters.length}`} />
        <Stat label={t('wordsLearned')} value={`🔤 ${Object.keys(p.srs).length}`} />
      </div>

      <Card>
        <h2 className="mb-4 font-extrabold text-slate-700">{t('last14')}</h2>
        <div className="flex h-32 items-end gap-1.5">
          {days.map((d) => {
            const xp = p.daily[d] ?? 0
            return (
              <div key={d} className="flex flex-1 flex-col items-center gap-1" title={`${d}: ${xp} XP`}>
                <div
                  className={`w-full rounded-t-md ${xp >= p.dailyGoal ? 'bg-green-500' : xp ? 'bg-green-300' : 'bg-slate-100'}`}
                  style={{ height: `${Math.max(4, (xp / maxXp) * 100)}%` }}
                />
                <span className="text-[10px] text-slate-400">{Number(d.slice(8))}</span>
              </div>
            )
          })}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-extrabold text-slate-700">{t('weakest')}</h2>
        {weakest.length === 0 ? (
          <p className="text-slate-500">–</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {weakest.map((item) => {
              const l = itemLabel(item)
              const e = p.srs[item.id]
              return (
                <li key={item.id} className="flex justify-between gap-3 py-2">
                  <span>
                    <b className="text-slate-800">{l.nl}</b> <span className="text-slate-500">{l.en}</span>
                  </span>
                  <span className="shrink-0 text-sm text-red-500">✗ {e.wrong}</span>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-extrabold text-slate-700">{t('sendCheer')}</h2>
        <textarea
          value={text}
          maxLength={500}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('cheerPlaceholder')}
          className="h-24 w-full rounded-2xl border-2 border-slate-200 p-3 outline-none focus:border-sky-400"
        />
        <Button onClick={send} disabled={!text.trim()}>
          {t('send')} 💌
        </Button>
        {cheers.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-bold text-slate-500">{t('sentCheers')}</p>
            <ul className="space-y-2">
              {[...cheers].reverse().map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 rounded-xl bg-pink-50 p-3 text-pink-900">
                  <span>
                    {c.text}
                    {p.seenCheers.includes(c.id) && <span className="ml-2 text-xs text-pink-500">✓ {t('seen')}</span>}
                  </span>
                  <button type="button" onClick={() => deleteCheer(c.id)} className="text-xs text-pink-400 underline">
                    {t('remove')}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-extrabold text-slate-700">🚩 {t('reports')}</h2>
        {reports.length === 0 && <p className="text-slate-500">{t('noReports')}</p>}
        {reports.map((r) => (
          <details key={r.id} className="rounded-xl bg-slate-50 p-3">
            <summary className="cursor-pointer">
              <span className="text-sm text-slate-400">{new Date(r.createdAt).toLocaleString()}</span> {r.message || '—'}
            </summary>
            <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-slate-600">{r.exercise}</pre>
            <button
              type="button"
              onClick={() => deleteReport(r.id!).then(() => setReports(reports.filter((x) => x.id !== r.id)))}
              className="mt-2 text-xs text-slate-500 underline"
            >
              {t('remove')}
            </button>
          </details>
        ))}
      </Card>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-4">
      <p className="text-2xl font-extrabold text-slate-800">{value}</p>
      <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
    </div>
  )
}

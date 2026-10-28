// The frame around the main screens: menu on the left (desktop) or bottom
// (phone), and streak / daily goal / review on the right.

import { useEffect, useState, type ReactNode } from 'react'
import { useApp } from '../state'
import { currentStreak } from '../lib/progress'
import { dayKey } from '../lib/dates'
import { dueItems } from '../lib/srs'
import { watchCheers, type Cheer } from '../lib/cloud'
import { LEARNER_UID } from '../config'
import { Button, Modal, ProgressBar } from './ui'
import type { StringKey } from '../lib/i18n'

export type Tab = 'learn' | 'review' | 'notes' | 'settings' | 'supporter'

const TABS: { id: Tab; icon: string; label: StringKey }[] = [
  { id: 'learn', icon: '🏠', label: 'learn' },
  { id: 'review', icon: '🔁', label: 'review' },
  { id: 'notes', icon: '📒', label: 'notes' },
  { id: 'supporter', icon: '💌', label: 'supporter' },
  { id: 'settings', icon: '⚙️', label: 'settings' },
]

export function Layout({ tab, setTab, children }: { tab: Tab; setTab: (t: Tab) => void; children: ReactNode }) {
  const { t, role } = useApp()
  const tabs = TABS.filter((x) => x.id !== 'supporter' || role === 'supporter')
  return (
    <div className="min-h-dvh bg-slate-50 lg:flex">
      {/* desktop menu */}
      <nav className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col gap-2 border-r-2 border-slate-200 bg-white p-4 lg:flex">
        <p className="mb-6 px-3 text-2xl font-extrabold text-green-500">🇳🇱 {t('appName')}</p>
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setTab(x.id)}
            className={`flex items-center gap-4 rounded-xl border-2 px-3 py-3 text-left font-extrabold uppercase tracking-wide ${
              tab === x.id ? 'border-sky-300 bg-sky-50 text-sky-600' : 'border-transparent text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span className="text-2xl">{x.icon}</span>
            {t(x.label)}
          </button>
        ))}
      </nav>

      <div className="flex min-w-0 flex-1 justify-center gap-8 px-4 pb-24 pt-4 lg:px-8 lg:pb-8 lg:pt-8">
        <main className="w-full min-w-0 max-w-2xl">
          <div className="mb-4 xl:hidden">
            <StatsBar compact />
          </div>
          {children}
        </main>
        <aside className="sticky top-8 hidden h-fit w-80 shrink-0 space-y-4 xl:block">
          <StatsBar />
          <ReviewCard onOpen={() => setTab('review')} />
        </aside>
      </div>

      {/* phone menu */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex justify-around border-t-2 border-slate-200 bg-white py-2 lg:hidden">
        {tabs.map((x) => (
          <button
            key={x.id}
            type="button"
            aria-label={t(x.label)}
            onClick={() => setTab(x.id)}
            className={`flex flex-col items-center rounded-xl px-3 py-1 text-xs font-bold ${tab === x.id ? 'bg-sky-50 text-sky-600' : 'text-slate-500'}`}
          >
            <span className="text-2xl">{x.icon}</span>
            {t(x.label)}
          </button>
        ))}
      </nav>
      <CheerPopup />
    </div>
  )
}

function StatsBar({ compact = false }: { compact?: boolean }) {
  const { t, progress } = useApp()
  const today = progress.daily[dayKey()] ?? 0
  const streak = currentStreak(progress)
  if (compact)
    return (
      <div className="flex items-center justify-between rounded-2xl border-2 border-slate-200 bg-white px-4 py-2 font-extrabold">
        <span className={streak ? 'text-orange-500' : 'text-slate-400'}>🔥 {streak}</span>
        <span className="text-amber-500">⭐ {progress.xp}</span>
        <span className="flex items-center gap-2 text-sm text-slate-500">
          🎯 {Math.min(today, progress.dailyGoal)}/{progress.dailyGoal}
        </span>
      </div>
    )
  return (
    <div className="space-y-4 rounded-2xl border-2 border-slate-200 bg-white p-5">
      <div className="flex justify-between">
        <div>
          <p className={`text-3xl font-extrabold ${streak ? 'text-orange-500' : 'text-slate-300'}`}>🔥 {streak}</p>
          <p className="text-sm font-bold text-slate-500">{t('streak')}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-extrabold text-amber-500">⭐ {progress.xp}</p>
          <p className="text-sm font-bold text-slate-500">XP</p>
        </div>
      </div>
      <div>
        <p className="mb-2 font-extrabold text-slate-700">{t('dailyGoal')}</p>
        <ProgressBar value={today / progress.dailyGoal} />
        <p className="mt-2 text-sm text-slate-500">
          {today >= progress.dailyGoal ? t('goalReached') : t('xpToday', { n: today, goal: progress.dailyGoal })}
        </p>
      </div>
    </div>
  )
}

function ReviewCard({ onOpen }: { onOpen: () => void }) {
  const { t, progress } = useApp()
  const due = dueItems(progress.srs, dayKey()).length
  return (
    <div className="rounded-2xl border-2 border-slate-200 bg-white p-5">
      <p className="mb-1 font-extrabold text-slate-700">🔁 {t('review')}</p>
      <p className="mb-4 text-sm text-slate-500">{due ? t('reviewDue', { n: due }) : t('reviewNone')}</p>
      {due > 0 && (
        <Button variant="blue" className="w-full" onClick={onOpen}>
          {t('reviewStart')}
        </Button>
      )}
    </div>
  )
}

/** Shows new messages from the supporter. */
function CheerPopup() {
  const { t, user, progress, update } = useApp()
  const [cheers, setCheers] = useState<Cheer[]>([])
  useEffect(() => {
    if (!user || !LEARNER_UID || user.uid !== LEARNER_UID) return
    return watchCheers(user.uid, setCheers, () => {})
  }, [user])
  const unseen = cheers.filter((c) => !progress.seenCheers.includes(c.id))
  if (!unseen.length) return null
  const markSeen = () => update((p) => ({ ...p, seenCheers: [...p.seenCheers, ...unseen.map((c) => c.id)] }))
  return (
    <Modal onClose={markSeen}>
      <p className="mb-4 text-center text-5xl">💌</p>
      <h2 className="mb-4 text-center text-2xl font-extrabold text-slate-800">{t('cheerFrom')}</h2>
      <div className="space-y-3">
        {unseen.map((c) => (
          <p key={c.id} className="rounded-2xl bg-pink-50 p-4 text-lg text-pink-900">
            {c.text}
          </p>
        ))}
      </div>
      <Button className="mt-6 w-full" onClick={markSeen}>
        ❤️ {t('gotIt')}
      </Button>
    </Modal>
  )
}

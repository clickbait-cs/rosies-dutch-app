// Everything we remember about the learner. It is saved in the browser
// (localStorage) and, once the learner is signed in, synced to Firebase.

import { addDays, dayKey, daysBetween } from './dates'
import type { SrsState } from './srs'

export type UiLang = 'en' | 'vi'

export interface ChapterProgress {
  lessons: number[] // indexes of finished lessons
  done: boolean // chapter check passed (or skipped by the placement test)
  placed?: boolean // marked done by the placement test
}

export interface Progress {
  version: 1
  xp: number
  daily: Record<string, number> // day -> XP earned that day
  streak: number
  lastActiveDay: string | null
  dailyGoal: number
  placement: { done: boolean; startChapter?: string; day?: string }
  chapters: Record<string, ChapterProgress>
  srs: SrsState
  seenTips: string[]
  seenCheers: string[]
  settings: { uiLang: UiLang; listening: boolean; speaking: boolean; speechRate: number }
  updatedAt: number
}

export function emptyProgress(): Progress {
  return {
    version: 1,
    xp: 0,
    daily: {},
    streak: 0,
    lastActiveDay: null,
    dailyGoal: 30,
    placement: { done: false },
    chapters: {},
    srs: {},
    seenTips: [],
    seenCheers: [],
    settings: { uiLang: 'en', listening: true, speaking: true, speechRate: 0.9 },
    updatedAt: 0,
  }
}

/** Fill in any fields missing from older saved data. */
export function withDefaults(p: Partial<Progress> | null | undefined): Progress {
  const base = emptyProgress()
  if (!p) return base
  return { ...base, ...p, settings: { ...base.settings, ...p.settings }, placement: { ...base.placement, ...p.placement } }
}

/** Add XP for today and keep the streak up to date. */
export function addXp(p: Progress, amount: number, today: string = dayKey()): Progress {
  let streak = p.streak
  if (p.lastActiveDay !== today) {
    streak = p.lastActiveDay && daysBetween(p.lastActiveDay, today) === 1 ? p.streak + 1 : 1
  }
  const daily = { ...p.daily, [today]: (p.daily[today] ?? 0) + amount }
  // only keep the last 60 days
  const cutoff = addDays(today, -60)
  for (const day of Object.keys(daily)) if (day < cutoff) delete daily[day]
  return { ...p, xp: p.xp + amount, daily, streak, lastActiveDay: today }
}

/** The streak as it should be shown today (0 if a day was missed). */
export function currentStreak(p: Progress, today: string = dayKey()): number {
  if (!p.lastActiveDay) return 0
  return daysBetween(p.lastActiveDay, today) <= 1 ? p.streak : 0
}

/**
 * Combine progress saved on this device with progress from the cloud, e.g.
 * when practising on the laptop and then on the phone. We never throw away
 * finished lessons or XP.
 */
export function mergeProgress(a: Progress, b: Progress): Progress {
  const newer = a.updatedAt >= b.updatedAt ? a : b
  const older = newer === a ? b : a

  const chapters: Record<string, ChapterProgress> = { ...older.chapters }
  for (const [id, c] of Object.entries(newer.chapters)) {
    const o = chapters[id]
    chapters[id] = o
      ? { lessons: [...new Set([...o.lessons, ...c.lessons])].sort((x, y) => x - y), done: o.done || c.done, placed: c.placed ?? o.placed }
      : c
  }

  const srs = { ...older.srs }
  for (const [id, e] of Object.entries(newer.srs)) {
    const o = srs[id]
    srs[id] = !o || e.right + e.wrong >= o.right + o.wrong ? e : o
  }

  const daily = { ...older.daily }
  for (const [day, xp] of Object.entries(newer.daily)) daily[day] = Math.max(daily[day] ?? 0, xp)

  const lastActiveDay = [a.lastActiveDay, b.lastActiveDay].filter(Boolean).sort().pop() ?? null
  return {
    ...newer,
    xp: Math.max(a.xp, b.xp),
    daily,
    chapters,
    srs,
    lastActiveDay,
    streak: lastActiveDay === a.lastActiveDay && lastActiveDay === b.lastActiveDay ? Math.max(a.streak, b.streak) : lastActiveDay === a.lastActiveDay ? a.streak : b.streak,
    placement: a.placement.done ? a.placement : b.placement,
    seenTips: [...new Set([...a.seenTips, ...b.seenTips])],
    seenCheers: [...new Set([...a.seenCheers, ...b.seenCheers])],
  }
}

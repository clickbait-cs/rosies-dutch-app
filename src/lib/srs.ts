// Spaced repetition ("Leitner boxes"). Every word or sentence the learner has
// practised sits in a box from 1 to 6. A right answer moves it up a box, so it
// comes back later; a wrong answer drops it back to box 1, so it comes back
// tomorrow.

import { addDays, daysBetween } from './dates'

export interface SrsEntry {
  box: number // 1..6
  due: string // day it should be reviewed again
  right: number
  wrong: number
}

export type SrsState = Record<string, SrsEntry>

/** Days to wait before reviewing again, per box. */
const INTERVALS = [0, 1, 2, 4, 7, 15, 30]
export const MAX_BOX = 6

export function recordAnswer(entry: SrsEntry | undefined, correct: boolean, today: string): SrsEntry {
  const current = entry ?? { box: 0, due: today, right: 0, wrong: 0 }
  const box = correct ? Math.min(current.box + 1, MAX_BOX) : 1
  return {
    box,
    due: addDays(today, INTERVALS[box]),
    right: current.right + (correct ? 1 : 0),
    wrong: current.wrong + (correct ? 0 : 1),
  }
}

/** Item ids that are due today, most overdue / weakest first. */
export function dueItems(srs: SrsState, today: string): string[] {
  return Object.entries(srs)
    .filter(([, e]) => daysBetween(e.due, today) >= 0)
    .sort(([, a], [, b]) => a.box - b.box || daysBetween(b.due, a.due))
    .map(([id]) => id)
}

/** Items the learner gets wrong most often (for the supporter view). */
export function weakestItems(srs: SrsState, n: number): string[] {
  return Object.entries(srs)
    .filter(([, e]) => e.wrong > 0)
    .sort(([, a], [, b]) => b.wrong - b.right * 0.5 - (a.wrong - a.right * 0.5) || a.box - b.box)
    .slice(0, n)
    .map(([id]) => id)
}

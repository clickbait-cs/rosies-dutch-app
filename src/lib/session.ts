// What happens to the learner's progress after a lesson, review or placement test.

import { addXp, type Progress } from './progress'
import { recordAnswer } from './srs'
import { dayKey } from './dates'
import { CHECK_LESSON, LESSONS, PASS_MARK } from './exercises'
import type { Chapter } from '../content/types'

export function applyAnswers(p: Progress, answers: [string, boolean][], today = dayKey()): Progress {
  const srs = { ...p.srs }
  // An item can appear several times in one lesson; one wrong answer counts as wrong.
  const result = new Map<string, boolean>()
  for (const [id, ok] of answers) result.set(id, (result.get(id) ?? true) && ok)
  for (const [id, ok] of result) srs[id] = recordAnswer(srs[id], ok, today)
  return { ...p, srs }
}

export interface LessonOutcome {
  xp: number
  passed: boolean // false only for a failed chapter check
}

export function lessonOutcome(index: number, accuracy: number): LessonOutcome {
  if (index === CHECK_LESSON) {
    const passed = accuracy >= PASS_MARK
    return { passed, xp: passed ? 20 : 5 }
  }
  return { passed: true, xp: accuracy === 1 ? 15 : 10 }
}

export function finishLesson(p: Progress, ch: Chapter, index: number, accuracy: number, answers: [string, boolean][], today = dayKey()) {
  const outcome = lessonOutcome(index, accuracy)
  let next = applyAnswers(p, answers, today)
  next = addXp(next, outcome.xp, today)
  if (outcome.passed) {
    const cp = next.chapters[ch.id] ?? { lessons: [], done: false }
    const lessons = [...new Set([...cp.lessons, index])].sort((a, b) => a - b)
    next = { ...next, chapters: { ...next.chapters, [ch.id]: { ...cp, lessons, done: cp.done || index === CHECK_LESSON } } }
  }
  return { progress: next, outcome }
}

/** Mark every chapter before `startIndex` as done (placement test result). */
export function applyPlacement(p: Progress, all: Chapter[], startIndex: number, today = dayKey()): Progress {
  const chapters = { ...p.chapters }
  all.slice(0, startIndex).forEach((ch) => {
    const cp = chapters[ch.id]
    if (!cp?.done) chapters[ch.id] = { lessons: cp?.lessons ?? [], done: true, placed: true }
  })
  const start = all[Math.min(startIndex, all.length - 1)]
  return addXp({ ...p, chapters, placement: { done: true, startChapter: start.id, day: today } }, 10, today)
}

// ------------------------------------------------------- what is unlocked?

export function isChapterUnlocked(p: Progress, all: Chapter[], i: number): boolean {
  return i === 0 || !!p.chapters[all[i - 1].id]?.done || !!p.chapters[all[i].id]?.lessons.length || !!p.chapters[all[i].id]?.done
}

export function isLessonUnlocked(p: Progress, all: Chapter[], chapterIndex: number, lesson: number): boolean {
  if (!isChapterUnlocked(p, all, chapterIndex)) return false
  const cp = p.chapters[all[chapterIndex].id]
  if (cp?.done) return true
  return lesson === 0 || !!cp?.lessons.includes(lesson - 1)
}

/** The first lesson that isn't finished yet, to highlight on the home screen. */
export function nextLesson(p: Progress, all: Chapter[]): { chapter: number; lesson: number } | null {
  for (let c = 0; c < all.length; c++) {
    const cp = p.chapters[all[c].id]
    if (cp?.done) continue
    const lesson = LESSONS.find((l) => !cp?.lessons.includes(l.index))
    return { chapter: c, lesson: lesson?.index ?? CHECK_LESSON }
  }
  return null
}

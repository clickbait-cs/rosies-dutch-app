import { describe, expect, it } from 'vitest'
import { checkSpoken, checkTyped } from '../lib/check'
import { addXp, currentStreak, emptyProgress, mergeProgress } from '../lib/progress'
import { dueItems, recordAnswer } from '../lib/srs'
import { answerPlacement, startPlacement } from '../lib/placement'
import { applyPlacement, finishLesson, isChapterUnlocked, isLessonUnlocked, nextLesson } from '../lib/session'
import { chapters } from '../content'

describe('checking typed answers', () => {
  it('ignores capitals and punctuation', () => {
    expect(checkTyped('ik woon in nederland', ['Ik woon in Nederland.'])).toBe('correct')
  })
  it('allows a small typo', () => {
    expect(checkTyped('Ik won in Nederland', ['Ik woon in Nederland.'])).toBe('typo')
    expect(checkTyped('een', ['één'])).toBe('typo')
  })
  it('rejects wrong answers', () => {
    expect(checkTyped('Ik werk in Nederland', ['Ik woon in Nederland.'])).toBe('wrong')
    expect(checkTyped('', ['ja'])).toBe('wrong')
  })
  it('is strict with very short words', () => {
    expect(checkTyped('de', ['het'])).toBe('wrong')
  })
  it('accepts mostly right speech', () => {
    expect(checkSpoken(['ik woon in nederland'], 'Ik woon in Nederland.')).toBe(true)
    expect(checkSpoken(['hallo'], 'Ik woon in Nederland.')).toBe(false)
  })
})

describe('streaks and XP', () => {
  it('counts consecutive days', () => {
    let p = addXp(emptyProgress(), 10, '2026-01-01')
    p = addXp(p, 10, '2026-01-02')
    p = addXp(p, 10, '2026-01-02')
    expect(p.streak).toBe(2)
    expect(p.xp).toBe(30)
    expect(p.daily['2026-01-02']).toBe(20)
    expect(currentStreak(p, '2026-01-03')).toBe(2)
    expect(currentStreak(p, '2026-01-04')).toBe(0)
    expect(addXp(p, 5, '2026-01-05').streak).toBe(1)
  })
})

describe('spaced repetition', () => {
  it('moves items up a box when right and back to 1 when wrong', () => {
    let e = recordAnswer(undefined, true, '2026-01-01')
    expect(e).toMatchObject({ box: 1, due: '2026-01-02' })
    e = recordAnswer(e, true, '2026-01-02')
    expect(e).toMatchObject({ box: 2, due: '2026-01-04' })
    e = recordAnswer(e, false, '2026-01-04')
    expect(e).toMatchObject({ box: 1, wrong: 1, right: 2 })
  })
  it('lists due items', () => {
    const srs = { a: recordAnswer(undefined, true, '2026-01-01'), b: recordAnswer(undefined, false, '2026-01-01') }
    expect(dueItems(srs, '2026-01-01')).toEqual([])
    expect(dueItems(srs, '2026-01-02').sort()).toEqual(['a', 'b'])
  })
})

describe('placement test', () => {
  it('stops at the first chapter with two mistakes', () => {
    let s = startPlacement()
    s = answerPlacement(s, true, 5)
    s = answerPlacement(s, true, 5) // chapter 0 passed
    s = answerPlacement(s, true, 5)
    s = answerPlacement(s, false, 5)
    s = answerPlacement(s, true, 5) // chapter 1 passed 2/3
    s = answerPlacement(s, false, 5)
    s = answerPlacement(s, false, 5) // chapter 2 failed
    expect(s).toMatchObject({ finished: true, startAt: 2, total: 7 })
  })
  it('marks earlier chapters as done', () => {
    const p = applyPlacement(emptyProgress(), chapters, 3)
    expect(p.chapters[chapters[2].id].done).toBe(true)
    expect(p.chapters[chapters[3].id]).toBeUndefined()
    expect(isChapterUnlocked(p, chapters, 3)).toBe(true)
    expect(isChapterUnlocked(p, chapters, 4)).toBe(false)
    expect(nextLesson(p, chapters)).toEqual({ chapter: 3, lesson: 0 })
  })
})

describe('lessons', () => {
  it('unlocks lessons in order and needs 80% for the chapter check', () => {
    const ch = chapters[0]
    let p = emptyProgress()
    expect(isLessonUnlocked(p, chapters, 0, 1)).toBe(false)
    p = finishLesson(p, ch, 0, 0.5, []).progress
    expect(isLessonUnlocked(p, chapters, 0, 1)).toBe(true)
    const failed = finishLesson(p, ch, 4, 0.7, [])
    expect(failed.outcome.passed).toBe(false)
    expect(failed.progress.chapters[ch.id].done).toBe(false)
    const passed = finishLesson(p, ch, 4, 0.9, [])
    expect(passed.progress.chapters[ch.id].done).toBe(true)
    expect(isChapterUnlocked(passed.progress, chapters, 1)).toBe(true)
  })
})

describe('merging progress from two devices', () => {
  it('keeps finished lessons and XP from both', () => {
    const a = { ...emptyProgress(), xp: 50, updatedAt: 1, chapters: { x: { lessons: [0, 1], done: false } } }
    const b = { ...emptyProgress(), xp: 30, updatedAt: 2, chapters: { x: { lessons: [2], done: false }, y: { lessons: [0], done: false } } }
    const m = mergeProgress(a, b)
    expect(m.xp).toBe(50)
    expect(m.chapters.x.lessons).toEqual([0, 1, 2])
    expect(m.chapters.y.lessons).toEqual([0])
  })
})

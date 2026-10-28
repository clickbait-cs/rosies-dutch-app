// Checks the lesson content, so a typo in a JSON file is caught before it
// reaches the app. Run with: npm test

import { describe, expect, it } from 'vitest'
import { chapters, tipById } from '../content'
import { buildLesson, buildReview, LESSONS, placementQuestions, tokenize } from '../lib/exercises'
import { gradeAnswer } from '../lib/grade'
import { makeRng } from '../lib/random'

const opts = { listening: true, speaking: true }

describe('content', () => {
  it('has 10 chapters in book 1 and 8 in book 2', () => {
    expect(chapters.filter((c) => c.book === 1)).toHaveLength(10)
    expect(chapters.filter((c) => c.book === 2)).toHaveLength(8)
  })

  for (const ch of chapters) {
    describe(ch.id, () => {
      it('has enough words and sentences', () => {
        expect(ch.words.length).toBeGreaterThanOrEqual(16)
        expect(ch.sentences.length).toBeGreaterThanOrEqual(8)
        expect(ch.grammar.length).toBeGreaterThanOrEqual(1)
      })

      it('has Vietnamese and English for everything', () => {
        for (const x of [...ch.words, ...ch.sentences]) {
          expect(x.en, x.nl).toBeTruthy()
          expect(x.vi, x.nl).toBeTruthy()
        }
        for (const g of ch.grammar) expect(g.vi).toBeTruthy()
      })

      it('has no duplicate words', () => {
        const keys = ch.words.map((w) => w.nl)
        expect(new Set(keys).size).toBe(keys.length)
      })

      it('only links to tips that exist', () => {
        const ids = [...ch.sentences.map((s) => s.tip), ...ch.grammar.map((g) => g.tip)].filter(Boolean)
        for (const id of ids) expect(tipById.has(id!), id).toBe(true)
      })

      it('has material for its grammar drills', () => {
        if (ch.drills.includes('plural')) expect(ch.words.filter((w) => w.plural).length).toBeGreaterThanOrEqual(4)
        if (ch.drills.includes('conjugation')) expect(ch.verbs?.length ?? 0).toBeGreaterThanOrEqual(2)
      })

      it('builds every lesson with valid exercises', () => {
        for (let seed = 1; seed <= 5; seed++) {
          for (const l of LESSONS) {
            const list = buildLesson(ch, l.index, makeRng(seed), opts)
            expect(list.length, `lesson ${l.index}`).toBeGreaterThanOrEqual(6)
            for (const ex of list) {
              if (ex.kind === 'choice') {
                expect(ex.options).toContain(ex.answer)
                expect(new Set(ex.options).size).toBe(ex.options.length)
                expect(gradeAnswer(ex, ex.answer).grade).toBe('correct')
              }
              if (ex.kind === 'tiles') {
                // the right answer can always be built from the tiles
                const pool = [...ex.tiles]
                for (const t of tokenize(ex.answer)) {
                  const i = pool.indexOf(t)
                  expect(i, `${t} in ${ex.answer}`).toBeGreaterThanOrEqual(0)
                  pool.splice(i, 1)
                }
                expect(gradeAnswer(ex, tokenize(ex.answer)).grade).toBe('correct')
              }
              if (ex.kind === 'type') expect(gradeAnswer(ex, ex.answers[0]).grade).toBe('correct')
            }
          }
        }
      })

      it('builds placement questions', () => {
        expect(placementQuestions(ch, makeRng(3))).toHaveLength(3)
      })
    })
  }

  it('builds reviews for any item', () => {
    const ids = chapters.flatMap((ch) => ch.words.slice(0, 2).map((w) => `${ch.id}:w:${w.nl}`))
    expect(buildReview(ids, makeRng(1), opts, 100)).toHaveLength(ids.length)
  })
})

describe('reading and writing', async () => {
  const { readingTexts, writingTasks } = await import('../content')
  const ids = new Set(chapters.map((c) => c.id))
  it('every text belongs to a chapter and has valid answers', () => {
    expect(new Set(readingTexts.map((r) => r.id)).size).toBe(readingTexts.length)
    for (const r of readingTexts) {
      expect(ids.has(r.chapterId), r.id).toBe(true)
      for (const q of r.questions) {
        expect(q.answer, q.q).toBeLessThan(q.options.length)
        expect(new Set(q.options).size, q.q).toBe(q.options.length)
      }
    }
  })
  it('every writing task belongs to a chapter and its example is long enough', async () => {
    const { countWords } = await import('../screens/Writing')
    for (const w of writingTasks) {
      expect(ids.has(w.chapterId), w.id).toBe(true)
      expect(countWords(w.model), w.id).toBeGreaterThanOrEqual(w.minWords)
    }
  })
})

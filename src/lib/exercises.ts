// Turns chapter content into exercises. Nothing here is written by hand per
// lesson: each lesson picks words and sentences from its chapter and builds a
// mix of exercise types from them.

import { chapters, itemById, sentenceId, verbId, withArticle, wordId, type Item } from '../content'
import type { Chapter, Sentence, Verb, Word } from '../content/types'
import { pick, sample, shuffle, type Rng } from './random'

/** Which instruction to show above the exercise (translated in i18n.ts). */
export type Instruction =
  | 'selectMeaning'
  | 'selectDutch'
  | 'translateSentence'
  | 'buildSentence'
  | 'typeDutch'
  | 'listenPick'
  | 'listenBuild'
  | 'listenType'
  | 'speak'
  | 'chooseArticle'
  | 'typePlural'
  | 'conjugate'
  | 'wordOrder'
  | 'matchPairs'
  | 'fillBlank'

interface Base {
  instruction: Instruction
  itemIds: string[] // used for spaced repetition
  vi: string // shown when the learner taps the Vietnamese button
  tip?: string // tip id shown automatically (Vietnamese help for hard concepts)
  isNew?: boolean
  needs?: 'listening' | 'speaking'
}

export type Exercise =
  | (Base & { kind: 'choice'; prompt: string; audio?: string; options: string[]; answer: string; reveal?: string })
  | (Base & { kind: 'match'; pairs: { nl: string; en: string; vi: string }[] })
  | (Base & { kind: 'tiles'; prompt: string; audio?: string; answer: string; alt: string[]; tiles: string[]; reveal?: string })
  | (Base & { kind: 'type'; prompt: string; audio?: string; answers: string[]; bareAnswers?: string[]; reveal?: string })
  | (Base & { kind: 'speak'; text: string; en: string })

export interface ExerciseOptions {
  listening: boolean
  speaking: boolean
}

export type LessonKind = 'words' | 'sentences' | 'grammar' | 'check'
export interface LessonInfo {
  index: number
  kind: LessonKind
}

/** Every chapter has the same five lessons. */
export const LESSONS: LessonInfo[] = [
  { index: 0, kind: 'words' },
  { index: 1, kind: 'words' },
  { index: 2, kind: 'sentences' },
  { index: 3, kind: 'grammar' },
  { index: 4, kind: 'check' },
]
export const CHECK_LESSON = 4
/** Share of first-try correct answers needed to pass the chapter check. */
export const PASS_MARK = 0.8

// ---------------------------------------------------------------- helpers

function wordHalf(ch: Chapter, half: 0 | 1): Word[] {
  const mid = Math.ceil(ch.words.length / 2)
  return half === 0 ? ch.words.slice(0, mid) : ch.words.slice(mid)
}

function allWords(): { ch: Chapter; w: Word }[] {
  return chapters.flatMap((ch) => ch.words.map((w) => ({ ch, w })))
}

/** Wrong answer options: other words from the same chapter first, then nearby chapters. */
function distractors(ch: Chapter, correct: Word, count: number, field: 'en' | 'nl', rng: Rng): string[] {
  const show = (w: Word) => (field === 'en' ? w.en : withArticle(w))
  const target = show(correct)
  const same = ch.words.filter((w) => show(w) !== target)
  const others = allWords()
    .filter(({ ch: c, w }) => c.id !== ch.id && show(w) !== target)
    .map(({ w }) => w)
  const pool = [...shuffle(same, rng), ...shuffle(others, rng)]
  const out: string[] = []
  for (const w of pool) {
    const s = show(w)
    if (!out.includes(s) && s !== target && !(field === 'en' && overlaps(s, target))) out.push(s)
    if (out.length === count) break
  }
  return out
}

/** True when two meanings share a word, e.g. "goodbye" and "bye / hello", so they'd be confusing as options. */
function overlaps(a: string, b: string): boolean {
  const parts = (x: string) => x.toLowerCase().split(/[/,()]/).map((p) => p.trim()).filter((p) => p.length > 2)
  return parts(a).some((p) => parts(b).some((q) => p.includes(q) || q.includes(p)))
}

export function tokenize(sentence: string): string[] {
  return sentence
    .replace(/[.!?]+$/, '')
    .split(/\s+/)
    .filter(Boolean)
}

function sentenceTiles(ch: Chapter, s: Sentence, rng: Rng): string[] {
  const answer = tokenize(s.nl)
  const used = new Set(answer.map((t) => t.toLowerCase()))
  const extra = shuffle(
    ch.sentences.flatMap((o) => tokenize(o.nl)).concat(ch.words.map((w) => w.nl)),
    rng,
  ).filter((t) => {
    const k = t.toLowerCase().replace(/[,]/g, '')
    if (used.has(k) || k.includes(' ')) return false
    used.add(k)
    return true
  })
  return shuffle([...answer, ...extra.slice(0, Math.min(5, Math.max(3, Math.round(answer.length / 2) + 1)))], rng)
}

// ---------------------------------------------------------- exercise makers

function choiceNlToEn(ch: Chapter, w: Word, rng: Rng, isNew = false): Exercise {
  return {
    kind: 'choice',
    instruction: 'selectMeaning',
    prompt: withArticle(w),
    audio: withArticle(w),
    options: shuffle([w.en, ...distractors(ch, w, 3, 'en', rng)], rng),
    answer: w.en,
    itemIds: [wordId(ch, w)],
    vi: w.vi,
    isNew,
  }
}

function choiceEnToNl(ch: Chapter, w: Word, rng: Rng): Exercise {
  return {
    kind: 'choice',
    instruction: 'selectDutch',
    prompt: w.en,
    options: shuffle([withArticle(w), ...distractors(ch, w, 3, 'nl', rng)], rng),
    answer: withArticle(w),
    itemIds: [wordId(ch, w)],
    vi: w.vi,
  }
}

function listenPickWord(ch: Chapter, w: Word, rng: Rng): Exercise {
  return {
    kind: 'choice',
    instruction: 'listenPick',
    prompt: '',
    audio: withArticle(w),
    options: shuffle([withArticle(w), ...distractors(ch, w, 3, 'nl', rng)], rng),
    answer: withArticle(w),
    reveal: `${withArticle(w)} = ${w.en}`,
    itemIds: [wordId(ch, w)],
    vi: w.vi,
    needs: 'listening',
  }
}

function typeWord(ch: Chapter, w: Word): Exercise {
  const full = [withArticle(w), ...(w.alt ?? [])]
  return {
    kind: 'type',
    instruction: 'typeDutch',
    prompt: w.en,
    answers: full,
    bareAnswers: w.article ? [w.nl] : undefined,
    itemIds: [wordId(ch, w)],
    vi: w.vi,
    tip: w.article ? 'articles' : undefined,
  }
}

function matchPairs(ch: Chapter, words: Word[]): Exercise {
  return {
    kind: 'match',
    instruction: 'matchPairs',
    pairs: words.map((w) => ({ nl: withArticle(w), en: w.en, vi: w.vi })),
    itemIds: words.map((w) => wordId(ch, w)),
    vi: words.map((w) => `${withArticle(w)} = ${w.vi}`).join('\n'),
  }
}

function tilesSentence(ch: Chapter, s: Sentence, rng: Rng, instruction: Instruction = 'buildSentence'): Exercise {
  return {
    kind: 'tiles',
    instruction,
    prompt: s.en,
    answer: s.nl,
    alt: s.alt ?? [],
    tiles: sentenceTiles(ch, s, rng),
    itemIds: [sentenceId(ch, s)],
    vi: s.vi,
    tip: s.tip,
  }
}

function listenTiles(ch: Chapter, s: Sentence, rng: Rng): Exercise {
  return { ...tilesSentence(ch, s, rng, 'listenBuild'), prompt: '', audio: s.nl, reveal: s.en, needs: 'listening' } as Exercise
}

function typeSentence(ch: Chapter, s: Sentence): Exercise {
  return {
    kind: 'type',
    instruction: 'typeDutch',
    prompt: s.en,
    answers: [s.nl, ...(s.alt ?? [])],
    itemIds: [sentenceId(ch, s)],
    vi: s.vi,
    tip: s.tip,
  }
}

/**
 * Fill in the missing word: a reading + writing exercise. We hide one of the
 * longer words, so it's a real word and not "de" or "en".
 */
function clozeSentence(ch: Chapter, s: Sentence, rng: Rng): Exercise {
  const tokens = tokenize(s.nl)
  const clean = (t: string) => t.replace(/[,.!?;:]/g, '')
  const candidates = tokens.map((t, i) => ({ i, w: clean(t) })).filter(({ w }) => w.length >= 3)
  const { i, w } = candidates.length ? pick(candidates, rng) : { i: 0, w: clean(tokens[0]) }
  const shown = tokens.map((t, j) => (j === i ? t.replace(w, '_____') : t)).join(' ')
  return {
    kind: 'type',
    instruction: 'fillBlank',
    prompt: `${shown}\n(${s.en})`,
    answers: [w],
    reveal: s.nl,
    itemIds: [sentenceId(ch, s)],
    vi: s.vi,
    tip: s.tip,
  }
}

function listenType(ch: Chapter, s: Sentence): Exercise {
  return {
    kind: 'type',
    instruction: 'listenType',
    prompt: '',
    audio: s.nl,
    answers: [s.nl],
    reveal: s.en,
    itemIds: [sentenceId(ch, s)],
    vi: s.vi,
    needs: 'listening',
  }
}

function speakSentence(ch: Chapter, s: Sentence): Exercise {
  return { kind: 'speak', instruction: 'speak', text: s.nl, en: s.en, itemIds: [sentenceId(ch, s)], vi: s.vi, needs: 'speaking' }
}

function choiceSentenceMeaning(ch: Chapter, s: Sentence, rng: Rng): Exercise {
  const others = sample(
    ch.sentences.filter((o) => o.en !== s.en),
    3,
    rng,
  ).map((o) => o.en)
  return {
    kind: 'choice',
    instruction: 'translateSentence',
    prompt: s.nl,
    audio: s.nl,
    options: shuffle([s.en, ...others], rng),
    answer: s.en,
    itemIds: [sentenceId(ch, s)],
    vi: s.vi,
    tip: s.tip,
  }
}

function articleDrill(ch: Chapter, w: Word): Exercise {
  return {
    kind: 'choice',
    instruction: 'chooseArticle',
    prompt: `___ ${w.nl}  (${w.en})`,
    options: ['de', 'het'],
    answer: w.article!,
    reveal: withArticle(w),
    itemIds: [wordId(ch, w)],
    vi: w.vi,
    tip: 'de-het',
  }
}

function pluralDrill(ch: Chapter, w: Word): Exercise {
  return {
    kind: 'type',
    instruction: 'typePlural',
    prompt: `${withArticle(w)}  →  de …`,
    answers: [w.plural!, `de ${w.plural!}`],
    itemIds: [wordId(ch, w)],
    vi: `${w.vi} (số nhiều)`,
    tip: 'plural',
  }
}

const PERSONS = ['ik', 'jij', 'hij', 'wij', 'jullie', 'zij'] as const
const PERSON_LABEL: Record<(typeof PERSONS)[number], string> = {
  ik: 'ik',
  jij: 'jij',
  hij: 'hij / zij / het',
  wij: 'wij',
  jullie: 'jullie',
  zij: 'zij (they)',
}

function conjugationDrill(ch: Chapter, v: Verb, rng: Rng, asChoice: boolean): Exercise {
  const person = pick(PERSONS, rng)
  const answer = v[person]
  const base = {
    instruction: 'conjugate' as const,
    prompt: `${PERSON_LABEL[person]} ___   (${v.inf} = ${v.en})`,
    itemIds: [verbId(ch, v)],
    vi: `${v.inf} = ${v.vi}`,
    tip: 'conjugation',
    reveal: `${person} ${answer}`,
  }
  if (asChoice) {
    const options = [...new Set([v.ik, v.jij, v.wij, v.inf, answer])]
    return { ...base, kind: 'choice', options: shuffle(options, rng), answer }
  }
  return { ...base, kind: 'type', answers: [answer] }
}

// ------------------------------------------------------------ lesson makers

/** Removes exercises the learner turned off (e.g. "can't listen now"). */
function allowed(list: Exercise[], opts: ExerciseOptions): Exercise[] {
  return list.filter((e) => (e.needs === 'listening' ? opts.listening : e.needs === 'speaking' ? opts.speaking : true))
}

function wordsLesson(ch: Chapter, half: 0 | 1, rng: Rng): Exercise[] {
  const words = wordHalf(ch, half)
  const intro = words.map((w) => choiceNlToEn(ch, w, rng, true))
  const practice: Exercise[] = []
  const groups = [words.slice(0, 5), words.slice(5, 10)].filter((g) => g.length >= 3)
  for (const g of groups) practice.push(matchPairs(ch, g))
  for (const w of sample(words, 2, rng)) practice.push(choiceEnToNl(ch, w, rng))
  for (const w of sample(words, 1, rng)) practice.push(listenPickWord(ch, w, rng))
  // most practice is writing the Dutch word yourself
  for (const w of sample(words, Math.min(7, words.length), rng)) practice.push(typeWord(ch, w))
  return [...intro, ...shuffle(practice, rng)]
}

function sentencesLesson(ch: Chapter, rng: Rng): Exercise[] {
  // Mostly reading and writing: translate by typing, fill in the missing word,
  // read and understand. A little listening and speaking.
  const ss = shuffle(ch.sentences, rng)
  const out: Exercise[] = []
  ss.forEach((s, i) => {
    const slot = i % 6
    if (slot === 0 || slot === 3) out.push(typeSentence(ch, s))
    else if (slot === 1 || slot === 4) out.push(clozeSentence(ch, s, rng))
    else if (slot === 2) out.push(i % 4 === 2 ? choiceSentenceMeaning(ch, s, rng) : tilesSentence(ch, s, rng))
    else {
      // one listening or speaking exercise in every six; dictation (listen + type) counts as writing too
      const pickOne = i % 3
      out.push(pickOne === 0 ? listenType(ch, s) : pickOne === 1 ? listenTiles(ch, s, rng) : speakSentence(ch, s))
    }
  })
  return out.slice(0, 14)
}

function grammarLesson(ch: Chapter, rng: Rng): Exercise[] {
  const out: Exercise[] = []
  const per = Math.max(3, Math.ceil(10 / Math.max(1, ch.drills.length)))
  for (const kind of ch.drills) {
    if (kind === 'article') {
      for (const w of sample(allNouns(ch), per, rng)) out.push(articleDrill(ch, w))
    } else if (kind === 'plural') {
      for (const w of sample(ch.words.filter((w) => w.plural), per, rng)) out.push(pluralDrill(ch, w))
    } else if (kind === 'conjugation') {
      const verbs = ch.verbs ?? []
      for (let i = 0; i < per && verbs.length; i++) out.push(conjugationDrill(ch, verbs[i % verbs.length], rng, i % 3 === 0))
    } else if (kind === 'wordorder') {
      const ss = ch.sentences.filter((s) => s.tip)
      for (const s of sample(ss.length ? ss : ch.sentences, per, rng)) out.push(tilesSentence(ch, s, rng, 'wordOrder'))
    }
  }
  if (!out.length) for (const s of sample(ch.sentences, 6, rng)) out.push(tilesSentence(ch, s, rng, 'wordOrder'))
  return shuffle(out, rng)
}

/** Nouns of this chapter, topped up with earlier chapters' nouns if needed. */
function allNouns(ch: Chapter): Word[] {
  const own = ch.words.filter((w) => w.article)
  if (own.length >= 6) return own
  const idx = chapters.indexOf(ch)
  return [...own, ...chapters.slice(Math.max(0, idx - 2), idx).flatMap((c) => c.words.filter((w) => w.article))]
}

function checkLesson(ch: Chapter, rng: Rng): Exercise[] {
  const ws = sample(ch.words, 6, rng)
  const ss = sample(ch.sentences, 6, rng)
  const out: Exercise[] = [
    typeWord(ch, ws[0]),
    typeWord(ch, ws[1]),
    typeWord(ch, ws[2]),
    typeWord(ch, ws[3]),
    choiceNlToEn(ch, ws[4], rng),
    listenPickWord(ch, ws[5], rng),
    typeSentence(ch, ss[0]),
    typeSentence(ch, ss[1]),
    clozeSentence(ch, ss[2], rng),
    clozeSentence(ch, ss[3], rng),
    choiceSentenceMeaning(ch, ss[4], rng),
    tilesSentence(ch, ss[5], rng),
  ]
  const drills = grammarLesson(ch, rng).slice(0, 3)
  return shuffle([...out, ...drills], rng)
}

export function buildLesson(ch: Chapter, index: number, rng: Rng, opts: ExerciseOptions): Exercise[] {
  const kind = LESSONS[index].kind
  const list =
    kind === 'words'
      ? wordsLesson(ch, index === 0 ? 0 : 1, rng)
      : kind === 'sentences'
        ? sentencesLesson(ch, rng)
        : kind === 'grammar'
          ? grammarLesson(ch, rng)
          : checkLesson(ch, rng)
  return allowed(list, opts)
}

/** Words introduced in a lesson (shown on the lesson start screen). */
export function lessonWords(ch: Chapter, index: number): Word[] {
  return index === 0 ? wordHalf(ch, 0) : index === 1 ? wordHalf(ch, 1) : []
}

// ------------------------------------------------------- reviews & placement

function exerciseForItem(item: Item, rng: Rng): Exercise {
  const { chapter: ch } = item
  const r = rng()
  if (item.type === 'word') {
    if (r < 0.6) return typeWord(ch, item.word)
    if (r < 0.8) return choiceEnToNl(ch, item.word, rng)
    return listenPickWord(ch, item.word, rng)
  }
  if (item.type === 'sentence') {
    if (r < 0.4) return typeSentence(ch, item.sentence)
    if (r < 0.75) return clozeSentence(ch, item.sentence, rng)
    if (r < 0.9) return tilesSentence(ch, item.sentence, rng)
    return listenTiles(ch, item.sentence, rng)
  }
  return conjugationDrill(ch, item.verb, rng, r < 0.3)
}

export function buildReview(itemIds: string[], rng: Rng, opts: ExerciseOptions, max = 12): Exercise[] {
  const items = itemIds.map((id) => itemById.get(id)).filter((x): x is Item => !!x)
  const out: Exercise[] = []
  for (const item of items) {
    let ex = exerciseForItem(item, rng)
    // if listening is off, try again for a non-listening exercise
    for (let i = 0; i < 5 && allowed([ex], opts).length === 0; i++) ex = exerciseForItem(item, rng)
    if (allowed([ex], opts).length) out.push(ex)
    if (out.length >= max) break
  }
  return out
}

/** Three questions per chapter for the placement test, easiest first. */
export function placementQuestions(ch: Chapter, rng: Rng): Exercise[] {
  const [w1, w2] = sample(ch.words, 2, rng)
  const s = pick(ch.sentences, rng)
  return [choiceEnToNl(ch, w1, rng), tilesSentence(ch, s, rng), typeWord(ch, w2)]
}

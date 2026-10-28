// Loads every chapter JSON file and gives each word/sentence a stable id,
// which is used to remember how well the learner knows it.

import type { Chapter, KnmTopic, ListeningItem, ReadingText, Sentence, SpeakingTask, Tip, Verb, WritingTask, Word } from './types'
import tipsJson from './tips.json'
import readingJson from './reading.json'
import writingJson from './writing.json'
import knmJson from './exam/knm.json'
import luisterenJson from './exam/luisteren.json'
import sprekenJson from './exam/spreken.json'
import lezenJson from './exam/lezen.json'
import schrijvenJson from './exam/schrijven.json'
import { dueItems, type SrsState } from '../lib/srs'

const files = import.meta.glob<Chapter>('./chapters/*.json', { eager: true, import: 'default' })

export const chapters: Chapter[] = Object.values(files).sort((a, b) => a.book - b.book || a.number - b.number)

export const tips: Tip[] = tipsJson as Tip[]
export const tipById = new Map(tips.map((t) => [t.id, t]))

export const readingTexts: ReadingText[] = readingJson as ReadingText[]
export const writingTasks: WritingTask[] = writingJson as WritingTask[]

// Exam practice (naturalisation / inburgering, A2)
export const knmTopics: KnmTopic[] = knmJson as KnmTopic[]
export const listeningItems: ListeningItem[] = luisterenJson as ListeningItem[]
export const speakingTasks: SpeakingTask[] = sprekenJson as SpeakingTask[]
export const examReading: ReadingText[] = lezenJson as ReadingText[]
export const examWriting: WritingTask[] = schrijvenJson as WritingTask[]

export const findReading = (id: string) => [...readingTexts, ...examReading].find((r) => r.id === id)
export const findWriting = (id: string) => [...writingTasks, ...examWriting].find((w) => w.id === id)

// The word lists from the back of each Start.NL chapter (src/content/booklists/*.txt).
// Each becomes a "book chapter" with only words, used for the vocabulary checks.
const listFiles = import.meta.glob<string>('./booklists/*.txt', { eager: true, query: '?raw', import: 'default' })

/** Parse lines like "huis, het | house | ngôi nhà". Lines starting with # are comments. */
export function parseWordList(text: string): Word[] {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((line) => {
      const [nlPart, en, vi] = line.split('|').map((x) => x.trim())
      const m = nlPart.match(/^(.*), (de|het)$/)
      return m ? { nl: m[1], article: m[2] as 'de' | 'het', en, vi } : { nl: nlPart, en, vi }
    })
}

/** Book word lists, keyed by the chapter id they belong to (e.g. "b1c01"). */
export const bookLists = new Map<string, Chapter>()
for (const [path, text] of Object.entries(listFiles)) {
  const chapterId = path.match(/([^/]+)\.txt$/)![1]
  const ch = chapters.find((c) => c.id === chapterId)
  if (!ch) continue
  bookLists.set(chapterId, { ...ch, id: `${chapterId}-book`, words: parseWordList(text), sentences: [], verbs: [], grammar: [], drills: [] })
}

export const wordId = (ch: Chapter, w: Word) => `${ch.id}:w:${w.nl}`
export const sentenceId = (ch: Chapter, s: Sentence) => `${ch.id}:s:${s.nl}`
export const verbId = (ch: Chapter, v: Verb) => `${ch.id}:v:${v.inf}`

/** "de man", "het huis", or just "werken" for words without an article. */
export const withArticle = (w: Word) => (w.article ? `${w.article} ${w.nl}` : w.nl)

export type Item =
  | { type: 'word'; id: string; chapter: Chapter; word: Word }
  | { type: 'sentence'; id: string; chapter: Chapter; sentence: Sentence }
  | { type: 'verb'; id: string; chapter: Chapter; verb: Verb }

/** Look up any item by its id, for reviews and the supporter view. */
export const itemById = new Map<string, Item>()
for (const ch of chapters) {
  for (const word of ch.words) itemById.set(wordId(ch, word), { type: 'word', id: wordId(ch, word), chapter: ch, word })
  for (const sentence of ch.sentences)
    itemById.set(sentenceId(ch, sentence), { type: 'sentence', id: sentenceId(ch, sentence), chapter: ch, sentence })
  for (const verb of ch.verbs ?? []) itemById.set(verbId(ch, verb), { type: 'verb', id: verbId(ch, verb), chapter: ch, verb })
}
for (const book of bookLists.values()) {
  for (const word of book.words) itemById.set(wordId(book, word), { type: 'word', id: wordId(book, word), chapter: book, word })
}

export function itemLabel(item: Item): { nl: string; en: string; vi: string } {
  if (item.type === 'word') return { nl: withArticle(item.word), en: item.word.en, vi: item.word.vi }
  if (item.type === 'sentence') return item.sentence
  return { nl: item.verb.inf, en: item.verb.en, vi: item.verb.vi }
}

/** Items due for review that still exist (content can change after a word was practised). */
export function dueKnownItems(srs: SrsState, today: string): string[] {
  return dueItems(srs, today).filter((id) => itemById.has(id))
}

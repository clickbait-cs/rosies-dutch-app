// Loads every chapter JSON file and gives each word/sentence a stable id,
// which is used to remember how well the learner knows it.

import type { Chapter, Sentence, Tip, Verb, Word } from './types'
import tipsJson from './tips.json'
import { dueItems, type SrsState } from '../lib/srs'

const files = import.meta.glob<Chapter>('./chapters/*.json', { eager: true, import: 'default' })

export const chapters: Chapter[] = Object.values(files).sort((a, b) => a.book - b.book || a.number - b.number)

export const tips: Tip[] = tipsJson as Tip[]
export const tipById = new Map(tips.map((t) => [t.id, t]))

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

export function itemLabel(item: Item): { nl: string; en: string; vi: string } {
  if (item.type === 'word') return { nl: withArticle(item.word), en: item.word.en, vi: item.word.vi }
  if (item.type === 'sentence') return item.sentence
  return { nl: item.verb.inf, en: item.verb.en, vi: item.verb.vi }
}

/** Items due for review that still exist (content can change after a word was practised). */
export function dueKnownItems(srs: SrsState, today: string): string[] {
  return dueItems(srs, today).filter((id) => itemById.has(id))
}

// The shape of the lesson content. All lessons live in the JSON files in
// src/content/chapters/ — you can edit those without touching any code.

export type Article = 'de' | 'het'

/** One vocabulary item. Nouns have an article (de/het) and usually a plural. */
export interface Word {
  nl: string // Dutch, without the article: "huis"
  en: string // English meaning: "house"
  vi: string // Vietnamese meaning: "ngôi nhà"
  article?: Article
  plural?: string // "huizen"
  alt?: string[] // other accepted Dutch answers
}

/** A full example sentence, used for word-tile and typing exercises. */
export interface Sentence {
  nl: string
  en: string
  vi: string
  alt?: string[] // other accepted Dutch translations
  tip?: string // id of a tip in tips.json that explains this sentence
}

/** Present tense of a verb, used for conjugation drills. */
export interface Verb {
  inf: string // infinitive: "werken"
  en: string
  vi: string
  ik: string
  jij: string
  hij: string
  wij: string
  jullie: string
  zij: string // "zij" (they)
}

/** A grammar explanation shown at the start of the grammar lesson. */
export interface GrammarPoint {
  title: string
  titleVi: string
  en: string
  vi: string
  examples: { nl: string; en: string }[]
  tip?: string // id of a related tip in tips.json
}

export type DrillKind = 'article' | 'conjugation' | 'wordorder' | 'plural'

export interface Chapter {
  id: string // "b1c01" = book 1, chapter 1
  book: 1 | 2
  number: number
  titleNl: string
  title: string
  titleVi: string
  cefr: 'A1' | 'A2'
  /** true when the theme is our best guess and still needs checking against the book */
  provisional: boolean
  words: Word[]
  sentences: Sentence[]
  verbs?: Verb[]
  grammar: GrammarPoint[]
  drills: DrillKind[]
}

/** An explanation of a concept that is often hard for Vietnamese speakers. */
export interface Tip {
  id: string
  title: string
  titleVi: string
  en: string
  vi: string
  examples?: { nl: string; en: string; vi?: string }[]
}

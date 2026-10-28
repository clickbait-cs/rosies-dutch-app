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

/** A longer text with comprehension questions (from later chapters). */
export interface ReadingText {
  id: string
  chapterId: string
  title: string
  text: string // paragraphs separated by a blank line
  /** where the text comes from; texts without a source were written for this app */
  source?: { name: string; url: string; license: string }
  glossary: { nl: string; en: string; vi: string }[]
  questions: {
    q: string // question in Dutch
    qEn: string
    options: string[]
    answer: number // index of the right option
  }[]
}

/** A free writing task: an e-mail, message, letter or short text. */
export interface WritingTask {
  id: string
  chapterId: string
  title: string
  titleVi: string
  task: string
  taskVi: string
  minWords: number
  checklist: { en: string; vi: string }[]
  model: string // an example answer in Dutch
  modelEn: string
}

/** A multiple-choice question with an explanation (KNM and listening). */
export interface ExamQuestion {
  q: string // in Dutch
  qEn: string
  options: string[]
  answer: number
  why?: string // short explanation in English
  whyVi?: string
}

/** KNM (kennis van de Nederlandse maatschappij): one topic with questions. */
export interface KnmTopic {
  id: string
  title: string
  titleEn: string
  titleVi: string
  icon: string
  questions: ExamQuestion[]
}

/** A short spoken dialogue or announcement with questions. */
export interface ListeningItem {
  id: string
  title: string
  lines: { speaker: string; text: string }[]
  questions: ExamQuestion[]
}

/** A speaking prompt: a situation and a question, with an example answer. */
export interface SpeakingTask {
  id: string
  situation: string // in Dutch
  situationEn: string
  situationVi: string
  question: string // what the examiner asks, in Dutch
  model: string
  modelEn: string
}

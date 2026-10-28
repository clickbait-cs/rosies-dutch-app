// Vocabulary check on the word list from the back of a Start.NL chapter.
// Each session takes about 12 words: words that are due or weak first, then new ones.

import { useState } from 'react'
import { bookLists } from '../content'
import { buildVocabCheck, type Exercise } from '../lib/exercises'
import { makeRng } from '../lib/random'
import { applyAnswers } from '../lib/session'
import { addXp } from '../lib/progress'
import { dayKey } from '../lib/dates'
import { useApp } from '../state'
import { Player, ResultScreen, type PlayerResult } from './Player'

export function VocabCheck({ chapterId, onExit }: { chapterId: string; onExit: () => void }) {
  const { t, progress, update } = useApp()
  const book = bookLists.get(chapterId)!
  const [exercises] = useState<Exercise[]>(() => buildVocabCheck(book, progress.srs, dayKey(), makeRng(), progress.settings))
  const [result, setResult] = useState<PlayerResult | null>(null)

  const finish = (r: PlayerResult) => {
    update((p) => addXp(applyAnswers(p, r.answers), 10))
    setResult(r)
  }

  if (result) return <ResultScreen title={t('lessonDone')} accuracy={result.accuracy} xp={10} onContinue={onExit} />
  return <Player exercises={exercises} onFinish={finish} onQuit={onExit} />
}

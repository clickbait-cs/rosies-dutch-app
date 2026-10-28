// Decides whether an answer is right.

import { checkTyped, normalize } from './check'
import type { Exercise } from './exercises'

export type Grade = 'correct' | 'typo' | 'article' | 'wrong'

export interface GradeResult {
  grade: Grade
  /** the answer to show in the feedback panel */
  expected: string
}

/** For choice: the chosen option. Tiles: the chosen words. Type: the typed text. */
export type Answer = string | string[]

export function gradeAnswer(ex: Exercise, answer: Answer): GradeResult {
  switch (ex.kind) {
    case 'choice':
      return { grade: answer === ex.answer ? 'correct' : 'wrong', expected: ex.reveal ?? ex.answer }
    case 'tiles': {
      const given = normalize((answer as string[]).join(' '))
      const ok = [ex.answer, ...ex.alt].some((a) => normalize(a) === given)
      return { grade: ok ? 'correct' : 'wrong', expected: ex.answer }
    }
    case 'type': {
      const given = answer as string
      const grade = checkTyped(given, ex.answers)
      if (grade === 'wrong' && ex.bareAnswers && checkTyped(given, ex.bareAnswers) !== 'wrong') {
        return { grade: 'article', expected: ex.answers[0] }
      }
      return { grade, expected: ex.answers[0] }
    }
    default:
      // match and speak exercises grade themselves
      return { grade: 'correct', expected: '' }
  }
}

/** A missing article ("huis" instead of "het huis") counts as a mistake: the article is part of the word. */
export const isPass = (g: Grade) => g === 'correct' || g === 'typo'

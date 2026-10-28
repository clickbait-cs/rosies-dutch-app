// The placement test walks through the chapters in order. For each chapter it
// asks 2 questions: 2 right = passed, 0 right = stop here, 1 right = one more
// question decides. The test ends at the first chapter that isn't passed.

export interface PlacementState {
  chapter: number // index of the chapter being tested
  asked: number // questions asked for this chapter
  right: number // right answers for this chapter
  total: number // questions asked overall
  finished: boolean
  /** index of the chapter the learner should start at */
  startAt: number
}

export function startPlacement(): PlacementState {
  return { chapter: 0, asked: 0, right: 0, total: 0, finished: false, startAt: 0 }
}

export function answerPlacement(s: PlacementState, correct: boolean, chapterCount: number): PlacementState {
  const asked = s.asked + 1
  const right = s.right + (correct ? 1 : 0)
  const wrong = asked - right
  const total = s.total + 1
  const passed = right >= 2
  const failed = wrong >= 2
  if (passed) {
    const next = s.chapter + 1
    if (next >= chapterCount) return { ...s, asked: 0, right: 0, total, finished: true, startAt: chapterCount - 1, chapter: next }
    return { chapter: next, asked: 0, right: 0, total, finished: false, startAt: next }
  }
  if (failed) return { ...s, asked, right, total, finished: true, startAt: s.chapter }
  return { ...s, asked, right, total }
}

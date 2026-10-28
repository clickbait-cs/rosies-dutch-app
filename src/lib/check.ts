// Checking typed answers. We are forgiving: capital letters, punctuation and
// small typos don't make an answer wrong, but typos are pointed out.

export type CheckResult = 'correct' | 'typo' | 'wrong'

/** Lowercase, remove punctuation and extra spaces. Keeps accents (é, ë). */
export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’‘`´]/g, "'")
    .replace(/[.,!?¿¡;:"“”()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Same as normalize, but also removes accents: "één" -> "een". */
export function stripAccents(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

/** Number of single-letter edits needed to turn `a` into `b`. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** How many typos we allow for an answer of this length. */
function allowedTypos(length: number): number {
  if (length < 4) return 0
  if (length < 10) return 1
  return 2
}

export function checkTyped(input: string, accepted: string[]): CheckResult {
  const given = normalize(input)
  if (!given) return 'wrong'
  let best: CheckResult = 'wrong'
  for (const answer of accepted) {
    const target = normalize(answer)
    if (given === target) return 'correct'
    if (stripAccents(given) === stripAccents(target)) best = 'typo'
    else if (levenshtein(given, target) <= allowedTypos(target.length)) best = 'typo'
  }
  return best
}

/**
 * Speech recognition is never perfect, so a spoken answer counts as correct
 * when most of the expected words were heard.
 */
export function checkSpoken(heard: string[], expected: string): boolean {
  const target = normalize(stripAccents(expected)).split(' ')
  return heard.some((h) => {
    const words = new Set(normalize(stripAccents(h)).split(' '))
    const hits = target.filter((w) => words.has(w)).length
    return hits / target.length >= 0.7
  })
}

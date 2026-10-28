// The learning path: Book 1 and Book 2, with five lessons per chapter.

import { useEffect, useRef } from 'react'
import { bookLists, chapters, readingTexts, writingTasks } from '../content'
import { knownCount } from '../lib/exercises'
import { LESSONS } from '../lib/exercises'
import { isChapterUnlocked, isLessonUnlocked, nextLesson } from '../lib/session'
import type { StringKey } from '../lib/i18n'
import { useApp } from '../state'

const LESSON_ICON = ['🔤', '🔤', '💬', '🧩', '🏆']
const LESSON_NAME: StringKey[] = ['lessonWords1', 'lessonWords2', 'lessonSentences', 'lessonGrammar', 'lessonCheck']

export const lessonTitle = (t: (k: StringKey) => string, index: number) => t(LESSON_NAME[index])

export function Home({
  openLesson,
  openReading,
  openWriting,
  openVocab,
}: {
  openLesson: (chapterId: string, index: number) => void
  openReading: (id: string) => void
  openWriting: (id: string) => void
  openVocab: (chapterId: string) => void
}) {
  const { t, progress } = useApp()
  const lang = progress.settings.uiLang
  const next = nextLesson(progress, chapters)
  const currentRef = useRef<HTMLDivElement>(null)

  // (block body on purpose: newer browsers return a Promise from scrollIntoView)
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <div className="space-y-10 pb-10">
      {([1, 2] as const).map((book) => (
        <section key={book} className="space-y-4">
          <div className={`rounded-2xl p-5 text-white ${book === 1 ? 'bg-green-500' : 'bg-sky-500'}`}>
            <p className="text-sm font-extrabold uppercase tracking-wider opacity-80">Start.NL · {book === 1 ? 'A0 → A1' : 'A1 → A2'}</p>
            <h2 className="text-2xl font-extrabold">{t('book', { n: book })}</h2>
          </div>

          {chapters
            .map((ch, i) => ({ ch, i }))
            .filter(({ ch }) => ch.book === book)
            .map(({ ch, i }) => {
              const unlocked = isChapterUnlocked(progress, chapters, i)
              const cp = progress.chapters[ch.id]
              const isCurrent = next?.chapter === i
              return (
                <div
                  key={ch.id}
                  ref={isCurrent ? currentRef : undefined}
                  className={`rounded-2xl border-2 bg-white p-5 ${isCurrent ? 'border-green-400' : 'border-slate-200'} ${unlocked ? '' : 'opacity-60'}`}
                >
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        {t('chapter', { n: ch.number })} · {ch.cefr}
                      </p>
                      <h3 className="text-xl font-extrabold text-slate-800">{ch.titleNl}</h3>
                      <p className="text-slate-500">{lang === 'vi' ? ch.titleVi : ch.title}</p>
                      {ch.provisional && (
                        <p className="mt-1 text-xs font-semibold text-slate-400" title={t('provisional')}>
                          ⓘ {t('provisional')}
                        </p>
                      )}
                    </div>
                    {cp?.done && <span className="text-3xl" title="Done">👑</span>}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {LESSONS.map((l) => {
                      const open = isLessonUnlocked(progress, chapters, i, l.index)
                      const done = cp?.lessons.includes(l.index) || (l.index === 4 && cp?.done)
                      const here = isCurrent && next?.lesson === l.index
                      return (
                        <button
                          key={l.index}
                          type="button"
                          disabled={!open}
                          title={open ? lessonTitle(t, l.index) : t('locked')}
                          onClick={() => openLesson(ch.id, l.index)}
                          className="group flex w-20 flex-col items-center gap-1 disabled:cursor-not-allowed"
                        >
                          <span
                            className={`flex h-14 w-14 items-center justify-center rounded-full border-b-4 text-2xl transition group-enabled:group-hover:scale-105 ${
                              done
                                ? 'border-amber-500 bg-amber-400'
                                : here
                                  ? 'animate-pulse border-green-700 bg-green-500 ring-4 ring-green-200'
                                  : open
                                    ? 'border-green-700 bg-green-500'
                                    : 'border-slate-300 bg-slate-200 grayscale'
                            }`}
                          >
                            {open ? LESSON_ICON[l.index] : '🔒'}
                          </span>
                          <span className="text-center text-xs font-bold leading-tight text-slate-500">{lessonTitle(t, l.index)}</span>
                        </button>
                      )
                    })}
                  </div>
                  <Extras
                    chapterId={ch.id}
                    open={isLessonUnlocked(progress, chapters, i, 2)}
                    openReading={openReading}
                    openWriting={openWriting}
                    openVocab={openVocab}
                  />
                </div>
              )
            })}
        </section>
      ))}
    </div>
  )
}

/** Optional reading and writing practice; opens once the sentences lesson is reached. */
function Extras({
  chapterId,
  open,
  openReading,
  openWriting,
  openVocab,
}: {
  chapterId: string
  open: boolean
  openReading: (id: string) => void
  openWriting: (id: string) => void
  openVocab: (chapterId: string) => void
}) {
  const { t, progress } = useApp()
  const reading = readingTexts.filter((r) => r.chapterId === chapterId)
  const writing = writingTasks.filter((w) => w.chapterId === chapterId)
  const book = bookLists.get(chapterId)
  if (!reading.length && !writing.length && !book) return null
  const cls = 'flex items-center gap-2 rounded-xl border-2 border-b-4 px-3 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-50'
  return (
    <div className="mt-4 flex flex-wrap gap-2 border-t-2 border-slate-100 pt-4">
      {book && (
        <button type="button" disabled={!open} title={open ? '' : t('locked')} onClick={() => openVocab(chapterId)} className={`${cls} border-green-200 bg-green-50 text-green-700`}>
          📚 {t('vocabCheck')} <span className="font-normal">{t('vocabKnown', { n: knownCount(book, progress.srs), total: book.words.length })}</span>
        </button>
      )}
      {reading.map((r) => (
        <button key={r.id} type="button" disabled={!open} title={open ? r.title : t('locked')} onClick={() => openReading(r.id)} className={`${cls} border-sky-200 bg-sky-50 text-sky-700`}>
          📰 {t('lessonReading')}: {r.title}
          {progress.reading[r.id] !== undefined && <span>✓ {Math.round(progress.reading[r.id] * 100)}%</span>}
        </button>
      ))}
      {writing.map((w) => (
        <button key={w.id} type="button" disabled={!open} title={open ? w.title : t('locked')} onClick={() => openWriting(w.id)} className={`${cls} border-purple-200 bg-purple-50 text-purple-700`}>
          ✍️ {t('lessonWriting')}: {w.title}
          {progress.writing[w.id] && <span>✓</span>}
        </button>
      ))}
    </div>
  )
}

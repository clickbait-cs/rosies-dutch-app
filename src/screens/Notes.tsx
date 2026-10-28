// All tips about hard concepts, plus the grammar of each chapter, in one place.

import { chapters, tips } from '../content'
import { useApp } from '../state'
import { Card, TipContent } from '../components/ui'

export function Notes() {
  const { t, progress } = useApp()
  const lang = progress.settings.uiLang
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold text-slate-800">📒 {t('notes')}</h1>
      <p className="text-slate-500">{t('notesIntro')}</p>
      {tips.map((tip) => (
        <details key={tip.id} className="group rounded-2xl border-2 border-slate-200 bg-white p-4">
          <summary className="cursor-pointer list-none font-extrabold text-slate-800">
            💡 {lang === 'vi' ? tip.titleVi : tip.title}
            <span className="float-right text-slate-400 group-open:rotate-180">▾</span>
          </summary>
          <div className="mt-4">
            <TipContent id={tip.id} viOpen={lang === 'vi'} />
          </div>
        </details>
      ))}
      <h2 className="pt-6 text-2xl font-extrabold text-slate-800">{t('lessonGrammar')}</h2>
      {chapters.map((ch) => (
        <Card key={ch.id}>
          <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            {t('book', { n: ch.book })} · {t('chapter', { n: ch.number })} · {ch.titleNl}
          </p>
          {ch.grammar.map((g) => (
            <div key={g.title} className="mt-2">
              <p className="font-extrabold text-slate-800">{lang === 'vi' ? g.titleVi : g.title}</p>
              <p className="text-sm text-slate-600">{lang === 'vi' ? g.vi : g.en}</p>
            </div>
          ))}
        </Card>
      ))}
    </div>
  )
}

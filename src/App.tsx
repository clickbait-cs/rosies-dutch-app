// Decides which screen to show.

import { useEffect, useState } from 'react'
import { useApp } from './state'
import { Layout, type Tab } from './components/Layout'
import { SignIn } from './screens/SignIn'
import { Home } from './screens/Home'
import { Lesson } from './screens/Lesson'
import { ReviewHome, ReviewSession } from './screens/Review'
import { PlacementChoice, PlacementTest } from './screens/Placement'
import { Notes } from './screens/Notes'
import { Settings } from './screens/Settings'
import { Supporter } from './screens/Supporter'
import { Reading } from './screens/Reading'
import { Writing } from './screens/Writing'
import { VocabCheck } from './screens/VocabCheck'
import { ExamHome, ExamQuiz, ExamSpeaking } from './screens/Exam'

/** Full-screen activities that hide the menu. */
type Activity = { kind: 'lesson'; chapterId: string; index: number } | { kind: 'review' } | { kind: 'placement' } | { kind: 'placementChoice' }
  | { kind: 'reading'; id: string }
  | { kind: 'writing'; id: string }
  | { kind: 'examQuiz'; id: string }
  | { kind: 'examSpeaking' }
  | { kind: 'vocab'; chapterId: string }
  | null

export default function App() {
  const { ready, uid, progress, role, user, sync } = useApp()
  const [tab, setTab] = useState<Tab>(role === 'supporter' ? 'supporter' : 'learn')
  const [activity, setActivity] = useState<Activity>(null)
  const exit = () => (setActivity(null), window.scrollTo(0, 0))

  // the supporter lands on their dashboard once we know who signed in
  useEffect(() => {
    if (role === 'supporter') setTab('supporter')
  }, [role])

  if (!ready) return <div className="flex min-h-dvh items-center justify-center text-6xl">🇳🇱</div>
  if (!uid) return <SignIn />

  // first visit: beginner or placement test? (the supporter skips this)
  const firstVisit = !progress.placement.done && Object.keys(progress.chapters).length === 0 && role === 'learner'
  // on a new device, wait for the cloud copy before asking where to start
  if (firstVisit && user && sync === 'syncing') return <div className="flex min-h-dvh items-center justify-center text-6xl">🇳🇱</div>
  const act = activity ?? (firstVisit ? { kind: 'placementChoice' as const } : null)

  if (act?.kind === 'placementChoice') return <PlacementChoice onTest={() => setActivity({ kind: 'placement' })} onDone={exit} />
  if (act?.kind === 'placement') return <PlacementTest onExit={exit} />
  if (act?.kind === 'lesson') return <Lesson chapterId={act.chapterId} index={act.index} onExit={exit} />
  if (act?.kind === 'review') return <ReviewSession onExit={exit} />
  if (act?.kind === 'reading') return <Reading textId={act.id} onExit={exit} />
  if (act?.kind === 'writing') return <Writing taskId={act.id} onExit={exit} />
  if (act?.kind === 'examQuiz') return <ExamQuiz id={act.id} onExit={exit} />
  if (act?.kind === 'examSpeaking') return <ExamSpeaking onExit={exit} />
  if (act?.kind === 'vocab') return <VocabCheck chapterId={act.chapterId} onExit={exit} />

  return (
    <Layout tab={tab} setTab={setTab}>
      {tab === 'learn' && (
        <Home
          openLesson={(chapterId, index) => setActivity({ kind: 'lesson', chapterId, index })}
          openReading={(id) => setActivity({ kind: 'reading', id })}
          openWriting={(id) => setActivity({ kind: 'writing', id })}
          openVocab={(chapterId) => setActivity({ kind: 'vocab', chapterId })}
        />
      )}
      {tab === 'review' && <ReviewHome start={() => setActivity({ kind: 'review' })} />}
      {tab === 'exam' && (
        <ExamHome
          open={(a) =>
            setActivity(
              a.kind === 'knm' || a.kind === 'listening'
                ? { kind: 'examQuiz', id: a.id }
                : a.kind === 'speaking'
                  ? { kind: 'examSpeaking' }
                  : { kind: a.kind, id: a.id },
            )
          }
        />
      )}
      {tab === 'notes' && <Notes />}
      {tab === 'settings' && <Settings retakePlacement={() => setActivity({ kind: 'placement' })} />}
      {tab === 'supporter' && <Supporter />}
    </Layout>
  )
}

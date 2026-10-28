// App-wide state: who is signed in, their progress, and the language of the
// interface. Components read it with useApp().

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { auth, googleProvider } from './firebase'
import { LEARNER_UID, SUPPORTER_UID } from './config'
import { emptyProgress, mergeProgress, withDefaults, type Progress } from './lib/progress'
import { errorToStatus, loadRemoteProgress, saveRemoteProgress, type SyncStatus } from './lib/cloud'
import { translate, type StringKey } from './lib/i18n'

const GUEST_KEY = 'rda:guest'
const progressKey = (uid: string) => `rda:progress:${uid}`

function readLocal(uid: string): Progress {
  try {
    return withDefaults(JSON.parse(localStorage.getItem(progressKey(uid)) ?? 'null'))
  } catch {
    return emptyProgress()
  }
}

function writeLocal(uid: string, p: Progress) {
  try {
    localStorage.setItem(progressKey(uid), JSON.stringify(p))
  } catch {
    /* storage full or blocked: progress still lives in memory */
  }
}

export type Role = 'learner' | 'supporter'

interface AppState {
  ready: boolean
  user: User | null
  guest: boolean
  uid: string | null
  role: Role
  progress: Progress
  sync: SyncStatus
  update: (change: (p: Progress) => Progress) => void
  replaceProgress: (p: Progress) => void
  signIn: () => Promise<void>
  continueAsGuest: () => void
  logOut: () => Promise<void>
  t: (key: StringKey, vars?: Record<string, string | number>) => string
}

const Ctx = createContext<AppState | null>(null)

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside <AppProvider>')
  return v
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [guest, setGuest] = useState(() => localStorage.getItem(GUEST_KEY) === '1')
  const [progress, setProgress] = useState<Progress>(emptyProgress)
  const [sync, setSync] = useState<SyncStatus>('local')
  const saveTimer = useRef<number | undefined>(undefined)

  const uid = user?.uid ?? (guest ? 'guest' : null)
  const role: Role = user && SUPPORTER_UID && user.uid === SUPPORTER_UID ? 'supporter' : 'learner'

  useEffect(() => onAuthStateChanged(auth, (u) => (setUser(u), setAuthReady(true))), [])

  // When someone signs in: load this device's copy, then merge in the cloud copy.
  useEffect(() => {
    if (!uid) return
    const local = readLocal(uid)
    setProgress(local)
    if (!user) return setSync('local')
    setSync('syncing')
    loadRemoteProgress(user.uid)
      .then((remote) => {
        const merged = remote ? mergeProgress(local, remote) : local
        setProgress(merged)
        writeLocal(user.uid, merged)
        return saveRemoteProgress(user.uid, merged, user.displayName ?? '')
      })
      .then(() => setSync('synced'))
      .catch((e) => setSync(errorToStatus(e)))
  }, [uid, user])

  const persist = useCallback(
    (p: Progress) => {
      if (!uid) return
      writeLocal(uid, p)
      if (!user) return
      // wait a moment so a burst of changes is saved only once
      window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => {
        setSync('syncing')
        saveRemoteProgress(user.uid, p, user.displayName ?? '')
          .then(() => setSync('synced'))
          .catch((e) => setSync(errorToStatus(e)))
      }, 1500)
    },
    [uid, user],
  )

  const update = useCallback(
    (change: (p: Progress) => Progress) => {
      setProgress((prev) => {
        const next = { ...change(prev), updatedAt: Date.now() }
        persist(next)
        return next
      })
    },
    [persist],
  )

  const replaceProgress = useCallback((p: Progress) => update(() => withDefaults(p)), [update])

  const signIn = useCallback(async () => {
    // Only the pop-up works reliably: the app (github.io) and the Firebase
    // sign-in page (firebaseapp.com) are different websites, and phones block
    // the storage a full-page redirect would need. Errors are shown on the sign-in screen.
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      const code = (e as { code?: string }).code
      if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') return
      throw e
    }
    localStorage.removeItem(GUEST_KEY)
    setGuest(false)
  }, [])

  const continueAsGuest = useCallback(() => {
    localStorage.setItem(GUEST_KEY, '1')
    setGuest(true)
  }, [])

  const logOut = useCallback(async () => {
    localStorage.removeItem(GUEST_KEY)
    setGuest(false)
    await signOut(auth)
    setProgress(emptyProgress())
  }, [])

  const lang = progress.settings.uiLang
  const t = useCallback((key: StringKey, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang])

  return (
    <Ctx.Provider
      value={{ ready: authReady, user, guest, uid, role, progress, sync, update, replaceProgress, signIn, continueAsGuest, logOut, t }}
    >
      {children}
    </Ctx.Provider>
  )
}

/** The learner's uid for the supporter view and cheers. */
export const learnerUid = () => LEARNER_UID

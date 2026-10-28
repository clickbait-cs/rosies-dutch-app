// Everything that talks to the Firestore database.
//
// Collections:
//   learners/{uid}   progress of one person
//   cheers/{id}      short messages from the supporter to the learner
//   reports/{id}     "this exercise has a mistake" reports
//   writings/{uid_task}  texts the learner wrote, with the supporter's feedback

import { addDoc, collection, doc, getDoc, getDocs, onSnapshot, query, serverTimestamp, setDoc, updateDoc, where, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { withDefaults, type Progress } from './progress'

export type SyncStatus = 'local' | 'syncing' | 'synced' | 'notSetUp' | 'offline'

export function errorToStatus(err: unknown): SyncStatus {
  const code = (err as { code?: string })?.code
  return code === 'permission-denied' ? 'notSetUp' : 'offline'
}

export async function loadRemoteProgress(uid: string): Promise<Progress | null> {
  const snap = await getDoc(doc(db, 'learners', uid))
  return snap.exists() ? withDefaults(snap.data().progress as Progress) : null
}

export async function saveRemoteProgress(uid: string, progress: Progress, name: string): Promise<void> {
  await setDoc(doc(db, 'learners', uid), { progress, name, savedAt: serverTimestamp() })
}

export function watchLearner(uid: string, onChange: (data: { progress: Progress; name: string } | null) => void, onError: (e: unknown) => void) {
  return onSnapshot(
    doc(db, 'learners', uid),
    (snap) => onChange(snap.exists() ? { progress: withDefaults(snap.data().progress), name: snap.data().name ?? '' } : null),
    onError,
  )
}

export interface Cheer {
  id: string
  text: string
  createdAt: number
}

export function watchCheers(learnerUid: string, onChange: (cheers: Cheer[]) => void, onError: (e: unknown) => void) {
  return onSnapshot(
    query(collection(db, 'cheers'), where('to', '==', learnerUid)),
    (snap) =>
      onChange(
        snap.docs
          .map((d) => ({ id: d.id, text: d.data().text as string, createdAt: d.data().createdAt as number }))
          .sort((a, b) => a.createdAt - b.createdAt),
      ),
    onError,
  )
}

export async function sendCheer(fromUid: string, toUid: string, text: string) {
  await addDoc(collection(db, 'cheers'), { from: fromUid, to: toUid, text, createdAt: Date.now() })
}

export async function deleteCheer(id: string) {
  await deleteDoc(doc(db, 'cheers', id))
}

export interface Report {
  id?: string
  uid: string
  exercise: string
  message: string
  createdAt: number
}

export async function sendReport(report: Report) {
  await addDoc(collection(db, 'reports'), report)
}

export async function listReports(): Promise<Report[]> {
  const snap = await getDocs(collection(db, 'reports'))
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Report) })).sort((a, b) => b.createdAt - a.createdAt)
}

export async function deleteReport(id: string) {
  await deleteDoc(doc(db, 'reports', id))
}

export interface Writing {
  id: string
  uid: string
  taskId: string
  text: string
  createdAt: number
  feedback: string
  feedbackAt: number
}

/** One document per learner per task: writing the task again replaces it. */
export async function saveWriting(uid: string, taskId: string, text: string) {
  await setDoc(doc(db, 'writings', `${uid}_${taskId}`), { uid, taskId, text, createdAt: Date.now(), feedback: '', feedbackAt: 0 })
}

export function watchWritings(uid: string, onChange: (w: Writing[]) => void, onError: (e: unknown) => void) {
  return onSnapshot(
    query(collection(db, 'writings'), where('uid', '==', uid)),
    (snap) => onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Writing, 'id'>) })).sort((a, b) => b.createdAt - a.createdAt)),
    onError,
  )
}

export async function giveFeedback(id: string, feedback: string) {
  await updateDoc(doc(db, 'writings', id), { feedback, feedbackAt: Date.now() })
}

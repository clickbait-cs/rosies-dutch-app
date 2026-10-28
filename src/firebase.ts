// Connection to the Firebase project "rosies-dutch-app".
// These values are not secret: they only say which project to talk to.
// Who may read or write data is decided by the rules in firestore.rules.

import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyC8SP5Yae57fcdi2VVkicLKS1YTN7o8yzk',
  authDomain: 'rosies-dutch-app.firebaseapp.com',
  projectId: 'rosies-dutch-app',
  storageBucket: 'rosies-dutch-app.firebasestorage.app',
  messagingSenderId: '321147083219',
  appId: '1:321147083219:web:bdd274fd891a621a793726',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({ prompt: 'select_account' })

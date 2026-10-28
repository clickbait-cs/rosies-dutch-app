import { useState } from 'react'
import { useApp } from '../state'
import { translate } from '../lib/i18n'
import type { UiLang } from '../lib/progress'
import { Button } from '../components/ui'
import { isInAppBrowser } from '../lib/browser'

/** A friendly message, with the technical code in brackets so it can be reported. */
function signInMessage(e: unknown, friendly: string): string {
  const code = (e as { code?: string })?.code
  return code ? `${friendly} (${code})` : friendly
}

export function SignIn() {
  const { signIn, continueAsGuest } = useApp()
  // nobody is signed in yet, so the language choice lives here for now
  const [lang, setLang] = useState<UiLang>('en')
  const [error, setError] = useState('')
  const t = (k: Parameters<typeof translate>[1]) => translate(lang, k)
  const inApp = isInAppBrowser()
  const [copied, setCopied] = useState(false)

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-gradient-to-b from-green-50 to-white p-6 text-center">
      <div className="flex gap-2">
        {(['en', 'vi'] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            className={`rounded-xl border-2 px-3 py-1 text-sm font-bold ${lang === l ? 'border-sky-400 bg-sky-50 text-sky-700' : 'border-slate-200 text-slate-500'}`}
          >
            {l === 'en' ? '🇬🇧 English' : '🇻🇳 Tiếng Việt'}
          </button>
        ))}
      </div>
      <div className="text-8xl">🇳🇱</div>
      <div className="space-y-3">
        <h1 className="text-4xl font-extrabold text-green-600">{t('appName')}</h1>
        <p className="text-xl font-bold text-slate-700">{t('welcomeTitle')}</p>
        <p className="mx-auto max-w-md text-slate-500">{t('welcomeText')}</p>
      </div>
      {inApp && (
        <div className="w-full max-w-sm space-y-3 rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-left">
          <p className="font-extrabold text-amber-900">⚠️ {t('inAppTitle')}</p>
          <p className="text-sm text-amber-900">{t('inAppText')}</p>
          <Button
            variant="secondary"
            className="w-full normal-case"
            onClick={() => navigator.clipboard?.writeText(window.location.href).then(() => setCopied(true))}
          >
            {copied ? '✓' : '🔗'} {t('copyLink')}
          </Button>
        </div>
      )}
      <div className="flex w-full max-w-sm flex-col gap-3">
        <Button onClick={() => signIn().catch((e) => setError(signInMessage(e, t('signInFailed'))))}>{t('signInGoogle')}</Button>
        <button type="button" onClick={continueAsGuest} className="text-sm font-semibold text-slate-400 underline">
          {t('tryWithout')}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  )
}

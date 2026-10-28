import { useRef, useState } from 'react'
import { useApp } from '../state'
import { Button, Card } from '../components/ui'
import { hasDutchVoice, say } from '../lib/speech'
import { withDefaults } from '../lib/progress'
import type { StringKey } from '../lib/i18n'

export function Settings({ retakePlacement }: { retakePlacement: () => void }) {
  const { t, progress, update, user, uid, sync, logOut, replaceProgress } = useApp()
  const s = progress.settings
  const [copied, setCopied] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const set = (patch: Partial<typeof s>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } }))

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(progress, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `dutch-progress-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importBackup = async (file: File) => {
    try {
      const data = JSON.parse(await file.text())
      if (typeof data !== 'object' || data.version !== 1) throw new Error('bad file')
      replaceProgress(withDefaults(data))
      setImportMsg(t('importDone'))
    } catch {
      setImportMsg(t('importFailed'))
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-extrabold text-slate-800">⚙️ {t('settings')}</h1>

      <Card className="space-y-3">
        <h2 className="font-extrabold text-slate-700">{t('language')}</h2>
        <div className="grid grid-cols-2 gap-3">
          {(['en', 'vi'] as const).map((l) => (
            <Button key={l} variant={s.uiLang === l ? 'blue' : 'secondary'} className="normal-case" onClick={() => set({ uiLang: l })}>
              {l === 'en' ? '🇬🇧 English' : '🇻🇳 Tiếng Việt'}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-extrabold text-slate-700">{t('dailyGoal')}</h2>
        <div className="grid grid-cols-4 gap-2">
          {[10, 20, 30, 50].map((g) => (
            <Button key={g} variant={progress.dailyGoal === g ? 'blue' : 'secondary'} className="px-2" onClick={() => update((p) => ({ ...p, dailyGoal: g }))}>
              {g}
            </Button>
          ))}
        </div>
        <p className="text-sm text-slate-500">{t('goalPerDay')}</p>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-extrabold text-slate-700">{t('audio')}</h2>
        <Toggle label="listeningExercises" checked={s.listening} onChange={(v) => set({ listening: v })} />
        <Toggle label="speakingExercises" checked={s.speaking} onChange={(v) => set({ speaking: v })} />
        <label className="block">
          <span className="font-semibold text-slate-700">{t('speechRate')}</span>
          <input
            type="range"
            min={0.5}
            max={1.2}
            step={0.1}
            value={s.speechRate}
            onChange={(e) => set({ speechRate: Number(e.target.value) })}
            className="mt-2 w-full accent-sky-500"
          />
        </label>
        <Button variant="secondary" onClick={() => say('Hallo! Hoe gaat het met je?', s.speechRate)}>
          🔊 {t('testVoice')}
        </Button>
        {!hasDutchVoice() && <p className="text-sm text-amber-700">{t('noDutchVoice')}</p>}
      </Card>

      <Card className="space-y-3">
        <h2 className="font-extrabold text-slate-700">{t('account')}</h2>
        <p className="text-slate-600">{user ? t('signedInAs', { name: user.displayName ?? user.email ?? '' }) : t('guest')}</p>
        <p className="text-sm text-slate-500">
          {t('syncStatus')}: <span className="font-bold">{t(`sync_${sync}` as StringKey)}</span>
        </p>
        {user && (
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-xs font-bold uppercase text-slate-400">{t('yourId')}</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 break-all text-sm text-slate-700">{uid}</code>
              <Button
                variant="secondary"
                className="px-3 py-1 text-xs"
                onClick={() => navigator.clipboard.writeText(uid ?? '').then(() => setCopied(true))}
              >
                {copied ? t('copied') : t('copy')}
              </Button>
            </div>
          </div>
        )}
        <Button variant="secondary" onClick={retakePlacement}>
          🧭 {t('retakePlacement')}
        </Button>
        <Button variant="secondary" onClick={logOut}>
          {t('signOut')}
        </Button>
      </Card>

      <Card className="space-y-3">
        <h2 className="font-extrabold text-slate-700">{t('backup')}</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={exportBackup}>
            ⬇️ {t('exportProgress')}
          </Button>
          <Button variant="secondary" onClick={() => fileRef.current?.click()}>
            ⬆️ {t('importProgress')}
          </Button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
        />
        {importMsg && <p className="text-sm text-slate-600">{importMsg}</p>}
      </Card>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: StringKey; checked: boolean; onChange: (v: boolean) => void }) {
  const { t } = useApp()
  return (
    <label className="flex cursor-pointer items-center justify-between">
      <span className="font-semibold text-slate-700">{t(label)}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-6 w-6 accent-green-500" />
    </label>
  )
}

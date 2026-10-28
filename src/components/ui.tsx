// Small building blocks used on every screen.

import { useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useApp } from '../state'
import { say } from '../lib/speech'
import { tipById } from '../content'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'blue'

const variants: Record<Variant, string> = {
  primary: 'bg-green-500 text-white border-green-700 hover:bg-green-400',
  blue: 'bg-sky-500 text-white border-sky-700 hover:bg-sky-400',
  danger: 'bg-red-500 text-white border-red-700 hover:bg-red-400',
  secondary: 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50',
  ghost: 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 !border-b-0',
}

export function Button({ variant = 'primary', className = '', ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...rest}
      className={`rounded-2xl border-2 border-b-4 px-5 py-3 font-extrabold uppercase tracking-wide transition active:translate-y-0.5 active:border-b-2 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
    />
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border-2 border-slate-200 bg-white p-5 ${className}`}>{children}</div>
}

export function ProgressBar({ value, className = '' }: { value: number; className?: string }) {
  return (
    <div className={`h-4 overflow-hidden rounded-full bg-slate-200 ${className}`}>
      <div className="h-full rounded-full bg-green-500 transition-all duration-500" style={{ width: `${Math.min(100, value * 100)}%` }} />
    </div>
  )
}

/** Plays Dutch audio. */
export function Speaker({ text, size = 'md', slow = false }: { text: string; size?: 'sm' | 'md' | 'lg'; slow?: boolean }) {
  const { progress } = useApp()
  const rate = progress.settings.speechRate * (slow ? 0.6 : 1)
  const sizes = { sm: 'h-8 w-8 text-base', md: 'h-11 w-11 text-xl', lg: 'h-20 w-20 text-4xl' }
  return (
    <button
      type="button"
      aria-label={slow ? 'Play slowly' : 'Play audio'}
      onClick={(e) => (e.stopPropagation(), say(text, rate))}
      className={`inline-flex shrink-0 items-center justify-center rounded-2xl border-2 border-b-4 border-sky-600 bg-sky-500 text-white hover:bg-sky-400 ${sizes[size]}`}
    >
      {slow ? '🐢' : '🔊'}
    </button>
  )
}

/** The 🇻🇳 button: shows the Vietnamese translation when tapped. */
export function ViReveal({ text, className = '' }: { text: string; className?: string }) {
  const [open, setOpen] = useState(false)
  const { t } = useApp()
  if (!text) return null
  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 rounded-xl border-2 border-amber-300 bg-amber-50 px-3 py-1 text-sm font-bold text-amber-800 hover:bg-amber-100"
      >
        🇻🇳 {t('showVietnamese')}
      </button>
      {open && <p className="mt-2 whitespace-pre-line rounded-xl bg-amber-50 px-3 py-2 text-amber-900">{text}</p>}
    </div>
  )
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center" onClick={onClose}>
      <div className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

/** A tip about a hard concept, with the Vietnamese explanation open by default. */
export function TipContent({ id, viOpen = true }: { id: string; viOpen?: boolean }) {
  const tip = tipById.get(id)
  const [showVi, setShowVi] = useState(viOpen)
  const { t } = useApp()
  if (!tip) return null
  return (
    <div>
      <h3 className="text-xl font-extrabold text-slate-800">💡 {tip.title}</h3>
      <p className="mb-3 text-sm font-semibold text-amber-700">🇻🇳 {tip.titleVi}</p>
      <p className="whitespace-pre-line text-slate-700">{tip.en}</p>
      <button type="button" onClick={() => setShowVi(!showVi)} className="mt-3 text-sm font-bold text-amber-700 underline">
        🇻🇳 {t('showVietnamese')}
      </button>
      {showVi && <p className="mt-2 whitespace-pre-line rounded-xl bg-amber-50 p-3 text-amber-900">{tip.vi}</p>}
      {tip.examples && (
        <ul className="mt-4 space-y-2">
          {tip.examples.map((ex) => (
            <li key={ex.nl} className="flex items-center gap-3 rounded-xl bg-slate-50 p-2">
              <Speaker text={ex.nl} size="sm" />
              <div>
                <p className="font-bold text-slate-800">{ex.nl}</p>
                <p className="text-sm text-slate-500">
                  {ex.en}
                  {ex.vi && showVi ? ` · ${ex.vi}` : ''}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function TipModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useApp()
  return (
    <Modal onClose={onClose}>
      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-sky-500">{t('tipTitle')}</p>
      <TipContent id={id} />
      <Button className="mt-6 w-full" onClick={onClose}>
        {t('gotIt')}
      </Button>
    </Modal>
  )
}

'use client'

import Link from 'next/link'
import { LANGUAGE_CONFIG } from '@/lib/languages'
import { useLanguagePref, forgetLanguage } from '@/lib/useLanguagePref'
import { Script } from '@/components/ui/Script'

export function ContinueLearning() {
  const lang = useLanguagePref()
  if (!lang) return null
  const cfg = LANGUAGE_CONFIG[lang]

  return (
    <div className="animate-rise flex items-center gap-3">
      <Link
        href={`/${lang}`}
        className="press flex flex-1 items-center gap-4 rounded-2xl px-5 py-4 text-accent-ink shadow-[var(--shadow)]"
        style={{ background: cfg.accent[0] }}
      >
        <Script lang={lang} className="display text-3xl font-bold leading-none">{cfg.glyph}</Script>
        <span className="font-bold">Continue {cfg.englishName}</span>
        <span className="ml-auto" aria-hidden="true">→</span>
      </Link>
      <button
        type="button"
        onClick={forgetLanguage}
        className="text-sm text-ink-faint underline-offset-4 hover:text-ink hover:underline"
      >
        Switch
      </button>
    </div>
  )
}

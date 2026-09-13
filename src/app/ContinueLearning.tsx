'use client'

import Link from 'next/link'
import { LANGUAGE_CONFIG } from '@/lib/languages'
import { useLanguagePref, forgetLanguage } from '@/lib/useLanguagePref'
import { Script } from '@/components/ui/Script'

/**
 * Resume affordance on the picker.
 *
 * Deliberately not an automatic redirect: a redirect makes the picker
 * unreachable except through an escape hatch, and on a static page it costs a
 * visible flash. Offering the shortcut gets the same result without taking the
 * choice away.
 */
export function ContinueLearning() {
  const lang = useLanguagePref()
  if (!lang) return null
  const cfg = LANGUAGE_CONFIG[lang]

  return (
    <div className="mb-8">
      <Link
        href={`/${lang}`}
        className="flex items-center gap-3 rounded-2xl bg-indigo px-5 py-4 text-white shadow-[var(--shadow)] transition-transform active:scale-[0.99] dark:text-indigo-soft"
      >
        <span className="text-2xl" aria-hidden="true">{cfg.emoji}</span>
        <span className="flex-1 text-left">
          <span className="block text-sm opacity-80">Pick up where you left off</span>
          <span className="block font-bold">
            Continue in {cfg.englishName} <Script lang={lang}>{cfg.nativeName}</Script>
          </span>
        </span>
        <span aria-hidden="true">→</span>
      </Link>
      <button
        type="button"
        onClick={forgetLanguage}
        className="mx-auto mt-2 block text-xs text-ink-faint underline-offset-4 hover:text-ink hover:underline"
      >
        Start a different language
      </button>
    </div>
  )
}

import Link from 'next/link'
import { LANGUAGES, LANGUAGE_CONFIG } from '@/lib/languages'
import { AVAILABLE_LANGUAGES } from '@/content'
import { Script } from '@/components/ui/Script'
import { ContinueLearning } from './ContinueLearning'

export default function LanguagePicker() {
  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-16 sm:pt-24">
      <header className="animate-rise">
        <p className="display text-5xl font-extrabold text-ink sm:text-6xl">Desilingo</p>
        <p className="mt-2 text-lg text-ink-soft">Learn India&rsquo;s languages by ear.</p>
      </header>

      <div className="mt-10">
        <ContinueLearning />
      </div>

      <ul className="stagger mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LANGUAGES.filter((c) => AVAILABLE_LANGUAGES.includes(c)).map((code) => {
          const cfg = LANGUAGE_CONFIG[code]
          return (
            <li key={code}>
              <Link
                href={`/${code}`}
                className="press group block overflow-hidden rounded-3xl bg-surface p-5 shadow-[var(--shadow)] hover:shadow-[var(--shadow-lift)]"
                style={{ ['--accent' as string]: cfg.accent[0] }}
              >
                <Script
                  lang={code}
                  className="display block text-6xl font-bold leading-none transition-transform duration-300 group-hover:-translate-y-1"
                  style={{ color: 'var(--accent)' }}
                >
                  {cfg.glyph}
                </Script>
                <span className="mt-5 block font-bold text-ink">{cfg.englishName}</span>
                <Script lang={code} className="block text-sm text-ink-faint">{cfg.nativeName}</Script>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}

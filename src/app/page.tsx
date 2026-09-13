import Link from 'next/link'
import { LANGUAGES, LANGUAGE_CONFIG } from '@/lib/languages'
import { AVAILABLE_LANGUAGES } from '@/content'
import { Kolam } from '@/components/ui/Motifs'
import { Script } from '@/components/ui/Script'

export default function LanguagePicker() {
  return (
    <main className="relative mx-auto w-full max-w-2xl px-4 py-14">
      <Kolam className="pointer-events-none absolute left-1/2 top-8 -z-10 w-[520px] -translate-x-1/2 text-indigo opacity-[0.07]" />

      <header className="text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-marigold">Desilingo</p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-ink">
          Learn India&rsquo;s languages by ear
        </h1>
        <p className="mx-auto mt-3 max-w-md text-ink-soft">
          Short lessons built from phrases people actually say — spoken by native
          voices, with pronunciation practice that listens back.
        </p>
      </header>

      <h2 className="mt-12 text-center text-sm font-semibold uppercase tracking-widest text-ink-faint">
        Pick a language
      </h2>

      <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {LANGUAGES.map((code) => {
          const cfg = LANGUAGE_CONFIG[code]
          const ready = AVAILABLE_LANGUAGES.includes(code)
          const inner = (
            <>
              <span className="text-3xl" aria-hidden="true">{cfg.emoji}</span>
              <span className="mt-2 block font-bold text-ink">{cfg.englishName}</span>
              <Script lang={code} className="mt-0.5 block text-lg text-indigo">{cfg.nativeName}</Script>
              <Script lang={code} className="mt-1 block text-xs text-ink-faint">{cfg.greeting}</Script>
            </>
          )
          return (
            <li key={code}>
              {ready ? (
                <Link
                  href={`/${code}`}
                  className="block rounded-3xl border-2 border-line bg-surface p-5 text-center shadow-[var(--shadow)] transition-all hover:-translate-y-0.5 hover:border-indigo/50"
                >
                  {inner}
                </Link>
              ) : (
                <div
                  className="relative block cursor-not-allowed rounded-3xl border-2 border-dashed border-line bg-surface/40 p-5 text-center opacity-60"
                  aria-disabled="true"
                >
                  {inner}
                  <span className="mt-2 block text-[10px] font-semibold uppercase tracking-widest text-ink-faint">
                    coming soon
                  </span>
                </div>
              )}
            </li>
          )
        })}
      </ul>

      <ul className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ink-soft">
        <li>✔ Two-minute lessons</li>
        <li>✔ No signup</li>
        <li>✔ Works offline once loaded</li>
      </ul>
    </main>
  )
}

'use client'

import { useRef, useState } from 'react'
import type { LangCode } from '@/lib/languages'
import { Script } from '@/components/ui/Script'

/**
 * "How do I say…?"
 *
 * Sarvam's translation runs in modern-colloquial mode rather than the default
 * formal register, to match how the lessons are written — a learner who asks for
 * "where's the bathroom" should get the sentence people actually say.
 */
export function Phrasebook({ lang, languageName }: { lang: LangCode; languageName: string }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ query: string; native: string; roman: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  // Responses can arrive out of order, and the box stays editable while one is
  // in flight -- without this you could be shown phrase A's translation sitting
  // under phrase B.
  const requestId = useRef(0)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const query = text.trim()
    if (!query || loading) return
    const id = ++requestId.current
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: query, to: lang }),
      })
      const body = (await res.json()) as { native?: string; roman?: string; error?: string }
      if (id !== requestId.current) return // superseded
      if (!res.ok) throw new Error(body.error ?? 'Could not translate that')
      setResult({ query, native: body.native ?? '', roman: body.roman ?? '' })
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-extrabold text-ink">Phrasebook</h1>
      <p className="mt-1 text-ink-soft">
        Say it in {languageName} — everyday phrasing, not textbook phrasing.
      </p>

      <form onSubmit={lookup} className="mt-6">
        <label htmlFor="phrase" className="sr-only">Phrase in English</label>
        <textarea
          id="phrase"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={200}
          placeholder="How much does this cost?"
          className="w-full resize-none rounded-2xl border-2 border-line bg-surface px-4 py-3 text-ink outline-none placeholder:text-ink-faint focus:border-indigo"
        />
        <button
          type="submit"
          disabled={!text.trim() || loading}
          className="mt-3 w-full rounded-2xl bg-indigo px-6 py-3.5 font-bold text-white shadow-[var(--shadow)] disabled:opacity-40 dark:text-indigo-soft"
        >
          {loading ? 'Translating…' : 'Translate'}
        </button>
      </form>

      {error && (
        <p role="status" className="mt-5 rounded-2xl bg-terracotta-soft px-4 py-3 text-sm text-ink">{error}</p>
      )}

      {result && (
        <div className="animate-rise mt-6 rounded-3xl border border-line bg-surface p-6 text-center shadow-[var(--shadow)]">
          <p className="mb-3 text-xs text-ink-faint">&ldquo;{result.query}&rdquo;</p>
          <Script lang={lang} className="block text-3xl font-bold text-ink">{result.native}</Script>
          <p className="mt-2 text-sm italic text-terracotta">{result.roman}</p>
        </div>
      )}

      <p className="mt-8 text-xs text-ink-faint">
        Translations come from Sarvam&rsquo;s Mayura model. Lesson audio is pre-recorded;
        phrasebook results are text only.
      </p>
    </main>
  )
}

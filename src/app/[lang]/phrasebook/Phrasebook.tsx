'use client'

import { useRef, useState } from 'react'
import type { LangCode } from '@/lib/languages'
import { Script } from '@/components/ui/Script'
import { Mor } from '@/components/ui/Mor'

export function Phrasebook({ lang, languageName }: { lang: LangCode; languageName: string }) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<{ query: string; native: string; roman: string } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const requestId = useRef(0)

  async function lookup(e: React.FormEvent) {
    e.preventDefault()
    const query = text.trim()
    if (!query || loading) return
    const id = ++requestId.current
    setLoading(true); setError(null); setResult(null)
    try {
      const res = await fetch('/api/translate', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ text: query, to: lang }),
      })
      const body = (await res.json()) as { native?: string; roman?: string; error?: string }
      if (id !== requestId.current) return
      if (!res.ok) throw new Error(body.error ?? 'Couldn’t translate that')
      setResult({ query, native: body.native ?? '', roman: body.roman ?? '' })
    } catch (err) {
      if (id === requestId.current) setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-5 pb-20 pt-8">
      <div className="flex items-center gap-3">
        <Mor pose="wave" className="-my-2 -ml-2 w-16 shrink-0" />
        <h1 className="display text-3xl font-extrabold text-ink">How do you say…</h1>
      </div>

      <form onSubmit={lookup} className="mt-6 flex gap-2">
        <label htmlFor="phrase" className="sr-only">Phrase in English</label>
        <input
          id="phrase" value={text} onChange={(e) => setText(e.target.value)} maxLength={200}
          placeholder={`…in ${languageName}?`}
          className="min-w-0 flex-1 rounded-2xl bg-surface px-5 py-4 text-lg text-ink shadow-[var(--shadow)] outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-accent"
        />
        <button type="submit" disabled={!text.trim() || loading}
          className="press display rounded-2xl bg-accent px-5 font-bold text-accent-ink shadow-[var(--shadow)] disabled:opacity-40">
          {loading ? '…' : '→'}
        </button>
      </form>

      {error && <p role="status" className="mt-4 rounded-2xl bg-terracotta-soft px-4 py-3 text-sm text-ink">{error}</p>}

      {result && (
        <div className="animate-pop mt-8 rounded-3xl bg-surface p-8 text-center shadow-[var(--shadow-lift)]">
          <p className="text-sm text-ink-faint">&ldquo;{result.query}&rdquo;</p>
          <Script lang={lang} className="display mt-3 block text-4xl font-bold text-ink">{result.native}</Script>
          <p className="mt-2 italic text-ink-soft">{result.roman}</p>
        </div>
      )}
    </main>
  )
}

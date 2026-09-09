'use client'

import { useRef, useState } from 'react'
import type { LangCode } from '@/lib/languages'
import { exportProgress, importProgress, resetProgress } from '@/lib/progress'

/**
 * Back up and restore progress.
 *
 * localStorage-only means clearing browser data wipes everything with no
 * recovery, which is a poor trade for the convenience of not having accounts.
 * A file the learner can keep costs almost nothing and makes that trade fair.
 */
export function ProgressBackup({ lang }: { lang: LangCode }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [note, setNote] = useState<string | null>(null)

  function download() {
    const blob = new Blob([exportProgress(lang)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `indiligo-${lang}-progress.json`
    a.click()
    URL.revokeObjectURL(url)
    setNote('Saved to your downloads.')
  }

  async function restore(file: File) {
    const ok = importProgress(lang, await file.text())
    setNote(ok ? 'Progress restored.' : "That file didn't look like an Indiligo backup.")
  }

  return (
    <div className="mt-10 border-t border-line pt-5">
      <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-ink-faint">
        <button type="button" onClick={download} className="underline-offset-4 hover:text-ink hover:underline">
          Back up progress
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className="underline-offset-4 hover:text-ink hover:underline">
          Restore from file
        </button>
        <button
          type="button"
          onClick={() => {
            if (confirm('Reset all progress for this language?')) {
              resetProgress(lang)
              setNote('Progress reset.')
            }
          }}
          className="underline-offset-4 hover:text-terracotta hover:underline"
        >
          Reset
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void restore(file)
            e.target.value = ''
          }}
        />
      </div>
      {note && <p role="status" className="mt-2 text-center text-xs text-ink-soft">{note}</p>}
    </div>
  )
}

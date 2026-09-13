'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { LangCode } from '@/lib/languages'
import { FontSizeToggle } from './FontSizeToggle'
import { ConfirmDialog } from './ConfirmDialog'

export function LessonHeader({ lang, title }: { lang: LangCode; title: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-20 bg-ground/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-5 py-3">
          <button type="button" onClick={() => setConfirming(true)} aria-label="Leave lesson"
            className="press grid h-9 w-9 place-items-center rounded-full bg-surface text-ink shadow-[var(--shadow)]">
            <span aria-hidden="true">✕</span>
          </button>
          <p className="display ml-1 truncate font-bold text-ink">{title}</p>
          <span className="ml-auto"><FontSizeToggle /></span>
        </div>
      </header>

      <ConfirmDialog open={confirming} title="Leave lesson?" body="This attempt won’t be saved." onDismiss={() => setConfirming(false)}>
        <button type="button" onClick={() => router.push(`/${lang}/learn`)} className="press display rounded-2xl bg-ink px-5 py-3.5 font-bold text-ground">
          Leave
        </button>
        <button type="button" onClick={() => setConfirming(false)} className="press rounded-2xl bg-surface-sunk px-5 py-3 font-semibold text-ink">
          Keep going
        </button>
      </ConfirmDialog>
    </>
  )
}

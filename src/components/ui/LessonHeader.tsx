'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { LangCode } from '@/lib/languages'
import { FontSizeToggle } from './FontSizeToggle'
import { ConfirmDialog } from './ConfirmDialog'

/**
 * Lesson chrome: exit, title, text size.
 *
 * Exit asks first. Leaving discards the whole attempt, and doing that on a
 * mis-tap with no warning is the kind of small cruelty that makes people stop
 * using something.
 */
export function LessonHeader({ lang, title }: { lang: LangCode; title: string }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)

  return (
    <>
      <header className="sticky top-0 z-20 border-b border-line bg-ground/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="rounded-lg px-2 py-1 text-sm text-ink-soft transition-colors hover:bg-surface-sunk hover:text-ink"
          >
            <span aria-hidden="true">←</span> Exit
          </button>
          <p className="ml-auto truncate text-sm font-semibold text-ink-soft">{title}</p>
          <FontSizeToggle />
        </div>
      </header>

      <ConfirmDialog
        open={confirming}
        title="Leave this lesson?"
        body="Your progress in this lesson won't be saved."
        onDismiss={() => setConfirming(false)}
      >
        <button
          type="button"
          onClick={() => router.push(`/${lang}/learn`)}
          className="rounded-2xl bg-indigo px-5 py-3.5 font-bold text-white dark:text-indigo-soft"
        >
          Leave lesson
        </button>
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-2xl border-2 border-line px-5 py-3 font-semibold text-ink"
        >
          Change language
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-xl px-4 py-2 text-sm text-ink-faint underline-offset-4 hover:underline"
        >
          Cancel — keep learning
        </button>
      </ConfirmDialog>
    </>
  )
}

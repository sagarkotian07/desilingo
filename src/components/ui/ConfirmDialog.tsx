'use client'

import { useCallback, useEffect, useRef } from 'react'

/**
 * A modal that behaves like one.
 *
 * The version this is modelled on had no role, no aria-modal, no focus trap, no
 * Escape handler and no focus restore, and its scrim ignored clicks — so for a
 * keyboard or screen-reader user it was a visual overlay with the page still
 * live behind it. All of that is the difference between a dialog and a div.
 */
export function ConfirmDialog({
  open, title, body, onDismiss, children,
}: {
  open: boolean
  title: string
  body?: string
  onDismiss: () => void
  children: React.ReactNode
}) {
  const panelRef = useRef<HTMLDivElement>(null)
  const restoreTo = useRef<HTMLElement | null>(null)

  const focusables = useCallback(
    () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute('disabled')),
    [],
  )

  useEffect(() => {
    if (!open) return
    restoreTo.current = document.activeElement as HTMLElement | null
    focusables()[0]?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onDismiss(); return }
      if (e.key !== 'Tab') return

      // Trap: wrap focus at both ends rather than letting it escape to the page.
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && active === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown)
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = overflow
      restoreTo.current?.focus()
    }
  }, [open, onDismiss, focusables])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-indigo-deep/50 px-4 backdrop-blur-sm"
      onClick={onDismiss}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby={body ? 'confirm-body' : undefined}
        onClick={(e) => e.stopPropagation()}
        className="animate-pop w-full max-w-sm rounded-3xl border border-line bg-surface p-6 shadow-[var(--shadow)]"
      >
        <h2 id="confirm-title" className="text-xl font-extrabold text-ink">{title}</h2>
        {body && <p id="confirm-body" className="mt-1.5 text-sm text-ink-soft">{body}</p>}
        <div className="mt-5 flex flex-col gap-2.5">{children}</div>
      </div>
    </div>
  )
}

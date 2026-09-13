'use client'

import { useCallback, useSyncExternalStore } from 'react'

/**
 * Text-size preference.
 *
 * Indic scripts carry meaning in marks that sit above and below the baseline --
 * matras, nuktas, conjuncts -- so they lose legibility faster than Latin text
 * at small sizes. A size control is closer to a functional requirement here
 * than a nicety.
 *
 * Applied as `data-fontsize` on <html> so CSS can scale everything at once,
 * including the clamped script sizes that inline styles would otherwise win.
 */

export type FontSize = 'normal' | 'large'

export const FONT_SIZE_KEY = 'desilingo:font-size'

function read(): FontSize {
  try {
    return localStorage.getItem(FONT_SIZE_KEY) === 'large' ? 'large' : 'normal'
  } catch {
    return 'normal'
  }
}

const listeners = new Set<() => void>()
let snapshot: FontSize | null = null

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): FontSize {
  snapshot ??= read()
  return snapshot
}

export function setFontSize(next: FontSize) {
  snapshot = next
  try {
    localStorage.setItem(FONT_SIZE_KEY, next)
  } catch { /* private mode: keep it for this session only */ }
  document.documentElement.setAttribute('data-fontsize', next)
  for (const l of listeners) l()
}

export function useFontSize() {
  const fontSize = useSyncExternalStore(subscribe, getSnapshot, () => 'normal' as FontSize)
  const toggle = useCallback(() => {
    setFontSize(getSnapshot() === 'large' ? 'normal' : 'large')
  }, [])
  return { fontSize, toggle }
}

/**
 * Runs before React hydrates so the page never flashes at the wrong size.
 * Inlined into <head>; kept tiny and failure-tolerant because it is blocking.
 */
export const FONT_SIZE_BOOTSTRAP = `try{var s=localStorage.getItem('${FONT_SIZE_KEY}');if(s==='large')document.documentElement.setAttribute('data-fontsize','large')}catch(e){}`

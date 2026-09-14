'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { GROUND, THEME_KEY, type Theme, type ThemePref } from './theme'

/**
 * Light / dark preference.
 *
 * The palette follows the OS until the user says otherwise. A pick lands as
 * `data-theme` on <html>, which the CSS reads next to prefers-color-scheme
 * (the `dark` variant in globals.css), and in localStorage so it survives a
 * reload. Picking the theme the OS already shows clears the pick instead of
 * pinning it, so the page goes back to following the OS: that is what undoing
 * a toggle should mean, and it keeps "follows the OS" the state nearly
 * everyone stays in.
 */

const DARK_QUERY = '(prefers-color-scheme: dark)'

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemTheme(): Theme {
  return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches ? 'dark' : 'light'
}

const listeners = new Set<() => void>()
let pref: ThemePref | null = null

function subscribePref(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function subscribeSystem(listener: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {}
  const mq = window.matchMedia(DARK_QUERY)
  mq.addEventListener('change', listener)
  return () => mq.removeEventListener('change', listener)
}

function getPref(): ThemePref {
  pref ??= readPref()
  return pref
}

/** Next renders one theme-color meta per scheme; a pinned theme needs both to agree. */
function syncThemeColor(next: ThemePref) {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own: Theme = meta.getAttribute('media')?.includes('dark') ? 'dark' : 'light'
    meta.content = GROUND[next === 'system' ? own : next]
  }
}

export function setThemePref(next: ThemePref) {
  pref = next
  try {
    if (next === 'system') localStorage.removeItem(THEME_KEY)
    else localStorage.setItem(THEME_KEY, next)
  } catch { /* private mode: keep it for this session only */ }
  const root = document.documentElement
  if (next === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', next)
  syncThemeColor(next)
  for (const l of listeners) l()
}

export function useTheme() {
  const picked = useSyncExternalStore(subscribePref, getPref, () => 'system' as ThemePref)
  const system = useSyncExternalStore(subscribeSystem, systemTheme, () => 'light' as Theme)
  const theme: Theme = picked === 'system' ? system : picked

  // The bootstrap script sets data-theme before paint but runs before the
  // meta tags exist; bring the browser chrome in line once we are mounted.
  useEffect(() => { syncThemeColor(getPref()) }, [])

  const toggle = useCallback(() => {
    const current = getPref()
    const os = systemTheme()
    const next: Theme = (current === 'system' ? os : current) === 'dark' ? 'light' : 'dark'
    setThemePref(next === os ? 'system' : next)
  }, [])

  return { theme, toggle }
}

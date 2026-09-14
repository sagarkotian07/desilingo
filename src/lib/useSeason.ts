'use client'

import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { GROUND, SEASON_KEY, type Season, type SeasonPref } from './season'

/**
 * Spring / winter preference.
 *
 * The palette follows the OS until the user says otherwise: a dark OS gets
 * winter, a light one spring. A pick lands as `data-season` on <html>, which
 * the CSS reads next to prefers-color-scheme (the `dark` variant in
 * globals.css), and in localStorage so it survives a reload. Picking the
 * season the OS already shows clears the pick instead of pinning it, so the
 * page goes back to following the OS: that is what undoing a toggle should
 * mean, and it keeps "follows the OS" the state nearly everyone stays in.
 */

const DARK_QUERY = '(prefers-color-scheme: dark)'

function readPref(): SeasonPref {
  try {
    const v = localStorage.getItem(SEASON_KEY)
    return v === 'spring' || v === 'winter' ? v : 'system'
  } catch {
    return 'system'
  }
}

function systemSeason(): Season {
  return typeof window !== 'undefined' && window.matchMedia?.(DARK_QUERY).matches ? 'winter' : 'spring'
}

const listeners = new Set<() => void>()
let pref: SeasonPref | null = null

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

function getPref(): SeasonPref {
  pref ??= readPref()
  return pref
}

/** Next renders one theme-color meta per scheme; a pinned season needs both to agree. */
function syncThemeColor(next: SeasonPref) {
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const own: Season = meta.getAttribute('media')?.includes('dark') ? 'winter' : 'spring'
    meta.content = GROUND[next === 'system' ? own : next]
  }
}

export function setSeasonPref(next: SeasonPref) {
  pref = next
  try {
    if (next === 'system') localStorage.removeItem(SEASON_KEY)
    else localStorage.setItem(SEASON_KEY, next)
  } catch { /* private mode: keep it for this session only */ }
  const root = document.documentElement
  if (next === 'system') root.removeAttribute('data-season')
  else root.setAttribute('data-season', next)
  syncThemeColor(next)
  for (const l of listeners) l()
}

export function useSeason() {
  const picked = useSyncExternalStore(subscribePref, getPref, () => 'system' as SeasonPref)
  const system = useSyncExternalStore(subscribeSystem, systemSeason, () => 'spring' as Season)
  const season: Season = picked === 'system' ? system : picked

  // The bootstrap script sets data-season before paint but runs before the
  // meta tags exist; bring the browser chrome in line once we are mounted.
  useEffect(() => { syncThemeColor(getPref()) }, [])

  const toggle = useCallback(() => {
    const current = getPref()
    const os = systemSeason()
    const next: Season = (current === 'system' ? os : current) === 'winter' ? 'spring' : 'winter'
    setSeasonPref(next === os ? 'system' : next)
  }, [])

  return { season, toggle }
}

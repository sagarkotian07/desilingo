'use client'

import { useSyncExternalStore } from 'react'
import { isLangCode, type LangCode } from './languages'

/**
 * The language the learner last used.
 *
 * Without this the picker is a toll gate: you choose the same language every
 * single visit before you can do anything.
 */

export const LANGUAGE_KEY = 'desilingo:language'

const listeners = new Set<() => void>()
let snapshot: LangCode | null | undefined

function read(): LangCode | null {
  try {
    const v = localStorage.getItem(LANGUAGE_KEY)
    return v && isLangCode(v) ? v : null
  } catch {
    return null
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): LangCode | null {
  if (snapshot === undefined) snapshot = read()
  return snapshot
}

export function rememberLanguage(lang: LangCode) {
  if (snapshot === lang) return
  snapshot = lang
  try { localStorage.setItem(LANGUAGE_KEY, lang) } catch { /* private mode */ }
  for (const l of listeners) l()
}

export function forgetLanguage() {
  snapshot = null
  try { localStorage.removeItem(LANGUAGE_KEY) } catch { /* private mode */ }
  for (const l of listeners) l()
}

/** null during server render, so the picker never flashes the wrong state. */
export function useLanguagePref(): LangCode | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

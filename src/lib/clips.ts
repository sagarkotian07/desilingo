import manifest from '@/generated/audio-manifest.json'
import { audioPath, PACE_NORMAL, type AudioManifest } from './audio'
import type { LangCode } from './languages'

/**
 * Client-side clip lookup.
 *
 * The generated manifest maps hash -> phrase; the browser needs the reverse, and
 * building that index here avoids hashing (and therefore node:crypto) in the
 * client bundle.
 */
const CLIPS = manifest as AudioManifest

const index = new Map<string, string>()
for (const [key, entry] of Object.entries(CLIPS)) {
  index.set(`${entry.lang}|${entry.pace}|${entry.text}`, key)
}

export function clipKey(lang: LangCode, text: string, pace = PACE_NORMAL): string | null {
  return index.get(`${lang}|${pace}|${text}`) ?? null
}

/** Static CDN path — the normal playback route, no function invoked. */
export function clipUrl(lang: LangCode, text: string, pace = PACE_NORMAL): string | null {
  const key = clipKey(lang, text, pace)
  return key ? audioPath(lang, key) : null
}

/** Repair path, used only when the static file fails to load. */
export function repairUrl(key: string): string {
  return `/api/tts?k=${encodeURIComponent(key)}`
}

const prefetched = new Set<string>()

/**
 * Warms the next exercise's clip so playback never waits on the network.
 *
 * Clips are static and immutable, so once the browser has one it is cached for
 * good; this just moves the fetch off the critical path.
 */
export function prefetchClip(lang: LangCode, text: string, pace = PACE_NORMAL): void {
  if (typeof window === 'undefined') return
  const url = clipUrl(lang, text, pace)
  if (!url || prefetched.has(url)) return
  prefetched.add(url)
  const audio = new Audio()
  audio.preload = 'auto'
  audio.src = url
}

'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { clipKey, clipUrl, repairUrl } from './clips'
import { PACE_NORMAL, PACE_SLOW } from './audio'
import type { LangCode } from './languages'

export { PACE_NORMAL, PACE_SLOW }

/**
 * Lesson audio playback.
 *
 * Clips are pre-generated static files, so the normal path is an immediate CDN
 * fetch with no spinner and no API call. `/api/tts` is only touched if that
 * static fetch fails, which turns a missing file into a slow clip rather than
 * silence.
 */
export function useAudio(lang: LangCode) {
  const [playing, setPlaying] = useState<string | null>(null)
  const [blocked, setBlocked] = useState(false)
  const ref = useRef<HTMLAudioElement | null>(null)

  useEffect(() => () => { ref.current?.pause(); ref.current = null }, [])

  const play = useCallback(
    async (text: string, pace: number = PACE_NORMAL): Promise<void> => {
      const key = clipKey(lang, text, pace)
      const src = clipUrl(lang, text, pace)
      if (!src || !key) return

      ref.current?.pause()
      const audio = new Audio(src)
      ref.current = audio
      const token = `${text}|${pace}`
      setPlaying(token)

      const done = () => setPlaying((p) => (p === token ? null : p))
      audio.addEventListener('ended', done)

      // Static file missing: fall back to synthesizing it once.
      audio.addEventListener('error', () => {
        if (audio.src.includes('/api/tts')) { done(); return }
        audio.src = repairUrl(key)
        audio.play().catch(() => done())
      })

      try {
        await audio.play()
        setBlocked(false)
      } catch (err) {
        // Safari and iOS refuse playback that isn't from a user gesture. That's
        // expected on autoplay, not an error worth showing -- the UI just falls
        // back to a "tap to hear" affordance.
        if ((err as DOMException)?.name === 'NotAllowedError') setBlocked(true)
        done()
      }
    },
    [lang],
  )

  const stop = useCallback(() => {
    ref.current?.pause()
    setPlaying(null)
  }, [])

  /**
   * Memoised so the returned object is referentially stable.
   *
   * Returning a fresh object literal made every consumer's autoplay effect
   * re-fire on each render: the clip ended, state changed, the object identity
   * changed, the effect ran again, and the phrase replayed forever.
   */
  return useMemo(
    () => ({ play, stop, playing, blocked, isPlaying: playing !== null }),
    [play, stop, playing, blocked],
  )
}

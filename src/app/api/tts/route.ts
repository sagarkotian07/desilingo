import { NextResponse } from 'next/server'
import manifest from '@/generated/audio-manifest.json'
import { sarvam } from '@/lib/voice/sarvam'
import { VoiceError } from '@/lib/voice/types'
import type { AudioManifest } from '@/lib/audio'
import { clientIp, rateLimit } from '@/lib/rate-limit'

/**
 * Repair path for lesson audio.
 *
 * The normal path never reaches here: clips are pre-generated and served as
 * static files straight from the CDN. This route only runs when a static fetch
 * fails, and it exists so a missing file degrades to a slow clip rather than
 * silence.
 *
 * It takes a manifest KEY, never free text. That is the whole abuse story: an
 * attacker can at worst ask us to re-synthesize phrases we already ship, and
 * cannot turn this into a general-purpose text-to-speech API billed to us.
 *
 * Note it must never read from public/ -- static assets are not in the function
 * bundle, so fs access here works in `next dev` and 500s in production.
 */
export const runtime = 'nodejs'
export const maxDuration = 20

const CLIPS = manifest as AudioManifest

export async function GET(req: Request) {
  const key = new URL(req.url).searchParams.get('k')
  if (!key) return NextResponse.json({ error: 'missing key' }, { status: 400 })

  const entry = CLIPS[key]
  if (!entry) return NextResponse.json({ error: 'unknown clip' }, { status: 404 })

  const limit = rateLimit(`tts:${clientIp(req)}`, 30, 60_000)
  if (!limit.ok) {
    return NextResponse.json({ error: 'slow down' }, {
      status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) },
    })
  }

  try {
    const audio = await sarvam.synthesize({
      text: entry.text, lang: entry.lang, pace: entry.pace, speaker: entry.speaker,
    })
    return new NextResponse(audio, {
      headers: {
        'content-type': 'audio/mpeg',
        // The key is a content hash, so this response can never go stale.
        'cache-control': 'public, max-age=31536000, s-maxage=31536000, immutable',
      },
    })
  } catch (err) {
    const status = err instanceof VoiceError ? err.status || 502 : 502
    console.error('[tts]', (err as Error).message)
    return NextResponse.json({ error: 'synthesis failed' }, { status })
  }
}

import { NextResponse } from 'next/server'
import { sarvam } from '@/lib/voice/sarvam'
import { VoiceError } from '@/lib/voice/types'
import { scorePronunciation } from '@/lib/scoring/score'
import { resolvePhrase } from '@/lib/phrase-lookup'
import { parseWavHeader } from '@/lib/wav-header'
import { clientIp, isSameOrigin, rateLimit } from '@/lib/rate-limit'

/**
 * Transcribes a spoken attempt and scores it.
 *
 * This is the expensive endpoint and the real abuse surface: Sarvam bills STT by
 * the second. Three things keep that bounded, and all three were previously
 * missing or bypassable:
 *
 *  1. The phrase is resolved from a content-addressed key, never sent as text.
 *     A free-text target meant a caller could post ~2 MB of text that then
 *     entered several quadratic edit-distance matrices after we had already paid
 *     for the transcription.
 *  2. Content-Length must be present and sane. A missing or chunked header used
 *     to parse to 0 and sail past the guard, so the whole body was read anyway.
 *  3. Duration is read from the WAV header, not inferred from byte count. Bytes
 *     are a poor proxy: Sarvam accepts up to 30s, so a compressed upload could
 *     cost several times the intended maximum while staying under a size cap.
 */
export const runtime = 'nodejs'
export const maxDuration = 20

/** Comfortably above an 8-second 16 kHz mono WAV (~256 KB). */
const MAX_BYTES = 1_000_000
/** The recorder caps at 8s; allow headroom without allowing Sarvam's full 30s. */
const MAX_DURATION_MS = 12_000

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const limit = rateLimit(`stt:${clientIp(req)}`, 12, 60_000)
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many attempts. Give it a moment.' }, {
      status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) },
    })
  }

  // Require a declared size. Absent or unparseable is rejected rather than
  // treated as zero, which is what let the old guard be bypassed.
  const declared = Number(req.headers.get('content-length'))
  if (!Number.isFinite(declared) || declared <= 0) {
    return NextResponse.json({ error: 'missing content-length' }, { status: 411 })
  }
  if (declared > MAX_BYTES) {
    return NextResponse.json({ error: 'recording too large' }, { status: 413 })
  }

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 })
  }

  const audio = form.get('audio')
  const phraseKey = String(form.get('phraseKey') ?? '')
  const rmsRaw = form.get('rmsPeak')
  const rmsPeak = rmsRaw === null ? undefined : Number(rmsRaw)

  if (!(audio instanceof Blob)) return NextResponse.json({ error: 'missing audio' }, { status: 400 })
  if (!audio.size) return NextResponse.json({ error: 'empty recording' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'recording too large' }, { status: 413 })

  // The allowlist: we will only ever score a phrase we actually ship.
  const phrase = resolvePhrase(phraseKey)
  if (!phrase) return NextResponse.json({ error: 'unknown phrase' }, { status: 404 })

  const bytes = await audio.arrayBuffer()
  const wav = parseWavHeader(bytes)
  if (!wav) {
    return NextResponse.json({ error: 'expected a WAV recording' }, { status: 415 })
  }
  if (wav.durationMs > MAX_DURATION_MS) {
    return NextResponse.json({ error: 'recording too long' }, { status: 413 })
  }

  try {
    const { transcript, detectedLanguage } = await sarvam.transcribe({
      audio: new Blob([bytes], { type: 'audio/wav' }),
      lang: phrase.lang,
      filename: 'attempt.wav',
    })
    const result = scorePronunciation({
      target: phrase.text, transcript, lang: phrase.lang, detectedLanguage,
      rmsPeak: Number.isFinite(rmsPeak) ? rmsPeak : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    const status = err instanceof VoiceError ? err.status || 502 : 502
    console.error('[stt]', (err as Error).message)
    return NextResponse.json({ error: 'could not transcribe that' }, { status })
  }
}

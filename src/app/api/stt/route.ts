import { NextResponse } from 'next/server'
import { sarvam } from '@/lib/voice/sarvam'
import { VoiceError } from '@/lib/voice/types'
import { isLangCode } from '@/lib/languages'
import { scorePronunciation } from '@/lib/scoring/score'
import { clientIp, isSameOrigin, rateLimit } from '@/lib/rate-limit'

/**
 * Transcribes a spoken attempt and scores it.
 *
 * This is the expensive endpoint and the real abuse surface: Sarvam bills STT by
 * the second, so an unthrottled public proxy is a way for a stranger to spend
 * someone else's credits. Vercel's request body limit is 100 MB and will not
 * save us, so the size cap here is checked before the body is consumed.
 *
 * Scoring happens server-side so the verdict logic has exactly one home.
 */
export const runtime = 'nodejs'
export const maxDuration = 20

/** Comfortably above an 8-second clip, far below anything worth uploading. */
const MAX_BYTES = 2_000_000

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

  // Reject oversized uploads before reading the stream.
  const declared = Number(req.headers.get('content-length') ?? 0)
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
  const lang = String(form.get('lang') ?? '')
  const target = String(form.get('target') ?? '')
  const rmsRaw = form.get('rmsPeak')
  const rmsPeak = rmsRaw === null ? undefined : Number(rmsRaw)

  if (!(audio instanceof Blob)) return NextResponse.json({ error: 'missing audio' }, { status: 400 })
  if (audio.size > MAX_BYTES) return NextResponse.json({ error: 'recording too large' }, { status: 413 })
  if (!audio.size) return NextResponse.json({ error: 'empty recording' }, { status: 400 })
  if (!isLangCode(lang)) return NextResponse.json({ error: 'unknown language' }, { status: 400 })
  if (!target) return NextResponse.json({ error: 'missing target phrase' }, { status: 400 })

  try {
    const { transcript, detectedLanguage } = await sarvam.transcribe({
      audio,
      lang,
      filename: form.get('filename')?.toString() || 'attempt.webm',
    })
    const result = scorePronunciation({
      target, transcript, lang, detectedLanguage,
      rmsPeak: Number.isFinite(rmsPeak) ? rmsPeak : undefined,
    })
    return NextResponse.json(result)
  } catch (err) {
    const status = err instanceof VoiceError ? err.status || 502 : 502
    console.error('[stt]', (err as Error).message)
    return NextResponse.json({ error: 'could not transcribe that' }, { status })
  }
}

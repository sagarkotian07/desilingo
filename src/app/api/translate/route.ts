import { NextResponse } from 'next/server'
import { sarvam } from '@/lib/voice/sarvam'
import { VoiceError } from '@/lib/voice/types'
import { isLangCode } from '@/lib/languages'
import { clientIp, isSameOrigin, rateLimit } from '@/lib/rate-limit'

/**
 * Phrasebook: "how do I say this?"
 *
 * The one endpoint that genuinely accepts free text, so it gets the tightest
 * limits -- a short input cap and a low per-IP rate. Returns both the native
 * script and a Roman reading, because a beginner cannot use the first without
 * the second.
 */
export const runtime = 'nodejs'
export const maxDuration = 20

const MAX_INPUT = 200

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const limit = rateLimit(`tr:${clientIp(req)}`, 10, 60_000)
  if (!limit.ok) {
    return NextResponse.json({ error: 'Too many lookups. Give it a moment.' }, {
      status: 429, headers: { 'retry-after': String(limit.retryAfterSeconds) },
    })
  }

  let body: { text?: unknown; to?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'expected JSON' }, { status: 400 })
  }

  const text = typeof body.text === 'string' ? body.text.trim() : ''
  const to = String(body.to ?? '')
  if (!text) return NextResponse.json({ error: 'nothing to translate' }, { status: 400 })
  if (text.length > MAX_INPUT) {
    return NextResponse.json({ error: `keep it under ${MAX_INPUT} characters` }, { status: 400 })
  }
  if (!isLangCode(to)) return NextResponse.json({ error: 'unknown language' }, { status: 400 })

  try {
    // Two translate calls in parallel rather than translate-then-transliterate.
    // output_script renders the same translation in a different script, and it
    // romanizes noticeably better than running /transliterate over the result:
    // for "How much does this cost?" in Kannada this yields "Idara bele eshtu?"
    // where transliteration gave "Idhaa bele eshtu?".
    const [native, roman] = await Promise.all([
      sarvam.translate({ text, from: 'en', to, script: 'native' }),
      sarvam.translate({ text, from: 'en', to, script: 'roman' }),
    ])
    return NextResponse.json({ native, roman })
  } catch (err) {
    const status = err instanceof VoiceError ? err.status || 502 : 502
    console.error('[translate]', (err as Error).message)
    return NextResponse.json({ error: 'translation failed' }, { status })
  }
}

/**
 * Minimal WAV header parser, server-side.
 *
 * The STT route needs to know how long a recording actually is, not just how
 * many bytes it weighs. Byte length is a poor proxy: Sarvam bills by the second
 * and accepts up to 30s, so a caller could quietly cost us ~4x the intended
 * maximum while staying under any size cap.
 */

export interface WavInfo {
  channels: number
  sampleRate: number
  bitsPerSample: number
  durationMs: number
}

const ascii = (view: DataView, offset: number, length: number) =>
  String.fromCharCode(...Array.from({ length }, (_, i) => view.getUint8(offset + i)))

/** Returns null when the bytes are not a WAV we recognise. */
export function parseWavHeader(bytes: ArrayBuffer): WavInfo | null {
  if (bytes.byteLength < 44) return null
  const view = new DataView(bytes)

  if (ascii(view, 0, 4) !== 'RIFF' || ascii(view, 8, 4) !== 'WAVE') return null

  // Walk the chunk list rather than assuming fmt/data sit at fixed offsets --
  // some encoders insert LIST or fact chunks first.
  let offset = 12
  let fmt: { channels: number; sampleRate: number; bitsPerSample: number } | null = null
  let dataBytes = 0

  while (offset + 8 <= view.byteLength) {
    const id = ascii(view, offset, 4)
    const size = view.getUint32(offset + 4, true)
    const body = offset + 8

    if (id === 'fmt ' && body + 16 <= view.byteLength) {
      fmt = {
        channels: view.getUint16(body + 2, true),
        sampleRate: view.getUint32(body + 4, true),
        bitsPerSample: view.getUint16(body + 14, true),
      }
    } else if (id === 'data') {
      // A streamed WAV can declare size 0; fall back to what actually arrived.
      dataBytes = size > 0 ? Math.min(size, view.byteLength - body) : view.byteLength - body
    }

    if (size <= 0) break
    offset = body + size + (size % 2) // chunks are word-aligned
  }

  if (!fmt || !dataBytes) return null
  if (fmt.channels < 1 || fmt.sampleRate < 1 || fmt.bitsPerSample < 8) return null

  const bytesPerFrame = fmt.channels * (fmt.bitsPerSample / 8)
  if (bytesPerFrame < 1) return null

  return {
    ...fmt,
    durationMs: Math.round((dataBytes / bytesPerFrame / fmt.sampleRate) * 1000),
  }
}

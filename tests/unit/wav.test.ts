import { describe, it, expect } from 'vitest'
import { encodeWav } from '@/lib/wav'

/**
 * Sarvam rejects the WebM container that Chrome's MediaRecorder produces, so
 * every recording is re-encoded to 16 kHz mono WAV before upload. If the header
 * is wrong the API returns a 400 that looks exactly like a transcription
 * failure, so it is worth pinning precisely.
 */
async function header(blob: Blob) {
  const view = new DataView(await blob.arrayBuffer())
  const str = (o: number, n: number) =>
    String.fromCharCode(...Array.from({ length: n }, (_, i) => view.getUint8(o + i)))
  return {
    riff: str(0, 4),
    wave: str(8, 4),
    fmt: str(12, 4),
    audioFormat: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bitsPerSample: view.getUint16(34, true),
    data: str(36, 4),
    dataBytes: view.getUint32(40, true),
    riffSize: view.getUint32(4, true),
  }
}

describe('encodeWav', () => {
  it('writes a 16-bit mono PCM header at the requested rate', async () => {
    const h = await header(encodeWav(new Float32Array(1000), 16000))
    expect(h).toMatchObject({
      riff: 'RIFF', wave: 'WAVE', fmt: 'fmt ', data: 'data',
      audioFormat: 1, channels: 1, sampleRate: 16000,
      bitsPerSample: 16, blockAlign: 2, byteRate: 32000,
    })
  })

  it('declares sizes that match the payload', async () => {
    const samples = new Float32Array(500)
    const blob = encodeWav(samples, 16000)
    const h = await header(blob)
    expect(h.dataBytes).toBe(500 * 2)
    expect(h.riffSize).toBe(36 + 500 * 2)
    expect(blob.size).toBe(44 + 500 * 2)
  })

  it('is labelled audio/wav, which is what Sarvam accepts', () => {
    expect(encodeWav(new Float32Array(10), 16000).type).toBe('audio/wav')
  })

  it('scales full-range samples without wrapping around', async () => {
    const blob = encodeWav(Float32Array.from([1, -1, 0]), 16000)
    const view = new DataView(await blob.arrayBuffer())
    expect(view.getInt16(44, true)).toBe(32767)
    expect(view.getInt16(46, true)).toBe(-32768)
    expect(view.getInt16(48, true)).toBe(0)
  })

  it('clamps out-of-range samples rather than letting them overflow', async () => {
    const blob = encodeWav(Float32Array.from([2.5, -2.5]), 16000)
    const view = new DataView(await blob.arrayBuffer())
    expect(view.getInt16(44, true)).toBe(32767)
    expect(view.getInt16(46, true)).toBe(-32768)
  })
})

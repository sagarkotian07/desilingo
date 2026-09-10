'use client'

/**
 * PCM capture helpers for speaking practice.
 *
 * Sarvam's speech-to-text rejects the WebM container Chrome's MediaRecorder
 * produces ("Invalid file type: audio/webm;codecs=opus"), and the obvious fix --
 * decode the recording and re-encode it -- does not work either: decodeAudioData
 * throws EncodingError on a MediaRecorder blob, because Chrome writes WebM with
 * no duration in the header and the decoder needs a complete, seekable file.
 *
 * So we never involve MediaRecorder. Audio is tapped straight off the graph as
 * Float32 PCM and written to a WAV ourselves. No container to misparse, and the
 * same code path on every browser.
 */

export const TARGET_RATE = 16000

/** Exported so the header can be unit-tested without a browser. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)             // PCM chunk size
  view.setUint16(20, 1, true)              // format: PCM
  view.setUint16(22, 1, true)              // channels: mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true)              // block align
  view.setUint16(34, 16, true)             // bits per sample
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

export function concatSamples(chunks: Float32Array[]): Float32Array {
  let total = 0
  for (const c of chunks) total += c.length
  const out = new Float32Array(total)
  let at = 0
  for (const c of chunks) { out.set(c, at); at += c.length }
  return out
}

/** Resamples via OfflineAudioContext, which does proper interpolation. Only
 *  needed when the browser refused a 16 kHz capture context. */
async function resample(samples: Float32Array, from: number): Promise<Float32Array> {
  if (from === TARGET_RATE || samples.length === 0) return samples
  const frames = Math.max(1, Math.ceil((samples.length * TARGET_RATE) / from))
  const offline = new OfflineAudioContext(1, frames, TARGET_RATE)
  const buffer = offline.createBuffer(1, samples.length, from)
  buffer.getChannelData(0).set(samples)
  const source = offline.createBufferSource()
  source.buffer = buffer
  source.connect(offline.destination)
  source.start()
  return (await offline.startRendering()).getChannelData(0)
}

export interface EncodedAudio {
  blob: Blob
  /** Peak amplitude 0..1, measured across every sample rather than polled per
   *  animation frame, so the scorer can reliably tell silence from a wrong
   *  answer. */
  peak: number
  durationMs: number
}

export async function pcmToWav16k(samples: Float32Array, sourceRate: number): Promise<EncodedAudio> {
  const resampled = await resample(samples, sourceRate)
  let peak = 0
  for (let i = 0; i < resampled.length; i++) {
    const v = Math.abs(resampled[i])
    if (v > peak) peak = v
  }
  return {
    blob: encodeWav(resampled, TARGET_RATE),
    peak,
    durationMs: Math.round((resampled.length / TARGET_RATE) * 1000),
  }
}

/** Worklet that forwards captured frames to the main thread. Loaded from a blob
 *  URL so it doesn't need to ship as a separate public file. */
export const PCM_WORKLET = `
class PCMRecorder extends AudioWorkletProcessor {
  process(inputs) {
    const channel = inputs[0] && inputs[0][0]
    if (channel && channel.length) this.port.postMessage(new Float32Array(channel))
    return true
  }
}
registerProcessor('pcm-recorder', PCMRecorder)
`

'use client'

import { useCallback, useRef, useState } from 'react'

/**
 * Microphone capture for speaking practice.
 *
 * Two things this does that matter downstream:
 *
 *  - It records the peak amplitude. The scorer needs to tell "the mic was muted"
 *    apart from "you said it wrong", and telling someone they mispronounced
 *    silence is the fastest way to lose them.
 *  - It caps recordings at 8 seconds. Sarvam bills STT by the second and its own
 *    REST limit is 30s, so an open-ended recorder is both a cost and a failure.
 */

export interface Recording {
  blob: Blob
  filename: string
  /** 0..1 peak amplitude observed while recording. */
  rmsPeak: number
  durationMs: number
}

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'denied' | 'unsupported'

const MAX_MS = 8000

/** Sarvam infers the container from the filename, so the extension must match
 *  what MediaRecorder actually produced. */
function pickMimeType(): { mimeType: string; ext: string } | null {
  const candidates: Array<[string, string]> = [
    ['audio/webm;codecs=opus', 'webm'],
    ['audio/ogg;codecs=opus', 'ogg'],
    ['audio/mp4', 'mp4'],   // Safari
    ['audio/webm', 'webm'],
  ]
  for (const [mimeType, ext] of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mimeType)) {
      return { mimeType, ext }
    }
  }
  return null
}

export function useRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const peakRef = useRef(0)
  const startedRef = useRef(0)
  const resolveRef = useRef<((r: Recording | null) => void) | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    void audioCtxRef.current?.close().catch(() => {})
    audioCtxRef.current = null
    recorderRef.current = null
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setState('unsupported')
      return false
    }
    const chosen = pickMimeType()
    if (!chosen) { setState('unsupported'); return false }

    setState('requesting')
    let stream: MediaStream
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      })
    } catch {
      setState('denied')
      return false
    }

    streamRef.current = stream
    peakRef.current = 0
    startedRef.current = Date.now()

    // Track peak amplitude so silence can be reported as silence.
    try {
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const source = ctx.createMediaStreamSource(stream)
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 1024
      source.connect(analyser)
      const buf = new Float32Array(analyser.fftSize)
      const sample = () => {
        if (!audioCtxRef.current) return
        analyser.getFloatTimeDomainData(buf)
        let peak = 0
        for (const v of buf) peak = Math.max(peak, Math.abs(v))
        peakRef.current = Math.max(peakRef.current, peak)
        requestAnimationFrame(sample)
      }
      requestAnimationFrame(sample)
    } catch {
      // Metering is a nicety; recording still works without it.
    }

    const chunks: BlobPart[] = []
    const recorder = new MediaRecorder(stream, { mimeType: chosen.mimeType, audioBitsPerSecond: 32000 })
    recorderRef.current = recorder
    recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data) }
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: chosen.mimeType })
      const durationMs = Date.now() - startedRef.current
      cleanup()
      setState('idle')
      resolveRef.current?.({ blob, filename: `attempt.${chosen.ext}`, rmsPeak: peakRef.current, durationMs })
      resolveRef.current = null
    }

    recorder.start()
    setState('recording')
    timerRef.current = setTimeout(() => { if (recorder.state === 'recording') recorder.stop() }, MAX_MS)
    return true
  }, [cleanup])

  const stop = useCallback((): Promise<Recording | null> => {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return Promise.resolve(null)
    setState('processing')
    return new Promise<Recording | null>((resolve) => {
      resolveRef.current = resolve
      recorder.stop()
    })
  }, [])

  const cancel = useCallback(() => {
    resolveRef.current?.(null)
    resolveRef.current = null
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
    cleanup()
    setState('idle')
  }, [cleanup])

  return { state, start, stop, cancel, maxMs: MAX_MS }
}

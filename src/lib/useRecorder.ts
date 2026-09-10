'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { concatSamples, pcmToWav16k, PCM_WORKLET, TARGET_RATE } from './wav'

/**
 * Microphone capture for speaking practice.
 *
 * Records raw PCM off the audio graph rather than using MediaRecorder. Two
 * reasons, both found by testing against the live API:
 *
 *  1. Sarvam rejects the WebM container MediaRecorder produces in Chrome and
 *     Firefox ("Invalid file type: audio/webm;codecs=opus").
 *  2. Re-encoding it isn't an option either -- decodeAudioData throws
 *     EncodingError on a MediaRecorder blob, because Chrome writes WebM with no
 *     duration in the header.
 *
 * Capturing PCM sidesteps both, and gives the same code path on every browser
 * including Safari, whose MP4/AAC output Sarvam would also refuse.
 *
 * Recordings are capped at 8 seconds: Sarvam bills by the second.
 */

export interface Recording {
  blob: Blob
  filename: string
  /** 0..1 peak amplitude, so the scorer can tell a muted mic from a wrong
   *  answer instead of telling someone they mispronounced silence. */
  rmsPeak: number
  durationMs: number
}

export type RecorderState = 'idle' | 'requesting' | 'recording' | 'processing' | 'denied' | 'unsupported'

const MAX_MS = 8000

/**
 * Capture at the hardware's native rate and resample afterwards, rather than
 * asking for a 16 kHz context up front.
 *
 * Requesting a rate that differs from the incoming stream's has historically
 * made createMediaStreamSource yield silence in Chrome, and silence is
 * indistinguishable from a broken microphone at the point where it matters.
 * Resampling with OfflineAudioContext afterwards is deterministic and costs
 * almost nothing for a recording of a few seconds.
 */
function makeContext(): AudioContext {
  return new AudioContext()
}

/**
 * @param onRecording called when a recording completes, whether the learner
 * stopped it or the 8-second cap did. Without this the capped path would finish
 * a recording that nothing consumed.
 */
export function useRecorder(onRecording?: (recording: Recording) => void) {
  const [state, setState] = useState<RecorderState>('idle')
  const streamRef = useRef<MediaStream | null>(null)
  const ctxRef = useRef<AudioContext | null>(null)
  const disconnectRef = useRef<(() => void) | null>(null)
  const chunksRef = useRef<Float32Array[]>([])
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppingRef = useRef(false)

  const teardown = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    disconnectRef.current?.()
    disconnectRef.current = null
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    const ctx = ctxRef.current
    ctxRef.current = null
    void ctx?.close().catch(() => {})
  }, [])

  // Held in a ref and updated in an effect so `finish` doesn't need to be
  // rebuilt (and the 8s timer re-armed) every time the caller re-renders.
  const callbackRef = useRef(onRecording)
  useEffect(() => { callbackRef.current = onRecording }, [onRecording])

  const finish = useCallback(async (): Promise<Recording | null> => {
    const rate = ctxRef.current?.sampleRate ?? TARGET_RATE
    const samples = concatSamples(chunksRef.current)
    chunksRef.current = []
    teardown()

    // Report an empty capture through the same path as a real one. The caller
    // can then say "we didn't hear you" without spending a paid API call on
    // audio we already know is silent.
    const { blob, peak, durationMs } = await pcmToWav16k(samples, rate)
    const recording: Recording = { blob, filename: 'attempt.wav', rmsPeak: peak, durationMs }
    setState('idle')
    callbackRef.current?.(recording)
    return recording
  }, [teardown])

  const start = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof AudioContext === 'undefined') {
      setState('unsupported')
      return false
    }

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
    chunksRef.current = []
    stoppingRef.current = false

    const ctx = makeContext()
    ctxRef.current = ctx
    // Some browsers start an AudioContext suspended until a gesture.
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {})

    const source = ctx.createMediaStreamSource(stream)
    // A silent sink keeps the graph pulling without routing the microphone back
    // out of the speakers.
    const silence = ctx.createGain()
    silence.gain.value = 0

    const push = (frame: Float32Array) => {
      if (!stoppingRef.current) chunksRef.current.push(frame)
    }

    try {
      const url = URL.createObjectURL(new Blob([PCM_WORKLET], { type: 'application/javascript' }))
      try {
        await ctx.audioWorklet.addModule(url)
      } finally {
        URL.revokeObjectURL(url)
      }
      const node = new AudioWorkletNode(ctx, 'pcm-recorder')
      node.port.onmessage = (e: MessageEvent<Float32Array>) => push(e.data)
      source.connect(node)
      node.connect(silence)
      silence.connect(ctx.destination)
      disconnectRef.current = () => {
        node.port.onmessage = null
        node.disconnect(); source.disconnect(); silence.disconnect()
      }
    } catch {
      // AudioWorklet unavailable (older Safari, or a blocked blob URL).
      // ScriptProcessor is deprecated but universally supported.
      const node = ctx.createScriptProcessor(4096, 1, 1)
      node.onaudioprocess = (e) => push(new Float32Array(e.inputBuffer.getChannelData(0)))
      source.connect(node)
      node.connect(silence)
      silence.connect(ctx.destination)
      disconnectRef.current = () => {
        node.onaudioprocess = null
        node.disconnect(); source.disconnect(); silence.disconnect()
      }
    }

    setState('recording')
    return true
  }, [])

  const stop = useCallback(async (): Promise<Recording | null> => {
    if (!ctxRef.current || stoppingRef.current) return null
    stoppingRef.current = true
    setState('processing')
    return finish()
  }, [finish])

  const cancel = useCallback(() => {
    stoppingRef.current = true
    chunksRef.current = []
    teardown()
    setState('idle')
  }, [teardown])

  // The 8s cap has to live where `stop` is in scope.
  const startCapped = useCallback(async (): Promise<boolean> => {
    const ok = await start()
    if (ok) timerRef.current = setTimeout(() => { void stop() }, MAX_MS)
    return ok
  }, [start, stop])

  return { state, start: startCapped, stop, cancel, maxMs: MAX_MS }
}

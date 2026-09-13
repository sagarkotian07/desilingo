/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAudio } from '@/lib/useAudio'

/**
 * Regression test for the replay loop.
 *
 * useAudio used to return a fresh object literal on every render. Consumers
 * autoplay in an effect that depended on that object, so: clip ends -> state
 * changes -> new object identity -> effect re-runs -> clip plays again, forever.
 * A learner heard the phrase on repeat until they left the exercise.
 */

class FakeAudio {
  static instances: FakeAudio[] = []
  src: string
  paused = false
  private listeners: Record<string, Array<() => void>> = {}
  constructor(src: string) {
    this.src = src
    FakeAudio.instances.push(this)
  }
  addEventListener(type: string, fn: () => void) {
    ;(this.listeners[type] ??= []).push(fn)
  }
  dispatch(type: string) {
    for (const fn of this.listeners[type] ?? []) fn()
  }
  play() { return Promise.resolve() }
  pause() { this.paused = true }
}

beforeEach(() => {
  FakeAudio.instances = []
  vi.stubGlobal('Audio', FakeAudio as unknown as typeof Audio)
})
afterEach(() => vi.unstubAllGlobals())

describe('useAudio', () => {
  it('returns a referentially stable object across re-renders', () => {
    const { result, rerender } = renderHook(() => useAudio('hi'))
    const first = result.current
    rerender()
    rerender()
    expect(result.current).toBe(first)
  })

  it('keeps the play callback stable, so effects that depend on it do not re-fire', () => {
    const { result, rerender } = renderHook(() => useAudio('hi'))
    const firstPlay = result.current.play
    rerender()
    expect(result.current.play).toBe(firstPlay)
  })

  it('does not replay when a clip finishes', async () => {
    const { result } = renderHook(() => useAudio('hi'))

    // "नहीं" has a generated clip in every build.
    await act(async () => { await result.current.play('नहीं') })
    const afterFirstPlay = FakeAudio.instances.length
    expect(afterFirstPlay).toBe(1)

    // Ending the clip changes state; nothing should start a second one.
    await act(async () => { FakeAudio.instances[0].dispatch('ended') })
    expect(FakeAudio.instances.length).toBe(afterFirstPlay)
  })

  it('ignores phrases with no generated clip instead of constructing audio', async () => {
    const { result } = renderHook(() => useAudio('hi'))
    await act(async () => { await result.current.play('a phrase we never generated') })
    expect(FakeAudio.instances).toHaveLength(0)
  })
})

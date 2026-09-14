/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSeason, setSeasonPref } from '@/lib/useSeason'
import { GROUND, SEASON_BOOTSTRAP, SEASON_KEY } from '@/lib/season'

/** jsdom has no matchMedia. This one answers only the dark-scheme query. */
function stubSystem(dark: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: dark && query === '(prefers-color-scheme: dark)',
    addEventListener() {},
    removeEventListener() {},
  }))
}

const metaColors = () =>
  Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]'), (m) => m.content)

beforeEach(() => {
  stubSystem(true)
  // What Next renders from the viewport export in the root layout.
  document.head.innerHTML =
    `<meta name="theme-color" content="${GROUND.spring}" media="(prefers-color-scheme: light)">` +
    `<meta name="theme-color" content="${GROUND.winter}" media="(prefers-color-scheme: dark)">`
  setSeasonPref('system')
})
afterEach(() => vi.unstubAllGlobals())

describe('useSeason', () => {
  it('follows the OS until asked otherwise: dark OS, winter', () => {
    const { result } = renderHook(() => useSeason())
    expect(result.current.season).toBe('winter')
    expect(document.documentElement.hasAttribute('data-season')).toBe(false)
    expect(localStorage.getItem(SEASON_KEY)).toBeNull()
  })

  it('toggling pins the season the OS is not showing', () => {
    const { result } = renderHook(() => useSeason())
    act(() => result.current.toggle())
    expect(result.current.season).toBe('spring')
    expect(document.documentElement.getAttribute('data-season')).toBe('spring')
    expect(localStorage.getItem(SEASON_KEY)).toBe('spring')
    // The browser chrome must agree with the page, whatever the OS says.
    expect(metaColors()).toEqual([GROUND.spring, GROUND.spring])
  })

  it('toggling back to what the OS shows returns to following it', () => {
    const { result } = renderHook(() => useSeason())
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    expect(result.current.season).toBe('winter')
    expect(document.documentElement.hasAttribute('data-season')).toBe(false)
    expect(localStorage.getItem(SEASON_KEY)).toBeNull()
    expect(metaColors()).toEqual([GROUND.spring, GROUND.winter])
  })

  it('a pinned season wins over the OS', () => {
    stubSystem(false)
    setSeasonPref('winter')
    const { result } = renderHook(() => useSeason())
    expect(result.current.season).toBe('winter')
    expect(metaColors()).toEqual([GROUND.winter, GROUND.winter])
  })
})

describe('SEASON_BOOTSTRAP', () => {
  it('applies a saved pick before React runs', () => {
    localStorage.setItem(SEASON_KEY, 'spring')
    new Function(SEASON_BOOTSTRAP)()
    expect(document.documentElement.getAttribute('data-season')).toBe('spring')
  })

  it('ignores anything that is not a season', () => {
    localStorage.setItem(SEASON_KEY, 'monsoon')
    new Function(SEASON_BOOTSTRAP)()
    expect(document.documentElement.hasAttribute('data-season')).toBe(false)
  })
})

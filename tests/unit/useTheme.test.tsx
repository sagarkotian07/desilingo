/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme, setThemePref } from '@/lib/useTheme'
import { GROUND, THEME_BOOTSTRAP, THEME_KEY } from '@/lib/theme'

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
    `<meta name="theme-color" content="${GROUND.light}" media="(prefers-color-scheme: light)">` +
    `<meta name="theme-color" content="${GROUND.dark}" media="(prefers-color-scheme: dark)">`
  setThemePref('system')
})
afterEach(() => vi.unstubAllGlobals())

describe('useTheme', () => {
  it('follows the OS until asked otherwise', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
  })

  it('toggling pins the theme the OS is not showing', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(localStorage.getItem(THEME_KEY)).toBe('light')
    // The browser chrome must agree with the page, whatever the OS says.
    expect(metaColors()).toEqual([GROUND.light, GROUND.light])
  })

  it('toggling back to what the OS shows returns to following it', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    act(() => result.current.toggle())
    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
    expect(localStorage.getItem(THEME_KEY)).toBeNull()
    expect(metaColors()).toEqual([GROUND.light, GROUND.dark])
  })

  it('a pinned theme wins over the OS', () => {
    stubSystem(false)
    setThemePref('dark')
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme).toBe('dark')
    expect(metaColors()).toEqual([GROUND.dark, GROUND.dark])
  })
})

describe('THEME_BOOTSTRAP', () => {
  it('applies a saved pick before React runs', () => {
    localStorage.setItem(THEME_KEY, 'light')
    new Function(THEME_BOOTSTRAP)()
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
  })

  it('ignores anything that is not a theme', () => {
    localStorage.setItem(THEME_KEY, 'sepia')
    new Function(THEME_BOOTSTRAP)()
    expect(document.documentElement.hasAttribute('data-theme')).toBe(false)
  })
})

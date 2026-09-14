/**
 * Theme constants shared by the server layout and the client store. Plain
 * module on purpose: a `'use client'` file's exports turn into references
 * when a server component imports them.
 */

export type Theme = 'light' | 'dark'
/** What the user picked. 'system' means follow the OS, which is the default. */
export type ThemePref = Theme | 'system'

export const THEME_KEY = 'desilingo:theme'

/** The page ground in each theme, doubling as the browser-chrome colour on
 *  phones. Keep in step with --ground in globals.css. */
export const GROUND: Record<Theme, string> = { light: '#faf6ef', dark: '#121019' }

/**
 * Runs before React hydrates so a pinned theme never flashes the other one.
 * Inlined into <head>; kept tiny and failure-tolerant because it is blocking.
 */
export const THEME_BOOTSTRAP = `try{var t=localStorage.getItem('${THEME_KEY}');if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)}catch(e){}`

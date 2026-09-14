/**
 * Season constants shared by the server layout and the client store. Plain
 * module on purpose: a `'use client'` file's exports turn into references
 * when a server component imports them, and a reference is not a string.
 */

/** Spring is the light palette, winter the dark one. */
export type Season = 'spring' | 'winter'
/** What the user picked. 'system' means follow the OS, which is the default. */
export type SeasonPref = Season | 'system'

export const SEASON_KEY = 'desilingo:season'

/** The page ground in each season, doubling as the browser-chrome colour on
 *  phones. Keep in step with --ground in globals.css. */
export const GROUND: Record<Season, string> = { spring: '#fcf3f1', winter: '#0b1424' }

/**
 * Runs before React hydrates so a pinned season never flashes the other one.
 * Inlined into <head>; kept tiny and failure-tolerant because it is blocking.
 */
export const SEASON_BOOTSTRAP = `try{var t=localStorage.getItem('${SEASON_KEY}');if(t==='spring'||t==='winter')document.documentElement.setAttribute('data-season',t)}catch(e){}`

/**
 * Text-size constants shared by the server layout and the client store. Plain
 * module on purpose: a `'use client'` file's exports turn into references
 * when a server component imports them, and a reference is not a string.
 */

export type FontSize = 'normal' | 'large'

export const FONT_SIZE_KEY = 'desilingo:font-size'

/**
 * Runs before React hydrates so the page never flashes at the wrong size.
 * Inlined into <head>; kept tiny and failure-tolerant because it is blocking.
 */
export const FONT_SIZE_BOOTSTRAP = `try{var s=localStorage.getItem('${FONT_SIZE_KEY}');if(s==='large')document.documentElement.setAttribute('data-fontsize','large')}catch(e){}`

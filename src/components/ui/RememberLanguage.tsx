'use client'

import { useEffect } from 'react'
import type { LangCode } from '@/lib/languages'
import { rememberLanguage } from '@/lib/useLanguagePref'

/** Records the language on any entry into a course, so the picker can offer to
 *  resume rather than asking again. Renders nothing. */
export function RememberLanguage({ lang }: { lang: LangCode }) {
  useEffect(() => { rememberLanguage(lang) }, [lang])
  return null
}

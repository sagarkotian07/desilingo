import type { CSSProperties, ReactNode } from 'react'
import type { LangCode } from '@/lib/languages'

const CLASS: Record<LangCode, string> = {
  hi: 'script', mr: 'script',
  kn: 'script script-kn', ta: 'script script-ta',
  te: 'script script-te', bn: 'script script-bn',
}

export function scriptClass(lang: LangCode): string {
  return CLASS[lang]
}

/** Native-script text with the right font and `lang` attribute. */
export function Script({
  lang, children, className = '', style, ...rest
}: { lang: LangCode; children: ReactNode; className?: string; style?: CSSProperties } & Record<string, unknown>) {
  return (
    <span lang={lang} className={`${scriptClass(lang)} ${className}`} style={style} {...rest}>
      {children}
    </span>
  )
}

import type { LangCode } from '@/lib/languages'

const CLASS: Record<LangCode, string> = {
  hi: 'script', mr: 'script',
  kn: 'script script-kn', ta: 'script script-ta',
  te: 'script script-te', bn: 'script script-bn',
}

export function scriptClass(lang: LangCode): string {
  return CLASS[lang]
}

/** Native-script text with the right font and `lang` attribute, so screen
 *  readers and the browser's own text handling get it right. */
export function Script({
  lang, children, className = '',
}: { lang: LangCode; children: React.ReactNode; className?: string }) {
  return <span lang={lang} className={`${scriptClass(lang)} ${className}`}>{children}</span>
}

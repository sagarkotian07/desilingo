import { notFound } from 'next/navigation'
import { isLangCode, LANGUAGES, LANGUAGE_CONFIG } from '@/lib/languages'
import { hasCourse } from '@/content'
import { RememberLanguage } from '@/components/ui/RememberLanguage'

export function generateStaticParams() {
  return LANGUAGES.filter(hasCourse).map((lang) => ({ lang }))
}

export default async function LangLayout({ children, params }: LayoutProps<'/[lang]'>) {
  const { lang } = await params
  if (!isLangCode(lang) || !hasCourse(lang)) notFound()
  const [light, dark] = LANGUAGE_CONFIG[lang].accent

  return (
    <div className="flex min-h-full flex-1 flex-col">
      {/* The course colour. globals.css resolves --accent from these per theme. */}
      <style>{`:root{--accent-light:${light};--accent-dark:${dark}}`}</style>
      <RememberLanguage lang={lang} />
      {children}
    </div>
  )
}

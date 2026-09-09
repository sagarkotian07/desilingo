import { notFound } from 'next/navigation'
import { isLangCode, LANGUAGES } from '@/lib/languages'
import { hasCourse } from '@/content'

export function generateStaticParams() {
  return LANGUAGES.filter(hasCourse).map((lang) => ({ lang }))
}

export default async function LangLayout({ children, params }: LayoutProps<'/[lang]'>) {
  // params is a promise in Next 16.
  const { lang } = await params
  if (!isLangCode(lang) || !hasCourse(lang)) notFound()
  return <>{children}</>
}

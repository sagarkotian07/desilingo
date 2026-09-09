import { notFound } from 'next/navigation'
import { isLangCode, LANGUAGE_CONFIG } from '@/lib/languages'
import { Header } from '@/components/ui/Header'
import { Phrasebook } from './Phrasebook'

export default async function PhrasebookPage({ params }: PageProps<'/[lang]/phrasebook'>) {
  const { lang } = await params
  if (!isLangCode(lang)) notFound()
  return (
    <>
      <Header lang={lang} back={{ href: `/${lang}`, label: 'Home' }} />
      <Phrasebook lang={lang} languageName={LANGUAGE_CONFIG[lang].englishName} />
    </>
  )
}

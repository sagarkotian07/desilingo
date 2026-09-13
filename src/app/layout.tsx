import type { Metadata } from 'next'
import {
  Nunito,
  Noto_Sans_Devanagari, Noto_Sans_Kannada, Noto_Sans_Tamil,
  Noto_Sans_Telugu, Noto_Sans_Bengali,
} from 'next/font/google'
import './globals.css'

const ui = Nunito({ variable: '--font-ui', subsets: ['latin'], display: 'swap' })
const deva = Noto_Sans_Devanagari({ variable: '--font-deva', subsets: ['devanagari'], display: 'swap' })
const knda = Noto_Sans_Kannada({ variable: '--font-knda', subsets: ['kannada'], display: 'swap' })
const taml = Noto_Sans_Tamil({ variable: '--font-taml', subsets: ['tamil'], display: 'swap' })
const telu = Noto_Sans_Telugu({ variable: '--font-telu', subsets: ['telugu'], display: 'swap' })
const beng = Noto_Sans_Bengali({ variable: '--font-beng', subsets: ['bengali'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Desilingo — learn India\'s languages by ear',
  description:
    'Short, voice-first lessons in Hindi, Kannada, Tamil, Telugu, Bengali and Marathi. ' +
    'Real spoken phrases, native voices, and pronunciation practice that actually listens.',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      className={`${ui.variable} ${deva.variable} ${knda.variable} ${taml.variable} ${telu.variable} ${beng.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  )
}

import type { Metadata } from 'next'
import {
  Nunito,
  Noto_Sans_Devanagari, Noto_Sans_Kannada, Noto_Sans_Tamil,
  Noto_Sans_Telugu, Noto_Sans_Bengali,
} from 'next/font/google'
import './globals.css'
import { FONT_SIZE_BOOTSTRAP } from '@/lib/useFontSize'

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
      <head>
        {/* Applies the saved text size before first paint, so the page never
            flashes at the wrong size on load. */}
        <script dangerouslySetInnerHTML={{ __html: FONT_SIZE_BOOTSTRAP }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  )
}

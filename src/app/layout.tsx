import type { Metadata, Viewport } from 'next'
import {
  Nunito, Outfit,
  Noto_Sans_Devanagari, Noto_Sans_Kannada, Noto_Sans_Tamil,
  Noto_Sans_Telugu, Noto_Sans_Bengali,
} from 'next/font/google'
import './globals.css'
import { FONT_SIZE_BOOTSTRAP } from '@/lib/useFontSize'

const ui = Nunito({ variable: '--font-ui', subsets: ['latin'], display: 'swap' })
const display = Outfit({ variable: '--font-display', subsets: ['latin'], display: 'swap' })
const deva = Noto_Sans_Devanagari({ variable: '--font-deva', subsets: ['devanagari'], display: 'swap' })
const knda = Noto_Sans_Kannada({ variable: '--font-knda', subsets: ['kannada'], display: 'swap' })
const taml = Noto_Sans_Tamil({ variable: '--font-taml', subsets: ['tamil'], display: 'swap' })
const telu = Noto_Sans_Telugu({ variable: '--font-telu', subsets: ['telugu'], display: 'swap' })
const beng = Noto_Sans_Bengali({ variable: '--font-beng', subsets: ['bengali'], display: 'swap' })

export const metadata: Metadata = {
  title: 'Desilingo',
  description: 'Learn India\'s languages by ear.',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Draw into the notch area so env(safe-area-inset-*) reports real values --
  // the fixed answer bar reserves space with them.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#faf6ef' },
    { media: '(prefers-color-scheme: dark)', color: '#121019' },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      // The bootstrap script below sets data-fontsize before React hydrates, so
      // the server HTML deliberately differs from the client on this element.
      suppressHydrationWarning
      className={`${ui.variable} ${display.variable} ${deva.variable} ${knda.variable} ${taml.variable} ${telu.variable} ${beng.variable} h-full antialiased`}
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

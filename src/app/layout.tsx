import type { Metadata, Viewport } from 'next'
import {
  Nunito, Outfit,
  Noto_Sans_Devanagari, Noto_Sans_Kannada, Noto_Sans_Tamil,
  Noto_Sans_Telugu, Noto_Sans_Bengali,
} from 'next/font/google'
import './globals.css'
import { FONT_SIZE_BOOTSTRAP } from '@/lib/font-size'
import { GROUND, SEASON_BOOTSTRAP } from '@/lib/season'
import { SeasonBackdrop } from '@/components/ui/SeasonBackdrop'
import { SeasonToggle } from '@/components/ui/SeasonToggle'

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
  // The season store rewrites both of these when the user pins a season.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: GROUND.spring },
    { media: '(prefers-color-scheme: dark)', color: GROUND.winter },
  ],
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="en"
      // The bootstrap script below sets data-fontsize and data-season before
      // React hydrates, so the server HTML deliberately differs from the
      // client on this element.
      suppressHydrationWarning
      className={`${ui.variable} ${display.variable} ${deva.variable} ${knda.variable} ${taml.variable} ${telu.variable} ${beng.variable} h-full antialiased`}
    >
      <head>
        {/* Applies the saved text size and season before first paint, so the
            page never flashes at the wrong size or colour on load. */}
        <script dangerouslySetInnerHTML={{ __html: FONT_SIZE_BOOTSTRAP + SEASON_BOOTSTRAP }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <SeasonBackdrop />
        {children}
        <SeasonToggle />
      </body>
    </html>
  )
}

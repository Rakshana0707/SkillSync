import type { Metadata } from 'next'
import { Playfair_Display, Manrope, IBM_Plex_Mono } from 'next/font/google'
import './globals.css'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  weight: ['700', '900'],
  style: ['normal', 'italic'],
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['300', '400', '500', '600'],
})

const ibmMono = IBM_Plex_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  weight: ['400', '500'],
})

export const metadata: Metadata = {
  title: 'SkillSync — Join the Arena',
  description: 'AI-Powered Assessment Platform. Prove your skill. Win.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body
        className={`${playfair.variable} ${manrope.variable} ${ibmMono.variable}`}
        style={{ fontFamily: 'var(--font-manrope), sans-serif' }}
      >
        {children}
      </body>
    </html>
  )
}

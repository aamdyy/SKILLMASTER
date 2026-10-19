import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { MotionProvider } from '@/components/motion/MotionProvider'
import { display } from '@/lib/fonts'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'skillmaster — les bons skills Claude Code', template: '%s · skillmaster' },
  description: 'Bibliothèque de skills Claude Code triée par type de projet, notée et mise à jour chaque lundi.',
}

export const viewport: Viewport = { themeColor: '#030504', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable} ${display.variable}`}>
      <head>
        {/* Sans JavaScript, les éléments qui apparaissent au scroll restent visibles. */}
        <noscript>
          <style>{`[style*="opacity:0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="relative flex flex-col overflow-x-clip">
        {/* Fond vert profond vers noir avec grille fine, en haut de chaque page. */}
        <div aria-hidden className="hero-backdrop pointer-events-none absolute inset-x-0 top-0 -z-10 h-[1100px]">
          <div className="hero-grid absolute inset-0" />
        </div>
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-accent-ink">
          Aller au contenu
        </a>
        <MotionProvider>
          <Header />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <Footer />
        </MotionProvider>
      </body>
    </html>
  )
}

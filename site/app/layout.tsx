import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Footer } from '@/components/Footer'
import { Header } from '@/components/Header'
import { MotionProvider } from '@/components/motion/MotionProvider'
import './globals.css'

export const metadata: Metadata = {
  title: { default: 'skillmaster — les bons skills Claude Code', template: '%s · skillmaster' },
  description: 'Bibliothèque de skills Claude Code triée par type de projet, notée et mise à jour chaque lundi.',
}

export const viewport: Viewport = { themeColor: '#070707', colorScheme: 'dark' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <head>
        {/* Sans JavaScript, les éléments qui apparaissent au scroll restent visibles. */}
        <noscript>
          <style>{`[style*="opacity:0"]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="relative flex flex-col overflow-x-clip">
        {/* Plan de fond : lueur en haut, et les deux filets verticaux de la colonne centrale. */}
        <div aria-hidden className="top-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-1/2 -z-10 hidden w-full max-w-[1080px] -translate-x-1/2 border-x border-line md:block" />
        <a href="#contenu" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-fg focus:px-4 focus:py-2 focus:text-bg">
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

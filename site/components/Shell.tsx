import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { ReactNode } from 'react'
import '@/app/globals.css'
import type { Lang } from '@/lib/lang'
import { Footer } from './Footer'
import { Header } from './Header'
import { MotionProvider } from './motion/MotionProvider'

// Document commun aux deux langues : chaque groupe de routes (fr, en) a son layout racine, qui fixe
// <html lang> et passe la langue à l'en-tête et au pied de page.
export function Shell({ lang, children }: { lang: Lang; children: ReactNode }) {
  return (
    <html lang={lang} className={`${GeistSans.variable} ${GeistMono.variable}`}>
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
          {lang === 'en' ? 'Skip to content' : 'Aller au contenu'}
        </a>
        <MotionProvider>
          <Header lang={lang} />
          <main id="contenu" className="flex-1">
            {children}
          </main>
          <Footer lang={lang} />
        </MotionProvider>
      </body>
    </html>
  )
}

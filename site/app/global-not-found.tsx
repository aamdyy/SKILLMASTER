import { GeistMono } from 'geist/font/mono'
import { GeistSans } from 'geist/font/sans'
import type { Metadata } from 'next'
import './globals.css'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Frame } from '@/components/Frame'
import { Label } from '@/components/Label'
import { Logo } from '@/components/Logo'
import { href } from '@/lib/lang'

// Page 404 de tout le site. Chaque langue a son layout racine : celle-ci ne dépend d'aucun des deux,
// elle parle donc les deux langues (le français d'abord, l'anglais en dessous).
export const metadata: Metadata = { title: 'Page introuvable · Page not found · skillmaster' }

export default function GlobalNotFound() {
  return (
    <html lang="fr" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="relative flex min-h-dvh flex-col overflow-x-clip">
        <div aria-hidden className="top-glow pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px]" />
        <header className="border-b border-line">
          <Container className="flex h-14 items-center md:h-16">
            <Logo lang="fr" />
          </Container>
        </header>
        <main className="flex flex-1 items-center">
          <Container className="flex justify-center py-20 md:py-28">
            <Frame legend="erreur 404 · error 404" className="w-full max-w-xl bg-panel/50 p-8 pt-9 text-center md:p-12">
              <div className="flex flex-col items-center gap-6">
                <Label as="span">Introuvable</Label>
                <h1 className="text-balance text-[2.25rem] leading-[1.05] tracking-[-0.03em] md:text-[3rem]">Cette page n’existe pas.</h1>
                <p className="max-w-sm text-[15px] leading-relaxed text-muted">Le skill a peut-être changé d’adresse, ou il a quitté la bibliothèque. Cherche-le par son nom.</p>
                <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                  <Button href={href.skills('fr')}>Chercher un skill</Button>
                  <Button href={href.home('fr')} variant="secondary" icon="←">
                    Accueil
                  </Button>
                </div>
                <div lang="en" className="mt-4 flex w-full flex-col items-center gap-4 border-t border-line pt-8">
                  <p className="text-[15px] leading-relaxed text-muted">This page does not exist. The skill may have moved, or left the library.</p>
                  <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
                    <Button href={href.skills('en')} variant="secondary" lang="en">
                      Search for a skill
                    </Button>
                    <Button href={href.home('en')} variant="secondary" icon="←" lang="en">
                      Home
                    </Button>
                  </div>
                </div>
              </div>
            </Frame>
          </Container>
        </main>
      </body>
    </html>
  )
}

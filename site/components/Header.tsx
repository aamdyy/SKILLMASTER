import Link from 'next/link'
import { href, type Lang } from '@/lib/lang'
import { Button } from './Button'
import { Container } from './Container'
import { LangSwitch } from './LangSwitch'
import { Logo } from './Logo'

const NAV: Record<Lang, { href: string; label: string }[]> = {
  fr: [
    { href: href.packs('fr'), label: 'Packs' },
    { href: href.skills('fr'), label: 'Skills' },
    { href: href.changes('fr'), label: 'Changements' },
    { href: href.install('fr'), label: 'Installation' },
  ],
  en: [
    { href: href.packs('en'), label: 'Packs' },
    { href: href.skills('en'), label: 'Skills' },
    { href: href.changes('en'), label: 'Changes' },
    { href: href.install('en'), label: 'Install' },
  ],
}

// En-tête : logo, séparateur, navigation en majuscules mono ; langue et bouton de recherche à droite.
// Mobile : logo, langue et bouton sur une ligne, navigation en dessous (elle défile si elle déborde).
export function Header({ lang }: { lang: Lang }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <Container className="flex flex-wrap items-center justify-between gap-x-5 py-1.5 md:h-16 md:flex-nowrap md:py-0">
        <div className="flex items-center gap-5">
          <Logo lang={lang} />
          <span aria-hidden className="hidden h-5 w-px bg-line-strong md:block" />
        </div>
        <nav aria-label={lang === 'en' ? 'Main navigation' : 'Navigation principale'} className="order-last -mx-3 flex w-[calc(100%+1.5rem)] overflow-x-auto md:order-none md:mx-0 md:mr-auto md:w-auto">
          {NAV[lang].map(item => (
            <Link key={item.href} href={item.href} className="flex h-11 shrink-0 items-center px-3 font-mono text-[12.5px] uppercase tracking-[0.06em] text-fg/75 transition-colors duration-150 hover:text-fg">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <LangSwitch lang={lang} />
          <Button href={href.skills(lang)} variant="secondary" className="h-10" lang={lang}>
            {lang === 'en' ? 'Search' : 'Chercher'}
          </Button>
        </div>
      </Container>
    </header>
  )
}

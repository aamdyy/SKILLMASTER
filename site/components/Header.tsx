import Link from 'next/link'
import { Button } from './Button'
import { Container } from './Container'
import { Logo } from './Logo'

const NAV = [
  { href: '/#packs', label: 'Packs' },
  { href: '/skills/', label: 'Skills' },
  { href: '/changements/', label: 'Changements' },
]

// En-tête : logo, séparateur, navigation en majuscules mono ; bouton de recherche à droite.
// Mobile : logo et bouton sur une ligne, navigation en dessous.
export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg">
      <Container className="flex flex-wrap items-center justify-between gap-x-5 py-1.5 md:h-16 md:flex-nowrap md:py-0">
        <div className="flex items-center gap-5">
          <Logo />
          <span aria-hidden className="hidden h-5 w-px bg-line-strong md:block" />
        </div>
        <nav aria-label="Navigation principale" className="order-last -mx-3 flex w-full md:order-none md:mx-0 md:mr-auto md:w-auto">
          {NAV.map(item => (
            <Link key={item.href} href={item.href} className="flex h-11 items-center px-3 font-mono text-[12.5px] uppercase tracking-[0.06em] text-fg/75 transition-colors duration-150 hover:text-fg">
              {item.label}
            </Link>
          ))}
        </nav>
        <Button href="/skills/" variant="secondary" className="h-10">
          Chercher
        </Button>
      </Container>
    </header>
  )
}

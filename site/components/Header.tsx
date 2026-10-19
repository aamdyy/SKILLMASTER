import Link from 'next/link'
import { Container } from './Container'
import { Logo } from './Logo'
import { PillLink } from './PillLink'

const NAV = [
  { href: '/#packs', label: 'Packs' },
  { href: '/skills/', label: 'Skills' },
  { href: '/changements/', label: 'Changements' },
]

// En-tête transparent posé sur le fond dégradé. Mobile : logo, puis navigation en dessous.
export function Header() {
  return (
    <header className="relative z-40">
      <Container className="flex flex-wrap items-center justify-between gap-x-6 pt-3 sm:h-16 sm:flex-nowrap sm:pt-0">
        <Logo />
        <nav aria-label="Navigation principale" className="order-last -mx-3 flex w-full sm:order-none sm:mx-0 sm:w-auto">
          {NAV.map(item => (
            <Link key={item.href} href={item.href} className="flex h-11 items-center px-3 text-sm text-fg/75 transition-colors duration-150 hover:text-fg">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden sm:block">
          <PillLink href="/skills/" variant="outline" className="h-10">
            Chercher un skill
          </PillLink>
        </div>
      </Container>
    </header>
  )
}

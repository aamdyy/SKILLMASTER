import { formatDate } from '@/lib/format'
import type { Lang } from '@/lib/lang'
import { getDernierTour } from '@/lib/library'
import { Container } from './Container'

export function Footer({ lang }: { lang: Lang }) {
  const tour = getDernierTour()
  const le = formatDate(tour.le, lang)
  return (
    <footer className="relative">
      <div aria-hidden className="section-rule" />
      <Container className="flex flex-col gap-3 py-10 font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted md:flex-row md:items-center md:justify-between">
        <span className="inline-flex items-center gap-2 normal-case tracking-normal text-fg">
          <span aria-hidden className="size-2 bg-accent" />
          skillmaster
        </span>
        <span>{lang === 'en' ? `Library of ${le} · updated every Monday · read-only` : `Bibliothèque du ${le} · mise à jour chaque lundi · lecture seule`}</span>
      </Container>
    </footer>
  )
}

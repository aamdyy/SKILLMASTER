import { formatDate } from '@/lib/format'
import { getDernierTour } from '@/lib/library'
import { Container } from './Container'

export function Footer() {
  const tour = getDernierTour()
  return (
    <footer className="border-t border-line">
      <Container className="flex flex-col gap-2 py-10 font-mono text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex items-center gap-2 text-fg">
          <span aria-hidden className="size-2 bg-accent" />
          skillmaster
        </span>
        <span>Bibliothèque du {formatDate(tour.le)} · mise à jour automatique chaque lundi · site en lecture seule</span>
      </Container>
    </footer>
  )
}

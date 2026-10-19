import type { ReactNode } from 'react'
import { Container } from './Container'

// Section de page : un filet horizontal qui déborde de la colonne et s'efface aux extrémités.
export function Section({ children, className = '', id, labelledBy, label }: { children: ReactNode; className?: string; id?: string; labelledBy?: string; label?: string }) {
  return (
    <section id={id} aria-labelledby={labelledBy} aria-label={label} className="relative scroll-mt-24">
      <div aria-hidden className="section-rule" />
      <Container className={`py-20 md:py-28 ${className}`}>{children}</Container>
    </section>
  )
}

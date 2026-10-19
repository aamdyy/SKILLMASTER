import Link from 'next/link'
import type { ReactNode } from 'react'

// Bouton en pastille : vert plein pour l'action principale, blanc pour la secondaire,
// contour fin sur fond sombre. Texte foncé sur le vert, pour le contraste.
const VARIANTS = {
  primary: 'bg-accent text-accent-ink hover:brightness-110',
  secondary: 'bg-card text-ink hover:bg-card-soft',
  outline: 'border border-line-strong text-fg hover:border-fg/40',
}

export function PillLink({ href, children, variant = 'primary', className = '' }: { href: string; children: ReactNode; variant?: keyof typeof VARIANTS; className?: string }) {
  return (
    <Link
      href={href}
      className={`inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-medium transition-[filter,background-color,border-color,transform] duration-150 ease-out motion-safe:active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </Link>
  )
}

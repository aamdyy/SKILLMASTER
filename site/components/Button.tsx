import Link from 'next/link'
import type { ReactNode } from 'react'

// Bouton en majuscules mono : métal clair (principal) ou sombre (secondaire).
// `external` ouvre un site extérieur dans un nouvel onglet, annoncé aux lecteurs d'écran.
export function Button({ href, children, variant = 'primary', icon = '↗', external = false, className = '' }: { href: string; children: ReactNode; variant?: 'primary' | 'secondary'; icon?: '↗' | '↓' | '→' | '←' | null; external?: boolean; className?: string }) {
  const classes = `btn ${variant === 'primary' ? 'btn-primary' : 'btn-secondary'} ${className}`
  const content = (
    <>
      {icon === '←' && <span aria-hidden>{icon}</span>}
      {children}
      {icon && icon !== '←' && <span aria-hidden>{icon}</span>}
      {external && <span className="sr-only"> (nouvel onglet)</span>}
    </>
  )
  return external ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
      {content}
    </a>
  ) : (
    <Link href={href} className={classes}>
      {content}
    </Link>
  )
}

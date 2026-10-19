import Link from 'next/link'
import type { ReactNode } from 'react'

// Pastille d'info en haut du hero : point vert, texte mono en majuscules.
export function InfoPill({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-9 items-center gap-2.5 rounded-md border border-line-strong bg-panel-2 px-3 py-1.5 font-mono text-[11.5px] uppercase tracking-[0.06em] text-fg/85 transition-colors duration-150 hover:border-tick hover:text-fg"
    >
      <span aria-hidden className="size-1.5 rounded-full bg-accent" />
      {children}
    </Link>
  )
}

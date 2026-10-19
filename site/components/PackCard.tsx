import Link from 'next/link'
import type { Pack } from '@/lib/library'

// Carte blanche d'un pack : nom, taille, 3 premiers skills de la tête. Survol : légère élévation.
export function PackCard({ pack }: { pack: Pack }) {
  return (
    <Link
      href={`/packs/${pack.type}/`}
      className="group flex h-full min-h-60 flex-col gap-5 rounded-[28px] bg-card p-6 text-ink shadow-card transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1"
    >
      <div className="flex items-start justify-between gap-4">
        <h3 className="font-display text-2xl font-semibold italic tracking-[-0.02em]">{pack.label}</h3>
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-card-soft transition-colors duration-150 group-hover:bg-accent">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <p className="font-mono text-xs text-ink-muted tabular">
        {pack.recommandes.length} en tête · {pack.ajouts.length} ajouts
      </p>
      <ol className="mt-auto flex flex-col gap-1.5 font-mono text-[13px]">
        {pack.recommandes.slice(0, 3).map((skill, i) => (
          <li key={skill.id} className="flex min-w-0 gap-3">
            <span aria-hidden className="text-ink-muted/70 tabular">{String(i + 1).padStart(2, '0')}</span>
            <span className="truncate">{skill.nom}</span>
          </li>
        ))}
      </ol>
    </Link>
  )
}

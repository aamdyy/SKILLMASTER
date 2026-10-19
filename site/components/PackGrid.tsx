import Link from 'next/link'
import type { Pack } from '@/lib/library'
import { Reveal } from './motion/Reveal'

// Grille des packs à filets fins : chaque case donne le nom, la taille et les 3 premiers skills.
export function PackGrid({ packs, total }: { packs: Pack[]; total: string }) {
  return (
    <ul className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
      {packs.map((pack, i) => (
        <li key={pack.type} className="bg-bg">
          <Reveal index={i} className="h-full">
            <Link href={`/packs/${pack.type}/`} className="group flex h-full min-h-60 flex-col gap-5 p-6 transition-colors duration-200 hover:bg-panel">
              <div className="flex items-start justify-between gap-3 font-mono text-[11px] text-muted">
                <span className="tabular">P/{String(i + 1).padStart(2, '0')}</span>
                <span aria-hidden className="text-subtle transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg">↗</span>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="font-mono text-[15px] uppercase tracking-[0.06em] text-fg">{pack.label}</h3>
                <p className="text-sm text-muted tabular">
                  {pack.recommandes.length} en tête · {pack.ajouts.length} ajouts
                </p>
              </div>
              <ol className="mt-auto flex flex-col gap-1.5 border-t border-line pt-4 font-mono text-[12px]">
                {pack.recommandes.slice(0, 3).map((skill, rank) => (
                  <li key={skill.id} className="flex min-w-0 gap-3">
                    <span aria-hidden className="text-subtle tabular">{String(rank + 1).padStart(2, '0')}</span>
                    <span className="truncate text-fg/80">{skill.nom}</span>
                  </li>
                ))}
              </ol>
            </Link>
          </Reveal>
        </li>
      ))}
      <li className="bg-bg">
        <Reveal index={packs.length} className="h-full">
          <Link href="/skills/" className="group flex h-full min-h-40 flex-col justify-between gap-5 bg-panel p-6 sm:min-h-60 transition-colors duration-200 hover:bg-panel-2">
            <div className="flex items-start justify-between font-mono text-[11px] text-muted">
              <span>ALL</span>
              <span aria-hidden className="text-subtle transition-[color,transform] duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-fg">↗</span>
            </div>
            <div className="flex flex-col gap-2">
              <h3 className="font-mono text-[15px] uppercase tracking-[0.06em] text-fg">Toute la bibliothèque</h3>
              <p className="text-sm text-muted tabular">{total} skills, filtre par nom et par type</p>
            </div>
          </Link>
        </Reveal>
      </li>
    </ul>
  )
}

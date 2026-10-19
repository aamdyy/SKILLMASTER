import { formatDate } from '@/lib/format'
import { chiffresDuTour, labelOf, type Tour } from '@/lib/library'
import { Reveal } from './motion/Reveal'
import { PillLink } from './PillLink'

// « Cette semaine » : le dernier récapitulatif, lisible en 30 secondes.
// Une ligne de changement a la forme « sortant → entrant : raison ».
const parseChange = (line: string) => {
  const cut = line.indexOf(' : ')
  const [sortant, entrant] = (cut >= 0 ? line.slice(0, cut) : line).split(' → ')
  return { sortant: sortant ?? '', entrant: entrant ?? '', raison: cut >= 0 ? line.slice(cut + 3) : '' }
}

export function ThisWeek({ tour }: { tour: Tour }) {
  const chiffres = chiffresDuTour(tour)
  const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`
  const facts = [
    chiffres.tetes !== null && (chiffres.tetes ? plural(chiffres.tetes, 'pack change de tête', 'packs changent de tête') : 'aucune tête ne change'),
    chiffres.nouveaux !== null && plural(chiffres.nouveaux, 'nouveau skill', 'nouveaux skills'),
    chiffres.archives !== null && plural(chiffres.archives, 'skill archivé', 'skills archivés'),
  ].filter((fact): fact is string => !!fact)
  const changes = tour.sections.flatMap(section => section.lignes.map(line => ({ pack: section.pack, ...parseChange(line) })))
  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)] lg:gap-16">
      <div className="flex flex-col gap-4">
        <h2 className="font-display text-4xl font-semibold italic tracking-[-0.03em] md:text-5xl">Cette semaine</h2>
        <p className="font-mono text-xs text-muted">Tour du {formatDate(tour.date)}</p>
        <ul className="flex flex-col gap-1.5 font-mono text-[13px] text-muted tabular">
          {facts.map(fact => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <PillLink href="/changements/" variant="outline" className="mt-2 w-fit">
          Tous les changements <span aria-hidden>→</span>
        </PillLink>
      </div>
      <ul className="flex flex-col border-t border-line">
        {changes.map((change, i) => (
          <li key={`${change.pack}-${i}`} className="border-b border-line">
            <Reveal index={i} className="grid gap-2 py-5 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-6">
              <span className="inline-flex h-7 w-fit items-center rounded-full border border-line-strong px-3 font-mono text-[11px] text-fg/80">{labelOf(change.pack)}</span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="font-mono text-[13px]">
                  <span className="text-muted line-through decoration-muted/50">{change.sortant}</span>
                  <span aria-hidden className="px-2 text-subtle">→</span>
                  <span className="sr-only"> remplacé par </span>
                  <span className="text-fg">{change.entrant}</span>
                </p>
                <p className="line-clamp-2 text-sm leading-relaxed text-muted">{change.raison}</p>
              </div>
            </Reveal>
          </li>
        ))}
        {!changes.length && <li className="py-5 text-sm text-muted">Aucune tête de pack ne change cette semaine.</li>}
      </ul>
    </div>
  )
}

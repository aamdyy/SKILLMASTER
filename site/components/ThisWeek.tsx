import { formatDate, formatUsd } from '@/lib/format'
import { chiffresDuTour, labelOf, PACKS, type Tour } from '@/lib/library'
import { Button } from './Button'
import { Label } from './Label'
import { Reveal } from './motion/Reveal'

// Une ligne de changement a la forme « sortant → entrant : raison ».
export const parseChange = (line: string) => {
  const cut = line.indexOf(' : ')
  const [sortant, entrant] = (cut >= 0 ? line.slice(0, cut) : line).split(' → ')
  return { sortant: sortant ?? '', entrant: entrant ?? '', raison: cut >= 0 ? line.slice(cut + 3) : '' }
}
export const packLabel = (section: string) => (PACKS.some(pack => pack.type === section) ? labelOf(section) : section)

export function tourFacts(tour: Tour) {
  const chiffres = chiffresDuTour(tour)
  const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`
  return [
    chiffres.tetes !== null && (chiffres.tetes ? plural(chiffres.tetes, 'tête change', 'têtes changent') : 'aucune tête ne change'),
    chiffres.nouveaux !== null && plural(chiffres.nouveaux, 'nouveau skill', 'nouveaux skills'),
    chiffres.archives !== null && plural(chiffres.archives, 'archivé', 'archivés'),
    chiffres.coutUsd !== null && `coût ${formatUsd(chiffres.coutUsd)}`,
  ].filter((fact): fact is string => !!fact)
}

// « Cette semaine » : le dernier récapitulatif, lisible en 30 secondes.
export function ThisWeek({ tour }: { tour: Tour }) {
  const changes = tour.sections.flatMap(section => section.lignes.map(line => ({ pack: section.pack, ...parseChange(line) })))
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
      <div className="flex flex-col gap-6">
        <Label as="h2" id="titre-semaine">Cette semaine</Label>
        <p className="text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">Tour du {formatDate(tour.date)}</p>
        <ul className="flex flex-col gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.04em] text-muted tabular">
          {tourFacts(tour).map(fact => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <Button href="/changements/" variant="secondary" className="w-fit">
          Tous les changements
        </Button>
      </div>
      <ul className="flex flex-col border-t border-line">
        {changes.map((change, i) => (
          <li key={`${change.pack}-${i}`} className="border-b border-line">
            <Reveal index={i} className="grid gap-2 py-5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-6">
              <span className="caps text-[11.5px] text-muted sm:pt-0.5">{packLabel(change.pack)}</span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="break-words font-mono text-[13px]">
                  <span className="text-muted line-through decoration-muted/60">{change.sortant}</span>
                  <span aria-hidden className="px-2 text-subtle">→</span>
                  <span className="sr-only"> remplacé par </span>
                  <span className="text-fg">{change.entrant}</span>
                </p>
                <p className="text-sm leading-relaxed text-muted">{change.raison}</p>
              </div>
            </Reveal>
          </li>
        ))}
        {!changes.length && <li className="py-5 text-sm text-muted">Aucune tête de pack ne change cette semaine.</li>}
      </ul>
    </div>
  )
}

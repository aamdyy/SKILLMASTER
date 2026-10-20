import { formatDate, formatUsd } from '@/lib/format'
import { href, type Lang } from '@/lib/lang'
import { chiffresDuTour, isTranslated, labelOf, PACKS, tr, type Tour } from '@/lib/library'
import { Button } from './Button'
import { Label } from './Label'
import { Reveal } from './motion/Reveal'

// Une ligne de changement a la forme « sortant → entrant : raison ».
export const parseChange = (line: string) => {
  const cut = line.indexOf(' : ')
  const [sortant, entrant] = (cut >= 0 ? line.slice(0, cut) : line).split(' → ')
  return { sortant: sortant ?? '', entrant: entrant ?? '', raison: cut >= 0 ? line.slice(cut + 3) : '' }
}
export const packLabel = (section: string, lang: Lang = 'fr') => (PACKS.some(pack => pack.type === section) ? labelOf(section, lang) : section)

export function tourFacts(tour: Tour, lang: Lang = 'fr') {
  const chiffres = chiffresDuTour(tour)
  const plural = (count: number, one: string, many: string) => `${count} ${count > 1 ? many : one}`
  if (lang === 'en')
    return [
      chiffres.tetes !== null && (chiffres.tetes ? plural(chiffres.tetes, 'head changes', 'heads change') : 'no head changes'),
      chiffres.nouveaux !== null && plural(chiffres.nouveaux, 'new skill', 'new skills'),
      chiffres.archives !== null && `${chiffres.archives} archived`,
      chiffres.coutUsd !== null && `cost ${formatUsd(chiffres.coutUsd, lang)}`,
    ].filter((fact): fact is string => !!fact)
  return [
    chiffres.tetes !== null && (chiffres.tetes ? plural(chiffres.tetes, 'tête change', 'têtes changent') : 'aucune tête ne change'),
    chiffres.nouveaux !== null && plural(chiffres.nouveaux, 'nouveau skill', 'nouveaux skills'),
    chiffres.archives !== null && plural(chiffres.archives, 'archivé', 'archivés'),
    chiffres.coutUsd !== null && `coût ${formatUsd(chiffres.coutUsd)}`,
  ].filter((fact): fact is string => !!fact)
}

// Raison d'un changement, traduite si possible (sinon balisée en français).
export function Raison({ text, lang, className }: { text: string; lang: Lang; className: string }) {
  return (
    <p lang={isTranslated(lang, text) ? lang : 'fr'} className={className}>
      {tr(lang, text)}
    </p>
  )
}

const T = {
  fr: { label: 'Cette semaine', tour: 'Tour du', all: 'Tous les changements', replaced: ' remplacé par ', none: 'Aucune tête de pack ne change cette semaine.' },
  en: { label: 'This week', tour: 'Run of', all: 'All changes', replaced: ' replaced by ', none: 'No pack head changes this week.' },
}

// « Cette semaine » : le dernier récapitulatif, lisible en 30 secondes.
export function ThisWeek({ tour, lang = 'fr' }: { tour: Tour; lang?: Lang }) {
  const t = T[lang]
  const changes = tour.sections.flatMap(section => section.lignes.map(line => ({ pack: section.pack, ...parseChange(line) })))
  return (
    <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
      <div className="flex flex-col gap-6">
        <Label as="h2" id="titre-semaine">{t.label}</Label>
        <p className="text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">
          {t.tour} {formatDate(tour.date, lang)}
        </p>
        <ul className="flex flex-col gap-1.5 font-mono text-[12.5px] uppercase tracking-[0.04em] text-muted tabular">
          {tourFacts(tour, lang).map(fact => (
            <li key={fact}>{fact}</li>
          ))}
        </ul>
        <Button href={href.changes(lang)} variant="secondary" className="w-fit">
          {t.all}
        </Button>
      </div>
      <ul className="flex flex-col border-t border-line">
        {changes.map((change, i) => (
          <li key={`${change.pack}-${i}`} className="border-b border-line">
            <Reveal index={i} className="grid gap-2 py-5 sm:grid-cols-[8.5rem_minmax(0,1fr)] sm:gap-6">
              <span className="caps text-[11.5px] text-muted sm:pt-0.5">{packLabel(change.pack, lang)}</span>
              <div className="flex min-w-0 flex-col gap-1.5">
                <p className="break-words font-mono text-[13px]">
                  <span className="text-muted line-through decoration-muted/60">{change.sortant}</span>
                  <span aria-hidden className="px-2 text-subtle">→</span>
                  <span className="sr-only">{t.replaced}</span>
                  <span className="text-fg">{change.entrant}</span>
                </p>
                <Raison text={change.raison} lang={lang} className="text-sm leading-relaxed text-muted" />
              </div>
            </Reveal>
          </li>
        ))}
        {!changes.length && <li className="py-5 text-sm text-muted">{t.none}</li>}
      </ul>
    </div>
  )
}

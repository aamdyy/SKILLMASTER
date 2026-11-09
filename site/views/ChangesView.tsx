import { Container } from '@/components/Container'
import { Frame } from '@/components/Frame'
import { Label } from '@/components/Label'
import { Reveal } from '@/components/motion/Reveal'
import { packLabel, parseChange, Raison, tourFacts } from '@/components/ThisWeek'
import { formatDate } from '@/lib/format'
import { alternatesFor, type Lang } from '@/lib/lang'
import { getTours, labelOf } from '@/lib/library'

const T = {
  fr: {
    title: 'Changements',
    description: 'L’historique des tours hebdomadaires de SKILLMASTER : têtes de pack qui changent, avec leurs raisons, entrées et archivages.',
    h1: 'Historique des tours',
    intro: 'Chaque lundi, la bibliothèque est rejugée. Le juge remplace deux skills au plus par pack, toujours avec une raison. Un skill disparu est remplacé en plus.',
    list: 'Tours',
    tour: 'Tour du',
    replaced: ' remplacé par ',
    rows: { ecartes: 'écartés (hors stack)', archives: 'archivés', inchangees: 'têtes inchangées' },
    end: 'L’historique commence au premier tour archivé ; les tours suivants s’ajoutent ici chaque lundi.',
  },
  en: {
    title: 'Changes',
    description: 'The history of SKILLMASTER’s weekly runs: pack heads that change, with their reasons, new entries and archived skills.',
    h1: 'Run history',
    intro: 'Every Monday, the library is judged again. The judge replaces two skills at most per pack, always with a reason. A skill that disappears is replaced on top of that.',
    list: 'Runs',
    tour: 'Run of',
    replaced: ' replaced by ',
    rows: { ecartes: 'set aside (outside the stack)', archives: 'archived', inchangees: 'unchanged heads' },
    end: 'The history starts at the first archived run; later runs are added here every Monday.',
  },
}

// Mises à jour du site lui-même (hors bibliothèque), rangées sous le tour dont elles reprennent les données.
const SITE_NOTES: Record<string, Record<Lang, string[]>> = {
  '2026-11-09': {
    fr: [
      'Le teaser de l’accueil reprend la bibliothèque de ce tour : 1 493 skills dans 422 dépôts, 160 retenus dans 8 packs.',
      'Le pack Méthode (relecture, débogage, tests) entre dans la vidéo, et les têtes de pack affichées sont celles de ce tour.',
      'Quatre schémas, faits avec les données de ce tour : l’entonnoir du tour sur l’accueil, la note décomposée sur chaque fiche, la règle de détection sur chaque pack, le parcours dans Claude Code sur la page Installation.',
    ],
    en: [
      'The home page teaser now shows this run’s library: 1,493 skills from 422 repositories, 160 selected across 8 packs.',
      'The Method pack (review, debugging, tests) joins the video, and the pack heads shown are this run’s.',
      'Four diagrams, built from this run’s data: the run’s funnel on the home page, the score breakdown on every skill page, the detection rule on every pack, the flow inside Claude Code on the Install page.',
    ],
  },
}

export const changesMetadata =(lang: Lang) => ({ title: T[lang].title, description: T[lang].description, alternates: alternatesFor(lang, '/changements/') })

// « android, ios, site-web. » → noms des packs dans la langue de la page.
const packList = (value: string, lang: Lang) => value.replace(/\.$/, '').split(', ').map(type => labelOf(type, lang)).join(', ')

// Timeline des tours, du plus récent au plus ancien. Le filet vertical relie les tours.
export function ChangesView({ lang }: { lang: Lang }) {
  const t = T[lang]
  const tours = getTours()
  return (
    <>
      <section className="relative">
        <Container className="flex flex-col gap-6 pb-14 pt-12 md:pt-16">
          <Label as="span">{t.title}</Label>
          <h1 className="text-[2.75rem] leading-[1.02] tracking-[-0.03em] md:text-[4.5rem]">{t.h1}</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted">{t.intro}</p>
        </Container>
      </section>
      <section aria-label={t.list} className="relative pb-24">
        <Container>
          <ol className="flex flex-col">
            {tours.map((tour, index) => (
              <li key={tour.date} className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-5 md:grid-cols-[9rem_1.25rem_minmax(0,1fr)]">
                <p className="hidden pt-1 caps text-[12px] text-muted md:block">{formatDate(tour.date, lang)}</p>
                <div aria-hidden className="relative flex justify-center">
                  <span className="absolute inset-y-0 w-px bg-line-strong" />
                  <span className={`relative mt-1.5 size-2.5 border ${index === 0 ? 'border-accent bg-accent' : 'border-tick bg-bg'}`} />
                </div>
                <div className="flex flex-col gap-6 pb-16">
                  <div className="flex flex-col gap-3">
                    <h2 className="text-[1.75rem] leading-[1.1] tracking-[-0.02em] md:text-[2.25rem]">
                      {t.tour} {formatDate(tour.date, lang)}
                    </h2>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] uppercase tracking-[0.04em] text-muted tabular">
                      {tourFacts(tour, lang).map(fact => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                  {tour.sections.map((section, i) => (
                    <Reveal key={section.pack} index={i}>
                      <Frame legend={packLabel(section.pack, lang)} as="div" className="bg-panel/40 p-5 pt-6">
                        <ul className="flex flex-col gap-4">
                          {section.lignes.map(line => {
                            const change = parseChange(line)
                            return (
                              <li key={line} className="flex flex-col gap-1">
                                <p className="break-words font-mono text-[13px]">
                                  <span className="text-muted line-through decoration-muted/60">{change.sortant}</span>
                                  <span aria-hidden className="px-2 text-subtle">→</span>
                                  <span className="sr-only">{t.replaced}</span>
                                  <span className="text-fg">{change.entrant}</span>
                                </p>
                                {change.raison && <Raison text={change.raison} lang={lang} className="text-sm leading-relaxed text-muted" />}
                              </li>
                            )
                          })}
                        </ul>
                      </Frame>
                    </Reveal>
                  ))}
                  {SITE_NOTES[tour.date] && (
                    <Reveal index={tour.sections.length}>
                      <Frame legend="Site" as="div" className="bg-panel/40 p-5 pt-6">
                        <ul className="flex flex-col gap-2">
                          {(SITE_NOTES[tour.date]?.[lang] ?? []).map(note => (
                            <li key={note} className="text-sm leading-relaxed text-fg/80">{note}</li>
                          ))}
                        </ul>
                      </Frame>
                    </Reveal>
                  )}
                  <dl className="grid gap-4 text-sm leading-relaxed sm:grid-cols-[9rem_1fr]">
                    {[
                      [t.rows.ecartes, tour.ecartes],
                      [t.rows.archives, tour.archives],
                      [t.rows.inchangees, tour.inchangees && packList(tour.inchangees, lang)],
                    ]
                      .filter((row): row is [string, string] => !!row[1])
                      .map(([label, value]) => (
                        <div key={label} className="contents">
                          <dt className="caps text-[11px] text-muted sm:pt-0.5">{label}</dt>
                          <dd className="text-fg/80">{value}</dd>
                        </div>
                      ))}
                  </dl>
                </div>
              </li>
            ))}
          </ol>
          <p className="caps text-[11.5px] text-muted md:pl-[calc(9rem+1.25rem+2.5rem)]">{t.end}</p>
        </Container>
      </section>
    </>
  )
}

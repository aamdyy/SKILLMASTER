import type { Metadata } from 'next'
import { Container } from '@/components/Container'
import { Frame } from '@/components/Frame'
import { Label } from '@/components/Label'
import { Reveal } from '@/components/motion/Reveal'
import { packLabel, parseChange, tourFacts } from '@/components/ThisWeek'
import { formatDate } from '@/lib/format'
import { getTours } from '@/lib/library'

export const metadata: Metadata = {
  title: 'Changements',
  description: 'L’historique des tours hebdomadaires de SKILLMASTER : têtes de pack qui changent, avec leurs raisons, entrées et archivages.',
}

// Timeline des tours, du plus récent au plus ancien. Le filet vertical relie les tours.
export default function ChangementsPage() {
  const tours = getTours()
  return (
    <>
      <section className="relative">
        <Container className="flex flex-col gap-6 pb-14 pt-12 md:pt-16">
          <Label as="span">Changements</Label>
          <h1 className="text-[2.75rem] leading-[1.02] tracking-[-0.03em] md:text-[4.5rem]">Historique des tours</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
            Chaque lundi, la bibliothèque est rejugée. Une tête de pack change de deux skills au plus par tour, toujours avec une raison.
          </p>
        </Container>
      </section>
      <section aria-label="Tours" className="relative pb-24">
        <Container>
          <ol className="flex flex-col">
            {tours.map((tour, index) => (
              <li key={tour.date} className="grid grid-cols-[1.25rem_1fr] gap-x-5 md:grid-cols-[9rem_1.25rem_1fr]">
                <p className="hidden pt-1 caps text-[12px] text-muted md:block">{formatDate(tour.date)}</p>
                <div aria-hidden className="relative flex justify-center">
                  <span className="absolute inset-y-0 w-px bg-line-strong" />
                  <span className={`relative mt-1.5 size-2.5 border ${index === 0 ? 'border-accent bg-accent' : 'border-tick bg-bg'}`} />
                </div>
                <div className="flex flex-col gap-6 pb-16">
                  <div className="flex flex-col gap-3">
                    <h2 className="text-[1.75rem] leading-[1.1] tracking-[-0.02em] md:text-[2.25rem]">Tour du {formatDate(tour.date)}</h2>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 font-mono text-[12px] uppercase tracking-[0.04em] text-muted tabular">
                      {tourFacts(tour).map(fact => (
                        <li key={fact}>{fact}</li>
                      ))}
                    </ul>
                  </div>
                  {tour.sections.map((section, i) => (
                    <Reveal key={section.pack} index={i}>
                      <Frame legend={packLabel(section.pack)} as="div" className="bg-panel/40 p-5 pt-6">
                        <ul className="flex flex-col gap-4">
                          {section.lignes.map(line => {
                            const change = parseChange(line)
                            return (
                              <li key={line} className="flex flex-col gap-1">
                                <p className="break-words font-mono text-[13px]">
                                  <span className="text-muted line-through decoration-muted/60">{change.sortant}</span>
                                  <span aria-hidden className="px-2 text-subtle">→</span>
                                  <span className="sr-only"> remplacé par </span>
                                  <span className="text-fg">{change.entrant}</span>
                                </p>
                                {change.raison && <p className="text-sm leading-relaxed text-muted">{change.raison}</p>}
                              </li>
                            )
                          })}
                        </ul>
                      </Frame>
                    </Reveal>
                  ))}
                  <dl className="grid gap-4 text-sm leading-relaxed sm:grid-cols-[9rem_1fr]">
                    {[
                      ['écartés (hors stack)', tour.ecartes],
                      ['archivés', tour.archives],
                      ['têtes inchangées', tour.inchangees],
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
          <p className="caps text-[11.5px] text-muted md:pl-[calc(9rem+1.25rem+2.5rem)]">
            L’historique commence au premier tour archivé ; les tours suivants s’ajoutent ici chaque lundi.
          </p>
        </Container>
      </section>
    </>
  )
}

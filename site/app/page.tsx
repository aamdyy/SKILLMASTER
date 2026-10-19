import Link from 'next/link'
import { Container } from '@/components/Container'
import { HeroCards } from '@/components/HeroCards'
import { CountUp } from '@/components/motion/CountUp'
import { Reveal } from '@/components/motion/Reveal'
import { PackCard } from '@/components/PackCard'
import { PillLink } from '@/components/PillLink'
import { SearchField } from '@/components/SearchField'
import { ThisWeek } from '@/components/ThisWeek'
import { formatDate, formatInt, formatUsd } from '@/lib/format'
import { chiffresDuTour, getDernierTour, getPack, getPacks, getSkill, getStats, getTours } from '@/lib/library'

// La première ligne de changement du dernier tour, pour la petite carte du hero.
const firstChange = (sections: { pack: string; lignes: string[] }[]) => {
  for (const section of sections) {
    for (const line of section.lignes) {
      const [pair] = line.split(' : ')
      const [sortant, entrant] = (pair ?? '').split(' → ')
      if (sortant && entrant && sortant !== entrant) return { pack: section.pack, sortant, entrant }
    }
  }
  return null
}

export default function HomePage() {
  const stats = getStats()
  const tour = getDernierTour()
  const packs = getPacks()
  const [latest] = getTours()
  const chiffres = latest ? chiffresDuTour(latest) : { tetes: null, nouveaux: null, archives: null }

  // Carte skill du hero : le premier skill de la tête du pack site-web qui a un résumé, de
  // préférence d'un éditeur de confiance.
  const heroPack = getPack('site-web') ?? packs[0]!
  const withResume = heroPack.recommandes.filter(item => !item.epingle && getSkill(item.id)?.resume)
  const heroPlace = withResume.find(item => item.confiance) ?? withResume[0] ?? heroPack.recommandes[0]!
  const heroSkill = getSkill(heroPlace.id)!

  // Les trois premiers chiffres comptent jusqu'à leur valeur une fois visibles ; la date reste fixe.
  const figures = [
    { label: 'skills analysés', value: <CountUp value={stats.analyses} /> },
    { label: 'retenus dans les packs', value: <CountUp value={stats.retenus} /> },
    { label: 'packs par type de projet', value: <CountUp value={stats.packs} /> },
    { label: `dernier tour · ${tour.coutUsd === null ? 'coût inconnu' : formatUsd(tour.coutUsd)}`, value: formatDate(tour.le).replace(/ \d{4}$/, '') },
  ]

  return (
    <>
      <section className="pb-20 pt-12 md:pb-28 md:pt-20">
        <Container className="flex flex-col items-center text-center">
          <Link
            href="/changements/"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-white/5 py-1 pl-1 pr-4 text-sm text-fg/85 transition-colors duration-150 hover:border-fg/40"
          >
            <span className="rounded-full bg-accent px-2.5 py-0.5 font-mono text-[11px] text-accent-ink">lundi</span>
            Tour du {formatDate(tour.le)}
            {chiffres.tetes ? <span className="hidden sm:inline">{` · ${chiffres.tetes} têtes changent`}</span> : null}
          </Link>
          <h1 className="mt-8 max-w-4xl text-balance font-display text-[2.6rem] font-semibold italic leading-[1.02] tracking-[-0.035em] md:text-[4.5rem]">
            Les bons skills Claude Code, pour chaque projet.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-fg/70 md:text-lg">
            Une bibliothèque triée par type de projet, notée par un juge et mise à jour toute seule chaque lundi.
          </p>
          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row">
            <PillLink href="#packs" className="w-full sm:w-auto">
              Explorer les packs
            </PillLink>
            <SearchField />
          </div>
        </Container>
        <Container>
          <HeroCards pack={heroPack} skill={heroSkill} place={heroPlace} tour={tour} chiffres={chiffres} change={latest ? firstChange(latest.sections) : null} />
        </Container>
      </section>

      <section aria-label="Chiffres clés" className="border-y border-line">
        <Container className="px-0 md:px-6">
          <dl className="grid grid-cols-2 gap-px bg-line md:grid-cols-4">
            {figures.map(figure => (
              <div key={figure.label} className="flex flex-col-reverse gap-2 bg-bg/60 p-6 md:py-9">
                <dt className="text-sm text-muted">{figure.label}</dt>
                <dd className="font-mono text-3xl tracking-[-0.02em] tabular md:text-[2.5rem]">{figure.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <section id="packs" aria-labelledby="titre-packs" className="scroll-mt-4 bg-bg">
        <Container className="flex flex-col gap-10 py-20 md:py-28">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="titre-packs" className="font-display text-4xl font-semibold italic tracking-[-0.03em] md:text-5xl">
              Packs
            </h2>
            <p className="font-mono text-xs text-muted">8 skills en tête au plus, puis les ajouts</p>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {packs.map((pack, i) => (
              <li key={pack.type}>
                <Reveal index={i} className="h-full">
                  <PackCard pack={pack} />
                </Reveal>
              </li>
            ))}
            <li>
              <Reveal index={packs.length} className="h-full">
                <Link
                  href="/skills/"
                  className="group flex h-full min-h-60 flex-col justify-between gap-6 rounded-[28px] border border-line-strong p-6 transition-colors duration-200 hover:border-fg/40"
                >
                  <span className="font-display text-2xl font-semibold italic tracking-[-0.02em]">Toute la bibliothèque</span>
                  <span className="inline-flex h-10 w-fit items-center gap-2 rounded-full bg-accent px-4 font-mono text-xs text-accent-ink tabular">
                    {formatInt(stats.analyses)} skills <span aria-hidden>→</span>
                  </span>
                </Link>
              </Reveal>
            </li>
          </ul>
        </Container>
      </section>

      {latest && (
        <section aria-label="Cette semaine" className="border-t border-line bg-bg">
          <Container className="py-20 md:py-28">
            <ThisWeek tour={latest} />
          </Container>
        </section>
      )}
    </>
  )
}

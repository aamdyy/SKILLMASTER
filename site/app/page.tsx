import { Button } from '@/components/Button'
import { Construction } from '@/components/Construction'
import { Container } from '@/components/Container'
import { Frame } from '@/components/Frame'
import { Hands } from '@/components/Hands'
import { InfoPill } from '@/components/InfoPill'
import { Label } from '@/components/Label'
import { CountUp } from '@/components/motion/CountUp'
import { PackGrid } from '@/components/PackGrid'
import { Pipeline } from '@/components/Pipeline'
import { SearchField } from '@/components/SearchField'
import { Section } from '@/components/Section'
import { ThisWeek } from '@/components/ThisWeek'
import { formatDate, formatInt, formatUsd } from '@/lib/format'
import { chiffresDuTour, getDernierTour, getDetection, getPack, getPacks, getSkill, getStats, getTours } from '@/lib/library'

export default function HomePage() {
  const stats = getStats()
  const tour = getDernierTour()
  const packs = getPacks()
  const [latest] = getTours()
  const chiffres = latest ? chiffresDuTour(latest) : null

  // Construction : le premier skill de la tête du pack Site web qui a un résumé, de préférence
  // d'un éditeur de confiance.
  const pack = getPack('site-web') ?? packs[0]!
  const candidates = pack.recommandes.filter(item => !item.epingle && getSkill(item.id)?.resume)
  const place = candidates.find(item => item.confiance) ?? candidates[0] ?? pack.recommandes[0]!
  const skill = getSkill(place.id)!

  const steps = [
    {
      title: 'Collecte',
      text: `Le collecteur parcourt GitHub et retient ${formatInt(stats.analyses)} skills venus de ${formatInt(stats.depots)} dépôts actifs. Chacun est lu au commit épinglé, sans jamais être exécuté.`,
    },
    {
      title: 'Jugement',
      text: `Claude Haiku note chaque skill nouveau ou modifié sur cinq critères. Un scan statique et le juge signalent les risques : ${formatInt(stats.alertes)} alertes, rangées par catégorie.`,
    },
    {
      title: 'Classement',
      text: 'Claude Sonnet range les finalistes de chaque pack en trois tirages, selon la stack d’Amdy. Une tête de pack change de deux skills au plus par tour, chaque fois avec une raison.',
    },
    {
      title: 'Publication',
      text: `La bibliothèque est publiée sur GitHub et ce site se reconstruit. Dernier tour le ${formatDate(tour.le)}${tour.coutUsd !== null ? `, pour ${formatUsd(tour.coutUsd)}` : ''}.`,
    },
  ]

  return (
    <>
      <section className="relative">
        <Container className="flex flex-col items-center pb-0 pt-14 text-center md:pt-24">
          <InfoPill href="/changements/">
            Tour du {formatDate(tour.le)}
            {chiffres?.tetes ? <span className="hidden sm:inline">{` · ${chiffres.tetes} têtes changent`}</span> : null}
          </InfoPill>
          <h1 className="mt-8 max-w-3xl text-balance text-[2.5rem] leading-[1.05] tracking-[-0.03em] md:text-[4rem]">
            Les bons skills Claude Code, pour chaque projet.
          </h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted md:text-[17px]">
            Une bibliothèque triée par type de projet, notée par un juge et mise à jour toute seule chaque lundi.
          </p>
          <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button href="#packs" icon="↓">
              Explorer les packs
            </Button>
            <Button href="/skills/" variant="secondary">
              Toute la bibliothèque
            </Button>
          </div>
        </Container>
        {/* Les deux mains, juste sous les boutons, d'un bord à l'autre. */}
        <div className="-mt-6 md:-mt-10">
          <Hands />
        </div>
        <Container className="flex justify-center pb-14 pt-4 md:pb-20">
          <SearchField className="max-w-xl" />
        </Container>
        <Container className="pb-20 md:pb-28">
          <Frame legend="dernier tour" className="bg-panel/60">
            <dl className="grid grid-cols-2 md:grid-cols-4">
              {[
                { label: 'skills analysés', value: <CountUp value={stats.analyses} /> },
                { label: 'retenus dans les packs', value: <CountUp value={stats.retenus} /> },
                { label: 'packs par type de projet', value: <CountUp value={stats.packs} /> },
                { label: tour.coutUsd !== null ? `dernier tour · ${formatUsd(tour.coutUsd)}` : 'dernier tour', value: formatDate(tour.le).replace(/ \d{4}$/, '') },
              ].map((figure, i) => (
                <div key={figure.label} className={`flex flex-col-reverse gap-2 p-5 md:p-7 ${i % 2 ? 'border-l border-line' : ''} ${i > 1 ? 'border-t border-line md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
                  <dt className="caps text-[11px] text-muted">{figure.label}</dt>
                  <dd className="font-mono text-[1.55rem] tracking-[-0.02em] tabular sm:text-[1.9rem] md:text-[2.4rem]">{figure.value}</dd>
                </div>
              ))}
            </dl>
          </Frame>
        </Container>
      </section>

      <Section labelledBy="titre-construction">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-5">
            <Label as="h2" id="titre-construction">Construction</Label>
            <p className="max-w-2xl text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">Un pack, c’est des skills et un type de projet.</p>
            <p className="max-w-xl text-[15px] leading-relaxed text-muted">
              skill-master reconnaît le type de ton projet à ses fichiers, puis te propose la tête du pack qui lui correspond.
            </p>
          </div>
          <Construction skill={skill} pack={pack} detection={getDetection()[pack.type] ?? pack.type} />
        </div>
      </Section>

      <Section id="packs" labelledBy="titre-packs">
        <div className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex flex-col gap-5">
              <Label as="h2" id="titre-packs">Packs</Label>
              <p className="text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">Sept types de projet.</p>
            </div>
            <p className="caps text-[11.5px] text-muted">8 skills en tête au plus, puis les ajouts</p>
          </div>
          <PackGrid packs={packs} total={formatInt(stats.analyses)} />
        </div>
      </Section>

      <Section labelledBy="titre-pipeline">
        <Pipeline
          steps={steps}
          intro="Une GitHub Action fait tout le travail : elle collecte, juge, classe et publie. Rien ne s’installe sans l’accord d’Amdy."
        />
      </Section>

      {latest && (
        <Section labelledBy="titre-semaine">
          <ThisWeek tour={latest} />
        </Section>
      )}
    </>
  )
}

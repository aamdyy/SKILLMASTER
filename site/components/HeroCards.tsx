import Link from 'next/link'
import { formatDate, formatInt, formatUsd } from '@/lib/format'
import { labelOf, skillHref, type DernierTour, type Pack, type PackSkill, type Skill } from '@/lib/library'
import { NoteBadge, RiskBadge, TrustBadge } from './Badges'
import { CursorArrow } from './CursorArrow'
import { Float } from './motion/Float'

type Props = {
  pack: Pack
  skill: Skill
  place: PackSkill
  tour: DernierTour
  chiffres: { tetes: number | null; nouveaux: number | null; archives: number | null }
  change: { pack: string; sortant: string; entrant: string } | null
}

const card = 'block rounded-[28px] bg-card text-ink shadow-card transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1'

// « ce qu'il fait → ce qu'il améliore » : la flèche passe en vert.
function Resume({ text }: { text: string }) {
  const [does, improves] = text.split('→').map(part => part.trim())
  return (
    <p className="font-display text-[1.375rem] font-medium italic leading-[1.2] tracking-[-0.02em]">
      {does}
      {improves && (
        <>
          {' '}
          <span aria-hidden className="not-italic text-[#0f9d55]">→</span>
          <span className="sr-only">, ce qui améliore :</span> {improves}
        </>
      )}
    </p>
  )
}

// Cartes blanches qui flottent et se chevauchent sur le fond sombre, avec de vraies données.
// Mobile : empilées en léger décalage. Desktop : posées en éventail.
export function HeroCards({ pack, skill, place, tour, chiffres, change }: Props) {
  return (
    <div className="relative mx-auto mt-16 flex max-w-md flex-col lg:mt-20 lg:block lg:h-[400px] lg:max-w-[1060px]">
      <Float delay={0.15} className="relative z-10 lg:absolute lg:left-0 lg:top-14 lg:w-[290px]">
        <Link href={`/packs/${pack.type}/`} className={`${card} p-5`}>
          <span className="inline-flex h-6 items-center rounded-full bg-card-soft px-2.5 font-mono text-[11px] text-ink-muted">pack</span>
          <p className="mt-4 font-display text-2xl font-semibold italic tracking-[-0.02em]">{pack.label}</p>
          <p className="mt-1 font-mono text-[11px] text-ink-muted tabular">
            {pack.recommandes.length} en tête · {pack.ajouts.length} ajouts
          </p>
          <ol className="mt-4 flex flex-col gap-2 font-mono text-[12.5px]">
            {pack.recommandes.slice(0, 4).map((item, i) => (
              <li key={item.id} className="flex min-w-0 items-center gap-3 rounded-xl bg-card-soft px-3 py-2">
                <span aria-hidden className="text-ink-muted/70 tabular">{String(i + 1).padStart(2, '0')}</span>
                <span className="truncate">{item.nom}</span>
              </li>
            ))}
          </ol>
        </Link>
      </Float>

      <Float delay={0.3} amplitude={6} className="relative z-20 -mt-6 ml-4 lg:absolute lg:left-[260px] lg:top-0 lg:ml-0 lg:mt-0 lg:w-[440px]">
        <Link href={skillHref(skill.id)} className={`${card} p-6`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="truncate font-mono text-sm">{skill.nom}</p>
              <p className="truncate font-mono text-[11px] text-ink-muted">{skill.repo}</p>
            </div>
            <span className="shrink-0 rounded-full bg-ink px-2.5 py-1 font-mono text-[11px] text-card tabular">
              n° {place.rang} · {pack.label}
            </span>
          </div>
          <div className="mt-5">{skill.resume && <Resume text={skill.resume} />}</div>
          <div className="mt-5 flex flex-wrap gap-2">
            <NoteBadge note={skill.note} />
            <RiskBadge gravite={skill.risqueMax} />
            {place.confiance && <TrustBadge />}
          </div>
          <p className="mt-5 border-t border-card-line pt-4 font-mono text-[11px] text-ink-muted">
            épinglé au commit {skill.shaEpingle.slice(0, 7)}
          </p>
        </Link>
      </Float>

      <Float delay={0.45} className="relative z-10 -mt-6 ml-8 lg:absolute lg:right-0 lg:top-20 lg:ml-0 lg:mt-0 lg:w-[300px]">
        <Link href="/changements/" className={`${card} p-5`}>
          <p className="text-sm text-ink-muted">Dernier tour</p>
          <p className="mt-1 font-mono text-[2rem] tracking-[-0.02em] tabular">{formatDate(tour.le).replace(/ \d{4}$/, '')}</p>
          <dl className="mt-4 grid grid-cols-2 gap-2 font-mono text-[12px] tabular">
            {[
              ['nouveaux', chiffres.nouveaux === null ? '—' : formatInt(chiffres.nouveaux)],
              ['têtes changées', chiffres.tetes === null ? '—' : formatInt(chiffres.tetes)],
              ['coût', tour.coutUsd === null ? '—' : formatUsd(tour.coutUsd)],
              ['durée', tour.dureeMin === null ? '—' : `${formatInt(tour.dureeMin)} min`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl bg-card-soft px-3 py-2">
                <dt className="text-[10.5px] text-ink-muted">{label}</dt>
                <dd className="mt-0.5 text-sm">{value}</dd>
              </div>
            ))}
          </dl>
        </Link>
      </Float>

      {change && (
        <Float delay={0.6} amplitude={4} className="relative z-30 -mt-3 ml-auto mr-2 w-fit lg:absolute lg:bottom-6 lg:right-[230px] lg:m-0">
          <Link href="/changements/" className="flex items-center gap-2 whitespace-nowrap rounded-full bg-card py-2 pl-2 pr-4 font-mono text-[12px] text-ink shadow-card">
            <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] text-accent-ink">{labelOf(change.pack)}</span>
            <span className="hidden text-ink-muted line-through sm:inline">{change.sortant}</span>
            <span aria-hidden className="hidden text-ink-muted sm:inline">→</span>
            <span className="sr-only">{`${change.sortant} remplacé par`}</span>
            <span>{change.entrant}</span>
          </Link>
        </Float>
      )}

      <CursorArrow className="pointer-events-none absolute left-[236px] top-2 z-30 hidden rotate-[-8deg] lg:block" />
      <CursorArrow tone="green" className="pointer-events-none absolute right-[288px] top-[64px] z-30 hidden rotate-[80deg] lg:block" />
    </div>
  )
}

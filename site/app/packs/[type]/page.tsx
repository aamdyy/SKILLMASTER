import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/Container'
import { InlineCode } from '@/components/InlineCode'
import { Reveal } from '@/components/motion/Reveal'
import { SkillCard } from '@/components/SkillCard'
import { SkillRow } from '@/components/SkillRow'
import { formatDate } from '@/lib/format'
import { PACKS, getDernierTour, getDetection, getPack, getSkill, type PackSkill } from '@/lib/library'

export const dynamicParams = false

export function generateStaticParams() {
  return PACKS.map(pack => ({ type: pack.type }))
}

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }): Promise<Metadata> {
  const pack = getPack((await params).type)
  return pack ? { title: `Pack ${pack.label}`, description: `Les skills Claude Code recommandés pour un projet ${pack.label}, dans l'ordre, puis les ajouts possibles.` } : {}
}

const withSkill = (items: PackSkill[]) => items.flatMap(place => {
  const skill = getSkill(place.id)
  return skill ? [{ place, skill }] : []
})

export default async function PackPage({ params }: { params: Promise<{ type: string }> }) {
  const pack = getPack((await params).type)
  if (!pack) notFound()
  const detection = getDetection()[pack.type]
  const tete = withSkill(pack.recommandes)
  const ajouts = withSkill(pack.ajouts)
  const tour = getDernierTour()

  return (
    <>
      <section className="pb-16 pt-10 md:pb-20 md:pt-16">
        <Container className="flex flex-col gap-8">
          <nav aria-label="Fil d'Ariane" className="font-mono text-xs text-muted">
            <Link href="/#packs" className="underline-offset-4 hover:text-fg hover:underline">
              packs
            </Link>
            <span aria-hidden className="px-2 text-subtle">/</span>
            <span aria-current="page" className="text-fg">{pack.type}</span>
          </nav>
          <div className="flex flex-col gap-5">
            <h1 className="font-display text-[2.75rem] font-semibold italic leading-[1.02] tracking-[-0.035em] md:text-[4.5rem]">{pack.label}</h1>
            <p className="font-mono text-xs text-muted tabular">
              {pack.recommandes.length} en tête · {pack.ajouts.length} ajouts · bibliothèque du {formatDate(tour.le)}
            </p>
          </div>
          {detection && (
            <div className="max-w-3xl rounded-[24px] border border-line-strong bg-white/[0.03] p-5 md:p-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Détecté dans un projet par</p>
              <p className="mt-3 text-[15px] leading-loose text-fg/85">
                <InlineCode text={detection} />
              </p>
            </div>
          )}
          {pack.changements.length > 0 && (
            <ul aria-label="Changements de ce tour" className="flex flex-wrap gap-2">
              {pack.changements.map((change, i) => (
                <li key={i} className="inline-flex h-9 max-w-full items-center gap-2 overflow-hidden rounded-full bg-card py-1 pl-1 pr-4 font-mono text-[12px] text-ink" title={change.raison}>
                  <span className="shrink-0 rounded-full bg-accent px-2.5 py-1 text-[11px] text-accent-ink">ce tour</span>
                  {change.sortant && <span className="truncate text-ink-muted line-through">{change.sortant}</span>}
                  <span aria-hidden className="text-ink-muted">→</span>
                  <span className="sr-only">{change.sortant ? 'remplacé par' : 'entre'}</span>
                  <span className="truncate">{change.entrant || 'retiré'}</span>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <section aria-labelledby="titre-tete" className="pb-20 md:pb-28">
        <Container className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <h2 id="titre-tete" className="font-display text-3xl font-semibold italic tracking-[-0.03em] md:text-4xl">Tête du pack</h2>
            <p className="font-mono text-xs text-muted">dans l’ordre, à charger ensemble</p>
          </div>
          <ol className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {tete.map(({ place, skill }, i) => (
              <li key={skill.id}>
                <Reveal index={i} className="h-full">
                  <SkillCard skill={skill} place={place} />
                </Reveal>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {ajouts.length > 0 && (
        <section aria-labelledby="titre-ajouts" className="border-t border-line bg-bg">
          <Container className="flex flex-col gap-6 py-20 md:py-28">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="titre-ajouts" className="font-display text-3xl font-semibold italic tracking-[-0.03em] md:text-4xl">Ajouts possibles</h2>
              <p className="font-mono text-xs text-muted">selon le projet, en plus de la tête</p>
            </div>
            <ul className="border-t border-line">
              {ajouts.map(({ place, skill }) => (
                <li key={skill.id}>
                  <SkillRow skill={skill} place={place} />
                </li>
              ))}
            </ul>
          </Container>
        </section>
      )}

      <section aria-label="Autres packs" className="border-t border-line bg-bg">
        <Container className="flex flex-wrap items-center gap-2 py-10">
          <span className="mr-2 font-mono text-xs text-muted">autres packs</span>
          {PACKS.filter(other => other.type !== pack.type).map(other => (
            <Link key={other.type} href={`/packs/${other.type}/`} className="inline-flex h-10 items-center rounded-full border border-line-strong px-4 text-sm text-fg/85 transition-colors duration-150 hover:border-fg/40 hover:text-fg">
              {other.label}
            </Link>
          ))}
        </Container>
      </section>
    </>
  )
}

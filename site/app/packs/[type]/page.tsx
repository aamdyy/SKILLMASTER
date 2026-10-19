import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Frame } from '@/components/Frame'
import { InlineCode } from '@/components/InlineCode'
import { Label } from '@/components/Label'
import { Reveal } from '@/components/motion/Reveal'
import { Section } from '@/components/Section'
import { SkillLine } from '@/components/SkillLine'
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

const withSkill = (items: PackSkill[]) =>
  items.flatMap(place => {
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
  const index = PACKS.findIndex(other => other.type === pack.type)

  return (
    <>
      <section className="relative">
        <Container className="flex flex-col gap-8 pb-16 pt-12 md:pb-20 md:pt-16">
          <nav aria-label="Fil d'Ariane" className="caps text-[12px] text-muted">
            <Link href="/#packs" className="text-accent underline-offset-4 hover:underline">
              // Packs
            </Link>
            <span aria-hidden className="px-2 text-subtle">/</span>
            <span aria-current="page" className="text-fg">{pack.type}</span>
          </nav>
          <div className="flex flex-col gap-4">
            <p className="font-mono text-[12px] text-muted tabular">P/{String(index + 1).padStart(2, '0')}</p>
            <h1 className="text-[2.75rem] leading-[1.02] tracking-[-0.03em] md:text-[4.5rem]">{pack.label}</h1>
            <p className="caps text-[12px] text-muted tabular">
              {pack.recommandes.length} en tête · {pack.ajouts.length} ajouts · bibliothèque du {formatDate(tour.le)}
            </p>
          </div>
          {detection && (
            <Frame legend="détection" className="max-w-3xl bg-panel/60 p-5 pt-6 md:p-6 md:pt-7">
              <p className="text-[15px] leading-loose text-fg/85">
                <span className="text-muted">Proposé quand le projet contient </span>
                <InlineCode text={detection} />
              </p>
            </Frame>
          )}
          {pack.changements.length > 0 && (
            <ul aria-label="Changements du dernier tour" className="flex max-w-3xl flex-col gap-2">
              {pack.changements.map((change, i) => (
                <li key={i} className="flex flex-col gap-1 border-l-2 border-accent/70 pl-4">
                  <p className="font-mono text-[12.5px]">
                    <span className="uppercase tracking-[0.06em] text-accent">ce tour · </span>
                    {change.sortant && <span className="text-muted line-through">{change.sortant}</span>}
                    {change.sortant && <span aria-hidden className="px-1.5 text-subtle">→</span>}
                    <span className="sr-only">{change.sortant ? ' remplacé par ' : ' entre : '}</span>
                    <span className="text-fg">{change.entrant || 'retiré'}</span>
                  </p>
                  <p className="text-sm leading-relaxed text-muted">{change.raison}</p>
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <Section labelledBy="titre-tete">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Label as="h2" id="titre-tete">Tête du pack</Label>
            <p className="caps text-[11.5px] text-muted">dans l’ordre, à charger ensemble</p>
          </div>
          <Frame as="div" className="bg-panel/40">
            <ol className="divide-y divide-line">
              {tete.map(({ place, skill }, i) => (
                <li key={skill.id}>
                  <Reveal index={i}>
                    <SkillLine skill={skill} place={place} />
                  </Reveal>
                </li>
              ))}
            </ol>
          </Frame>
        </div>
      </Section>

      {ajouts.length > 0 && (
        <Section labelledBy="titre-ajouts">
          <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <Label as="h2" id="titre-ajouts">Ajouts possibles</Label>
              <p className="caps text-[11.5px] text-muted">selon le projet, en plus de la tête</p>
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {ajouts.map(({ place, skill }) => (
                <li key={skill.id}>
                  <SkillLine skill={skill} place={place} dense />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section label="Autres packs" className="!py-12">
        <div className="flex flex-col gap-5">
          <Label>Autres packs</Label>
          <div className="flex flex-wrap gap-2">
            {PACKS.filter(other => other.type !== pack.type).map(other => (
              <Button key={other.type} href={`/packs/${other.type}/`} variant="secondary" icon={null} className="h-10">
                {other.label}
              </Button>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}

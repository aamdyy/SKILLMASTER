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
import { Raison } from '@/components/ThisWeek'
import { formatDate } from '@/lib/format'
import { alternatesFor, href, type Lang } from '@/lib/lang'
import { PACKS, getDernierTour, getDetection, getPack, getSkill, labelOf, tr, type PackSkill } from '@/lib/library'

const T = {
  fr: {
    title: (label: string) => `Pack ${label}`,
    description: (label: string) => `Les skills Claude Code recommandés pour un projet ${label}, dans l'ordre, puis les ajouts possibles.`,
    breadcrumb: "Fil d'Ariane",
    counts: (head: number, extras: number, le: string) => `${head} en tête · ${extras} ajouts · bibliothèque du ${le}`,
    detection: 'détection',
    proposed: 'Proposé quand le projet contient ',
    changes: 'Changements du dernier tour',
    thisRun: 'ce tour · ',
    replaced: ' remplacé par ',
    enters: ' entre : ',
    removed: 'retiré',
    head: 'Tête du pack',
    headNote: 'dans l’ordre, à charger ensemble',
    extras: 'Ajouts possibles',
    extrasNote: 'selon le projet, en plus de la tête',
    others: 'Autres packs',
  },
  en: {
    title: (label: string) => `${label} pack`,
    description: (label: string) => `The Claude Code skills recommended for a ${label} project, in order, then the possible extras.`,
    breadcrumb: 'Breadcrumb',
    counts: (head: number, extras: number, le: string) => `${head} in the head · ${extras} extras · library of ${le}`,
    detection: 'detection',
    proposed: 'Suggested when the project contains ',
    changes: 'Changes in the last run',
    thisRun: 'this run · ',
    replaced: ' replaced by ',
    enters: ' enters: ',
    removed: 'removed',
    head: 'Pack head',
    headNote: 'in order, to load together',
    extras: 'Possible extras',
    extrasNote: 'depending on the project, on top of the head',
    others: 'Other packs',
  },
}

export const packParams = () => PACKS.map(pack => ({ type: pack.type }))

export function packMetadata(lang: Lang, type: string) {
  const pack = getPack(type)
  if (!pack) return {}
  const label = labelOf(pack.type, lang)
  return { title: T[lang].title(label), description: T[lang].description(label), alternates: alternatesFor(lang, `/packs/${pack.type}/`) }
}

const withSkill = (items: PackSkill[]) =>
  items.flatMap(place => {
    const skill = getSkill(place.id)
    return skill ? [{ place, skill }] : []
  })

export function PackView({ lang, type }: { lang: Lang; type: string }) {
  const t = T[lang]
  const pack = getPack(type)
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
          <nav aria-label={t.breadcrumb} className="caps text-[12px] text-muted">
            <Link href={href.packs(lang)} className="text-accent underline-offset-4 hover:underline">
              // Packs
            </Link>
            <span aria-hidden className="px-2 text-subtle">/</span>
            <span aria-current="page" className="text-fg">{pack.type}</span>
          </nav>
          <div className="flex flex-col gap-4">
            <p className="font-mono text-[12px] text-muted tabular">P/{String(index + 1).padStart(2, '0')}</p>
            <h1 className="text-[2.75rem] leading-[1.02] tracking-[-0.03em] md:text-[4.5rem]">{labelOf(pack.type, lang)}</h1>
            <p className="caps text-[12px] text-muted tabular">{t.counts(pack.recommandes.length, pack.ajouts.length, formatDate(tour.le, lang))}</p>
          </div>
          {detection && (
            <Frame legend={t.detection} className="max-w-3xl bg-panel/60 p-5 pt-6 md:p-6 md:pt-7">
              <p className="text-[15px] leading-loose text-fg/85">
                <span className="text-muted">{t.proposed}</span>
                <InlineCode text={tr(lang, detection)} />
              </p>
            </Frame>
          )}
          {pack.changements.length > 0 && (
            <ul aria-label={t.changes} className="flex max-w-3xl flex-col gap-2">
              {pack.changements.map((change, i) => (
                <li key={i} className="flex flex-col gap-1 border-l-2 border-accent/70 pl-4">
                  <p className="font-mono text-[12.5px]">
                    <span className="uppercase tracking-[0.06em] text-accent">{t.thisRun}</span>
                    {change.sortant && <span className="text-muted line-through">{change.sortant}</span>}
                    {change.sortant && <span aria-hidden className="px-1.5 text-subtle">→</span>}
                    <span className="sr-only">{change.sortant ? t.replaced : t.enters}</span>
                    <span className="text-fg">{change.entrant || t.removed}</span>
                  </p>
                  <Raison text={change.raison} lang={lang} className="text-sm leading-relaxed text-muted" />
                </li>
              ))}
            </ul>
          )}
        </Container>
      </section>

      <Section labelledBy="titre-tete">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Label as="h2" id="titre-tete">{t.head}</Label>
            <p className="caps text-[11.5px] text-muted">{t.headNote}</p>
          </div>
          <Frame as="div" className="bg-panel/40">
            <ol className="divide-y divide-line">
              {tete.map(({ place, skill }, i) => (
                <li key={skill.id}>
                  <Reveal index={i}>
                    <SkillLine skill={skill} place={place} lang={lang} />
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
              <Label as="h2" id="titre-ajouts">{t.extras}</Label>
              <p className="caps text-[11.5px] text-muted">{t.extrasNote}</p>
            </div>
            <ul className="divide-y divide-line border-y border-line">
              {ajouts.map(({ place, skill }) => (
                <li key={skill.id}>
                  <SkillLine skill={skill} place={place} dense lang={lang} />
                </li>
              ))}
            </ul>
          </div>
        </Section>
      )}

      <Section label={t.others} className="!py-12">
        <div className="flex flex-col gap-5">
          <Label>{t.others}</Label>
          <div className="flex flex-wrap gap-2">
            {PACKS.filter(other => other.type !== pack.type).map(other => (
              <Button key={other.type} href={href.pack(lang, other.type)} variant="secondary" icon={null} className="h-10">
                {labelOf(other.type, lang)}
              </Button>
            ))}
          </div>
        </div>
      </Section>
    </>
  )
}

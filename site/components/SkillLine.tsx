import Link from 'next/link'
import { ViewTransition } from 'react'
import { formatCompact } from '@/lib/format'
import type { Lang } from '@/lib/lang'
import { isTranslated, skillHref, tr, transitionName, type PackSkill, type Skill } from '@/lib/library'
import { NoteBadge, PinnedBadge, RiskBadge, StarsBadge, TrustBadge } from './Badges'
import { Resume } from './Resume'

// Ligne d'un skill dans un pack. Le nom porte un <ViewTransition> : il glisse jusqu'au titre
// de la fiche quand on l'ouvre (et revient au retour).
export function SkillLine({ skill, place, dense = false, lang = 'fr' }: { skill: Skill; place: PackSkill; dense?: boolean; lang?: Lang }) {
  return (
    <Link
      href={skillHref(skill, lang)}
      className={`group grid gap-x-6 gap-y-3 px-5 transition-colors duration-150 hover:bg-panel md:grid-cols-[3rem_minmax(0,16rem)_minmax(0,1fr)] md:px-6 ${dense ? 'py-5' : 'py-6'}`}
    >
      <span className="font-mono text-[13px] text-muted tabular md:pt-0.5">{String(place.rang).padStart(2, '0')}</span>
      <div className="min-w-0">
        <ViewTransition name={transitionName(skill.id)} share="morph" default="none">
          <p className="w-fit max-w-full truncate font-mono text-[14px] text-fg">{skill.nom}</p>
        </ViewTransition>
        <p className="truncate font-mono text-[11px] text-muted">{skill.repo}</p>
      </div>
      <div className="flex min-w-0 flex-col gap-3 md:col-start-3">
        {skill.resume ? (
          <Resume text={tr(lang, skill.resume)} lang={isTranslated(lang, skill.resume) ? lang : 'fr'} className={`${dense ? 'text-[15px]' : 'text-[17px]'} leading-relaxed text-fg/90`} />
        ) : (
          <p className="text-[15px] leading-relaxed text-muted">{lang === 'en' ? skill.description : (skill.descriptionCourte ?? skill.description)}</p>
        )}
        <div className="flex flex-wrap gap-2">
          <NoteBadge note={skill.note} lang={lang} />
          <RiskBadge gravite={skill.risqueMax} lang={lang} />
          <StarsBadge stars={skill.stars} compact={formatCompact(skill.stars, lang)} lang={lang} />
          {place.confiance && <TrustBadge lang={lang} />}
          {place.epingle && <PinnedBadge lang={lang} />}
        </div>
      </div>
    </Link>
  )
}

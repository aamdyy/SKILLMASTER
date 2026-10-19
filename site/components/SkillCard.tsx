import Link from 'next/link'
import { skillHref, type PackSkill, type Skill } from '@/lib/library'
import { NoteBadge, PinnedBadge, RiskBadge, TrustBadge } from './Badges'
import { Resume } from './Resume'

// Skill de la tête d'un pack : carte blanche, rang, résumé en grand, badges. Survol : légère élévation.
export function SkillCard({ skill, place }: { skill: Skill; place: PackSkill }) {
  return (
    <Link
      href={skillHref(skill.id)}
      className="group flex h-full flex-col gap-5 rounded-[28px] bg-card p-6 text-ink shadow-card transition-transform duration-200 ease-out motion-safe:hover:-translate-y-1"
    >
      <div className="flex items-start gap-4">
        <span className="font-mono text-[2rem] leading-none tracking-[-0.03em] text-ink-muted/80 tabular">{String(place.rang).padStart(2, '0')}</span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="truncate font-mono text-sm">{skill.nom}</p>
          <p className="truncate font-mono text-[11px] text-ink-muted">{skill.repo}</p>
        </div>
        <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-card-soft transition-colors duration-150 group-hover:bg-accent">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M3.5 8.5 8.5 3.5M4.5 3.5h4v4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {skill.resume ? (
        <Resume text={skill.resume} className="text-xl leading-[1.25]" />
      ) : (
        <p className="text-sm text-ink-muted">{skill.descriptionCourte ?? skill.description}</p>
      )}
      <div className="mt-auto flex flex-wrap gap-2">
        <NoteBadge note={skill.note} />
        <RiskBadge gravite={skill.risqueMax} />
        {place.confiance && <TrustBadge />}
        {place.epingle && <PinnedBadge />}
      </div>
    </Link>
  )
}

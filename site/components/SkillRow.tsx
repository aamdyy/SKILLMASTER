import Link from 'next/link'
import { skillHref, type PackSkill, type Skill } from '@/lib/library'
import { NoteBadge, PinnedBadge, RiskBadge, TrustBadge } from './Badges'

// Ajout d'un pack : ligne sur fond sombre, plus dense que les cartes de la tête.
export function SkillRow({ skill, place }: { skill: Skill; place: PackSkill }) {
  return (
    <Link
      href={skillHref(skill.id)}
      className="group grid gap-3 border-b border-line py-5 transition-colors duration-150 hover:bg-white/[0.02] md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_auto] md:items-center md:gap-8 md:px-2"
    >
      <div className="min-w-0">
        <p className="truncate font-mono text-sm text-fg">{skill.nom}</p>
        <p className="truncate font-mono text-[11px] text-muted">{skill.repo}</p>
      </div>
      <p className="text-[15px] leading-relaxed text-fg/80">{skill.resume ?? skill.descriptionCourte ?? skill.description}</p>
      <div className="flex flex-wrap gap-2 md:justify-end">
        <NoteBadge note={skill.note} surface="dark" />
        <RiskBadge gravite={skill.risqueMax} surface="dark" />
        {place.confiance && <TrustBadge surface="dark" />}
        {place.epingle && <PinnedBadge surface="dark" />}
      </div>
    </Link>
  )
}

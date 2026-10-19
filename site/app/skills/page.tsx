import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { Container } from '@/components/Container'
import { Label } from '@/components/Label'
import { SkillsFilter } from '@/components/SkillsFilter'
import { formatInt } from '@/lib/format'
import { PACKS, getSkills, getTrustedIds, labelOf, skillHref } from '@/lib/library'
import type { Gravite } from '@/lib/library'

export const metadata: Metadata = {
  title: 'Toute la bibliothèque',
  description: 'Les 1 500 skills Claude Code analysés par SKILLMASTER, filtrables par nom et par type de projet.',
}

const RISK_SHORT: Record<Gravite | 'aucun', string> = { aucun: 'aucun', info: 'info', moyen: 'moyen', eleve: 'élevé', critique: 'critique' }

export default function SkillsPage() {
  const trusted = getTrustedIds()
  const skills = getSkills()
    .filter(skill => skill.statut !== 'archive')
    .sort((a, b) => (b.note ?? -1) - (a.note ?? -1) || a.nom.localeCompare(b.nom))
  const typeOf = (type: string | null) => (type && PACKS.some(pack => pack.type === type) ? type : 'autre')
  const types = [...PACKS, { type: 'autre', label: 'Autre' }]
    .map(({ type, label }) => ({ type, label, count: skills.filter(skill => typeOf(skill.typePrincipal) === type).length }))
    .filter(option => option.count > 0)

  return (
    <>
      <section className="relative">
        <Container className="flex flex-col gap-8 pb-12 pt-12 md:pt-16">
          <Label as="span">Skills</Label>
          <h1 className="text-[2.75rem] leading-[1.02] tracking-[-0.03em] md:text-[4.5rem]">Toute la bibliothèque</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted">
            {formatInt(skills.length)} skills analysés, classés par note du juge. Filtre par nom, par dépôt ou par usage, et par type de projet.
          </p>
          <Suspense>
            <SkillsFilter types={types} total={skills.length} listId="liste-skills" />
          </Suspense>
        </Container>
      </section>
      <section aria-label="Liste des skills" className="relative pb-24">
        <Container>
          <ul id="liste-skills" className="divide-y divide-line border-y border-line">
            {skills.map(skill => {
              const type = typeOf(skill.typePrincipal)
              const risk = skill.risqueMax ?? 'aucun'
              return (
                <li key={skill.id} className="srow" data-skill-row data-type={type}>
                  <Link href={skillHref(skill)}>
                    <div>
                      <b>{skill.nom}</b>
                      <i>
                        {skill.repo}
                        {trusted.has(skill.id) ? ' · confiance' : ''}
                      </i>
                    </div>
                    <p>{skill.resume ?? skill.descriptionCourte ?? skill.description}</p>
                    <span>
                      <span>{skill.note === null ? '—' : `${String(skill.note).replace('.', ',')}/10`}</span>
                      <span>{labelOf(type === 'autre' ? null : type)}</span>
                      <span className={`r-${risk}`}>
                        <span aria-hidden>● </span>risque {RISK_SHORT[risk]}
                      </span>
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </Container>
      </section>
    </>
  )
}

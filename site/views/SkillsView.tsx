import { Suspense } from 'react'
import { Container } from '@/components/Container'
import { Label } from '@/components/Label'
import { SkillsFilter } from '@/components/SkillsFilter'
import { formatCompact, formatInt, formatNote } from '@/lib/format'
import { alternatesFor, type Lang } from '@/lib/lang'
import { PACKS, getSkills, getTrustedIds, isTranslated, labelOf, skillHref, tr } from '@/lib/library'
import type { Gravite } from '@/lib/library'

const T = {
  fr: {
    title: 'Toute la bibliothèque',
    description: 'Les 1 500 skills Claude Code analysés par SKILLMASTER, filtrables par nom et par type de projet.',
    intro: (n: string) => `${n} skills analysés, classés par note du juge. Filtre par nom, par dépôt ou par usage, et par type de projet.`,
    list: 'Liste des skills',
    trusted: ' · confiance',
    risk: 'risque',
    stars: 'étoiles du dépôt',
    risks: { aucun: 'aucun', info: 'info', moyen: 'moyen', eleve: 'élevé', critique: 'critique' } as Record<Gravite | 'aucun', string>,
    filter: { label: 'Filtrer par nom, dépôt ou usage', placeholder: 'nom, dépôt ou usage', legend: 'Filtrer par type de projet', all: 'Tous', shown: '{n} skill{s} sur {total}' },
  },
  en: {
    title: 'The whole library',
    description: 'The 1,500 Claude Code skills analyzed by SKILLMASTER, filterable by name and project type.',
    intro: (n: string) => `${n} skills analyzed, sorted by the judge’s score. Filter by name, repository or use, and by project type.`,
    list: 'Skill list',
    trusted: ' · trusted',
    risk: 'risk',
    stars: 'repo stars',
    risks: { aucun: 'none', info: 'info', moyen: 'medium', eleve: 'high', critique: 'critical' } as Record<Gravite | 'aucun', string>,
    filter: { label: 'Filter by name, repository or use', placeholder: 'name, repository or use', legend: 'Filter by project type', all: 'All', shown: '{n} skill{s} of {total}' },
  },
}

export const skillsMetadata = (lang: Lang) => ({ title: T[lang].title, description: T[lang].description, alternates: alternatesFor(lang, '/skills/') })

// Applique ?q= et ?type= pendant le chargement, sans attendre React (même logique que SkillsFilter,
// qui reprend la main une fois hydraté).
const earlyFilter = `(function(){var p=new URLSearchParams(location.search),q=(p.get('q')||''),t=p.get('type')||'tous';if(!q&&t==='tous')return;var n=function(s){return s.toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'')},w=n(q).split(/\\s+/).filter(Boolean);document.querySelectorAll('#liste-skills [data-skill-row]').forEach(function(r){var txt=n(r.textContent||'');r.hidden=!((t==='tous'||r.getAttribute('data-type')===t)&&w.every(function(x){return txt.indexOf(x)>=0}))})})()`

export function SkillsView({ lang }: { lang: Lang }) {
  const t = T[lang]
  const trusted = getTrustedIds()
  const skills = getSkills()
    .filter(skill => skill.statut !== 'archive')
    .sort((a, b) => (b.note ?? -1) - (a.note ?? -1) || a.nom.localeCompare(b.nom))
  const typeOf = (type: string | null) => (type && PACKS.some(pack => pack.type === type) ? type : 'autre')
  const types = [...PACKS.map(pack => pack.type), 'autre']
    .map(type => ({ type, label: labelOf(type === 'autre' ? null : type, lang), count: skills.filter(skill => typeOf(skill.typePrincipal) === type).length }))
    .filter(option => option.count > 0)

  return (
    <>
      <section className="relative">
        <Container className="flex flex-col gap-8 pb-12 pt-12 md:pt-16">
          <Label as="span">Skills</Label>
          <h1 className="text-[2.75rem] leading-[1.02] tracking-[-0.03em] md:text-[4.5rem]">{t.title}</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted">{t.intro(formatInt(skills.length, lang))}</p>
          <Suspense>
            <SkillsFilter types={types} total={skills.length} listId="liste-skills" text={t.filter} />
          </Suspense>
        </Container>
      </section>
      <section aria-label={t.list} className="relative pb-24">
        <Container>
          <ul id="liste-skills" className="divide-y divide-line border-y border-line">
            {skills.map(skill => {
              const type = typeOf(skill.typePrincipal)
              const risk = skill.risqueMax ?? 'aucun'
              const resume = skill.resume ?? (lang === 'en' ? skill.description : (skill.descriptionCourte ?? skill.description))
              return (
                <li key={skill.id} className="srow" data-skill-row data-type={type}>
                  {/* Lien simple, pas <Link> : 1 500 composants client rendraient l'hydratation (et le filtre) lente. */}
                  <a href={skillHref(skill, lang)}>
                    <div>
                      <b>{skill.nom}</b>
                      <i>
                        {skill.repo}
                        {trusted.has(skill.id) ? t.trusted : ''}
                      </i>
                    </div>
                    <p lang={isTranslated(lang, skill.resume) ? undefined : 'fr'}>{tr(lang, resume)}</p>
                    <span>
                      <span>{formatNote(skill.note, lang)}/10</span>
                      <span>{labelOf(type === 'autre' ? null : type, lang)}</span>
                      <span className={`r-${risk}`}>
                        <span aria-hidden>● </span>
                        {t.risk} {t.risks[risk]}
                      </span>
                      <span>
                        <span aria-hidden>★ </span>
                        {formatCompact(skill.stars, lang)} {t.stars}
                      </span>
                    </span>
                  </a>
                </li>
              )
            })}
          </ul>
          <script dangerouslySetInnerHTML={{ __html: earlyFilter }} />
        </Container>
      </section>
    </>
  )
}

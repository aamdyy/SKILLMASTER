import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ViewTransition, type ReactNode } from 'react'
import { NoteBadge, PinnedBadge, RiskBadge, StarsBadge, TextBadge, TrustBadge } from '@/components/Badges'
import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Frame } from '@/components/Frame'
import { Label } from '@/components/Label'
import { Resume } from '@/components/Resume'
import { Section } from '@/components/Section'
import { formatCompact, formatDate, formatInt } from '@/lib/format'
import { getFiches, getSkillBySlug, getSkills, getTrustedIds, labelOf, placesOf, skillHref, transitionName, type Risque, type Skill } from '@/lib/library'

export const dynamicParams = false

export function generateStaticParams() {
  return getFiches().map(skill => ({ id: skill.slug.split('/') }))
}

const fromParams = async (params: Promise<{ id: string[] }>) => getSkillBySlug((await params).id.map(decodeURIComponent).join('/'))

export async function generateMetadata({ params }: { params: Promise<{ id: string[] }> }): Promise<Metadata> {
  const skill = await fromParams(params)
  return skill ? { title: skill.nom, description: skill.resume ?? skill.descriptionCourte ?? `Skill Claude Code ${skill.nom} (${skill.repo}).` } : {}
}

const STATUTS: Record<string, string> = { nouveau: 'nouveau', en_test: 'en test', valide: 'validé', archive: 'archivé', revue_manuelle: 'à revoir' }
const SOUS_NOTES: Record<string, string> = { declenchement: 'Déclenchement', valeur_ajoutee: 'Valeur ajoutée', precision: 'Précision', perimetre: 'Périmètre', qualite: 'Qualité' }
const CATEGORIES: Record<string, string> = { reseau: 'Réseau', execution: 'Exécution', destruction: 'Destruction', donnees: 'Données', consigne: 'Consigne', autre: 'Autre' }
const ORDER = ['critique', 'eleve', 'moyen', 'info']

const githubUrl = (skill: Skill) => `https://github.com/${skill.repo}/tree/${skill.shaEpingle}${skill.cheminSkill ? `/${skill.cheminSkill}` : ''}`

// Le remplaçant d'un skill archivé : la version vivante de ce nom, de préférence dans un pack.
const replacementOf = (skill: Skill) => {
  if (!skill.remplacePar) return null
  const live = getSkills().filter(other => other.nom === skill.remplacePar && other.statut !== 'archive')
  return live.find(other => Object.keys(other.packs).length) ?? live[0] ?? null
}

function groupAlerts(risques: Risque[]) {
  const groups = new Map<string, Risque[]>()
  for (const risk of [...risques].sort((a, b) => ORDER.indexOf(a.gravite) - ORDER.indexOf(b.gravite))) {
    const key = risk.source === 'scan' ? 'Scan statique' : CATEGORIES[risk.categorie ?? 'autre'] ?? 'Autre'
    groups.set(key, [...(groups.get(key) ?? []), risk])
  }
  return [...groups]
}

export default async function SkillPage({ params }: { params: Promise<{ id: string[] }> }) {
  const skill = await fromParams(params)
  if (!skill) notFound()
  const places = placesOf(skill.id)
  const trusted = getTrustedIds().has(skill.id)
  const pinned = places.some(({ item }) => item.epingle)
  const replacement = replacementOf(skill)
  const alerts = groupAlerts(skill.risques)
  const firstPack = places[0]?.pack

  const facts: { label: string; value: ReactNode }[] = [
    { label: 'note du juge', value: <span className="tabular">{skill.note === null ? '—' : `${String(skill.note).replace('.', ',')}/10`}</span> },
    {
      label: 'place',
      value: places.length ? (
        <span className="flex flex-col gap-1">
          {places.map(({ pack, item }) => (
            <Link key={pack.type} href={`/packs/${pack.type}/`} className="underline decoration-line-strong underline-offset-4 hover:decoration-fg">
              {item.place === 'recommande' ? `n° ${item.rang} · ${pack.label}` : `ajout · ${pack.label}`}
            </Link>
          ))}
        </span>
      ) : (
        'hors pack'
      ),
    },
    { label: 'éditeur', value: skill.repo.split('/')[0] },
    { label: 'statut', value: STATUTS[skill.statut] ?? skill.statut },
    {
      label: 'commit épinglé',
      value: (
        <a href={githubUrl(skill)} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 hover:decoration-fg">
          {skill.shaEpingle.slice(0, 7)}
          <span className="sr-only"> sur GitHub (nouvel onglet)</span>
        </a>
      ),
    },
    { label: 'dernier commit du skill', value: skill.dernierCommit ? formatDate(skill.dernierCommit) : '—' },
    { label: 'étoiles du dépôt', value: <span className="tabular">{formatInt(skill.stars)}</span> },
    { label: 'type principal', value: labelOf(skill.typePrincipal) },
  ]

  return (
    <>
      <section className="relative">
        <Container className="flex flex-col gap-8 pb-16 pt-12 md:pb-20 md:pt-16">
          <nav aria-label="Fil d'Ariane" className="flex flex-wrap caps text-[12px] text-muted">
            <Link href="/skills/" className="text-accent underline-offset-4 hover:underline">
              // Skills
            </Link>
            <span aria-hidden className="px-2 text-subtle">/</span>
            <span className="break-all normal-case tracking-normal">{skill.repo}</span>
          </nav>
          <div className="flex flex-col gap-5">
            <ViewTransition name={transitionName(skill.id)} share="morph" default="none">
              <h1 className="w-fit max-w-full break-words font-mono text-[1.9rem] leading-[1.1] tracking-[-0.02em] md:text-[3rem]">{skill.nom}</h1>
            </ViewTransition>
            <p className="break-all font-mono text-[12px] text-muted">
              {skill.repo}
              {skill.cheminSkill ? ` / ${skill.cheminSkill}` : ''}
            </p>
          </div>
          {skill.resume ? (
            <Resume text={skill.resume} className="max-w-3xl text-[1.5rem] leading-[1.25] tracking-[-0.015em] md:text-[2.1rem]" />
          ) : (
            <p className="max-w-3xl text-lg leading-relaxed text-fg/85">{skill.descriptionCourte ?? skill.description}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <NoteBadge note={skill.note} />
            <RiskBadge gravite={skill.risqueMax} />
            <StarsBadge stars={skill.stars} compact={formatCompact(skill.stars)} />
            {trusted && <TrustBadge />}
            {pinned && <PinnedBadge />}
            {skill.statut === 'archive' && <TextBadge>archivé</TextBadge>}
          </div>
          {skill.statut === 'archive' && (
            <Frame legend="archivé" className="max-w-3xl bg-panel/60 p-5 pt-6">
              <p className="text-[15px] leading-relaxed text-fg/85">{skill.raisonStatut ?? 'Ce skill n’est plus dans la bibliothèque.'}</p>
              {replacement && (
                <p className="mt-3 font-mono text-[13px]">
                  <span className="text-muted">remplacé par </span>
                  <Link href={skillHref(replacement)} className="underline underline-offset-4">
                    {replacement.nom} ({replacement.repo})
                  </Link>
                </p>
              )}
            </Frame>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={githubUrl(skill)} external>
              Voir sur GitHub
            </Button>
            {firstPack && (
              <Button href={`/packs/${firstPack.type}/`} variant="secondary" icon="←">
                Pack {firstPack.label}
              </Button>
            )}
          </div>
        </Container>
      </section>

      <Section labelledBy="titre-fiche">
        <div className="flex flex-col gap-8">
          <Label as="h2" id="titre-fiche">Fiche</Label>
          <Frame className="bg-panel/40">
            <dl className="grid grid-cols-2 gap-px bg-line lg:grid-cols-4">
              {facts.map(fact => (
                <div key={fact.label} className="flex min-w-0 flex-col gap-2 bg-bg p-4 sm:p-5">
                  <dt className="caps text-[11px] text-muted">{fact.label}</dt>
                  <dd className="break-words font-mono text-[13px] text-fg sm:text-[14px]">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </Frame>
        </div>
      </Section>

      <Section labelledBy="titre-jugement">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:gap-16">
          <div className="flex flex-col gap-6">
            <Label as="h2" id="titre-jugement">Jugement</Label>
            <p className="text-[17px] leading-relaxed text-fg/90">{skill.justification ?? 'Pas de justification enregistrée.'}</p>
            {skill.reserves.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="caps text-[11px] text-muted">réserves</p>
                <ul className="flex flex-col gap-2 text-[15px] leading-relaxed text-muted">
                  {skill.reserves.map(reserve => (
                    <li key={reserve} className="border-l border-line-strong pl-4">
                      {reserve}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {skill.sousNotes && (
            <Frame legend="sous-notes" className="h-fit p-5 pt-6">
              <dl className="flex flex-col gap-4">
                {Object.entries(SOUS_NOTES).map(([key, label]) => {
                  const value = skill.sousNotes?.[key as keyof typeof skill.sousNotes] ?? 0
                  return (
                    <div key={key} className="grid grid-cols-[1fr_auto] items-center gap-3">
                      <dt className="text-sm text-fg/85">{label}</dt>
                      <dd className="flex items-center gap-3 font-mono text-[12px] text-muted tabular">
                        <span aria-hidden className="flex gap-1">
                          {[0, 1].map(step => (
                            <span key={step} className={`h-2 w-6 rounded-sm ${step < value ? 'bg-fg' : 'bg-line-strong'}`} />
                          ))}
                        </span>
                        {value}/2
                      </dd>
                    </div>
                  )
                })}
              </dl>
            </Frame>
          )}
        </div>
      </Section>

      <Section labelledBy="titre-alertes">
        <div className="flex flex-col gap-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <Label as="h2" id="titre-alertes">Alertes</Label>
            <p className="caps text-[11.5px] text-muted">
              {skill.risques.length ? `${skill.risques.length} alerte${skill.risques.length > 1 ? 's' : ''}, par catégorie` : 'aucune alerte'}
            </p>
          </div>
          {alerts.length ? (
            <div className="flex flex-col gap-8">
              {alerts.map(([group, risks]) => (
                <div key={group} className="flex flex-col gap-3">
                  <h3 className="font-mono text-[13px] uppercase tracking-[0.08em] text-fg">{group}</h3>
                  <ul className="divide-y divide-line border-y border-line">
                    {risks.map((risk, i) => (
                      <li key={i} className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:gap-5">
                        <div className="shrink-0 sm:w-36">
                          <RiskBadge gravite={risk.gravite} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <p className="text-[15px] leading-relaxed text-fg/90">{risk.code}</p>
                          {risk.detail && <p className="break-all font-mono text-[12px] text-muted">{risk.detail}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-muted">Ni le scan statique ni le juge n’ont relevé de risque pour ce skill.</p>
          )}
        </div>
      </Section>

      <Section labelledBy="titre-description">
        <div className="flex flex-col gap-6">
          <Label as="h2" id="titre-description">Description d’origine</Label>
          <Frame className="max-w-3xl bg-panel/40 p-5 md:p-6">
            <p lang={/^[\x00-\x7F]*$/.test(skill.description) ? 'en' : undefined} className="font-mono text-[13px] leading-relaxed text-fg/80">
              {skill.description ? `${skill.description}${skill.description.length >= 300 ? '…' : ''}` : '—'}
            </p>
          </Frame>
          <p className="caps text-[11.5px] text-muted">
            ajouté le {formatDate(skill.dateAjout)} · licence {skill.licence ?? 'non précisée'}
          </p>
        </div>
      </Section>
    </>
  )
}

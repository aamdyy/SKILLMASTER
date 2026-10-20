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
import { formatCompact, formatDate, formatInt, formatNote } from '@/lib/format'
import { alternatesFor, href, type Lang } from '@/lib/lang'
import { getFiches, getSkillBySlug, getSkills, getTrustedIds, isTranslated, labelOf, placesOf, skillHref, tr, transitionName, type Risque, type Skill } from '@/lib/library'

const T = {
  fr: {
    meta: (skill: Skill) => `Skill Claude Code ${skill.nom} (${skill.repo}).`,
    breadcrumb: "Fil d'Ariane",
    statuts: { nouveau: 'nouveau', en_test: 'en test', valide: 'validé', archive: 'archivé', revue_manuelle: 'à revoir' } as Record<string, string>,
    sousNotes: { declenchement: 'Déclenchement', valeur_ajoutee: 'Valeur ajoutée', precision: 'Précision', perimetre: 'Périmètre', qualite: 'Qualité' },
    categories: { reseau: 'Réseau', execution: 'Exécution', destruction: 'Destruction', donnees: 'Données', consigne: 'Consigne', autre: 'Autre' } as Record<string, string>,
    scan: 'Scan statique',
    facts: { note: 'note du juge', place: 'place', outside: 'hors pack', publisher: 'éditeur', status: 'statut', pinned: 'commit épinglé', onGithub: ' sur GitHub (nouvel onglet)', lastCommit: 'dernier commit du skill', stars: 'étoiles du dépôt', type: 'type principal' },
    rank: (rang: number, label: string) => `n° ${rang} · ${label}`,
    extra: (label: string) => `ajout · ${label}`,
    archived: 'archivé',
    archivedText: 'Ce skill n’est plus dans la bibliothèque.',
    replacedBy: 'remplacé par ',
    github: 'Voir sur GitHub',
    pack: (label: string) => `Pack ${label}`,
    fiche: 'Fiche',
    judgement: 'Jugement',
    noJustification: 'Pas de justification enregistrée.',
    reserves: 'réserves',
    subScores: 'sous-notes',
    alerts: 'Alertes',
    alertCount: (n: number) => (n ? `${n} alerte${n > 1 ? 's' : ''}, par catégorie` : 'aucune alerte'),
    noAlert: 'Ni le scan statique ni le juge n’ont relevé de risque pour ce skill.',
    description: 'Description d’origine',
    added: (date: string, licence: string | null) => `ajouté le ${date} · licence ${licence ?? 'non précisée'}`,
  },
  en: {
    meta: (skill: Skill) => `Claude Code skill ${skill.nom} (${skill.repo}).`,
    breadcrumb: 'Breadcrumb',
    statuts: { nouveau: 'new', en_test: 'in testing', valide: 'validated', archive: 'archived', revue_manuelle: 'to review' } as Record<string, string>,
    sousNotes: { declenchement: 'Triggering', valeur_ajoutee: 'Added value', precision: 'Precision', perimetre: 'Scope', qualite: 'Quality' },
    categories: { reseau: 'Network', execution: 'Execution', destruction: 'Destruction', donnees: 'Data', consigne: 'Instruction', autre: 'Other' } as Record<string, string>,
    scan: 'Static scan',
    facts: { note: 'judge’s score', place: 'place', outside: 'outside the packs', publisher: 'publisher', status: 'status', pinned: 'pinned commit', onGithub: ' on GitHub (new tab)', lastCommit: 'skill’s last commit', stars: 'repo stars', type: 'main type' },
    rank: (rang: number, label: string) => `#${rang} · ${label}`,
    extra: (label: string) => `extra · ${label}`,
    archived: 'archived',
    archivedText: 'This skill is no longer in the library.',
    replacedBy: 'replaced by ',
    github: 'View on GitHub',
    pack: (label: string) => `${label} pack`,
    fiche: 'Details',
    judgement: 'Judgement',
    noJustification: 'No justification recorded.',
    reserves: 'reservations',
    subScores: 'sub-scores',
    alerts: 'Alerts',
    alertCount: (n: number) => (n ? `${n} alert${n > 1 ? 's' : ''}, by category` : 'no alerts'),
    noAlert: 'Neither the static scan nor the judge flagged a risk for this skill.',
    description: 'Original description',
    added: (date: string, licence: string | null) => `added on ${date} · license ${licence ?? 'not specified'}`,
  },
}
const ORDER = ['critique', 'eleve', 'moyen', 'info']

export const skillParams = () => getFiches().map(skill => ({ id: skill.slug.split('/') }))
export const skillFromParams = async (params: Promise<{ id: string[] }>) => getSkillBySlug((await params).id.map(decodeURIComponent).join('/'))

export function skillMetadata(lang: Lang, skill: Skill | null) {
  if (!skill) return {}
  return { title: skill.nom, description: tr(lang, skill.resume) ?? skill.descriptionCourte ?? T[lang].meta(skill), alternates: alternatesFor(lang, skillHref(skill, 'fr')) }
}

const githubUrl = (skill: Skill) => `https://github.com/${skill.repo}/tree/${skill.shaEpingle}${skill.cheminSkill ? `/${skill.cheminSkill}` : ''}`

// Le remplaçant d'un skill archivé : la version vivante de ce nom, de préférence dans un pack.
const replacementOf = (skill: Skill) => {
  if (!skill.remplacePar) return null
  const live = getSkills().filter(other => other.nom === skill.remplacePar && other.statut !== 'archive')
  return live.find(other => Object.keys(other.packs).length) ?? live[0] ?? null
}

function groupAlerts(risques: Risque[], lang: Lang) {
  const t = T[lang]
  const groups = new Map<string, Risque[]>()
  for (const risk of [...risques].sort((a, b) => ORDER.indexOf(a.gravite) - ORDER.indexOf(b.gravite))) {
    const key = risk.source === 'scan' ? t.scan : t.categories[risk.categorie ?? 'autre'] ?? t.categories.autre!
    groups.set(key, [...(groups.get(key) ?? []), risk])
  }
  return [...groups]
}

// Texte de la bibliothèque : traduit si possible, sinon balisé en français.
function Translated({ lang, text, className }: { lang: Lang; text: string; className: string }) {
  return (
    <p lang={isTranslated(lang, text) ? undefined : 'fr'} className={className}>
      {tr(lang, text)}
    </p>
  )
}

export function SkillView({ lang, skill }: { lang: Lang; skill: Skill | null }) {
  if (!skill) notFound()
  const t = T[lang]
  const places = placesOf(skill.id)
  const trusted = getTrustedIds().has(skill.id)
  const pinned = places.some(({ item }) => item.epingle)
  const replacement = replacementOf(skill)
  const alerts = groupAlerts(skill.risques, lang)
  const firstPack = places[0]?.pack

  const facts: { label: string; value: ReactNode }[] = [
    { label: t.facts.note, value: <span className="tabular">{skill.note === null ? '—' : `${formatNote(skill.note, lang)}/10`}</span> },
    {
      label: t.facts.place,
      value: places.length ? (
        <span className="flex flex-col gap-1">
          {places.map(({ pack, item }) => (
            <Link key={pack.type} href={href.pack(lang, pack.type)} className="underline decoration-line-strong underline-offset-4 hover:decoration-fg">
              {item.place === 'recommande' ? t.rank(item.rang, labelOf(pack.type, lang)) : t.extra(labelOf(pack.type, lang))}
            </Link>
          ))}
        </span>
      ) : (
        t.facts.outside
      ),
    },
    { label: t.facts.publisher, value: skill.repo.split('/')[0] },
    { label: t.facts.status, value: t.statuts[skill.statut] ?? skill.statut },
    {
      label: t.facts.pinned,
      value: (
        <a href={githubUrl(skill)} target="_blank" rel="noopener noreferrer" className="underline decoration-line-strong underline-offset-4 hover:decoration-fg">
          {skill.shaEpingle.slice(0, 7)}
          <span className="sr-only">{t.facts.onGithub}</span>
        </a>
      ),
    },
    { label: t.facts.lastCommit, value: skill.dernierCommit ? formatDate(skill.dernierCommit, lang) : '—' },
    { label: t.facts.stars, value: <span className="tabular">{formatInt(skill.stars, lang)}</span> },
    { label: t.facts.type, value: labelOf(skill.typePrincipal, lang) },
  ]

  return (
    <>
      <section className="relative">
        <Container className="flex flex-col gap-8 pb-16 pt-12 md:pb-20 md:pt-16">
          <nav aria-label={t.breadcrumb} className="flex flex-wrap caps text-[12px] text-muted">
            <Link href={href.skills(lang)} className="text-accent underline-offset-4 hover:underline">
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
            <Resume text={tr(lang, skill.resume)} lang={isTranslated(lang, skill.resume) ? lang : 'fr'} className="max-w-3xl text-[1.5rem] leading-[1.25] tracking-[-0.015em] md:text-[2.1rem]" />
          ) : (
            <p className="max-w-3xl text-lg leading-relaxed text-fg/85">{lang === 'en' ? skill.description : (skill.descriptionCourte ?? skill.description)}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <NoteBadge note={skill.note} lang={lang} />
            <RiskBadge gravite={skill.risqueMax} lang={lang} />
            <StarsBadge stars={skill.stars} compact={formatCompact(skill.stars, lang)} lang={lang} />
            {trusted && <TrustBadge lang={lang} />}
            {pinned && <PinnedBadge lang={lang} />}
            {skill.statut === 'archive' && <TextBadge>{t.archived}</TextBadge>}
          </div>
          {skill.statut === 'archive' && (
            <Frame legend={t.archived} className="max-w-3xl bg-panel/60 p-5 pt-6">
              {skill.raisonStatut ? (
                <Translated lang={lang} text={skill.raisonStatut} className="text-[15px] leading-relaxed text-fg/85" />
              ) : (
                <p className="text-[15px] leading-relaxed text-fg/85">{t.archivedText}</p>
              )}
              {replacement && (
                <p className="mt-3 font-mono text-[13px]">
                  <span className="text-muted">{t.replacedBy}</span>
                  <Link href={skillHref(replacement, lang)} className="underline underline-offset-4">
                    {replacement.nom} ({replacement.repo})
                  </Link>
                </p>
              )}
            </Frame>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button href={githubUrl(skill)} external lang={lang}>
              {t.github}
            </Button>
            {firstPack && (
              <Button href={href.pack(lang, firstPack.type)} variant="secondary" icon="←">
                {t.pack(labelOf(firstPack.type, lang))}
              </Button>
            )}
          </div>
        </Container>
      </section>

      <Section labelledBy="titre-fiche">
        <div className="flex flex-col gap-8">
          <Label as="h2" id="titre-fiche">{t.fiche}</Label>
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
            <Label as="h2" id="titre-jugement">{t.judgement}</Label>
            {skill.justification ? (
              <Translated lang={lang} text={skill.justification} className="text-[17px] leading-relaxed text-fg/90" />
            ) : (
              <p className="text-[17px] leading-relaxed text-fg/90">{t.noJustification}</p>
            )}
            {skill.reserves.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="caps text-[11px] text-muted">{t.reserves}</p>
                <ul className="flex flex-col gap-2 text-[15px] leading-relaxed text-muted">
                  {skill.reserves.map(reserve => (
                    <li key={reserve} lang={isTranslated(lang, reserve) ? undefined : 'fr'} className="border-l border-line-strong pl-4">
                      {tr(lang, reserve)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          {skill.sousNotes && (
            <Frame legend={t.subScores} className="h-fit p-5 pt-6">
              <dl className="flex flex-col gap-4">
                {Object.entries(t.sousNotes).map(([key, label]) => {
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
            <Label as="h2" id="titre-alertes">{t.alerts}</Label>
            <p className="caps text-[11.5px] text-muted">{t.alertCount(skill.risques.length)}</p>
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
                          <RiskBadge gravite={risk.gravite} lang={lang} />
                        </div>
                        <div className="flex min-w-0 flex-col gap-1">
                          <Translated lang={lang} text={risk.code} className="text-[15px] leading-relaxed text-fg/90" />
                          {risk.detail && <p className="break-all font-mono text-[12px] text-muted">{risk.detail}</p>}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[15px] text-muted">{t.noAlert}</p>
          )}
        </div>
      </Section>

      <Section labelledBy="titre-description">
        <div className="flex flex-col gap-6">
          <Label as="h2" id="titre-description">{t.description}</Label>
          <Frame className="max-w-3xl bg-panel/40 p-5 md:p-6">
            <p lang={/^[\x00-\x7F]*$/.test(skill.description) ? 'en' : undefined} className="font-mono text-[13px] leading-relaxed text-fg/80">
              {skill.description ? `${skill.description}${skill.description.length >= 300 ? '…' : ''}` : '—'}
            </p>
          </Frame>
          <p className="caps text-[11.5px] text-muted">{t.added(formatDate(skill.dateAjout, lang), skill.licence)}</p>
        </div>
      </Section>
    </>
  )
}

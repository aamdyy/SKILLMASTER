// Lecture et typage de la bibliothèque (../library) au moment du build. Lecture seule :
// le site ne modifie jamais library/. library/profil.json n'est jamais lu ni exposé ; l'usage
// réel d'Amdy n'est pas dans library/ (il reste en local, collector/usage.ts).
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { href, type Lang } from './lang'

const ROOT = join(process.cwd(), '..')
const LIBRARY = join(ROOT, 'library')
const DETECTION = join(ROOT, 'plugins', 'skillmaster', 'detection.json')
const TRADUCTIONS = join(LIBRARY, 'i18n', 'en.json')

export type Gravite = 'critique' | 'eleve' | 'moyen' | 'info'
export type Risque = { gravite: Gravite; source: 'scan' | 'juge'; categorie?: string; code: string; detail?: string }
export type SousNotes = Record<'declenchement' | 'valeur_ajoutee' | 'precision' | 'perimetre' | 'qualite', number>

export type Skill = {
  id: string
  slug: string
  nom: string
  repo: string
  cheminSkill: string
  skillMd: string
  shaEpingle: string
  resume: string | null
  descriptionCourte: string | null
  description: string
  typePrincipal: string | null
  categories: string[]
  stars: number
  dernierCommit: string | null
  // Note du juge (qualité seule).
  note: number | null
  sousNotes: SousNotes | null
  justification: string | null
  reserves: string[]
  risques: Risque[]
  risqueMax: Gravite | null
  packs: Record<string, string>
  statut: string
  remplacePar: string | null
  raisonStatut: string | null
  officiel: boolean
  licence: string | null
  dateAjout: string
}

export type PackSkill = { id: string; nom: string; place: 'recommande' | 'ajout'; rang: number; epingle: boolean; confiance: boolean }
export type Pack = {
  type: string
  label: string
  recommandes: PackSkill[]
  ajouts: PackSkill[]
  changements: { entrant: string; sortant: string | null; raison: string }[]
  ecartes: { nom: string; raison: string }[]
}

export type DernierTour = { le: string; coutUsd: number | null; dureeMin: number | null }
export type Tour = { date: string; resume: string; sections: { pack: string; lignes: string[] }[]; ecartes: string | null; archives: string | null; inchangees: string | null }

// Ordre et noms d'affichage des packs, en français et en anglais.
export const PACKS: { type: string; label: string; en: string }[] = [
  { type: 'site-web', label: 'Site web', en: 'Website' },
  { type: 'ios', label: 'iOS', en: 'iOS' },
  { type: 'app-expo', label: 'App Expo', en: 'Expo app' },
  { type: 'android', label: 'Android', en: 'Android' },
  { type: 'video', label: 'Vidéo', en: 'Video' },
  { type: 'data', label: 'Data', en: 'Data' },
  { type: 'outillage-claude-code', label: 'Construire avec Claude', en: 'Building with Claude' },
]
export const labelOf = (type: string | null, lang: Lang = 'fr') => {
  const pack = type ? PACKS.find(item => item.type === type) : null
  if (pack) return lang === 'en' ? pack.en : pack.label
  return type ?? (lang === 'en' ? 'Other' : 'Autre')
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T
const once = <T>(load: () => T) => {
  let value: T | undefined
  return () => (value ??= load())
}

// Traductions anglaises des textes de la bibliothèque (résumés, jugements, alertes, raisons),
// par empreinte du texte français : écrites par collector/translate.ts. Sans traduction, le français reste.
const getTraductions = once((): Record<string, string> => (existsSync(TRADUCTIONS) ? readJson<{ textes: Record<string, string> }>(TRADUCTIONS).textes : {}))
const keyOf = (fr: string) => createHash('sha256').update(fr).digest('hex').slice(0, 16)
export function tr(lang: Lang, fr: string): string
export function tr(lang: Lang, fr: string | null): string | null
export function tr(lang: Lang, fr: string | null) {
  if (lang === 'fr' || !fr?.trim()) return fr
  return getTraductions()[keyOf(fr.trim())] ?? fr
}
// La traduction existe-t-elle ? (sinon le texte s'affiche en français, balisé lang="fr")
export const isTranslated = (lang: Lang, fr: string | null) => lang === 'fr' || !fr?.trim() || keyOf(fr.trim()) in getTraductions()

// Adresse d'une fiche : l'id, sans segment qui commence par un point (certains hébergeurs
// ignorent les dossiers cachés). « .claude » devient « _claude ».
const toSlug = (id: string) => id.split('/').map(segment => segment.replace(/^\./, '_')).join('/')

type RawSkill = {
  id: string; nom: string; repo: string; chemin_skill: string; skill_md: string; sha_epingle: string
  resume_fr: string | null; description_courte: string | null; description_originale: string; type_principal: string | null
  categories: string[]; stars: number; dernier_commit: string | null; note_juge: number | null; sous_notes: SousNotes | null
  justification: string | null; reserves?: string[]; risques: Risque[]; risque_max: Gravite | null; packs?: Record<string, string>
  statut: string; remplace_par: string | null; raison_statut?: string; officiel: boolean; licence: string | null; date_ajout: string
}

export const getSkills = once((): Skill[] => {
  const skills = readJson<{ skills: RawSkill[] }>(join(LIBRARY, 'skills.json')).skills.map(raw => ({
    id: raw.id,
    slug: toSlug(raw.id),
    nom: raw.nom,
    repo: raw.repo,
    cheminSkill: raw.chemin_skill,
    skillMd: raw.skill_md,
    shaEpingle: raw.sha_epingle,
    resume: raw.resume_fr,
    descriptionCourte: raw.description_courte,
    description: raw.description_originale,
    typePrincipal: raw.type_principal,
    categories: raw.categories,
    stars: raw.stars,
    dernierCommit: raw.dernier_commit,
    note: raw.note_juge,
    sousNotes: raw.sous_notes,
    justification: raw.justification,
    reserves: raw.reserves ?? [],
    risques: raw.risques,
    risqueMax: raw.risque_max,
    packs: raw.packs ?? {},
    statut: raw.statut,
    remplacePar: raw.remplace_par,
    raisonStatut: raw.raison_statut ?? null,
    officiel: raw.officiel,
    licence: raw.licence,
    dateAjout: raw.date_ajout,
  }))
  // Une copie archivée et l'original peuvent partager un id : la version vivante passe en premier.
  skills.sort((a, b) => Number(a.statut === 'archive') - Number(b.statut === 'archive'))
  const seen = new Map<string, string>()
  for (const skill of skills) {
    const owner = seen.get(skill.slug)
    if (owner && owner !== skill.id) skill.slug = `${skill.slug}-${createHash('sha256').update(skill.id).digest('hex').slice(0, 6)}`
    seen.set(skill.slug, skill.id)
  }
  return skills
})

// Une fiche par id (la version vivante si l'id existe aussi en archive).
export const getFiches = once(() => {
  const byId = new Map<string, Skill>()
  for (const skill of getSkills()) if (!byId.has(skill.id)) byId.set(skill.id, skill)
  return [...byId.values()]
})
export const getSkill = (id: string) => getFiches().find(skill => skill.id === id) ?? null
export const getSkillBySlug = (slug: string) => getFiches().find(skill => skill.slug === slug) ?? null
export const skillHref = (skill: { slug: string }, lang: Lang = 'fr') => href.skill(lang, skill.slug)
export const skillHrefById = (id: string, lang: Lang = 'fr') => {
  const skill = getSkill(id)
  return skill ? skillHref(skill, lang) : href.skills(lang)
}
// Nom utilisé par <ViewTransition> : doit être un identifiant CSS valide.
export const transitionName = (id: string) => `skill-${createHash('sha256').update(id).digest('hex').slice(0, 12)}`

type RawPackItem = { id: string; nom: string; epingle?: boolean }
type RawIndexItem = { id: string; editeur_confiance?: boolean }

export const getPacks = once((): Pack[] =>
  PACKS.map(({ type, label }) => {
    const raw = readJson<{ recommandes: RawPackItem[]; ajouts?: RawPackItem[]; changements?: Pack['changements']; ecartes?: Pack['ecartes'] }>(
      join(LIBRARY, 'packs', `${type}.json`),
    )
    const index = readJson<{ recommandes: RawIndexItem[]; ajouts: RawIndexItem[] }>(join(LIBRARY, 'index', `${type}.json`))
    const trusted = new Set([...index.recommandes, ...index.ajouts].filter(item => item.editeur_confiance).map(item => item.id))
    // Épinglé en tête (« epingle ») ou en ajout (« ajout_epingle ») : décisions d'Amdy.
    const pinned = (id: string) => /epingle/.test(getSkill(id)?.packs[type] ?? '')
    const item = (place: PackSkill['place']) => (raw: RawPackItem, i: number): PackSkill => ({
      id: raw.id, nom: raw.nom, place, rang: i + 1, epingle: !!raw.epingle || pinned(raw.id), confiance: trusted.has(raw.id),
    })
    return {
      type,
      label,
      recommandes: raw.recommandes.map(item('recommande')),
      ajouts: (raw.ajouts ?? []).map(item('ajout')),
      changements: raw.changements ?? [],
      ecartes: raw.ecartes ?? [],
    }
  }),
)

export const getPack = (type: string) => getPacks().find(pack => pack.type === type) ?? null

// Éditeurs de confiance, d'après l'index publié (jamais profil.json).
export const getTrustedIds = once(() => new Set(getPacks().flatMap(pack => [...pack.recommandes, ...pack.ajouts].filter(item => item.confiance).map(item => item.id))))

// Places d'un skill dans les packs : « n° 3 en tête de Site web », « ajout de Data »…
export const placesOf = (id: string) =>
  getPacks().flatMap(pack => [...pack.recommandes, ...pack.ajouts].filter(item => item.id === id).map(item => ({ pack, item })))

// Récapitulatifs : un fichier par tour dans library/history/, sinon le dernier RECAP.md.
const parseRecap = (text: string): Tour => {
  const date = text.match(/^# Récapitulatif SKILLMASTER — (\d{4}-\d{2}-\d{2})/m)?.[1] ?? ''
  const resume = (text.split('\n').find(line => line.startsWith('**')) ?? '').replace(/\*\*/g, '').trim()
  const sections: Tour['sections'] = []
  for (const block of text.split(/^## /m).slice(1)) {
    const [head, ...rest] = block.split('\n')
    sections.push({ pack: (head ?? '').trim(), lignes: rest.filter(line => line.startsWith('- ')).map(line => line.slice(2).replace(/\*\*/g, '')) })
  }
  const after = (prefix: string) => text.split('\n').find(line => line.startsWith(prefix))?.slice(prefix.length).trim() ?? null
  return { date, resume, sections, ecartes: after('Écartés (hors stack) :'), archives: after('Archivés :'), inchangees: after('Têtes inchangées :') }
}

// Chiffres d'un tour, lus dans la ligne de synthèse du récapitulatif.
export const chiffresDuTour = (tour: Tour) => {
  const number = (re: RegExp) => {
    const found = tour.resume.match(re)?.[1]
    return found === undefined ? null : Number(found)
  }
  return {
    tetes: /Aucune tête/.test(tour.resume) ? 0 : number(/(\d+) pack/),
    nouveaux: number(/(\d+) skill\(s\) nouveaux/),
    archives: number(/(\d+) archivé/),
    coutUsd: number(/coût ([\d.]+) \$/),
    dureeMin: number(/, (\d+) min/),
  }
}

export const getTours = once((): Tour[] => {
  const dir = join(LIBRARY, 'history')
  const files = existsSync(dir) ? readdirSync(dir).filter(file => /^recap-\d{4}-\d{2}-\d{2}\.md$/.test(file)).sort().reverse() : []
  const tours = files.map(file => parseRecap(readFileSync(join(dir, file), 'utf8')))
  return tours.length ? tours : [parseRecap(readFileSync(join(LIBRARY, 'RECAP.md'), 'utf8'))]
})

export const getDernierTour = once((): DernierTour => {
  const path = join(LIBRARY, 'history', 'last-run.json')
  if (existsSync(path)) {
    const run = readJson<{ le: string; duree_min: number | null; cout: { total: number } | null }>(path)
    return { le: run.le, coutUsd: run.cout?.total ?? null, dureeMin: run.duree_min }
  }
  // Avant le premier archivage : la date et le coût se lisent dans RECAP.md.
  const tour = parseRecap(readFileSync(join(LIBRARY, 'RECAP.md'), 'utf8'))
  const chiffres = chiffresDuTour(tour)
  return { le: tour.date, coutUsd: chiffres.coutUsd, dureeMin: chiffres.dureeMin }
})

// Critères de détection du type, lus dans detection.json du plugin, la référence (lecture seule).
export const getDetection = once((): Record<string, string> => {
  const { types } = JSON.parse(readFileSync(DETECTION, 'utf8')) as { types: Record<string, { texte: string }> }
  return Object.fromEntries(Object.entries(types).map(([type, rule]) => [type, rule.texte]))
})

export const getStats = once(() => {
  const vivants = getSkills().filter(skill => skill.statut !== 'archive')
  const retenus = new Set(getPacks().flatMap(pack => [...pack.recommandes, ...pack.ajouts].map(item => item.id)))
  return {
    analyses: vivants.length,
    retenus: retenus.size,
    packs: getPacks().length,
    depots: new Set(vivants.map(skill => skill.repo.toLowerCase())).size,
    alertes: vivants.reduce((sum, skill) => sum + skill.risques.filter(risk => risk.source === 'juge').length, 0),
  }
})

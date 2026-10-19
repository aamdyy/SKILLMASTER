// Lecture et typage de la bibliothèque (../library) au moment du build. Lecture seule :
// le site ne modifie jamais library/. L'usage réel d'Amdy (retours_amdy, bonus d'usage) et
// library/profil.json ne sont jamais lus ni exposés.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), '..')
const LIBRARY = join(ROOT, 'library')
const SKILL_MASTER = join(ROOT, 'plugins', 'skillmaster', 'skills', 'skill-master', 'SKILL.md')

export type Gravite = 'critique' | 'eleve' | 'moyen' | 'info'
export type Risque = { gravite: Gravite; source: 'scan' | 'juge'; categorie?: string; code: string; detail?: string }

export type Skill = {
  id: string
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
  // Note du juge seule : la note finale contient le bonus d'usage d'Amdy, qui reste privé.
  note: number | null
  justification: string | null
  reserves: string[]
  risques: Risque[]
  risqueMax: Gravite | null
  packs: Record<string, string>
  statut: string
  remplacePar: string | null
  raisonStatut: string | null
  officiel: boolean
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

// Ordre et noms d'affichage des packs.
export const PACKS: { type: string; label: string }[] = [
  { type: 'site-web', label: 'Site web' },
  { type: 'ios', label: 'iOS' },
  { type: 'app-expo', label: 'App Expo' },
  { type: 'android', label: 'Android' },
  { type: 'video', label: 'Vidéo' },
  { type: 'data', label: 'Data' },
  { type: 'outillage-claude-code', label: 'Construire avec Claude' },
]
export const labelOf = (type: string) => PACKS.find(pack => pack.type === type)?.label ?? type

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T
const once = <T>(load: () => T) => {
  let value: T | undefined
  return () => (value ??= load())
}

type RawSkill = {
  id: string; nom: string; repo: string; chemin_skill: string; skill_md: string; sha_epingle: string
  resume_fr: string | null; description_courte: string | null; description_originale: string; type_principal: string | null
  categories: string[]; stars: number; dernier_commit: string | null; note_juge: number | null; justification: string | null
  reserves?: string[]; risques: Risque[]; risque_max: Gravite | null; packs?: Record<string, string>; statut: string
  remplace_par: string | null; raison_statut?: string; officiel: boolean; date_ajout: string
}

export const getSkills = once((): Skill[] =>
  readJson<{ skills: RawSkill[] }>(join(LIBRARY, 'skills.json')).skills.map(raw => ({
    id: raw.id,
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
    justification: raw.justification,
    reserves: raw.reserves ?? [],
    risques: raw.risques,
    risqueMax: raw.risque_max,
    packs: raw.packs ?? {},
    statut: raw.statut,
    remplacePar: raw.remplace_par,
    raisonStatut: raw.raison_statut ?? null,
    officiel: raw.officiel,
    dateAjout: raw.date_ajout,
  })),
)

export const getSkill = (id: string) => getSkills().find(skill => skill.id === id) ?? null

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
  const recap = readFileSync(join(LIBRARY, 'RECAP.md'), 'utf8')
  const tour = parseRecap(recap)
  const cout = recap.match(/coût ([\d.]+) \$/)?.[1]
  const duree = recap.match(/, (\d+) min/)?.[1]
  return { le: tour.date, coutUsd: cout ? Number(cout) : null, dureeMin: duree ? Number(duree) : null }
})

// Critères de détection du type, lus dans le SKILL.md de skill-master (lecture seule).
export const getDetection = once((): Record<string, string> => {
  const text = readFileSync(SKILL_MASTER, 'utf8')
  const table = text.slice(text.indexOf('| Type | Détecté par |'))
  const rows: Record<string, string> = {}
  for (const line of table.split('\n').slice(2)) {
    if (!line.startsWith('|')) break
    const [, type, rule] = line.split('|').map(cell => cell.trim())
    if (type && rule) rows[type] = rule
  }
  return rows
})

export const getStats = once(() => {
  const vivants = getSkills().filter(skill => skill.statut !== 'archive')
  const retenus = new Set(getPacks().flatMap(pack => [...pack.recommandes, ...pack.ajouts].map(item => item.id)))
  return { analyses: vivants.length, retenus: retenus.size, packs: getPacks().length }
})

// Les ids contiennent des « / » : la fiche vit sur /skills/<id>/ (route catch-all).
export const skillHref = (id: string) => `/skills/${id.split('/').map(encodeURIComponent).join('/')}/`

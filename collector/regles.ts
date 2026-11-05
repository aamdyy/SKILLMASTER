// Règles pures de la bibliothèque, sans réseau ni modèle : plafond par dépôt, déménagements, statut,
// exclusions de stack, garde-fous avant publication. Testées dans tests/regles.test.ts.
const hit = (source: string, text: string) => new RegExp(source, 'i').test(text)

// --- Plafond par dépôt : aucun pour un dépôt exempté, `max` pour les autres. L'ordre décide de qui reste.
export function applyRepoCap<T>(items: T[], repoOf: (item: T) => string, isExempt: (repo: string) => boolean, max = 2) {
  const count = new Map<string, number>()
  return items.filter(item => {
    const repo = repoOf(item).toLowerCase()
    if (isExempt(repo)) return true
    const seen = count.get(repo) ?? 0
    if (seen >= max) return false
    count.set(repo, seen + 1)
    return true
  })
}

// --- Déménagement : un skill disparu de son chemin, mais présent ailleurs chez le même éditeur, ou au mot près.
export const normalizeName = (name: string) => name.trim().toLowerCase().replace(/[\s_]+/g, '-')
const ownerOf = (repo: string) => repo.split('/')[0]!.toLowerCase()
type Lost = { id: string; repo: string; nom: string; hash?: string }
type Candidate = { id: string; repo: string; name: string; hash: string }
export function movedTarget<T extends Candidate>(lost: Lost, candidates: T[]): T | null {
  const others = candidates.filter(candidate => candidate.id !== lost.id)
  return (
    (lost.hash ? others.find(candidate => candidate.hash === lost.hash) : undefined) ??
    others.find(candidate => ownerOf(candidate.repo) === ownerOf(lost.repo) && normalizeName(candidate.name) === normalizeName(lost.nom)) ??
    null
  )
}

// --- Statut public : il ne dépend que de l'âge et de la note, jamais de l'usage de quelqu'un.
export const VALIDE_APRES_JOURS = 28
export const NOTE_VALIDE = 6
export type Statut = 'nouveau' | 'valide' | 'faible' | 'archive' | 'revue_manuelle'
export function statutOf(skill: { nom: string; note_qualite: number | null; date_ajout: string }, today: string, never: Set<string>): Statut {
  if (never.has(skill.nom.toLowerCase())) return 'archive'
  if (skill.note_qualite === null) return 'revue_manuelle'
  const age = (Date.parse(today) - Date.parse(skill.date_ajout)) / 86_400_000
  if (age < VALIDE_APRES_JOURS) return 'nouveau'
  return skill.note_qualite >= NOTE_VALIDE ? 'valide' : 'faible'
}

// --- Exclusions de stack : une techno exclue compte si elle est la cible du skill. Citée à côté d'une
// techno de la stack, c'est une comparaison ou une compatibilité : Sonnet tranche ensuite.
export function isExcludedTarget(exclusions: string[], stack: string[], name: string, description: string) {
  if (exclusions.some(source => hit(source, name))) return true
  if (!exclusions.some(source => hit(source, description))) return false
  return !stack.some(source => hit(source, description))
}

// --- Raison d'une absence, d'après l'état du dépôt vu par le collecteur.
export type RepoEtat = 'ok' | 'introuvable' | 'fork' | 'archive' | 'sous_seuil' | 'push_ancien'
export function absenceReason(etat: RepoEtat | undefined) {
  if (etat === 'introuvable') return 'dépôt introuvable'
  if (etat === 'fork') return 'dépôt devenu un fork'
  if (etat === 'archive') return 'dépôt archivé'
  if (etat === 'sous_seuil') return 'dépôt sous le seuil d’étoiles'
  if (etat === 'push_ancien') return 'dépôt sans push depuis 6 mois'
  if (etat === 'ok') return 'skill supprimé ou déplacé dans son dépôt'
  return 'absent de ce tour'
}

// --- Garde-fous avant publication. Un tour abîmé échoue au lieu de réécrire la bibliothèque.
export const FLOORS = { catalogue: 0.1, depots: 0.2, verdicts: 0.05 }
type FloorSkill = { id: string; repo: string; statut: string; note_qualite: number | null; nom: string; sha_epingle: string; risques: unknown; packs?: Record<string, string> }
type FloorPack = { type: string; recommandes: { id: string; nom?: string; repo?: string }[] }
const pct = (value: number) => `${Math.round(value * 100)} %`

export function checkFloors(before: FloorSkill[], after: FloorSkill[], previousPacks: FloorPack[], packs: FloorPack[]) {
  const problems: string[] = []
  const live = (list: FloorSkill[]) => list.filter(skill => skill.statut !== 'archive')
  const [was, now] = [live(before), live(after)]
  if (was.length) {
    const lost = (was.length - now.length) / was.length
    if (lost > FLOORS.catalogue) problems.push(`le catalogue perd ${pct(lost)} de ses skills (${was.length} → ${now.length})`)
  }
  const nowRepos = new Set(now.map(skill => skill.repo.toLowerCase()))
  const byIdBefore = new Map(before.map(skill => [skill.id, skill]))
  const packRepos = new Set(previousPacks.flatMap(pack => pack.recommandes.map(item => (item.repo ?? byIdBefore.get(item.id)?.repo ?? '').toLowerCase()).filter(Boolean)))
  if (packRepos.size) {
    const missing = [...packRepos].filter(repo => !nowRepos.has(repo))
    if (missing.length / packRepos.size > FLOORS.depots) problems.push(`${pct(missing.length / packRepos.size)} des dépôts en tête de pack manquent (${missing.slice(0, 5).join(', ')})`)
  }
  if (now.length) {
    const unjudged = now.filter(skill => skill.note_qualite === null).length / now.length
    if (unjudged > FLOORS.verdicts) problems.push(`${pct(unjudged)} des skills sans verdict`)
  }
  const existed = new Set(previousPacks.filter(pack => pack.recommandes.length).map(pack => pack.type))
  for (const pack of packs) if (existed.has(pack.type) && !pack.recommandes.length) problems.push(`le pack ${pack.type} n'a plus de tête`)
  return problems
}

// Schéma minimal des fiches et des packs : ce que skill-master et le site lisent sans vérifier.
export function checkSchema(skills: FloorSkill[], packs: FloorPack[]) {
  const problems: string[] = []
  const ids = new Set<string>()
  for (const skill of skills) {
    const label = String(skill.id)
    if (typeof skill.id !== 'string' || !skill.id) problems.push(`fiche sans id : ${JSON.stringify(skill).slice(0, 80)}`)
    if (ids.has(label)) problems.push(`id en double : ${label}`)
    ids.add(label)
    if (!/^[\w.-]+\/[\w.-]+$/.test(skill.repo ?? '') || skill.repo.split('/').includes('..')) problems.push(`dépôt invalide : ${label}`)
    if (!/^[0-9a-f]{40}$/.test(skill.sha_epingle ?? '')) problems.push(`commit épinglé invalide : ${label}`)
    if (!Array.isArray(skill.risques)) problems.push(`risques illisibles : ${label}`)
    if (skill.statut !== 'archive' && !/^[\w.:-]{1,64}$/.test(skill.nom ?? '')) problems.push(`nom refusé : ${label}`)
  }
  for (const pack of packs) {
    if (pack.recommandes.length > 8) problems.push(`le pack ${pack.type} a plus de 8 skills en tête`)
    for (const item of pack.recommandes) if (!ids.has(item.id)) problems.push(`le pack ${pack.type} cite un skill absent : ${item.id}`)
  }
  return problems
}

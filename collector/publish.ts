// Après le juge : cycle de vie, index léger pour skill-master, récapitulatif hebdomadaire.
// Compare la bibliothèque produite au dernier commit (HEAD).
//   - library/skills.json : statut « archive » (disparu du tour alors qu'il était dans un pack ou
//     avait des retours : dépôt archivé, sans push depuis 6 mois ou sous le seuil), remplace_par.
//   - library/index/<type>.json : les skills de chaque pack, avec juste ce qu'il faut pour les proposer.
//   - library/RECAP.md : changements de têtes et raisons, lisible en 30 secondes.
//   - collector/out/issue.md et la sortie `tete_changee` (GitHub Actions) si une tête change.
//
//   node collector/publish.ts
import { execFileSync } from 'node:child_process'
import { appendFile, mkdir, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CACHE, LIBRARY, ROOT, readJson, writeJson } from './lib.ts'

type Risk = { code: string; gravite: string }
type Skill = {
  id: string
  nom: string
  repo: string
  chemin_skill: string
  skill_md: string
  sha_epingle: string
  resume_fr: string | null
  dernier_commit: string | null
  note_qualite: number | null
  risques: Risk[]
  risque_max: string | null
  statut: string
  remplace_par: string | null
  retours_amdy?: unknown[]
  packs?: Record<string, string>
  date_ajout: string
  raison_statut?: string
}
type PackItem = { id: string; nom: string }
type Pack = {
  type: string
  recommandes: PackItem[]
  ajouts: PackItem[]
  changements?: { entrant: string; sortant: string | null; raison: string; entrant_id?: string; sortant_id?: string }[]
  ecartes?: { nom: string; raison: string }[]
}

const fromHead = <T>(path: string, fallback: T): T => {
  try {
    return JSON.parse(execFileSync('git', ['-C', ROOT, 'show', `HEAD:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })) as T
  } catch {
    return fallback
  }
}

const today = new Date().toISOString().slice(0, 10)
const library = await readJson<{ skills: Skill[] } & Record<string, unknown>>(join(LIBRARY, 'skills.json'), { skills: [] })
const before = fromHead<{ skills: Skill[] }>('library/skills.json', { skills: [] })
const types = (await readdir(join(LIBRARY, 'packs'))).filter(file => file.endsWith('.json')).map(file => file.replace(/\.json$/, '')).sort()
const packs = await Promise.all(types.map(type => readJson<Pack>(join(LIBRARY, 'packs', `${type}.json`), { type, recommandes: [], ajouts: [] })))
const previousPacks = types.map(type => fromHead<Pack>(`library/packs/${type}.json`, { type, recommandes: [], ajouts: [] }))
const run = await readJson<{ duree_min?: number; cout?: { total: number } } | null>(join(CACHE, 'last-run.json'), null)

// Cycle de vie. L'inactivité se juge au niveau du dépôt : le collecteur écarte déjà les dépôts
// sans push depuis 6 mois. Un skill qui disparaît du tour alors qu'il comptait (pack ou retours)
// passe en archive ; un vieux dossier dans un dépôt vivant n'est pas archivé.
const archived: { nom: string; raison: string }[] = []
const present = new Set(library.skills.map(skill => skill.id))
for (const old of before.skills) {
  if (present.has(old.id)) continue
  const mattered = Object.keys(old.packs ?? {}).length > 0 || (old.retours_amdy ?? []).length > 0
  if (!mattered) continue
  const raison = old.statut === 'archive' ? old.raison_statut : 'absent de ce tour (dépôt archivé, sous le seuil, ou skill supprimé)'
  library.skills.push({ ...old, statut: 'archive', raison_statut: raison, packs: {} })
  if (old.statut !== 'archive') archived.push({ nom: old.nom, raison: raison ?? '' })
}
const byId = new Map(library.skills.map(skill => [skill.id, skill]))
for (const pack of packs) {
  for (const change of pack.changements ?? []) {
    const out = change.sortant_id ? byId.get(change.sortant_id) : undefined
    if (out && change.entrant) out.remplace_par = change.entrant
  }
}
await writeJson(join(LIBRARY, 'skills.json'), library)

// Index léger.
const brief = (item: PackItem, place: string) => {
  const skill = byId.get(item.id)
  return skill
    ? {
        id: skill.id, nom: skill.nom, place, repo: skill.repo, chemin_skill: skill.chemin_skill, skill_md: skill.skill_md,
        sha_epingle: skill.sha_epingle, resume_fr: skill.resume_fr, note: skill.note_qualite, risque_max: skill.risque_max,
        risques: skill.risques.filter(risk => risk.gravite === 'critique' || risk.gravite === 'eleve').map(risk => risk.code).slice(0, 3),
      }
    : null
}
for (const pack of packs) {
  await writeJson(join(LIBRARY, 'index', `${pack.type}.json`), {
    genere_le: new Date().toISOString(),
    type: pack.type,
    note: 'Index léger pour skill-master : les skills de ce pack seulement. Le détail complet est dans library/skills.json.',
    recommandes: pack.recommandes.map(item => brief(item, 'recommande')).filter(Boolean),
    ajouts: pack.ajouts.map(item => brief(item, 'ajout')).filter(Boolean),
  })
}

// Récapitulatif.
const headChanges = packs.map((pack, i) => {
  const was = new Set((previousPacks[i]?.recommandes ?? []).map(item => item.id))
  const now = new Set(pack.recommandes.map(item => item.id))
  const moved = [...now].some(id => !was.has(id)) || [...was].some(id => !now.has(id))
  return { pack, moved }
})
const changed = headChanges.filter(item => item.moved)
const known = new Set(before.skills.map(skill => skill.id))
const newSkills = library.skills.filter(skill => !known.has(skill.id) && skill.statut !== 'archive').length
const lines = [
  `# Récapitulatif SKILLMASTER — ${today}`,
  '',
  `${changed.length ? `**${changed.length} pack(s) changent de tête.**` : '**Aucune tête de pack ne change.**'} ` +
    `${newSkills} skill(s) nouveaux, ${archived.length} archivé(s)` +
    `${run?.cout ? `, coût ${run.cout.total.toFixed(2)} $` : ''}${run?.duree_min !== undefined ? `, ${run.duree_min} min` : ''}.`,
  '',
]
for (const { pack, moved } of headChanges) {
  if (!moved) continue
  lines.push(`## ${pack.type}`)
  for (const change of pack.changements ?? []) lines.push(`- ${change.sortant ?? '—'} → **${change.entrant || '—'}** : ${change.raison}`)
  if (!(pack.changements ?? []).length) lines.push('- composition modifiée (épinglage ou règle d’Amdy)')
  lines.push('')
}
const removed = packs.flatMap(pack => (pack.ecartes ?? []).map(item => `${item.nom} (${pack.type})`))
if (removed.length) lines.push(`Écartés (hors stack) : ${removed.slice(0, 12).join(', ')}${removed.length > 12 ? '…' : ''}`, '')
if (archived.length) lines.push(`Archivés : ${archived.slice(0, 12).map(item => item.nom).join(', ')}${archived.length > 12 ? '…' : ''}`, '')
lines.push(`Têtes inchangées : ${headChanges.filter(item => !item.moved).map(item => item.pack.type).join(', ') || 'aucune'}.`)
const recap = `${lines.join('\n')}\n`
await writeFile(join(LIBRARY, 'RECAP.md'), recap)

if (changed.length) {
  await mkdir(join(ROOT, 'collector', 'out'), { recursive: true })
  await writeFile(join(ROOT, 'collector', 'out', 'issue.md'), recap)
}
if (process.env.GITHUB_OUTPUT) await appendFile(process.env.GITHUB_OUTPUT, `tete_changee=${changed.length ? 'true' : 'false'}\n`)
console.log(recap)

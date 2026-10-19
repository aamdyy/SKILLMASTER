// Calibrage par l'usage réel : les skills qu'Amdy invoque le plus doivent finir en haut de
// leur pack. Compare leur place dans la bibliothèque actuelle et dans une version
// précédente (un commit git), et donne aussi leur rang d'après la seule note du juge, sans
// le bonus d'usage, pour voir si le juge lui-même s'améliore.
//
//   node collector/calibrate.ts [--avant <commit>] [--min 5]
import { execFileSync } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { LIBRARY, ROOT, isTrustedRepo, readJson } from './lib.ts'
import { loadUsage } from './usage.ts'

type Entry = { id: string; repo: string; nom: string; note_qualite: number | null; note_juge?: number | null; categories: string[]; types_detectes?: string[] }
type Pack = { type: string; recommandes: { id: string }[]; ajouts: { id: string }[] }

const argv = process.argv.slice(2)
const at = argv.indexOf('--avant')
const ref = at >= 0 ? argv[at + 1] : undefined
const minAt = argv.indexOf('--min')
const MIN = minAt >= 0 ? Number(argv[minAt + 1]) : 5

const fromGit = <T>(path: string, fallback: T): T => {
  if (!ref) return fallback
  try {
    return JSON.parse(execFileSync('git', ['-C', ROOT, 'show', `${ref}:${path}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })) as T
  } catch {
    return fallback
  }
}

const types = (await readdir(join(LIBRARY, 'packs'))).filter(file => file.endsWith('.json')).map(file => file.replace(/\.json$/, ''))
const now = {
  skills: (await readJson<{ skills: Entry[] }>(join(LIBRARY, 'skills.json'), { skills: [] })).skills,
  packs: await Promise.all(types.map(type => readJson<Pack>(join(LIBRARY, 'packs', `${type}.json`), { type, recommandes: [], ajouts: [] }))),
}
const before = {
  skills: fromGit<{ skills: Entry[] }>('library/skills.json', { skills: [] }).skills,
  packs: types.map(type => fromGit<Pack>(`library/packs/${type}.json`, { type, recommandes: [], ajouts: [] })),
}

const find = (list: Entry[], repo: string, name: string) =>
  list.find(entry => entry.repo.toLowerCase() === repo.toLowerCase() && entry.nom.toLowerCase() === name.toLowerCase())
const place = (packs: Pack[], id: string | undefined) => {
  if (!id) return '-'
  for (const pack of packs) {
    const r = pack.recommandes.findIndex(item => item.id === id)
    if (r >= 0) return `${pack.type} : recommandé n° ${r + 1}`
    const a = pack.ajouts.findIndex(item => item.id === id)
    if (a >= 0) return `${pack.type} : ajout n° ${a + 1}`
  }
  return 'hors pack'
}
// Rang dans le type d'après la seule note du juge : parmi les skills que le juge ET la
// détection rangent dans ce type.
const judgeRank = (entry: Entry | undefined) => {
  if (!entry || entry.note_juge === undefined || entry.note_juge === null) return '-'
  const type = entry.categories.find(category => (entry.types_detectes ?? []).includes(category))
  if (!type) return 'sans type confirmé'
  const peers = now.skills
    .filter(other => other.categories.includes(type) && (other.types_detectes ?? []).includes(type) && other.note_juge !== null && other.note_juge !== undefined)
    .sort((a, b) => (b.note_juge ?? 0) - (a.note_juge ?? 0))
  return `${type} : ${peers.findIndex(other => other.id === entry.id) + 1}/${peers.length} (note ${entry.note_juge})`
}

const usage = await loadUsage()
const candidates = now.skills.filter(entry => isTrustedRepo(entry.repo) && (usage.get(entry.nom.toLowerCase())?.invocations ?? 0) >= MIN)
const rows = candidates
  .map(entry => {
    const previous = find(before.skills, entry.repo, entry.nom)
    return {
      skill: entry.nom,
      invocations: usage.get(entry.nom.toLowerCase())?.invocations ?? 0,
      [`avant (${ref ?? '-'})`]: place(before.packs, previous?.id),
      maintenant: place(now.packs, entry.id),
      'rang juge seul (sans bonus)': judgeRank(entry),
    }
  })
  .sort((a, b) => b.invocations - a.invocations)
console.table(rows)

const top = (packs: Pack[], ids: (string | undefined)[]) => ids.filter(id => id && packs.some(pack => pack.recommandes.some(item => item.id === id))).length
console.log(
  `En tête de pack (recommandés) : ${top(before.packs, candidates.map(entry => find(before.skills, entry.repo, entry.nom)?.id))}/${candidates.length} avant, ` +
    `${top(now.packs, candidates.map(entry => entry.id))}/${candidates.length} maintenant.`,
)

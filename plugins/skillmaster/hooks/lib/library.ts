// Les packs de la bibliothèque (copie locale de library/index/<type>.json) mis en une proposition :
// la tête (8 au plus, en alternant les packs quand plusieurs types correspondent) et les ajouts.
import type { SkillmasterItem } from '../../types'

export type Gravite = 'critique' | 'eleve' | 'moyen' | 'info'
export type IndexSkill = {
  id: string
  nom: string
  repo: string
  resume_fr: string | null
  editeur_confiance?: boolean
  risque_max: Gravite | null
}
export type PackIndex = { type: string; genere_le?: string; recommandes: IndexSkill[]; ajouts: IndexSkill[] }
export type Overrides = {
  epingles?: Record<string, { repo: string; nom: string }[]>
  epingles_ajout?: Record<string, { repo: string; nom: string }[]>
  jamais?: string[]
}

export const MAX_TETE = 8

export function buildPack(packs: PackIndex[], overrides: Overrides, ignores: ReadonlySet<string>) {
  const pinned = new Set(
    packs.flatMap(pack => [...(overrides.epingles?.[pack.type] ?? []), ...(overrides.epingles_ajout?.[pack.type] ?? [])].map(pin => `${pack.type}|${pin.repo}|${pin.nom}`)),
  )
  const never = new Set(overrides.jamais ?? [])
  const seen = new Set<string>()
  const keep = (skill: IndexSkill) => !never.has(skill.nom) && !ignores.has(skill.id) && !ignores.has(skill.nom) && !seen.has(skill.id)
  const item = (skill: IndexSkill, type: string): Omit<SkillmasterItem, 'n'> => {
    seen.add(skill.id)
    return {
      id: skill.id,
      nom: skill.nom,
      resume: skill.resume_fr,
      type,
      epingle: pinned.has(`${type}|${skill.repo}|${skill.nom}`),
      confiance: skill.editeur_confiance === true,
      risque: skill.risque_max,
    }
  }

  const tete: Omit<SkillmasterItem, 'n'>[] = []
  const reste: Omit<SkillmasterItem, 'n'>[] = []
  const queues = packs.map(pack => pack.recommandes.map(skill => ({ skill, type: pack.type })))
  while (queues.some(queue => queue.length)) {
    for (const queue of queues) {
      let next = queue.shift()
      while (next && !keep(next.skill)) next = queue.shift()
      if (!next) continue
      if (tete.length < MAX_TETE) tete.push(item(next.skill, next.type))
      else reste.push(item(next.skill, next.type))
    }
  }
  for (const pack of packs) {
    for (const skill of pack.ajouts) if (keep(skill)) reste.push(item(skill, pack.type))
  }
  return {
    tete: tete.map((one, i) => ({ ...one, n: i + 1 })),
    ajouts: reste.map((one, i) => ({ ...one, n: tete.length + i + 1 })),
  }
}

// « ce qu'il fait → ce qu'il améliore » : la partie après la flèche, ce que le skill améliore.
export const gain = (resume: string | null) => {
  if (!resume) return ''
  const arrow = resume.indexOf('→')
  return (arrow === -1 ? resume : resume.slice(arrow + 1)).trim()
}

// Nombres tapés dans le champ libre du dialogue : « 1 3 12 », « 1-5, 9 ». Ceux hors liste sont ignorés.
export function parseNumbers(text: string, max: number) {
  const picked = new Set<number>()
  for (const match of text.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?/g)) {
    const from = Number(match[1])
    const to = match[2] === undefined ? from : Number(match[2])
    for (let n = Math.min(from, to); n <= Math.max(from, to) && n <= max; n++) if (n >= 1) picked.add(n)
  }
  return [...picked].sort((a, b) => a - b)
}

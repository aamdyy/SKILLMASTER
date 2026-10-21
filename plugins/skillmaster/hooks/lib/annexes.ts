import { fold } from './words'

// Les annexes d'un skill, pour l'outil mcp__skillmaster__skill. Un skill comme modern-web-guidance en a
// près de 200 : la liste se groupe par dossier, et un chemin deviné qui n'existe pas reçoit les fichiers
// les plus proches, pour que Claude n'essaie pas les chemins un par un.

export const ANNEXES_MAX = 400

// « guides/css/ : a.md, b.md », une ligne par dossier ; les fichiers de la racine d'abord, sur « ./ ».
export function groupAnnexes(paths: readonly string[]) {
  const groups = new Map<string, string[]>()
  for (const path of paths) {
    const cut = path.lastIndexOf('/')
    const dir = cut < 0 ? '.' : path.slice(0, cut)
    groups.set(dir, [...(groups.get(dir) ?? []), path.slice(cut + 1)])
  }
  return [...groups]
    .sort(([a], [b]) => (a === '.' ? -1 : b === '.' ? 1 : a.localeCompare(b)))
    .map(([dir, names]) => `${dir}/ : ${names.sort().join(', ')}`)
}

const IGNORED = new Set(['md', 'mdx', 'txt', 'json', 'yaml', 'yml', 'the', 'and', 'les', 'des'])
const words = (path: string) => fold(path).split(/[^a-z0-9]+/).filter(word => word.length > 1 && !IGNORED.has(word))
// « transition » et « transitions », « animation » et « animate » se répondent ; « view » et « viewport », non.
const close = (a: string, b: string) => {
  if (a === b) return true
  let common = 0
  while (common < a.length && a[common] === b[common]) common++
  return common >= 6 || (Math.min(a.length, b.length) >= 4 && common === Math.min(a.length, b.length) && Math.abs(a.length - b.length) <= 3)
}

// Les fichiers qui partagent au moins un mot avec le nom demandé, les plus proches d'abord : un mot du nom
// retrouvé dans le nom d'un fichier compte double, dans ses dossiers une fois ; un mot des dossiers demandés
// compte pour moitié. À égalité, le chemin le plus court passe devant.
export function nearest(wanted: string, paths: readonly string[], max = 8) {
  const name = words(wanted.split('/').pop() ?? '')
  const rest = words(wanted.split('/').slice(0, -1).join('/'))
  const hits = (list: string[], ref: string[]) => list.filter(word => ref.some(w => close(w, word))).length
  return paths
    .map(path => {
      const own = words(path.split('/').pop() ?? '')
      const dirs = words(path.split('/').slice(0, -1).join('/'))
      const strong = hits(own, name) * 2 + hits(dirs, name)
      return { path, strong, score: strong + (hits(own, rest) + hits(dirs, rest)) * 0.5 }
    })
    .filter(one => one.strong > 0)
    .sort((a, b) => b.score - a.score || a.path.length - b.path.length)
    .slice(0, max)
    .map(one => one.path)
}

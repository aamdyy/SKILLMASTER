// Type de projet d'après les fichiers du dossier (règles de detection.json) et d'après les mots du
// prompt, séparément : le mod demande à Amdy quand les deux diffèrent. Sans accès direct au disque : le
// mod passe $.fs.
import { findWords } from './words'

export type Entry = { name: string; kind: 'file' | 'dir' | 'other' }
export type Reader = {
  list: (path: string) => Promise<readonly Entry[]>
  read: (path: string) => Promise<string>
}

export type TypeRule = {
  nom: string
  texte: string
  dependances?: string[]
  sauf_dependances?: string[]
  fichiers?: string[]
  contenus?: { fichiers: string[]; motif: string; indice?: string }[]
  chemins?: string[]
  profondeur?: number
  mots?: string[]
}
export type DetectionRules = { sous_projets: string[]; ignorer: string[]; types: Record<string, TypeRule> }
export type Detection = { types: string[]; indices: string[]; source: 'fichiers' | 'mots' | null }

const MAX_DIRS = 400

const glob = (pattern: string) =>
  new RegExp(`^${pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*').replace(/\?/g, '.')}$`)

const join = (dir: string, name: string) => (dir.endsWith('/') ? `${dir}${name}` : `${dir}/${name}`)

// Le type d'après le dossier, sinon d'après le prompt : ce que /sm status et /sm check affichent.
export async function detect(fs: Reader, root: string, rules: DetectionRules, prompt = ''): Promise<Detection> {
  const files = await detectFiles(fs, root, rules)
  return files.types.length ? files : detectWords(prompt, rules)
}

// Le type d'après les mots du prompt, comptés en mots entiers.
export function detectWords(prompt: string, rules: DetectionRules): Detection {
  const types: string[] = []
  const indices: string[] = []
  for (const [type, rule] of Object.entries(rules.types)) {
    const words = findWords(prompt, rule.mots ?? [])
    if (!words.length) continue
    types.push(type)
    for (const word of words) if (!indices.includes(`« ${word} »`)) indices.push(`« ${word} »`)
  }
  return { types, indices, source: types.length ? 'mots' : null }
}

// Le type d'après les fichiers du dossier.
export async function detectFiles(fs: Reader, root: string, rules: DetectionRules): Promise<Detection> {
  const listed = new Map<string, Promise<readonly Entry[]>>()
  const list = (dir: string) => {
    if (!listed.has(dir)) listed.set(dir, fs.list(dir).catch(() => [] as Entry[]))
    return listed.get(dir)!
  }
  const read = (path: string) => fs.read(path).catch(() => null)

  // La racine, puis un niveau plus bas pour les monorepos (apps/*, packages/*).
  const scopes = [root]
  for (const parent of rules.sous_projets) {
    for (const entry of await list(join(root, parent))) {
      if (entry.kind === 'dir') scopes.push(join(join(root, parent), entry.name))
    }
  }
  const deps = new Map<string, string[]>()
  for (const scope of scopes) {
    const text = (await list(scope)).some(entry => entry.name === 'package.json') ? await read(join(scope, 'package.json')) : null
    let names: string[] = []
    try {
      const pkg = text ? (JSON.parse(text) as Record<string, Record<string, string> | undefined>) : {}
      names = [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {}), ...Object.keys(pkg.peerDependencies ?? {})]
    } catch {}
    deps.set(scope, names)
  }

  const types: string[] = []
  const indices: string[] = []
  const note = (indice: string) => {
    if (!indices.includes(indice)) indices.push(indice)
  }

  for (const [type, rule] of Object.entries(rules.types)) {
    let found = false
    for (const scope of scopes) {
      const scopeDeps = deps.get(scope) ?? []
      if ((rule.sauf_dependances ?? []).some(name => scopeDeps.includes(name))) continue
      const names = (await list(scope)).map(entry => entry.name)
      for (const pattern of rule.dependances ?? []) {
        for (const name of scopeDeps.filter(dep => glob(pattern).test(dep))) {
          found = true
          note(name)
        }
      }
      for (const pattern of rule.fichiers ?? []) {
        const hit = names.find(name => glob(pattern).test(name))
        if (hit) {
          found = true
          note(hit)
        }
      }
      for (const contenu of rule.contenus ?? []) {
        for (const file of contenu.fichiers) {
          // On ne lit que les fichiers présents : la liste du dossier parent le dit.
          const cut = file.lastIndexOf('/')
          const parent = cut === -1 ? scope : join(scope, file.slice(0, cut))
          if (!(await list(parent)).some(entry => entry.name === file.slice(cut + 1))) continue
          const text = await read(join(scope, file))
          if (text !== null && new RegExp(contenu.motif, 'i').test(text)) {
            found = true
            note(contenu.indice ?? file)
            break
          }
        }
      }
    }
    if (rule.chemins?.length) {
      const hit = await findPath(list, root, rule.chemins, rule.profondeur ?? 1, new Set(rules.ignorer))
      if (hit) {
        found = true
        note(hit)
      }
    }
    if (found) types.push(type)
  }
  return { types, indices, source: types.length ? 'fichiers' : null }
}

// Cherche un des chemins (segments avec *) sous les dossiers de la racine, jusqu'à `depth` niveaux.
async function findPath(list: (dir: string) => Promise<readonly Entry[]>, root: string, paths: string[], depth: number, ignored: Set<string>) {
  let level = [root]
  let visited = 0
  for (let d = 0; d < depth && level.length; d++) {
    const next: string[] = []
    for (const dir of level) {
      if (++visited > MAX_DIRS) return null
      for (const path of paths) {
        if (await matchPath(list, dir, path.split('/'))) return path.endsWith('.json') || path.endsWith('.md') ? path.split('/').pop()! : `${path}/`
      }
      for (const entry of await list(dir)) {
        // Les dossiers cachés (.claude/, .agents/…) sont de la configuration, pas du code : on n'y descend pas.
        if (entry.kind === 'dir' && !entry.name.startsWith('.') && !ignored.has(entry.name)) next.push(join(dir, entry.name))
      }
    }
    level = next
  }
  return null
}

async function matchPath(list: (dir: string) => Promise<readonly Entry[]>, dir: string, segments: string[]): Promise<boolean> {
  const [head, ...rest] = segments
  if (head === undefined) return true
  for (const entry of await list(dir)) {
    if (!glob(head).test(entry.name)) continue
    if (!rest.length) return true
    if (entry.kind === 'dir' && (await matchPath(list, join(dir, entry.name), rest))) return true
  }
  return false
}

// Dossier neuf : pas de CLAUDE.md, et presque rien d'autre que des fichiers cachés ou de départ.
const STARTER = /^(readme|license|licence)(\.\w+)?$/i
export async function isNewProject(fs: Reader, root: string) {
  const entries = await fs.list(root).catch(() => null)
  if (!entries) return false
  if (entries.some(entry => entry.name === 'CLAUDE.md')) return false
  return entries.filter(entry => !entry.name.startsWith('.') && !STARTER.test(entry.name)).length <= 3
}

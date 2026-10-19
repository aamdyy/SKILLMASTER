// Outil de skill-master sur la machine d'Amdy. Node 24, sans dépendance, rien n'est exécuté.
//
//   node sm.ts sync                         met à jour la copie en lecture seule de library/ dans
//                                           ~/.cache/skillmaster/library/ (seulement si library/ a changé sur main)
//   node sm.ts fetch [--projet] <id>…       prépare des skills des packs et rend un JSON avec,
//                                           pour chacun, ses risques et la décision à appliquer
//
// Priorité à la bibliothèque : un skill des packs se charge à son commit épinglé (sha_epingle),
// téléchargé une fois dans ~/.cache/skillmaster/skills/. L'archive locale
// (~/.claude/skills-archive/) ne sert qu'en secours, si le téléchargement échoue.
// Dans les deux cas, le scan de sécurité est refait ici, avec le barème partagé (scan.ts), et
// les alertes du juge sont reprises de l'index.
//
// Décision, par skill :
//   ecarte      risque critique : jamais chargé ;
//   une_ligne   éditeur de confiance (library/profil.json) à sa version épinglée, ou risque
//               « info » au plus : le risque s'affiche en une ligne, sans question ;
//   question    le reste : une seule question groupée par proposition.
//
// Le repo de dev ne bouge jamais. On ne télécharge que des skills présents dans library/index/,
// jamais une adresse libre. Les fichiers écrits sont en lecture seule et jamais exécutables.
import { execFileSync } from 'node:child_process'
import { chmod, lstat, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { BAREME, type Gravite, isTrustedPublisher, type Mode, type Risk, scanSkill, type SkillFile, worst } from './scan.ts'

const REPO = process.env.SM_REPO ?? 'aamdyy/SKILLMASTER'
const HOME_CACHE = join(homedir(), '.cache', 'skillmaster')
const LIBRARY = join(HOME_CACHE, 'library')
const SKILLS = join(HOME_CACHE, 'skills')
const ARCHIVE_MANIFEST = join(homedir(), '.claude', 'skills-archive', 'MANIFEST.json')
const MAX_FILES = 200
const MAX_SIZE = 1_000_000
const BINARY = /\.(exe|dll|so|dylib|bin|jar|wasm|class|app|pkg|dmg|zip|tar|gz|tgz|7z)$/i

type IndexEntry = {
  id: string
  nom: string
  place: string
  repo: string
  chemin_skill: string
  skill_md: string
  sha_epingle: string
  resume_fr: string | null
  risque_max: Gravite | null
  risque_max_projet?: Gravite | null
  risques: Risk[] | string[]
}
type TreeEntry = { path: string; mode: string; type: string; size?: number }
type Download = { dossier: string; files: SkillFile[]; ignores: { chemin: string; raison: string }[]; depuis_le_cache: boolean }
type ArchiveEntry = { name: string; kind: string; skill_md: string | null; depend_de?: string[] }

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN
  try {
    return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
  } catch {
    return ''
  }
}
const TOKEN = token()

async function github(path: string, accept = 'application/vnd.github+json') {
  const headers: Record<string, string> = { Accept: accept, 'User-Agent': 'skillmaster-skill-master', 'X-GitHub-Api-Version': '2022-11-28' }
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
  const response = await fetch(path.startsWith('http') ? path : `https://api.github.com${path}`, { headers })
  if (!response.ok) throw new Error(`GitHub ${response.status} sur ${path.split('?')[0]}`)
  return response
}

const readJsonFile = async <T>(path: string, fallback: T): Promise<T> => {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

// Lecture seule : fichiers 0444, dossiers 0555. `writable` rend la main avant un remplacement.
async function lock(dir: string, writable = false) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) await lock(path, writable)
    else if (entry.isFile()) await chmod(path, writable ? 0o644 : 0o444)
  }
  await chmod(dir, writable ? 0o755 : 0o555)
}

async function removeTree(dir: string) {
  try {
    await lock(dir, true)
  } catch {}
  await rm(dir, { recursive: true, force: true })
}

async function sync() {
  const marker = join(LIBRARY, '.commit')
  const local = (await readFile(marker, 'utf8').catch(() => '')).trim()
  let remote: { sha: string; date: string }
  try {
    const [last] = (await (await github(`/repos/${REPO}/commits?path=library&per_page=1`)).json()) as { sha: string; commit: { committer: { date: string } } }[]
    if (!last) throw new Error('aucun commit sur library/')
    remote = { sha: last.sha, date: last.commit.committer.date }
  } catch (error) {
    // Hors ligne ou sans accès : on garde la copie existante, en le disant.
    return { etat: local ? 'hors_ligne' : 'absent', commit: local.split(' ')[0] || null, date: local.split(' ')[1] || null, dossier: LIBRARY, erreur: String((error as Error).message) }
  }
  if (local.split(' ')[0] === remote.sha) return { etat: 'a_jour', commit: remote.sha, date: remote.date, dossier: LIBRARY }

  await mkdir(HOME_CACHE, { recursive: true })
  const work = await mkdtemp(join(tmpdir(), 'skillmaster-'))
  try {
    const archive = join(work, 'repo.tgz')
    await writeFile(archive, Buffer.from(await (await github(`/repos/${REPO}/tarball/${remote.sha}`)).arrayBuffer()))
    const out = join(work, 'out')
    await mkdir(out)
    execFileSync('tar', ['-xzf', archive, '-C', out, '--strip-components', '1'], { stdio: 'ignore' })
    await writeFile(join(out, 'library', '.commit'), `${remote.sha} ${remote.date}\n`)
    const next = `${LIBRARY}.new`
    await removeTree(next)
    await rename(join(out, 'library'), next)
    await lock(next)
    await removeTree(LIBRARY)
    await rename(next, LIBRARY)
  } finally {
    await rm(work, { recursive: true, force: true })
  }
  return { etat: local ? 'mis_a_jour' : 'installe', commit: remote.sha, date: remote.date, dossier: LIBRARY }
}

async function loadIndex() {
  const dir = join(LIBRARY, 'index')
  const entries: IndexEntry[] = []
  let bareme: string | undefined
  for (const file of await readdir(dir).catch(() => [] as string[])) {
    if (!file.endsWith('.json')) continue
    const index = await readJsonFile<{ bareme?: string; recommandes: IndexEntry[]; ajouts: IndexEntry[] }>(join(dir, file), { recommandes: [], ajouts: [] })
    bareme ??= index.bareme
    entries.push(...index.recommandes, ...index.ajouts)
  }
  return { entries, bareme }
}

// Télécharge le dossier du skill à son commit épinglé, une fois : le dossier porte le commit.
async function download(entry: IndexEntry): Promise<Download> {
  if (!/^[0-9a-f]{40}$/.test(entry.sha_epingle)) throw new Error(`commit épinglé invalide pour ${entry.id}`)
  const dest = join(SKILLS, `${entry.repo.replace('/', '__')}__${entry.chemin_skill.replaceAll('/', '__') || 'racine'}@${entry.sha_epingle.slice(0, 12)}`)
  const cached = await readJsonFile<{ files?: SkillFile[]; ignores?: Download['ignores'] } | null>(join(dest, '.skillmaster.json'), null)
  if (cached?.files) return { dossier: dest, files: cached.files, ignores: cached.ignores ?? [], depuis_le_cache: true }

  const treeish = entry.chemin_skill ? `${entry.sha_epingle}:${entry.chemin_skill}` : entry.sha_epingle
  const tree = (await (await github(`/repos/${entry.repo}/git/trees/${encodeURIComponent(treeish)}?recursive=1`)).json()) as { tree: TreeEntry[]; truncated: boolean }
  const files: SkillFile[] = tree.tree.filter(item => item.type === 'blob').map(item => ({ path: item.path, mode: item.mode, size: item.size }))
  const ignores: Download['ignores'] = []
  if (tree.truncated) ignores.push({ chemin: '*', raison: 'arbre tronqué par GitHub' })

  const work = `${dest}.part`
  await removeTree(work)
  await mkdir(work, { recursive: true })
  const wanted: { file: SkillFile; target: string }[] = []
  for (const file of files) {
    const target = resolve(work, file.path)
    const skip =
      relative(work, target).startsWith('..') ? 'chemin hors du dossier' :
      file.mode === '120000' ? 'lien symbolique, non suivi' :
      file.mode === '160000' ? 'sous-module' :
      BINARY.test(file.path) ? 'fichier binaire' :
      (file.size ?? 0) > MAX_SIZE ? 'plus de 1 Mo' :
      wanted.length >= MAX_FILES ? `plus de ${MAX_FILES} fichiers` : null
    if (skip) ignores.push({ chemin: file.path, raison: skip })
    else wanted.push({ file, target })
  }
  // 8 fichiers à la fois : un gros skill (plus de 100 annexes) ne fait pas attendre la proposition.
  let next = 0
  await Promise.all(Array.from({ length: Math.min(8, wanted.length) }, async () => {
    while (next < wanted.length) {
      const { file, target } = wanted[next++]!
      const url = `https://raw.githubusercontent.com/${entry.repo}/${entry.sha_epingle}/${[entry.chemin_skill, file.path].filter(Boolean).join('/').split('/').map(encodeURIComponent).join('/')}`
      const body = Buffer.from(await (await github(url, '*/*')).arrayBuffer())
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, body, { mode: 0o444 })
    }
  }))
  if (!files.some(file => file.path === 'SKILL.md')) {
    await removeTree(work)
    throw new Error(`pas de SKILL.md dans ${entry.repo}/${entry.chemin_skill} au commit ${entry.sha_epingle.slice(0, 12)}`)
  }
  const meta = { id: entry.id, repo: entry.repo, sha_epingle: entry.sha_epingle, files, ignores, telecharge_le: new Date().toISOString() }
  await writeFile(join(work, '.skillmaster.json'), `${JSON.stringify(meta, null, 2)}\n`, { mode: 0o444 })
  await lock(work)
  await removeTree(dest)
  await rename(work, dest)
  return { dossier: dest, files, ignores, depuis_le_cache: false }
}

// Liste des fichiers d'un skill de l'archive locale, avec les modes que lirait git.
async function listLocal(dir: string, prefix = ''): Promise<SkillFile[]> {
  const files: SkillFile[] = []
  for (const entry of await readdir(join(dir, prefix), { withFileTypes: true })) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name
    const info = await lstat(join(dir, path))
    if (info.isSymbolicLink()) files.push({ path, mode: '120000', size: info.size })
    else if (info.isDirectory()) files.push(...(await listLocal(dir, path)))
    else files.push({ path, mode: info.mode & 0o111 ? '100755' : '100644', size: info.size })
    if (files.length >= 400) break
  }
  return files
}

const juryAlerts = (entry: IndexEntry | undefined): Risk[] =>
  (entry?.risques ?? []).filter((risk): risk is Risk => typeof risk === 'object' && risk.source === 'juge')

async function prepare(id: string, mode: Mode, index: { entries: IndexEntry[]; bareme?: string }, trusted: Set<string>) {
  const entry = index.entries.find(item => item.id === id) ?? index.entries.find(item => item.nom === id)
  const name = entry?.nom ?? id
  let source: 'bibliotheque' | 'archive'
  let skillMd: string
  let dossier: string
  let files: SkillFile[]
  let extra: Record<string, unknown> = {}
  let failure: string | undefined

  try {
    if (!entry) throw new Error(`« ${id} » n'est dans aucun pack de ${join(LIBRARY, 'index')}`)
    const got = await download(entry)
    source = 'bibliotheque'
    dossier = got.dossier
    files = got.files
    skillMd = await readFile(join(dossier, 'SKILL.md'), 'utf8')
    extra = { sha_epingle: entry.sha_epingle, ignores: got.ignores, depuis_le_cache: got.depuis_le_cache }
  } catch (error) {
    // Secours : la copie de l'archive locale, sans version épinglée.
    failure = (error as Error).message
    const manifest = await readJsonFile<{ entrees: ArchiveEntry[] }>(ARCHIVE_MANIFEST, { entrees: [] })
    const local = manifest.entrees.find(item => item.name === name && item.skill_md)
    if (!local?.skill_md) return { id, nom: name, decision: 'indisponible', erreur: failure }
    source = 'archive'
    const real = await realpath(local.skill_md)
    dossier = dirname(real)
    files = await listLocal(dossier)
    skillMd = await readFile(real, 'utf8')
    extra = { kind: local.kind, depend_de: local.depend_de ?? [], ...(entry ? { erreur_bibliotheque: failure } : {}) }
  }

  const risks = [...scanSkill(skillMd, files), ...juryAlerts(entry)]
  const riskMax = worst(risks, mode)
  const isTrusted = source === 'bibliotheque' && !!entry && isTrustedPublisher(entry.repo, entry.chemin_skill, trusted)
  const decision = riskMax === 'critique' ? 'ecarte' : isTrusted || riskMax === null || riskMax === 'info' ? 'une_ligne' : 'question'
  // Le scan est refait sur le même commit que l'index : un écart signale un problème.
  const indexMax = mode === 'projet' ? entry?.risque_max_projet ?? entry?.risque_max : entry?.risque_max
  const divergence = source === 'bibliotheque' && index.bareme === BAREME && indexMax !== undefined && (indexMax ?? null) !== riskMax
  return {
    id: entry?.id ?? id,
    nom: name,
    repo: entry?.repo ?? null,
    source,
    editeur_confiance: isTrusted,
    decision,
    risque_max: riskMax,
    risques: risks
      .filter(risk => risk.gravite !== 'info' || (mode === 'projet' && risk.gravite_projet))
      .map(risk => ({ gravite: mode === 'projet' ? risk.gravite_projet ?? risk.gravite : risk.gravite, source: risk.source, code: risk.code, ...(risk.detail ? { detail: risk.detail } : {}) })),
    ...(divergence ? { divergence: `index : ${indexMax ?? 'aucun'}, scan local : ${riskMax ?? 'aucun'}` } : {}),
    dossier,
    skill_md: join(dossier, 'SKILL.md'),
    ...extra,
  }
}

async function fetchSkills(ids: string[], mode: Mode) {
  const index = await loadIndex()
  const profile = await readJsonFile<{ editeurs_confiance?: string[] }>(join(LIBRARY, 'profil.json'), {})
  const trusted = new Set((profile.editeurs_confiance ?? []).map(owner => owner.toLowerCase()))
  const skills: Awaited<ReturnType<typeof prepare>>[] = []
  for (const id of ids) skills.push(await prepare(id, mode, index, trusted))
  const names = (decision: string) => skills.filter(skill => skill.decision === decision).map(skill => skill.nom)
  return {
    mode,
    bareme: BAREME,
    a_confirmer: names('question'),
    ecartes: names('ecarte'),
    indisponibles: names('indisponible'),
    questions: names('question').length ? 1 : 0,
    skills,
  }
}

const args = process.argv.slice(2)
const command = args[0]
const mode: Mode = args.includes('--projet') ? 'projet' : 'session'
const ids = args.slice(1).filter(arg => arg !== '--projet')
try {
  if (command === 'sync') console.log(JSON.stringify(await sync()))
  else if (command === 'fetch' && ids.length) console.log(JSON.stringify(await fetchSkills(ids, mode), null, 2))
  else {
    console.error('usage : node sm.ts sync | node sm.ts fetch [--projet] <id ou nom>…')
    process.exitCode = 2
  }
} catch (error) {
  console.log(JSON.stringify({ erreur: (error as Error).message }))
  process.exitCode = 1
}

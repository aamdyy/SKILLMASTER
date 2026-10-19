// Outil de skill-master sur la machine d'Amdy. Node 24, sans dépendance, rien n'est exécuté.
//
//   node sm.ts sync          met à jour la copie en lecture seule de library/ dans
//                            ~/.cache/skillmaster/library/ (seulement si library/ a changé sur main)
//   node sm.ts fetch <id>    télécharge un skill des packs au commit épinglé (sha_epingle) dans
//                            ~/.cache/skillmaster/skills/, refait le scan de sécurité, rend un JSON
//
// Le repo de dev ne bouge jamais. On ne télécharge que des skills présents dans library/index/,
// jamais une adresse libre. Les fichiers écrits sont en lecture seule et jamais exécutables.
import { execFileSync } from 'node:child_process'
import { chmod, mkdir, mkdtemp, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'
import { type Risk, scanSkill, type SkillFile } from './scan.ts'

const REPO = process.env.SM_REPO ?? 'aamdyy/SKILLMASTER'
const HOME_CACHE = join(homedir(), '.cache', 'skillmaster')
const LIBRARY = join(HOME_CACHE, 'library')
const SKILLS = join(HOME_CACHE, 'skills')
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
  risque_max: string | null
  risques: string[]
}
type TreeEntry = { path: string; mode: string; type: string; size?: number }

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

async function findEntry(id: string): Promise<IndexEntry | null> {
  const dir = join(LIBRARY, 'index')
  for (const file of await readdir(dir).catch(() => [] as string[])) {
    if (!file.endsWith('.json')) continue
    const index = JSON.parse(await readFile(join(dir, file), 'utf8')) as { recommandes: IndexEntry[]; ajouts: IndexEntry[] }
    const found = [...index.recommandes, ...index.ajouts].find(entry => entry.id === id || entry.nom === id)
    if (found) return found
  }
  return null
}

async function fetchSkill(id: string) {
  const entry = await findEntry(id)
  if (!entry) throw new Error(`« ${id} » n'est dans aucun pack de ${join(LIBRARY, 'index')} : lance d'abord « sync », ou vérifie l'id`)
  if (!/^[0-9a-f]{40}$/.test(entry.sha_epingle)) throw new Error(`commit épinglé invalide pour ${entry.id}`)

  const dest = join(SKILLS, `${entry.repo.replace('/', '__')}__${entry.chemin_skill.replaceAll('/', '__') || 'racine'}@${entry.sha_epingle.slice(0, 12)}`)
  const report = join(dest, '.skillmaster.json')
  const cached = await readFile(report, 'utf8').catch(() => '')
  if (cached) return { ...JSON.parse(cached), depuis_le_cache: true }

  const treeish = entry.chemin_skill ? `${entry.sha_epingle}:${entry.chemin_skill}` : entry.sha_epingle
  const tree = (await (await github(`/repos/${entry.repo}/git/trees/${encodeURIComponent(treeish)}?recursive=1`)).json()) as { tree: TreeEntry[]; truncated: boolean }
  const files: SkillFile[] = tree.tree.filter(item => item.type === 'blob').map(item => ({ path: item.path, mode: item.mode, size: item.size }))
  const ignores: { chemin: string; raison: string }[] = []
  if (tree.truncated) ignores.push({ chemin: '*', raison: 'arbre tronqué par GitHub' })

  const work = `${dest}.part`
  await removeTree(work)
  await mkdir(work, { recursive: true })
  let skillMd = ''
  let written = 0
  for (const file of files) {
    const target = resolve(work, file.path)
    const skip =
      relative(work, target).startsWith('..') ? 'chemin hors du dossier' :
      file.mode === '120000' ? 'lien symbolique, non suivi' :
      file.mode === '160000' ? 'sous-module' :
      BINARY.test(file.path) ? 'fichier binaire' :
      (file.size ?? 0) > MAX_SIZE ? 'plus de 1 Mo' :
      written >= MAX_FILES ? `plus de ${MAX_FILES} fichiers` : null
    if (skip) {
      ignores.push({ chemin: file.path, raison: skip })
      continue
    }
    const url = `https://raw.githubusercontent.com/${entry.repo}/${entry.sha_epingle}/${[entry.chemin_skill, file.path].filter(Boolean).join('/').split('/').map(encodeURIComponent).join('/')}`
    const body = Buffer.from(await (await github(url, '*/*')).arrayBuffer())
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, body, { mode: 0o444 })
    if (file.path === 'SKILL.md') skillMd = body.toString('utf8')
    written++
  }
  if (!skillMd) {
    await removeTree(work)
    throw new Error(`pas de SKILL.md dans ${entry.repo}/${entry.chemin_skill} au commit ${entry.sha_epingle.slice(0, 12)}`)
  }

  const risques: Risk[] = scanSkill(skillMd, files)
  const result = {
    id: entry.id,
    nom: entry.nom,
    repo: entry.repo,
    sha_epingle: entry.sha_epingle,
    dossier: dest,
    skill_md: join(dest, 'SKILL.md'),
    fichiers: written,
    ignores,
    risques_scan: risques.map(risk => ({ gravite: risk.gravite, code: risk.code, detail: risk.detail })),
    risque_max_scan: risques[0]?.gravite ?? null,
    risques_index: entry.risques,
    risque_max_index: entry.risque_max,
    telecharge_le: new Date().toISOString(),
  }
  await writeFile(join(work, '.skillmaster.json'), `${JSON.stringify(result, null, 2)}\n`, { mode: 0o444 })
  await lock(work)
  await removeTree(dest)
  await rename(work, dest)
  return result
}

const [command, argument] = process.argv.slice(2)
try {
  if (command === 'sync') console.log(JSON.stringify(await sync()))
  else if (command === 'fetch' && argument) console.log(JSON.stringify(await fetchSkill(argument), null, 2))
  else {
    console.error('usage : node sm.ts sync | node sm.ts fetch <id ou nom>')
    process.exitCode = 2
  }
} catch (error) {
  console.log(JSON.stringify({ erreur: (error as Error).message }))
  process.exitCode = 1
}

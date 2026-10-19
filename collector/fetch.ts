// Collecteur SKILLMASTER : découvre des dépôts de skills, lit leurs SKILL.md au commit
// épinglé (texte seulement, rien n'est exécuté ni copié dans le repo), scanne les risques,
// présélectionne les skills à juger et écrit collector/.cache/selection.json.
//
//   GITHUB_TOKEN=$(gh auth token) node collector/fetch.ts --max-skills 400
//
// Options : --max-skills N (400), --min-stars N (20), --pushed-months N (6),
//           --max-repos N (400), --with-anthropic-directory (désactivé par défaut).
import { execFileSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { CACHE, LIBRARY, ROOT, OFFICIAL, REFERENCES, KEYWORDS, typesOf, frontmatter, graphql, log, pool, rawFile, readJson, rest, sha256, sleep, writeJson } from './lib.ts'
import { scanSkill, type Risk, type SkillFile } from './scan.ts'

const argv = process.argv.slice(2)
const option = (name: string, fallback: number) => {
  const at = argv.indexOf(`--${name}`)
  return at >= 0 ? Number(argv[at + 1]) : fallback
}
const MAX_SKILLS = option('max-skills', 400)
const MIN_STARS = option('min-stars', 20)
const PUSHED_MONTHS = option('pushed-months', 6)
const MAX_REPOS = option('max-repos', 400)
const PER_REPO_FETCH = 15
const PER_REFERENCE_FETCH = 60
const PER_REPO_SELECT = 10
const WITH_DIRECTORY = argv.includes('--with-anthropic-directory')
// Skills des packs du tour précédent (têtes et ajouts) : toujours retenus, pour que l'avantage
// au tenant s'applique. --keep-from <commit> les lit dans un commit, sinon dans library/packs.
const KEEP_AT = argv.indexOf('--keep-from')
const KEEP_REF = KEEP_AT >= 0 ? argv[KEEP_AT + 1] : undefined

const now = new Date()
const since = new Date(now)
since.setMonth(since.getMonth() - PUSHED_MONTHS)
const SINCE = since.toISOString().slice(0, 10)

const QUOTAS: Record<string, number> = {
  'site-web': 0.22, ios: 0.12, 'app-expo': 0.09, android: 0.09, video: 0.11, data: 0.14, 'outillage-claude-code': 0.14, autre: 0.09,
}
const PACK_QUERIES: Record<string, string[]> = {
  'site-web': ['nextjs skills', 'react skills claude', 'frontend skills claude', 'tailwind skill'],
  ios: ['swiftui skills', 'swift skills claude', 'ios skills claude'],
  'app-expo': ['expo skills', 'react native skills'],
  android: ['jetpack compose skills', 'android skills claude', 'kotlin skills claude'],
  video: ['remotion skills', 'video skills claude', 'ffmpeg skills'],
  data: ['data analysis skills claude', 'data science skills claude', 'sql skills claude'],
  'outillage-claude-code': ['claude code plugin', 'claude code hooks', 'claude code skills toolkit'],
}
const TOPICS = ['claude-skills', 'agent-skills', 'claude-code-skills', 'claude-skill', 'claude-code-plugin', 'claude-code-plugins', 'claude-code-marketplace']
const AWESOME = ['hesreallyhim/awesome-claude-code', 'ComposioHQ/awesome-claude-skills', 'VoltAgent/awesome-agent-skills', 'travisvn/awesome-claude-skills']
const SKIP_PATH = /(^|\/)(node_modules|\.git|tests?|__tests__|fixtures|__fixtures__|evals?|samples?|testdata|test-data|dist|build|vendor)(\/|$)|(^|\/)(ja|ja-JP|zh|zh-CN|zh-TW|ko|ko-KR|es|fr|de|ru|pt|pt-BR|it|tr|vi|i18n|locales?|translations?)(\/|$)|template/i

type Repo = {
  name: string
  sources: Set<string>
  stars: number
  pushedAt: string
  isArchived: boolean
  isFork: boolean
  license: string | null
  description: string
  sha: string
}

const repos = new Map<string, Repo>()
const discovered = (name: string, source: string) => {
  const key = name.replace(/\.git$/, '')
  const repo = repos.get(key.toLowerCase())
  if (repo) repo.sources.add(source)
  else repos.set(key.toLowerCase(), { name: key, sources: new Set([source]), stars: 0, pushedAt: '', isArchived: false, isFork: false, license: null, description: '', sha: '' })
}

type SearchPage = { items?: { full_name: string }[] }

async function search(query: string, pages: number, source: string) {
  for (let page = 1; page <= pages; page++) {
    const q = encodeURIComponent(`${query} stars:>=${MIN_STARS} pushed:>=${SINCE} archived:false fork:false`)
    const result = await rest<SearchPage>(`/search/repositories?q=${q}&sort=stars&order=desc&per_page=100&page=${page}`)
    await sleep(2_200) // la recherche est limitée à 30 requêtes par minute
    const items = result?.items ?? []
    for (const item of items) discovered(item.full_name, source)
    if (items.length < 100) break
  }
}

async function awesomeLinks(list: string) {
  const readme = await rest<{ content?: string }>(`/repos/${list}/readme`)
  if (!readme?.content) return
  const text = Buffer.from(readme.content, 'base64').toString('utf8')
  const links = new Set<string>()
  for (const match of text.matchAll(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?(?=[/)#?\s"'>\]]|$)/g)) {
    const [owner, name] = [match[1] as string, match[2] as string]
    if (['topics', 'orgs', 'sponsors', 'features', 'marketplace', 'apps'].includes(owner)) continue
    links.add(`${owner}/${name}`)
  }
  for (const link of [...links].slice(0, 400)) discovered(link, `awesome:${list}`)
}

async function officialMarketplace() {
  const market = await rest<{ content?: string }>('/repos/anthropics/claude-plugins-official/contents/.claude-plugin/marketplace.json')
  if (!market?.content) return
  const data = JSON.parse(Buffer.from(market.content, 'base64').toString('utf8')) as { plugins: { source: unknown }[] }
  for (const plugin of data.plugins) {
    const source = plugin.source as { url?: string } | string
    const url = typeof source === 'string' ? '' : (source.url ?? '')
    const match = url.match(/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?$/)
    if (match) discovered(`${match[1]}/${match[2]}`, 'marketplace-officielle')
  }
}

type RepoNode = {
  nameWithOwner: string
  stargazerCount: number
  pushedAt: string
  isArchived: boolean
  isFork: boolean
  description: string | null
  licenseInfo: { spdxId: string } | null
  defaultBranchRef: { target: { oid: string } } | null
} | null

async function metadata() {
  const all = [...repos.values()]
  for (let start = 0; start < all.length; start += 40) {
    const batch = all.slice(start, start + 40)
    const fields = 'nameWithOwner stargazerCount pushedAt isArchived isFork description licenseInfo { spdxId } defaultBranchRef { target { oid } }'
    const query = `query { ${batch
      .map((repo, i) => {
        const [owner, name] = repo.name.split('/')
        return `r${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { ${fields} }`
      })
      .join('\n')} }`
    let data: Record<string, RepoNode> = {}
    try {
      data = await graphql<Record<string, RepoNode>>(query)
    } catch (error) {
      log('GraphQL métadonnées :', String(error).slice(0, 200))
    }
    batch.forEach((repo, i) => {
      const node = data[`r${i}`]
      if (!node) return
      repo.name = node.nameWithOwner
      repo.stars = node.stargazerCount
      repo.pushedAt = node.pushedAt
      repo.isArchived = node.isArchived
      repo.isFork = node.isFork
      repo.description = node.description ?? ''
      repo.license = node.licenseInfo?.spdxId ?? null
      repo.sha = node.defaultBranchRef?.target.oid ?? ''
    })
  }
}

type TreeEntry = { path: string; mode: string; type: string; size?: number }
type Candidate = {
  id: string
  repo: string
  dir: string
  skillMdPath: string
  sha: string
  files: SkillFile[]
  name: string
  description: string
  frontmatterKeys: string[]
  hash: string
  types: string[]
  contentTypes: string[]
  prescore: number
  risks: Risk[]
  repoStars: number
  repoPushedAt: string
  license: string | null
  repoDescription: string
  sources: string[]
  isOfficial: boolean
  skillsInRepo: number
}

async function skillsOf(repo: Repo): Promise<Candidate[]> {
  const tree = await rest<{ tree?: TreeEntry[]; truncated?: boolean }>(`/repos/${repo.name}/git/trees/${repo.sha}?recursive=1`)
  const entries = tree?.tree ?? []
  const skillMds = entries.filter(entry => entry.type === 'blob' && /(^|\/)SKILL\.md$/i.test(entry.path) && !SKIP_PATH.test(entry.path))
  const isOfficial = repo.name.toLowerCase().startsWith('anthropics/')
  const isReference = repo.sources.has('reference')
  const ranked = skillMds
    .map(entry => ({
      entry,
      isKept: keepIds.has(`${repo.name}/${entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : ''}`.toLowerCase()),
      hint: typesOf(entry.path)[0] !== 'autre' ? 0 : 1,
      depth: entry.path.split('/').length,
    }))
    .sort((a, b) => Number(b.isKept) - Number(a.isKept) || a.hint - b.hint || a.depth - b.depth || a.entry.path.localeCompare(b.entry.path))
    .slice(0, isReference || [...keepIds].some(id => id.startsWith(`${repo.name.toLowerCase()}/`)) ? PER_REFERENCE_FETCH : PER_REPO_FETCH)
  const found = await pool(ranked, 8, async ({ entry }) => {
    const text = await rawFile(repo.name, repo.sha, entry.path)
    if (!text) return null
    const dir = entry.path.includes('/') ? entry.path.slice(0, entry.path.lastIndexOf('/')) : ''
    const files: SkillFile[] = entries
      .filter(file => file.type === 'blob' && (dir === '' ? !file.path.includes('/') || file.path === entry.path : file.path.startsWith(`${dir}/`)))
      .map(file => ({ path: dir ? file.path.slice(dir.length + 1) : file.path, mode: file.mode, size: file.size }))
      .slice(0, 400)
    const { fields } = frontmatter(text)
    const name = fields.name || dir.split('/').pop() || repo.name.split('/')[1] || 'skill'
    const description = (fields.description ?? '').slice(0, 1_536)
    const stars = repo.stars
    const fresh = (now.getTime() - new Date(repo.pushedAt).getTime()) / 86_400_000 < 60 ? 1 : 0
    const prescore =
      Math.log10(stars + 1) * 2 + fresh + (isOfficial ? 3 : 0) + (isReference ? 2 : 0) + (description.length >= 40 ? 0.5 : -1) - (skillMds.length > 60 ? 1 : 0)
    return {
      id: `${repo.name}/${dir || name}`.toLowerCase(),
      repo: repo.name,
      dir,
      skillMdPath: entry.path,
      sha: repo.sha,
      files,
      name,
      description,
      frontmatterKeys: Object.keys(fields),
      hash: sha256(text),
      types: typesOf(`${entry.path} ${name} ${description}`),
      contentTypes: typesOf(`${entry.path} ${name} ${description} ${text.slice(0, 4_000)}`),
      prescore,
      risks: scanSkill(text, files),
      repoStars: stars,
      repoPushedAt: repo.pushedAt,
      license: repo.license,
      repoDescription: repo.description,
      sources: [...repo.sources],
      isOfficial,
      skillsInRepo: skillMds.length,
    } satisfies Candidate
  })
  return found.filter((candidate): candidate is Candidate => candidate !== null)
}

// Noms des skills de la bibliothèque locale d'Amdy (facultatif : vide si le manifeste manque).
let priorityNames = new Set<string>()
let keepIds = new Set<string>()
async function loadKeepIds() {
  const types = (await readdir(join(LIBRARY, 'packs')).catch(() => [] as string[])).filter(file => file.endsWith('.json'))
  for (const file of types) {
    try {
      const text = KEEP_REF
        ? execFileSync('git', ['-C', ROOT, 'show', `${KEEP_REF}:library/packs/${file}`], { encoding: 'utf8' })
        : await readFile(join(LIBRARY, 'packs', file), 'utf8')
      const pack = JSON.parse(text) as { recommandes?: { id: string }[]; ajouts?: { id: string }[] }
      for (const item of [...(pack.recommandes ?? []), ...(pack.ajouts ?? [])]) keepIds.add(item.id)
    } catch {}
  }
}
async function loadPriorityNames() {
  const manifest = await readJson<{ entrees?: { name: string }[] }>(join(homedir(), '.claude', 'skills-archive', 'MANIFEST.json'), {})
  priorityNames = new Set((manifest.entrees ?? []).map(entry => entry.name.split(':').pop()!.toLowerCase()))
}

function select(candidates: Candidate[]) {
  const byHash = new Map<string, Candidate>()
  const byIdentity = new Map<string, Candidate>()
  const merged = { hash: 0, identity: 0 }
  // Les skills à garder passent avant leurs copies : c'est leur id qui survit à la déduplication.
  for (const candidate of candidates.sort((a, b) => Number(keepIds.has(b.id)) - Number(keepIds.has(a.id)) || b.prescore - a.prescore)) {
    const identity = `${candidate.name.toLowerCase()}|${candidate.description.toLowerCase().slice(0, 120)}`
    if (byHash.has(candidate.hash)) {
      merged.hash++
      continue
    }
    if (byIdentity.has(identity)) {
      merged.identity++
      continue
    }
    byHash.set(candidate.hash, candidate)
    byIdentity.set(identity, candidate)
  }
  const unique = [...byHash.values()]
  const chosen: Candidate[] = []
  const perRepo = new Map<string, number>()
  const perType = new Map<string, number>()
  const take = (candidate: Candidate) => {
    chosen.push(candidate)
    perRepo.set(candidate.repo, (perRepo.get(candidate.repo) ?? 0) + 1)
  }
  // D'abord les skills qui portent le nom d'un skill déjà utilisé par Amdy, pris dans les
  // dépôts officiels ou de référence : ils servent d'étalon face aux nouveaux venus.
  for (const candidate of unique) if (keepIds.has(candidate.id) && chosen.length < MAX_SKILLS) take(candidate)
  for (const candidate of unique) {
    if (chosen.includes(candidate)) continue
    const isTrusted = candidate.isOfficial || candidate.sources.includes('reference')
    if (isTrusted && priorityNames.has(candidate.name.toLowerCase()) && chosen.length < MAX_SKILLS) take(candidate)
  }
  for (const candidate of unique) {
    if (chosen.includes(candidate)) continue
    if (chosen.length >= MAX_SKILLS) break
    if ((perRepo.get(candidate.repo) ?? 0) >= PER_REPO_SELECT) continue
    const open = candidate.types.find(type => (perType.get(type) ?? 0) < Math.round((QUOTAS[type] ?? 0) * MAX_SKILLS))
    if (!open) continue
    perType.set(open, (perType.get(open) ?? 0) + 1)
    take(candidate)
  }
  for (const candidate of unique) {
    if (chosen.length >= MAX_SKILLS) break
    if (chosen.includes(candidate) || (perRepo.get(candidate.repo) ?? 0) >= PER_REPO_SELECT) continue
    take(candidate)
  }
  return { chosen, unique: unique.length, merged }
}

type HistoryNode = { object: { history: { nodes: { committedDate: string }[] } } | null } | null

async function lastCommits(chosen: Candidate[]) {
  for (let start = 0; start < chosen.length; start += 30) {
    const batch = chosen.slice(start, start + 30)
    const query = `query { ${batch
      .map((skill, i) => {
        const [owner, name] = skill.repo.split('/')
        return `s${i}: repository(owner: ${JSON.stringify(owner)}, name: ${JSON.stringify(name)}) { object(expression: ${JSON.stringify(skill.sha)}) { ... on Commit { history(first: 1, path: ${JSON.stringify(skill.skillMdPath)}) { nodes { committedDate } } } } }`
      })
      .join('\n')} }`
    try {
      const data = await graphql<Record<string, HistoryNode>>(query)
      batch.forEach((skill, i) => {
        const date = data[`s${i}`]?.object?.history.nodes[0]?.committedDate
        ;(skill as Candidate & { lastCommit?: string }).lastCommit = date
      })
    } catch (error) {
      log('GraphQL historique :', String(error).slice(0, 200))
    }
  }
}

// Étoiles reçues sur 30 jours : événements WatchEvent (300 au plus). Exact pour un petit
// dépôt, minorant pour un gros, ce que le champ `methode` indique.
async function starVelocity(repoNames: string[]) {
  const limit = now.getTime() - 30 * 86_400_000
  const velocity = new Map<string, { value: number; methode: string }>()
  await pool(repoNames, 6, async name => {
    let count = 0
    let isComplete = false
    for (let page = 1; page <= 3; page++) {
      const events = await rest<{ type: string; created_at: string }[]>(`/repos/${name}/events?per_page=100&page=${page}`)
      if (!events?.length) {
        isComplete = true
        break
      }
      for (const event of events) if (event.type === 'WatchEvent' && new Date(event.created_at).getTime() >= limit) count++
      const oldest = events[events.length - 1]
      if (!oldest || new Date(oldest.created_at).getTime() < limit) {
        isComplete = true
        break
      }
    }
    velocity.set(name, { value: count, methode: isComplete ? 'events-30j' : 'events-minorant' })
  })
  return velocity
}

async function main() {
  await loadKeepIds()
  log(`${keepIds.size} skills des packs précédents à garder`)
  log(`seuils : ≥ ${MIN_STARS} étoiles, push depuis le ${SINCE}, ${MAX_SKILLS} skills au plus`)
  if (WITH_DIRECTORY) log('annuaire Anthropic non documenté : demandé, mais pas encore branché dans cette version')
  for (const repo of OFFICIAL) discovered(repo, 'officiel')
  await officialMarketplace()
  for (const list of AWESOME) await awesomeLinks(list)
  for (const topic of TOPICS) await search(`topic:${topic}`, 2, `topic:${topic}`)
  for (const repo of REFERENCES) discovered(repo, 'reference')
  // Nom et description seulement : chercher aussi dans les README fait remonter de gros
  // dépôts qui ne font que mentionner le sujet (remotion-dev/skills était passé sous la barre).
  for (const [type, queries] of Object.entries(PACK_QUERIES)) for (const query of queries) await search(`${query} in:name,description`, 1, `recherche:${type}`)
  log(`${repos.size} dépôts découverts`)

  await metadata()
  const excluded = { introuvables: 0, forks: 0, archives: 0, sous_seuil_etoiles: 0, push_trop_ancien: 0 }
  const kept = [...repos.values()]
    .filter(repo => {
      const isOfficial = OFFICIAL.includes(repo.name)
      if (!repo.sha) return excluded.introuvables++, false
      if (repo.isFork) return excluded.forks++, false
      if (repo.isArchived) return excluded.archives++, false
      if (!isOfficial && repo.stars < MIN_STARS) return excluded.sous_seuil_etoiles++, false
      if (!isOfficial && repo.pushedAt < SINCE) return excluded.push_trop_ancien++, false
      return true
    })
    .sort((a, b) => b.stars - a.stars)
  const searched = kept.filter(repo =>
    [...repo.sources].some(source => source.startsWith('recherche:') || ['officiel', 'marketplace-officielle', 'reference'].includes(source)),
  )
  const scanned = [...new Set([...searched, ...kept.slice(0, MAX_REPOS)])]
  log(`${kept.length} dépôts passent les seuils, ${scanned.length} sont parcourus ; écartés :`, excluded)

  const candidates = (await pool(scanned, 6, skillsOf)).flat()
  log(`${candidates.length} SKILL.md lus`)
  await loadPriorityNames()
  const { chosen, unique, merged } = select(candidates)
  log(`${unique} skills uniques (${merged.hash} copies identiques et ${merged.identity} quasi-copies fusionnées), ${chosen.length} retenus pour le juge`)

  await lastCommits(chosen)
  const velocity = await starVelocity([...new Set(chosen.map(skill => skill.repo))])
  const output = chosen.map(skill => ({ ...skill, stars30d: velocity.get(skill.repo) ?? null }))

  const perType: Record<string, number> = {}
  for (const skill of output) for (const type of skill.types) perType[type] = (perType[type] ?? 0) + 1
  await writeJson(join(CACHE, 'selection.json'), {
    generatedAt: now.toISOString(),
    params: { MAX_SKILLS, MIN_STARS, PUSHED_MONTHS, SINCE, MAX_REPOS, WITH_DIRECTORY },
    stats: { discovered: repos.size, kept: kept.length, excluded, scanned: scanned.length, skillMds: candidates.length, unique, merged, chosen: output.length, perType },
    repoStars: Object.fromEntries(kept.map(repo => [repo.name, repo.stars])),
    skills: output,
  })
  log('écrit : collector/.cache/selection.json', perType)
}

await main()

// Usage réel d'Amdy : compteurs d'invocations de Claude Code (~/.claude.json, skillUsage),
// ramenés au nom de frontmatter des skills grâce au manifeste de la bibliothèque locale.
// Il reste sur la machine d'Amdy : la bibliothèque publique ne le lit ni ne le publie (décision
// du 2026-10-20). Il sert au calibrage (calibrate.ts) et à un éventuel classement perso côté skill-master.
//   node collector/usage.ts   → écrit docs/local/usage-amdy.json (ignoré par git)
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { ROOT, frontmatter, log, readJson, writeJson } from './lib.ts'

export type Usage = { invocations: number; dernier: string | null }
export const USAGE_FILE = join(ROOT, 'docs', 'local', 'usage-amdy.json')

type Manifest = { entrees?: { name: string; skill_md?: string | null }[] }
type ClaudeJson = { skillUsage?: Record<string, { usageCount?: number; lastUsedAt?: number }> }

export async function loadUsage(): Promise<Map<string, Usage>> {
  const home = homedir()
  const manifest = await readJson<Manifest>(join(home, '.claude', 'skills-archive', 'MANIFEST.json'), {})
  const aliases = new Map<string, string>()
  for (const entry of manifest.entrees ?? []) {
    if (!entry.skill_md) continue
    try {
      const { fields } = frontmatter(await readFile(entry.skill_md, 'utf8'))
      aliases.set(entry.name.toLowerCase(), (fields.name || entry.name).toLowerCase())
    } catch {}
  }
  const claude = await readJson<ClaudeJson>(join(home, '.claude.json'), {})
  const usage = new Map<string, Usage>()
  for (const [key, value] of Object.entries(claude.skillUsage ?? {})) {
    const folder = (key.split(':').pop() ?? key).toLowerCase()
    const name = aliases.get(folder) ?? folder
    const before = usage.get(name) ?? { invocations: 0, dernier: null }
    const last = value.lastUsedAt ? new Date(value.lastUsedAt).toISOString().slice(0, 10) : null
    usage.set(name, {
      invocations: before.invocations + (value.usageCount ?? 0),
      dernier: [before.dernier, last].filter(Boolean).sort().pop() ?? null,
    })
  }
  return usage
}

// Relevé local : les compteurs du moment, par nom de skill, en gardant les relevés figés déjà notés.
if (process.argv[1]?.endsWith('usage.ts')) {
  const before = await readJson<Record<string, unknown>>(USAGE_FILE, {})
  const usage = await loadUsage()
  await writeJson(USAGE_FILE, {
    ...before,
    note: 'Usage réel d’Amdy, local et ignoré par git. Jamais publié dans library/.',
    releve_le: new Date().toISOString().slice(0, 10),
    source: '~/.claude.json (skillUsage)',
    skills: Object.fromEntries([...usage].sort(([a], [b]) => a.localeCompare(b))),
  })
  log(`usage : ${usage.size} skills relevés dans ${USAGE_FILE}`)
}

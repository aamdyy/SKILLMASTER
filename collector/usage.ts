// Usage réel d'Amdy : compteurs d'invocations de Claude Code (~/.claude.json, skillUsage),
// ramenés au nom de frontmatter des skills grâce au manifeste de la bibliothèque locale.
// Lu à l'exécution sur la machine d'Amdy ; seuls des compteurs atterrissent dans library/.
import { readFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { frontmatter, readJson } from './lib.ts'

export type Usage = { invocations: number; dernier: string | null }

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

// Bonus de note finale : +0,5 (1 à 4 invocations), +1 (5 à 9), +1,5 (10 et plus).
export function usageBonus(invocations: number) {
  if (invocations >= 10) return 1.5
  if (invocations >= 5) return 1
  if (invocations >= 1) return 0.5
  return 0
}

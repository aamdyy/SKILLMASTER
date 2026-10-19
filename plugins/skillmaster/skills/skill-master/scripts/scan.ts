// Scanner statique : repère les risques d'un skill sans rien exécuter, à partir du texte
// du SKILL.md et de la liste de ses fichiers (chemins, modes et tailles de l'arbre git).
// v2 : un motif trouvé dans un bloc de code d'exemple descend d'un cran, et une phrase
// d'injection citée pour mettre en garde n'est qu'une mention.
// Partagé par le collecteur (collector/scan.ts le réexporte) et par skill-master, qui refait
// le scan sur la machine d'Amdy avant de charger un skill téléchargé. Sans dépendance.

export type Frontmatter = Record<string, string>

// Lecture volontairement simple : clés de premier niveau, valeurs sur une ou plusieurs lignes.
export function frontmatter(text: string): { fields: Frontmatter; raw: string } {
  const match = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return { fields: {}, raw: '' }
  const raw = match[1] ?? ''
  const fields: Frontmatter = {}
  let key = ''
  for (const line of raw.split(/\r?\n/)) {
    const head = line.match(/^([A-Za-z][\w-]*):\s?(.*)$/)
    if (head) {
      key = head[1] as string
      fields[key] = (head[2] ?? '').trim()
    } else if (key) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim()
    }
  }
  for (const name of Object.keys(fields)) {
    fields[name] = (fields[name] ?? '').replace(/^["'>|-]+\s*/, '').replace(/["']$/, '').trim()
  }
  return { fields, raw }
}

export type Gravite = 'critique' | 'eleve' | 'moyen' | 'info'
export type Risk = { code: string; gravite: Gravite; detail?: string; source: 'scan' | 'juge' }
export type SkillFile = { path: string; mode: string; size?: number }

const ORDER: Gravite[] = ['critique', 'eleve', 'moyen', 'info']
const lower = (gravite: Gravite): Gravite => ORDER[Math.min(ORDER.indexOf(gravite) + 1, ORDER.length - 1)] as Gravite

const SCRIPT = /\.(sh|bash|zsh|py|js|mjs|cjs|ts|ps1|rb|pl)$/i
const BINARY = /\.(exe|dll|so|dylib|bin|jar|wasm|class|app|pkg|dmg)$/i
const WARNING = /\b(never|don['’]t|do not|must not|beware|watch (out )?for|treat\b.*\bas data|if\b.*\bcontains|ne jamais|n['’]obéis|méfie)/i

type Pattern = { re: RegExp; code: string; gravite: Gravite; isInjection?: true }

const PATTERNS: Pattern[] = [
  { re: /!`[^`\n]+`|^```!/gm, code: 'shell inline exécuté au chargement (!`…`)', gravite: 'critique' },
  { re: /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh|python3?)\b/gi, code: 'télécharge et exécute un script (curl | sh)', gravite: 'critique' },
  { re: /ignore (all )?(previous|prior|above) instructions|disregard (all )?(previous|prior) instructions/gi, code: 'phrase d’injection de prompt', gravite: 'critique', isInjection: true },
  { re: /do not (tell|inform|show) the user|without (asking|telling) the user/gi, code: 'consigne de cacher des actions à l’utilisateur', gravite: 'critique', isInjection: true },
  { re: /--dangerously-skip-permissions|bypassPermissions/gi, code: 'contourne les permissions', gravite: 'critique' },
  { re: /<\/?system(-reminder)?>/gi, code: 'fausse balise système', gravite: 'eleve', isInjection: true },
  { re: /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/gi, code: 'suppression récursive (rm -rf)', gravite: 'eleve' },
  { re: /~\/\.ssh|~\/\.aws|\bid_rsa\b|security find-generic-password/gi, code: 'accès à des secrets locaux', gravite: 'eleve' },
  { re: /(edit|modify|write|update)[^\n]{0,40}(settings\.json|CLAUDE\.md|hooks\.json)/gi, code: 'modifie la configuration de Claude Code', gravite: 'eleve' },
  { re: /[​-‏‪-‮⁦-⁩]/g, code: 'caractères invisibles ou bidirectionnels', gravite: 'eleve' },
  { re: /[A-Za-z0-9+/]{200,}={0,2}/g, code: 'bloc base64 long', gravite: 'moyen' },
  { re: /\beval\s*\(|child_process|subprocess\.[a-z]+\([^)]*shell\s*=\s*True|os\.system\(/gi, code: 'exécution dynamique de code', gravite: 'moyen' },
]

function fences(text: string) {
  return [...text.matchAll(/^(```|~~~)[^\n]*\n[\s\S]*?^\1/gm)].map(match => [match.index ?? 0, (match.index ?? 0) + match[0].length] as const)
}

function lineAt(text: string, index: number) {
  return text.slice(text.lastIndexOf('\n', index) + 1, text.indexOf('\n', index) === -1 ? undefined : text.indexOf('\n', index))
}

export function scanSkill(skillMd: string, files: SkillFile[]): Risk[] {
  const risks = new Map<string, Risk>()
  const add = (code: string, gravite: Gravite, detail?: string) => {
    const before = risks.get(code)
    if (!before || ORDER.indexOf(gravite) < ORDER.indexOf(before.gravite)) risks.set(code, { code, gravite, detail, source: 'scan' })
  }

  const { fields } = frontmatter(skillMd)
  const tools = fields['allowed-tools']
  if (tools !== undefined) {
    add('frontmatter allowed-tools', /\bBash\b|\*/.test(tools) ? 'eleve' : 'moyen', tools.slice(0, 80))
  }
  if (fields.hooks !== undefined) add('frontmatter hooks (actifs toute la session)', 'critique')
  if (fields.shell !== undefined) add(`frontmatter shell: ${fields.shell}`, 'moyen')

  const blocks = fences(skillMd)
  const inBlock = (index: number) => blocks.some(([start, end]) => index >= start && index < end)
  for (const { re, code, gravite, isInjection } of PATTERNS) {
    for (const match of skillMd.matchAll(re)) {
      const index = match.index ?? 0
      if (isInjection && WARNING.test(lineAt(skillMd, index))) {
        add(`${code} (citée pour mettre en garde)`, 'info')
      } else if (inBlock(index)) {
        add(`${code} (dans un exemple de code, à vérifier)`, lower(gravite))
      } else {
        add(code, gravite)
      }
    }
  }

  const scripts: string[] = []
  for (const file of files) {
    const name = file.path
    if (/(^|\/)\.claude-plugin\/plugin\.json$/.test(name)) add('plugin.json : chargé comme plugin', 'eleve')
    if (/(^|\/)hooks\/hooks\.json$|(^|\/)hooks\.json$/.test(name)) add('hooks.json : peut embarquer un mod', 'critique')
    if (/(^|\/)\.mcp\.json$/.test(name)) add('.mcp.json : serveur MCP', 'eleve')
    if (/(^|\/)bin\//.test(name)) add('dossier bin/', 'eleve')
    if (BINARY.test(name)) add('fichier binaire', 'eleve', name)
    if (file.mode === '120000') add('lien symbolique', 'moyen', name)
    if (file.mode === '100755') add('fichier exécutable', 'moyen', name)
    if (SCRIPT.test(name)) scripts.push(name)
    if ((file.size ?? 0) > 1_000_000) add('fichier de plus de 1 Mo', 'info', name)
  }
  if (scripts.length) add('scripts embarqués', 'moyen', scripts.slice(0, 5).join(', '))

  return [...risks.values()].sort((a, b) => ORDER.indexOf(a.gravite) - ORDER.indexOf(b.gravite))
}

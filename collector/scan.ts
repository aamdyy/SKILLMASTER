// Scanner statique : repère les risques d'un skill sans rien exécuter, à partir du texte
// du SKILL.md et de la liste de ses fichiers (chemins, modes et tailles de l'arbre git).
import { frontmatter } from './lib.ts'

export type Gravite = 'critique' | 'eleve' | 'moyen' | 'info'
export type Risk = { code: string; gravite: Gravite; detail?: string; source: 'scan' | 'juge' }
export type SkillFile = { path: string; mode: string; size?: number }

const SCRIPT = /\.(sh|bash|zsh|py|js|mjs|cjs|ts|ps1|rb|pl)$/i
const BINARY = /\.(exe|dll|so|dylib|bin|jar|wasm|class|app|pkg|dmg)$/i

const PATTERNS: { re: RegExp; code: string; gravite: Gravite }[] = [
  { re: /!`[^`\n]+`|^```!/m, code: 'shell inline exécuté au chargement (!`…`)', gravite: 'critique' },
  { re: /\b(curl|wget)\b[^\n|]*\|\s*(sudo\s+)?(sh|bash|zsh|python3?)\b/i, code: 'télécharge et exécute un script (curl | sh)', gravite: 'critique' },
  { re: /ignore (all )?(previous|prior|above) instructions|disregard (all )?(previous|prior) instructions/i, code: 'phrase d’injection de prompt', gravite: 'critique' },
  { re: /do not (tell|inform|show) the user|without (asking|telling) the user/i, code: 'consigne de cacher des actions à l’utilisateur', gravite: 'critique' },
  { re: /--dangerously-skip-permissions|bypassPermissions/i, code: 'contourne les permissions', gravite: 'critique' },
  { re: /<\/?system(-reminder)?>/i, code: 'fausse balise système', gravite: 'eleve' },
  { re: /\brm\s+-[a-z]*r[a-z]*f|\brm\s+-[a-z]*f[a-z]*r/i, code: 'suppression récursive (rm -rf)', gravite: 'eleve' },
  { re: /~\/\.ssh|~\/\.aws|\bid_rsa\b|security find-generic-password/i, code: 'accès à des secrets locaux', gravite: 'eleve' },
  { re: /(edit|modify|write|update)[^\n]{0,40}(settings\.json|CLAUDE\.md|hooks\.json)/i, code: 'modifie la configuration de Claude Code', gravite: 'eleve' },
  { re: /[​-‏‪-‮⁦-⁩]/, code: 'caractères invisibles ou bidirectionnels', gravite: 'eleve' },
  { re: /[A-Za-z0-9+/]{200,}={0,2}/, code: 'bloc base64 long', gravite: 'moyen' },
  { re: /\beval\s*\(|child_process|subprocess\.[a-z]+\([^)]*shell\s*=\s*True|os\.system\(/i, code: 'exécution dynamique de code', gravite: 'moyen' },
]

export function scanSkill(skillMd: string, files: SkillFile[]): Risk[] {
  const risks = new Map<string, Risk>()
  const add = (code: string, gravite: Gravite, detail?: string) => {
    if (!risks.has(code)) risks.set(code, { code, gravite, detail, source: 'scan' })
  }

  const { fields } = frontmatter(skillMd)
  const tools = fields['allowed-tools']
  if (tools !== undefined) {
    add('frontmatter allowed-tools', /\bBash\b|\*/.test(tools) ? 'eleve' : 'moyen', tools.slice(0, 80))
  }
  if (fields.hooks !== undefined) add('frontmatter hooks (actifs toute la session)', 'critique')
  if (fields.shell !== undefined) add(`frontmatter shell: ${fields.shell}`, 'moyen')

  for (const { re, code, gravite } of PATTERNS) if (re.test(skillMd)) add(code, gravite)

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

  const order: Gravite[] = ['critique', 'eleve', 'moyen', 'info']
  return [...risks.values()].sort((a, b) => order.indexOf(a.gravite) - order.indexOf(b.gravite))
}

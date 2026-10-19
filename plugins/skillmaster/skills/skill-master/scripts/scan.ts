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

// Barème b1 (décidé par Amdy le 2026-10-19), le même pour l'index de la bibliothèque et pour
// le scan refait sur sa machine :
//   critique : shell inline au chargement, curl | sh, hooks, contournement des permissions,
//              injection non citée. Toujours écarté.
//   élevé    : ce qui peut agir. Scripts ou exécutables que le SKILL.md demande de lancer,
//              binaires, bin/, plugin.json, .mcp.json, rm -rf, config de Claude Code, secrets,
//              et les alertes du juge classées réseau, exécution ou destruction.
//   moyen    : lien symbolique, long bloc base64, alertes du juge sur les données ou une consigne.
//   info     : allowed-tools seul (élevé avec Bash quand on garde le skill pour le projet),
//              scripts que rien ne lance, fichier de plus de 1 Mo, mise en garde citée.
// Un motif trouvé dans un exemple de code descend d'un cran.
export const BAREME = 'b1'
export type Gravite = 'critique' | 'eleve' | 'moyen' | 'info'
export type Categorie = 'reseau' | 'execution' | 'destruction' | 'donnees' | 'consigne' | 'autre'
export type Mode = 'session' | 'projet'
export type Risk = {
  code: string
  gravite: Gravite
  detail?: string
  source: 'scan' | 'juge'
  categorie?: Categorie
  // Gravité quand le skill est gardé pour le projet, si elle diffère (allowed-tools avec Bash).
  gravite_projet?: Gravite
}
export type SkillFile = { path: string; mode: string; size?: number }

// Contenu tiers hébergé chez Anthropic : les plugins de la communauté, et les plugins de
// partenaires de la marketplace officielle (external_plugins/). Jamais « officiel » ni « de confiance ».
const THIRD_PARTY = [/^anthropics\/claude-plugins-community$/i, /^anthropics\/claude-plugins-official\/external_plugins(\/|$)/i]
const isThirdParty = (repo: string, path: string) => THIRD_PARTY.some(re => re.test(repo) || re.test(`${repo}/${path}`))

// Officiel : écrit par Anthropic, dans un dépôt anthropics/.
export const isFirstParty = (repo: string, path = '') => repo.toLowerCase().startsWith('anthropics/') && !isThirdParty(repo, path)

// Éditeur de confiance d'Amdy (library/profil.json), en excluant le contenu tiers hébergé chez lui.
export const isTrustedPublisher = (repo: string, path: string, publishers: Set<string>) =>
  publishers.has(repo.split('/')[0]!.toLowerCase()) && !isThirdParty(repo, path)

export const CATEGORIES: Categorie[] = ['reseau', 'execution', 'destruction', 'donnees', 'consigne', 'autre']
export const ORDER: Gravite[] = ['critique', 'eleve', 'moyen', 'info']
const lower = (gravite: Gravite): Gravite => ORDER[Math.min(ORDER.indexOf(gravite) + 1, ORDER.length - 1)] as Gravite

// Gravité d'une alerte du juge, d'après la catégorie que Haiku lui a donnée (collector/classify.ts).
// Sans catégorie (pas encore classée), elle reste « moyen ».
export function alertGravity(categorie: Categorie | undefined): Gravite {
  if (categorie === 'reseau' || categorie === 'execution' || categorie === 'destruction') return 'eleve'
  if (categorie === 'donnees' || categorie === 'consigne' || categorie === undefined) return 'moyen'
  return 'info'
}

export const gravityOf = (risk: Risk, mode: Mode = 'session') => (mode === 'projet' ? risk.gravite_projet ?? risk.gravite : risk.gravite)

export function worst(risks: Risk[], mode: Mode = 'session'): Gravite | null {
  return risks.map(risk => gravityOf(risk, mode)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0] ?? null
}

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
  { re: /[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, code: 'caractères invisibles ou bidirectionnels', gravite: 'eleve' },
  { re: /[A-Za-z0-9+/]{200,}={0,2}/g, code: 'bloc base64 long', gravite: 'moyen' },
  { re: /\beval\s*\(|child_process|subprocess\.[a-z]+\([^)]*shell\s*=\s*True|os\.system\(/gi, code: 'exécution dynamique de code', gravite: 'moyen' },
]

function fences(text: string) {
  return [...text.matchAll(/^(```|~~~)[^\n]*\n[\s\S]*?^\1/gm)].map(match => [match.index ?? 0, (match.index ?? 0) + match[0].length] as const)
}

function lineAt(text: string, index: number) {
  return text.slice(text.lastIndexOf('\n', index) + 1, text.indexOf('\n', index) === -1 ? undefined : text.indexOf('\n', index))
}

// Un script compte comme « lancé » si le SKILL.md cite son chemin ou son nom de fichier.
const isLaunched = (skillMd: string, path: string) => skillMd.includes(path) || skillMd.includes(path.split('/').pop() ?? path)

export function scanSkill(skillMd: string, files: SkillFile[]): Risk[] {
  const risks = new Map<string, Risk>()
  const add = (code: string, gravite: Gravite, detail?: string, gravite_projet?: Gravite) => {
    const before = risks.get(code)
    if (!before || ORDER.indexOf(gravite) < ORDER.indexOf(before.gravite)) {
      risks.set(code, { code, gravite, source: 'scan', ...(detail ? { detail } : {}), ...(gravite_projet ? { gravite_projet } : {}) })
    }
  }

  const { fields } = frontmatter(skillMd)
  const tools = fields['allowed-tools']
  // allowed-tools n'accorde rien quand skill-master lit le skill pour la session ; il pré-autorise
  // vraiment ces outils quand le skill est gardé dans le projet.
  if (tools !== undefined) add('frontmatter allowed-tools', 'info', tools.slice(0, 80), /\bBash\b|\*/.test(tools) ? 'eleve' : undefined)
  if (fields.hooks !== undefined) add('frontmatter hooks (actifs toute la session)', 'critique')
  if (fields.shell !== undefined) add(`frontmatter shell: ${fields.shell}`, 'info')

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

  const launched: string[] = []
  const idle: string[] = []
  for (const file of files) {
    const name = file.path
    if (/(^|\/)\.claude-plugin\/plugin\.json$/.test(name)) add('plugin.json : chargé comme plugin', 'eleve')
    if (/(^|\/)hooks\/hooks\.json$|(^|\/)hooks\.json$/.test(name)) add('hooks.json : peut embarquer un mod', 'critique')
    if (/(^|\/)\.mcp\.json$/.test(name)) add('.mcp.json : serveur MCP', 'eleve')
    if (/(^|\/)bin\//.test(name)) add('dossier bin/', 'eleve')
    if (BINARY.test(name)) add('fichier binaire', 'eleve', name)
    if (file.mode === '120000') add('lien symbolique', 'moyen', name)
    if (SCRIPT.test(name) || file.mode === '100755') (isLaunched(skillMd, name) ? launched : idle).push(name)
    if ((file.size ?? 0) > 1_000_000) add('fichier de plus de 1 Mo', 'info', name)
  }
  if (launched.length) add('scripts lancés par le SKILL.md', 'eleve', launched.slice(0, 5).join(', '))
  if (idle.length) add('scripts embarqués, que le SKILL.md ne lance pas', 'info', idle.slice(0, 5).join(', '))

  return [...risks.values()].sort((a, b) => ORDER.indexOf(a.gravite) - ORDER.indexOf(b.gravite))
}

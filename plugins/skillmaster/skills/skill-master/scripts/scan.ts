// Scanner statique : repère les risques d'un skill sans rien exécuter, à partir du texte du
// SKILL.md, du texte de ses annexes et de la liste de ses fichiers (chemins, modes et tailles).
// Un motif trouvé dans un bloc de code d'exemple descend d'un cran, et une phrase d'injection
// citée pour mettre en garde n'est qu'une mention.
// Partagé par le collecteur (collector/scan.ts le réexporte) et par skill-master, qui refait
// le scan sur la machine de l'utilisateur avant de charger un skill téléchargé. Sans dépendance.
// Tests : tests/scan.test.ts. Un scan propre ne prouve pas qu'un skill est sûr.

export type Frontmatter = Record<string, string>

const unescapeKey = (key: string) =>
  key
    .replace(/\\x([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\u([0-9a-f]{4})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/\\(.)/g, '$1')

const KEY = /^(?:"((?:[^"\\]|\\.)*)"|'((?:[^']|'')*)'|([A-Za-z][\w-]*))[ \t]*:[ \t]*(.*)$/
// Formes YAML qu'on ne lit pas ligne à ligne : clé complexe, fusion, ancre, alias, tag, directive, mapping JSON.
const UNUSUAL_LINE = /^(?:\?(?:\s|$)|<<\s*:|[&*!%{[])/

// Lecture sans dépendance des clés de premier niveau, valeurs sur une ou plusieurs lignes. Elle
// accepte les clés entre guillemets ou suivies d'une espace, et ce qu'elle ne sait pas lire
// atterrit dans `inhabituel` : une forme YAML rare n'est jamais muette.
export function frontmatter(text: string): { fields: Frontmatter; raw: string; inhabituel: string[] } {
  const match = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return { fields: {}, raw: '', inhabituel: [] }
  const raw = match[1] ?? ''
  const fields: Frontmatter = {}
  const inhabituel: string[] = []
  let key = ''
  for (const line of raw.split(/\r?\n/)) {
    if (line.startsWith('#')) continue
    const isIndented = /^[ \t]/.test(line)
    const head = isIndented ? null : line.match(KEY)
    if (head) {
      key = head[1] !== undefined ? unescapeKey(head[1]) : (head[2] ?? head[3]) as string
      const value = (head[4] ?? '').trim()
      fields[key] = value
      if (/^[&*!]/.test(value)) inhabituel.push(key)
    } else if (!isIndented && UNUSUAL_LINE.test(line)) {
      inhabituel.push(line.slice(0, 24))
    } else if (key) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim()
    }
  }
  // Mapping JSON à la racine : toutes les clés comptent, imbriquées comprises.
  if (raw.trimStart().startsWith('{')) for (const found of raw.matchAll(/["']?([A-Za-z][\w-]*)["']?\s*:/g)) fields[found[1] as string] ??= ''
  for (const name of Object.keys(fields)) {
    fields[name] = (fields[name] ?? '').replace(/^["'>|-]+\s*/, '').replace(/["']$/, '').trim()
  }
  return { fields, raw, inhabituel }
}

// Barème b2 (2026-11-05). Le même pour l'index de la bibliothèque et pour le scan refait sur la
// machine de l'utilisateur. Il mesure ce qui peut agir, selon le mode : en session, un skill n'est
// que du texte servi par l'outil ; gardé dans le projet, il devient natif.
//   critique : exécution au chargement, curl | sh, hooks, contournement des permissions,
//              injection non citée, dans le SKILL.md. Toujours écarté, pour tous les éditeurs.
//   élevé    : consignes dangereuses (rm -rf, secrets, config de Claude Code, faux système,
//              caractères invisibles), destruction ou injection relevée par le juge, frontmatter
//              illisible. En projet aussi : scripts lancés, allowed-tools avec Bash, CLAUDE.md embarqué.
//   moyen    : scripts lancés (en session), réseau, exécution et données relevés par le juge,
//              lien symbolique, long bloc base64.
//   info     : mise en garde citée, scripts que rien ne lance, fichiers que la copie retire.
// Un motif trouvé dans un exemple de code descend d'un cran, et dans une annexe, d'un cran de plus.
export const BAREME = 'b2'
export type Gravite = 'critique' | 'eleve' | 'moyen' | 'info'
export type Categorie = 'reseau' | 'execution' | 'destruction' | 'donnees' | 'consigne' | 'autre'
export type Mode = 'session' | 'projet'
export type Risk = {
  code: string
  gravite: Gravite
  detail?: string
  source: 'scan' | 'juge' | 'licence'
  categorie?: Categorie
  // Gravité quand le skill est gardé pour le projet, si elle diffère (allowed-tools avec Bash).
  gravite_projet?: Gravite
}
export type SkillFile = { path: string; mode: string; size?: number; sha?: string }
export type SkillText = { path: string; text: string }

// Nom d'un skill : il passe dans le prompt système, un commit, une issue ou un nom de dossier.
export const SAFE_NAME = /^[\w.:-]{1,64}$/
export const isSafeName = (name: string) => SAFE_NAME.test(name)

// Contenu tiers hébergé chez Anthropic : les plugins de la communauté, et les plugins de
// partenaires de la marketplace officielle (external_plugins/). Jamais « officiel » ni « de confiance ».
const THIRD_PARTY = [/^anthropics\/claude-plugins-community$/i, /^anthropics\/claude-plugins-official\/external_plugins(\/|$)/i]
const isThirdParty = (repo: string, path: string) => THIRD_PARTY.some(re => re.test(repo) || re.test(`${repo}/${path}`))

// Officiel : écrit par Anthropic, dans un dépôt anthropics/.
export const isFirstParty = (repo: string, path = '') => repo.toLowerCase().startsWith('anthropics/') && !isThirdParty(repo, path)

// Éditeur de confiance (library/profil.json), en excluant le contenu tiers hébergé chez lui.
export const isTrustedPublisher = (repo: string, path: string, publishers: Set<string>) =>
  publishers.has(repo.split('/')[0]!.toLowerCase()) && !isThirdParty(repo, path)

export const CATEGORIES: Categorie[] = ['reseau', 'execution', 'destruction', 'donnees', 'consigne', 'autre']
export const ORDER: Gravite[] = ['critique', 'eleve', 'moyen', 'info']
const lower = (gravite: Gravite): Gravite => ORDER[Math.min(ORDER.indexOf(gravite) + 1, ORDER.length - 1)] as Gravite

// Alerte du juge qui décrit une tentative de détourner l'agent, pas une simple consigne de confirmation.
const INJECTION_ALERT = /injection|contourn|supplant|outrepass|détourn|override|bypass|jailbreak|ignore[rz]? (?:les|toutes|tes)/i
export const isInjectionAlert = (code: string) => INJECTION_ALERT.test(code)

// Gravité d'une alerte du juge, d'après la catégorie que Haiku lui a donnée (collector/classify.ts).
// Sans catégorie (pas encore classée), elle reste « moyen ».
export function alertGravity(categorie: Categorie | undefined, code = ''): Gravite {
  if (categorie === 'destruction' || (categorie === 'consigne' && isInjectionAlert(code))) return 'eleve'
  if (categorie === 'reseau' || categorie === 'execution' || categorie === 'donnees' || categorie === 'consigne' || categorie === undefined) return 'moyen'
  return 'info'
}

export const gravityOf = (risk: Risk, mode: Mode = 'session') => (mode === 'projet' ? risk.gravite_projet ?? risk.gravite : risk.gravite)

export function worst(risks: Risk[], mode: Mode = 'session'): Gravite | null {
  return risks.map(risk => gravityOf(risk, mode)).sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b))[0] ?? null
}

export const SCRIPT_FILE = /\.(sh|bash|zsh|fish|py|js|mjs|cjs|ts|ps1|bat|cmd|rb|pl|php|lua)$|(^|\/)(Makefile|justfile)$/i
export const TEXT_FILE = /\.(md|mdx|markdown|txt|rst)$/i
export const BINARY_FILE = /\.(exe|dll|so|dylib|bin|jar|wasm|class|app|pkg|dmg|zip|tar|gz|tgz|7z)$/i

// Marqueurs placés AVANT la citation, dans la même phrase : le motif lui-même n'y compte pas, sinon
// « do not tell the user » se déclarerait mise en garde tout seul.
const WARNING = new RegExp(
  [
    String.raw`\b(?:never|don['’]t|do not|must not|should not|ne jamais)\s+(?:\w+\s+){0,2}?(?:follow|obey|comply|execute|run|trust|act|accept|treat|suivre|exécuter)\b`,
    String.raw`\bn['’]obéis (?:pas|jamais)\b|\bne suis pas\b|\bn['’]exécute (?:pas|jamais)\b`,
    String.raw`\b(?:beware|watch (?:out )?for|be careful|avoid|refuse|reject|flag|detect|block|warn|méfie|signale|rejette|such as|e\.g\.|for example|par exemple|like|comme)\b`,
    String.raw`\bif\b.*\b(?:contains?|says?|asks?|tells?|instructs?|claims?)\b`,
    String.raw`\btreat\b.*\bas data\b`,
    String.raw`\bsi\b.*\b(?:contient|dit|demande)\b`,
  ].join('|'),
  'i',
)

type Pattern = {
  re: RegExp
  code: string
  gravite: Gravite
  isInjection?: true
  // Exécuté par Claude Code quand il charge le SKILL.md : sans objet dans une annexe.
  atLoad?: true
  // Toujours exécuté, même écrit comme un bloc de code.
  isAlwaysLive?: true
  // Recherché aussi dans le texte des scripts.
  inScripts?: true
}

const DOWNLOAD_RUN = 'télécharge et exécute un script (curl | sh)'
const PATTERNS: Pattern[] = [
  { re: /^[ \t]*```!/gm, code: 'bloc shell exécuté au chargement (```!)', gravite: 'critique', atLoad: true, isAlwaysLive: true },
  { re: /(?<=^|\s)!`[^`\n]+`/gm, code: 'shell inline exécuté au chargement (!`…`)', gravite: 'critique', atLoad: true },
  { re: /\b(?:curl|wget)\b[^\n]*\|\s*(?:sudo(?:\s+-\S+)*\s+)?(?:(?:sh|bash|zsh|dash|fish)\b|(?:python[23]?|node|ruby|perl)\b(?=[ \t]*(?:-[ \t]|-?$|[;&|`"'])))/gim, code: DOWNLOAD_RUN, gravite: 'critique', inScripts: true },
  { re: /\b(?:sh|bash|zsh|source)\s+<\(\s*(?:curl|wget)\b|(?:\b(?:sh|bash|zsh)\s+-c\s+|\beval\s+)["']?\$\(\s*(?:curl|wget)\b/gi, code: DOWNLOAD_RUN, gravite: 'critique', inScripts: true },
  { re: /\b(?:curl|wget)\b[^\n]*\s(?:-o|--output)\b[^\n]*(?:&&|;)\s*(?:chmod\b[^\n]*(?:&&|;)\s*)?(?:sudo\s+)?(?:sh\b|bash\b|zsh\b|\.\/)/gi, code: DOWNLOAD_RUN, gravite: 'critique', inScripts: true },
  { re: /\b(?:iwr|irm|invoke-webrequest|invoke-restmethod)\b[^\n]*\|\s*(?:iex|invoke-expression)\b/gi, code: DOWNLOAD_RUN, gravite: 'critique', inScripts: true },
  { re: /\b(?:ignore|disregard|forget|override)\s+(?:all\s+|any\s+)?(?:of\s+)?(?:the\s+|your\s+|my\s+|these\s+)?(?:previous|prior|above|earlier|preceding|system)\s+(?:instructions?|prompts?|rules?|directions?)\b/gi, code: 'phrase d’injection de prompt', gravite: 'critique', isInjection: true },
  { re: /\bignore\s+(?:toutes?\s+)?(?:les|tes|vos)\s+(?:instructions?|consignes?|règles?)\s+(?:précédentes?|antérieures?|ci-dessus|système)\b|\boublie\s+(?:toutes?\s+)?(?:les|tes|vos)\s+(?:instructions?|consignes?)\b/gi, code: 'phrase d’injection de prompt', gravite: 'critique', isInjection: true },
  { re: /\b(?:do not|don['’]t|never)\s+(?:tell|inform|notify|alert)\s+(?:the\s+)?(?:user|human)\s*(?:[.!,;:)"”»'\n]|$|about\s+(?:this|it|that|these|any)\b|what\s+you\b)|\bwithout\s+(?:telling|informing|notifying)\s+(?:the\s+)?(?:user|human)\b|\bsans\s+(?:prévenir|avertir|informer|le dire à)\s+l['’]utilisateur\b/gi, code: 'consigne de cacher des actions à l’utilisateur', gravite: 'critique', isInjection: true },
  { re: /--dangerously-skip-permissions|bypassPermissions/gi, code: 'contourne les permissions', gravite: 'critique', inScripts: true },
  { re: /<\/?system(?:-reminder)?>/gi, code: 'fausse balise système', gravite: 'eleve', isInjection: true },
  { re: /\brm\b(?=[^\n;&|]*\s(?:-[a-zA-Z]*[rR][a-zA-Z]*|--recursive)\b)(?=[^\n;&|]*\s(?:-[a-zA-Z]*f[a-zA-Z]*|--force)\b)/g, code: 'suppression récursive (rm -rf)', gravite: 'eleve' },
  { re: /(?:~|\$HOME|\$\{HOME\})\/\.(?:ssh|aws|gnupg|netrc)\b|\bid_rsa\b|security find-generic-password/g, code: 'accès à des secrets locaux', gravite: 'eleve', inScripts: true },
  { re: /\b(?:edit|modify|write|update)\b[^\n]{0,40}(?:settings\.json|CLAUDE\.md|hooks\.json)|\b(?:append|add|patch|overwrite|merge|insert)\b[^\n]{0,40}\.claude\/(?:settings|hooks)/gi, code: 'modifie la configuration de Claude Code', gravite: 'eleve' },
  { re: /[A-Za-z0-9+/]{200,}={0,2}/g, code: 'bloc base64 long', gravite: 'moyen' },
  { re: /\beval\s*\(|child_process|subprocess\.[a-z]+\([^)]*shell\s*=\s*True|os\.system\(/gi, code: 'exécution dynamique de code', gravite: 'moyen' },
]

function fences(text: string) {
  return [...text.matchAll(/^[ \t>]*(```|~~~)[^\n]*\n[\s\S]*?^[ \t>]*\1/gm)].map(match => [match.index ?? 0, (match.index ?? 0) + match[0].length] as const)
}

// Début de la phrase qui contient `index` : une mise en garde dans une autre phrase ne compte pas.
function sentenceBefore(text: string, index: number) {
  const before = text.slice(Math.max(0, index - 400), index)
  const cut = Math.max(before.lastIndexOf('\n'), before.search(/[.!?;](?=\s[^.!?;]*$)/))
  return before.slice(cut + 1)
}
// Citée sous un titre ou dans un paragraphe qui parle d'injection, entre guillemets ou en code.
const isQuotedExample = (text: string, index: number) =>
  /["“«`'‘]/.test(text[index - 1] ?? '') && /\b(?:inject|jailbreak|malicious|attack|suspicious|red flag|adversar)/i.test(text.slice(Math.max(0, index - 300), index))
// Entre accents graves sur la ligne : une commande citée, pas une consigne en clair.
function inInlineCode(text: string, index: number) {
  const line = text.slice(text.lastIndexOf('\n', index - 1) + 1, index)
  return (line.match(/`/g)?.length ?? 0) % 2 === 1
}
const isMention = (text: string, index: number) => WARNING.test(sentenceBefore(text, index)) || isQuotedExample(text, index)

// Un script compte comme « lancé » si un texte du skill cite son chemin ou son nom de fichier.
const citesFile = (text: string, path: string) => text.includes(path) || text.includes(path.split('/').pop() ?? path)

// Longueur et caractères bornés pour un texte tiers recopié dans le libellé d'un risque.
const bounded = (text: string, max: number) => text.replace(/[^\p{L}\p{N} ./,*()_-]/gu, '').slice(0, max)
const normalize = (key: string) => key.toLowerCase().replace(/[-_]/g, '')

export function scanSkill(skillMd: string, files: SkillFile[], texts: SkillText[] = []): Risk[] {
  const risks = new Map<string, Risk>()
  const add = (code: string, gravite: Gravite, detail?: string, gravite_projet?: Gravite, key = code) => {
    const before = risks.get(key)
    if (!before || ORDER.indexOf(gravite) < ORDER.indexOf(before.gravite)) {
      risks.set(key, { code, gravite, source: 'scan', ...(detail ? { detail } : {}), ...(gravite_projet ? { gravite_projet } : {}) })
    }
  }

  const { fields, inhabituel } = frontmatter(skillMd)
  const field = (name: string) => Object.entries(fields).find(([key]) => normalize(key) === name)?.[1]
  const tools = field('allowedtools')
  // allowed-tools n'accorde rien quand le skill est lu pour la session ; il pré-autorise vraiment
  // ces outils quand le skill est gardé dans le projet.
  if (tools !== undefined) add('frontmatter allowed-tools', 'info', bounded(tools, 80), /\bBash\b|\*/.test(tools) ? 'eleve' : undefined)
  if (field('hooks') !== undefined) add('frontmatter hooks (actifs toute la session)', 'critique')
  const shell = field('shell')
  if (shell !== undefined) add(`frontmatter shell: ${bounded(shell, 40)}`, 'info')
  if (inhabituel.length) add('frontmatter en forme YAML inhabituelle, illisible par le scan', 'eleve', bounded(inhabituel.join(', '), 80))

  const scanText = (text: string, kind: 'skill' | 'annexe' | 'script', path = '') => {
    const blocks = fences(text)
    const inBlock = (index: number) => blocks.some(([start, end]) => index >= start && index < end)
    const where = kind === 'skill' ? '' : ` (${kind} ${bounded(path, 120)})`
    for (const { re, code, gravite, isInjection, atLoad, isAlwaysLive, inScripts } of PATTERNS) {
      if (kind !== 'skill' && atLoad) continue
      if (kind === 'script' && !inScripts) continue
      for (const match of text.matchAll(re)) {
        const index = match.index ?? 0
        const key = kind === 'skill' ? undefined : `${code}|${kind}`
        if (isInjection && isMention(text, index)) {
          add(`${code} (citée pour mettre en garde)${where}`, 'info', undefined, undefined, key && `${key}|mention`)
        } else if (kind === 'script') {
          add(`${code}${where}`, lower(gravite), undefined, undefined, key)
        } else if ((inBlock(index) || (!atLoad && inInlineCode(text, index))) && !isAlwaysLive) {
          // Le shell inline s'exécute dans un bloc aussi, une fois le skill devenu natif.
          add(`${code} (dans un exemple de code, à vérifier)${where}`, kind === 'annexe' ? lower(lower(gravite)) : lower(gravite), undefined, atLoad ? gravite : undefined, key && `${key}|exemple`)
        } else {
          // Une annexe n'est lue que sur demande : elle pose une question, elle n'écarte pas le skill.
          add(`${code}${where}`, kind === 'annexe' ? lower(gravite) : gravite, undefined, undefined, key)
        }
      }
    }
    if (kind !== 'script') {
      // Le BOM en tête de fichier et les liaisons d'emoji (ZWJ) ne cachent rien.
      const visible = text.replace(/^﻿/, '').replace(/(?<=\p{Extended_Pictographic}️?)‍(?=\p{Extended_Pictographic})/gu, '')
      if (/\p{Cf}/u.test(visible)) add(`caractères invisibles ou bidirectionnels${where}`, 'eleve', undefined, undefined, kind === 'skill' ? undefined : 'invisibles|annexe')
    }
  }
  scanText(skillMd, 'skill')
  for (const { path, text } of texts) scanText(text, TEXT_FILE.test(path) ? 'annexe' : 'script', path)

  const launchers = [skillMd, ...texts.filter(({ path }) => TEXT_FILE.test(path)).map(({ text }) => text)]
  const launched: string[] = []
  const idle: string[] = []
  for (const file of files) {
    const name = file.path
    if (/(^|\/)\.claude-plugin\/plugin\.json$/.test(name)) add('plugin.json : retiré à la copie, jamais chargé comme plugin', 'info', undefined, 'moyen')
    if (/(^|\/)hooks\/hooks\.json$|(^|\/)hooks\.json$/.test(name)) add('hooks.json : peut embarquer un mod', 'critique')
    if (/(^|\/)\.mcp\.json$/.test(name)) add('.mcp.json : serveur MCP, retiré à la copie', 'info', undefined, 'moyen')
    if (/(^|\/)bin\//.test(name)) add('dossier bin/, retiré à la copie', 'info', undefined, 'moyen')
    if (/(^|\/)CLAUDE\.md$|(^|\/)\.claude\//.test(name)) add('CLAUDE.md ou .claude/ embarqué : instructions lues par Claude Code une fois dans le projet', 'info', bounded(name, 120), 'eleve')
    if (BINARY_FILE.test(name)) add('fichier binaire', 'info', bounded(name, 120), 'moyen')
    if (file.mode === '120000') add('lien symbolique', 'moyen', bounded(name, 120))
    if (SCRIPT_FILE.test(name) || file.mode === '100755') (launchers.some(text => citesFile(text, name)) ? launched : idle).push(name)
    if ((file.size ?? 0) > 1_000_000) add('fichier de plus de 1 Mo', 'info', bounded(name, 120))
  }
  if (launched.length) add('scripts lancés par le SKILL.md ou une annexe', 'moyen', bounded(launched.slice(0, 5).join(', '), 200), 'eleve')
  if (idle.length) add('scripts embarqués, que rien ne lance', 'info', bounded(idle.slice(0, 5).join(', '), 200))

  return [...risks.values()].sort((a, b) => ORDER.indexOf(a.gravite) - ORDER.indexOf(b.gravite))
}

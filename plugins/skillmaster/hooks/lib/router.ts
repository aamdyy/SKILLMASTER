// Le routeur (V2, lot 3) : à chaque prompt, sur place et sans réseau, le skill de la réserve qui
// correspond à la demande, ou rien. Code pur, sans import, pour tourner aussi sous Node
// (collector/route-eval.ts mesure sa justesse et son temps sur des prompts de référence).
//
// Recherche BM25 sur les expressions de library/intents.json (fr et en), le nom du skill et sa phrase
// neutre, plus un bonus quand une expression entière se retrouve dans le prompt. On ne répond que si
// le meilleur est assez haut et nettement devant le second : mieux vaut rien qu'un mauvais indice.

export type Intent = { nom: string; empreinte?: string; neutre: string; fr: string[]; en: string[] }
export type RouteSkill = { id: string; nom: string; type: string; intent: Intent }
export type Doc = { skill: RouteSkill; tf: Map<string, number>; length: number; phrases: string[][] }
export type RouteIndex = { docs: Doc[]; df: Map<string, number>; avgLength: number }
export type Candidate = { id: string; nom: string; score: number }
export type Route = {
  // indice : un ou deux skills à proposer (deux quand ils sont au coude à coude) ; court : prompt trop
  // court pour un indice ; aucun : rien d'assez proche ; incertain : trois candidats trop proches.
  raison: 'indice' | 'court' | 'aucun' | 'incertain'
  choix: Candidate[]
  candidats: Candidate[]
  mots: number
}

export const MIN_MOTS = 15
export const MIN_SCORE = 8
export const MARGE = 1.25
const K1 = 1.2
const B = 0.5
const NOM_POIDS = 2
const NEUTRE_POIDS = 0.5
const FICHIER_POIDS = 0.3

const fold = (text: string) => text.normalize('NFD').replace(/\p{M}+/gu, '').replace(/[’‘]/g, "'").toLowerCase()

// Mots vides et mots de demande, qui iraient à n'importe quel skill.
const STOP = new Set(
  `le la les l un une des du de d a au aux et ou en dans sur sous pour par avec sans ce cet cette ces c ca cela ceci
  mon ma mes ton ta tes son sa ses notre nos votre vos leur leurs je j tu il elle on nous vous ils elles me m te t se s y
  ne n pas plus moins que qu qui quoi dont ou est sont etre ete avoir ai as avons avez ont fait fais faire faut peux peut
  pouvoir veux veut voudrais voudrait merci stp svp bonjour salut moi toi lui comme mais donc car si tout tous toute toutes
  tres bien aussi encore deja quand comment pourquoi alors ici la ca chose truc ok oui non puis apres avant entre chaque
  ajoute ajouter cree creer mets mettre modifie modifier change changer besoin aide aider regarde voir dis dire explique
  site page app application code projet fichier fichiers composant fonction feature outil
  the an and or of to in on at for with without this that these those my your our their it its is are be been do does make
  add create please can could would should will i me you we they need want use using get set new just also some any
  file files project component function tool help`.split(/\s+/).filter(Boolean),
)

// Racine grossière : sans pluriel, coupée à 7 lettres (« animations », « animation » → « animati »).
const stem = (word: string) => {
  let w = word
  if (w.length > 4 && /[sx]$/.test(w)) w = w.slice(0, -1)
  return w.length > 7 ? w.slice(0, 7) : w
}

export function tokens(text: string): string[] {
  return fold(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(word => word.length > 1 && !STOP.has(word))
    .map(stem)
}

const wordCount = (text: string) => text.split(/\s+/).filter(word => /[\p{L}\p{N}]/u.test(word)).length

// L'extension d'un fichier touché dans la session dit un peu de la techno : un léger appoint.
const EXTENSIONS: Record<string, string> = {
  swift: 'swift swiftui',
  kt: 'kotlin',
  kts: 'kotlin gradle',
  tsx: 'react',
  jsx: 'react',
  py: 'python',
  ipynb: 'notebook python',
  sql: 'sql',
  css: 'css',
}
export function fileWords(paths: readonly string[]) {
  const out: string[] = []
  for (const path of paths) {
    const ext = path.split('.').pop()?.toLowerCase() ?? ''
    if (EXTENSIONS[ext]) out.push(...tokens(EXTENSIONS[ext]!))
  }
  return out
}

export function buildIndex(skills: readonly RouteSkill[]): RouteIndex {
  const docs: Doc[] = []
  const df = new Map<string, number>()
  for (const skill of skills) {
    const tf = new Map<string, number>()
    const add = (list: string[], weight: number) => {
      for (const token of list) tf.set(token, (tf.get(token) ?? 0) + weight)
    }
    const phrases = [...skill.intent.fr, ...skill.intent.en].map(tokens).filter(list => list.length)
    for (const phrase of phrases) add(phrase, 1)
    add(tokens(skill.nom.replace(/[-_]/g, ' ')), NOM_POIDS)
    add(tokens(skill.intent.neutre), NEUTRE_POIDS)
    for (const token of tf.keys()) df.set(token, (df.get(token) ?? 0) + 1)
    docs.push({ skill, tf, length: [...tf.values()].reduce((a, b) => a + b, 0), phrases })
  }
  const avgLength = docs.reduce((sum, doc) => sum + doc.length, 0) / Math.max(1, docs.length)
  return { docs, df, avgLength }
}

function score(index: RouteIndex, doc: Doc, query: Map<string, number>) {
  const n = index.docs.length
  let total = 0
  for (const [token, weight] of query) {
    const tf = doc.tf.get(token)
    if (!tf) continue
    const df = index.df.get(token) ?? 0
    const idf = Math.log(1 + (n - df + 0.5) / (df + 0.5))
    total += weight * idf * ((tf * (K1 + 1)) / (tf + K1 * (1 - B + (B * doc.length) / index.avgLength)))
  }
  // Une expression de plusieurs mots retrouvée entière dans le prompt : le signal le plus sûr.
  let bonus = 0
  for (const phrase of doc.phrases) {
    if (phrase.length > 1 && phrase.every(token => query.has(token))) bonus = Math.max(bonus, 1 + phrase.length)
  }
  return total + bonus
}

export function route(index: RouteIndex, prompt: string, options: { files?: readonly string[]; exclude?: ReadonlySet<string>; minMots?: number } = {}): Route {
  const mots = wordCount(prompt)
  const query = new Map<string, number>()
  for (const token of tokens(prompt)) query.set(token, 1)
  for (const token of fileWords(options.files ?? [])) if (!query.has(token)) query.set(token, FICHIER_POIDS)
  const candidats = index.docs
    .filter(doc => !options.exclude?.has(doc.skill.nom) && !options.exclude?.has(doc.skill.id))
    .map(doc => ({ id: doc.skill.id, nom: doc.skill.nom, score: Math.round(score(index, doc, query) * 100) / 100 }))
    .filter(one => one.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
  const [best, second, third] = candidats
  if (mots < (options.minMots ?? MIN_MOTS)) return { raison: 'court', choix: [], candidats, mots }
  if (!best || best.score < MIN_SCORE) return { raison: 'aucun', choix: [], candidats, mots }
  const close = (one?: Candidate) => !!one && one.score >= MIN_SCORE && one.score * MARGE > best.score
  if (!close(second)) return { raison: 'indice', choix: [best], candidats, mots }
  if (close(third)) return { raison: 'incertain', choix: [], candidats, mots }
  return { raison: 'indice', choix: [best, second!], candidats, mots }
}

// La réserve : le pack du type détecté (tête et ajouts) et Méthode, sans les skills qui poseraient une
// question de risque en session (même règle que sm.ts : éditeur de confiance hors critique, ou « moyen »
// au plus), sans ceux de la liste « jamais », sans ceux déjà fournis par Claude Code ou installés.
export type ReserveEntry = { id: string; nom: string; risque_max: string | null; editeur_confiance?: boolean }
export type ReservePack = { type: string; recommandes: ReserveEntry[]; ajouts: ReserveEntry[] }
export const METHODE = 'methode'

export const isQuiet = (entry: ReserveEntry) =>
  entry.risque_max === null || entry.risque_max === 'info' || entry.risque_max === 'moyen' || (entry.editeur_confiance === true && entry.risque_max !== 'critique')

export function reserve(packs: readonly ReservePack[], intents: Record<string, Intent>, exclude: ReadonlySet<string> = new Set()): RouteSkill[] {
  const out = new Map<string, RouteSkill>()
  for (const pack of packs) {
    for (const entry of [...pack.recommandes, ...pack.ajouts]) {
      const intent = intents[entry.id]
      if (!intent || out.has(entry.id) || !isQuiet(entry) || exclude.has(entry.nom) || exclude.has(entry.id)) continue
      out.set(entry.id, { id: entry.id, nom: entry.nom, type: pack.type, intent })
    }
  }
  return [...out.values()]
}

// Le socle : les deux premiers skills de la tête du pack, puis le premier de Méthode, listés dès le début
// (mode auto). Sans pack détecté, les premiers de Méthode.
export function socle(packs: readonly ReservePack[], skills: readonly RouteSkill[], size = 3): RouteSkill[] {
  const allowed = new Map(skills.map(skill => [skill.id, skill]))
  const heads = (list: readonly ReservePack[]) => list.flatMap(pack => pack.recommandes.map(entry => allowed.get(entry.id))).filter((skill): skill is RouteSkill => !!skill)
  const main = heads(packs.filter(pack => pack.type !== METHODE))
  const methode = heads(packs.filter(pack => pack.type === METHODE))
  const picked = [...main.slice(0, main.length ? size - 1 : 0), ...methode]
  return [...new Set(picked)].slice(0, size)
}

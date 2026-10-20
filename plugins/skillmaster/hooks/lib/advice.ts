// Conseil modèle et effort (model-rules.json) : la règle qui correspond au prompt, puis les commandes
// à taper pour y passer depuis le réglage actuel. Le mod suggère ; Amdy applique.
import type { SkillmasterConseil } from '../../types'
import { findWords } from './words'

export type ModelRule = {
  id: string
  situation: string
  si?: { mots?: string[]; max_caracteres?: number; ou_nouveau_projet?: boolean }
  modele: string
  effort: string
  ultracode: boolean
  raison: string
}
export type ModelRules = { modeles: Record<string, { nom: string; id: string; commande: string }>; regles: ModelRule[] }

// Le réglage en cours. `effortParModele` vient de modelSettings : un effort propre à chaque modèle.
export type Reglage = {
  modele: string | null
  effort: string | null
  effortParModele: Record<string, string>
  effortDefaut: string | null
  ultracode: boolean | null
}

export function chooseRule(rules: ModelRules, input: { prompt: string; nouveau: boolean }) {
  for (const rule of rules.regles) {
    if (!rule.si) return rule
    const hasWord = !!rule.si.mots && findWords(input.prompt, rule.si.mots).length > 0
    const isFresh = rule.si.ou_nouveau_projet === true && input.nouveau
    const isShort = rule.si.max_caracteres === undefined || input.prompt.length <= rule.si.max_caracteres
    if ((hasWord || isFresh) && isShort) return rule
  }
  return rules.regles[rules.regles.length - 1]!
}

// « opus », « claude-opus-5-5 » ou « claude-opus-5-5[1m] » : l'id du modèle, pour lire modelSettings.
export const modelId = (rules: ModelRules, raw: string) => rules.modeles[raw]?.id ?? raw.replace(/\[.*\]$/, '')

export function advise(rules: ModelRules, rule: ModelRule, now: Reglage): SkillmasterConseil {
  const model = rules.modeles[rule.modele] ?? { nom: rule.modele, id: rule.modele, commande: rule.modele }
  const isSameModel = !!now.modele && now.modele.toLowerCase().includes(rule.modele)
  const commandes: string[] = []
  if (!isSameModel) commandes.push(`/model ${model.commande}`)
  // Changer de modèle reprend l'effort propre à ce modèle, s'il en a un.
  const effort = isSameModel ? now.effort : now.effortParModele[model.id] ?? now.effortDefaut
  if (effort !== rule.effort) commandes.push(`/effort ${rule.effort}`)
  if (rule.ultracode && now.ultracode !== true) commandes.push('/effort ultracode')
  if (!rule.ultracode && now.ultracode === true) commandes.push('/effort ultracode off')
  return { regle: rule.id, modele: model.nom, effort: rule.effort, ultracode: rule.ultracode, raison: rule.raison, commandes }
}

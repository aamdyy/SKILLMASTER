// Contrat de $.state pour le mod SKILLMASTER : ce que la session garde, et ce que le panneau lit.

// Un skill proposé, numéroté comme dans le panneau (01, 02…).
export type SkillmasterItem = {
  n: number
  id: string
  nom: string
  resume: string | null
  type: string
  epingle: boolean
  confiance: boolean
  risque: 'critique' | 'eleve' | 'moyen' | 'info' | null
}

export type SkillmasterConseil = {
  regle: string
  modele: string
  effort: string
  ultracode: boolean
  raison: string
  // Commandes à taper pour suivre le conseil, dans l'ordre (vide : réglage déjà en place). Le mod les
  // affiche seulement : /model et /effort deviennent les réglages par défaut d'Amdy.
  commandes: string[]
}

// Un des deux packs possibles quand le prompt et le dossier ne désignent pas le même type.
export type SkillmasterCandidat = {
  origine: 'prompt' | 'dossier'
  libelle: string
  indices: string[]
  tete: SkillmasterItem[]
}

export type SkillmasterProposition = {
  racine: string
  types: string[]
  libelle: string
  indices: string[]
  tete: SkillmasterItem[]
  ajouts: SkillmasterItem[]
  conseil: SkillmasterConseil
  bibliotheque: string | null
  vue: 'pack' | 'choix' | 'conflit'
  conflit: SkillmasterCandidat[] | null
  etat: string[]
  // Où en est le prompt retenu (de retour dans la saisie, ou parti tel quel).
  pret: string | null
}

// Un skill chargé pour la session, servi par l'outil mcp__skillmaster__skill.
export type SkillmasterCharge = {
  id: string
  nom: string
  resume: string | null
  dossier: string
  source: string
  sha: string | null
}

// Une trace du routeur (V2, lot 3), gardée en local dans ~/.cache/skillmaster/routeur/ :
// route (décision prise à un prompt), lu (un skill servi pour la première fois), retenu (le même skill
// resservi plus tard : relu ou une annexe), ignore (un indice donné, pas lu avant le prompt suivant).
export type SkillmasterTrace = {
  at: string
  evenement: 'route' | 'lu' | 'retenu' | 'ignore'
  mode: 'proposer' | 'ombre' | 'auto'
  tour: number
  raison?: 'indice' | 'court' | 'aucun' | 'incertain'
  noms?: string[]
  candidats?: { nom: string; score: number }[]
  mots?: number
  types?: string[]
  // D'où venait le skill lu : un indice, le socle, ou un chargement par le panneau.
  source?: 'indice' | 'socle' | 'charge'
  // Le début du prompt (300 caractères), pour relire les décisions ; ne quitte jamais la machine.
  prompt?: string
}

// L'état du routeur pour la conversation en cours.
export type SkillmasterRouteur = {
  tours: number
  indiques: string[]
  attente: { noms: string[]; tour: number } | null
  lus: string[]
  retenus: string[]
  fichiers: string[]
  traces: SkillmasterTrace[]
}

declare module 'claude-code' {
  interface PluginState {
    skillmaster: {
      proposition: SkillmasterProposition | null
      charges: SkillmasterCharge[]
      dejaPropose: boolean
      arme: boolean
      reglage: { modele: string; effort: string | null } | null
      ultracode: boolean | null
      // La liste des skills chargés a changé : le prochain prompt la porte dans son context (PLG-11).
      annonce: boolean
      routeur: SkillmasterRouteur
    }
  }
}

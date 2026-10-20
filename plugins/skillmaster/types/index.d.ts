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

declare module 'claude-code' {
  interface PluginState {
    skillmaster: {
      proposition: SkillmasterProposition | null
      charges: SkillmasterCharge[]
      dejaPropose: boolean
      arme: boolean
      reglage: { modele: string; effort: string | null } | null
      ultracode: boolean | null
    }
  }
}

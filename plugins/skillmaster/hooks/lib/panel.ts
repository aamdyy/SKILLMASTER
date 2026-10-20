// Le panneau B (tableau compact), en lignes de texte prêtes à dessiner, sur toute la largeur du panneau.
//   vue « pack »  : une ligne par skill (numéro, nom coupé à 22, ce qu'il améliore, qui continue sous sa
//                   colonne s'il ne tient pas), légende, ajouts, conseil ;
//                   sous 70 colonnes, deux lignes par skill (le nom, puis ce qu'il améliore, en entier) ;
//   vue « choix » : chaque skill avec son resume_fr complet, pour « Choisir moi-même » ;
//   vue « conflit » : les deux packs possibles quand le prompt et le dossier diffèrent.
import type { SkillmasterItem, SkillmasterProposition } from '../../types'
import { gain } from './library'

export type Line = { text: string; dim?: boolean; bold?: boolean; wrap?: boolean; indent?: number }

const NAME = 22
const GAP = '   '
const TWO_LINES_BELOW = 70

export const cut = (text: string, room: number) => (room <= 0 ? '' : text.length <= room ? text : `${text.slice(0, Math.max(0, room - 1))}…`)
export const num = (n: number) => String(n).padStart(2, '0')

// Coupe un texte en lignes de `room` caractères au plus, entre les mots (un mot trop long est scindé).
export function wrapWords(text: string, room: number) {
  const lines: string[] = []
  let line = ''
  for (let word of text.split(/\s+/).filter(Boolean)) {
    while (word.length > room) {
      if (line) lines.push(line)
      lines.push(word.slice(0, room))
      word = word.slice(room)
      line = ''
    }
    if (!line) line = word
    else if (line.length + 1 + word.length <= room) line += ` ${word}`
    else {
      lines.push(line)
      line = word
    }
  }
  if (line) lines.push(line)
  return lines
}

// Un titre à gauche, les indices calés à droite s'il reste de la place.
function titled(left: string, indices: string[], width: number): Line {
  const room = width - left.length - 2
  const right = room >= 6 ? cut(indices.join(' · '), room) : ''
  return { text: right ? `${left}${' '.repeat(width - left.length - right.length)}${right}` : cut(left, width), bold: true }
}

const header = (p: SkillmasterProposition, width: number) => titled(`// SKILLMASTER · ${p.libelle.toUpperCase()}`, p.indices, width)

function rows(item: SkillmasterItem, width: number, isNarrow: boolean): Line[] {
  if (isNarrow) {
    const better = gain(item.resume)
    return [{ text: cut(`${num(item.n)} ${item.nom}`, width) }, ...(better ? [{ text: better, dim: true, wrap: true, indent: 3 }] : [])]
  }
  const lead = `${num(item.n)} ${cut(item.nom, NAME).padEnd(NAME)}${GAP}`
  const [first = '', ...rest] = wrapWords(gain(item.resume), Math.max(10, width - lead.length))
  return [{ text: `${lead}${first}` }, ...rest.map(text => ({ text: `${' '.repeat(lead.length)}${text}` }))]
}

function legend(items: SkillmasterItem[]) {
  const pick = (test: (item: SkillmasterItem) => boolean) => items.filter(test).map(item => num(item.n)).join(' ')
  const parts = [
    ['◆ épinglé', pick(item => item.epingle)],
    ['✓ confiance', pick(item => item.confiance)],
    ['● risque élevé', pick(item => item.risque === 'eleve' || item.risque === 'critique')],
  ]
  return parts.filter(([, numbers]) => numbers).map(([label, numbers]) => `${label} ${numbers}`).join(' · ')
}

function conseil(p: SkillmasterProposition, width: number): Line[] {
  const c = p.conseil
  return [
    { text: cut(`${c.modele.toUpperCase()} · ${c.effort.toUpperCase()} · ultracode ${c.ultracode ? 'ON' : 'off'}`, width), bold: true },
    { text: c.raison, wrap: true },
    { text: c.commandes.length ? `pour le suivre, tape ${c.commandes.join(' puis ')}` : 'réglage déjà en place', dim: true, wrap: true },
    ...(p.pret ? [{ text: p.pret, dim: true, wrap: true }] : []),
  ]
}

// `columns` : la largeur du panneau (bodyColumns), toute utilisée.
export function panelLines(p: SkillmasterProposition, columns: number): Line[] {
  const width = Math.max(30, columns)
  const isNarrow = columns < TWO_LINES_BELOW
  const rule: Line = { text: '─'.repeat(width), dim: true }
  if (p.vue === 'conflit' && p.conflit) {
    const lines: Line[] = [{ text: cut(`// SKILLMASTER · ${p.conflit.length} PACKS POSSIBLES`, width), bold: true }, rule]
    for (const candidat of p.conflit) {
      const shown = candidat.tete.slice(0, 5)
      lines.push(titled(`${candidat.origine === 'prompt' ? 'TON PROMPT' : 'LE DOSSIER'} · ${candidat.libelle.toUpperCase()}`, candidat.indices, width))
      lines.push(...shown.flatMap(item => rows(item, width, isNarrow)))
      if (candidat.tete.length > shown.length) lines.push({ text: `+ ${candidat.tete.length - shown.length} autres en tête`, dim: true })
      lines.push(rule)
    }
    lines.push({ text: 'Choisis le pack dans le dialogue.', dim: true, wrap: true })
    return lines
  }
  const lines: Line[] = [header(p, width), rule]

  if (p.vue === 'choix') {
    lines.push({ text: 'Tape les numéros à charger dans le champ libre du dialogue.', dim: true, wrap: true })
    const marks = (item: SkillmasterItem) => `${item.epingle ? '◆' : ''}${item.confiance ? '✓' : ''}${item.risque === 'eleve' || item.risque === 'critique' ? '●' : ''}`
    for (const [title, items] of [['', p.tete], ['+ ajouts', p.ajouts]] as const) {
      if (!items.length) continue
      if (title) lines.push({ text: title, dim: true })
      for (const item of items) {
        lines.push({ text: cut(`${num(item.n)} ${item.nom}${marks(item) ? ` ${marks(item)}` : ''}`, width), bold: true })
        lines.push({ text: item.resume ?? 'pas de résumé', dim: true, wrap: true, indent: 3 })
      }
    }
    lines.push(rule, { text: '◆ épinglé · ✓ éditeur de confiance · ● risque élevé', dim: true, wrap: true })
  } else {
    for (const item of p.tete) lines.push(...rows(item, width, isNarrow))
    const marks = legend(p.tete)
    if (marks || p.ajouts.length) lines.push(rule)
    if (marks) lines.push({ text: cut(marks, width), dim: true })
    if (p.ajouts.length) {
      const label = `+ ${p.ajouts.length} ajout${p.ajouts.length > 1 ? 's' : ''} : `
      lines.push({ text: cut(`${label}${p.ajouts.map(item => item.nom).join(', ')}`, width), dim: true })
    }
  }

  lines.push(rule, ...conseil(p, width))
  if (p.etat.length) lines.push(rule, ...p.etat.map(text => ({ text, wrap: true })))
  return lines
}

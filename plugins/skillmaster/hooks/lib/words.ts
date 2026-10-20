// Mots entiers, sans tenir compte des accents ni de la casse : « mod » ne se déclenche pas sur
// « modifie », ni « app » sur « appelle ». \b ne convient pas, car il traite « é » comme une frontière.

export const fold = (text: string) =>
  text.normalize('NFD').replace(/\p{M}+/gu, '').replace(/[’‘]/g, "'").toLowerCase()

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export function wordPattern(word: string) {
  const body = escape(fold(word).trim()).replace(/\s+/g, '\\s+')
  return new RegExp(`(?<![\\p{L}\\p{N}])${body}(?![\\p{L}\\p{N}])`, 'u')
}

// Les mots de la liste présents dans le texte, dans l'ordre de la liste.
export function findWords(text: string, words: readonly string[]) {
  const folded = fold(text)
  return words.filter(word => word.trim() && wordPattern(word).test(folded))
}

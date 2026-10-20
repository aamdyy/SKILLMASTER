// Langues du site : le français à la racine, l'anglais sous /en/. Chemins des pages dans chaque langue,
// et passage d'une langue à l'autre (sélecteur de l'en-tête). Sans dépendance Node : lu aussi côté client.
export type Lang = 'fr' | 'en'
export const LANGS: Lang[] = ['fr', 'en']
export const LOCALE: Record<Lang, string> = { fr: 'fr-FR', en: 'en-US' }
export const SITE_URL = 'https://skillmaster-sigma.vercel.app'

const base = (lang: Lang) => (lang === 'en' ? '/en' : '')
// Pages dont l'adresse change d'une langue à l'autre (le reste ne prend que le préfixe /en).
const RENAMED: [fr: string, en: string][] = [
  ['/changements/', '/changes/'],
  ['/installation/', '/install/'],
]

export const href = {
  home: (lang: Lang) => `${base(lang)}/`,
  packs: (lang: Lang) => `${base(lang)}/#packs`,
  skills: (lang: Lang) => `${base(lang)}/skills/`,
  changes: (lang: Lang) => (lang === 'en' ? '/en/changes/' : '/changements/'),
  install: (lang: Lang) => (lang === 'en' ? '/en/install/' : '/installation/'),
  pack: (lang: Lang, type: string) => `${base(lang)}/packs/${type}/`,
  skill: (lang: Lang, slug: string) => `${base(lang)}/skills/${slug}/`,
}

export const langOf = (path: string): Lang => (path === '/en' || path.startsWith('/en/') ? 'en' : 'fr')

// La même page dans l'autre langue : /changements/ ↔ /en/changes/, /skills/x/ ↔ /en/skills/x/.
export function counterpart(path: string, to: Lang): string {
  const clean = path.endsWith('/') ? path : `${path}/`
  let fr = langOf(clean) === 'en' ? clean.slice(3) || '/' : clean
  for (const [frPath, enPath] of RENAMED) if (fr.startsWith(enPath) && langOf(clean) === 'en') fr = frPath + fr.slice(enPath.length)
  if (to === 'fr') return fr
  for (const [frPath, enPath] of RENAMED) if (fr.startsWith(frPath)) return `/en${enPath}${fr.slice(frPath.length)}`
  return `/en${fr}`
}

// Les deux versions d'une page, pour les balises hreflang (chemin français en entrée).
export const alternates = (frPath: string) => ({
  canonical: frPath,
  languages: { fr: frPath, en: counterpart(frPath, 'en'), 'x-default': frPath },
})
export const alternatesFor = (lang: Lang, frPath: string) => ({ ...alternates(frPath), canonical: lang === 'fr' ? frPath : counterpart(frPath, 'en') })

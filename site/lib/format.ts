// Formats d'affichage, dans la langue de la page (français par défaut).
import { LOCALE, type Lang } from './lang'

const cache = new Map<string, Intl.NumberFormat | Intl.DateTimeFormat>()
const make = <T extends Intl.NumberFormat | Intl.DateTimeFormat>(key: string, build: () => T): T => {
  if (!cache.has(key)) cache.set(key, build())
  return cache.get(key) as T
}
const integer = (lang: Lang) => make(`int-${lang}`, () => new Intl.NumberFormat(LOCALE[lang]))
const compact = (lang: Lang) => make(`compact-${lang}`, () => new Intl.NumberFormat(LOCALE[lang], { notation: 'compact', maximumFractionDigits: 1 }))
const day = (lang: Lang) => make(`day-${lang}`, () => new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }))

export const formatInt = (value: number, lang: Lang = 'fr') => integer(lang).format(value)
export const formatUsd = (value: number, lang: Lang = 'fr') =>
  lang === 'en'
    ? make('usd-en', () => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })).format(value)
    : `${make('usd-fr', () => new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })).format(value)} $`
export const formatCompact = (value: number, lang: Lang = 'fr') => compact(lang).format(value)
export const formatDate = (iso: string, lang: Lang = 'fr') => (iso ? day(lang).format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)) : '—')
// « 19 oct. » / « Oct 19 » : la date sans l'année.
export const formatDay = (iso: string, lang: Lang = 'fr') =>
  iso ? make(`dm-${lang}`, () => new Intl.DateTimeFormat(LOCALE[lang], { day: 'numeric', month: 'short', timeZone: 'UTC' })).format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)) : '—'
export const formatNote = (note: number | null, lang: Lang = 'fr') => (note === null ? '—' : lang === 'fr' ? String(note).replace('.', ',') : String(note))

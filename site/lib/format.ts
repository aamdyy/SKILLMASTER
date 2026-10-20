// Formats d'affichage, en français.
const integer = new Intl.NumberFormat('fr-FR')
const usd = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const day = new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })

export const formatInt = (value: number) => integer.format(value)
export const formatUsd = (value: number) => `${usd.format(value)} $`
const compact = new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 })
export const formatCompact = (value: number) => compact.format(value)
export const formatDate = (iso: string) => (iso ? day.format(new Date(iso.length === 10 ? `${iso}T00:00:00Z` : iso)) : '—')

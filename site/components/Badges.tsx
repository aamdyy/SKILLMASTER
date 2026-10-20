import { formatNote } from '@/lib/format'
import { LOCALE, type Lang } from '@/lib/lang'
import type { Gravite } from '@/lib/library'

// Badges techniques : petit cadre, texte mono. Le sens ne repose jamais sur la seule couleur.
const base = 'badge'

const TONE: Record<Gravite | 'aucun', string> = {
  aucun: 'text-muted',
  info: 'text-risk-info',
  moyen: 'text-risk-moyen',
  eleve: 'text-risk-eleve',
  critique: 'text-risk-eleve',
}
const RISK: Record<Lang, Record<Gravite | 'aucun', string>> = {
  fr: { aucun: 'aucun risque', info: 'risque info', moyen: 'risque moyen', eleve: 'risque élevé', critique: 'risque critique' },
  en: { aucun: 'no risk', info: 'info risk', moyen: 'medium risk', eleve: 'high risk', critique: 'critical risk' },
}

export const riskLabel = (gravite: Gravite | null, lang: Lang = 'fr') => RISK[lang][gravite ?? 'aucun']

export function RiskBadge({ gravite, lang = 'fr' }: { gravite: Gravite | null; lang?: Lang }) {
  return (
    <span className={`${base} ${TONE[gravite ?? 'aucun']}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {riskLabel(gravite, lang)}
    </span>
  )
}

export function TrustBadge({ lang = 'fr' }: { lang?: Lang }) {
  return (
    <span className={`${base} text-fg`}>
      <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M6 1.25 2 2.75v3c0 2.4 1.7 4.2 4 5 2.3-.8 4-2.6 4-5v-3L6 1.25Z" strokeLinejoin="round" />
        <path d="m4.25 6 1.25 1.25L7.9 4.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {lang === 'en' ? 'trusted publisher' : 'éditeur de confiance'}
    </span>
  )
}

export function PinnedBadge({ lang = 'fr' }: { lang?: Lang }) {
  return (
    <span className={`${base} text-fg`}>
      <svg aria-hidden width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M7.5 1.5 10.5 4.5 8.6 5.6 6.4 7.8l.3 2.2-4.7-4.7 2.2.3 2.2-2.2 1.1-1.9Z" strokeLinejoin="round" />
        <path d="M3.5 8.5 1.5 10.5" strokeLinecap="round" />
      </svg>
      {lang === 'en' ? 'pinned' : 'épinglé'}
    </span>
  )
}

export function NoteBadge({ note, lang = 'fr' }: { note: number | null; lang?: Lang }) {
  return <span className={`${base} text-fg tabular`}>{lang === 'en' ? 'score' : 'note'} {formatNote(note, lang)}/10</span>
}

// Étoiles GitHub du dépôt (pas du skill : plusieurs skills d'un même dépôt partagent ce chiffre).
export function StarsBadge({ stars, compact, lang = 'fr' }: { stars: number; compact: string; lang?: Lang }) {
  const total = new Intl.NumberFormat(LOCALE[lang]).format(stars)
  return (
    <span className={`${base} text-fg/85 tabular`} title={lang === 'en' ? `${total} GitHub stars on the repository` : `${total} étoiles GitHub du dépôt`}>
      <span aria-hidden>★</span>
      {compact} <span className="text-muted">{lang === 'en' ? 'repo stars' : 'étoiles du dépôt'}</span>
    </span>
  )
}

export function TextBadge({ children }: { children: string }) {
  return <span className={`${base} text-fg/85`}>{children}</span>
}

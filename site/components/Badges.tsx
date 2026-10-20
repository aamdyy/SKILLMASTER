import type { Gravite } from '@/lib/library'

// Badges techniques : petit cadre, texte mono. Le sens ne repose jamais sur la seule couleur.
const base = 'badge'

const RISK: Record<Gravite | 'aucun', { label: string; tone: string }> = {
  aucun: { label: 'aucun risque', tone: 'text-muted' },
  info: { label: 'risque info', tone: 'text-risk-info' },
  moyen: { label: 'risque moyen', tone: 'text-risk-moyen' },
  eleve: { label: 'risque élevé', tone: 'text-risk-eleve' },
  critique: { label: 'risque critique', tone: 'text-risk-eleve' },
}

export const riskLabel = (gravite: Gravite | null) => RISK[gravite ?? 'aucun'].label

export function RiskBadge({ gravite }: { gravite: Gravite | null }) {
  const risk = RISK[gravite ?? 'aucun']
  return (
    <span className={`${base} ${risk.tone}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {risk.label}
    </span>
  )
}

export function TrustBadge() {
  return (
    <span className={`${base} text-fg`}>
      <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M6 1.25 2 2.75v3c0 2.4 1.7 4.2 4 5 2.3-.8 4-2.6 4-5v-3L6 1.25Z" strokeLinejoin="round" />
        <path d="m4.25 6 1.25 1.25L7.9 4.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      éditeur de confiance
    </span>
  )
}

export function PinnedBadge() {
  return (
    <span className={`${base} text-fg`}>
      <svg aria-hidden width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M7.5 1.5 10.5 4.5 8.6 5.6 6.4 7.8l.3 2.2-4.7-4.7 2.2.3 2.2-2.2 1.1-1.9Z" strokeLinejoin="round" />
        <path d="M3.5 8.5 1.5 10.5" strokeLinecap="round" />
      </svg>
      épinglé
    </span>
  )
}

export function NoteBadge({ note }: { note: number | null }) {
  return <span className={`${base} text-fg tabular`}>note {note === null ? '—' : String(note).replace('.', ',')}/10</span>
}

// Étoiles GitHub du dépôt (pas du skill : plusieurs skills d'un même dépôt partagent ce chiffre).
export function StarsBadge({ stars, compact }: { stars: number; compact: string }) {
  return (
    <span className={`${base} text-fg/85 tabular`} title={`${new Intl.NumberFormat('fr-FR').format(stars)} étoiles GitHub du dépôt`}>
      <span aria-hidden>★</span>
      {compact} <span className="text-muted">étoiles du dépôt</span>
    </span>
  )
}

export function TextBadge({ children }: { children: string }) {
  return <span className={`${base} text-fg/85`}>{children}</span>
}

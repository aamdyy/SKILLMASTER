import type { Gravite } from '@/lib/library'

// Badges en pastille, pour les cartes blanches (`surface="card"`) ou le fond sombre.
type Surface = 'card' | 'dark'

const RISK: Record<Gravite | 'aucun', { label: string; card: string; dark: string }> = {
  aucun: { label: 'aucun risque', card: 'text-ink-muted', dark: 'text-muted' },
  info: { label: 'risque info', card: 'text-risk-info-ink', dark: 'text-risk-info' },
  moyen: { label: 'risque moyen', card: 'text-risk-moyen-ink', dark: 'text-risk-moyen' },
  eleve: { label: 'risque élevé', card: 'text-risk-eleve-ink', dark: 'text-risk-eleve' },
  critique: { label: 'risque critique', card: 'text-risk-eleve-ink', dark: 'text-risk-eleve' },
}

const base = 'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 font-mono text-[11px] whitespace-nowrap'
const border = (surface: Surface) => (surface === 'card' ? 'border-card-line' : 'border-line-strong')

export function RiskBadge({ gravite, surface = 'card' }: { gravite: Gravite | null; surface?: Surface }) {
  const risk = RISK[gravite ?? 'aucun']
  return (
    <span className={`${base} ${border(surface)} ${risk[surface]}`}>
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {risk.label}
    </span>
  )
}

// Confiance : neutre, avec une icône de bouclier, pour ne pas se confondre avec l'accent vert.
export function TrustBadge({ surface = 'card' }: { surface?: Surface }) {
  return (
    <span className={`${base} ${border(surface)} ${surface === 'card' ? 'text-ink' : 'text-fg'}`}>
      <svg aria-hidden width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3">
        <path d="M6 1.25 2 2.75v3c0 2.4 1.7 4.2 4 5 2.3-.8 4-2.6 4-5v-3L6 1.25Z" strokeLinejoin="round" />
        <path d="m4.25 6 1.25 1.25L7.9 4.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      éditeur de confiance
    </span>
  )
}

export function NoteBadge({ note, surface = 'card' }: { note: number | null; surface?: Surface }) {
  return (
    <span className={`${base} ${border(surface)} tabular ${surface === 'card' ? 'text-ink' : 'text-fg'}`}>
      note {note === null ? '—' : String(note).replace('.', ',')}/10
    </span>
  )
}

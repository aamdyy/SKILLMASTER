import type { ReactNode } from 'react'

// Cadre technique, esprit plan d'architecte : filet fin, croix aux angles, repères au milieu
// des côtés (un seul élément décoratif, voir .frame-marks), légende facultative sur le filet du haut.
export function Frame({ children, legend, className = '', as: Tag = 'div' }: { children: ReactNode; legend?: string; className?: string; as?: 'div' | 'section' | 'li' | 'figure' }) {
  return (
    <Tag className={`relative border border-line ${className}`}>
      <span aria-hidden className="frame-marks" />
      {legend && <span className="frame-legend">{legend}</span>}
      {children}
    </Tag>
  )
}

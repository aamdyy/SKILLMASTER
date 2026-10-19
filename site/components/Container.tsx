import type { ReactNode } from 'react'

// Colonne centrale. Ses bords portent les filets verticaux de la page (voir app/layout.tsx).
export function Container({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1080px] px-4 md:px-10 ${className}`}>{children}</div>
}

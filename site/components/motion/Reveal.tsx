'use client'

import { m } from 'motion/react'
import type { ReactNode } from 'react'

// Apparition au scroll : fondu et léger décalage, une seule fois. `index` décale l'entrée
// des éléments d'une grille (cascade de 40 ms).
export function Reveal({ children, index = 0, className }: { children: ReactNode; index?: number; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '0px 0px -10% 0px' }}
      transition={{ duration: 0.25, delay: index * 0.04, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </m.div>
  )
}

'use client'

import { m } from 'motion/react'
import type { ReactNode } from 'react'

// Carte qui apparaît (fondu, légère montée), puis flotte très doucement. Deux couches pour que
// l'entrée et le flottement ne se marchent pas dessus. Transform et opacity seulement ;
// MotionConfig coupe tout avec prefers-reduced-motion.
export function Float({ children, delay = 0, amplitude = 5, className }: { children: ReactNode; delay?: number; amplitude?: number; className?: string }) {
  return (
    <m.div
      className={className}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      <m.div
        animate={{ y: [0, -amplitude, 0] }}
        transition={{ duration: 7, delay: delay + 0.5, ease: 'easeInOut', repeat: Infinity }}
      >
        {children}
      </m.div>
    </m.div>
  )
}

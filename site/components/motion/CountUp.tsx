'use client'

import { animate, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

const format = new Intl.NumberFormat('fr-FR')

// Compteur animé : ne démarre qu'une fois visible. Le HTML du build contient déjà la valeur
// finale, donc sans JavaScript ou avec prefers-reduced-motion, le bon chiffre s'affiche sans animation.
export function CountUp({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -15% 0px' })
  const reduced = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node || !inView || reduced) return
    const controls = animate(0, value, {
      duration: 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: latest => {
        node.textContent = format.format(Math.round(latest))
      },
    })
    return () => controls.stop()
  }, [inView, reduced, value])

  return (
    <span ref={ref} className={className}>
      {format.format(value)}
    </span>
  )
}

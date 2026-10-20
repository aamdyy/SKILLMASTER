'use client'

import { useEffect, useRef } from 'react'
import { HANDS } from './hands-data'

// Les deux mains de « La Création d'Adam » (domaine public), notre propre rendu en trame : losanges
// dans la lumière, points dans l'ombre, rangées en stries. Les bras sortent des bords et se tendent
// vers le centre (1,2 s), puis restent fixes. Décoratif : masqué aux lecteurs d'écran ;
// avec prefers-reduced-motion, elles apparaissent d'un coup.
const DURATION = 1200

export function Hands() {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const node = canvas.current
    const context = node?.getContext('2d')
    if (!node || !context) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const cells = HANDS.data.flatMap((row, r) => [...row].map((v, c) => ({ r, c, v: Number(v) })).filter(cell => cell.v > 0))
    const half = HANDS.cols / 2
    const delay = (c: number) => (c < half ? c / half : (HANDS.cols - 1 - c) / half) * (DURATION - 250)
    let frame = 0
    let start = 0

    const diamond = (x: number, y: number, w: number, h: number) => {
      context.beginPath()
      context.moveTo(x, y - h / 2)
      context.lineTo(x + w / 2, y)
      context.lineTo(x, y + h / 2)
      context.lineTo(x - w / 2, y)
      context.closePath()
      context.fill()
    }

    const draw = (now: number) => {
      const ratio = window.devicePixelRatio || 1
      const width = node.clientWidth
      const height = node.clientHeight
      if (node.width !== Math.round(width * ratio)) {
        node.width = Math.round(width * ratio)
        node.height = Math.round(height * ratio)
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
      const sw = width / HANDS.cols
      const sh = sw * HANDS.aspect
      const elapsed = reduced ? Infinity : now - start
      context.fillStyle = '#f2f2f2'
      for (const { r, c, v } of cells) {
        const progress = Math.min(1, Math.max(0, (elapsed - delay(c)) / 250))
        if (progress <= 0) continue
        const x = (c + 0.5) * sw
        const y = (r + 0.5) * sh
        if (v === 3) {
          context.globalAlpha = 0.95 * progress
          diamond(x, y, sw * 1.05, sh * 0.62)
        } else if (v === 2) {
          context.globalAlpha = 0.8 * progress
          diamond(x, y, sw * 0.7, sh * 0.4)
        } else {
          context.globalAlpha = 0.55 * progress
          context.fillRect(x - sw * 0.16, y + sh * 0.12, sw * 0.32, sw * 0.32)
        }
      }
      context.globalAlpha = 1
      if (elapsed < DURATION) frame = requestAnimationFrame(draw)
    }

    const run = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(now => {
        start ||= now
        draw(now)
      })
    }
    run()
    const observer = new ResizeObserver(run)
    observer.observe(node)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [])

  return (
    <div aria-hidden className="pointer-events-none relative left-1/2 w-screen -translate-x-1/2 overflow-hidden">
      <canvas
        ref={canvas}
        className="relative left-1/2 block w-[max(100vw,1100px)] max-w-[1900px] -translate-x-1/2"
        style={{ aspectRatio: `${HANDS.cols} / ${HANDS.rows * HANDS.aspect}` }}
      />
    </div>
  )
}

'use client'

import { useEffect, useRef, useState } from 'react'

type Text = { label: string; pause: string; play: string; sound: string }

// Le teaser vidéo, en boucle. Il démarre en sourdine (seule façon de jouer tout seul) ; le bouton
// « Son » active la bande-son. Il ne joue que visible à l'écran, et jamais avec prefers-reduced-motion
// (l'image d'attente reste, avec le bouton lecture). Le bouton pause / lecture répond au critère
// WCAG 2.2.2 (contenu animé de plus de 5 s). Sans JavaScript, la vidéo garde les contrôles du navigateur.
export function Teaser({ src, poster, text }: { src: string; poster: string; text: Text }) {
  const video = useRef<HTMLVideoElement>(null)
  const [enhanced, setEnhanced] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [sound, setSound] = useState(false)
  const paused = useRef(false) // pause choisie par le visiteur : l'écran ne relance pas la vidéo

  useEffect(() => {
    const node = video.current
    if (!node) return
    setEnhanced(true)
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) paused.current = true
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !paused.current) node.play().catch(() => {})
      else node.pause()
    }, { threshold: 0.35 })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  const toggleSound = () => {
    const node = video.current
    if (!node) return
    node.muted = !node.muted
    setSound(!node.muted)
    // Activer le son relance la lecture si elle était en pause.
    if (!node.muted && node.paused) {
      paused.current = false
      node.play().catch(() => {})
    }
  }

  const toggle = () => {
    const node = video.current
    if (!node) return
    paused.current = !node.paused
    if (node.paused) node.play().catch(() => {})
    else node.pause()
  }

  return (
    <div className="relative">
      <video
        ref={video}
        className="block aspect-video w-full bg-bg"
        poster={poster}
        muted
        loop
        playsInline
        preload="metadata"
        controls={!enhanced}
        aria-label={text.label}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      >
        <source src={src} type="video/mp4" />
      </video>
      {enhanced && (
        <div className="absolute bottom-3 right-3 flex gap-2">
          <button
            type="button"
            onClick={toggleSound}
            aria-pressed={sound}
            className="btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 font-mono text-[11px] uppercase tracking-[0.06em]"
          >
            <span aria-hidden className={`size-1.5 rounded-full ${sound ? 'bg-accent' : 'bg-line-strong'}`} />
            {text.sound}
          </button>
          <button
            type="button"
            onClick={toggle}
            className="btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 font-mono text-[11px] uppercase tracking-[0.06em]"
          >
            <span aria-hidden>{playing ? '❚❚' : '▶'}</span>
            {playing ? text.pause : text.play}
          </button>
        </div>
      )}
    </div>
  )
}

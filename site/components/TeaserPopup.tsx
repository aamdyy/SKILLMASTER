'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Teaser } from './Teaser'

type Text = { label: string; pause: string; play: string; sound: string; close: string; caption: string; dialog: string }

const SEEN = 'sm-teaser-vu'

// À la première visite de l'accueil, le teaser s'ouvre une fois dans une fenêtre (<dialog> natif :
// Échap ferme, le focus reste dedans, un clic à côté ferme). Ensuite, il ne reste qu'à sa place dans
// la page. La mémoire « déjà vu » vit dans le navigateur du visiteur ; si elle est indisponible,
// la fenêtre ne s'ouvre pas, pour ne pas revenir à chaque page.
export function TeaserPopup({ src, poster, text, install }: { src: string; poster: string; text: Text; install: { href: string; label: string } }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const node = dialog.current
    if (!node) return
    let seen = true
    try {
      seen = localStorage.getItem(SEEN) === '1'
      if (!seen) localStorage.setItem(SEEN, '1')
    } catch {}
    if (seen) return
    const timer = setTimeout(() => node.showModal(), 700)
    return () => clearTimeout(timer)
  }, [])

  return (
    <dialog
      ref={dialog}
      aria-label={text.dialog}
      onClick={event => event.target === dialog.current && dialog.current?.close()}
      className="teaser-dialog m-auto w-[min(1080px,calc(100vw-2rem))] max-w-none overflow-visible bg-transparent p-0 text-fg backdrop:bg-bg/85 backdrop:backdrop-blur-sm"
    >
      <div className="relative border border-line-strong bg-bg">
        <span aria-hidden className="frame-marks" />
        <div className="flex items-center justify-between gap-4 border-b border-line px-3 py-2 md:px-4">
          <span className="label-code text-[12px]">
            <span aria-hidden>// </span>teaser · 27 s
          </span>
          <div className="flex items-center gap-2">
            <Link href={install.href} className="btn-primary inline-flex h-9 items-center gap-2 rounded-md px-3 font-mono text-[11px] uppercase tracking-[0.06em]">
              {install.label} <span aria-hidden>→</span>
            </Link>
            <form method="dialog">
              <button autoFocus className="btn-secondary inline-flex h-9 items-center gap-2 rounded-md px-3 font-mono text-[11px] uppercase tracking-[0.06em]">
                {text.close} <span aria-hidden>✕</span>
              </button>
            </form>
          </div>
        </div>
        <div className="p-2 md:p-3">
          <Teaser src={src} poster={poster} text={text} />
          <p className="px-1 pb-1 pt-3 text-[13px] leading-relaxed text-muted md:px-0">{text.caption}</p>
        </div>
      </div>
    </dialog>
  )
}

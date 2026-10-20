'use client'

import { useState } from 'react'

// Copie une commande dans le presse-papiers ; le libellé confirme pendant 1,5 s.
export function CopyButton({ text, label, done }: { text: string; label: string; done: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        }, () => {})
      }}
      className="inline-flex h-8 shrink-0 items-center rounded-md border border-line-strong px-2.5 font-mono text-[10.5px] uppercase tracking-[0.06em] text-muted transition-colors duration-150 hover:border-tick hover:text-fg"
    >
      <span aria-live="polite">{copied ? done : label}</span>
    </button>
  )
}

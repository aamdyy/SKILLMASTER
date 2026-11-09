'use client'

import { m } from 'motion/react'
import type { ReactNode } from 'react'

type Row = { key: string; label: string; value: number }

const SLOTS = 10
const pop = (delay: number) => ({
  initial: { opacity: 0, scale: 0.4 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: '0px 0px -10% 0px' },
  transition: { duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] as const },
})

// La note décomposée, en cascade : chaque critère occupe ses deux cases sur une piste de 10,
// puis la ligne du total réunit les cases pleines. Un point sans case : hors du critère.
export function ScoreDiagram({ rows, total, totalLabel }: { rows: Row[]; total: string; totalLabel: string }) {
  const filled = (slot: number) => {
    const row = rows[Math.floor(slot / 2)]
    return !!row && slot % 2 < row.value
  }
  const Track = ({ children }: { children: ReactNode }) => (
    <span aria-hidden className="grid grid-cols-[repeat(10,0.75rem)] gap-[3px] sm:grid-cols-[repeat(10,0.9rem)]">
      {children}
    </span>
  )
  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-3">
        {rows.map((row, r) => (
          <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-3">
            <dt className="truncate text-sm text-fg/85">{row.label}</dt>
            <Track>
              {Array.from({ length: SLOTS }, (_, slot) => {
                const own = Math.floor(slot / 2) === r
                if (!own) return <span key={slot} className="m-auto size-[3px] rounded-full bg-line-strong" />
                const on = slot % 2 < row.value
                return <m.span key={slot} {...pop(0.08 + r * 0.12 + (slot % 2) * 0.05)} className={`aspect-square ${on ? 'bg-fg' : 'border border-line-strong'}`} />
              })}
            </Track>
            <dd className="text-right font-mono text-[12px] text-muted tabular">{row.value}/2</dd>
          </div>
        ))}
      </dl>
      <div className="grid grid-cols-[minmax(0,1fr)_auto_2.75rem] items-center gap-3 border-t border-line pt-3">
        <p className="caps text-[11px] text-muted">= {totalLabel}</p>
        <Track>
          {Array.from({ length: SLOTS }, (_, slot) => (
            <m.span key={slot} {...pop(0.2 + rows.length * 0.12 + slot * 0.03)} className={`aspect-square ${filled(slot) ? 'bg-fg' : 'border border-line-strong'}`} />
          ))}
        </Track>
        <p className="text-right font-mono text-[15px] text-fg tabular">{total}/10</p>
      </div>
    </div>
  )
}

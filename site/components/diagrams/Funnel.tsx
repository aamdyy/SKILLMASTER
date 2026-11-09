'use client'

import { m } from 'motion/react'
import { Frame } from '../Frame'

type Row = { step: string; value: number; detail: string }

// Entonnoir du tour : une barre centrée par étape, de largeur proportionnelle au nombre de skills
// (échelle linéaire, honnête). Les barres s'ouvrent depuis l'axe central, l'une après l'autre.
// Sans JavaScript ou avec prefers-reduced-motion, les barres sont déjà à leur taille.
export function Funnel({ rows, legend, footer, locale }: { rows: Row[]; legend: string; footer: { check: string; target: string }; locale: string }) {
  const format = new Intl.NumberFormat(locale)
  const max = Math.max(...rows.map(row => row.value))
  return (
    <Frame as="figure" legend={legend} className="bg-panel/40 p-5 pt-8 md:p-8 md:pt-10">
      <ol className="relative flex flex-col">
        {/* l'axe de l'entonnoir */}
        <span aria-hidden className="absolute inset-y-0 left-1/2 hidden w-px bg-line md:block" />
        {rows.map((row, i) => (
          <li key={row.step} className="relative grid grid-cols-[minmax(0,1fr)_auto] items-end gap-x-4 gap-y-2 py-4 md:grid-cols-[13rem_minmax(0,1fr)_13rem] md:items-center md:gap-x-8 md:py-5">
            <div className="flex flex-col gap-1">
              <p className="caps text-[11px] text-muted tabular">
                {String(i + 1).padStart(2, '0')} · {row.step}
              </p>
              <p className="hidden text-[13px] leading-snug text-muted md:block">{row.detail}</p>
            </div>
            <p className="text-right font-mono text-[1.5rem] tracking-[-0.02em] tabular md:order-last md:text-[1.9rem]">{format.format(row.value)}</p>
            <div aria-hidden className="col-span-2 flex h-3 items-center justify-center md:col-span-1">
              <m.span
                className="block h-full bg-fg/85"
                style={{ width: `${Math.max(2, (row.value / max) * 100)}%` }}
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '0px 0px -10% 0px' }}
                transition={{ duration: 0.7, delay: 0.1 + i * 0.14, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
            <p className="col-span-2 text-[13px] leading-snug text-muted md:hidden">{row.detail}</p>
          </li>
        ))}
      </ol>
      <m.p
        className="mt-4 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-line pt-5 font-mono text-[12px] uppercase tracking-[0.06em] text-muted"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.1 + rows.length * 0.14 + 0.3 }}
      >
        <span className="text-fg">
          <span aria-hidden>✓ </span>
          {footer.check}
        </span>
        <span aria-hidden className="text-subtle">→</span>
        <span>{footer.target}</span>
      </m.p>
    </Frame>
  )
}

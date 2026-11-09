import { Fragment } from 'react'
import { InlineCode } from '../InlineCode'
import { Reveal } from '../motion/Reveal'

type Node = { title: string; text: string; tag?: string }

// Parcours en étapes reliées : en ligne sur grand écran, en colonne sur mobile. Chaque nœud entre
// à son tour au scroll ; le dernier, celui qui compte pour l'utilisateur, est mis en avant.
export function FlowDiagram({ nodes, legend }: { nodes: Node[]; legend: string }) {
  return (
    <figure className="relative border border-line bg-panel/40 p-5 pt-8 md:p-7 md:pt-10">
      <span aria-hidden className="frame-marks" />
      <figcaption className="frame-legend">{legend}</figcaption>
      <ol className="flex flex-col items-stretch lg:flex-row">
        {nodes.map((node, i) => {
          const last = i === nodes.length - 1
          return (
            <Fragment key={node.title}>
              {i > 0 && (
                <li aria-hidden className="flex shrink-0 items-center justify-center py-1.5 font-mono text-[13px] text-subtle lg:px-1 lg:py-0">
                  <span className="hidden h-px w-4 bg-line-strong lg:block" />
                  <span className="lg:hidden">↓</span>
                  <span className="hidden lg:inline">›</span>
                </li>
              )}
              <li className="min-w-0 flex-1">
                <Reveal index={i * 2} className="h-full">
                  <div className={`flex h-full flex-col gap-2 border p-4 ${last ? 'border-line-strong bg-panel-2' : 'border-line bg-bg'}`}>
                    <p className="flex items-center justify-between gap-2 font-mono text-[11px] text-muted tabular">
                      <span>{String(i + 1).padStart(2, '0')}</span>
                      {node.tag && <span className="caps text-[10px]">{node.tag}</span>}
                    </p>
                    <p className="text-[15px] leading-snug text-fg">{node.title}</p>
                    <p className="text-[13px] leading-relaxed text-muted">
                      <InlineCode text={node.text} />
                    </p>
                  </div>
                </Reveal>
              </li>
            </Fragment>
          )
        })}
      </ol>
    </figure>
  )
}

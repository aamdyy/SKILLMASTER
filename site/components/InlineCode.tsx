import { Fragment } from 'react'

// Rend les `extraits` entre accents graves (critères de détection) en petits cadres mono.
export function InlineCode({ text }: { text: string }) {
  return (
    <>
      {text.split(/(`[^`]+`)/).map((part, i) =>
        part.startsWith('`') ? (
          <code key={i} className="mx-0.5 rounded border border-line-strong bg-panel-2 px-1.5 py-0.5 font-mono text-[12px] text-fg">
            {part.slice(1, -1)}
          </code>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  )
}

import type { Lang } from '@/lib/lang'
import { CopyButton } from './CopyButton'
import { Frame } from './Frame'

// Commande à taper : cadre technique, invite « $ » (terminal) ou « › » (session Claude Code),
// et bouton de copie. Sans JavaScript, le texte reste sélectionnable.
export function CodeBlock({ lines, where = 'terminal', lang = 'fr' }: { lines: string[]; where?: 'terminal' | 'session'; lang?: Lang }) {
  const prompt = where === 'terminal' ? '$' : '›'
  const legend = where === 'terminal' ? 'terminal' : lang === 'en' ? 'claude code session' : 'session claude code'
  return (
    <Frame legend={legend} className="bg-panel/60">
      <div className="flex items-start justify-between gap-4 p-4 pt-5">
        <pre className="min-w-0 overflow-x-auto font-mono text-[13px] leading-relaxed text-fg">
          {lines.map(line => (
            <code key={line} className="block">
              <span aria-hidden className="select-none text-subtle">{prompt} </span>
              {line}
            </code>
          ))}
        </pre>
        <CopyButton text={lines.join('\n')} label={lang === 'en' ? 'Copy' : 'Copier'} done={lang === 'en' ? 'Copied' : 'Copié'} />
      </div>
    </Frame>
  )
}

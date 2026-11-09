import type { ReactNode } from 'react'
import type { DetectionRule } from '@/lib/library'
import { type Lang } from '@/lib/lang'
import { Reveal } from '../motion/Reveal'

const T = {
  fr: {
    when: 'si le dossier contient', files: 'fichiers', deps: 'dans package.json', content: 'contenant', depth: (n: number) => `jusqu’à ${n} niveaux`,
    unless: 'sauf si', unlessDeps: 'package.json cite', then: 'alors', pack: 'pack proposé', head: (n: number) => `${n} skills en tête`,
    words: 'sinon, les mots du prompt', wordsNote: 'seulement si les fichiers ne révèlent aucun type',
    always: 'pour tout projet', alwaysText: 'aucun fichier requis : ce pack vaut quelle que soit la techno',
  },
  en: {
    when: 'if the folder contains', files: 'files', deps: 'in package.json', content: 'containing', depth: (n: number) => `up to ${n} levels deep`,
    unless: 'unless', unlessDeps: 'package.json lists', then: 'then', pack: 'suggested pack', head: (n: number) => `${n} skills in the head`,
    words: 'otherwise, the prompt’s words', wordsNote: 'only when the files reveal no type',
    always: 'for any project', alwaysText: 'no file needed: this pack applies whatever the stack',
  },
}

const Chip = ({ children }: { children: string }) => (
  <code className="rounded border border-line-strong bg-panel-2 px-1.5 py-0.5 font-mono text-[12px] text-fg">{children}</code>
)
const Chips = ({ items }: { items: string[] }) => (
  <span className="flex flex-wrap gap-1.5">
    {items.map(item => (
      <Chip key={item}>{item}</Chip>
    ))}
  </span>
)
function Node({ legend, children, index, strong = false }: { legend: string; children: ReactNode; index: number; strong?: boolean }) {
  return (
    <Reveal index={index} className="min-w-0 flex-1">
      <div className={`relative flex h-full flex-col gap-3 border p-4 pt-5 ${strong ? 'border-line-strong bg-panel-2' : 'border-line bg-bg'}`}>
        <span className="frame-legend">{legend}</span>
        {children}
      </div>
    </Reveal>
  )
}
// Flèche entre deux nœuds : à l'horizontale sur grand écran, à la verticale sur mobile.
const Arrow = () => (
  <span aria-hidden className="flex shrink-0 items-center justify-center py-1 font-mono text-[13px] text-subtle lg:px-1 lg:py-0">
    <span className="hidden h-px w-5 bg-line-strong lg:block" />
    <span className="lg:hidden">↓</span>
    <span className="hidden lg:inline">›</span>
  </span>
)
const Line = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <p className="caps text-[10.5px] text-muted">{label}</p>
    {children}
  </div>
)

// Schéma de la règle de détection d'un pack (plugins/skillmaster/detection.json) : ce que le mod
// cherche dans le dossier, ce qui l'exclut, le pack qui en sort ; puis le repli sur les mots du prompt.
export function DetectionDiagram({ rule, packLabel, headCount, lang }: { rule: DetectionRule; packLabel: string; headCount: number; lang: Lang }) {
  const t = T[lang]
  const hasFiles = rule.fichiers.length + rule.dependances.length + rule.contenus.length > 0
  const result = (index: number) => (
    <Node legend={t.then} index={index} strong>
      <Line label={t.pack}>
        <p className="text-[1.35rem] leading-tight tracking-[-0.02em] text-fg">{packLabel}</p>
      </Line>
      <p className="font-mono text-[12px] text-muted tabular">{t.head(headCount)}</p>
    </Node>
  )
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-stretch lg:flex-row">
        {hasFiles ? (
          <Node legend={t.when} index={0}>
            {rule.fichiers.length > 0 && (
              <Line label={rule.profondeur ? `${t.files} · ${t.depth(rule.profondeur)}` : t.files}>
                <Chips items={rule.fichiers} />
              </Line>
            )}
            {rule.dependances.length > 0 && (
              <Line label={t.deps}>
                <Chips items={rule.dependances} />
              </Line>
            )}
            {rule.contenus.map(item => (
              <Line key={item.fichiers.join()} label={`${item.fichiers.join(' · ')} ${t.content}`}>
                <Chips items={item.cherche} />
              </Line>
            ))}
          </Node>
        ) : (
          <Node legend={t.always} index={0}>
            <p className="text-sm leading-relaxed text-fg/85">{t.alwaysText}</p>
          </Node>
        )}
        {rule.sauf.length > 0 && (
          <>
            <Arrow />
            <Node legend={t.unless} index={1}>
              <Line label={t.unlessDeps}>
                <Chips items={rule.sauf} />
              </Line>
            </Node>
          </>
        )}
        <Arrow />
        {result(2)}
      </div>
      {rule.mots.length > 0 && (
        <Reveal index={3}>
          <div className="flex flex-col gap-2 border-t border-dashed border-line-strong pt-5">
            <p className="caps text-[10.5px] text-muted">
              {t.words} <span className="normal-case tracking-normal">· {t.wordsNote}</span>
            </p>
            <Chips items={rule.mots} />
          </div>
        </Reveal>
      )}
    </div>
  )
}

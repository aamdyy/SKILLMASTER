import Link from 'next/link'
import { skillHref, type Pack, type Skill } from '@/lib/library'
import { Frame } from './Frame'
import { InlineCode } from './InlineCode'
import { NoteBadge } from './Badges'

// « skill + type de projet = pack », avec de vraies données.
function Operator({ children }: { children: string }) {
  return (
    <span aria-hidden className="grid place-items-center py-3 font-mono text-3xl font-light text-muted lg:px-1 lg:py-0">
      {children}
    </span>
  )
}

export function Construction({ skill, pack, detection }: { skill: Skill; pack: Pack; detection: string }) {
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
      <Frame legend="skill" className="p-5 pt-6">
        <Link href={skillHref(skill)} className="flex h-full flex-col gap-3">
          <p className="truncate font-mono text-[13px] text-fg">{skill.nom}</p>
          <p className="truncate font-mono text-[11px] text-muted">{skill.repo}</p>
          <p className="text-sm leading-relaxed text-fg/80">{skill.resume}</p>
          <div className="mt-auto">
            <NoteBadge note={skill.note} />
          </div>
        </Link>
      </Frame>
      <Operator>+</Operator>
      <span className="sr-only">plus</span>
      <Frame legend="type de projet" className="p-5 pt-6">
        <div className="flex h-full flex-col gap-3">
          <p className="font-mono text-[13px] text-fg">{pack.type}</p>
          <p className="caps text-[11px] text-muted">détecté par</p>
          <p className="text-sm leading-loose text-fg/80">
            <InlineCode text={detection} />
          </p>
        </div>
      </Frame>
      <Operator>=</Operator>
      <span className="sr-only">égale</span>
      <Frame legend="pack" className="bg-panel p-5 pt-6">
        <Link href={`/packs/${pack.type}/`} className="flex h-full flex-col gap-3">
          <p className="font-mono text-[15px] uppercase tracking-[0.06em] text-fg">{pack.label}</p>
          <p className="text-sm text-muted tabular">
            {pack.recommandes.length} en tête · {pack.ajouts.length} ajouts
          </p>
          <ol className="mt-auto flex flex-col gap-1 border-t border-line pt-3 font-mono text-[12px]">
            {pack.recommandes.slice(0, 4).map((item, i) => (
              <li key={item.id} className={`flex min-w-0 gap-3 ${item.id === skill.id ? 'text-accent' : 'text-fg/80'}`}>
                <span aria-hidden className="text-subtle tabular">{String(i + 1).padStart(2, '0')}</span>
                <span className="truncate">{item.nom}</span>
              </li>
            ))}
          </ol>
        </Link>
      </Frame>
    </div>
  )
}

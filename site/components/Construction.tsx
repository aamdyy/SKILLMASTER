import Link from 'next/link'
import { href, type Lang } from '@/lib/lang'
import { labelOf, skillHref, tr, type Pack, type Skill } from '@/lib/library'
import { Frame } from './Frame'
import { InlineCode } from './InlineCode'
import { NoteBadge } from './Badges'

const T = {
  fr: { skill: 'skill', type: 'type de projet', detected: 'détecté par', pack: 'pack', plus: 'plus', equals: 'égale', head: 'en tête', extras: 'ajouts' },
  en: { skill: 'skill', type: 'project type', detected: 'detected by', pack: 'pack', plus: 'plus', equals: 'equals', head: 'in the head', extras: 'extras' },
}

// « skill + type de projet = pack », avec de vraies données.
function Operator({ children }: { children: string }) {
  return (
    <span aria-hidden className="grid place-items-center py-3 font-mono text-3xl font-light text-muted lg:px-1 lg:py-0">
      {children}
    </span>
  )
}

export function Construction({ skill, pack, detection, lang = 'fr' }: { skill: Skill; pack: Pack; detection: string; lang?: Lang }) {
  const t = T[lang]
  return (
    <div className="flex flex-col lg:grid lg:grid-cols-[1fr_auto_1fr_auto_1fr] lg:items-stretch">
      <Frame legend={t.skill} className="p-5 pt-6">
        <Link href={skillHref(skill, lang)} className="flex h-full flex-col gap-3">
          <p className="truncate font-mono text-[13px] text-fg">{skill.nom}</p>
          <p className="truncate font-mono text-[11px] text-muted">{skill.repo}</p>
          <p className="text-sm leading-relaxed text-fg/80">{tr(lang, skill.resume)}</p>
          <div className="mt-auto">
            <NoteBadge note={skill.note} lang={lang} />
          </div>
        </Link>
      </Frame>
      <Operator>+</Operator>
      <span className="sr-only">{t.plus}</span>
      <Frame legend={t.type} className="p-5 pt-6">
        <div className="flex h-full flex-col gap-3">
          <p className="font-mono text-[13px] text-fg">{pack.type}</p>
          <p className="caps text-[11px] text-muted">{t.detected}</p>
          <p className="text-sm leading-loose text-fg/80">
            <InlineCode text={tr(lang, detection)} />
          </p>
        </div>
      </Frame>
      <Operator>=</Operator>
      <span className="sr-only">{t.equals}</span>
      <Frame legend={t.pack} className="bg-panel p-5 pt-6">
        <Link href={href.pack(lang, pack.type)} className="flex h-full flex-col gap-3">
          <p className="font-mono text-[15px] uppercase tracking-[0.06em] text-fg">{labelOf(pack.type, lang)}</p>
          <p className="text-sm text-muted tabular">
            {pack.recommandes.length} {t.head} · {pack.ajouts.length} {t.extras}
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

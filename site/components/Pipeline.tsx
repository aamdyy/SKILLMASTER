import { href, type Lang } from '@/lib/lang'
import { Button } from './Button'
import { Label } from './Label'

// Le pipeline en quatre étapes numérotées, reliées par un filet vertical.
export function Pipeline({ steps, intro, lang = 'fr' }: { steps: { title: string; text: string }[]; intro: string; lang?: Lang }) {
  return (
    <div className="grid gap-14 lg:grid-cols-2 lg:gap-16">
      <div className="flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
        <Label as="h2" id="titre-pipeline">Pipeline</Label>
        <p className="text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">{lang === 'en' ? 'Every Monday, hands-off.' : 'Chaque lundi, sans intervention.'}</p>
        <p className="max-w-md text-[15px] leading-relaxed text-muted">{intro}</p>
        <Button href={href.changes(lang)} variant="secondary" className="w-fit">
          {lang === 'en' ? 'See the changes' : 'Voir les changements'}
        </Button>
      </div>
      <ol className="flex flex-col">
        {steps.map((step, i) => (
          <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
            <span className="pt-0.5 font-mono text-[12px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
            <div className={`flex flex-col gap-2 border-l border-line-strong pb-10 pl-6 ${i === steps.length - 1 ? 'pb-0' : ''}`}>
              <h3 className="font-mono text-[14px] uppercase tracking-[0.08em] text-fg">{step.title}</h3>
              <p className="text-[15px] leading-relaxed text-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

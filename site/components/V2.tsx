import Link from 'next/link'
import { formatInt } from '@/lib/format'
import { href, type Lang } from '@/lib/lang'
import { Frame } from './Frame'
import { Label } from './Label'
import { Reveal } from './motion/Reveal'

type Figures = { analyses: number; critiques: number; packs: number }

const REPO = 'https://github.com/aamdyy/SKILLMASTER'

const T = {
  fr: {
    label: 'V2 · 5 nov. 2026',
    title: 'Ce qui a changé sous le capot.',
    intro: 'La V2 commence par ce qui ne se voit pas : la sécurité et la fiabilité des packs. Le reste arrive par étapes.',
    cards: (f: Figures, lang: Lang) => [
      { legend: 'sécurité', figure: formatInt(f.analyses, lang), unit: 'skills scannés en entier', text: `Annexes et scripts compris, pas seulement le SKILL.md. ${formatInt(f.critiques, lang)} skills au risque critique ne sont jamais chargés, et un hook reste toujours écarté, quel que soit l’éditeur.` },
      { legend: 'packs fiables', figure: '4', unit: 'garde-fous avant publication', text: 'Le tour échoue plutôt que d’abîmer la bibliothèque : catalogue qui perd plus de 10 %, têtes de pack introuvables, verdicts manquants, budget dépassé. Le juge change 2 skills au plus par pack.' },
      { legend: 'nouveau pack', figure: String(f.packs), unit: 'packs, dont Méthode', text: 'Relecture, débogage, tests : un pack pour tous les projets, quelle que soit la techno. Le pack Data est recentré sur Postgres, DuckDB et pandas.', link: { href: href.pack(lang, 'methode'), label: 'Voir le pack Méthode' } },
      { legend: 'open source', figure: 'MIT', unit: 'licence du code', text: 'Le code de SKILLMASTER est public, avec un README. Les tests tournent à chaque push et avant chaque tour du lundi.', link: { href: REPO, label: 'Le dépôt GitHub', external: true } },
    ],
    next: 'en préparation',
    nextItems: [
      ['Routeur', 'le bon skill à chaque prompt, glissé sans dialogue'],
      ['Réglage mode', 'proposer, ombre ou auto, choisi une fois pour toutes'],
      ['Radar', 'les skills qui montent cette semaine, avec /sm radar'],
      ['Nano-règles', 'un rappel de 15 mots, au moment où il sert'],
    ],
    newTab: ' (nouvel onglet)',
  },
  en: {
    label: 'V2 · Nov 5, 2026',
    title: 'What changed under the hood.',
    intro: 'V2 starts with what you don’t see: security and pack reliability. The rest ships step by step.',
    cards: (f: Figures, lang: Lang) => [
      { legend: 'security', figure: formatInt(f.analyses, lang), unit: 'skills scanned in full', text: `Annexes and scripts included, not just SKILL.md. ${formatInt(f.critiques, lang)} skills with a critical risk are never loaded, and a hook is always set aside, whoever the publisher.` },
      { legend: 'reliable packs', figure: '4', unit: 'checks before publishing', text: 'A run fails rather than damage the library: a catalog losing more than 10%, missing pack heads, missing verdicts, budget exceeded. The judge changes 2 skills at most per pack.' },
      { legend: 'new pack', figure: String(f.packs), unit: 'packs, including Method', text: 'Review, debugging, tests: a pack for every project, whatever the stack. The Data pack now focuses on Postgres, DuckDB and pandas.', link: { href: href.pack(lang, 'methode'), label: 'See the Method pack' } },
      { legend: 'open source', figure: 'MIT', unit: 'code license', text: 'SKILLMASTER’s code is public, with a README. Tests run on every push and before every Monday run.', link: { href: REPO, label: 'The GitHub repository', external: true } },
    ],
    next: 'in the works',
    nextItems: [
      ['Router', 'the right skill for each prompt, slipped in without a dialog'],
      ['Mode setting', 'suggest, shadow or auto, chosen once and for all'],
      ['Radar', 'the skills rising this week, with /sm radar'],
      ['Nano-rules', 'a 15-word reminder, right when it helps'],
    ],
    newTab: ' (new tab)',
  },
}

// Section V2 de l'accueil : ce qui est livré, en quatre cadres avec un vrai chiffre chacun (recalculé
// à chaque build), puis ce qui est en préparation, sans date, nettement à part.
export function V2({ figures, lang }: { figures: Figures; lang: Lang }) {
  const t = T[lang]
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-5">
        <Label as="h2" id="titre-v2">{t.label}</Label>
        <p className="max-w-2xl text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">{t.title}</p>
        <p className="max-w-xl text-[15px] leading-relaxed text-muted">{t.intro}</p>
      </div>
      <ul className="grid gap-5 sm:grid-cols-2">
        {t.cards(figures, lang).map((card, i) => (
          <li key={card.legend}>
            <Reveal index={i} className="h-full">
              <Frame legend={card.legend} className="flex h-full flex-col gap-4 bg-panel/40 p-5 pt-7 md:p-7 md:pt-8">
                <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="font-mono text-[2.4rem] leading-none tracking-[-0.03em] tabular md:text-[2.9rem]">{card.figure}</span>
                  <span className="caps text-[11px] text-muted">{card.unit}</span>
                </p>
                <p className="text-[14.5px] leading-relaxed text-fg/80">{card.text}</p>
                {card.link && (
                  <Link
                    href={card.link.href}
                    prefetch={false}
                    {...('external' in card.link ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className="mt-auto w-fit font-mono text-[12px] uppercase tracking-[0.06em] text-fg/75 underline-offset-4 transition-colors duration-150 hover:text-fg hover:underline"
                  >
                    {card.link.label}
                    {'external' in card.link && <span className="sr-only">{t.newTab}</span>}
                    <span aria-hidden> {'external' in card.link ? '↗' : '→'}</span>
                  </Link>
                )}
              </Frame>
            </Reveal>
          </li>
        ))}
      </ul>
      <Reveal index={4}>
        <div className="relative border border-dashed border-line-strong p-5 pt-7 md:p-7 md:pt-8">
          <p className="frame-legend">{t.next}</p>
          <ul className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.nextItems.map(([name, text]) => (
              <li key={name} className="flex flex-col gap-1">
                <p className="font-mono text-[13px] text-fg/85">{name}</p>
                <p className="text-[13px] leading-relaxed text-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </div>
  )
}

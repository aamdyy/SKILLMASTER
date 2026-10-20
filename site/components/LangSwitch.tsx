'use client'

import { usePathname } from 'next/navigation'
import { counterpart, LANGS, type Lang } from '@/lib/lang'

const NAMES: Record<Lang, string> = { fr: 'Version française', en: 'English version' }

// FR / EN : la langue courante est marquée, l'autre mène à la même page dans cette langue.
// Lien simple (pas <Link>) : chaque langue a son layout racine, le changement recharge la page.
export function LangSwitch({ lang }: { lang: Lang }) {
  const path = usePathname() ?? '/'
  return (
    <div className="flex h-10 items-center rounded-lg border border-line-strong px-1 font-mono text-[11.5px] tracking-[0.06em]">
      {LANGS.map(option =>
        option === lang ? (
          <span key={option} aria-current="true" className="px-2 text-fg">
            <span className="sr-only">{NAMES[option]} : </span>
            {option.toUpperCase()}
          </span>
        ) : (
          <a key={option} href={counterpart(path, option)} hrefLang={option} lang={option} aria-label={NAMES[option]} className="flex h-8 items-center rounded-md px-2 text-muted transition-colors duration-150 hover:text-fg">
            {option.toUpperCase()}
          </a>
        ),
      )}
    </div>
  )
}

import { href, type Lang } from '@/lib/lang'

const T = {
  fr: { label: 'Chercher un skill dans toute la bibliothèque', placeholder: 'nom ou dépôt', submit: 'Chercher' },
  en: { label: 'Search the whole library for a skill', placeholder: 'name or repository', submit: 'Search' },
}

// Recherche : formulaire GET vers /skills/ (marche sans JavaScript ; le filtre s'applique à l'arrivée).
export function SearchField({ className = '', lang = 'fr' }: { className?: string; lang?: Lang }) {
  const t = T[lang]
  return (
    <form action={href.skills(lang)} method="get" role="search" className={`w-full ${className}`}>
      <label htmlFor="recherche" className="sr-only">
        {t.label}
      </label>
      <div className="flex h-12 items-center gap-3 rounded-lg border border-line-strong bg-panel pl-4 pr-1 transition-colors duration-150 focus-within:border-tick">
        <span aria-hidden className="font-mono text-[12px] text-muted">&gt;_</span>
        <input
          id="recherche"
          name="q"
          type="search"
          placeholder={t.placeholder}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] text-fg placeholder:text-muted focus:outline-none md:text-sm"
        />
        <button type="submit" className="btn-primary inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 font-mono text-[11.5px] uppercase tracking-[0.06em]">
          {t.submit} <span aria-hidden>↵</span>
        </button>
      </div>
    </form>
  )
}

// Recherche de l'accueil : une pastille blanche, formulaire GET vers /skills/ (marche sans JavaScript).
export function SearchField() {
  return (
    <form action="/skills/" method="get" role="search" className="w-full sm:w-80">
      <label htmlFor="recherche" className="sr-only">
        Chercher un skill dans toute la bibliothèque
      </label>
      <div className="flex h-11 items-center gap-2 rounded-full bg-card pl-4 pr-1 text-ink">
        <svg aria-hidden width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" className="shrink-0 text-ink-muted">
          <circle cx="7" cy="7" r="4.75" />
          <path d="m10.5 10.5 3.25 3.25" strokeLinecap="round" />
        </svg>
        <input
          id="recherche"
          name="q"
          type="search"
          placeholder="Chercher un skill"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-base text-ink placeholder:text-ink-muted focus:outline-none sm:text-sm"
        />
        <button type="submit" aria-label="Chercher" className="grid size-9 shrink-0 place-items-center rounded-full bg-ink text-card transition-transform duration-150 motion-safe:hover:translate-x-0.5">
          <svg aria-hidden width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M2.5 7h9M8 3.5 11.5 7 8 10.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </form>
  )
}

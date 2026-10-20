// Recherche : formulaire GET vers /skills/ (marche sans JavaScript ; le filtre s'applique à l'arrivée).
export function SearchField({ className = '' }: { className?: string }) {
  return (
    <form action="/skills/" method="get" role="search" className={`w-full ${className}`}>
      <label htmlFor="recherche" className="sr-only">
        Chercher un skill dans toute la bibliothèque
      </label>
      <div className="flex h-12 items-center gap-3 rounded-lg border border-line-strong bg-panel pl-4 pr-1 transition-colors duration-150 focus-within:border-tick">
        <span aria-hidden className="font-mono text-[12px] text-muted">&gt;_</span>
        <input
          id="recherche"
          name="q"
          type="search"
          placeholder="nom ou dépôt"
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] text-fg placeholder:text-muted focus:outline-none md:text-sm"
        />
        <button type="submit" className="btn-primary inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 font-mono text-[11.5px] uppercase tracking-[0.06em]">
          Chercher <span aria-hidden>↵</span>
        </button>
      </div>
    </form>
  )
}

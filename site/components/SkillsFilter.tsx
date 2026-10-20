'use client'

import { useEffect, useRef, useState } from 'react'

type TypeOption = { type: string; label: string; count: number }
export type FilterText = { label: string; placeholder: string; legend: string; all: string; shown: (shown: number, total: number) => string }

const normalize = (text: string) => text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

// Filtre de /skills : par nom (nom, dépôt, résumé) et par type. La liste est rendue au build ;
// le filtre masque les lignes sans re-rendu React. Sans JavaScript, toute la liste reste visible.
// L'état vit dans l'adresse (?q=…&type=…), pour partager une recherche.
export function SkillsFilter({ types, total, listId, text }: { types: TypeOption[]; total: number; listId: string; text: Omit<FilterText, 'shown'> & { shown: string } }) {
  const [query, setQuery] = useState('')
  const [type, setType] = useState('tous')
  const [shown, setShown] = useState(total)
  // Tant que l'adresse n'est pas lue, on ne touche pas aux lignes : le script de la page les a
  // peut-être déjà filtrées pendant le chargement.
  const [ready, setReady] = useState(false)
  // Texte cherchable de chaque ligne (nom, dépôt, résumé), lu une fois dans le HTML rendu.
  const rows = useRef<{ element: HTMLElement; text: string }[]>([])

  useEffect(() => {
    rows.current = [...document.querySelectorAll<HTMLElement>(`#${listId} [data-skill-row]`)].map(element => ({ element, text: normalize(element.textContent ?? '') }))
    const params = new URLSearchParams(window.location.search)
    setQuery(params.get('q') ?? '')
    setType(params.get('type') ?? 'tous')
    setReady(true)
  }, [listId])

  useEffect(() => {
    if (!ready) return
    const words = normalize(query).split(/\s+/).filter(Boolean)
    let count = 0
    for (const { element, text } of rows.current) {
      const visible = (type === 'tous' || element.dataset.type === type) && words.every(word => text.includes(word))
      element.hidden = !visible
      if (visible) count++
    }
    setShown(count)
    const params = new URLSearchParams()
    if (query) params.set('q', query)
    if (type !== 'tous') params.set('type', type)
    const search = params.toString()
    window.history.replaceState(null, '', search ? `?${search}` : window.location.pathname)
  }, [query, type, ready])

  return (
    <div className="flex flex-col gap-5">
      <form role="search" onSubmit={event => event.preventDefault()} className="flex h-12 items-center gap-3 rounded-lg border border-line-strong bg-panel px-4 transition-colors duration-150 focus-within:border-tick">
        <label htmlFor="filtre" className="sr-only">
          {text.label}
        </label>
        <span aria-hidden className="font-mono text-[12px] text-muted">&gt;_</span>
        <input
          id="filtre"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
          placeholder={text.placeholder}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] text-fg placeholder:text-muted focus:outline-none md:text-sm"
        />
      </form>
      <fieldset className="flex flex-wrap gap-2">
        <legend className="sr-only">{text.legend}</legend>
        {[{ type: 'tous', label: text.all, count: total }, ...types].map(option => (
          <button
            key={option.type}
            type="button"
            aria-pressed={type === option.type}
            onClick={() => setType(option.type)}
            className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 font-mono text-[11.5px] uppercase tracking-[0.06em] transition-colors duration-150 ${type === option.type ? 'border-fg bg-fg text-bg' : 'border-line-strong text-fg/80 hover:border-tick hover:text-fg'}`}
          >
            {option.label}
            <span className="sr-only"> :</span>
            <span className={`tabular ${type === option.type ? 'text-bg/70' : 'text-muted'}`}>{option.count}</span>
          </button>
        ))}
      </fieldset>
      <p aria-live="polite" className="font-mono text-[11.5px] uppercase tracking-[0.06em] text-muted tabular">
        {text.shown.replace('{n}', String(shown)).replace('{s}', shown > 1 ? 's' : '').replace('{total}', String(total))}
      </p>
    </div>
  )
}

import type { Lang } from '@/lib/lang'

// « ce qu'il fait → ce qu'il améliore » : la flèche en accent, le lecteur d'écran lit une transition.
// `lang` : la langue du texte affiché (le résumé reste en français tant qu'il n'est pas traduit).
export function Resume({ text, className = '', lang = 'fr' }: { text: string; className?: string; lang?: Lang }) {
  const [does, improves] = text.split('→').map(part => part.trim())
  return (
    <p className={className} lang={lang}>
      {does}
      {improves && (
        <>
          {' '}
          <span aria-hidden className="text-accent">→</span>
          <span className="sr-only">{lang === 'en' ? ', which improves:' : ', ce qui améliore :'}</span> {improves}
        </>
      )}
    </p>
  )
}

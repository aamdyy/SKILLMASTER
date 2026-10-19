// « ce qu'il fait → ce qu'il améliore » : la flèche en accent, le lecteur d'écran lit une transition.
export function Resume({ text, className = '' }: { text: string; className?: string }) {
  const [does, improves] = text.split('→').map(part => part.trim())
  return (
    <p className={className}>
      {does}
      {improves && (
        <>
          {' '}
          <span aria-hidden className="text-accent">→</span>
          <span className="sr-only">, ce qui améliore :</span> {improves}
        </>
      )}
    </p>
  )
}

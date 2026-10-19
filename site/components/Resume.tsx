// « ce qu'il fait → ce qu'il améliore » : la flèche passe en vert, le lecteur d'écran lit une transition.
export function Resume({ text, className = '' }: { text: string; className?: string }) {
  const [does, improves] = text.split('→').map(part => part.trim())
  return (
    <p className={`font-display font-medium italic tracking-[-0.02em] ${className}`}>
      {does}
      {improves && (
        <>
          {' '}
          <span aria-hidden className="not-italic text-[#0f9d55]">→</span>
          <span className="sr-only">, ce qui améliore :</span> {improves}
        </>
      )}
    </p>
  )
}

import type { ReactNode } from 'react'

// Étiquette de section façon commentaire de code : « // PACKS ».
export function Label({ children, as: Tag = 'p', id }: { children: ReactNode; as?: 'p' | 'span' | 'h2'; id?: string }) {
  return (
    <Tag id={id} className="label-code">
      <span aria-hidden>// </span>
      {children}
    </Tag>
  )
}

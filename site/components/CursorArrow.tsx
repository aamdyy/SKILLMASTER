// Petite flèche de curseur décorative.
export function CursorArrow({ tone = 'white', className = '' }: { tone?: 'white' | 'green'; className?: string }) {
  return (
    <svg aria-hidden width="22" height="22" viewBox="0 0 22 22" className={className}>
      <path
        d="M3 2.5 19 9.2c.6.3.6 1.1-.1 1.3l-6.4 2-2.1 6.3c-.2.7-1.1.7-1.3.1L2.5 3c-.2-.4.2-.8.5-.5Z"
        fill={tone === 'green' ? 'var(--accent)' : '#fff'}
      />
    </svg>
  )
}

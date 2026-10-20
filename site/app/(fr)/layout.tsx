import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Shell } from '@/components/Shell'
import { SITE_URL } from '@/lib/lang'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'skillmaster — les bons skills Claude Code', template: '%s · skillmaster' },
  description: 'Bibliothèque de skills Claude Code triée par type de projet, notée et mise à jour chaque lundi.',
}

export const viewport: Viewport = { themeColor: '#070707', colorScheme: 'dark' }

export default function Layout({ children }: { children: ReactNode }) {
  return <Shell lang="fr">{children}</Shell>
}

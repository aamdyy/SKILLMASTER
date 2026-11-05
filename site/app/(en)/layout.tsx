import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Shell } from '@/components/Shell'
import { SITE_URL } from '@/lib/lang'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'skillmaster — the right Claude Code skills', template: '%s · skillmaster' },
  description: 'A library of Claude Code skills sorted by project type, rated and updated every Monday.',
  openGraph: {
    type: 'website',
    siteName: 'skillmaster',
    locale: 'en_US',
    alternateLocale: 'fr_FR',
    images: [{ url: '/video/skillmaster-teaser.jpg', width: 1280, height: 720, alt: 'The skillmaster teaser' }],
  },
  twitter: { card: 'summary_large_image', images: ['/video/skillmaster-teaser.jpg'] },
}

export const viewport: Viewport = { themeColor: '#070707', colorScheme: 'dark' }

export default function Layout({ children }: { children: ReactNode }) {
  return <Shell lang="en">{children}</Shell>
}

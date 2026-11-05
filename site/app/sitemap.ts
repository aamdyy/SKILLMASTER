import type { MetadataRoute } from 'next'
import { counterpart, SITE_URL } from '@/lib/lang'
import { getFiches, PACKS, skillHref } from '@/lib/library'

export const dynamic = 'force-static'

// Chaque page française, avec sa version anglaise. Le sitemap suit la bibliothèque à chaque build.
export default function sitemap(): MetadataRoute.Sitemap {
  const paths = ['/', '/skills/', '/changements/', '/installation/', ...PACKS.map(pack => `/packs/${pack.type}/`), ...getFiches().map(skill => skillHref(skill, 'fr'))]
  return paths.map(path => ({
    url: `${SITE_URL}${path}`,
    alternates: { languages: { fr: `${SITE_URL}${path}`, en: `${SITE_URL}${counterpart(path, 'en')}` } },
  }))
}

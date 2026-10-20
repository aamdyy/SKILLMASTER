import type { NextConfig } from 'next'

// Site statique : tout est généré au build à partir de ../library (lecture seule).
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // Deux layouts racine (fr, en) : la page 404 commune passe par app/global-not-found.tsx.
  experimental: { globalNotFound: true },
}

export default config

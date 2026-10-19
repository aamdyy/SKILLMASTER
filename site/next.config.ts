import type { NextConfig } from 'next'

// Site statique : tout est généré au build à partir de ../library (lecture seule).
const config: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
}

export default config

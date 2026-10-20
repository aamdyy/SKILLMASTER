import { alternatesFor } from '@/lib/lang'
import { HomeView } from '@/views/HomeView'

export const metadata = { alternates: alternatesFor('fr', '/') }

export default function Page() {
  return <HomeView lang="fr" />
}

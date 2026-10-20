import { ChangesView, changesMetadata } from '@/views/ChangesView'

export const metadata = changesMetadata('fr')

export default function Page() {
  return <ChangesView lang="fr" />
}

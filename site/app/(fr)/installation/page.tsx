import { InstallView, installMetadata } from '@/views/InstallView'

export const metadata = installMetadata('fr')

export default function Page() {
  return <InstallView lang="fr" />
}

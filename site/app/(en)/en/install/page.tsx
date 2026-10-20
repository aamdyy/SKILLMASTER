import { InstallView, installMetadata } from '@/views/InstallView'

export const metadata = installMetadata('en')

export default function Page() {
  return <InstallView lang="en" />
}

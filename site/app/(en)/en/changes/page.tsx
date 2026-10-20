import { ChangesView, changesMetadata } from '@/views/ChangesView'

export const metadata = changesMetadata('en')

export default function Page() {
  return <ChangesView lang="en" />
}

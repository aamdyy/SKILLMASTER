import { PackView, packMetadata, packParams } from '@/views/PackView'

export const dynamicParams = false
export const generateStaticParams = packParams

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }) {
  return packMetadata('fr', (await params).type)
}

export default async function Page({ params }: { params: Promise<{ type: string }> }) {
  return <PackView lang="fr" type={(await params).type} />
}

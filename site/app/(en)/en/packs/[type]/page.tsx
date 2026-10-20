import { PackView, packMetadata, packParams } from '@/views/PackView'

export const dynamicParams = false
export const generateStaticParams = packParams

export async function generateMetadata({ params }: { params: Promise<{ type: string }> }) {
  return packMetadata('en', (await params).type)
}

export default async function Page({ params }: { params: Promise<{ type: string }> }) {
  return <PackView lang="en" type={(await params).type} />
}

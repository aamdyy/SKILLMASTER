import { SkillView, skillFromParams, skillMetadata, skillParams } from '@/views/SkillView'

export const dynamicParams = false
export const generateStaticParams = skillParams

export async function generateMetadata({ params }: { params: Promise<{ id: string[] }> }) {
  return skillMetadata('en', await skillFromParams(params))
}

export default async function Page({ params }: { params: Promise<{ id: string[] }> }) {
  return <SkillView lang="en" skill={await skillFromParams(params)} />
}

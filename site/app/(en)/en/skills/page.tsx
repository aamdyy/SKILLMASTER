import { SkillsView, skillsMetadata } from '@/views/SkillsView'

export const metadata = skillsMetadata('en')

export default function Page() {
  return <SkillsView lang="en" />
}

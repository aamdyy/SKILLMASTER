import { SkillsView, skillsMetadata } from '@/views/SkillsView'

export const metadata = skillsMetadata('fr')

export default function Page() {
  return <SkillsView lang="fr" />
}

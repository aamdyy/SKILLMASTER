import Link from 'next/link'
import { href, type Lang } from '@/lib/lang'

// Logo typographique : un carré plein vert, puis « skillmaster » en Geist Mono minuscule.
export function Logo({ lang }: { lang: Lang }) {
  return (
    <Link href={href.home(lang)} className="group inline-flex h-11 items-center gap-2.5 font-mono text-[15px] tracking-tight text-fg" aria-label={lang === 'en' ? 'skillmaster, home' : 'skillmaster, accueil'}>
      <span aria-hidden className="size-2.5 bg-accent transition-transform duration-150 ease-out motion-safe:group-hover:rotate-45" />
      skillmaster
    </Link>
  )
}

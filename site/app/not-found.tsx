import { Button } from '@/components/Button'
import { Container } from '@/components/Container'
import { Frame } from '@/components/Frame'
import { Label } from '@/components/Label'

export const metadata = { title: 'Page introuvable' }

export default function NotFound() {
  return (
    <section className="relative">
      <Container className="flex justify-center py-24 md:py-36">
        <Frame legend="erreur 404" className="w-full max-w-xl bg-panel/50 p-8 pt-9 text-center md:p-12">
          <div className="flex flex-col items-center gap-6">
            <Label as="span">Introuvable</Label>
            <h1 className="text-balance text-[2.25rem] leading-[1.05] tracking-[-0.03em] md:text-[3rem]">Cette page n’existe pas.</h1>
            <p className="max-w-sm text-[15px] leading-relaxed text-muted">Le skill a peut-être changé d’adresse, ou il a quitté la bibliothèque. Cherche-le par son nom.</p>
            <div className="flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
              <Button href="/skills/">Chercher un skill</Button>
              <Button href="/" variant="secondary" icon="←">
                Accueil
              </Button>
            </div>
          </div>
        </Frame>
      </Container>
    </section>
  )
}

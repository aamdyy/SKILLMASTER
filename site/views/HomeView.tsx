import { Button } from '@/components/Button'
import { CodeBlock } from '@/components/CodeBlock'
import { Construction } from '@/components/Construction'
import { Container } from '@/components/Container'
import { Funnel } from '@/components/diagrams/Funnel'
import { Frame } from '@/components/Frame'
import { Hands } from '@/components/Hands'
import { InfoPill } from '@/components/InfoPill'
import { Label } from '@/components/Label'
import { CountUp } from '@/components/motion/CountUp'
import { PackGrid } from '@/components/PackGrid'
import { Pipeline } from '@/components/Pipeline'
import { SearchField } from '@/components/SearchField'
import { Section } from '@/components/Section'
import { Teaser } from '@/components/Teaser'
import { TeaserPopup } from '@/components/TeaserPopup'
import { ThisWeek } from '@/components/ThisWeek'
import { formatDate, formatDay, formatInt, formatUsd } from '@/lib/format'
import { href, LOCALE, type Lang } from '@/lib/lang'
import { chiffresDuTour, getDernierTour, getDetection, getFunnel, getPack, getPacks, getSkill, getStats, getTours } from '@/lib/library'

const TEASER = { src: '/video/skillmaster-teaser.mp4', poster: '/video/skillmaster-teaser.jpg' }

// Nouveautés du site lui-même, annoncées dans la pastille du héros le temps du tour qu'elles reprennent
// (le détail est dans l'onglet Changements, cadre « Site »).
const SITE_UPDATE = { date: '2026-11-09', fr: 'nouveau teaser et schémas', en: 'new teaser and diagrams' }

type Stats = ReturnType<typeof getStats>
type DernierTour = ReturnType<typeof getDernierTour>
type Entonnoir = ReturnType<typeof getFunnel>

const T = {
  fr: {
    update: 'Mise à jour du',
    tetes: (n: number) => (n > 1 ? `${n} têtes changent` : `${n} tête change`),
    h1: 'Les bons skills Claude Code, pour chaque projet.',
    intro: 'Une bibliothèque triée par type de projet, notée par un juge et mise à jour toute seule chaque lundi.',
    install: 'Installer SKILLMASTER',
    explore: 'Explorer les packs',
    lastRun: 'dernier tour',
    figures: { analyses: 'skills analysés', retenus: 'retenus dans les packs', packs: 'packs par type de projet' },
    teaser: { label: 'Teaser', title: 'SKILLMASTER en 27 secondes.', video: 'Teaser SKILLMASTER, 27 secondes, son coupé au départ', pause: 'Pause', play: 'Lecture', sound: 'Son', close: 'Fermer', dialog: 'Teaser SKILLMASTER',
      caption: 'Le tour du 9 novembre en images : les skills analysés, ceux retenus dans les packs, puis le panneau du mod qui propose le pack dans Claude Code. Le son est coupé au départ : bouton « Son ».' },
    construction: { label: 'Construction', title: 'Un pack, c’est des skills et un type de projet.', text: 'skill-master reconnaît le type de ton projet à ses fichiers, puis te propose la tête du pack qui lui correspond.' },
    packs: { title: 'Un pack par type de projet.', note: '8 skills en tête au plus, puis les ajouts' },
    pipelineIntro: 'Une GitHub Action fait tout le travail : elle collecte, juge, classe et publie. Rien ne s’installe sans ton accord.',
    cta: { label: 'Installation', title: 'Deux commandes, et c’est prêt.', text: 'Le plugin te propose le bon pack à chaque nouveau projet ou prompt long, dans le terminal comme dans le panneau VS Code. Rien ne se charge sans ton accord.', guide: 'Le tuto complet' },
    funnel: {
      legend: (date: string) => `entonnoir · tour du ${date}`,
      check: 'contrôle avant publication',
      target: 'publié sur GitHub, puis sur ce site',
      rows: (f: Entonnoir) => [
        { step: 'Collecte', value: f.collectes, detail: `skills lus dans ${formatInt(f.depots)} dépôts, au commit épinglé` },
        { step: 'Jugement', value: f.juges, detail: 'notés 6/10 ou plus par Claude Haiku, sur cinq critères' },
        { step: 'Finale', value: f.finalistes, detail: '25 au plus par pack, pertinents pour la stack' },
        { step: 'Retenus', value: f.retenus, detail: `têtes et ajouts des ${f.packs} packs` },
        { step: 'En tête', value: f.tete, detail: '8 au plus par pack, rangés par Claude Sonnet en trois tirages' },
      ],
    },
    steps: (stats: Stats, tour: DernierTour) => [
      { title: 'Collecte', text: `Le collecteur parcourt GitHub et retient ${formatInt(stats.analyses)} skills venus de ${formatInt(stats.depots)} dépôts actifs. Chacun est lu au commit épinglé, sans jamais être exécuté.` },
      { title: 'Jugement', text: `Claude Haiku note chaque skill nouveau ou modifié sur cinq critères. Un scan statique, qui lit aussi les annexes et les scripts, et le juge signalent les risques : ${formatInt(stats.alertes)} alertes, rangées par catégorie.` },
      { title: 'Classement', text: 'Claude Sonnet range les finalistes de chaque pack en trois tirages, selon une stack de référence. Le juge remplace deux skills au plus par pack et par tour, chaque fois avec une raison. Un skill disparu est remplacé en plus.' },
      { title: 'Publication', text: `La bibliothèque est publiée sur GitHub et ce site se reconstruit. Un tour abîmé est refusé avant la publication. Dernier tour le ${formatDate(tour.le)}${tour.coutUsd !== null ? `, pour ${formatUsd(tour.coutUsd)}` : ''}.` },
    ],
  },
  en: {
    update: 'Updated',
    tetes: (n: number) => (n > 1 ? `${n} heads change` : `${n} head changes`),
    h1: 'The right Claude Code skills, for every project.',
    intro: 'A library sorted by project type, rated by a judge and updated on its own every Monday.',
    install: 'Install SKILLMASTER',
    explore: 'Explore the packs',
    lastRun: 'last run',
    figures: { analyses: 'skills analyzed', retenus: 'kept in the packs', packs: 'packs by project type' },
    teaser: { label: 'Teaser', title: 'SKILLMASTER in 27 seconds.', video: 'SKILLMASTER teaser, 27 seconds, muted at first', pause: 'Pause', play: 'Play', sound: 'Sound', close: 'Close', dialog: 'SKILLMASTER teaser',
      caption: 'The November 9 run in pictures: the skills analyzed, those kept in the packs, then the mod’s panel suggesting the pack inside Claude Code. Sound is off at first: “Sound” button.' },
    construction: { label: 'Construction', title: 'A pack is skills plus a project type.', text: 'skill-master recognizes your project type from its files, then suggests the head of the matching pack.' },
    packs: { title: 'One pack per project type.', note: 'up to 8 skills in the head, then the extras' },
    pipelineIntro: 'A GitHub Action does all the work: it collects, judges, ranks and publishes. Nothing gets installed without your approval.',
    cta: { label: 'Install', title: 'Two commands, and you’re set.', text: 'The plugin suggests the right pack for every new project or long prompt, in the terminal as well as in the VS Code panel. Nothing gets loaded without your approval.', guide: 'The full guide' },
    funnel: {
      legend: (date: string) => `funnel · run of ${date}`,
      check: 'check before publishing',
      target: 'published on GitHub, then on this site',
      rows: (f: Entonnoir) => [
        { step: 'Collection', value: f.collectes, detail: `skills read from ${formatInt(f.depots, 'en')} repositories, at their pinned commit` },
        { step: 'Judging', value: f.juges, detail: 'rated 6/10 or more by Claude Haiku, on five criteria' },
        { step: 'Final', value: f.finalistes, detail: 'up to 25 per pack, relevant to the stack' },
        { step: 'Kept', value: f.retenus, detail: `heads and extras of the ${f.packs} packs` },
        { step: 'In the head', value: f.tete, detail: 'up to 8 per pack, ranked by Claude Sonnet in three draws' },
      ],
    },
    steps: (stats: Stats, tour: DernierTour) => [
      { title: 'Collection', text: `The collector crawls GitHub and keeps ${formatInt(stats.analyses, 'en')} skills from ${formatInt(stats.depots, 'en')} active repositories. Each one is read at its pinned commit and never executed.` },
      { title: 'Judging', text: `Claude Haiku rates every new or changed skill on five criteria. A static scan, which also reads annexes and scripts, and the judge flag the risks: ${formatInt(stats.alertes, 'en')} alerts, sorted by category.` },
      { title: 'Ranking', text: 'Claude Sonnet ranks the finalists of each pack in three draws, against a reference stack. The judge replaces two skills at most per pack and per run, each time with a reason. A skill that disappears is replaced on top of that.' },
      { title: 'Publishing', text: `The library is published on GitHub and this site rebuilds. A damaged run is refused before publishing. Last run on ${formatDate(tour.le, 'en')}${tour.coutUsd !== null ? `, for ${formatUsd(tour.coutUsd, 'en')}` : ''}.` },
    ],
  },
}

export function HomeView({ lang }: { lang: Lang }) {
  const t = T[lang]
  const stats = getStats()
  const tour = getDernierTour()
  const packs = getPacks()
  const [latest] = getTours()
  const chiffres = latest ? chiffresDuTour(latest) : null

  // Construction : le premier skill de la tête du pack Site web qui a un résumé, de préférence
  // d'un éditeur de confiance.
  const pack = getPack('site-web') ?? packs[0]!
  const candidates = pack.recommandes.filter(item => !item.epingle && getSkill(item.id)?.resume)
  const place = candidates.find(item => item.confiance) ?? candidates[0] ?? pack.recommandes[0]!
  const skill = getSkill(place.id)!
  const teaserText = { label: t.teaser.video, pause: t.teaser.pause, play: t.teaser.play, sound: t.teaser.sound }

  return (
    <>
      <section className="relative">
        <Container className="flex flex-col items-center pb-0 pt-14 text-center md:pt-24">
          <InfoPill href={href.changes(lang)}>
            <span>
              {t.update} {formatDate(tour.le, lang)}
              {chiffres?.tetes ? <span className="hidden sm:inline">{` · ${t.tetes(chiffres.tetes)}`}</span> : null}
              {latest?.date === SITE_UPDATE.date && <span className="hidden md:inline">{` · ${SITE_UPDATE[lang]}`}</span>}
            </span>
            <span aria-hidden className="text-muted">→</span>
          </InfoPill>
          <h1 className="mt-8 max-w-3xl text-balance text-[2.5rem] leading-[1.05] tracking-[-0.03em] md:text-[4rem]">{t.h1}</h1>
          <p className="mt-6 max-w-xl text-pretty text-base leading-relaxed text-muted md:text-[17px]">{t.intro}</p>
          <div className="mt-9 flex w-full flex-col justify-center gap-3 sm:w-auto sm:flex-row">
            <Button href={href.install(lang)} icon="→">
              {t.install}
            </Button>
            <Button href="#packs" variant="secondary" icon="↓">
              {t.explore}
            </Button>
          </div>
        </Container>
        {/* Les deux mains, juste sous les boutons, d'un bord à l'autre. */}
        <div className="-mt-6 md:-mt-10">
          <Hands />
        </div>
        <Container className="flex justify-center pb-14 pt-4 md:pb-20">
          <SearchField className="max-w-xl" lang={lang} />
        </Container>
        <Container className="pb-20 md:pb-28">
          <Frame legend={t.lastRun} className="bg-panel/60">
            <dl className="grid grid-cols-2 md:grid-cols-4">
              {[
                { label: t.figures.analyses, value: <CountUp value={stats.analyses} locale={LOCALE[lang]} /> },
                { label: t.figures.retenus, value: <CountUp value={stats.retenus} locale={LOCALE[lang]} /> },
                { label: t.figures.packs, value: <CountUp value={stats.packs} locale={LOCALE[lang]} /> },
                { label: tour.coutUsd !== null ? `${t.lastRun} · ${formatUsd(tour.coutUsd, lang)}` : t.lastRun, value: formatDay(tour.le, lang) },
              ].map((figure, i) => (
                <div key={figure.label} className={`flex flex-col-reverse gap-2 p-5 md:p-7 ${i % 2 ? 'border-l border-line' : ''} ${i > 1 ? 'border-t border-line md:border-t-0' : ''} ${i === 2 ? 'md:border-l' : ''}`}>
                  <dt className="caps text-[11px] text-muted">{figure.label}</dt>
                  <dd className="font-mono text-[1.55rem] tracking-[-0.02em] tabular sm:text-[1.9rem] md:text-[2.4rem]">{figure.value}</dd>
                </div>
              ))}
            </dl>
          </Frame>
        </Container>
      </section>

      {/* À la première visite, le teaser s'ouvre aussi une fois en fenêtre. */}
      <TeaserPopup src={TEASER.src} poster={TEASER.poster} install={{ href: href.install(lang), label: lang === 'en' ? 'Install' : 'Installer' }} text={{ ...teaserText, close: t.teaser.close, dialog: t.teaser.dialog, caption: t.teaser.caption }} />
      <Section labelledBy="titre-teaser">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-5">
            <Label as="h2" id="titre-teaser">{t.teaser.label}</Label>
            <p className="max-w-2xl text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">{t.teaser.title}</p>
          </div>
          <Frame as="figure" legend="teaser · 27 s" className="bg-bg p-2 md:p-3">
            <Teaser src={TEASER.src} poster={TEASER.poster} text={teaserText} />
            <figcaption className="px-1 pb-1 pt-3 text-[13px] leading-relaxed text-muted md:px-0">{t.teaser.caption}</figcaption>
          </Frame>
        </div>
      </Section>

      <Section labelledBy="titre-construction">
        <div className="flex flex-col gap-10">
          <div className="flex flex-col gap-5">
            <Label as="h2" id="titre-construction">{t.construction.label}</Label>
            <p className="max-w-2xl text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">{t.construction.title}</p>
            <p className="max-w-xl text-[15px] leading-relaxed text-muted">{t.construction.text}</p>
          </div>
          <Construction skill={skill} pack={pack} detection={getDetection()[pack.type] ?? pack.type} lang={lang} />
        </div>
      </Section>

      <Section id="packs" labelledBy="titre-packs">
        <div className="flex flex-col gap-10">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div className="flex flex-col gap-5">
              <Label as="h2" id="titre-packs">Packs</Label>
              <p className="text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">{t.packs.title}</p>
            </div>
            <p className="caps text-[11.5px] text-muted">{t.packs.note}</p>
          </div>
          <PackGrid packs={packs} total={formatInt(stats.analyses, lang)} lang={lang} />
        </div>
      </Section>

      <Section labelledBy="titre-pipeline">
        <div className="flex flex-col gap-16 md:gap-20">
          <Pipeline steps={t.steps(stats, tour)} intro={t.pipelineIntro} lang={lang} />
          <Funnel rows={t.funnel.rows(getFunnel())} legend={t.funnel.legend(formatDate(tour.le, lang))} footer={{ check: t.funnel.check, target: t.funnel.target }} locale={LOCALE[lang]} />
        </div>
      </Section>

      {latest && (
        <Section labelledBy="titre-semaine">
          <ThisWeek tour={latest} lang={lang} />
        </Section>
      )}

      <Section labelledBy="titre-installer">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <Label as="h2" id="titre-installer">{t.cta.label}</Label>
            <p className="text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">{t.cta.title}</p>
            <p className="max-w-md text-[15px] leading-relaxed text-muted">{t.cta.text}</p>
          </div>
          <div className="flex min-w-0 flex-col gap-5 lg:pt-14">
            <CodeBlock lang={lang} lines={['claude plugin marketplace add aamdyy/SKILLMASTER', 'claude plugin install skillmaster@skillmaster']} />
            <Button href={href.install(lang)} icon="→" className="w-fit">
              {t.cta.guide}
            </Button>
          </div>
        </div>
      </Section>
    </>
  )
}

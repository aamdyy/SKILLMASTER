import type { ReactNode } from 'react'
import { CodeBlock } from '@/components/CodeBlock'
import { Container } from '@/components/Container'
import { Frame } from '@/components/Frame'
import { InlineCode } from '@/components/InlineCode'
import { Label } from '@/components/Label'
import { Section } from '@/components/Section'
import { alternatesFor, type Lang } from '@/lib/lang'

// Le tuto d'installation du plugin SKILLMASTER (marketplace aamdyy/SKILLMASTER). Les faits viennent
// du plugin : plugins/skillmaster (plugin.json, hooks/register.tsx, skill-master/scripts/sm.ts).
type Step = { title: string; text: ReactNode; code?: { lines: string[]; where?: 'terminal' | 'session' }; after?: ReactNode }

const T: Record<Lang, {
  title: string; description: string; h1: string; intro: string
  before: { label: string; title: string; items: string[] }
  steps: { label: string; title: string; list: Step[] }
  choices: { legend: string; items: [string, string][]; escape: string }
  triggers: { label: string; title: string; text: string; items: string[]; note: string }
  commands: { label: string; title: string; rows: [string, string][] }
  settings: { label: string; title: string; text: string; rows: [string, string][]; example: string }
  without: { label: string; title: string; text: string }
  safety: { label: string; title: string; items: string[] }
  maintain: { label: string; title: string; update: string; updateNote: string; remove: string }
}> = {
  fr: {
    title: 'Installation',
    description: 'Installer le plugin SKILLMASTER dans Claude Code : prérequis, deux commandes, premier essai, commandes /sm et réglages.',
    h1: 'Installer SKILLMASTER dans Claude Code.',
    intro: 'Un plugin, deux commandes. Ensuite, quand tu démarres un projet ou envoies un prompt long, SKILLMASTER te propose le pack qui lui correspond. Rien ne se charge sans ton accord.',
    before: {
      label: 'Avant de commencer',
      title: 'Trois prérequis.',
      items: [
        'Claude Code 2.1.287 ou plus récent, la version qui a apporté les mods (en accès anticipé). Le plugin est testé avec la 2.1.304. Vérifie avec `claude --version`, mets à jour avec `claude update`.',
        'Node 24 ou plus récent : le plugin s’en sert pour télécharger et vérifier les skills. Vérifie avec `node --version`.',
        'Conseillé : une session GitHub, avec `gh auth login` ou une variable `GITHUB_TOKEN`. Sans jeton, l’API GitHub s’arrête à 60 requêtes par heure.',
      ],
    },
    steps: {
      label: 'Installation',
      title: 'Quatre étapes.',
      list: [
        { title: 'Ajouter la marketplace', text: 'Le dépôt SKILLMASTER est aussi une marketplace de plugins.', code: { lines: ['claude plugin marketplace add aamdyy/SKILLMASTER'] }, after: <>Ou, dans une session : <InlineCode text="`/plugin marketplace add aamdyy/SKILLMASTER`" /></> },
        { title: 'Installer le plugin', text: 'Il s’installe pour ton compte, donc pour tous tes projets.', code: { lines: ['claude plugin install skillmaster@skillmaster'] } },
        { title: 'Relancer Claude Code', text: <>Ferme et rouvre Claude Code, dans le terminal comme dans le panneau VS Code. Dans une session déjà ouverte, <InlineCode text="`/reload-plugins`" /> suffit.</> },
        { title: 'Premier essai', text: 'Ouvre un projet et lance la détection. Le panneau montre le type de projet et ce qui l’a révélé, la tête du pack (8 skills au plus, avec ce que chacun améliore), puis un conseil de modèle et d’effort.', code: { lines: ['/sm check'], where: 'session' } },
      ],
    },
    choices: {
      legend: 'le dialogue',
      items: [
        ['Charger pour la session', 'recommandé : rien n’est écrit dans le projet. Les skills sont téléchargés à leur version épinglée dans `~/.cache/skillmaster/`.'],
        ['Garder pour ce projet', 'copie les skills dans `.claude/skills/` du projet.'],
        ['Choisir moi-même', 'le panneau montre chaque résumé en entier ; tape les numéros (`1 3 12`, `2-5`).'],
        ['Ne plus proposer dans ce projet', '`/sm check` reste disponible.'],
      ],
      escape: 'Échap : rien n’est chargé.',
    },
    triggers: {
      label: 'Au quotidien',
      title: 'Il se propose tout seul.',
      text: 'Une fois par conversation (et de nouveau après `/clear`), dès qu’une de ces conditions est vraie :',
      items: [
        'un nouveau projet : pas de `CLAUDE.md`, un dossier presque vide ;',
        'un prompt de 400 caractères ou plus ;',
        'un prompt qui contient un mot de projet : site, landing, app, refonte, montage, vidéo, dashboard, data, notebook, plugin, mod ;',
        'ou quand tu tapes `/sm check`.',
      ],
      note: 'Ton prompt est retenu le temps du choix, puis il revient dans ta saisie. Le conseil de modèle et d’effort est seulement affiché : tu tapes toi-même `/model` ou `/effort` si tu le suis.',
    },
    commands: {
      label: 'Commandes',
      title: 'Tout passe par /sm.',
      rows: [
        ['/sm check', 'relance la détection et rouvre le panneau.'],
        ['/sm install <nom>…', 'garde des skills dans le projet (`.claude/skills/`), après le scan et ton accord.'],
        ['/sm clean', 'retire ce que SKILLMASTER a chargé ou copié. Rien n’est supprimé : tout part dans `~/.cache/skillmaster/corbeille/`.'],
        ['/sm status', 'bibliothèque, type détecté, skills chargés et prompt retenu.'],
        ['/sm prompt', 'remet le prompt retenu dans ta saisie, même après `/clear`.'],
      ],
    },
    settings: {
      label: 'Réglages',
      title: 'Trois options.',
      text: '`claude plugin configure skillmaster@skillmaster` affiche les réglages et leurs valeurs.',
      rows: [
        ['auto', 'proposition automatique, activée par défaut.'],
        ['seuil', 'longueur d’un prompt long, 400 caractères par défaut.'],
        ['mots', 'mots de projet qui déclenchent la proposition, comptés en mots entiers.'],
      ],
      example: 'echo \'{"seuil": "600"}\' | claude plugin configure skillmaster@skillmaster --values-stdin',
    },
    without: {
      label: 'Sans le panneau',
      title: 'Le skill skill-master.',
      text: 'Le plugin installe aussi le skill skill-master. Dans n’importe quelle session, dis « va voir SKILLMASTER et prends les skills dont tu as besoin » : il détecte le type du projet et fait la même proposition, sous forme de question.',
    },
    safety: {
      label: 'Sécurité',
      title: 'Rien ne s’installe sans toi.',
      items: [
        'Chaque skill est téléchargé à son commit épinglé, puis relu par le scan de sécurité avant d’être chargé.',
        'Un risque critique n’est jamais chargé. Un risque élevé attend ta réponse, en une seule question pour toute la sélection ; chez un éditeur de confiance, il s’affiche en une ligne.',
        'Le plugin n’exécute rien de ce qu’il télécharge et n’installe jamais de mod tiers.',
      ],
    },
    maintain: {
      label: 'Entretien',
      title: 'Mettre à jour, désinstaller.',
      update: 'Mettre à jour le plugin :',
      updateNote: 'La bibliothèque, elle, se met à jour seule : le plugin en garde une copie, rafraîchie dès qu’elle change sur GitHub (chaque lundi).',
      remove: 'Désinstaller, puis effacer le cache si tu veux :',
    },
  },
  en: {
    title: 'Install',
    description: 'Install the SKILLMASTER plugin in Claude Code: requirements, two commands, first run, /sm commands and settings.',
    h1: 'Install SKILLMASTER in Claude Code.',
    intro: 'One plugin, two commands. Then, whenever you start a project or send a long prompt, SKILLMASTER suggests the matching pack. Nothing gets loaded without your approval.',
    before: {
      label: 'Before you start',
      title: 'Three requirements.',
      items: [
        'Claude Code 2.1.287 or later, the version that brought mods (in early access). The plugin is tested with 2.1.304. Check with `claude --version`, update with `claude update`.',
        'Node 24 or later: the plugin uses it to download and check skills. Check with `node --version`.',
        'Recommended: a GitHub session, with `gh auth login` or a `GITHUB_TOKEN` variable. Without a token, the GitHub API stops at 60 requests per hour.',
      ],
    },
    steps: {
      label: 'Install',
      title: 'Four steps.',
      list: [
        { title: 'Add the marketplace', text: 'The SKILLMASTER repository is also a plugin marketplace.', code: { lines: ['claude plugin marketplace add aamdyy/SKILLMASTER'] }, after: <>Or, inside a session: <InlineCode text="`/plugin marketplace add aamdyy/SKILLMASTER`" /></> },
        { title: 'Install the plugin', text: 'It installs for your account, so for all your projects.', code: { lines: ['claude plugin install skillmaster@skillmaster'] } },
        { title: 'Restart Claude Code', text: <>Close and reopen Claude Code, in the terminal as well as in the VS Code panel. In a session that is already open, <InlineCode text="`/reload-plugins`" /> is enough.</> },
        { title: 'First run', text: 'Open a project and run the detection. The panel shows the project type and what revealed it, the pack head (up to 8 skills, with what each one improves), then a model and effort suggestion.', code: { lines: ['/sm check'], where: 'session' } },
      ],
    },
    choices: {
      legend: 'the dialog',
      items: [
        ['Load for the session', 'recommended: nothing is written to the project. Skills are downloaded at their pinned version into `~/.cache/skillmaster/`.'],
        ['Keep for this project', 'copies the skills into the project’s `.claude/skills/`.'],
        ['Choose myself', 'the panel shows each full summary; type the numbers (`1 3 12`, `2-5`).'],
        ['Stop suggesting in this project', '`/sm check` stays available.'],
      ],
      escape: 'Esc: nothing is loaded.',
    },
    triggers: {
      label: 'Day to day',
      title: 'It suggests on its own.',
      text: 'Once per conversation (and again after `/clear`), as soon as one of these is true:',
      items: [
        'a new project: no `CLAUDE.md`, an almost empty folder;',
        'a prompt of 400 characters or more;',
        'a prompt with a project word. The default list is French (site, landing, app, refonte, montage, vidéo, dashboard, data, notebook, plugin, mod): change it in the settings;',
        'or when you type `/sm check`.',
      ],
      note: 'Your prompt is held while you choose, then it comes back to your input. The model and effort suggestion is only displayed: you type `/model` or `/effort` yourself if you follow it.',
    },
    commands: {
      label: 'Commands',
      title: 'Everything goes through /sm.',
      rows: [
        ['/sm check', 'runs the detection again and reopens the panel.'],
        ['/sm install <name>…', 'keeps skills in the project (`.claude/skills/`), after the scan and your approval.'],
        ['/sm clean', 'removes what SKILLMASTER loaded or copied. Nothing is deleted: it all goes to `~/.cache/skillmaster/corbeille/`.'],
        ['/sm status', 'library, detected type, loaded skills and held prompt.'],
        ['/sm prompt', 'puts the held prompt back into your input, even after `/clear`.'],
      ],
    },
    settings: {
      label: 'Settings',
      title: 'Three options.',
      text: '`claude plugin configure skillmaster@skillmaster` shows the settings and their values.',
      rows: [
        ['auto', 'automatic suggestion, on by default.'],
        ['seuil', 'length of a long prompt (threshold), 400 characters by default.'],
        ['mots', 'project words that trigger the suggestion, counted as whole words.'],
      ],
      example: 'echo \'{"seuil": "600"}\' | claude plugin configure skillmaster@skillmaster --values-stdin',
    },
    without: {
      label: 'Without the panel',
      title: 'The skill-master skill.',
      text: 'The plugin also installs the skill-master skill. In any session, say “go check SKILLMASTER and take the skills you need”: it detects the project type and makes the same suggestion, as a question.',
    },
    safety: {
      label: 'Security',
      title: 'Nothing installs without you.',
      items: [
        'Each skill is downloaded at its pinned commit, then checked again by the security scan before it loads.',
        'A critical risk never loads. A high risk waits for your answer, in a single question for the whole selection; for a trusted publisher, it shows as a single line.',
        'The plugin runs nothing it downloads and never installs a third-party mod.',
      ],
    },
    maintain: {
      label: 'Maintenance',
      title: 'Update, uninstall.',
      update: 'Update the plugin:',
      updateNote: 'The library updates on its own: the plugin keeps a copy, refreshed as soon as it changes on GitHub (every Monday).',
      remove: 'Uninstall, then clear the cache if you want:',
    },
  },
}

export const installMetadata = (lang: Lang) => ({ title: T[lang].title, description: T[lang].description, alternates: alternatesFor(lang, '/installation/') })

function Heading({ id, label, title }: { id: string; label: string; title: string }) {
  return (
    <div className="flex flex-col gap-5">
      <Label as="h2" id={id}>{label}</Label>
      <p className="max-w-2xl text-[2rem] leading-[1.1] tracking-[-0.025em] md:text-[2.75rem]">{title}</p>
    </div>
  )
}

const Text = ({ children }: { children: string }) => <InlineCode text={children} />

export function InstallView({ lang }: { lang: Lang }) {
  const t = T[lang]
  return (
    <>
      <section className="relative">
        <Container className="flex flex-col gap-6 pb-14 pt-12 md:pt-16">
          <Label as="span">{t.title}</Label>
          <h1 className="max-w-3xl text-[2.75rem] leading-[1.02] tracking-[-0.03em] md:text-[4.5rem]">{t.h1}</h1>
          <p className="max-w-2xl text-[15px] leading-relaxed text-muted md:text-[17px]">{t.intro}</p>
          <div className="mt-2 flex max-w-2xl flex-col gap-3">
            <CodeBlock lang={lang} lines={['claude plugin marketplace add aamdyy/SKILLMASTER', 'claude plugin install skillmaster@skillmaster']} />
          </div>
        </Container>
      </section>

      <Section labelledBy="titre-avant">
        <div className="flex flex-col gap-10">
          <Heading id="titre-avant" label={t.before.label} title={t.before.title} />
          <ul className="grid gap-px border border-line bg-line md:grid-cols-3">
            {t.before.items.map((item, i) => (
              <li key={i} className="flex flex-col gap-3 bg-bg p-6">
                <span className="font-mono text-[11px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
                <p className="text-[15px] leading-relaxed text-fg/85">
                  <Text>{item}</Text>
                </p>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="titre-etapes">
        <div className="flex flex-col gap-12">
          <Heading id="titre-etapes" label={t.steps.label} title={t.steps.title} />
          <ol className="flex flex-col">
            {t.steps.list.map((step, i) => (
              <li key={step.title} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
                <span className="pt-0.5 font-mono text-[12px] text-muted tabular">{String(i + 1).padStart(2, '0')}</span>
                <div className={`flex min-w-0 flex-col gap-4 border-l border-line-strong pl-6 ${i === t.steps.list.length - 1 ? '' : 'pb-12'}`}>
                  <h3 className="font-mono text-[14px] uppercase tracking-[0.08em] text-fg">{step.title}</h3>
                  <p className="max-w-2xl text-[15px] leading-relaxed text-muted">{step.text}</p>
                  {step.code && <CodeBlock lang={lang} lines={step.code.lines} where={step.code.where} />}
                  {step.after && <p className="text-[14px] leading-relaxed text-muted">{step.after}</p>}
                  {i === t.steps.list.length - 1 && (
                    <Frame legend={t.choices.legend} className="bg-panel/40 p-5 pt-6">
                      <dl className="flex flex-col gap-3">
                        {t.choices.items.map(([choice, what]) => (
                          <div key={choice} className="grid gap-1 sm:grid-cols-[15rem_1fr] sm:gap-4">
                            <dt className="font-mono text-[13px] text-fg">{choice}</dt>
                            <dd className="text-[14px] leading-relaxed text-muted">
                              <Text>{what}</Text>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-4 border-t border-line pt-3 font-mono text-[12px] text-muted">{t.choices.escape}</p>
                    </Frame>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section labelledBy="titre-quotidien">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Heading id="titre-quotidien" label={t.triggers.label} title={t.triggers.title} />
          <div className="flex flex-col gap-5">
            <p className="text-[15px] leading-relaxed text-fg/85">
              <Text>{t.triggers.text}</Text>
            </p>
            <ul className="flex flex-col gap-2 text-[15px] leading-relaxed text-muted">
              {t.triggers.items.map(item => (
                <li key={item} className="border-l border-line-strong pl-4">
                  <Text>{item}</Text>
                </li>
              ))}
            </ul>
            <p className="text-[14px] leading-relaxed text-muted">
              <Text>{t.triggers.note}</Text>
            </p>
          </div>
        </div>
      </Section>

      <Section labelledBy="titre-commandes">
        <div className="flex flex-col gap-10">
          <Heading id="titre-commandes" label={t.commands.label} title={t.commands.title} />
          <Frame className="bg-panel/40">
            <dl className="divide-y divide-line">
              {t.commands.rows.map(([command, what]) => (
                <div key={command} className="grid gap-1 p-5 sm:grid-cols-[14rem_1fr] sm:gap-6">
                  <dt className="font-mono text-[13.5px] text-fg">{command}</dt>
                  <dd className="text-[15px] leading-relaxed text-muted">
                    <Text>{what}</Text>
                  </dd>
                </div>
              ))}
            </dl>
          </Frame>
        </div>
      </Section>

      <Section labelledBy="titre-reglages">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Heading id="titre-reglages" label={t.settings.label} title={t.settings.title} />
          <div className="flex min-w-0 flex-col gap-5">
            <p className="text-[15px] leading-relaxed text-fg/85">
              <Text>{t.settings.text}</Text>
            </p>
            <dl className="flex flex-col gap-2">
              {t.settings.rows.map(([option, what]) => (
                <div key={option} className="grid grid-cols-[5rem_1fr] gap-4 text-[15px] leading-relaxed">
                  <dt className="font-mono text-[13px] text-fg">{option}</dt>
                  <dd className="text-muted">{what}</dd>
                </div>
              ))}
            </dl>
            <CodeBlock lang={lang} lines={[t.settings.example]} />
          </div>
        </div>
      </Section>

      <Section labelledBy="titre-sans">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Heading id="titre-sans" label={t.without.label} title={t.without.title} />
          <p className="text-[15px] leading-relaxed text-fg/85 lg:pt-14">{t.without.text}</p>
        </div>
      </Section>

      <Section labelledBy="titre-securite">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Heading id="titre-securite" label={t.safety.label} title={t.safety.title} />
          <ul className="flex flex-col gap-3 text-[15px] leading-relaxed text-fg/85 lg:pt-14">
            {t.safety.items.map(item => (
              <li key={item} className="border-l border-line-strong pl-4">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section labelledBy="titre-entretien">
        <div className="flex flex-col gap-10">
          <Heading id="titre-entretien" label={t.maintain.label} title={t.maintain.title} />
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[15px] text-fg/85">{t.maintain.update}</p>
              <CodeBlock lang={lang} lines={['claude plugin marketplace update skillmaster', 'claude plugin update skillmaster@skillmaster']} />
              <p className="text-[14px] leading-relaxed text-muted">{t.maintain.updateNote}</p>
            </div>
            <div className="flex min-w-0 flex-col gap-3">
              <p className="text-[15px] text-fg/85">{t.maintain.remove}</p>
              <CodeBlock lang={lang} lines={['claude plugin uninstall skillmaster@skillmaster', 'claude plugin marketplace remove skillmaster', 'rm -rf ~/.cache/skillmaster']} />
            </div>
          </div>
        </div>
      </Section>
    </>
  )
}

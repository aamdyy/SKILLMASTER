import { expect, mock, test, type Engine } from 'claude-code/testing'
import type { On } from 'claude-code'

// Le mod entier, le monde simulé en dessous : disque, sm.ts, dialogue natif, saisie.
const HOME = '/h'
const ROOT = '/p'
const LIB = `${HOME}/.cache/skillmaster/library`
const DIR_A = `${HOME}/.cache/skillmaster/skills/o__r__a@123456789012`
const DIR_B = `${HOME}/.cache/skillmaster/skills/o__r__b@123456789012`
const SESSION = 'Charger pour la session (recommandé)'
const ESC = 'ÉCHAP'

const DETECTION = {
  sous_projets: [],
  ignorer: [],
  types: {
    'site-web': { nom: 'site web', texte: '', dependances: ['next'], mots: ['site'] },
    data: { nom: 'data', texte: '', fichiers: ['*.ipynb'], mots: ['notebook'] },
  },
}
const MODEL_RULES = {
  modeles: { opus: { nom: 'Opus 5.5', id: 'claude-opus-5-5', commande: 'opus' } },
  regles: [{ id: 'feature', situation: '', modele: 'opus', effort: 'medium', ultracode: false, raison: 'une feature standard' }],
}
const entry = (nom: string, extra = {}) => ({ id: `o/r/${nom}`, nom, repo: 'o/r', resume_fr: `fait ${nom} → améliore ${nom}`, risque_max: null, ...extra })
const INDEX = { type: 'site-web', recommandes: [entry('a'), entry('b', { risque_max: 'eleve' })], ajouts: [entry('c')] }
const INDEX_DATA = { type: 'data', recommandes: [entry('d')], ajouts: [] }
const FETCH = {
  mode: 'session',
  skills: [
    { id: 'o/r/a', nom: 'a', repo: 'o/r', source: 'bibliotheque', decision: 'une_ligne', risques: [], dossier: DIR_A, sha_epingle: '123456789012abcd' },
    { id: 'o/r/b', nom: 'b', repo: 'o/r', source: 'bibliotheque', decision: 'question', risques: [{ gravite: 'eleve', code: 'scripts lancés par le SKILL.md' }], dossier: DIR_B, sha_epingle: '123456789012abcd' },
  ],
}

function world(on: On, answers: string[], options: { fetchFails?: boolean } = {}) {
  mock.store(on)
  mock.env(on, { HOME })
  const clock = mock.clock(on)
  const seen = { fills: [] as string[], asked: [] as string[], fetches: 0, tools: [] as { description: string }[], closed: 0, submitted: [] as string[] }
  const files: Record<string, string> = {
    [`${ROOT}/package.json`]: JSON.stringify({ dependencies: { next: '15' } }),
    [`${ROOT}/CLAUDE.md`]: '# projet',
    [`${LIB}/.commit`]: 'abcdef1234567 2026-10-19T17:36:17Z\n',
    [`${LIB}/index/site-web.json`]: JSON.stringify(INDEX),
    [`${LIB}/index/data.json`]: JSON.stringify(INDEX_DATA),
    [`${LIB}/overrides.json`]: '{}',
    [`${DIR_A}/SKILL.md`]: '---\nname: a\n---\n# Skill A',
    [`${DIR_A}/references/guide.md`]: 'le guide',
    [`${DIR_A}/guides/ui-behaviors/same-document-transitions.md`]: 'transitions dans la page',
    [`${DIR_A}/guides/ui-behaviors/motion.md`]: 'le mouvement',
    [`${DIR_A}/guides/css/css.md`]: 'le css',
    [`${DIR_B}/SKILL.md`]: '# Skill B',
  }
  const children = (dir: string) => {
    const kinds = new Map<string, 'file' | 'dir'>()
    for (const path of Object.keys(files)) {
      if (!path.startsWith(`${dir}/`)) continue
      const [name, ...rest] = path.slice(dir.length + 1).split('/')
      if (name) kinds.set(name, rest.length ? 'dir' : 'file')
    }
    return [...kinds].map(([name, kind]) => ({ name, kind, size: 0, mtimeMs: 0, isLink: false }))
  }
  const read = (path: string) =>
    path.endsWith('/detection.json') ? JSON.stringify(DETECTION) : path.endsWith('/model-rules.json') ? JSON.stringify(MODEL_RULES) : files[path]

  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('session.end', (_, e) => ({ sessionId: e.sessionId }))
  on('session.root', () => ({ value: ROOT }))
  on('session.model', () => ({ value: 'claude-sonnet-5-5' }))
  on('settings.read', () => ({ value: { effortLevel: 'medium', modelSettings: { 'claude-opus-5-5': { effortLevel: 'xhigh' } } } }))
  on('fs.read', (_, e) => {
    const text = read(e.path)
    if (text === undefined) throw new Error(`ENOENT ${e.path}`)
    return { value: text }
  })
  on('fs.list', (_, e) => {
    const list = children(e.path)
    if (!list.length) throw new Error(`ENOENT ${e.path}`)
    return { value: list }
  })
  on('fs.exists', (_, e) => ({ value: read(e.path) !== undefined || children(e.path).length > 0 }))
  on('fs.stat', (_, e) => {
    const isFile = read(e.path) !== undefined
    if (!isFile && !children(e.path).length) throw new Error(`ENOENT ${e.path}`)
    return { value: { kind: isFile ? 'file' : 'dir', size: 10, mtimeMs: 0, isLink: false, realPath: e.path } }
  })
  on('process.run', (_, e) => {
    const ran = (stdout: string, exitCode = 0) => ({ value: { exitCode, stdout, stderr: '', isStdoutTruncated: false, isStderrTruncated: false } })
    const out = (value: unknown, exitCode = 0) => ran(`${JSON.stringify(value)}\n`, exitCode)
    if (e.argv[1] === '--version') return ran('v24.15.0\n')
    if (e.argv.includes('sync')) return out({ etat: 'a_jour', date: '2026-10-19' })
    if (e.argv.includes('fetch')) {
      seen.fetches++
      return options.fetchFails ? out({ erreur: 'GitHub 503' }, 1) : out(FETCH)
    }
    return ran('')
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('tool.register', (_, e) => {
    seen.tools.push({ description: e.description })
    return { value: { tool: `mcp__skillmaster__${e.name}` } }
  })
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('ui.close', () => {
    seen.closed++
    return { value: undefined }
  })
  on('ui.status', () => ({ value: undefined }))
  on('ui.log', () => ({ value: undefined }))
  on('prompt.fill', (_, e) => {
    seen.fills.push(e.text)
    return { isFilled: true }
  })
  on('prompt.submit', (_, e) => {
    seen.submitted.push(e.text)
    return { text: e.text }
  })
  on('command.run', (_, e) => ({ text: `/${e.command} lancé` }))
  on('tool.call', { tool: 'AskUserQuestion' }, (_, e) => {
    const question = e.questions[0]!.question
    seen.asked.push(question)
    const answer = answers.shift()
    if (answer === undefined || answer === ESC) return { deny: 'fermé sans réponse' }
    return { result: { questions: e.questions, answers: { [question]: answer } } }
  })
  return { clock, seen }
}

const LONG = `Ajoute une page de contact au site, avec un formulaire et la carte. ${'Détails. '.repeat(50)}`
const typed = (text: string) => ({ text, origin: { kind: 'composer' as const }, wait: false })
// Une commande tapée : /effort et /model passent par command.run, pas par prompt.submit.
const command = (name: string, args: string) => ({ command: name, args, origin: { kind: 'composer' as const }, presentation: { isFullscreen: false, columns: 120 } })

async function start($: Engine, clock: { advance: (ms: number) => Promise<void> }) {
  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  await clock.advance(1_000)
}

test('prompt long : panneau et dialogue, chargement pour la session, puis le prompt revient seul dans la saisie, le conseil reste affiché', async ($, on) => {
  const { clock, seen } = world(on, [SESSION, 'Tout charger'])
  await start($, clock)

  const held = await $.prompt.submit(typed(LONG))
  expect(held.drop).toContain('2 skills chargés pour la session')
  expect(held.drop).toContain('Conseil : /model opus puis /effort medium (voir le panneau)')
  expect(seen.asked[0]).toContain('2 skills pour ce projet (site web)')
  expect(seen.asked[1]).toContain('02 b (scripts lancés par le SKILL.md)')
  expect(seen.tools.at(-1)?.description).toContain('- a : fait a → améliore a')
  expect(seen.tools.at(-1)?.description).toContain('- b : fait b → améliore b')

  // Ni /model ni /effort dans la saisie : seulement le prompt.
  await clock.advance(300)
  expect(seen.fills).toEqual([LONG])
  expect((await $.command.run(command('sm', 'status'))).text).toContain('Prompt retenu')

  // Le prompt rendu part normalement, sans nouvelle proposition, et sa copie de secours disparaît.
  const sent = await $.prompt.submit(typed(LONG))
  expect(sent.text).toBe(LONG)
  expect(seen.asked).toHaveLength(2)
  expect((await $.command.run(command('sm', 'status'))).text).not.toContain('Prompt retenu')
})

test("l'outil rend le SKILL.md, une annexe sur demande, et rien hors du dossier du skill", async ($, on) => {
  const { clock } = world(on, [SESSION, 'Tout charger'])
  await start($, clock)
  await $.prompt.submit(typed(LONG))

  const skill = await $.tool.call({ tool: 'mcp__skillmaster__skill', nom: 'a' } as never)
  expect(JSON.stringify(skill)).toContain('# Skill A')
  expect(JSON.stringify(skill)).toContain('Annexes (4)')
  expect(JSON.stringify(skill)).toContain('guides/ui-behaviors/ : motion.md, same-document-transitions.md')
  expect(JSON.stringify(skill)).toContain('references/ : guide.md')
  const annexe = await $.tool.call({ tool: 'mcp__skillmaster__skill', nom: 'a', fichier: 'references/guide.md' } as never)
  expect(JSON.stringify(annexe)).toContain('le guide')
  const outside = await $.tool.call({ tool: 'mcp__skillmaster__skill', nom: 'a', fichier: '../o__r__b@123456789012/SKILL.md' } as never)
  expect(JSON.stringify(outside)).toContain('sans « .. »')
  const unknown = await $.tool.call({ tool: 'mcp__skillmaster__skill', nom: 'zzz' } as never)
  expect(JSON.stringify(unknown)).toContain("n'est pas chargé")
})

test("l'outil liste un dossier d'annexes, et propose les fichiers proches d'un chemin deviné", async ($, on) => {
  const { clock } = world(on, [SESSION, 'Tout charger'])
  await start($, clock)
  await $.prompt.submit(typed(LONG))

  const dir = JSON.stringify(await $.tool.call({ tool: 'mcp__skillmaster__skill', nom: 'a', fichier: 'guides/' } as never))
  expect(dir).toContain('a/guides/ : 3 fichiers.')
  expect(dir).toContain('guides/css/ : css.md')
  expect(dir).not.toContain('references')
  const all = JSON.stringify(await $.tool.call({ tool: 'mcp__skillmaster__skill', nom: 'a', fichier: '.' } as never))
  expect(all).toContain('a : 4 annexes.')
  const guess = JSON.stringify(await $.tool.call({ tool: 'mcp__skillmaster__skill', nom: 'a', fichier: 'guides/ui/view-transitions.md' } as never))
  expect(guess).toContain("guides/ui/view-transitions.md n'existe pas dans a.")
  expect(guess).toContain('Fichiers proches : guides/ui-behaviors/same-document-transitions.md')
  const motion = JSON.stringify(await $.tool.call({ tool: 'mcp__skillmaster__skill', nom: 'a', fichier: 'guides/motion/motion.md' } as never))
  expect(motion).toContain('Fichiers proches : guides/ui-behaviors/motion.md.')
})

test('Échap : rien n’est chargé, le prompt part tel quel et tout de suite, le panneau se ferme', async ($, on) => {
  const { clock, seen } = world(on, [ESC])
  await start($, clock)
  const sent = await $.prompt.submit(typed(LONG))
  expect(sent).toEqual({ text: LONG })
  expect(seen.fetches).toBe(0)
  expect(seen.closed).toBe(1)
})

test('une erreur du mod laisse partir le prompt tel quel', async ($, on) => {
  const { clock, seen } = world(on, [SESSION], { fetchFails: true })
  await start($, clock)
  const sent = await $.prompt.submit(typed(LONG))
  expect(sent).toEqual({ text: LONG })
  expect(seen.fetches).toBe(1)
})

test('seuils : prompt court sans mot de projet ignoré, mots entiers seulement, une proposition par conversation', async ($, on) => {
  const { clock, seen } = world(on, [ESC, ESC])
  await start($, clock)
  expect(await $.prompt.submit(typed('Modifie le bouton et appelle la fonction'))).toEqual({ text: 'Modifie le bouton et appelle la fonction' })
  expect(seen.asked).toHaveLength(0)
  await $.prompt.submit(typed('Corrige le site'))
  expect(seen.asked).toHaveLength(1)
  await $.prompt.submit(typed(LONG))
  expect(seen.asked).toHaveLength(1)
})

test('/clear vide l’outil, et /sm prompt rend le prompt retenu, même après /clear', async ($, on) => {
  const { clock, seen } = world(on, [SESSION, 'Charger seulement les skills sans question'])
  await start($, clock)
  await $.prompt.submit(typed(LONG))
  expect(seen.tools.at(-1)?.description).not.toContain('- b :')
  await clock.advance(300)
  expect(seen.fills).toEqual([LONG])
  await $.command.run(command('clear', ''))
  await $.session.end({ reason: 'clear', sessionId: 's', resume: {} } as never)
  expect(seen.tools.at(-1)?.description).toBe('SKILLMASTER : aucun skill chargé pour cette session.')
  await $.command.run(command('sm', 'prompt'))
  await clock.advance(300)
  expect(seen.fills).toEqual([LONG, LONG])
})

test('prompt et dossier en désaccord : les deux packs, Amdy choisit ; Échap laisse partir le prompt', async ($, on) => {
  const { clock, seen } = world(on, ['data (ton prompt)', ESC])
  await start($, clock)
  const prompt = 'Prépare un notebook pour explorer les ventes du site'
  expect(await $.prompt.submit(typed(prompt))).toEqual({ text: prompt })
  expect(seen.asked[0]).toContain('Ton prompt parle de data, mais le dossier est un projet site web')
  expect(seen.asked[1]).toContain('1 skill pour ce projet (data)')
})

test('désaccord, puis Échap sur le choix du pack : rien de chargé, aucune autre question', async ($, on) => {
  const { clock, seen } = world(on, [ESC])
  await start($, clock)
  const prompt = 'Prépare un notebook pour explorer les ventes'
  expect(await $.prompt.submit(typed(prompt))).toEqual({ text: prompt })
  expect(seen.asked).toHaveLength(1)
  expect(seen.fetches).toBe(0)
})

test('« Ne plus proposer dans ce projet » : mémorisé, signalé par /sm status', async ($, on) => {
  const { clock, seen } = world(on, ['Ne plus proposer dans ce projet'])
  await start($, clock)
  expect(await $.prompt.submit(typed(LONG))).toEqual({ text: LONG })
  await $.session.end({ reason: 'clear', sessionId: 's', resume: {} } as never)
  await $.prompt.submit(typed(LONG))
  expect(seen.asked).toHaveLength(1)
  const status = await $.command.run({ ...command('sm', 'status') })
  expect(status.text).toContain('coupée dans ce projet')
  expect(status.text).toContain('Reprendre la proposition auto ici')
})

test('le panneau B se dessine sur le terminal et dans VS Code', async ($, on) => {
  const { clock } = world(on, [ESC])
  await start($, clock)
  await $.prompt.submit(typed(LONG))
  const mount = (surface: 'terminal' | 'vscode', bodyColumns: number) =>
    $.ui.mount({
      plugin: 'skillmaster',
      surface,
      component: 'Pane',
      requestId: 'skillmaster',
      props: { title: 'SKILLMASTER', isFocused: false, bodyColumns, placement: 'inline', scroll: { offset: 0, bodyRows: 20 }, view: {} },
    })
  for (const surface of ['terminal', 'vscode'] as const) {
    const wide = await mount(surface, 100)
    expect((await wide.find({ type: 'Text', text: /SKILLMASTER · SITE WEB/ }))?.text).toContain('next')
    expect((await wide.find({ type: 'Text', text: /^01 a / }))?.text).toContain('améliore a')
    expect((await wide.find({ type: 'Text', text: /OPUS 5\.5 · MEDIUM/ }))?.text).toBe('OPUS 5.5 · MEDIUM · ultracode off')
    await wide.unmount()

    // Le panneau VS Code fait 60 colonnes : deux lignes par skill.
    const narrow = await mount(surface, 60)
    expect((await narrow.find({ type: 'Text', text: /^01 a$/ }))?.text).toBe('01 a')
    expect((await narrow.find({ type: 'Text', text: /^améliore a$/ }))?.text).toBe('améliore a')
    await narrow.unmount()
  }
})

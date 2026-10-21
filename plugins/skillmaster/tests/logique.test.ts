import { expect, test } from 'claude-code/testing'

import type { SkillmasterProposition } from '../types'
import { advise, chooseRule, type ModelRules, type Reglage } from '../hooks/lib/advice'
import { groupAnnexes, nearest } from '../hooks/lib/annexes'
import { detect, detectFiles, detectWords, isNewProject, type DetectionRules, type Entry, type Reader } from '../hooks/lib/detect'
import { buildPack, gain, parseNumbers, type PackIndex } from '../hooks/lib/library'
import { panelLines } from '../hooks/lib/panel'
import { findWords } from '../hooks/lib/words'

// Un disque en mémoire : chemin → contenu (un dossier se déduit des chemins).
function disk(files: Record<string, string>): Reader {
  return {
    list: async dir => {
      const prefix = dir.endsWith('/') ? dir : `${dir}/`
      const names = new Map<string, Entry['kind']>()
      for (const path of Object.keys(files)) {
        if (!path.startsWith(prefix)) continue
        const [name, ...rest] = path.slice(prefix.length).split('/')
        if (name) names.set(name, rest.length ? 'dir' : 'file')
      }
      if (!names.size) throw new Error(`ENOENT ${dir}`)
      return [...names].map(([name, kind]) => ({ name, kind }))
    },
    read: async path => {
      if (files[path] === undefined) throw new Error(`ENOENT ${path}`)
      return files[path]!
    },
  }
}

// Les règles de detection.json, réduites à ce que ces tests exercent.
const RULES: DetectionRules = {
  sous_projets: ['apps', 'packages'],
  ignorer: ['node_modules', '.git'],
  types: {
    'site-web': { nom: 'site web', texte: '', dependances: ['next', 'astro', 'vite', 'react'], sauf_dependances: ['expo', 'react-native'], fichiers: ['index.html'], mots: ['site', 'landing'] },
    ios: { nom: 'iOS', texte: '', fichiers: ['*.xcodeproj', 'Package.swift'], sauf_dependances: ['expo', 'react-native'], mots: ['ios'] },
    'app-expo': { nom: 'app Expo', texte: '', dependances: ['expo', 'react-native'], fichiers: ['eas.json'], mots: ['expo'] },
    android: { nom: 'Android', texte: '', contenus: [{ fichiers: ['build.gradle.kts', 'app/build.gradle.kts'], motif: 'kotlin\\.compose|compose\\s*=\\s*true', indice: 'Compose' }] },
    video: { nom: 'vidéo', texte: '', fichiers: ['remotion.config.*'], dependances: ['@remotion/*'], mots: ['video', 'montage'] },
    'outillage-claude-code': { nom: 'outillage Claude Code', texte: '', chemins: ['.claude-plugin', 'hooks/hooks.json', 'skills/*/SKILL.md'], profondeur: 3, mots: ['mod'] },
  },
}

const pkg = (deps: Record<string, string>) => JSON.stringify({ dependencies: deps })

test('mots entiers : ni « mod » dans « modifie », ni « app » dans « appelle », accents ignorés', () => {
  expect(findWords('Modifie le bouton et appelle la fonction', ['mod', 'app'])).toEqual([])
  expect(findWords("Refais l'app et le mod", ['mod', 'app'])).toEqual(['mod', 'app'])
  expect(findWords('un montage vidéo', ['video'])).toEqual(['video'])
  expect(findWords('une Landing   Page', ['landing page'])).toEqual(['landing page'])
  expect(findWords('évite les sites', ['site'])).toEqual([])
})

test('détection : Expo l’emporte sur iOS et site web, indices relevés', async () => {
  const found = await detect(disk({ '/p/package.json': pkg({ expo: '1', react: '1', 'react-native': '1' }), '/p/eas.json': '{}', '/p/ios/App.xcodeproj/x': '' }), '/p', RULES)
  expect(found).toEqual({ types: ['app-expo'], indices: ['expo', 'react-native', 'eas.json'], source: 'fichiers' })
})

test('détection : monorepo (apps/web en Next, apps/mobile en Expo), Compose, Remotion, plugin', async () => {
  const mono = await detect(disk({ '/m/apps/web/package.json': pkg({ next: '1', react: '1' }), '/m/apps/mobile/package.json': pkg({ expo: '1', react: '1' }) }), '/m', RULES)
  expect(mono.types).toEqual(['site-web', 'app-expo'])
  const android = await detect(disk({ '/a/app/build.gradle.kts': 'plugins { alias(libs.plugins.kotlin.compose) }', '/a/settings.gradle.kts': '' }), '/a', RULES)
  expect(android).toEqual({ types: ['android'], indices: ['Compose'], source: 'fichiers' })
  const video = await detect(disk({ '/v/package.json': pkg({ '@remotion/cli': '4', react: '1' }) }), '/v', RULES)
  expect(video.types).toEqual(['site-web', 'video'])
  const tool = await detect(disk({ '/t/plugins/sm/.claude-plugin/plugin.json': '{}', '/t/README.md': '' }), '/t', RULES)
  expect(tool).toEqual({ types: ['outillage-claude-code'], indices: ['.claude-plugin/'], source: 'fichiers' })
  // Des skills installés dans .agents/ ou .claude/ ne font pas un projet d'outillage.
  const app = await detect(disk({ '/k/package.json': pkg({ expo: '1' }), '/k/.agents/skills/x/SKILL.md': '', '/k/.claude/skills/y/SKILL.md': '' }), '/k', RULES)
  expect(app.types).toEqual(['app-expo'])
})

test('détection : sans fichier parlant, les mots du prompt décident', async () => {
  const found = await detect(disk({ '/n/README.md': '' }), '/n', RULES, 'Je veux une landing pour mon client')
  expect(found).toEqual({ types: ['site-web'], indices: ['« landing »'], source: 'mots' })
  expect((await detect(disk({ '/n/README.md': '' }), '/n', RULES, 'bonjour')).types).toEqual([])
})

test('dossier et prompt se lisent séparément, pour repérer un conflit', async () => {
  const site = disk({ '/s/package.json': pkg({ next: '15', react: '19' }) })
  expect((await detectFiles(site, '/s', RULES)).types).toEqual(['site-web'])
  expect(detectWords('fais le montage de la vidéo de lancement', RULES)).toEqual({ types: ['video'], indices: ['« video »', '« montage »'], source: 'mots' })
  expect(detectWords('corrige le formulaire', RULES).types).toEqual([])
})

test('nouveau projet : pas de CLAUDE.md et presque vide', async () => {
  expect(await isNewProject(disk({ '/n/README.md': '', '/n/.git/HEAD': '' }), '/n')).toBe(true)
  expect(await isNewProject(disk({ '/n/CLAUDE.md': '' }), '/n')).toBe(false)
  expect(await isNewProject(disk({ '/n/a': '', '/n/b': '', '/n/c': '', '/n/d': '' }), '/n')).toBe(false)
})

const skill = (nom: string, extra: Partial<PackIndex['recommandes'][number]> = {}) => ({ id: `o/r/${nom}`, nom, repo: 'o/r', resume_fr: `fait ${nom} → améliore ${nom}`, risque_max: null, ...extra })

test('pack : 8 en tête en alternant les types, jamais et ignorés retirés, épinglés marqués', () => {
  const web: PackIndex = { type: 'site-web', recommandes: ['a', 'b', 'c', 'd', 'e', 'f'].map(n => skill(n)), ajouts: [skill('x')] }
  const expo: PackIndex = { type: 'app-expo', recommandes: ['g', 'h', 'i', 'j', 'frontend-design'].map(n => skill(n)), ajouts: [skill('y')] }
  const { tete, ajouts } = buildPack([web, expo], { jamais: ['frontend-design'], epingles: { 'site-web': [{ repo: 'o/r', nom: 'a' }] } }, new Set(['o/r/c']))
  expect(tete.map(one => one.nom)).toEqual(['a', 'g', 'b', 'h', 'd', 'i', 'e', 'j'])
  expect(ajouts.map(one => `${one.n} ${one.nom}`)).toEqual(['9 f', '10 x', '11 y'])
  expect(tete[0]!.epingle).toBe(true)
  expect(gain('te demande avant chaque choix visuel → évite que Claude invente le design')).toBe('évite que Claude invente le design')
})

test('numéros tapés : listes, plages, hors liste ignorés', () => {
  expect(parseNumbers('1 3, 12', 20)).toEqual([1, 3, 12])
  expect(parseNumbers('2-4 et 30', 20)).toEqual([2, 3, 4])
  expect(parseNumbers('aucun', 20)).toEqual([])
})

const MODEL_RULES: ModelRules = {
  modeles: { opus: { nom: 'Opus 5.5', id: 'claude-opus-5-5', commande: 'opus' }, sonnet: { nom: 'Sonnet 5.5', id: 'claude-sonnet-5-5', commande: 'sonnet' } },
  regles: [
    { id: 'gros-chantier', situation: '', si: { mots: ['refonte'], ou_nouveau_projet: true }, modele: 'opus', effort: 'xhigh', ultracode: true, raison: 'large' },
    { id: 'probleme-profond', situation: '', si: { mots: ['bug'] }, modele: 'opus', effort: 'high', ultracode: false, raison: 'profond' },
    { id: 'petite-modif', situation: '', si: { mots: ['renomme'], max_caracteres: 400 }, modele: 'sonnet', effort: 'medium', ultracode: false, raison: 'court' },
    { id: 'feature', situation: '', modele: 'opus', effort: 'medium', ultracode: false, raison: 'standard' },
  ],
}
const SONNET_HIGH: Reglage = { modele: 'claude-sonnet-5-5', effort: 'high', effortParModele: { 'claude-opus-5-5': 'xhigh' }, effortDefaut: 'medium', ultracode: null }

test('conseil : règle choisie, puis les commandes depuis le réglage actuel', () => {
  expect(chooseRule(MODEL_RULES, { prompt: 'La refonte du site', nouveau: false }).id).toBe('gros-chantier')
  expect(chooseRule(MODEL_RULES, { prompt: '', nouveau: true }).id).toBe('gros-chantier')
  expect(chooseRule(MODEL_RULES, { prompt: 'un bug au login', nouveau: false }).id).toBe('probleme-profond')
  expect(chooseRule(MODEL_RULES, { prompt: 'renomme ce champ', nouveau: false }).id).toBe('petite-modif')
  expect(chooseRule(MODEL_RULES, { prompt: `renomme ${'x'.repeat(500)}`, nouveau: false }).id).toBe('feature')

  // Passer sur Opus reprend son effort propre (xhigh) : pas besoin de /effort pour un gros chantier.
  expect(advise(MODEL_RULES, MODEL_RULES.regles[0]!, SONNET_HIGH).commandes).toEqual(['/model opus', '/effort ultracode'])
  expect(advise(MODEL_RULES, MODEL_RULES.regles[1]!, SONNET_HIGH).commandes).toEqual(['/model opus', '/effort high'])
  expect(advise(MODEL_RULES, MODEL_RULES.regles[2]!, SONNET_HIGH).commandes).toEqual(['/effort medium'])
  const opusOn = { ...SONNET_HIGH, modele: 'claude-opus-5-5', effort: 'medium', ultracode: true }
  expect(advise(MODEL_RULES, MODEL_RULES.regles[3]!, opusOn).commandes).toEqual(['/effort ultracode off'])
})

test('panneau B : toute la largeur, nom coupé à 22, ce que le skill améliore sans coupure, légende et ajouts', () => {
  const p: SkillmasterProposition = {
    racine: '/p',
    types: ['site-web'],
    libelle: 'site web',
    indices: ['next', 'tailwind'],
    tete: [
      { n: 1, id: 'a', nom: 'bencium-controlled-ux-designer', resume: 'te demande avant chaque choix visuel → évite que Claude invente le design', type: 'site-web', epingle: true, confiance: false, risque: null },
      { n: 2, id: 'b', nom: 'modern-web-guidance', resume: 'guide web moderne → évite les API obsolètes', type: 'site-web', epingle: false, confiance: true, risque: 'eleve' },
    ],
    ajouts: [{ n: 3, id: 'c', nom: 'web-design-guidelines', resume: null, type: 'site-web', epingle: true, confiance: true, risque: 'moyen' }],
    conseil: { regle: 'probleme-profond', modele: 'Opus 5.5', effort: 'high', ultracode: false, raison: 'la profondeur d’abord', commandes: ['/effort high'] },
    bibliotheque: null,
    vue: 'pack',
    conflit: null,
    etat: [],
    pret: 'ton prompt est de retour dans ta saisie',
  }
  const lines = panelLines(p, 80).map(line => line.text)
  expect(lines[0]).toBe(`// SKILLMASTER · SITE WEB${' '.repeat(40)}next · tailwind`)
  expect(lines[2]).toBe('01 bencium-controlled-ux…   évite que Claude invente le design')
  expect(lines[3]).toBe('02 modern-web-guidance      évite les API obsolètes')
  expect(lines).toContain('◆ épinglé 01 · ✓ confiance 02 · ● risque élevé 02')
  expect(lines).toContain('+ 1 ajout : web-design-guidelines')
  expect(lines).toContain('OPUS 5.5 · HIGH · ultracode off')
  expect(lines).toContain('pour le suivre, tape /effort high')
  expect(lines).toContain('ton prompt est de retour dans ta saisie')
  for (const line of panelLines(p, 80)) if (!line.wrap) expect(line.text.length).toBeLessThanOrEqual(80)

  // Un résumé trop long pour la largeur continue sous sa colonne, sans « … ».
  const long = { ...p.tete[0]!, n: 1, resume: 'audite → repère contrastes, focus clavier et cibles tactiles trop petites' }
  const wrapped = panelLines({ ...p, tete: [long] }, 70).map(line => line.text)
  expect(wrapped.slice(2, 4)).toEqual([
    '01 bencium-controlled-ux…   repère contrastes, focus clavier et cibles',
    `${' '.repeat(28)}tactiles trop petites`,
  ])

  // Sous 70 colonnes : deux lignes par skill, le nom puis ce qu'il améliore, en entier et en retrait.
  const narrow = panelLines(p, 49)
  expect(narrow.map(line => line.text).slice(2, 6)).toEqual([
    '01 bencium-controlled-ux-designer',
    'évite que Claude invente le design',
    '02 modern-web-guidance',
    'évite les API obsolètes',
  ])
  expect(narrow[3]).toMatchObject({ indent: 3, wrap: true, dim: true })
  for (const line of narrow) if (!line.wrap) expect(line.text.length).toBeLessThanOrEqual(49)
  expect(panelLines(p, 69).map(line => line.text)).toContain('01 bencium-controlled-ux-designer')
  expect(panelLines(p, 70).map(line => line.text)).toContain(lines[2])

  const choix = panelLines({ ...p, vue: 'choix' }, 60).map(line => line.text)
  expect(choix).toContain('te demande avant chaque choix visuel → évite que Claude invente le design')
  expect(choix).toContain('03 web-design-guidelines ◆✓')

  const conflit = panelLines({
    ...p,
    vue: 'conflit',
    conflit: [
      { origine: 'prompt', libelle: 'vidéo', indices: ['« montage »'], tete: p.tete },
      { origine: 'dossier', libelle: 'site web', indices: ['next'], tete: p.tete },
    ],
  }, 60).map(line => line.text)
  expect(conflit[0]).toBe('// SKILLMASTER · 2 PACKS POSSIBLES')
  expect(conflit[2]).toBe(`TON PROMPT · VIDÉO${' '.repeat(60 - 18 - 11)}« montage »`)
  expect(conflit).toContain(`LE DOSSIER · SITE WEB${' '.repeat(60 - 21 - 4)}next`)
  expect(conflit.at(-1)).toBe('Choisis le pack dans le dialogue.')
})

// Un extrait des annexes de modern-web-guidance (près de 200 au total).
const GUIDES = [
  'guides/css/individual-transform-properties.md',
  'guides/css/animate-to-intrinsic-sizes.md',
  'guides/performance/faster-spa-view-transitions.md',
  'guides/ui-behaviors/motion.md',
  'guides/ui-behaviors/same-document-transitions.md',
  'guides/ui-behaviors/cross-document-transitions.md',
  'guides/ui-behaviors/group-element-transitions.md',
  'guides/ui-behaviors/animate-element-entry-exit.md',
  'guides/forms/forms.md',
  'LICENSE',
]

test('annexes : une ligne par dossier, la racine d’abord', () => {
  expect(groupAnnexes(GUIDES)).toEqual([
    './ : LICENSE',
    'guides/css/ : animate-to-intrinsic-sizes.md, individual-transform-properties.md',
    'guides/forms/ : forms.md',
    'guides/performance/ : faster-spa-view-transitions.md',
    'guides/ui-behaviors/ : animate-element-entry-exit.md, cross-document-transitions.md, group-element-transitions.md, motion.md, same-document-transitions.md',
  ])
})

test('annexes : un chemin deviné reçoit les fichiers qui partagent ses mots', () => {
  expect(nearest('guides/ui/view-transitions.md', GUIDES)[0]).toBe('guides/performance/faster-spa-view-transitions.md')
  expect(nearest('guides/ui/view-transitions.md', GUIDES)).toContain('guides/ui-behaviors/same-document-transitions.md')
  expect(nearest('guides/motion/motion.md', GUIDES)).toEqual(['guides/ui-behaviors/motion.md'])
  expect(nearest('guides/animation/animation.md', GUIDES).slice(0, 2)).toEqual(['guides/css/animate-to-intrinsic-sizes.md', 'guides/ui-behaviors/animate-element-entry-exit.md'])
  expect(nearest('zzz/qqq.md', GUIDES)).toEqual([])
})

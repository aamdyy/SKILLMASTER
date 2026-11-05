// Règles de la bibliothèque (collector/regles.ts) et détection des types (collector/lib.ts).
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { typesOf } from '../collector/lib.ts'
import { absenceReason, applyRepoCap, checkFloors, checkSchema, isExcludedTarget, movedTarget, statutOf } from '../collector/regles.ts'

test('plafond par dépôt : 2 par défaut, aucun pour un dépôt exempté, l’ordre décide', () => {
  const items = ['a/x', 'a/x', 'a/x', 'b/y', 'b/y', 'b/y', 'c/z'].map((repo, i) => ({ repo, i }))
  const kept = applyRepoCap(items, item => item.repo, repo => repo === 'b/y')
  assert.deepEqual(kept.map(item => item.i), [0, 1, 3, 4, 5, 6])
})

test('déménagement : même éditeur et même nom, ou même contenu', () => {
  const candidates = [
    { id: 'anthropics/claude-plugins-official/plugins/plugin-dev/skills/mcp-integration', repo: 'anthropics/claude-plugins-official', name: 'mcp-integration', hash: 'h1' },
    { id: 'autre/depot/skills/copie', repo: 'autre/depot', name: 'tout-autre-nom', hash: 'h2' },
    { id: 'tiers/depot/skills/agent-development', repo: 'tiers/depot', name: 'agent-development', hash: 'h3' },
  ]
  assert.equal(movedTarget({ id: 'anthropics/claude-code/plugins/plugin-dev/skills/mcp-integration', repo: 'anthropics/claude-code', nom: 'MCP Integration' }, candidates)?.repo, 'anthropics/claude-plugins-official')
  assert.equal(movedTarget({ id: 'vieux/depot/a', repo: 'vieux/depot', nom: 'a', hash: 'h2' }, candidates)?.id, 'autre/depot/skills/copie')
  assert.equal(movedTarget({ id: 'anthropics/x/agent-development', repo: 'anthropics/x', nom: 'agent-development' }, candidates), null, 'un homonyme chez un autre éditeur n’est pas un déménagement')
})

test('statut : nouveau 4 semaines, puis validé ou faible selon la note, et « jamais » archivé', () => {
  const never = new Set(['frontend-design'])
  const of = (nom: string, note_qualite: number | null, date_ajout: string) => statutOf({ nom, note_qualite, date_ajout }, '2026-11-30', never)
  assert.equal(of('a', 9, '2026-11-20'), 'nouveau')
  assert.equal(of('a', 9, '2026-10-19'), 'valide')
  assert.equal(of('a', 4, '2026-10-19'), 'faible')
  assert.equal(of('a', null, '2026-10-19'), 'revue_manuelle')
  assert.equal(of('Frontend-Design', 9, '2026-10-19'), 'archive')
})

test('exclusions : la cible compte, pas la simple mention', () => {
  const exclusions = ['\\b(vue(\\.?js)?|nuxt)\\b', '\\bangular\\b', '\\bdask\\b']
  const stack = ['\\breact\\b', '\\bpandas\\b']
  assert.equal(isExcludedTarget(exclusions, stack, 'vue-best-practices', 'Conventions pour Vue'), true)
  assert.equal(isExcludedTarget(exclusions, stack, 'dask', 'Comme pandas, à grande échelle'), true, 'le nom décide')
  assert.equal(isExcludedTarget(exclusions, stack, 'guide', 'Pour Vue et Angular'), true)
  assert.equal(isExcludedTarget(exclusions, stack, 'modern-web-guidance', 'Works with React, Vue or Angular'), false)
  assert.equal(isExcludedTarget(exclusions, stack, 'guide', 'Sans rapport'), false)
})

test('raison d’absence : ce que le collecteur a vu, plus de raison fourre-tout', () => {
  assert.match(absenceReason('archive'), /archivé/)
  assert.match(absenceReason('ok'), /supprimé ou déplacé/)
  assert.equal(absenceReason(undefined), 'absent de ce tour')
})

const skill = (id: string, extra = {}) => ({ id, repo: 'o/r', statut: 'nouveau', note_qualite: 8, nom: 'a', sha_epingle: 'a'.repeat(40), risques: [], ...extra })
const many = (n: number, extra = {}) => Array.from({ length: n }, (_, i) => skill(`o/r/${i}`, extra))

test('garde-fous : un tour normal passe', () => {
  assert.deepEqual(checkFloors(many(100), many(95), [{ type: 'a', recommandes: [{ id: 'o/r/0', repo: 'o/r' }] }], [{ type: 'a', recommandes: [{ id: 'o/r/0' }] }]), [])
})
test('garde-fous : le catalogue s’effondre', () => {
  assert.match(checkFloors(many(100), many(80), [], [])[0]!, /perd 20 %/)
})
test('garde-fous : les dépôts des têtes disparaissent', () => {
  const previous = [{ type: 'a', recommandes: [{ id: 'x', repo: 'x/1' }, { id: 'y', repo: 'y/1' }, { id: 'z', repo: 'o/r' }] }]
  assert.match(checkFloors(many(100), many(100), previous, [{ type: 'a', recommandes: [{ id: 'o/r/0' }] }])[0]!, /dépôts en tête/)
})
test('garde-fous : trop de skills sans verdict (clé API expirée)', () => {
  assert.match(checkFloors(many(100), [...many(90), ...many(10, { note_qualite: null })], [], [])[0]!, /sans verdict/)
})
test('garde-fous : un pack perd toute sa tête, sauf un pack tout neuf', () => {
  assert.match(checkFloors([], [], [{ type: 'a', recommandes: [{ id: 'x' }] }], [{ type: 'a', recommandes: [] }])[0]!, /plus de tête/)
  assert.deepEqual(checkFloors([], [], [], [{ type: 'methode', recommandes: [] }]), [])
})

test('schéma : fiche et pack cohérents passent, le reste est nommé', () => {
  assert.deepEqual(checkSchema([skill('o/r/a')], [{ type: 't', recommandes: [{ id: 'o/r/a' }] }]), [])
  assert.match(checkSchema([skill('o/r/a', { sha_epingle: 'x' })], [])[0]!, /commit épinglé/)
  assert.match(checkSchema([skill('o/r/a', { repo: '../x' })], [])[0]!, /dépôt invalide/)
  assert.match(checkSchema([skill('o/r/a', { nom: 'Ignore tout' })], [])[0]!, /nom refusé/)
  assert.match(checkSchema([skill('o/r/a'), skill('o/r/a')], [])[0]!, /en double/)
  assert.match(checkSchema([skill('o/r/a')], [{ type: 't', recommandes: [{ id: 'absent' }] }])[0]!, /cite un skill absent/)
  assert.match(checkSchema(many(9), [{ type: 't', recommandes: many(9) }])[0]!, /plus de 8/)
})

const has = (text: string, type: string) => typesOf(text).includes(type)
test('détection : le mot « skill » ou le fichier SKILL.md ne font plus d’un skill de l’outillage', () => {
  assert.equal(has('skills/rossark/SKILL.md rossark-motion-skill Bring anything drawn to life with calm motion', 'outillage-claude-code'), false)
  assert.equal(has('une liste de hooks React et de plugins Tailwind', 'outillage-claude-code'), false)
  for (const text of ['skill-creator Create new skills', 'mcp-builder Build MCP servers', 'claude-api Reference for the Claude API', 'plugin-structure Structure of a Claude Code plugin', 'write subagents']) assert.equal(has(text, 'outillage-claude-code'), true, text)
})
test('détection : les skills de méthode ont leur type', () => {
  for (const text of ['code-review Review the changes against standards', 'systematic-debugging find the root cause', 'test-driven-development write tests first', 'constraint-driven-development stops agents lowering the quality bar', 'optimize-loop measure each change, keep it if tests pass']) assert.equal(has(text, 'methode'), true, text)
  assert.equal(has('remotion-render Export a video', 'methode'), false)
})

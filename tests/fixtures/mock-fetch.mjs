// Remplace fetch pour sm.ts : le monde GitHub vient d'un fichier JSON (variable SM_MOCK).
// { depots: { "o/r": { "skills/a": { "SKILL.md": "…", "references/x.md": "…" } } }, tronque: ["o/r"], panne: true }
import { readFileSync } from 'node:fs'

const world = JSON.parse(readFileSync(process.env.SM_MOCK, 'utf8'))
const json = value => new Response(JSON.stringify(value), { status: 200 })
const missing = () => new Response('', { status: 404 })

globalThis.fetch = async url => {
  const text = String(url)
  if (world.panne) throw new Error('réseau coupé')
  const trees = text.match(/^https:\/\/api\.github\.com\/repos\/([^/]+\/[^/]+)\/git\/trees\/([^?]+)/)
  if (trees) {
    const [, repo, treeish] = trees
    const [, dir = ''] = decodeURIComponent(treeish).split(':')
    const folder = world.depots[repo]?.[dir]
    if (!folder) return missing()
    return json({
      truncated: (world.tronque ?? []).includes(repo),
      tree: Object.entries(folder).map(([path, body]) => ({ path, type: 'blob', mode: path.endsWith('.sh') ? '100755' : '100644', size: body.length })),
    })
  }
  const raw = text.match(/^https:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/[0-9a-f]{40}\/(.+)$/)
  if (raw) {
    const [, repo, path] = raw
    for (const [dir, folder] of Object.entries(world.depots[repo] ?? {})) {
      const relative = dir ? (path.startsWith(`${dir}/`) ? path.slice(dir.length + 1) : null) : path
      if (relative !== null && relative in folder) return new Response(folder[relative], { status: 200 })
    }
    return missing()
  }
  return missing()
}

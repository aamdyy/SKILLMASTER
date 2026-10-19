// Outils partagés du collecteur : accès GitHub (REST, GraphQL, fichiers bruts),
// cache disque, parallélisme borné et lecture du frontmatter des SKILL.md.
import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const CACHE = join(ROOT, 'collector', '.cache')
export const LIBRARY = join(ROOT, 'library')

const TOKEN = process.env.GITHUB_TOKEN ?? ''

export const OFFICIAL = ['anthropics/skills', 'anthropics/claude-plugins-official', 'anthropics/claude-code-playground']
// Dépôts d'origine des skills qu'Amdy utilise déjà : toujours parcourus, avec un bonus
// de présélection ; seuls eux (et les dépôts anthropics/) reçoivent son usage réel.
export const REFERENCES = [
  'remotion-dev/skills', 'vercel-labs/agent-skills', 'expo/skills', 'greensock/gsap-skills', 'obra/superpowers',
  'twostraws/SwiftUI-Agent-Skill', 'hamen/material-3-skill', 'nextlevelbuilder/ui-ux-pro-max-skill',
  'ceorkm/mobile-app-ui-design', 'bencium/bencium-marketplace',
]
export const isTrustedRepo = (repo: string) =>
  repo.toLowerCase().startsWith('anthropics/') || REFERENCES.some(reference => reference.toLowerCase() === repo.toLowerCase())

export const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export function sha256(text: string) {
  return createHash('sha256').update(text).digest('hex')
}

export function log(...parts: unknown[]) {
  console.error(`[${new Date().toISOString().slice(11, 19)}]`, ...parts)
}

export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as T
  } catch {
    return fallback
  }
}

export async function writeJson(path: string, value: unknown) {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`)
}

export async function pool<T, R>(items: T[], size: number, work: (item: T, index: number) => Promise<R>) {
  const results: R[] = new Array(items.length)
  let next = 0
  const lanes = Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) {
      const index = next++
      results[index] = await work(items[index] as T, index)
    }
  })
  await Promise.all(lanes)
  return results
}

function headers(accept = 'application/vnd.github+json'): Record<string, string> {
  const base: Record<string, string> = {
    Accept: accept,
    'User-Agent': 'skillmaster-collector',
    'X-GitHub-Api-Version': '2022-11-28',
  }
  if (TOKEN) base.Authorization = `Bearer ${TOKEN}`
  return base
}

// Attend la fin d'une limite de débit GitHub, puis réessaie (5 tentatives au plus).
async function request(url: string, init: RequestInit = {}, accept?: string): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const response = await fetch(url, { ...init, headers: { ...headers(accept), ...(init.headers ?? {}) } })
    const isLimited = response.status === 429 || (response.status === 403 && response.headers.get('x-ratelimit-remaining') === '0')
    if (isLimited && attempt < 5) {
      const reset = Number(response.headers.get('x-ratelimit-reset') ?? 0) * 1000
      const retryAfter = Number(response.headers.get('retry-after') ?? 0) * 1000
      const wait = Math.max(retryAfter, reset - Date.now(), 5_000) + 1_000
      log(`limite GitHub atteinte, pause de ${Math.round(wait / 1000)} s`)
      await sleep(Math.min(wait, 15 * 60_000))
      continue
    }
    if (response.status >= 500 && attempt < 3) {
      await sleep(2_000 * (attempt + 1))
      continue
    }
    return response
  }
}

export async function rest<T>(path: string): Promise<T | null> {
  const response = await request(path.startsWith('http') ? path : `https://api.github.com${path}`)
  if (!response.ok) return null
  return (await response.json()) as T
}

// GraphQL : rend les données même si certaines entrées sont en erreur (dépôt supprimé…).
export async function graphql<T>(query: string): Promise<T> {
  const response = await request('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
  const body = (await response.json()) as { data?: T; errors?: unknown[] }
  if (!body.data) throw new Error(`GraphQL : ${JSON.stringify(body.errors ?? response.status).slice(0, 300)}`)
  return body.data
}

// Fichier brut d'un dépôt à un commit précis, mis en cache sur disque.
export async function rawFile(repo: string, sha: string, path: string): Promise<string | null> {
  const cached = join(CACHE, 'raw', repo.replace('/', '__'), sha, path)
  try {
    return await readFile(cached, 'utf8')
  } catch {}
  const url = `https://raw.githubusercontent.com/${repo}/${sha}/${path.split('/').map(encodeURIComponent).join('/')}`
  const response = await request(url, {}, '*/*')
  if (!response.ok) return null
  const text = await response.text()
  await mkdir(dirname(cached), { recursive: true })
  await writeFile(cached, text)
  return text
}

export type Frontmatter = Record<string, string>

// Lecture volontairement simple : clés de premier niveau, valeurs sur une ou plusieurs lignes.
export function frontmatter(text: string): { fields: Frontmatter; raw: string } {
  const match = text.match(/^﻿?---\r?\n([\s\S]*?)\r?\n---/)
  if (!match) return { fields: {}, raw: '' }
  const raw = match[1] ?? ''
  const fields: Frontmatter = {}
  let key = ''
  for (const line of raw.split(/\r?\n/)) {
    const head = line.match(/^([A-Za-z][\w-]*):\s?(.*)$/)
    if (head) {
      key = head[1] as string
      fields[key] = (head[2] ?? '').trim()
    } else if (key) {
      fields[key] = `${fields[key]} ${line.trim()}`.trim()
    }
  }
  for (const name of Object.keys(fields)) {
    fields[name] = (fields[name] ?? '').replace(/^["'>|-]+\s*/, '').replace(/["']$/, '').trim()
  }
  return { fields, raw }
}

export function isoWeek(date: Date) {
  const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const weekday = day.getUTCDay() || 7
  day.setUTCDate(day.getUTCDate() + 4 - weekday)
  const yearStart = new Date(Date.UTC(day.getUTCFullYear(), 0, 1))
  const week = Math.ceil(((day.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
  return `${day.getUTCFullYear()}-W${String(week).padStart(2, '0')}`
}

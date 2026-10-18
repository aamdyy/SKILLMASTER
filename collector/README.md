# Collecteur et juge

Il faut Node 24, qui lit le TypeScript sans build, et aucune dépendance. Il faut aussi `gh` connecté et une session `claude` active.

```bash
# 1. Découvrir, lire les SKILL.md au commit épinglé, scanner, présélectionner
GITHUB_TOKEN=$(gh auth token) node collector/fetch.ts --max-skills 450 --min-stars 20 --pushed-months 6

# 2. Juger avec Claude Haiku (abonnement), puis écrire library/
node collector/judge.ts --concurrency 5
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `fetch.ts` | Découverte, métadonnées, arbres git, lecture des SKILL.md, déduplication, présélection par type, dernier commit par chemin, étoiles sur 30 jours |
| `scan.ts` | Risques détectés sans LLM ni exécution : shell inline, `allowed-tools`, hooks, plugin.json, `.mcp.json`, scripts, binaires, injection, base64… |
| `judge.ts` | Note de 0 à 10, catégories, rôle suggéré, drapeau « choix visuels autonomes », risques observés. Écrit `library/skills.json`, `library/packs/<type>.json` et `library/history/stars-<semaine>.json` |
| `lib.ts` | Accès GitHub (REST, GraphQL, fichiers bruts), cache disque, parallélisme |

## Sécurité

- Le contenu des skills tiers est lu comme du texte, **jamais exécuté**. Il est gardé dans `collector/.cache/`, qui n'est pas versionné, et n'est jamais copié dans `library/`.
- Le juge n'a **aucun outil, aucun hook, aucun MCP**, ne garde aucun transcript, et lit le SKILL.md comme une donnée non fiable.
- Aucun secret dans le code : le jeton GitHub vient de `gh auth token`, et le juge passe par la session `claude` d'Amdy.

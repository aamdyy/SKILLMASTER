# Collecteur et juge

Il faut Node 24, qui lit le TypeScript sans build, et aucune dépendance. Il faut aussi `gh` connecté et une session `claude` active.

```bash
# 1. Découvrir, lire les SKILL.md au commit épinglé, scanner, présélectionner
GITHUB_TOKEN=$(gh auth token) node collector/fetch.ts --max-skills 450 --min-stars 20 --pushed-months 6

# 2. Juger en deux temps (Haiku sur tout, puis Sonnet sur les finalistes de chaque pack),
#    puis écrire library/
node collector/judge.ts --concurrency 5 --finalists 12

# 3. Cycle de vie, index et récapitulatif
node collector/publish.ts

# 4. Calibrer par l'usage réel : place des skills les plus utilisés, avant et après
node collector/calibrate.ts --avant <commit> --min 5
```

## Fichiers

| Fichier | Rôle |
|---|---|
| `fetch.ts` | Découverte (topics, recherches par type, marketplace officielle, listes awesome, dépôts de référence), métadonnées, arbres git, lecture des SKILL.md, déduplication, présélection par type, dernier commit par chemin, étoiles sur 30 jours |
| `scan.ts` | Risques détectés sans LLM ni exécution. Un motif trouvé dans un bloc de code d'exemple descend d'un cran, et une phrase d'injection citée pour mettre en garde n'est qu'une mention |
| `judge.ts` | Grille v2 : 5 sous-notes de 0 à 2 sur le SKILL.md et ses annexes. Types stricts confirmés par la détection, drapeau « choix visuels autonomes » séparé de la note, réserves de qualité séparées des risques de sécurité. Note finale = note du juge + bonus d'usage. Packs : les 5 à 8 meilleurs par type (note ≥ 6), plus les épinglages |
| `resume.ts` | `resume_fr` : une phrase, 15 mots au plus, « ce qu'il fait → ce qu'il améliore ». Troisième temps du juge (Sonnet pour les finalistes, Haiku pour les autres). `node collector/resume.ts --archive` remplit aussi le manifeste de la bibliothèque locale |
| `publish.ts` | Après le juge : cycle de vie (archive des skills disparus du tour qui comptaient, `remplace_par`), index léger `library/index/<type>.json` pour skill-master, récapitulatif `library/RECAP.md`, signal « tête changée » pour l'issue |
| `rank.ts` | Classement comparatif d'un pack par Sonnet : 3 tirages, stack et exclusions, avantage au tenant (2 changements au plus) |
| `usage.ts` | Compteurs d'invocations d'Amdy, ramenés au nom des skills. Ne crédite que les dépôts officiels et de référence |
| `calibrate.ts` | Calibrage par l'usage : les skills les plus utilisés doivent finir en haut de leur pack |
| `lib.ts` | Accès GitHub, cache disque, parallélisme, listes des dépôts officiels et de référence |

Les décisions d'Amdy (épinglages, « jamais », exclusions) sont dans `library/overrides.json`.

## Sécurité

- Le contenu des skills tiers est lu comme du texte, **jamais exécuté**. Il est gardé dans `collector/.cache/`, qui n'est pas versionné, et n'est jamais copié dans `library/`.
- Le juge n'a **aucun outil, aucun hook, aucun MCP**, ne garde aucun transcript, et lit le SKILL.md comme une donnée non fiable.
- Aucun secret dans le code : le jeton GitHub vient de `gh auth token`, et le juge passe par la session `claude` d'Amdy. Seuls des compteurs d'usage atterrissent dans `library/` (`retours_amdy`).

## En CI (phase 3)

`.github/workflows/weekly-scan.yml` lance la même chaîne le lundi à 5 h 17 UTC. Elle utilise :
- les secrets `COLLECTOR_TOKEN` (GitHub, en lecture seule) et `ANTHROPIC_API_KEY` ;
- `claude --bare` (`SM_CLAUDE_BARE=1`).

Le coût reste minimal parce que trois choses sont réutilisées :
- **les verdicts et les résumés déjà publiés dans `library/skills.json`** (même hash, même grille), qui servent de cache durable même quand le cache des Actions a expiré ;
- **la tête et les ajouts d'un pack** quand sa finale n'a pas changé, sans appel à Sonnet ;
- **l'usage d'Amdy**, figé jusqu'à la phase 4 (`--usage-live` pour le relire en local).

# Phase 3 — mise à jour hebdomadaire automatique : plan

> 2026-10-19. Plan validé par Amdy, avec les décisions ci-dessous.

## Ce que fait l'Action, chaque semaine

`.github/workflows/weekly-scan.yml`, déclenchée par un `schedule` (lundi, minute décalée) et à la main (`workflow_dispatch`).

1. **Collecteur** (`fetch.ts`, 1 500 skills, `--keep-from` = le dernier commit). Lecture seule de GitHub, rien n'est exécuté.
2. **Juge** (`judge.ts`).
   - Haiku ne note que les skills nouveaux ou modifiés : le cache est restauré entre deux tours (`actions/cache`).
   - Les résumés se font de la même manière.
   - Sonnet range chaque pack, avec l'avantage au tenant (tenants = packs actuels de `library/`).
3. **Cycle de vie** (nouveau, `lifecycle.ts`).
   - `archive` : plus de commit sur le chemin du skill depuis 6 mois, retiré de son dépôt, ou dépôt archivé.
   - `remplace_par` : un tenant remplacé reçoit le nom de son remplaçant.
   - Les règles d'étoiles et d'usage viendront en phase 4.
4. **Récapitulatif hebdomadaire** (nouveau) : `library/RECAP.md`, réécrit à chaque tour, lisible en 30 secondes. Il contient :
   - les changements de têtes par pack, avec leur raison ;
   - les skills écartés ;
   - les entrées et les archivages ;
   - le coût et la durée.

   Le même texte sert de corps au commit.
5. **Commit sur `main`**, et seulement des fichiers de `library/`. Le job vérifie qu'aucun autre fichier n'a changé avant de pousser.

## Choix techniques proposés

- **Le juge garde `claude -p`** (Claude Code CLI installé dans l'Action), authentifié par `ANTHROPIC_API_KEY`, avec `--bare` : plus rapide, sans hooks ni réglages. Le code ne change presque pas.
  - Coût hebdomadaire attendu : quelques centimes pour Haiku (seulement ce qui change), plus environ 0,65 $ quand les finalistes d'un pack changent.
  - Le passage à l'API Batches n'est utile que si le volume monte beaucoup.
- **Jeton GitHub du collecteur.** Le `GITHUB_TOKEN` de l'Action est limité à 1 000 requêtes par heure, et un tour en demande environ 1 200. Un jeton personnel *fine-grained*, en lecture seule sur les dépôts publics, est plus sûr (5 000 par heure). C'est un second secret, `COLLECTOR_TOKEN`.
- **Garde-fous.**
  - Le job de collecte et de jugement n'a que la lecture ; seul le job final a le droit d'écrire, et il ne reçoit que `library/`.
  - Les actions sont épinglées par SHA, la durée est plafonnée à 3 h.
  - La clé n'est exposée qu'à l'étape du juge.
  - Le juge n'a aucun outil.
- **Minutes d'Actions.** Un premier tour prend environ 1 h, puis 15 à 30 min par semaine, soit moins de 2 h par mois, bien en dessous des 2 000 minutes gratuites d'un repo privé.

## Côté Mac (skill-master v1)

- **Synchronisation** : au début de chaque proposition, `skill-master` met à jour sa copie de `library/` dans `~/.cache/skillmaster/library/`. Le repo de dev ne bouge jamais.
- **Un nouveau skill accepté** (absent du disque) passe par 4 étapes :
  1. télécharger son dossier **au commit épinglé** (`sha_epingle`), jamais la dernière version ;
  2. refaire le scan de sécurité (`scan.ts`) ;
  3. afficher les risques ;
  4. charger pour la session.

  Un petit outil `collector/fetch-skill.ts` fait les trois premières étapes dans un dossier de session.
- **Lecture légère.** `library/skills.json` pèse 1,5 Mo, trop lourd à lire à chaque proposition. L'Action produira aussi `library/index.json` : pour chaque skill des packs, le nom, le dépôt, le commit épinglé, le `resume_fr`, les risques et la place. `skill-master` ne lira que les packs et cet index.

## Ce qui reste local

L'usage réel (`~/.claude.json`) n'existe que sur le Mac d'Amdy. Il est figé jusqu'à la phase 4 (décision 2).

## Décisions d'Amdy (2026-10-19)

1. **Synchronisation : le repo de dev ne bouge jamais.** `skill-master` garde sa propre copie légère, en lecture seule, de `library/` seulement, dans `~/.cache/skillmaster/library/`. Il la met à jour avant chaque proposition.
2. **Usage figé** à sa valeur actuelle jusqu'à la phase 4. Le juge reprend les `retours_amdy` déjà présents dans `library/skills.json`. En phase 4, on construira un seul canal de retour pour l'usage et les étoiles.
3. **Récapitulatif :** `library/RECAP.md` chaque semaine, plus une **issue GitHub seulement les semaines où une tête de pack change**.
4. **Jeton du collecteur :** jeton *fine-grained* en lecture seule, créé par Amdy, en secret `COLLECTOR_TOKEN`.
5. **Horaire :** le lundi à **5 h 17 UTC** (`cron: '17 5 * * 1'`).
6. **`ANTHROPIC_API_KEY`** est ajoutée par Amdy dans les secrets du repo, au moment du premier lancement manuel.

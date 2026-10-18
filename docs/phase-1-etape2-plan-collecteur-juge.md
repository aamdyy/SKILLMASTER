# Phase 1, étape 2 — collecteur et juge : plan

> 2026-10-18. Plan à valider avant d'écrire du code. Il s'appuie sur les mesures de la phase 0 (`docs/local/phase-0-rapport.md`).

## Le but de cette étape

Lancer une première fois **à la main, en local**, pour obtenir :
- un premier `library/skills.json` ;
- les packs par type dans `library/packs/`.

Amdy relit les packs. L'automatisation hebdomadaire viendra en phase 3.

## Le parcours

1. **Découvrir** (`collector/fetch.ts`) les repos candidats, par ordre de rentabilité :
   1. les topics GitHub (`claude-skills`, `agent-skills`, `claude-code-skills`, `claude-code-plugin`, `claude-skill`), avec un seuil d'étoiles et de fraîcheur ;
   2. la marketplace officielle, `anthropics/skills` et `anthropics/claude-code-playground` ;
   3. les listes awesome (le CSV de hesreallyhim, et les README de ComposioHQ et VoltAgent) ;
   4. les dépôts d'origine des 58 skills de l'archive ;
   5. en option : claude-plugins.dev (accès anonyme) et l'annuaire non documenté d'Anthropic.
2. **Lister et lire** les skills de chaque repo : un seul appel à l'API Git Trees par repo pour trouver les `SKILL.md`, puis lecture du texte brut **au commit épinglé**. Rien n'est jamais exécuté, et le contenu n'est jamais copié dans ce repo.
3. **Scanner sans LLM** (`collector/scan.ts`) pour produire les `risques[]`. Les motifs recherchés :
   - shell inline (`` !`…` ``, ```` ```! ````), `allowed-tools`, `hooks:` dans le frontmatter ;
   - `.claude-plugin/`, `hooks/`, `.mcp.json`, `bin/`, scripts, binaires, liens ;
   - `curl | sh`, `rm -rf`, `eval`, blocs base64 ;
   - phrases d'injection (« ignore previous instructions »…) et caractères invisibles.
4. **Mesurer**, avec un seul appel GraphQL pour 50 repos :
   - les étoiles, l'archivage et la licence ;
   - le **dernier commit sur le chemin du skill**, et non sur le repo entier ;
   - la vitesse sur 30 jours, à partir des événements `WatchEvent`.
5. **Juger** (`collector/judge.ts`), seulement les skills nouveaux ou modifiés, repérés par le hash du `SKILL.md` :
   - modèle `claude-haiku-5-5`, sans outils, sortie structurée, réflexion coupée ;
   - instructions de notation mises en cache.

   Le juge produit :
   - `categories[]` : les types de projet ;
   - `description_courte` en français ;
   - `note_qualite` sur 10, selon une grille : clarté, périmètre, précision, maintenance, doublons ;
   - `role_suggere` : recommandé ou ajout ;
   - un **drapeau « choix visuels autonomes »**, pour la règle Figma d'abord ;
   - des risques observés, qui s'ajoutent à ceux du scan.

   Un refus du modèle devient « revue manuelle ».
6. **Écrire :**
   - `library/skills.json` : le schéma du brief, plus `sha_epingle`, `hash_contenu`, `installs {value, source, as_of}` et `cout_contexte` ;
   - `library/packs/<type>.json` : 8 recommandés au maximum, plus les ajouts ;
   - `library/history/stars-AAAA-SS.json`.

   `skill-master` lira ensuite ces packs au lieu de sa table interne.

## Décisions d'Amdy (2026-10-18) et choix techniques retenus

- **Juge du premier lancement :** `claude -p --model haiku`, sur l'abonnement d'Amdy. La clé API dédiée (workspace et plafond de dépense) attendra la phase 3 et la GitHub Action. `--bare` est exclu, car il exige une clé API. Les autres options gardent le juge isolé : `--tools ""`, `--strict-mcp-config`, `--disable-slash-commands`, `--no-session-persistence`, `--settings '{"disableAllHooks":true}'`, `--system-prompt` dédié et `--json-schema`.
- **Seuils :** au moins 20 étoiles, un push de moins de 6 mois (cohérent avec la règle d'archivage), 300 à 500 skills jugés pour vérifier la qualité des notes. On montera ensuite.
- **Annuaire non documenté d'Anthropic :** option `--with-anthropic-directory`, désactivée par défaut et pas encore branchée.
- **Git :** initialisé, avec un `.gitignore` qui exclut `docs/local/`, `experiments/`, les caches et les secrets.
- **Exécution :** Node 24, qui lit le TypeScript sans build. **Aucune dépendance**, puisque le juge passe par la CLI.
- **Identifiants :** GitHub via `gh auth token`, Anthropic via la session `claude` d'Amdy. Aucun secret dans le code.
- **Garde-fous :**
  - `--max-skills`, `--min-stars`, `--pushed-months` et `--max-repos` dans `fetch.ts` ;
  - `--limit` et `--concurrency` dans `judge.ts` ;
  - un verdict en cache par hash, donc rien n'est rejugé sans changement.

Mode d'emploi : `collector/README.md`.

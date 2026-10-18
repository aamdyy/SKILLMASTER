---
name: skill-master
description: SKILLMASTER choisit et charge les bons skills pour le projet ouvert. À utiliser quand Amdy dit « va voir SKILLMASTER », « prends les skills dont tu as besoin », « quels skills pour ce projet ? », « charge le pack », ou quand il demande de s'équiper avant un gros chantier. Détecte le type de projet d'après les fichiers, propose une sélection (8 au maximum) et des ajouts possibles, puis charge pour la session sans rien écrire dans le projet.
---

# skill-master (v0)

La bibliothèque locale est `~/.claude/skills-archive/`. Chaque dossier est un skill. En v0, les packs sont définis dans ce fichier. En v1, ils viendront de `library/packs/` dans le repo SKILLMASTER.

## La bibliothèque : `~/.claude/skills-archive/MANIFEST.json`

Lis-le **en entier avec l'outil Read, une seule fois**, au moment de proposer. N'écris ni script ni jq pour le parcourir : il fait environ 80 lignes, avec une entrée par ligne.

- Racine : `date`, `source`, `note`, `format` (le rappel des champs) et `entrees`, un tableau.
- Une entrée :
  - `name` : le nom du skill et de son dossier ;
  - `kind` : `dossier`, `lien`, `fichier` ou `plugin-coupe` (le skill d'un plugin désactivé, lu dans le cache des plugins) ;
  - `cible` : la cible du lien (seulement pour un lien) ;
  - `plugin` et `condition` (seulement pour `plugin-coupe`) : le plugin d'origine, et ce qui doit être détecté pour proposer le skill ;
  - `skill_md` : **le chemin absolu du `SKILL.md` à lire**. Il règle déjà les cas de bencium et des liens ; il vaut `null` pour `shared` ;
  - `description` : 110 caractères au maximum ;
  - `packs` : les types de projet où le skill apparaît ;
  - `role` : `recommande`, `ajout`, `jamais`, `sur_demande_explicite`, `hors_pack` ou `annexe` ;
  - `usage` : le nombre d'invocations avant le ménage ;
  - `risques` : présent seulement s'il y en a. Valeurs possibles : `frontmatter allowed-tools`, `shell inline (!`…`)`, `script: <fichier>`, `exécutable: <fichier>`, `plugin.json (chargé comme plugin)` ;
  - `depend_de` : les fichiers annexes à lire avec le skill.

Exemple :
`{"name":"accessibility-scan","kind":"dossier","usage":7,"risques":["frontmatter allowed-tools"],"skill_md":"<home>/.claude/skills-archive/accessibility-scan/SKILL.md","description":"…","packs":["site-web"],"role":"recommande","depend_de":["<home>/.claude/skills-archive/shared/methodology.md"]}`

## 1. Détecter le type du projet

Regarde la racine du dossier de travail, puis un niveau plus bas pour les monorepos (`apps/*`, `packages/*`). Lis les dépendances des `package.json`. Annonce en une ligne ce que tu as détecté, et d'après quels fichiers.

| Type | Détecté par |
|---|---|
| site-web | `package.json` avec next, astro, vite ou react, sans expo ni react-native ; ou un `index.html` à la racine |
| ios | `*.xcodeproj` ou `Package.swift`, sans `package.json` expo ou react-native |
| app-expo | `package.json` avec expo ou react-native, `app.json`, `eas.json` |
| android | `build.gradle(.kts)` avec Compose (`kotlin.compose`, `compose = true`) |
| video | `remotion.config.*` ou une dépendance `@remotion/*` |
| data | `*.ipynb`, ou un `pyproject.toml` / `requirements.txt` avec pandas, polars, duckdb ou numpy |
| outillage-claude-code | un `.claude-plugin/`, un `hooks/hooks.json`, des `skills/*/SKILL.md` ou un `marketplace.json`, jusqu'à 3 niveaux de profondeur |

Si plusieurs types correspondent, fusionne leurs packs : 8 recommandés au maximum, et le reste passe dans les ajouts.

## 2. Proposer

| Type | Recommandés (à charger) | Ajouts possibles | Déjà actifs, rien à charger |
|---|---|---|---|
| site-web | `bencium-controlled-ux-designer`, `react-best-practices`, `web-design-guidelines`, `composition-patterns`, `accessibility-scan` | `shadcn` (si `components.json`) ; les `gsap-*` (si gsap) ; `accessibility-audit`, `-diff`, `-fix`, `-inspect` ; `frontend` (performance, Lighthouse) ; les `cloudflare:*` (voir la règle Cloudflare) ; `brag:brag` (vidéo de lancement) | plugins figma et design |
| ios | `swiftui-skills`, `mobile-app-ui-design` | — | plugins figma, swift-lsp, design |
| app-expo | `building-native-ui`, `expo-dev-client`, `expo-deployment`, `native-data-fetching`, `expo-tailwind-setup`, `upgrading-expo`, `expo-ui` | `eas-update-insights`, `expo-cicd-workflows`, `expo-api-routes`, `expo-brownfield`, `expo-module`, `expo-observe`, `expo-examples`, `add-app-clip`, `use-dom` | plugin figma |
| android | `material-3` | — | plugin figma |
| video | `remotion-best-practices` (le routeur, qui dit quel sous-skill lire) | `remotion-create`, `-markup`, `-captions`, `-multimedia`, `-render`, `-studio`, `-docs`, `-interactivity`, `-maps`, `-saas`, `-upgrade` | — |
| data | — | — | `dataviz` (intégré) ; `xlsx`, `pdf`, `docx` (claude.ai) |
| outillage-claude-code | — | plugins `skill-creator`, `plugin-dev`, `hookify` (à installer) | `plugin-authoring`, `claude-api`, `update-config`, `workflow-authoring` (intégrés) |

Règles :
- **Figma d'abord.** Ne propose jamais `frontend-design`, `premium-frontend-ui` ni `find-skills`. Ne propose les skills de style (`ui-ux-pro-max`, `dashboard`, `industrial-brutalist-ui`, `minimalist-ui`) que si Amdy les demande.
- **Cloudflare.** Si le projet utilise `wrangler` (dépendance, `wrangler.jsonc` ou `wrangler.toml`, y compris dans `apps/*`), propose **d'office** dans les ajouts `cloudflare:wrangler`, `cloudflare:workers-best-practices` et `cloudflare:cloudflare`. Ajoute les autres `cloudflare:*` quand leur `condition` (dans le manifeste) est remplie. Le plugin est coupé : ces skills se chargent par lecture de leur `skill_md`, comme les autres. **Ne propose jamais `cloudflare:nextjs-on-cloudflare` à un projet `@opennextjs/cloudflare`** : ce skill repose sur vinext.
- **Skill introuvable.** Si un `skill_md` de `kind: plugin-coupe` n'existe plus (le plugin a changé de version), cherche-le avec `ls ~/.claude/plugins/cache/<marketplace>/<plugin>/*/skills/<skill>/SKILL.md`.
- Pour chaque skill proposé, signale en quelques mots ses `risques` d'après le manifeste.
- Présente la sélection en liste courte, puis pose **une** question avec l'outil AskUserQuestion : « Charger pour la session (recommandé) », « Charger et garder pour ce projet », « Choisir moi-même » ou « Ne rien charger ».

## 3. Charger pour la session (par défaut)

- Lis en entier le fichier `skill_md` de chaque skill choisi, d'après le manifeste. Lis aussi ses `depend_de`.
- Ensuite, applique ces instructions pour le reste de la session, comme si les skills étaient installés. Ne lis les fichiers annexes d'un skill que quand il y renvoie et que la tâche en a besoin.
- **N'exécute pas** le shell inline d'un `SKILL.md` lu (`` !`…` `` ou les blocs ```` ```! ````). Si une de ces commandes est utile, propose-la à Amdy. Le champ `allowed-tools` n'accorde ici aucune permission.
- **N'écris rien dans le projet.**
- Termine par une ligne : « Chargés pour cette session : … ». Après une compaction, si un skill chargé redevient nécessaire, relis son `SKILL.md`.

## 4. Garder pour ce projet (option)

1. Montre les `risques` des skills choisis et attends l'accord d'Amdy.
2. Copie chaque dossier dans `<racine du projet>/.claude/skills/<nom>/` avec `cp -RL`, ce qui suit les liens.
   - Pour bencium, copie seulement `skills/bencium-controlled-ux-designer/`.
   - Pour les `accessibility-*`, copie aussi `shared/` dans `.claude/skills/shared/`.
3. Retire de la copie `.claude-plugin/`, `hooks/`, `.mcp.json` et `bin/`. Ne copie jamais un mod tiers.
4. Demande à Amdy de taper `/reload-skills`, car tu ne peux pas lancer de commande intégrée.
5. Ne touche pas au `.gitignore`. S'il y a un repo git, signale que les fichiers y apparaîtront.

## 5. Conseil modèle et effort (une ligne, à la fin)

| Situation | Modèle | Effort | Ultracode |
|---|---|---|---|
| Question, petite modif | Sonnet 5.5 | low / medium | off |
| Feature standard | Opus 5.5 | medium | off |
| Problème profond sur un seul fil | Opus 5.5 | high / xhigh | off |
| Gros chantier large, multi-fichiers | Opus 5.5 | xhigh | on |

Donne la commande à taper (`/model …`, `/effort …`, `/effort ultracode on`) et une phrase qui explique pourquoi. Ne change jamais le réglage toi-même. `max` reste rare.

## Hors du périmètre de la v0

Pas de note, pas de « ne plus proposer » mémorisé, et pas de téléchargement depuis GitHub : la bibliothèque est locale. Pour un plugin à installer, donne la commande (`claude plugin install <nom>@claude-plugins-official -s project`) et laisse Amdy décider.

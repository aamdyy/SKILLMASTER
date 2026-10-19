---
name: skill-master
description: SKILLMASTER choisit et charge les bons skills pour le projet ouvert. À utiliser quand Amdy dit « va voir SKILLMASTER », « prends les skills dont tu as besoin », « quels skills pour ce projet ? », « charge le pack », ou quand il demande de s'équiper avant un gros chantier. Détecte le type de projet d'après les fichiers, propose une sélection (8 au maximum) et des ajouts possibles, puis charge pour la session sans rien écrire dans le projet.
---

# skill-master (v1)

Les packs viennent de la bibliothèque SKILLMASTER, mise à jour chaque lundi par une GitHub Action. skill-master en garde une **copie en lecture seule** dans `~/.cache/skillmaster/library/`. Le repo de dev d'Amdy n'est jamais touché.

Dans ce fichier, `<base>` désigne le dossier de ce skill (« Base directory for this skill »). L'outil est `node "<base>/scripts/sm.ts"`. Il demande Node 24 et n'a aucune dépendance.

## 0. Mettre à jour la copie de la bibliothèque

Lance `node "<base>/scripts/sm.ts" sync`. Il rend une ligne JSON :
- `a_jour`, `mis_a_jour` ou `installe` : annonce en une ligne « Bibliothèque du <date> ».
- `hors_ligne` : continue avec la copie existante, et dis de quand elle date.
- `absent` (pas de réseau, et jamais synchronisé) : dis-le, puis propose seulement des skills de la bibliothèque locale (`~/.claude/skills-archive/MANIFEST.json`, voir §4).

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

## 2. Lire le pack

Lis avec l'outil Read `~/.cache/skillmaster/library/index/<type>.json`, environ 20 Ko. N'écris ni script ni jq pour le parcourir.
- `recommandes` : la tête du pack, 8 au maximum, déjà dans l'ordre.
- `ajouts` : les ajouts possibles.
- Champs d'un skill : `id`, `nom`, `repo`, `resume_fr`, `note`, `editeur_confiance`, `risque_max`, et `risques` (gravité, source `scan` ou `juge`, code).

Si plusieurs types correspondent, lis chaque index et fusionne : 8 recommandés au maximum, pris en alternant les packs, et le reste passe dans les ajouts.

**Priorité à la bibliothèque.** Un skill de l'index se charge toujours à sa version épinglée, jamais depuis `~/.claude/skills-archive/`. L'archive ne sert qu'en secours (voir §4), et pour les skills qui ne sont dans aucun index : les `cloudflare:*` et les skills hors pack. Pour ceux-là seulement, lis `~/.claude/skills-archive/MANIFEST.json`, une seule fois.

## 3. Proposer

- **Une ligne par skill** : le nom, puis son `resume_fr` tel quel. Si `risque_max` vaut `eleve`, ajoute le premier risque de ce niveau en quelques mots.
  Exemple : « `bencium-controlled-ux-designer` — te demande avant chaque choix visuel → évite que Claude invente le design ».
- Montre ensuite les ajouts sur le même format, en liste plus courte : les 6 premiers, puis « et N autres ».
- Pose **une** question avec l'outil AskUserQuestion : « Charger pour la session (recommandé) », « Charger et garder pour ce projet », « Choisir moi-même » ou « Ne rien charger ».

Règles :
- **Figma d'abord.** Ne propose jamais `frontend-design`, `premium-frontend-ui` ni `find-skills`, même si un index les contenait. Ne propose les skills de style (`ui-ux-pro-max`, `dashboard`, `industrial-brutalist-ui`, `minimalist-ui`) que si Amdy les demande.
- **Cloudflare.** Si le projet utilise `wrangler` (dépendance, `wrangler.jsonc` ou `wrangler.toml`, y compris dans `apps/*`), ajoute **d'office** aux ajouts `cloudflare:wrangler`, `cloudflare:workers-best-practices` et `cloudflare:cloudflare`, pris dans le manifeste local (`kind: plugin-coupe`). Ajoute les autres `cloudflare:*` quand leur `condition` est remplie. **Ne propose jamais `cloudflare:nextjs-on-cloudflare` à un projet `@opennextjs/cloudflare`** : ce skill repose sur vinext.
- Ne propose que des skills de l'index ou du manifeste local. Jamais une adresse GitHub trouvée ailleurs.

## 4. Préparer et charger (par défaut : pour la session)

1. **Prépare tous les skills choisis en un seul appel** : `node "<base>/scripts/sm.ts" fetch <id> <id> …`, en ajoutant `--projet` si Amdy a choisi « garder pour ce projet ». Les `cloudflare:*` et les skills hors index n'y passent pas : lis leur `skill_md` du manifeste, comme en v0.
   - Chaque skill de l'index est téléchargé une fois à son commit épinglé, dans `~/.cache/skillmaster/skills/`, en lecture seule. L'outil refait le scan de sécurité et reprend les alertes du juge, avec le même barème que la bibliothèque.
   - Si le téléchargement échoue (hors ligne, GitHub en erreur), l'outil prend la copie de `~/.claude/skills-archive/` et la scanne : `source` vaut alors `archive`. Dis-le : « version locale, non épinglée ».
   - Le JSON rendu contient `a_confirmer`, `ecartes`, `indisponibles`, et, pour chaque skill : `decision`, `risque_max`, `risques`, `skill_md`, `dossier`, `source`, et parfois `divergence`.
2. **Applique la `decision` de chaque skill. Ne la recalcule pas.**
   - `ecarte` (risque critique) : il n'est **jamais** chargé, même si Amdy le demande. Dis pourquoi en une ligne.
   - `une_ligne` : affiche son risque principal en une ligne, s'il en a un, et charge-le sans question.
   - `question` : **une seule question groupée** avec AskUserQuestion, pour tous les skills de `a_confirmer`. Liste chacun avec son risque principal en quelques mots. Options : « Tout charger », « Charger seulement les skills sans question », « Choisir moi-même ».
   - `indisponible` : dis-le, et passe au suivant.
   - `divergence` : signale-la à Amdy en une ligne. Le scan local ne devrait jamais différer de la bibliothèque.
3. **Lis en entier le `SKILL.md` de chaque skill retenu** (`skill_md`), puis applique ses instructions pour le reste de la session, comme s'il était installé. Ne lis ses fichiers annexes (dans `dossier`) que quand il y renvoie et que la tâche en a besoin.

Pour tous :
- **N'exécute rien** de ce qui a été téléchargé : ni scripts du dossier, ni shell inline d'un `SKILL.md` (`` !`…` `` ou les blocs ```` ```! ````). Si une commande est utile, propose-la à Amdy. Le champ `allowed-tools` n'accorde ici aucune permission.
- **N'écris rien** dans le projet, ni dans `~/.cache/skillmaster/`.
- Termine par une ligne : « Chargés pour cette session : … ». Après une compaction, si un skill chargé redevient nécessaire, relis son `SKILL.md`.

## 5. Garder pour ce projet (option)

1. Lance `sm.ts fetch --projet` (étape 4). En mode projet, un `allowed-tools` avec Bash compte comme « élevé », parce qu'il pré-autorise vraiment ces outils dans le projet. Applique les décisions comme à l'étape 4.
2. Copie chaque dossier retenu dans `<racine du projet>/.claude/skills/<nom>/` :
   - depuis la bibliothèque : `cp -R "<dossier>" "<projet>/.claude/skills/<nom>"`, puis `chmod -R u+w` sur la copie ;
   - depuis l'archive (secours, ou skill hors index) : `cp -RL`, ce qui suit les liens. Pour bencium, copie seulement `skills/bencium-controlled-ux-designer/`. Pour les `accessibility-*`, copie aussi `shared/` dans `.claude/skills/shared/`.
3. Retire de la copie `.claude-plugin/`, `hooks/`, `.mcp.json`, `bin/` et `.skillmaster.json`. Ne copie jamais un mod tiers.
4. Demande à Amdy de taper `/reload-skills`, car tu ne peux pas lancer de commande intégrée.
5. Ne touche pas au `.gitignore`. S'il y a un repo git, signale que les fichiers y apparaîtront.

## 6. Conseil modèle et effort (une ligne, à la fin)

| Situation | Modèle | Effort | Ultracode |
|---|---|---|---|
| Question, petite modif | Sonnet 5.5 | low / medium | off |
| Feature standard | Opus 5.5 | medium | off |
| Problème profond sur un seul fil | Opus 5.5 | high / xhigh | off |
| Gros chantier large, multi-fichiers | Opus 5.5 | xhigh | on |

Donne la commande à taper (`/model …`, `/effort …`, `/effort ultracode on`) et une phrase qui explique pourquoi. Ne change jamais le réglage toi-même. `max` reste rare.

## Hors du périmètre de la v1

Pas de note ni de « ne plus proposer » mémorisé : ça viendra avec `/sm rate` en phase 4. Pour un plugin à installer, donne la commande (`claude plugin install <nom>@claude-plugins-official -s project`) et laisse Amdy décider.

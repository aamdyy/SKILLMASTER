# SKILLMASTER — brief projet

> Nom de travail, à renommer si besoin.
> Ce fichier est lu par Claude Code à chaque session. Il décrit le projet, ce qui est décidé et ce qui reste ouvert.

## Le problème

Amdy utilise Claude Code pour tous ses projets : sites web, apps iOS, montage vidéo avec Remotion, data. L'écosystème des skills bouge trop vite. On compte des dizaines de milliers de repos, des reels "les 5 skills pour X" et beaucoup de bruit. Il perd du temps à refaire des recherches à chaque projet.

## Ce que fait l'outil

1. **Une bibliothèque de skills vivante**, hébergée dans ce repo GitHub. Elle est triée, notée et classée par type de projet. Elle se met à jour toute seule chaque semaine : les nouveaux skills importants entrent, les skills morts ou dépassés sont archivés.
2. **Un conseiller intégré à Claude Code**, par deux chemins :
   - **dans le terminal, un mod** qui détecte le contexte quand Amdy démarre un projet ou envoie un prompt long ou complexe ;
   - **partout, y compris dans VS Code, le skill `skill-master`**. Amdy lui dit « va voir SKILLMASTER et prends les skills dont tu as besoin », et il fait la même proposition.

   Dans les deux cas, l'outil affiche :
   - la **sélection recommandée** pour le type de projet détecté sur le moment (8 skills maximum), avec une **liste d'ajouts possibles**. Chaque skill y est présenté par son `resume_fr`, une phrase de 15 mots au plus : « ce qu'il fait → ce qu'il améliore » ;
   - un **conseil modèle et effort** : par exemple « Opus 5.5 · xhigh · ultracode ON », avec une phrase qui explique pourquoi.
3. **Il propose, Amdy valide.** Rien ne s'installe ou ne se change sans accord. Toutes les commandes passent sous le préfixe `/sm` : `/sm check`, `/sm install`, `/sm clean`, `/sm rate` et `/sm status`.

## Principes non négociables

- **Moins mais mieux.** Chaque skill installé consomme du contexte, et des skills qui se contredisent dégradent le résultat. Un pack contient 8 skills au maximum.
- **Accepter = charger pour la session seulement**, sans rien écrire dans le projet. Les skills sont préparés dans un dossier de session puis chargés par `/add-dir`. Une option « garder pour ce projet » les copie dans `<projet>/.claude/skills/`. Le global se limite à un socle explicitement validé.
- **Pas de pack par projet.** Les packs sont définis par type de projet (site-web, ios, app-expo, android, video, data, outillage-claude-code…), et le type se détecte à partir des fichiers du dossier.
- **Sécurité.** Les skills tiers peuvent embarquer des scripts. Le juge signale tout script, appel réseau ou commande destructive. L'outil n'installe **jamais** de mod tiers, car les mods ne sont pas sandboxés et ont le même accès à la machine que Claude Code.
- **Pas de front-end inventé.** Amdy dessine les écrans sur Figma, puis Claude Code les code fidèlement. Si une interface est nécessaire (panneau du mod, page web de la bibliothèque), on attend ses maquettes. En attendant, on utilise un affichage minimal et neutre.
- **On réfléchit avant de coder.** À chaque phase : un plan court, les questions nécessaires, puis le code.

## Architecture visée

```
skillmaster/
├── CLAUDE.md
├── .claude-plugin/marketplace.json     # ce repo = la marketplace perso d'Amdy
├── plugins/skillmaster/                # le plugin qui contient le conseiller
│   ├── (manifest plugin)               # format exact : vérifier la doc officielle
│   ├── mods/advisor.ts                 # détecte le contexte, affiche pack + conseil modèle
│   ├── skills/skill-master/SKILL.md    # pour demander à Claude « quels skills pour ce projet ? »
│   └── commands/                       # /sm check · install · clean · rate · status
├── library/
│   ├── skills.json                     # catalogue complet (voir schéma ci-dessous)
│   ├── packs/                          # site-web, ios, app-expo, video-remotion, data, outillage-claude-code…
│   └── model-rules.json                # règles du conseil modèle/effort (éditable à la main)
├── collector/
│   ├── fetch.ts                        # GitHub Search API + listes awesome + annuaires
│   └── judge.ts                        # Claude API : classe, note, signale les risques
└── .github/workflows/weekly-scan.yml   # scan hebdo → écrit library/ directement sur main
```

### Fiche d'un skill (`skills.json`)

`id`, `repo`, `chemin_skill`, `resume_fr`, `description_courte`, `categories[]`, `stars`, `vitesse_stars_30j`, `dernier_commit`, `installs` (si dispo), `note_qualite` (0–10), `risques[]`, `statut` (`nouveau` | `en_test` | `valide` | `archive`), `remplace_par`, `retours_amdy[]`, `date_ajout`.

- `resume_fr` est écrit par le juge : une phrase en français, 15 mots au plus, au format « ce qu'il fait → ce qu'il améliore ». Par exemple : « te demande avant chaque choix visuel → évite que Claude invente le design ». Elle s'affiche **partout** où un skill est proposé à Amdy : panneau du mod, question de `skill-master`, demande de note.
- `retours_amdy[]` reçoit l'usage réel (compteurs d'invocations), les étoiles de `/sm rate` et les signaux automatiques (proposition acceptée ou refusée).

### Cycle de vie

- **nouveau** : détecté par le scan.
- **en_test** : Amdy l'a installé sur un projet.
- **valide** : au moins un bon retour, et la note dépasse le seuil.
- **archive** : plus de commit depuis 6 mois, remplacé par un meilleur skill, ou mauvais retours.
- **Étoiles et usage décident** : un skill passe en « recommandé » de son pack, ou part en archive, selon les étoiles de `/sm rate`, l'usage réel et les signaux automatiques. Seuils proposés, à confirmer en phase 4 :
  - recommandé : moyenne ≥ 4 étoiles sur au moins 3 notes ;
  - archive : moyenne ≤ 2 étoiles sur au moins 2 notes, ou deux refus de suite sans aucune utilisation.

### Le juge (coût maîtrisé)

- Il ne juge que les skills **nouveaux ou modifiés** depuis le dernier scan, jamais tout le catalogue.
- Il utilise un petit modèle et le prompt caching sur les instructions de notation.
- La clé API est stockée dans les secrets GitHub (`ANTHROPIC_API_KEY`). Amdy l'ajoute lui-même, et elle n'apparaît jamais dans le code.
- Le scan hebdo écrit **directement sur `main`**, sans PR (décision du 2026-10-18). Le garde-fou reste à l'installation : rien n'entre dans un projet sans `/sm install` et l'accord d'Amdy.

### Le conseiller : quand se déclencher

Il se déclenche si au moins une de ces conditions est vraie (seuils réglables) :
- le prompt est long (au-delà de N caractères) ;
- le prompt contient des mots-clés de projet (site, landing, app, refonte, montage, dashboard…) ;
- c'est un nouveau projet (pas de `CLAUDE.md`, dossier quasi vide) ;
- l'utilisateur appelle `/sm`.

Pour détecter le type de projet, il regarde les fichiers présents (`package.json` avec next/astro/vite, `*.xcodeproj` ou `Package.swift`, `remotion.config.*`, notebooks…) et les mots du prompt.

### Règles de départ du conseil modèle (`model-rules.json`)

| Situation | Modèle | Effort | Ultracode |
|---|---|---|---|
| Question, petite modif | Sonnet 5.5 | low / medium | off |
| Feature standard | Opus 5.5 | medium (défaut) | off |
| Problème profond sur un seul fil (archi, bug coriace) | Opus 5.5 | high / xhigh | off |
| Gros projet large, multi-fichiers (site complet, refonte) | Opus 5.5 | xhigh | **on** |
| `max` | rarement, car coûteux pour un gain souvent faible | — | — |

Rappels utiles : les cinq niveaux d'effort sont low, medium, high, xhigh et max. **Ultracode** est un toggle séparé. Il sert à la **largeur** du travail (travail parallèle), pas à la difficulté. `max` et `ultracode` ne valent que pour la session. Ces règles vivent dans un JSON pour qu'Amdy puisse les ajuster sans toucher au code.

## Points à vérifier en phase 0 (avant toute ligne de code)

1. Lire la doc officielle des mods (code.claude.com, rubrique mods/plugins) et les exemples du repo Claude Code Playground. En déduire le format exact du plugin et du mod, ainsi que les événements disponibles.
2. **Compatibilité VS Code** : les mods sont annoncés pour la CLI et l'app desktop. Vérifier s'ils marchent dans le panneau de l'extension VS Code. Sinon, on lance `claude` dans le **terminal intégré** de VS Code.
3. Vérifier si un mod peut **changer le modèle ou l'effort lui-même**, ou seulement le suggérer. Par défaut, on suggère et Amdy applique avec `/model` et `/effort`.
4. Vérifier que la version de Claude Code est assez récente pour supporter les mods (`claude update`).

Livrable de la phase 0 : un court rapport « ce qui est faisable / pas faisable / plan ajusté », **avant de coder**.

## Phases

- **Phase 0** : vérifications ci-dessus et rapport. Faite le 2026-10-18 : voir `docs/local/phase-0-rapport.md`.
- **Phase 1** :
  - **Étape 0 : mod de test** (`experiments/sm-smoke/`), lancé dans le panneau VS Code et dans le terminal. Il tranche ce qui s'affiche vraiment et ce qu'un mod peut lire ou déclencher.
  - **Étape 1 : ménage des skills globaux.** On définit un socle global de 10 skills maximum, et le reste est réparti en packs par projet (proposition : `docs/local/phase-1-menage-skills.md`). Amdy valide avant tout déplacement.
  - **Étape 2 :** collecteur et juge lancés une première fois à la main (plan : `docs/phase-1-etape2-plan-collecteur-juge.md`). Premier `skills.json` et packs par type. Amdy relit les notes et les packs.
- **Phase 2** : le mod conseiller, le skill `skill-master` et les commandes `/sm`. Test sur un vrai projet.
- **Phase 3** : GitHub Action hebdomadaire, cycle de vie automatique, mise à jour écrite directement sur `main`.
- **Phase 4** : boucle de retours qui influence les notes. `/sm rate` demande une note sur 5 étoiles en fin de session, pour 3 skills au plus, réellement utilisés pendant la session, et les signaux automatiques comptent aussi. Page web de la bibliothèque (GitHub Pages) **à partir des maquettes Figma d'Amdy**.

## Décisions prises

- 2026-10-18 : **repo privé** pour l'instant. GitHub Pages se décidera en phase 4 : il faudra Pro ou un repo public.
- 2026-10-18 : la mise à jour hebdo **écrit directement sur `main`**, sans PR.
- 2026-10-18 : toutes les commandes passent sous **`/sm`** (`check`, `install`, `clean`, `rate`, `status`). « Ignorer un skill » est une option de `/sm check`.
- 2026-10-18 : règle **« Figma d'abord »**. Aucun skill du pack site-web ne fait de choix visuels à la place d'Amdy : `bencium-controlled-ux-designer` entre dans le pack, `frontend-design` est archivé.
- 2026-10-18 : **packs par type**, sans affectation par projet : site-web, ios, app-expo (en réserve), android, video, data, outillage-claude-code. La sélection se fait en direct (mod dans le terminal, `skill-master` partout). Détail : `docs/local/phase-1-menage-skills.md`.
- 2026-10-18 : « accepter » charge les skills **pour la session**, avec une option « garder pour ce projet ». Dans le terminal, ça passe par `/add-dir` sur un dossier de session. Dans VS Code, où `/add-dir` n'existe pas, `skill-master` v0 lit directement le `SKILL.md`. Pour la phase 2, on propose un outil enregistré par le mod (`$.tool.register`), en attente de validation par Amdy.
- 2026-10-18 : **bibliothèque locale** : `~/.claude/skills-archive/` et son `MANIFEST.json`, dont le format est documenté dans `skill-master`. Il y a une entrée par skill, et les skills des plugins désactivés y figurent en `plugin-coupe`, lus depuis le cache des plugins.
- 2026-10-18 : **socle global** = `skill-master` v0 seul, un lien depuis `~/.claude/skills/` vers `plugins/skillmaster/skills/skill-master/`. **Ce lien est à retirer quand le plugin sera installé**, sinon le skill se chargera deux fois.
- 2026-10-18 : résultats du mod de test. Dans VS Code, les hooks, `/sm`, le Pane et le dialogue marchent, et la surface s'attache après `session.start`. Un mod ne peut pas lancer une commande depuis le hook de sa propre commande : il faut passer par un événement suivant (`turn.complete`). `CLAUDE_CODE_PLUGIN_DIRS` ne se lit que dans l'environnement ou dans `~/.claude/settings.json`, jamais dans les réglages d'un projet.
- 2026-10-18 : collecteur et juge, premier lancement. Le juge passe par `claude -p --model haiku` sur l'abonnement d'Amdy ; la clé API dédiée (workspace et plafond de dépense) attendra la phase 3. Seuils : au moins 20 étoiles, un push de moins de 6 mois, 300 à 500 skills jugés. L'annuaire non documenté d'Anthropic est une option désactivée par défaut.
- 2026-10-18 : **pas de notes manuelles.** Amdy ne lit pas les skills, donc il ne les note pas. Le calibrage du juge se fait avec ses **compteurs d'invocations** : ses skills les plus utilisés doivent finir en haut de leur pack. On le vérifie avec `node collector/calibrate.ts --avant <commit>`, qui donne la place de chaque skill avant et après, et son rang d'après la seule note du juge, sans le bonus d'usage.
- 2026-10-18 : **`/sm rate`** (remplace le 👍/👎 envisagé d'abord).
  - Une note **sur 5 étoiles**, demandée en fin de session, et seulement pour les skills **réellement utilisés** pendant la session (repérés par l'événement `skill.prompt` ou par un chargement via `skill-master`), **3 au plus** par session. La demande affiche le `resume_fr` de chaque skill.
  - Les **signaux automatiques** comptent aussi : une proposition acceptée compte en +, deux refus de suite comptent en −.
  - Étoiles et usage décident ensuite d'archiver un skill ou de le passer en « recommandé » (seuils dans « Cycle de vie »).
- 2026-10-18 : **`resume_fr`** pour chaque skill, écrit par le juge en troisième temps :
  - Sonnet pour les finalistes de chaque pack, Haiku pour les autres, avec un cache séparé (`collector/resume.ts`) ;
  - la bibliothèque locale (`~/.claude/skills-archive/MANIFEST.json`) le reçoit aussi, pour que `skill-master` l'affiche dès la v0.
- 2026-10-18 : **juge v2.**
  - La note est la somme de 5 sous-notes de 0 à 2. Le juge lit aussi les annexes du skill, et la règle Figma n'influence pas la note (elle passe par le drapeau seul).
  - Les réserves de qualité sont séparées des risques de sécurité. Le scan tient compte des blocs de code et des mises en garde.
  - Les types sont stricts : le juge doit être d'accord avec la détection, et Expo ou React Native n'entrent jamais dans ios ni android.
  - Le jugement se fait en deux temps : Haiku sur tout, puis Sonnet sur les finalistes de chaque pack.
  - Note finale = note du juge + bonus d'usage (+0,5, +1 ou +1,5, consigné dans `retours_amdy`).
  - « Recommandé » se décide par pack : les 5 à 8 meilleurs, note ≥ 6. Les épinglages et les exclusions sont dans `library/overrides.json`, où bencium est épinglé en site-web.
- 2026-10-19 : **juge v3.1.** Haiku seul pour noter. Pour chaque pack, Sonnet range les finalistes entre eux, sans note absolue ni ex-aequo, en 3 tirages, et l'ordre final se fait au rang moyen. Il y a un seul type principal par skill, et `outillage-claude-code` couvre tout ce qui sert à « construire avec Claude ». La pertinence vient de `library/profil.json` (types, stack, domaines hors sujet) et se calcule sur le nom et la description.
- 2026-10-19 : **critère de montée en volume** : ce qui compte, c'est la **composition** des têtes de pack, pas leur ordre exact, puisque `skill-master` les propose comme un ensemble. On monte en volume si les mêmes skills sont en tête sur au moins 6 packs sur 7 entre deux séries. C'était 7 sur 7 en v3.1. La montée est progressive : environ 1 500 skills au tour suivant.
- 2026-10-19 : **finale élargie et stack stricte.**
  - La finale compte 25 skills par pack au plus : les épinglés, les tenants, les skills qu'Amdy a utilisés au moins 5 fois, puis les meilleurs dont la pertinence est d'au moins 6.
  - `library/profil.json` liste des **exclusions** : Vue/Nuxt, Svelte, Angular, BigQuery, Databricks, Snowflake, Spark, et toute techno de data warehouse cloud. Elles mettent la pertinence à 0, et Sonnet écarte tout skill lié à une techno absente de la stack, même s'il est excellent. « SQL » veut dire SQL généraliste.
- 2026-10-19 : **avantage au tenant** (vaut aussi pour la mise à jour hebdomadaire). Les têtes de pack du tour précédent gardent leur place, sauf si Sonnet juge le challenger nettement meilleur, ou si le tenant est écarté. Il y a **2 changements au plus par pack et par tour**, retenus à la majorité des 3 tirages, et chacun est listé avec sa raison dans le fichier du pack (`changements`).
- 2026-10-19 : **le collecteur garde toujours les skills des packs du tour précédent** (têtes et ajouts, `--keep-from <commit>` ou `library/packs`). Il lit leurs chemins en premier et leur donne priorité sur leurs copies à la déduplication. Sans ça, l'avantage au tenant n'a pas de sens.
- 2026-10-19 : **coût réel affiché.** Un verdict en cache compte pour 0 $. Tour complet de 1 500 skills sans changement : 0,66 $ en équivalent, presque tout pour les 21 classements Sonnet. Les notes Haiku et les résumés ne coûtent que pour les skills nouveaux ou modifiés.
- 2026-10-19 : **ajout SEO garanti en site-web** (`ajout_garanti` dans `library/overrides.json`) : le meilleur skill SEO hors tête reste en ajout, parce qu'Amdy fait aussi des sites clients où le SEO compte.
- 2026-10-19 : `web-design-guidelines` est épinglé en « ajout » du pack site-web (`epingles_ajout` dans `library/overrides.json`).
- 2026-10-19 : **phase 3 écrite** (`.github/workflows/weekly-scan.yml`, `collector/publish.ts`).
  - **Cycle de vie au niveau du dépôt :** un skill passe en archive quand il disparaît du tour (dépôt archivé, sans push depuis 6 mois, ou sous le seuil) alors qu'il était dans un pack ou avait des retours. Un vieux dossier dans un dépôt vivant n'est pas archivé.
  - **`library/` sert de cache durable :** verdicts et résumés repris par hash. Un pack dont la finale n'a pas changé garde sa tête sans appel à Sonnet. Une semaine sans nouveauté coûte 0 $.
  - **`skill-master` lira `library/index/<type>.json`** (environ 11 Ko par type), pas `skills.json`.
- 2026-10-19 : **premier tour de l'Action** (0,70 $, 3 têtes changées). Suites décidées par Amdy :
  - `library/profil.json` exclut le **calcul distribué** (Dask, Ray, Spark) et ajoute **DuckDB** (SQL local) à la stack data ;
  - un skill de la liste « jamais » est archivé avec cette raison-là ;
  - le runner est épinglé sur `ubuntu-24.04`.
  - Pendant la phase 3, les correctifs nécessaires pour que le workflow tourne se commitent et se poussent sans demander. Tout le reste se demande.
- 2026-10-19 : **`skill-master` v1.** Il lit les packs dans `library/index/<type>.json` et non plus dans une table écrite à la main. Son outil `scripts/sm.ts` fait deux choses :
  - `sync` garde une copie en lecture seule de `library/` dans `~/.cache/skillmaster/library/`, téléchargée seulement quand `library/` a changé sur `main` ;
  - `fetch <id>` télécharge un skill des packs au commit épinglé dans `~/.cache/skillmaster/skills/`, en lecture seule, sans liens, sans binaires et sans fichier de plus de 1 Mo, puis refait le scan de sécurité. Un risque élevé ou critique attend l'accord d'Amdy.

  Le scanner vit dans le plugin (`scripts/scan.ts`), pour que la CI et le Mac fassent le même scan. `collector/scan.ts` le réexporte. Un skill déjà présent dans `~/.claude/skills-archive/` se charge depuis le disque.
- 2026-10-19 : **barème de risque b1, partagé** par l'index et le scan local (`scripts/scan.ts`).
  - **Critique** : toujours écarté.
  - **Élevé** : ce qui peut agir, c'est-à-dire scripts que le `SKILL.md` demande de lancer, hooks, `plugin.json`, `.mcp.json`, binaires, et alertes du juge classées réseau, exécution ou destruction.
  - **`allowed-tools`** : « info » en session, « élevé » avec Bash quand le skill est gardé pour le projet.
  - **Alertes du juge** : classées par Haiku (`collector/classify.ts`), une seule fois par alerte identique dans un même dépôt.
  - **Éditeurs de confiance** (`library/profil.json`) : à version épinglée et sans risque critique, risque affiché en une ligne, sans question. Les autres passent par **une seule question groupée par proposition**. Amdy valide lui-même chaque ajout à cette liste.
  - **Priorité à la bibliothèque** : un skill de l'index se charge à sa version épinglée. `~/.claude/skills-archive/` ne sert qu'en secours ou pour les skills hors index.
- 2026-10-19 : **la version de l'éditeur d'origine gagne toujours la déduplication.** L'ordre de priorité est : officiel `anthropics/`, puis éditeur de confiance, puis dépôt de référence, puis le dépôt le plus ancien. Les dépôts officiels et ceux des éditeurs de confiance sont lus en entier. Quand une copie occupait une place de pack, l'original reprend sa place de tenant et son usage, et la copie est archivée avec la raison « copie de … ». Cas qui a révélé le problème : `xlsx` venait de `eigent-ai/eigent` au lieu de `anthropics/skills`.
  - **Contenu tiers hébergé chez Anthropic** (`anthropics/claude-plugins-community` et les `external_plugins/` de `claude-plugins-official`) : jamais « officiel » ni « éditeur de confiance ». La règle est dans `scripts/scan.ts`, partagée par le collecteur et skill-master.
- Les changements faits sur la machine d'Amdy (réglages, sauvegardes, ménage) sont tenus dans `docs/local/journal-machine.md`. `docs/local/` n'est pas versionné.

## Idées pour plus tard

- **Classer les skills par type avec un modèle de décisions typées** (Laya en local, ou Jev par API), à partir du nom et de la description seulement.
  - **Condition :** à tester seulement si le classement par Haiku reste instable après la v3.1.
  - **Avant d'adopter :** le mesurer contre Haiku sur une centaine de skills.

## Décisions encore ouvertes

- Publier l'outil plus tard (repo public, contenu pour sa chaîne) ?
- Packs supplémentaires à créer après les 3 premiers.

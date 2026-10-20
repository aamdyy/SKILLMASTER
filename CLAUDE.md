# SKILLMASTER — brief projet

> Nom de travail, à renommer si besoin.
> Ce fichier est lu par Claude Code à chaque session. Il décrit le projet, ce qui est décidé et ce qui reste ouvert.

## Le problème

Amdy utilise Claude Code pour tous ses projets : sites web, apps iOS, montage vidéo avec Remotion, data. L'écosystème des skills bouge trop vite. On compte des dizaines de milliers de repos, des reels "les 5 skills pour X" et beaucoup de bruit. Il perd du temps à refaire des recherches à chaque projet.

## Ce que fait l'outil

1. **Une bibliothèque de skills vivante**, hébergée dans ce repo GitHub. Elle est triée, notée et classée par type de projet. Elle se met à jour toute seule chaque semaine : les nouveaux skills importants entrent, les skills morts ou dépassés sont archivés.
2. **Un conseiller intégré à Claude Code**, par deux chemins :
   - **un mod**, dans le terminal comme dans le panneau VS Code, qui détecte le contexte quand Amdy démarre un projet ou envoie un prompt long ou complexe ;
   - **partout, y compris dans VS Code, le skill `skill-master`**. Amdy lui dit « va voir SKILLMASTER et prends les skills dont tu as besoin », et il fait la même proposition.

   Dans les deux cas, l'outil affiche :
   - la **sélection recommandée** pour le type de projet détecté sur le moment (8 skills maximum), avec une **liste d'ajouts possibles**. Chaque skill y est présenté par son `resume_fr`, une phrase de 15 mots au plus : « ce qu'il fait → ce qu'il améliore » ;
   - un **conseil modèle et effort** : par exemple « Opus 5.5 · xhigh · ultracode ON », avec une phrase qui explique pourquoi. Il est affiché seulement : Amdy tape lui-même `/model` ou `/effort`.
3. **Il propose, Amdy valide.** Rien ne s'installe ou ne se change sans accord. Toutes les commandes passent sous le préfixe `/sm` : `/sm check`, `/sm install`, `/sm clean`, `/sm status`, `/sm prompt` et, en phase 4, `/sm rate`.

## Principes non négociables

- **Moins mais mieux.** Chaque skill installé consomme du contexte, et des skills qui se contredisent dégradent le résultat. Un pack contient 8 skills au maximum.
- **Accepter = charger pour la session seulement**, sans rien écrire dans le projet. Les skills sont téléchargés à leur version épinglée dans `~/.cache/skillmaster/`, puis servis par l'outil du mod (`mcp__skillmaster__skill`). Une option « garder pour ce projet » les copie dans `<projet>/.claude/skills/`. Le global se limite à un socle explicitement validé.
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
│   ├── .claude-plugin/plugin.json      # nom, version, userConfig (auto, seuil, mots)
│   ├── hooks/register.tsx              # le mod : déclenchement, panneau, dialogue, /sm, outil
│   ├── hooks/lib/                      # détection, packs, conseil, mise en page du panneau
│   ├── detection.json                  # règles de détection du type (la référence)
│   ├── model-rules.json                # règles du conseil modèle/effort (éditable à la main)
│   ├── types/index.d.ts · tests/       # contrat de $.state, tests de claude plugin test
│   └── skills/skill-master/            # SKILL.md + scripts/sm.ts (sync, fetch) et scan.ts
├── library/
│   ├── skills.json                     # catalogue complet (voir schéma ci-dessous)
│   ├── packs/ · index/                 # site-web, ios, app-expo, android, video, data, outillage-claude-code
│   └── i18n/en.json                    # traductions anglaises des textes affichés par le site
├── collector/
│   ├── fetch.ts                        # GitHub Search API + listes awesome + annuaires
│   ├── judge.ts                        # Claude API : classe, note, signale les risques
│   └── translate.ts                    # version anglaise : traduit les textes nouveaux ou modifiés
├── site/                               # site de la bibliothèque (Next.js statique), en français et en anglais (/en/)
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

Il se déclenche **une seule fois par conversation** (remis à zéro par `/clear`) si au moins une de ces conditions est vraie (seuils réglables dans `/config`) :
- le prompt tapé fait au moins 400 caractères ;
- le prompt contient un mot de projet, compté en mot entier (site, landing, app, refonte, montage, vidéo, dashboard, data, notebook, plugin, mod) ;
- c'est un nouveau projet (pas de `CLAUDE.md`, dossier quasi vide) ;
- l'utilisateur appelle `/sm check`.

Pour détecter le type de projet, il applique `plugins/skillmaster/detection.json` aux fichiers du dossier, et lit séparément les mots du prompt. Si le prompt désigne un type que le dossier n'a pas, le panneau montre les deux packs et Amdy choisit.

### Règles de départ du conseil modèle (`plugins/skillmaster/model-rules.json`)

| Situation | Modèle | Effort | Ultracode |
|---|---|---|---|
| Question, petite modif (200 caractères au plus) | Sonnet 5.5 | low / medium | off |
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
- **Phase 2** : le mod conseiller, le skill `skill-master` et les commandes `/sm`. Faite le 2026-10-20 : voir `docs/phase-2-plan.md`.
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
- 2026-10-19 : **site de la bibliothèque** (`site/`, Next.js en export statique, déployé sur Vercel). Il lit `library/` au build, en lecture seule, et n'affiche ni l'usage réel d'Amdy ni `profil.json`.
  - **DA définitive** (Amdy s'y tient), dans l'esprit de hyperstudio.org, sans en reprendre ni textes, ni visuels, ni logo, ni composition :
    - fond presque noir, filets fins et cadres techniques (croix aux angles, repères au milieu des côtés, légendes sur le filet) ;
    - étiquettes de section façon code (`// PACKS`), navigation et boutons en majuscules mono ;
    - titres en Geist Sans droite, données et identifiants en Geist Mono ;
    - bouton principal en métal clair, secondaire sombre. L'accent vert ne sert qu'aux étiquettes, au logo et au focus.
  - **Visuel du hero** : les deux mains de *La Création d'Adam* (Michel-Ange, domaine public), dans notre propre rendu en trame, losanges et points. Elles sont calculées par `site/scripts/hands.mjs` à partir de la fresque, qui reste hors du repo. Amdy a choisi ce visuel en connaissant sa proximité avec la référence.
  - **Contenu** :
    - la pastille d'info en haut du hero ;
    - la construction « skill + type de projet = pack » ;
    - le pipeline en étapes 01 → 04 (Collecte, Jugement, Classement, Publication).
  - **Pages** : accueil, `packs/<type>`, une fiche par skill (`skills/<id>`, sans segment qui commence par un point), `/skills` filtrable par nom et par type, `changements` et la 404.
  - **Sombre uniquement.** Le badge « confiance » est neutre (un bouclier).
  - **Motion discrète** :
    - apparition au scroll, compteurs qui démarrent une fois visibles, survol ;
    - la transition `ViewTransition` du nom d'un skill, de la ligne du pack jusqu'au titre de sa fiche.

    Tout est coupé avec `prefers-reduced-motion`.
  - **Données ajoutées par `publish.ts`** pour le site : `library/history/recap-AAAA-MM-JJ.md` et `last-run.json`. L'Action appelle le deploy hook Vercel (secret `VERCEL_DEPLOY_HOOK`) après chaque tour.
- 2026-10-20 : **phase 2 livrée** (plugin `skillmaster` 0.2.0, testé dans le terminal et dans le panneau VS Code).
  - **Charger pour la session** passe par l'outil du mod, `mcp__skillmaster__skill`, qui rend le `SKILL.md` puis ses annexes à la demande, sans sortir du dossier du skill. Une section du prompt système liste les skills chargés : sans elle, Claude n'appelait pas l'outil. Téléchargement, scan et décision passent par `skill-master/scripts/sm.ts`.
  - **Dialogue natif à 4 options** (limite de Claude Code) : charger pour la session, garder pour ce projet, choisir moi-même, ne plus proposer dans ce projet. « Ne rien charger », c'est Échap. Dans `/sm check`, la 4ᵉ option est « Ne rien charger », ou « Reprendre la proposition auto ici » quand elle est coupée.
  - **« Choisir moi-même »** : le panneau montre chaque skill avec son `resume_fr` complet, et Amdy tape les numéros dans le champ libre (« 1 3 12 », « 2-5 »).
  - **Prompt retenu** : il revient dans la saisie après le choix, et une copie reste dans `$.store`. Il n'est jamais réécrit dans la saisie sans demande ; `/sm prompt` le rend, même après `/clear`. Échap ou une erreur du mod : il part tel quel.
  - **Conseil modèle et effort affiché seulement**, sans pré-remplir `/model` ni `/effort` : ces commandes deviennent les réglages par défaut d'Amdy pour les nouvelles sessions.
  - **Prompt et dossier en désaccord** (« site vitrine » dans SKILLMASTER) : le panneau montre les deux packs, Amdy choisit celui du prompt, celui du dossier ou les deux.
  - **`/clear`** ouvre une nouvelle conversation : l'outil est vidé, le panneau fermé, et une nouvelle proposition devient possible.
  - **Détection** : `detection.json` est la référence ; le tableau de `skill-master` et la page Pack du site en reprennent le texte. Les dossiers cachés (`.claude/`, `.agents/`) ne comptent pas.
  - **Tests restés ouverts en phase 1** : `/add-dir` charge bien un skill dans le terminal ; `/reload-skills` part seul s'il est lancé juste après la commande (minuterie) ; l'outil est appelé par Claude de lui-même.
  - **Installation** : depuis la marketplace `aamdyy/SKILLMASTER`. Le lien `~/.claude/skills/skill-master` est retiré le même jour : le skill vient désormais du plugin.
- 2026-10-20 : **teaser vidéo v2** (sources dans `docs/local/video/`, non versionnées). Canvas déterministe rendu image par image, 26,7 s, muet. Du mouvement partout (aucune image figée plus de 0,4 s, vérifié par `freezedetect`), transitions variées, flou de mouvement par sous-images. **Pas de voix off** : Piper et Kokoro sonnaient trop robotiques en français, et Amdy a écarté les voix payantes. Sur le site, la vidéo (4 Mo, H.264) a sa section sous le hero, et s'ouvre une fois en fenêtre à la première visite de l'accueil (mémoire dans le navigateur du visiteur). Elle ne joue que visible, jamais avec `prefers-reduced-motion`, avec un bouton pause.
- 2026-10-20 : **site en anglais** sous `/en/` (`/en/changes/`, `/en/install/`), avec un sélecteur FR / EN et les balises `hreflang`. Chaque langue a son layout racine (groupes `(fr)` et `(en)`), la 404 est commune et bilingue (`global-not-found`).
  - **Tout le contenu est traduit** : résumés, jugements, réserves, alertes, raisons, critères de détection. `collector/translate.ts` (Haiku, par lots) écrit `library/i18n/en.json`, indexé par l'empreinte du texte français. Seuls les textes nouveaux ou modifiés sont traduits : c'est une étape de l'Action, après le récapitulatif, qui ne bloque pas la publication si elle échoue. Sans traduction, le site garde le français.
  - Premier passage le 2026-10-20 : 9 618 textes en 14 min, sur l'abonnement d'Amdy (1,46 $ en équivalent).
- 2026-10-20 : **page Installation** (`/installation/`, `/en/install/`) : prérequis, marketplace, premier `/sm check`, commandes, réglages, sécurité, mise à jour et désinstallation.
- 2026-10-20 : **le dépôt passe en public** (décision d'Amdy ; il change lui-même la visibilité), pour que la marketplace et la synchronisation de la bibliothèque marchent pour tout le monde. Aucun secret versionné (fichiers et historique vérifiés). Deviennent visibles : l'e-mail des commits, l'usage réel d'Amdy (`retours_amdy`, `bonus_usage` de 9 skills), `profil.json`, ce brief et les plans de `docs/`.
- Les changements faits sur la machine d'Amdy (réglages, sauvegardes, ménage) sont tenus dans `docs/local/journal-machine.md`. `docs/local/` n'est pas versionné.

## Idées pour plus tard

- **Classer les skills par type avec un modèle de décisions typées** (Laya en local, ou Jev par API), à partir du nom et de la description seulement.
  - **Condition :** à tester seulement si le classement par Haiku reste instable après la v3.1.
  - **Avant d'adopter :** le mesurer contre Haiku sur une centaine de skills.

- **Nombre d'installations des skills** (écarté le 2026-10-20).
  - **Seule source fiable et autorisée** : l'API officielle de skills.sh (`GET /api/v1/skills?source=<owner>/<repo>`), une requête par dépôt, soit environ 400 par semaine.
  - **Limite** : le chiffre ne compte que les installations faites par `npx skills`.
  - **Pourquoi c'est écarté** : l'API exige un jeton OIDC Vercel, donc un `VERCEL_TOKEN` qui, sur l'offre Hobby, donne accès à tout le compte Vercel. C'est trop de risque pour un chiffre partiel.
  - **Condition pour reprendre** : que skills.sh propose une clé publique en lecture seule, ou un accès limité à un seul projet. Le champ `installs` de `skills.json` est déjà prévu.

## Décisions encore ouvertes

- Contenu pour sa chaîne à partir de l'outil ?
- Packs supplémentaires à créer après les 3 premiers.

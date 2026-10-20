# Phase 2 — le mod conseiller : plan

> 2026-10-20. Plan validé par Amdy, puis **livré le jour même** (plugin `skillmaster` 0.2.0) : les écarts et les corrections décidés après les tests sont en fin de document.
> Sources : `docs/local/phase-0-rapport.md`, `docs/local/phase-1-etape0-resultats.md` et le mod de test `experiments/sm-smoke/`.

## Ce que fait le mod

1. **Se déclenche seul**, au plus une fois par conversation (remis à zéro par `/clear`) :
   - **nouveau projet** : un dossier sans `CLAUDE.md` et presque vide. Le déclenchement se fait sur `session.attach` dans VS Code, où la surface arrive après `session.start`, et sur `session.start` dans le terminal. Si les fichiers ne révèlent aucun type, ou si le panneau ne peut pas s'ouvrir seul (terminal de moins de 144 colonnes), c'est le premier prompt qui décide, quelle que soit sa longueur ;
   - **prompt tapé** (`prompt.submit`, origine `composer`, hors commande) qui dépasse N caractères ou contient un mot de projet. N et la liste de mots sont réglables (`userConfig`).
2. **Affiche le panneau** dans un Pane, avec :
   - le type détecté et ce qui l'a révélé. Si le prompt désigne un type que le dossier n'a pas, le panneau montre d'abord les deux packs, et Amdy choisit celui du prompt, celui du dossier ou les deux ;
   - la tête du pack (nom et `resume_fr`) et les ajouts ;
   - le conseil modèle et effort, avec sa raison en une ligne.
3. **Fait choisir** par le dialogue natif (`$.ui.ask`, 4 options au plus) : « Charger pour la session (recommandé) », « Garder pour ce projet », « Choisir moi-même », « Ne plus proposer dans ce projet ». Échap ne charge rien. « Choisir moi-même » affiche chaque skill avec son `resume_fr` complet, et Amdy tape les numéros dans le champ libre.
4. **Affiche le conseil modèle et effort**, avec la commande à taper, sans rien pré-remplir : `/model` et `/effort` deviennent les réglages par défaut pour les nouvelles sessions.
5. **Charge les skills par son outil**, `$.tool.register`, vu par Claude comme `mcp__skillmaster__skill`.
   - **La description de l'outil** liste les skills acceptés (nom et `resume_fr`), et une section du prompt système les présente comme la liste native des skills. Sans cette section, Claude n'appelait pas l'outil. Il l'appelle quand il en a besoin, et l'outil rend le `SKILL.md`, puis une annexe sur demande, sans jamais sortir du dossier du skill.
   - **Les mêmes garanties que skill-master v1** : l'outil passe par `scripts/sm.ts`. On y retrouve la version épinglée, le scan local, le barème b1, les éditeurs de confiance, la question groupée et l'exclusion du critique.
6. **Commandes `/sm`**, une seule commande enregistrée par le mod, sous-commande en argument :
   - `/sm check` : relance la détection et rouvre le panneau. L'option « ignorer ce skill » est mémorisée dans `$.store`.
   - `/sm install <nom>…` : télécharge au commit épinglé, scanne et demande l'accord, puis copie dans `<projet>/.claude/skills/` en retirant `.claude-plugin/`, `hooks/`, `.mcp.json` et `bin/`. Il met ensuite `/reload-skills` en file depuis `turn.complete`, puisqu'une commande ne peut pas en lancer une autre depuis son propre hook.
   - `/sm clean` : liste ce qu'il a chargé pour la session et copié dans le projet (repéré par `.skillmaster.json`). Il retire ce que tu choisis en le **déplaçant** dans `~/.cache/skillmaster/corbeille/<date>/`, ce qui est réversible et ne supprime jamais rien.
   - `/sm status` : bibliothèque (date, commit), type détecté, skills de la session et du projet, budget de contexte des skills (`$.session.usage`) et prompt retenu.
   - `/sm prompt` : remet le prompt retenu dans la saisie.
   - `/sm rate` attendra la phase 4.

## Structure

```text
.claude-plugin/marketplace.json        # ce repo = la marketplace d'Amdy → ./plugins/skillmaster
plugins/skillmaster/
├── .claude-plugin/plugin.json         # nom, version, userConfig (auto, seuil, mots)
├── hooks/hooks.json                   # { "modules": ["./register.tsx"] }
├── hooks/register.tsx                 # événements, /sm, Pane, dialogue, outil, section du prompt système
├── hooks/lib/detect.ts                # type de projet, par le dossier et par le prompt (detection.json)
├── hooks/lib/library.ts               # tête du pack et ajouts, à partir de ~/.cache/skillmaster/library/index
├── hooks/lib/advice.ts                # conseil modèle et effort (model-rules.json)
├── hooks/lib/panel.ts                 # le panneau B, en lignes (vues pack, choix, conflit)
├── hooks/lib/words.ts                 # mots entiers, sans tenir compte des accents
├── detection.json                     # règles de détection lisibles par la machine
├── model-rules.json                   # règles du conseil, éditables à la main
├── types/index.d.ts                   # contrat de $.state
├── tests/                             # 20 tests (claude plugin test)
└── skills/skill-master/               # scripts/sm.ts et scan.ts réutilisés tels quels
```

- **Installation** : `claude plugin marketplace add aamdyy/SKILLMASTER`, puis `claude plugin install skillmaster@skillmaster`, sans `CLAUDE_CODE_PLUGIN_DIRS`. Ensuite, retirer le lien `~/.claude/skills/skill-master`, sinon le skill se charge deux fois. Les mises à jour se font avec `/plugin update`, et `version` de `plugin.json` augmente à chaque livraison.
- **Le mod appelle `sm.ts`** par `$.process.run(['node', …/sm.ts, 'sync' | 'fetch', …])`. Node 24 est requis, comme pour skill-master.
- **`detection.json`** devient la référence des règles. Le tableau en prose de `SKILL.md` et la lecture du site seront alignés dessus.

## Décisions d'Amdy (2026-10-20)

1. **Panneau B (tableau compact)** : une ligne par skill, avec le numéro, le nom (coupé à 22 caractères) et **seulement la partie du `resume_fr` après la flèche**, c'est-à-dire ce que le skill améliore. Elle est coupée avec « … » pour tenir dans 60 colonnes. Le résumé complet s'affiche avec « Choisir moi-même ». Sous la liste viennent :
   - la légende des marques (◆ épinglé, ✓ confiance, ● risque élevé) ;
   - les ajouts ;
   - le conseil modèle et effort, avec sa raison en une ligne, et la mention de la commande prête dans la saisie.

   ```text
   // SKILLMASTER · SITE WEB                    next · tailwind
   ────────────────────────────────────────────────────────────
   01 bencium-controlled-ux…   évite que Claude invente le design
   02 modern-web-guidance      évite les API obsolètes
   03 vercel-react-best-pra…   pages plus rapides, moins de re-…
   04 a11y-debugging           repère contrastes, focus clavier…
   …
   ────────────────────────────────────────────────────────────
   ◆ épinglé 01 · ✓ confiance 03 06 · ● risque élevé 02 07 08
   + 12 ajouts : web-design-guidelines, nextjs-developer, …
   ────────────────────────────────────────────────────────────
   OPUS 5.5 · HIGH · ultracode off
   multi-fichiers mais page par page : la profondeur d'abord
   « /effort high » est prêt dans ta saisie
   ```
2. **Le prompt long est retenu** : le mod ne le transmet pas, il affiche le panneau et le dialogue, puis remet le prompt dans la saisie (`$.prompt.fill`) après le choix. (La commande d'effort pré-remplie avant le prompt a été retirée après le test : voir « Après les tests ».)

   **Garde-fous :**
   - si Amdy ferme le panneau ou le dialogue (Échap), ou choisit « Ne rien charger », le prompt part **tel quel et tout de suite** ;
   - aucune situation ne doit perdre le prompt : en cas d'erreur du mod, il part tel quel.
3. **Cinquième choix : « Ne plus proposer dans ce projet ».** Il est mémorisé dans `$.store`, par racine de projet. `/sm check` reste disponible, et `/sm status` indique que la proposition automatique est coupée et comment la rétablir.
4. **Seuils :**
   - 400 caractères ;
   - **une seule proposition par conversation**, déclenchements confondus ;
   - mots de projet comptés **en mots entiers seulement** : « mod » ne se déclenche pas sur « modifie », ni « app » sur « appelle ». Les frontières de mot doivent tenir compte des accents (`(?<![\p{L}\p{N}])mot(?![\p{L}\p{N}])`, drapeau `u`), car `\b` traite « é » comme une frontière.

   Mots par défaut : site, landing, app, refonte, montage, vidéo, dashboard, data, notebook, plugin, mod. Ils sont réglables dans `userConfig`.
5. **Tests dans le panneau VS Code et dans le terminal**, puis montrer le résultat à Amdy **avant de commiter**.

## Après les tests (2026-10-20)

**Écarts au plan, validés par Amdy :**

1. Le dialogue natif n'accepte que 4 options : « Ne rien charger » passe par Échap.
2. « Choisir moi-même » se fait par numéros tapés dans le champ libre, le panneau montrant les résumés complets.
3. Une section du prompt système liste les skills chargés, pour que Claude appelle l'outil de lui-même.
4. Le prompt retenu n'est jamais réécrit dans la saisie sans demande : une copie reste dans `$.store`, et `/sm prompt` le rend, même après `/clear`. Une première version le remettait seule après une autre commande, et il s'est collé devant le texte qu'Amdy tapait.
5. `/clear` ouvre une nouvelle conversation : l'outil est vidé, le panneau fermé, une nouvelle proposition devient possible.
6. La règle « petite modif » ne vaut que pour un prompt de 200 caractères au plus, sans le mot « explique ».

**Corrections demandées par Amdy après le test dans le panneau VS Code :**

- **Conflit prompt / dossier** : « site vitrine » dans SKILLMASTER proposait le pack outillage-claude-code. Désormais, quand le prompt désigne un type que le dossier n'a pas, le panneau montre les deux packs et Amdy choisit (prompt, dossier ou les deux).
- **Plus de pré-remplissage de `/model` ni `/effort`** : le panneau affiche seulement le conseil.

## Tests prévus (faits le 2026-10-20)

- `claude plugin validate --strict` : OK. `claude plugin test` : 20 tests sur la détection, les seuils, le conseil, le panneau (terminal et VS Code), le prompt retenu, Échap, une erreur du mod, `/clear`, le conflit et l'outil.
- Les quatre tests restés ouverts en phase 1 :
  - `/reload-skills` part seul s'il est lancé par une minuterie juste après la commande (« 3 added »). `/effort` n'est plus lancé par le mod ;
  - toast et ligne de statut dans VS Code : non confirmés ;
  - `$.tool.register` : l'outil est visible dans le terminal et dans VS Code, et Claude l'appelle de lui-même grâce à la section du prompt système ;
  - `/add-dir` dans le terminal : le skill témoin répond « PONG SKILLMASTER ».
- Détection sur de vrais projets d'Amdy (`/sm status`) : une app Expo → app-expo, deux sites → site web, un projet data → data, SKILLMASTER → outillage-claude-code.
- Terminal : parcours complets sur deux projets jetables (dossier neuf, site Next). Panneau VS Code : test d'Amdy dans SKILLMASTER (panneau, dialogue, « Choisir moi-même », `/sm prompt`, `/sm status`).

# SKILLMASTER

Les bons skills Claude Code pour ton projet, sans refaire la recherche à chaque fois.

[Site](https://skillmaster-sigma.vercel.app) · [Installation](https://skillmaster-sigma.vercel.app/installation/) · [English](#english)

## Ce que c'est

- **Une bibliothèque vivante.** Chaque lundi, une GitHub Action collecte des skills sur GitHub, les note avec Claude, les classe par type de projet et publie le résultat dans [`library/`](library/).
- **Un conseiller dans Claude Code.** Le plugin reconnaît le type de ton projet à ses fichiers et te propose 8 skills au plus, chacun résumé en une phrase, avec un conseil de modèle et d'effort.

Rien ne se charge sans ton accord. Par défaut, un skill accepté est chargé pour la session, à une version épinglée, sans rien écrire dans ton projet.

## Installer

Il faut Claude Code et Node 24 ou plus récent.

```sh
claude plugin marketplace add aamdyy/SKILLMASTER
claude plugin install skillmaster@skillmaster
```

Relance Claude Code, ouvre un projet, puis tape `/sm check`. La [page Installation](https://skillmaster-sigma.vercel.app/installation/) détaille les commandes et les réglages.

## Sécurité

Les skills sont du contenu tiers. Le scanner et le juge signalent des risques, mais **ne garantissent pas qu'un skill est sûr**. Relis ce que tu gardes dans un projet.

Pour signaler une faille, ouvre une [alerte privée](https://github.com/aamdyy/SKILLMASTER/security/advisories/new) plutôt qu'une issue publique.

## Dans ce dépôt

| Dossier | Contenu |
|---|---|
| `plugins/skillmaster/` | Le plugin : mod, commandes `/sm`, skill `skill-master`, scanner |
| `collector/` | Collecte, jugement, classement, publication |
| `library/` | La bibliothèque générée, mise à jour chaque semaine |
| `site/` | Le site, en export statique |

Le classement suit pour l'instant une stack de référence, celle de [`library/profil.json`](library/profil.json).

## Licence

Le code de ce dépôt est sous [licence MIT](LICENSE). Les skills référencés restent sous la licence de leurs auteurs : vérifie-la avant de les réutiliser.

---

## English

The right Claude Code skills for your project, without searching again every time.

- **A living library.** Every Monday, a GitHub Action collects skills from GitHub, rates them with Claude, sorts them by project type and publishes the result in [`library/`](library/).
- **An advisor inside Claude Code.** The plugin recognizes your project type from its files and suggests up to 8 skills, plus a model and effort tip. The plugin interface is in French for now.

Nothing gets loaded without your approval. By default, an accepted skill is loaded for the session, at a pinned version, without writing anything to your project.

```sh
claude plugin marketplace add aamdyy/SKILLMASTER
claude plugin install skillmaster@skillmaster
```

Requires Claude Code and Node 24 or newer. Restart Claude Code, open a project, then run `/sm check`.

Skills are third-party content. The scanner and the judge flag risks, but **they don't guarantee that a skill is safe**. To report a vulnerability, open a [private advisory](https://github.com/aamdyy/SKILLMASTER/security/advisories/new).

The code in this repository is under the [MIT license](LICENSE). Listed skills stay under their authors' licenses.

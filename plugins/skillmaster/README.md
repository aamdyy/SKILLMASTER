# Plugin SKILLMASTER

Propose les skills adaptés à ton projet et un conseil de modèle et d'effort, puis les charge pour la session sur accord. Commandes : `/sm check`, `/sm install`, `/sm clean`, `/sm status`, `/sm routeur`, `/sm prompt`.

Réglage `mode` (dans `/config`) : `proposer` par défaut ; `ombre`, où le routeur note en local le skill qu'il aurait signalé à chaque prompt ; `auto`, sans dialogue, avec quelques skills listés au début et un indice quand un prompt en appelle un. La recherche se fait sur ta machine, sans réseau, dans `library/intents.json`. Les traces restent dans `~/.cache/skillmaster/routeur/`.

Installation, réglages et sécurité : [README du dépôt](https://github.com/aamdyy/SKILLMASTER#readme).

Licence MIT. Les skills chargés restent sous la licence de leurs auteurs.

Dans Claude Code :

```
/plugin install skillmaster --marketplace aamdyy/SKILLMASTER
```

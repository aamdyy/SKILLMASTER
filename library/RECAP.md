# Récapitulatif SKILLMASTER — 2026-10-19

**3 pack(s) changent de tête.** 83 skill(s) nouveaux, 1 archivé(s), coût 0.66 $, 10 min.

## app-expo
- upgrading-react-native → **expo-animation** : expo-animation traite les animations, les gestes et les sheets d'une app Expo, ce qui fait partie du travail courant. La montée de version RN est un besoin ponctuel.
- react-native-brownfield-migration → **expo-overview** : Le brownfield sert à intégrer React Native dans une app native existante, pas à créer une app Expo. expo-overview est le point d'entrée qui oriente toute tâche Expo ou EAS, donc il sert bien plus.

## data
- dask → **query** : Dask (calcul distribué) est hors stack et écarté. Le skill query de DuckDB couvre le SQL local sur fichiers, que sa stack utilise.
- xlsx → **xlsx** : version de l’éditeur d’origine à la place d’une copie

## video
- music-to-video → **remotion-markup** : HyperFrames n'est pas dans sa stack alors que remotion-markup couvre useCurrentFrame/interpolate, au cœur de Remotion.

Écartés (hors stack) : dask (data), using-duckdb (data), querying-fabric (data), fabric-cli (data), dsql (data), basin (data), dv-query (data), dt-app-notebooks (data), dt-obs-analytics (data), bigtable-basics (outillage-claude-code), confluent-skill-creator (outillage-claude-code), create-toolset (outillage-claude-code)…

Archivés : xlsx

Têtes inchangées : android, ios, outillage-claude-code, site-web.

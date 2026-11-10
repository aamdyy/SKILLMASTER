// Mesure du routeur (V2, lot 3) sur des prompts de référence : justesse, indices de trop, temps.
// Il lit library/index/<type>.json et library/intents.json, comme le plugin dans sa copie locale.
//   node collector/route-eval.ts [--controle] [--detail]
//
// Un cas « attendu: [] » est un prompt où il ne faut rien glisser. Plusieurs noms : l'un d'eux suffit.
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { buildIndex, METHODE, reserve, route, type Intent, type ReservePack } from '../plugins/skillmaster/hooks/lib/router.ts'
import { LIBRARY, readJson } from './lib.ts'

type Case = { type: string; prompt: string; attendu: string[] }

export const CASES: Case[] = [
  // site-web
  { type: 'site-web', prompt: "Ajoute une animation d'apparition au scroll sur les cartes de la page d'accueil, avec GSAP, et fais attention au nettoyage quand le composant React est démonté.", attendu: ['gsap-react'] },
  { type: 'site-web', prompt: "Je voudrais une scène 3D avec un modèle qui tourne dans le hero de la landing, en react three fiber, avec un éclairage doux et des ombres.", attendu: ['threejs-react-three-fiber'] },
  { type: 'site-web', prompt: "Fais un audit d'accessibilité de la page contact : contraste, navigation au clavier, focus visible et lecteurs d'écran, puis corrige ce qui ne va pas.", attendu: ['a11y-debugging', 'web-design-guidelines'] },
  { type: 'site-web', prompt: "Le site d'un client perd des positions sur Google depuis la refonte, vérifie les balises title, les meta descriptions, le sitemap et les données structurées.", attendu: ['seo-drift', 'seo-agentic'] },
  { type: 'site-web', prompt: "Ajoute une transition animée entre la liste des articles et la page d'un article, avec les view transitions de React, le titre doit glisser d'une page à l'autre.", attendu: ['vercel-react-view-transitions'] },
  { type: 'site-web', prompt: "La page met trop de temps à charger et il y a beaucoup de re-rendus inutiles dans le tableau de bord React, optimise les composants et le chargement des données.", attendu: ['vercel-react-best-practices', 'react-best-practices'] },
  { type: 'site-web', prompt: "Branche l'authentification Supabase sur le formulaire d'inscription, avec la confirmation par e-mail et les règles RLS sur la table des profils.", attendu: ['supabase'] },
  { type: 'site-web', prompt: "Mets en cache les données de la page produits avec les cache components de Next.js, et revalide quand le stock change dans la base.", attendu: ['cache-components'] },
  { type: 'site-web', prompt: "Ajoute un captcha Cloudflare Turnstile sur le formulaire de contact pour bloquer les robots, côté client et vérification côté serveur.", attendu: ['turnstile-spin'] },
  { type: 'site-web', prompt: "Vérifie que le site s'affiche bien sur mobile, sur un vrai iPhone et un Android, les menus, les débordements horizontaux et les zones tactiles.", attendu: ['mobile-device-qa'] },
  { type: 'site-web', prompt: "Change la couleur du bouton principal en bleu et augmente un peu la taille du texte du pied de page, rien d'autre.", attendu: [] },
  { type: 'site-web', prompt: "Écris le texte de la section à propos, trois paragraphes sur l'histoire de l'atelier, ton chaleureux mais sobre, sans superlatifs.", attendu: [] },
  // ios
  { type: 'ios', prompt: "Ajoute un effet Liquid Glass sur la barre d'onglets et les boutons flottants de l'écran principal, comme dans iOS 26, en SwiftUI.", attendu: ['swiftui-liquid-glass'] },
  { type: 'ios', prompt: "J'ai des avertissements de data race et des erreurs Sendable depuis le passage à Swift 6, aide-moi à corriger l'isolation des acteurs dans le gestionnaire réseau.", attendu: ['swift-concurrency'] },
  { type: 'ios', prompt: "Avant d'envoyer l'app à la validation d'Apple, vérifie tout ce qui pourrait la faire rejeter : confidentialité, captures, métadonnées et achats intégrés.", attendu: ['app-store-preflight-skills'] },
  { type: 'ios', prompt: "Les tests de l'interface ne passent plus dans Xcode depuis la mise à jour, lance-les et regarde pourquoi le simulateur plante au démarrage des tests.", attendu: ['ce-test-xcode'] },
  { type: 'ios', prompt: "Implémente cet écran Figma en SwiftUI, fidèlement, avec les espacements, les typos et les couleurs du design.", attendu: ['figma-swiftui'] },
  { type: 'ios', prompt: "Ajoute un lecteur vidéo avec AVKit dans la fiche du cours, avec la lecture en image dans l'image et la reprise là où on s'était arrêté.", attendu: ['avkit'] },
  // android
  { type: 'android', prompt: "L'écran de la liste recompose sans arrêt quand on scrolle et ça saccade, trouve les paramètres instables et corrige les recompositions inutiles en Compose.", attendu: ['compose-performance', 'auditing-compose-performance'] },
  { type: 'android', prompt: "Mets en place le thème Material 3 avec les couleurs dynamiques et la typographie, et adapte les composants existants au nouveau thème.", attendu: ['material-3'] },
  { type: 'android', prompt: "L'application a des ANR au démarrage et une fuite mémoire dans l'activité principale, regarde les traces logcat et trouve la cause.", attendu: ['android-debugging'] },
  { type: 'android', prompt: "Charge les images des produits depuis l'API avec Coil dans la grille, avec un placeholder, le cache disque et un fondu à l'apparition.", attendu: ['coil-compose'] },
  { type: 'android', prompt: "Choisis entre StateFlow et SharedFlow pour les événements de navigation du ViewModel, et vérifie la portée des coroutines pour éviter les fuites.", attendu: ['kotlin-concurrency-and-flow'] },
  // app-expo
  { type: 'app-expo', prompt: "Configure EAS pour publier l'app sur l'App Store et le Play Store, avec les profils de build, les certificats et la soumission automatique.", attendu: ['eas-app-stores'] },
  { type: 'app-expo', prompt: "Mets en place la navigation par onglets et les routes imbriquées avec expo-router, avec un écran de détail en modale.", attendu: ['expo-router'] },
  { type: 'app-expo', prompt: "Ajoute une animation fluide quand on glisse une carte pour la supprimer, avec Reanimated et les gestes, sans bloquer le thread JS.", attendu: ['expo-animation', 'multithreading', 'vercel-react-native-skills'] },
  { type: 'app-expo', prompt: "Mets à jour React Native vers la dernière version dans le projet, avec les changements de dépendances natives et les breaking changes à corriger.", attendu: ['upgrading-react-native'] },
  // video
  { type: 'video', prompt: "Ajoute des sous-titres animés mot par mot à la vidéo, à partir de la transcription de la voix, avec le mot prononcé surligné.", attendu: ['remotion-captions'] },
  { type: 'video', prompt: "Lance le rendu final de la composition en MP4 1080p, puis en vertical pour les reels, et vérifie la durée et le son.", attendu: ['remotion-render'] },
  { type: 'video', prompt: "Crée un nouveau projet Remotion pour une vidéo de présentation de l'app, avec une composition de trente secondes et l'aperçu dans le Studio.", attendu: ['remotion-create', 'remotion-best-practices'] },
  { type: 'video', prompt: "Ajoute une carte animée qui suit le trajet entre Paris et Lyon dans la vidéo, avec un zoom progressif et le tracé qui se dessine.", attendu: ['remotion-maps'] },
  { type: 'video', prompt: "Fais une vidéo de démo à partir des captures d'écran de l'app, dans des cadres de téléphone, avec des transitions entre les écrans.", attendu: ['appshot-videos'] },
  // data
  { type: 'data', prompt: "Nettoie ce DataFrame : valeurs manquantes, doublons, types des colonnes, puis fais un groupby par mois et une jointure avec la table des clients.", attendu: ['pandas-pro'] },
  { type: 'data', prompt: "Cette requête SQL est lente sur la table des commandes, lis le plan EXPLAIN et propose les bons index et une réécriture plus rapide.", attendu: ['sql-pro', 'sql-insight', 'supabase-postgres-best-practices'] },
  { type: 'data', prompt: "Fais un graphique propre de l'évolution des ventes par région, lisible, avec des couleurs accessibles et des axes bien étiquetés.", attendu: ['dataviz', 'scientific-visualization'] },
  { type: 'data', prompt: "Lis ce fichier Excel avec plusieurs onglets, ajoute une colonne de totaux avec des formules et garde la mise en forme existante.", attendu: ['xlsx'] },
  { type: 'data', prompt: "Configure les politiques RLS et les index sur la base Postgres de Supabase, la table des événements grossit vite et les requêtes ralentissent.", attendu: ['supabase-postgres-best-practices'] },
  { type: 'data', prompt: "Explore le schéma de la base : quelles tables, quelles relations, quelles clés étrangères, avant qu'on écrive le rapport mensuel.", attendu: ['schema-exploration'] },
  // outillage-claude-code
  { type: 'outillage-claude-code', prompt: "Crée un serveur MCP en TypeScript qui expose l'API de notre CRM comme outils, avec l'authentification par clé et des schémas d'entrée propres.", attendu: ['mcp-builder', 'build-mcp-server'] },
  { type: 'outillage-claude-code', prompt: "Écris un nouveau skill Claude Code qui aide à rédiger les notes de version, avec son SKILL.md, sa description et des exemples.", attendu: ['skill-creator'] },
  { type: 'outillage-claude-code', prompt: "Je veux un plugin Claude Code avec une commande, un agent et un hook, structure-moi le dossier et le manifeste plugin.json.", attendu: ['plugin-structure', 'agent-development'] },
  { type: 'outillage-claude-code', prompt: "Écris une règle hookify qui bloque les commandes rm -rf et prévient quand on modifie un fichier de configuration sensible.", attendu: ['writing-hookify-rules'] },
  { type: 'outillage-claude-code', prompt: "Mets à jour le numéro de version dans le manifeste et ajoute une ligne dans le changelog pour la sortie de cette semaine.", attendu: [] },
  // methode, depuis n'importe quel pack
  { type: 'site-web', prompt: "Il y a un bug : le formulaire s'envoie deux fois quand on clique vite, trouve la cause et corrige-le avec un test qui le reproduit.", attendu: ['ce-debug', 'debugging'] },
  { type: 'ios', prompt: "Relis le diff de cette branche avant que je la fusionne : bugs possibles, cas oubliés, noms peu clairs, et dis-moi ce qui bloque.", attendu: ['ce-code-review', 'requesting-code-review', 'open-code-review-delegate'] },
  { type: 'data', prompt: "Exécute le plan qu'on a écrit hier étape par étape, en cochant chaque tâche et en t'arrêtant si quelque chose ne marche pas comme prévu.", attendu: ['executing-plans'] },
  { type: 'site-web', prompt: "Fais une revue de sécurité du code de l'API avant la mise en production : injections, authentification, secrets en clair et dépendances vulnérables.", attendu: ['secure-code-review'] },
  { type: 'android', prompt: "Réponds aux commentaires de la revue sur la pull request et corrige ce qui a été demandé, un commit par remarque.", attendu: ['ce-resolve-pr-feedback'] },
  // négatifs généraux
  { type: 'site-web', prompt: "Quelle est la différence entre let et const en JavaScript, je ne comprends pas bien quand utiliser l'un ou l'autre dans mes scripts ?", attendu: [] },
  { type: 'ios', prompt: "Écris le message de commit pour les changements en cours, en français, avec un titre court et un corps qui explique pourquoi.", attendu: [] },
  { type: 'video', prompt: "Résume-moi en cinq lignes ce qu'on a fait aujourd'hui sur le projet, pour que je puisse reprendre demain matin sans tout relire.", attendu: [] },
  { type: 'data', prompt: "Renomme la variable df2 en commandes_mensuelles partout dans le notebook, et mets un commentaire au-dessus de la cellule.", attendu: [] },
]

// Jeu de contrôle : écrit après le réglage des seuils, jamais utilisé pour régler. Son score est le chiffre honnête.
export const CONTROLE: Case[] = [
  { type: 'site-web', prompt: "Les animations du menu mobile restent actives après la navigation et ça fuit, on utilise gsap dans des composants client Next.js, corrige proprement.", attendu: ['gsap-react'] },
  { type: 'site-web', prompt: "Ajoute les données structurées JSON-LD pour les recettes et vérifie que Google les lit, le client veut apparaître dans les résultats enrichis.", attendu: ['seo-drift', 'seo-agentic'] },
  { type: 'site-web', prompt: "Les lecteurs d'écran ne lisent pas les boutons icônes de la barre d'outils et le focus se perd quand la modale se ferme, répare ça.", attendu: ['a11y-debugging'] },
  { type: 'site-web', prompt: "Ajoute un personnage en SVG qui cligne des yeux et bouge la tête doucement à côté du formulaire d'inscription.", attendu: ['svg-character-animator'] },
  { type: 'site-web', prompt: "Mets à jour la date du copyright dans le pied de page et corrige la faute dans le titre de la page tarifs.", attendu: [] },
  { type: 'ios', prompt: "Organise l'architecture de l'app SwiftUI : séparer les vues, les modèles observables et la navigation, le fichier principal fait deux mille lignes.", attendu: ['swiftui-architecture', 'swiftui-pro', 'swiftui-expert-skill', 'axiom-audit-swiftui-architecture'] },
  { type: 'ios', prompt: "Les animations de transition entre la liste et le détail sont saccadées en SwiftUI, fais un matchedGeometryEffect propre avec un ressort.", attendu: ['guide-swiftui-animations', 'swiftui-expert-skill', 'swiftui-pro'] },
  { type: 'ios', prompt: "Branche le client GraphQL Apollo sur l'écran du profil, avec la génération des types et le cache normalisé.", attendu: ['apollo-ios'] },
  { type: 'android', prompt: "Écris des tests d'interface Compose pour l'écran de connexion et des tests unitaires du ViewModel avec des coroutines de test.", attendu: ['android-testing'] },
  { type: 'android', prompt: "Génère un baseline profile pour accélérer le démarrage à froid de l'application et mesure le gain avec Macrobenchmark.", attendu: ['generating-baseline-profiles'] },
  { type: 'android', prompt: "La navigation au clavier et à la télécommande ne marche pas sur la grille de films, gère le focus entre les cartes en Compose.", attendu: ['compose-focus-navigation'] },
  { type: 'app-expo', prompt: "L'app Expo plante au lancement sur Android en production seulement, regarde les crashs et les logs remontés après la dernière mise à jour.", attendu: ['eas-observe', 'expo-dev-client'] },
  { type: 'app-expo', prompt: "On veut réutiliser le site web existant comme base pour l'app mobile Expo, qu'est-ce qu'on garde et comment on passe aux composants natifs ?", attendu: ['expo-web-to-native'] },
  { type: 'video', prompt: "Ajoute une musique de fond et des bruitages synchronisés avec les transitions dans la composition Remotion, avec un fondu du son à la fin.", attendu: ['remotion-multimedia'] },
  { type: 'video', prompt: "Passe le projet Remotion à la dernière version majeure, il y a des erreurs de dépendances et des API renommées.", attendu: ['remotion-upgrade'] },
  { type: 'video', prompt: "Écris le découpage plan par plan du teaser : cadrages, mouvements de caméra, durées et ce qu'on voit à l'écran.", attendu: ['video-shotcraft'] },
  { type: 'data', prompt: "Construis un pipeline Airflow qui récupère les commandes chaque nuit, les nettoie et les charge dans la base, avec des reprises en cas d'échec.", attendu: ['airflow', 'airflow-state-store'] },
  { type: 'data', prompt: "Affiche les magasins sur une carte avec des cercles proportionnels au chiffre d'affaires et un calcul des distances entre points.", attendu: ['spatial', 'portaljs-add-geo'] },
  { type: 'data', prompt: "Conçois le schéma des collections MongoDB pour les commandes et les produits : documents imbriqués ou références, et les index utiles.", attendu: ['mongodb-schema-design'] },
  { type: 'outillage-claude-code', prompt: "Appelle l'API Claude depuis le script Python avec le prompt caching et la sortie structurée, et gère les erreurs de quota.", attendu: ['claude-api'] },
  { type: 'outillage-claude-code', prompt: "Empaquette le serveur MCP en extension de bureau .mcpb pour qu'on puisse l'installer en un clic dans Claude Desktop.", attendu: ['build-mcpb'] },
  { type: 'methode', prompt: "Avant de finir cette branche : lance les tests, nettoie les commits, et propose de fusionner ou d'ouvrir une pull request.", attendu: ['finishing-a-development-branch'] },
  { type: 'methode', prompt: "Trois bugs indépendants dans trois modules différents, enquête sur les trois en parallèle et rapporte la cause de chacun.", attendu: ['parallel-debugging', 'debugging', 'ce-debug'] },
  { type: 'methode', prompt: "Explique-moi en deux phrases ce que fait la fonction principale de ce fichier, sans rien modifier.", attendu: [] },
]

export async function loadPacks() {
  const packs = new Map<string, ReservePack>()
  for (const file of (await readdir(join(LIBRARY, 'index'))).filter(name => name.endsWith('.json'))) {
    const pack = await readJson<ReservePack>(join(LIBRARY, 'index', file), { type: '', recommandes: [], ajouts: [] })
    packs.set(pack.type, pack)
  }
  const { skills: intents } = await readJson<{ skills: Record<string, Intent> }>(join(LIBRARY, 'intents.json'), { skills: {} })
  return { packs, intents }
}

async function main() {
  const detail = process.argv.includes('--detail')
  const { packs, intents } = await loadPacks()
  const indexes = new Map<string, ReturnType<typeof buildIndex>>()
  const indexOf = (type: string) => {
    if (!indexes.has(type)) indexes.set(type, buildIndex(reserve([packs.get(type), packs.get(METHODE)].filter((p): p is ReservePack => !!p), intents)))
    return indexes.get(type)!
  }
  let juste = 0, rate = 0, faux = 0, trop = 0, silence = 0
  const times: number[] = []
  const set = process.argv.includes('--controle') ? CONTROLE : CASES
  for (const one of set) {
    const index = indexOf(one.type)
    const t0 = performance.now()
    const result = route(index, one.prompt)
    times.push(performance.now() - t0)
    const names = result.choix.map(c => c.nom)
    const got = names.join('+') || null
    const positive = one.attendu.length > 0
    let verdict: string
    if (positive && names.some(n => one.attendu.includes(n))) (juste++, (verdict = 'juste'))
    else if (positive && got) (faux++, (verdict = 'FAUX'))
    else if (positive) (rate++, (verdict = 'raté'))
    else if (got) (trop++, (verdict = 'DE TROP'))
    else (silence++, (verdict = 'juste (rien)'))
    if (detail || !verdict.startsWith('juste')) {
      const top = result.candidats.map(c => `${c.nom} ${c.score}`).join(', ')
      console.log(`${verdict.padEnd(13)} ${one.type.padEnd(22)} attendu ${one.attendu.join('|') || '—'} · ${result.raison} ${got ?? ''} · [${top}]\n              « ${one.prompt.slice(0, 90)}… »`)
    }
  }
  const positives = set.filter(one => one.attendu.length).length
  const negatives = set.length - positives
  const indices = juste + faux + trop
  const sorted = [...times].sort((a, b) => a - b)
  console.log(`\n${set.length} prompts : ${positives} où un skill aide, ${negatives} où il ne faut rien`)
  console.log(`justes ${juste}/${positives} · faux ${faux} · ratés ${rate} · de trop ${trop}/${negatives} · silences justes ${silence}/${negatives}`)
  console.log(`précision des indices : ${indices ? Math.round((100 * juste) / indices) : 0} % (${juste}/${indices}) · couverture : ${Math.round((100 * juste) / positives)} %`)
  console.log(`temps par prompt : médiane ${sorted[Math.floor(sorted.length / 2)]!.toFixed(2)} ms, max ${sorted.at(-1)!.toFixed(2)} ms (index construit une fois par type)`)
}

if (import.meta.url === `file://${process.argv[1]}`) await main()

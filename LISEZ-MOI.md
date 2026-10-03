# Les Jardins d’Ambrelune

Première région jouable d’un RPG original de créatures et de jardins, version 0.3.

## Carnet illustré et jauges

Les compagnons ont une jauge de PV verte (jaune à 50 %, rouge à 25 %) et une jauge d’XP bleue. En combat, les mêmes jauges affichent les PV des deux créatures et l’XP du compagnon ; l’énergie dispose d’une jauge dorée. Les valeurs numériques restent visibles.

Les 17 objets ont une illustration originale commune au sac, aux recettes, à leurs ingrédients et aux aménagements du jardin. Les badges indiquent les quantités ; les recettes affichent le stock disponible et la quantité nécessaire. Les commandes de fabrication, placement et récupération restent sur chaque carte.

## Révision visuelle et habitants

La version 0.2 remplace la marche sur place par des itinéraires avec contournement des obstacles, pauses et arrêt près du joueur. La place accueille trois boutiques supplémentaires, des terrasses, des auvents, des enseignes, des pots et des massifs. Sols, toitures et feuillages ont des matières plus détaillées et la palette est plus contrastée.

Le **Rendu pixel**, activé par défaut, conserve une interface nette et un monde aux contours pixelisés. Désactivez-le dans Réglages pour un rendu 3D lissé. Les nouveaux décors et matières sont présents dans les deux modes.

## Jouer

Sous Windows, ouvrir **Lancer-Ambrelune.cmd**, puis [le jeu local](http://localhost:4173). Garder la fenêtre du serveur ouverte pendant la partie. Le lanceur utilise Node.js déjà présent dans cet environnement, ou un Node.js installé sur la machine. Aucun compte ni téléchargement d’assets n’est nécessaire au jeu.

Sur un autre ordinateur doté de Node.js 20 ou supérieur : lancer `node server.mjs` dans ce dossier. Le jeu est servi sur `http://localhost:4173`. Ouvrir directement le fichier HTML ne suffit pas : les modules et la sauvegarde hors ligne nécessitent une origine HTTP.

Pour Android : héberger les fichiers de ce dossier sur une origine **HTTPS**, ouvrir cette adresse dans Chrome Android puis utiliser **Installer l’application / Ajouter à l’écran d’accueil**. Le manifeste, les icônes et le service worker sont inclus. Le serveur local est volontairement limité à cet ordinateur ; `localhost` sur un téléphone désigne le téléphone. Aucun APK ni hébergement public n’a été produit.

## Vos premiers pas

1. Choisissez un compagnon et la couleur de votre manteau.
2. Parlez à Maëlle près de la fontaine. Marquez votre propriété sur la carte.
3. Au jardin, équipez **Cultiver**, plantez trois roselles et arrosez-les. Une culture arrosée mûrit en environ 84 secondes de temps de jeu actif. Les menus et combats suspendent sa croissance.
4. Traversez le pont à l’est. Approchez une créature visible pour la rencontrer. Les liens de résonance réussissent plus souvent quand ses PV sont bas ou qu’elle est apaisée.
5. Récoltez, préparez des tisanes dans le carnet, ramassez du bois avec la hache et du cristal avec la pioche. Fabriquez une lanterne et placez-la sur votre terrain.
6. Suivez le carnet jusqu’au sanctuaire. Entraînez votre compagnon et préparez des soins avant le Veilleur.

Les créatures liées vous appartiennent. Le carnet permet de choisir celle qui vous accompagne, de la soigner et de l’affecter au jardin. Ondril arrose ; Vélune fertilise ; Brasîle accélère la croissance des cultures déjà arrosées. Le travail se déroule visiblement lorsque vous êtes près de la propriété.

## Commandes

| Action | Ordinateur | Écran tactile |
| --- | --- | --- |
| Se déplacer | ZQSD, WASD, flèches, ou clic au sol avec recherche de chemin | Joystick gauche ou toucher le sol |
| Courir | Maj | Maintenir Courir avec le joystick |
| Interagir | E ou Espace | Bouton d’action contextuel |
| Outils | Touches 1 à 6 ou barre d’outils | Barre d’outils |
| Carnet / carte | Tab / M | Boutons en haut de l’écran |
| Caméra | Clic droit glissé ; molette pour zoomer | Zone ↔ à droite |
| Construire | Choisir dans Jardin, cliquer au sol, R pour tourner, Placer | Choisir, toucher au sol, Tourner, Placer |
| Fermer | Échap | × |

Les commandes tactiles peuvent être activées dans Réglages sur un ordinateur. Le déplacement au stick d’une manette est également lu ; la navigation complète des menus à la manette n’est pas implémentée.

## Contenu de cette version

- Région continue : cité de terrasses, marché, jardins, rivière et deux ponts, propriété, bois, carrière et sanctuaire.
- Géométries, textures de matériaux, portraits, icônes et sons créés par code ; aucun pack de modèles, de textures ou de sons téléchargé. Three.js est la bibliothèque de rendu, avec sa licence dans `vendor`.
- Trois compagnons de départ, huit espèces originales, rencontres visibles, comportements simples et apparitions conditionnées par l’heure ou la pluie.
- Combat au tour par tour : affinités, précision, critique, énergie, protection, soin, sommeil, brûlure, XP et niveaux. Capture consommant de vrais objets, équipe persistante et rencontre du Veilleur.
- Douze parcelles, quatre stades de croissance, pluie utile, engrais, récoltes de qualité, graines récupérées ; ressources renouvelées après deux jours.
- Neuf recettes, vente et achat, mini-jeu de pêche, cinq types d’aménagements avec aperçu valide/invalide, rotation et récupération.
- Arc de six missions, huit habitants nommés, dialogues et affinité simple ; carte de découverte et voyage entre lieux déjà découverts.
- Cycle lumineux, trois conditions météorologiques, végétation animée, particules, fenêtres et lanternes émissives, sons synthétisés.
- Sauvegarde automatique, sauvegarde manuelle, copie de secours locale, export et import JSON versionnés.
- Quatre réglages graphiques, rendu instancié, découpage de la végétation en 25 secteurs avec masquage à distance, panneau FPS / temps d’image / appels de rendu / triangles.

## Limites assumées de la première région

Cette version commence la production ; elle ne réalise pas encore l’intégralité du cahier des charges. Elle n’est ni une ville immense terminée ni un jeu complet.

Restent à produire : bestiaire de 30 espèces avec évolutions et silhouettes encore plus variées, intérieurs explorables en 3D, quartiers urbains supplémentaires, vraies saisons, reproduction, capacités de traversée, donjons et puzzles développés, festivals, machines et transport de ressources, murs/portes/sols constructibles, agrandissement de la maison, plusieurs emplacements de sauvegarde, synchronisation cloud et navigation complète à la manette.

Les bâtiments de cette version sont extérieurs ; la maison ouvre les actions de repos et sauvegarde. La création du personnage comprend le nom et le manteau, pas encore les coiffures et accessoires. Les habitants ont des animations et déplacements locaux, pas un emploi du temps quotidien complet. La cuisine correspond actuellement à la recette de tisane.

Le découpage actuel masque les secteurs lointains, mais ne décharge pas encore leurs ressources graphiques de la mémoire. Un chargement/déchargement réel par secteur sera nécessaire avant d’étendre beaucoup le monde. Les performances d’un Android physique et l’installation depuis un hébergement HTTPS restent à valider.

## Sauvegardes et mises à jour

Les données restent dans le navigateur utilisé. Exportez régulièrement votre voyage depuis Réglages, notamment avant une mise à jour ou un changement de navigateur. Les parties sont séparées par origine : une adresse HTTPS et le serveur local n’utilisent pas la même sauvegarde. Un service worker met en cache les fichiers après la première visite pour les lancements suivants hors ligne. Aucun service cloud, aucune collecte de données et aucune connexion à un compte ne sont utilisés.

## Développement

- `src/world` : relief, implantation, collisions, végétation, habitants et ressources.
- `src/rendering` : générateurs d’objets, matériaux, icônes, scène de combat.
- `src/systems` : données de jeu, règles pures, sauvegarde, entrée, recherche de chemin, audio.
- `src/main.js` : orchestration du jeu, interactions, caméra et carnet. L’extraction des vues du carnet et du contrôleur de combat en modules séparés est une prochaine étape de maintenance.
- `tests/systems.test.mjs` : tests des règles et invariants.

Vérification : `node --test tests/systems.test.mjs`. Les résultats et limites des essais de cette livraison sont consignés dans `VERIFICATION.md`.


## Personnages & animations — intégration Quaternius

Cette version utilise les packs fournis par le propriétaire du projet : Universal Base Characters, Modular Character Outfits - Fantasy, Universal Animation Library et Universal Animation Library 2. Les modèles sont chargés localement depuis `assets/characters/` (aucune dépendance CDN). Maëlle est explicitement une femme. Les PNJ utilisent plusieurs variantes de sexe, tenue et coiffure ; marche, course, idle et plusieurs interactions agricoles utilisent les bibliothèques d’animations. Les licences originales sont conservées dans `assets/characters/licenses/`.

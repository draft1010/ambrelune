# Vérifications — Ambrelune 0.3

## Révision du carnet et du combat

- Jauges PV/XP visibles dans Compagnons ; PV adverses, PV/XP/énergie du compagnon en combat.
- Illustrations pour les 17 objets, utilisées dans Sac, Fabriquer, les ingrédients, Jardin et les aménagements récupérables.
- Parcours des quatre pages dans le navigateur, reprise de sauvegarde puis rencontre de Vélune. Une attaque a fait passer les PV adverses de 56 à 47 et l’énergie de 30 à 25 ; la riposte a fait passer les PV du compagnon de 64 à 45. Les jauges et les valeurs accessibles ont suivi ces changements.
- Combat contrôlé en 844 × 390 : jauges et actions restent visibles sans couvrir les créatures.
- Les 11 tests des règles du jeu passent après modification. Le dossier de cette version a été restauré depuis l’archive 0.2, le précédent dossier ayant disparu pendant le travail.

## Révision du 2 octobre — habitants et direction artistique

- Référence Willowmere ouverte et observée dans le navigateur : matières, densité, contrastes et échelle des détails ont guidé cette révision. Aucun asset du site n’a été récupéré.
- Marche des habitants remplacée par une navigation entre points de passage à 1,35 m/s, avec pauses. L’animation dépend désormais du déplacement effectivement réalisé. Un test vérifie le trajet, le contournement d’un obstacle et l’arrêt près du joueur.
- **11 tests réussis** après révision ; **21 fichiers de cache accessibles**. Les résultats chiffrés plus bas correspondent à la version précédente.
- Trois nouvelles boutiques près de la place, auvents, terrasses, enseignes, guirlandes, poteries, caisses, massifs irréguliers, arbres fleuris, matières des sols/feuillages/bois/toitures, couleurs et éclairage retravaillés.
- Rendu pixel désactivable, interface conservée en pleine résolution. La résolution du monde est plafonnée à 960 pixels de large dans ce mode : les FPS ne sont donc pas directement comparables aux anciens relevés en pleine résolution.
- Contrôle visuel après correction d’une erreur de compilation du matériau du sol pendant le développement. Aucun nouveau message d’erreur du shader après correction.
- Reprise de sauvegarde, déplacement au clic, voyage rapide et repos vérifiés après la révision. La nouvelle scène a été observée à environ 137–165 FPS en fenêtre 1744 × 1244, mode pixel, sur cet ordinateur ; ce sont des relevés ponctuels et non une garantie.

## Historique — vérifications de la version 0.1

Livraison du 2 octobre 2026. Première région jouable ; les limites de contenu sont détaillées dans LISEZ-MOI.md.

## Tests automatisés

Commande : `node --test tests/systems.test.mjs`.

Résultat final : **10 tests réussis, aucun échec**. Ils couvrent la recherche de chemin autour des obstacles, la conservation des constructions/cultures/compagnons dans les sauvegardes, le rejet des sauvegardes invalides, les coûts de fabrication, la croissance et la récolte, la pluie, les dégâts élémentaires et la protection, les chances de capture, les contraintes de placement et les prérequis des missions.

Les 19 entrées du cache de l’application ont toutes répondu HTTP 200. La syntaxe des modules JavaScript a été vérifiée séparément.

## Parcours effectués dans le navigateur

- Création de partie avec Ondril, dialogue avec Maëlle et première récompense.
- Déplacement au clic, contournement d’obstacles, passage du pont et voyage vers les lieux découverts.
- Plantation et arrosage de trois parcelles, croissance, récolte et fabrication de tisanes avec consommation des ingrédients.
- Rencontre de Vélune : attaques, dégâts, soin, captures échouées consommant des liens, puis capture réussie et ajout à l’équipe.
- Repos à la maison, changement de jour et pluie.
- Récolte de bois à la hache et de cristal à la pioche ; fabrication d’une lanterne.
- Construction : rejet d’un placement sur une culture, aperçu valide sur terrain libre, rotation et pose persistante.
- Combat dans la scène dédiée, attaque critique, riposte et fuite ; lisibilité contrôlée en format mobile paysage.
- Commandes tactiles : joystick, caméra et interaction utilisés dans une fenêtre de 844 × 390 pixels.
- Rechargement avec conservation de la progression. Puis arrêt réel du serveur, rechargement depuis le cache et reprise de la partie : équipe et progression retrouvées. Le serveur a ensuite été redémarré.
- Contrôle du rendu des feuillages qui s’effacent localement devant le personnage. Aucun avertissement de compilation des shaders observé.

## Mesures de rendu

Relevés ponctuels du panneau de diagnostic, dans le navigateur intégré, sur cet ordinateur. Le DPR était de 1. Ces valeurs ne constituent ni un minimum garanti ni une mesure sur téléphone. La fréquence observée autour de 165 FPS semble plafonnée par la cadence d’affichage.

| Fenêtre | Profil | FPS observés | Temps d’image | Appels de rendu | Triangles |
| --- | --- | ---: | ---: | ---: | ---: |
| 1920 × 1080 | Haute | 165 | 6,1 ms | 369 | 564 404 |
| 2560 × 1440 | Haute | 165 | 6,1 ms | 369 | 564 404 |
| 3840 × 2160 | Ultra | 165 | 6,1 ms | 372 | 564 468 |
| 844 × 390, simulation sur PC | Moyenne | 165 | 6,1 ms | 332–346 | 521 000–547 000 |

Les trois grands formats affichaient 20 secteurs de végétation sur 25. Le masquage à distance ne décharge pas encore la géométrie de la mémoire. Les captures de mesure se trouvent dans `captures/`.

## Vérifications restantes

- Performances, chauffe, autonomie et gestes sur un véritable appareil Android.
- Installation PWA depuis une adresse HTTPS et essais dans plusieurs navigateurs.
- Équilibrage d’une partie complète jusqu’au Veilleur ; victoire finale non validée manuellement.
- Parcours manuel exhaustif de la pêche et de chaque capacité d’aide au jardin.
- Endurance sur plusieurs heures et mesure des pires temps d’image dans toutes les zones.

Le fonctionnement hors ligne a été testé après une première visite en ligne. L’installation mobile et un premier démarrage sans réseau ne sont pas couverts par ce test.

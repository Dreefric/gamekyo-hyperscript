// ==UserScript==
// @name         Gamekyo Wide & Stacked
// @namespace    http://tampermonkey.net/
// @version      8.0
// @description  UI depending on size
// @author       Gemini
// @match        *://www.gamekyo.com/*
// @grant        GM_addStyle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gamekyo.com
// ==/UserScript==

(function() {
    'use strict';

    const url = window.location.href;
    const isArticle = url.includes('/newsfr') || url.includes('/blog_article') || url.includes('/group_article') || url.includes('/videofr') || url.includes('/group');

    let dynamicCSS = `
        /* 1. Conteneur principal : Flexbox avec autorisation d'empilement (wrap) */
        #main-container {
            width: 90% !important;
            max-width: 1800px !important;
            margin: 0 auto !important;
            display: flex !important;
            flex-direction: row !important;
            flex-wrap: wrap !important; /* Autorise le passage à la ligne */
            justify-content: center !important;
            align-items: flex-start !important;
        }

         .slideshow-div{
            width: 54%;
         }

         #container li {
            max-width: 2000px !important;
            width: 100%;
         }


        /* 4. Colonne DROITE (Populaires) - Ordre 3 par défaut */
        #column-1 {
               width: 60% !important;
            }
        #column-2 {
            width: 250px !important;
            flex-shrink: 0 !important;
            order: 3;
        }

        /* --- LOGIQUE D'EMPILEMENT (Stacking) --- */

        @media screen and (max-width: 1200px) {
            #main-container {
              width: 95% !important;
              margin: 0px !important;
            }
            #column-0 {
               width: 30% !important;
               margin: 0 !important;
            }
            #column-1 {
               width: 70% !important;
               margin: 0 !important;
            }

            .slideshow-div{
               width: 67%;
            }
        }

        @media screen and (max-width: 1050px) {
            #main-container {
              width: 98% !important;
            }
        }

        @media screen and (max-width: 700px) {
            #main-container {
                flex-direction: column !important; /* Force l'empilement vertical */
                align-items: center !important;
            }

            #column-0, #column-1, #column-2 {
                width: 100% !important; /* Tout le monde prend toute la largeur */
                margin: 10px 0 !important;
            }

            /* Changement des priorités d'affichage */
            #column-1 { order: 1 !important; } /* Les News passent TOUT EN HAUT */
            #column-2 { order: 2 !important; } /* Les Infos Populaires passent en DEUXIÈME */
            #column-0 { order: 3 !important; } /* Les Blogs passent EN BAS */

            .slideshow-div{
               width: 100%;
            }
        }

        /* --- Ajustements visuels --- */
        img { max-width: 100% !important; height: auto !important; }
        .comments-popular { margin: 0px; }

        /* Nettoyage des pubs qui bloquent le redimensionnement */
        .advertisement, #cGsas_920 { display: none !important; }
    `;

    if (isArticle) {
        dynamicCSS += `
            /* Sur un article, on retire la colonne 2 pour plus de clarté */
            #column-2 { display: none !important; }
            #column-1 { margin-right: 0 !important; }
            #main-container-header { display: none !important; }
        `;
    }

    GM_addStyle(dynamicCSS);

})();
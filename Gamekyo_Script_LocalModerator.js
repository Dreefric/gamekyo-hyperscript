// ==UserScript==
// @name         Gamekyo - Filtrage ON/OFF + Badge + Blacklist
// @namespace    https://gamekyo.com/
// @version      5.0
// @match        https://www.gamekyo.com/*
// @grant        none
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gamekyo.com
// ==/UserScript==

(function () {
    'use strict';

    const FILTER_KEY = 'gk_filter_enabled';
    const BLACKLIST_KEY = 'gk_blacklist';

    // état du filtrage
    let enabled = localStorage.getItem(FILTER_KEY) !== 'false';
    let blacklist = JSON.parse(localStorage.getItem(BLACKLIST_KEY) || '["yanssou"]');

    // compteur et badge
    let hiddenCount = 0;
    let badgeEl = null;

    // expose pour console
    window.applyFilter = applyFilter;
    window.updateBadge = updateBadge;

    // =====================
    // UTILITAIRES
    // =====================

    function saveBlacklist() {
        localStorage.setItem(BLACKLIST_KEY, JSON.stringify(blacklist));
    }

    function shouldHide(pseudo) {
        return blacklist.some(p => p.toLowerCase() === pseudo.toLowerCase());
    }

    // traite un seul blog
    function processBlog(blog) {
        //console.log("processBlog "+ blog);
        if (blog.dataset.gkProcessed && enabled) return; // déjà traité
        blog.dataset.gkProcessed = '1';

        const author = blog.querySelector('a.member');
        if (!author) return;

        const pseudo = author.textContent.trim();
        //console.log("processBlog pseudo "+ pseudo);
        if (enabled && shouldHide(pseudo)) {
            blog.style.display = 'none';
            hiddenCount++;
        } else {
            blog.style.display = '';
        }
        updateBadge();
    }

    // scan initial ou refresh
    function applyFilter() {
        //console.log("applyFilter - "+ enabled);
        // réinitialiser les blogs pour retraitement
        if (enabled) {
            document.querySelectorAll('div[id^="article-blogging-comment-"]').forEach(blog => {
                //console.log("applyFilter -A removeAttribute "+ blog);
                blog.removeAttribute('data-gk-processed');
            });
            document.querySelectorAll('div[id^="article-comment-"]').forEach(blog => {
                //console.log("applyFilter -B removeAttribute "+ blog);
                blog.removeAttribute('data-gk-processed');
            });
        }
        hiddenCount = 0;
        document.querySelectorAll('div[id^="article-blogging-comment-"]').forEach(processBlog);
        document.querySelectorAll('div[id^="article-comment-"]').forEach(processBlog);
    }

    function updateBadge() {
        if (!badgeEl) return;
        if (enabled && hiddenCount > 0) {
            badgeEl.textContent = hiddenCount > 99 ? '99+' : hiddenCount;
            badgeEl.style.display = 'flex';
        } else {
            badgeEl.style.display = 'none';
        }
    }

    // =====================
    // UI : Toggle + Badge + Settings
    // =====================

    function createUI() {
        const container = document.createElement('div');
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 99999;
            display: flex;
            flex-direction: column;
            gap: 8px;
        `;

        // Toggle bouton
        const toggleBtn = document.createElement('div');
        toggleBtn.style.cssText = buttonStyle();
        toggleBtn.style.position = 'relative';

        // span pour icone pour ne pas écraser badge
        const iconSpan = document.createElement('span');
        iconSpan.textContent = enabled ? '🙈' : '👁️';
        toggleBtn.appendChild(iconSpan);

        toggleBtn.onclick = () => {
            enabled = !enabled;
            localStorage.setItem(FILTER_KEY, enabled);

            iconSpan.textContent = enabled ? '🙈' : '👁️';
            applyFilter();
        };

        // Badge rouge
        badgeEl = document.createElement('div');
        badgeEl.style.cssText = `
            position: absolute;
            top: -4px;
            right: -4px;
            min-width: 18px;
            height: 18px;
            padding: 0px 4px;
            background: #e53935;
            color: white;
            border-radius: 9px;
            font-size: 11px;
            font-weight: bold;
            display: none;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 0 2px #222;
            z-index: 1000;
        `;
        toggleBtn.appendChild(badgeEl);

        // Settings ⚙️
        const settingsBtn = document.createElement('div');
        settingsBtn.textContent = '⚙️';
        settingsBtn.title = 'Configuration';
        settingsBtn.style.cssText = buttonStyle();

        const menu = document.createElement('div');
        menu.style.cssText = `
            display: none;
            position: absolute;
            bottom: 60px;
            right: 0;
            background: #222;
            color: white;
            border-radius: 8px;
            padding: 10px;
            min-width: 220px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.5);
            font-size: 13px;
        `;

        settingsBtn.onclick = () => {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            renderBlacklist(menu);
        };

        container.appendChild(toggleBtn);
        container.appendChild(settingsBtn);
        container.appendChild(menu);
        document.body.appendChild(container);
    }

    function buttonStyle() {
        return `
            width: 44px;
            height: 44px;
            background: #222;
            color: white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            font-size: 22px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.4);
            user-select: none;
        `;
    }

    function renderBlacklist(menu) {
        menu.innerHTML = `<strong>Blacklist</strong><br><br>`;

        blacklist.forEach((name, i) => {
            const row = document.createElement('div');
            row.style.cssText = `
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:6px;
            `;
            const label = document.createElement('span');
            label.textContent = name;

            const removeBtn = document.createElement('span');
            removeBtn.textContent = '✖';
            removeBtn.style.cssText = `cursor:pointer; color:#f66; font-weight:bold; margin-left:10px;`;
            removeBtn.onclick = () => {
                blacklist.splice(i, 1);
                saveBlacklist();
                renderBlacklist(menu);
                applyFilter();
            };

            row.appendChild(label);
            row.appendChild(removeBtn);
            menu.appendChild(row);
        });

        const input = document.createElement('input');
        input.placeholder = 'Ajouter un pseudo';
        input.style.cssText = `width:100%; margin-top:8px; box-sizing:border-box;`;
        input.onkeydown = e => {
            if (e.key === 'Enter' && input.value.trim()) {
                blacklist.push(input.value.trim());
                saveBlacklist();
                input.value = '';
                renderBlacklist(menu);
                applyFilter();
            }
        };
        menu.appendChild(input);
    }

    // =====================
    // MutationObserver pour contenu dynamique
    // =====================

    new MutationObserver(mutations => {
        for (const m of mutations) {
            for (const node of m.addedNodes) {
                if (!(node instanceof HTMLElement)) continue;

                if (node.matches('div[id^="article-blogging-comment-"]')){
                    processBlog(node);
                }else{
                    node.querySelectorAll('div[id^="article-blogging-comment-"]').forEach(processBlog);
                }
            }
        }
    }).observe(document.body, { childList: true, subtree: true });

    // =====================
    // INIT
    // =====================
    createUI();
    applyFilter();

})();

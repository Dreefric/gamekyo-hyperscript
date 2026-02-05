// ==UserScript==
// @name         Gamekyo Smart Notes
// @namespace    gk-smart-notes
// @version      1.0
// @match        https://www.gamekyo.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gamekyo.com
// ==/UserScript==

(function () {
    "use strict";

    let searchQuery = "";

    /* ---------------- CONFIG ---------------- */

    const STORAGE_KEY = "gkSmartNotesV4";

    /* ---------------- STORAGE ---------------- */

    const loadDB = () => {
        console.log("loadDB ");
        try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
        catch { return {}; }
    };

    const saveDB = db => {
        console.log("saveDB ");
        localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    };

    const uuid = () =>
    crypto.randomUUID ? crypto.randomUUID() :
    Date.now()+"-"+Math.random();

    /* ---------------- CSS ---------------- */

    GM_addStyle(`
#gk-overlay{
 position:fixed; inset:0;
 background:rgba(0,0,0,.65);
 display:none; align-items:center; justify-content:center;
 z-index:999999;
}

#gk-app{
 width:820px; height:560px;
 background:#1e1e1e;
 color:white;
 border-radius:12px;
 display:flex; flex-direction:column;
 font-family:Arial;
}

.gk-header{
 padding:12px 16px;
 border-bottom:1px solid #333;
 display:flex; justify-content:space-between;
}

.gk-tabs{display:flex; gap:6px;}

.gk-tab{
 padding:6px 12px; background:#2b2b2b;
 border-radius:6px; cursor:pointer;
}

.gk-tab.active{background:#4fc3f7; color:black;}

.gk-body{flex:1; display:flex;}

.gk-sidebar{
 width:240px; border-right:1px solid #333;
 display:flex; flex-direction:column;
}

.gk-list{flex:1; overflow:auto;}

.gk-note-item{
 padding:6px 10px; cursor:pointer;
 border-left:3px solid transparent;
}

.gk-note-item.active{
 background:#2d2d2d;
 border-left:3px solid #4fc3f7;
}

.gk-editor{
 flex:1; display:flex; flex-direction:column;
 padding:10px; gap:6px;
}

.gk-input,.gk-editor textarea{
 background:#252526; border:none;
 color:white; padding:6px; border-radius:6px;
}

.gk-editor textarea{flex:1; resize:none;}

.gk-tags{display:flex; flex-wrap:wrap; gap:6px;}

.gk-tag{
 background:#3a3a3a; padding:2px 8px;
 border-radius:10px; font-size:11px; cursor:pointer;
}

.gk-btn{
 background:#3a3a3a; border:none;
 color:white; padding:6px;
 border-radius:6px; cursor:pointer;
}

.gk-stars span{cursor:pointer; font-size:18px;}

.gk-note-icon{margin-left:4px; cursor:pointer; opacity:.6;}
.gk-note-icon:hover{opacity:1;}
`);

    /* ---------------- TOOLTIP ---------------- */

    const tooltip = document.createElement("div");
    tooltip.style.position="absolute";
    tooltip.style.background="#1f1f1f";
    tooltip.style.color="white";
    tooltip.style.padding="6px 8px";
    tooltip.style.borderRadius="6px";
    tooltip.style.fontSize="12px";
    tooltip.style.display="none";
    tooltip.style.zIndex="999999";
    tooltip.style.maxWidth="260px";
    document.body.appendChild(tooltip);

    function showTooltip(e,id){
        console.log("showTooltip ");
        const db=loadDB();
        const m=db[id]?.member;
        if(!m) return;

        tooltip.innerHTML=`
 ${m.description?m.description.replace(/\n/g, '<br>')+"<br><hr>":""}
 <b>Rating</b>: ${"★".repeat(m.rating||0)}${"☆".repeat(5-(m.rating||0))}
 `;

        tooltip.style.left=e.pageX+10+"px";
        tooltip.style.top=e.pageY+10+"px";
        tooltip.style.display="block";
    }
    const hideTooltip=()=>tooltip.style.display="none";

    /* ---------------- OVERLAY ---------------- */

    const overlay=document.createElement("div");
    overlay.id="gk-overlay";
    overlay.innerHTML=`<div id="gk-app"></div>`;
    document.body.appendChild(overlay);

    const app=overlay.querySelector("#gk-app");

    overlay.addEventListener("click",e=>{
        if(e.target===overlay) overlay.style.display="none";
    });

    document.addEventListener("keydown",e=>{
        if(e.key==="Escape") overlay.style.display="none";
    });

    /* ---------------- UI ---------------- */

    function openUI(memberId,username,commentTitle="New title",commentText=""){
        console.log("openUI ");
        const db=loadDB();

        if(!db[memberId]){
            db[memberId]={
                member:{description:"",tags:[],rating:0},
                notes:[],
                activeNoteId:null
            };
        }

        const data=db[memberId];

        /* ---- MIGRATION V2 ---- */

        if(data.mainNote!==undefined){
            data.notes=[{
                id:uuid(),
                title:"Note principale",
                content:data.mainNote,
                tags:[],
                created:Date.now(),
                updated:Date.now()
            }];
            data.activeNoteId=data.notes[0].id;
            delete data.mainNote;
        }

        let tab="notes";

        render();
        overlay.style.display="flex";

        /* ---------------- RENDER ---------------- */

        function render(){
            console.log("render ");
            app.innerHTML=`
 <div class="gk-header">
   <div>${username}</div>
   <div class="gk-tabs">
<div class="gk-tab ${tab==="member"?"active":""}" data-tab="member">Member</div>
<div class="gk-tab ${tab==="notes"?"active":""}" data-tab="notes">Notes</div>
   </div>
 </div>

 <div class="gk-body">
   ${tab==="member"?renderMember():renderNotes()}
 </div>
 `;

            app.querySelectorAll(".gk-tab").forEach(t=>{
                t.onclick=()=>{tab=t.dataset.tab;render();}
            });
        }

        /* ---------------- MEMBER TAB ---------------- */

        function renderMember(){
            console.log("renderMember ");
            setTimeout(()=>{

                const desc=document.getElementById("m-desc");
                const tagsDiv=document.getElementById("m-tags");
                const tagInput=document.getElementById("m-tag-input");

                function renderTags(){
                    tagsDiv.innerHTML="";
                    data.member.tags.forEach((t,i)=>{
                        const el=document.createElement("div");
                        el.className="gk-tag";
                        el.textContent=t;
                        el.onclick=()=>{data.member.tags.splice(i,1);renderTags();}
                        tagsDiv.appendChild(el);
                    });
                }
                renderTags();

                tagInput.onkeydown=e=>{
                    if(e.key==="Enter"){
                        const v=tagInput.value.trim();
                        if(v) data.member.tags.push(v);
                        tagInput.value="";
                        saveDB(db);
                        renderTags();
                    }
                };

                document.querySelectorAll("#m-rating span").forEach(s=>{
                    s.onclick=()=>{
                        data.member.rating=Number(s.dataset.r);
                        saveDB(db);
                        refreshIcons();
                        render();
                    };
                });

                desc.onkeyup=()=>{
                    data.member.description=desc.value;
                    saveDB(db);
                };

            },0);

            return`
<div class="gk-editor">

<label>Description</label>
<textarea id="m-desc">${data.member.description||""}</textarea>

<label>Rating</label>
<div class="gk-stars" id="m-rating">
${[1,2,3,4,5].map(i=>`<span data-r="${i}">${i<=data.member.rating?"★":"☆"}</span>`).join("")}
</div>

<label>Tags</label>
<div class="gk-tags" id="m-tags"></div>
<input class="gk-input" id="m-tag-input" placeholder="Add tag"/>
</div>`;
        }

        /* ---------------- NOTES TAB ---------------- */

        function renderNotes(){
            console.log("renderNotes ");
            setTimeout(()=>bindNotes(),0);

            return`
<div class="gk-sidebar">
<button class="gk-btn" id="n-add">+ Nouvelle Note</button>
<button class="gk-btn" id="n-add-comment">+ Depuis commentaire</button>
<input class="gk-input" id="n-search" placeholder="Recherche"/>
<div class="gk-list" id="n-list"></div>
</div>

<div class="gk-editor">
<input class="gk-input" id="n-title" placeholder="Title"/>
<textarea id="n-content"></textarea>
<label>Tags</label>
<div class="gk-tags" id="n-tags"></div>
<input class="gk-input" id="n-tag-input" placeholder="Add tag"/>
</div>`;
        }

        function bindNotes(){
            console.log("bindNotes ");
            const list=document.getElementById("n-list");
            const title=document.getElementById("n-title");
            const content=document.getElementById("n-content");
            const tagsDiv=document.getElementById("n-tags");
            const tagInput=document.getElementById("n-tag-input");


            function renderList(){
                console.log("renderList ");
                list.innerHTML = "";

                const filteredNotes = data.notes.filter(n => {

                    if(!searchQuery) return true;

                    const title = (n.title || "").toLowerCase();
                    const content = (n.content || "").toLowerCase();
                    const tags = (n.tags || []).join(" ").toLowerCase();

                    return (
                        title.includes(searchQuery) ||
                        content.includes(searchQuery) ||
                        tags.includes(searchQuery)
                    );
                });

                filteredNotes.forEach(n=>{
                    const el=document.createElement("div");
                    el.className="gk-note-item "+(n.id===data.activeNoteId?"active":"");
                    el.textContent=n.title||"Untitled";

                    el.onclick=()=>{
                        data.activeNoteId=n.id;
                        loadActive();
                        renderList();
                    };

                    // --- Bouton suppression ---
                    const del = document.createElement("span");
                    del.textContent = "❌";
                    del.style.marginLeft = "8px";
                    del.style.cursor = "pointer";

                    del.onclick = (e)=>{
                        e.stopPropagation(); // évite de sélectionner la note

                        // suppression
                        data.notes = data.notes.filter(x => x.id !== n.id);

                        // si la note supprimée était active
                        if(data.activeNoteId === n.id){
                            data.activeNoteId = data.notes[0]?.id || null;
                            loadActive();
                        }
                        renderList();
                        saveDB(db);
                    };

                    list.appendChild(el);
                    el.appendChild(del);
                });
            }



            function loadActive(){
                console.log("loadActive : ");
                const n=data.notes.find(x=>x.id===data.activeNoteId);
                if(!n){title.value="";content.value="";return;}
                title.value=n.title;
                content.value=n.content;
                renderTags();
            }

            function renderTags(){
                console.log("renderTags ");
                const n=data.notes.find(x=>x.id===data.activeNoteId);
                tagsDiv.innerHTML="";
                if(!n) return;
                n.tags.forEach((t, i) => {
                    console.log("- renderTag "+ t);
                    const el = document.createElement("div");
                    el.className = "gk-xtag";
                    // On utilise flex pour aligner le texte et la croix proprement
                    el.style.display = "inline-flex";
                    el.style.alignItems = "center";
                    el.style.gap = "5px";
                    el.textContent = t;

                    // Création de l'icône croix
                    const closeBtn = document.createElement("span");
                    closeBtn.textContent = "✕"; // Caractère multiplication ou "x"
                    console.log("closeBtn : " + closeBtn);
                    // Action au clic sur la croix
                    closeBtn.onclick = (e) => {
                        e.stopPropagation(); // Empêche le clic de déclencher d'autres événements sur le parent

                        // --- VOTRE ACTION ICI ---
                        console.log("Suppression du tag : " + t);

                        n.tags.splice(i, 1);
                        renderTags();
                    };

                    tagsDiv.appendChild(el);
                    tagsDiv.appendChild(el);
                });
            }

            tagInput.onkeydown=e=>{
                if(e.key==="Enter"){
                    console.log("tagInput.Enter");
                    const n=data.notes.find(x=>x.id===data.activeNoteId);
                    if(!n) return;
                    const v=tagInput.value.trim();
                    if(v) n.tags.push(v);
                    tagInput.value="";
                    saveDB(db);
                    renderTags();
                }
            };

            title.oninput=()=>{
                console.log("title.oninput");
                const n=data.notes.find(x=>x.id===data.activeNoteId);
                if(n) n.title=title.value;
                renderList();
                saveDB(db);
            };

            content.oninput=()=>{
                console.log("content.oninput");
                const n=data.notes.find(x=>x.id===data.activeNoteId);
                if(n) n.content=content.value;
                saveDB(db);
            };

            document.getElementById("n-add").onclick=()=>{
                console.log("n-add.onclick");
                const n={id:uuid(),title:"New note",content:"",tags:[],created:Date.now()};
                data.notes.push(n);
                data.activeNoteId=n.id;
                renderList();
                loadActive();
                saveDB(db);
            };

            document.getElementById("n-search").addEventListener("keyup", (e)=>{
                searchQuery = e.target.value.toLowerCase().trim();
                renderList();
            });

            document.getElementById("n-add-comment").onclick=()=>{
                console.log("n-add-comment.onclick");
                if(!commentText) return;
                const n={id:uuid(),title:commentTitle,content:commentText,tags:[],created:Date.now()};
                data.notes.push(n);
                data.activeNoteId=n.id;
                renderList();
                loadActive();
                saveDB(db);
            };

            renderList();
            loadActive();
        }

    }

    /* ---------------- ICONS ---------------- */

    function refreshIcons(){
        console.log("refreshIcons");
        document.querySelectorAll(".gk-note-icon").forEach(e=>e.remove());
        scan();
    }

    function getMemberId(link){
        console.log("getMemberId " + link);
        const m=link.href.match(/member(\d+)/);
        return m?m[1]:null;
    }

    function createIcon(id,user,commentTitle, comment){
        console.log("createIcon " + user);
        const ic=document.createElement("span");
        ic.textContent="📝";
        ic.className="gk-note-icon";

        ic.onmouseenter=e=>showTooltip(e,id);
        ic.onmouseleave=hideTooltip;

        ic.onclick=e=>{
            e.stopPropagation();
            openUI(id,user,commentTitle || "",comment || "");
        };

        return ic;
    }

    /* ---------------- SCAN ---------------- */

    function scan(){
        console.log("scan ");
        document.querySelectorAll(".comment-information").forEach(commentInfo => {
            const link = commentInfo.select("a.member")[0];
            if(link.dataset.gkBound) return;
            const id = getMemberId(link);
            if(!id) return;

            const username = link.textContent.trim();

            const commentDateTime =commentInfo.select("span.date")[0].innerText.trim();
            const commentText =
                  "Article : " + window.location.href + "\n"+
                  "Date    : " + commentDateTime + "\n\n"+
                  commentInfo.select(".comment-text")[0].innerText.trim();

            link.after(createIcon(id, username,commentDateTime, commentText));

            link.dataset.gkBound = "1";
        });
    }
    unsafeWindow.scan = scan;


    /* ---------------- OBSERVER ---------------- */

    new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
    window.addEventListener("load",scan);

})();

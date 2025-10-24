const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/chunk-vendor.js","assets/chunk-eruda.js"])))=>i.map(i=>d[i]);
import{X as Y,A as dt,t as v,Y as De,Z as re,_ as de,$ as X,a0 as ht,a1 as ut,a2 as gt}from"./chunk-vendor.js";import{F as ft,g as A,i as ke}from"./chunk-git.js";import{S as pt,s as mt,m as wt,L as ee,j as Oe,h as Ge,c as Ue,a as yt,y as vt,x as bt,b as Ct,d as St,e as Be,C as q,k as j,E as D,H as kt,f as me,D as $,V as M,R,g as V,W as qe,i as we,l as ze,n as Et,o as xt,p as Tt,q as It,r as Pt,t as $t,u as Lt,v as At,w as Nt,z as Mt,A as Rt,B as _t,F as Ft,G as Dt,I as Ot,J as He,K as Gt,M as Ut,N as Bt,O as qt,P as zt,Q as Ht,T as Wt,U as jt,X as Vt,Y as Kt}from"./chunk-codemirror.js";import{c as z}from"./chunk-gpt-tokenizer.js";import{e as B}from"./chunk-eruda.js";(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const s of document.querySelectorAll('link[rel="modulepreload"]'))n(s);new MutationObserver(s=>{for(const i of s)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function t(s){const i={};return s.integrity&&(i.integrity=s.integrity),s.referrerPolicy&&(i.referrerPolicy=s.referrerPolicy),s.crossOrigin==="use-credentials"?i.credentials="include":s.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(s){if(s.ep)return;s.ep=!0;const i=t(s);fetch(s.href,i)}})();var We=!1;try{var ae={};Object.defineProperty(ae,"passive",{get(){return We=!0,!1}}),window.addEventListener("testpassive",null,ae),window.removeEventListener("testpassive",null,ae)}catch{}if(We){var Jt=EventTarget.prototype.addEventListener;EventTarget.prototype.addEventListener=function(a,e,t){var n=t&&typeof t=="object",s=n?t.capture:t,i=n?Object.assign({},t):{};return i.passive===void 0&&(a==="touchstart"||a==="touchmove"||a==="wheel")&&(i.passive=!0),i.capture===void 0&&(i.capture=!!s),Jt.call(this,a,e,i)}}class Ee{constructor({targetSelector:e,items:t,containerItems:n=[],itemSelector:s,dataAttribute:i}){if(this.targetSelector=e,this.items=t,this.containerItems=n,this.itemSelector=s,i){const o=i.replace("data-","");this.dataAttributeKey=o.replace(/-([a-z])/g,r=>r[1].toUpperCase())}else this.dataAttributeKey=null;this.menuElement=null,this.longPressTimeout=null,this.boundHideMenu=this.hideMenu.bind(this),this.init()}init(){this.createMenuElement(),document.addEventListener("contextmenu",this.handleContextMenu.bind(this)),document.addEventListener("touchstart",this.handleTouchStart.bind(this),{passive:!1}),document.addEventListener("touchend",this.handleTouchEnd.bind(this)),document.addEventListener("touchcancel",this.handleTouchEnd.bind(this))}createMenuElement(){this.menuElement=document.createElement("div"),this.menuElement.className="context-menu",document.body.appendChild(this.menuElement)}handleContextMenu(e){const t=e.target.closest(this.targetSelector);if(!t)return;e.preventDefault();const n=this.itemSelector?e.target.closest(this.itemSelector):null;n?this.showMenu(e.clientX,e.clientY,this.items,n):this.showMenu(e.clientX,e.clientY,this.containerItems,t)}handleTouchStart(e){const t=e.target.closest(this.targetSelector);t&&(this.longPressTimeout=setTimeout(()=>{e.preventDefault();const n=this.itemSelector?e.target.closest(this.itemSelector):null,s=n?this.items:this.containerItems;this.showMenu(e.touches[0].clientX,e.touches[0].clientY,s,n||t),this.longPressTimeout=null},500))}handleTouchEnd(){this.longPressTimeout&&(clearTimeout(this.longPressTimeout),this.longPressTimeout=null)}showMenu(e,t,n,s){this.menuElement.innerHTML="",this.menuElement.style.display="block";const i=this.dataAttributeKey&&s.dataset[this.dataAttributeKey]?s.dataset[this.dataAttributeKey]:null;n.forEach(h=>{if(h.type==="separator"){const f=document.createElement("div");f.className="context-menu-separator",this.menuElement.appendChild(f);return}const g=document.createElement("button");g.className="context-menu-item",g.textContent=h.label,g.addEventListener("click",()=>{h.action(i),this.hideMenu()}),this.menuElement.appendChild(g)});const o=this.menuElement.offsetWidth,r=this.menuElement.offsetHeight,{innerWidth:c,innerHeight:l}=window;let d=e,u=t;e+o>c&&(d=c-o-5),t+r>l&&(u=l-r-5),this.menuElement.style.top=`${u}px`,this.menuElement.style.left=`${d}px`,document.addEventListener("click",this.boundHideMenu),document.addEventListener("contextmenu",this.boundHideMenu)}hideMenu(e){e&&this.menuElement.contains(e.target)||this.menuElement.style.display==="block"&&(this.menuElement.style.display="none",document.removeEventListener("click",this.boundHideMenu),document.removeEventListener("contextmenu",this.boundHideMenu))}}class C{constructor({title:e="Notice"}={}){this.overlay=document.createElement("div"),this.overlay.className="modal-overlay hidden",this.container=document.createElement("div"),this.container.className="modal-container",this.header=document.createElement("div"),this.header.className="modal-header",this.header.textContent=e,this.content=document.createElement("div"),this.content.className="modal-content",this.content.innerHTML="Loading...",this.footer=document.createElement("div"),this.footer.className="modal-footer",this.footer.style.display="none",this.container.appendChild(this.header),this.container.appendChild(this.content),this.container.appendChild(this.footer),this.overlay.appendChild(this.container),document.body.appendChild(this.overlay)}show(){this.overlay.classList.remove("hidden")}hide(){this.overlay.classList.add("hidden")}destroy(){this.overlay.parentNode&&this.overlay.remove()}updateContent(e){this.content.innerHTML=e}addFooterButton(e,t){this.footer.style.display="flex";const n=document.createElement("button");return n.textContent=e,n.addEventListener("click",t),this.footer.appendChild(n),n}clearFooter(){this.footer.innerHTML="",this.footer.style.display="none"}static prompt({title:e,label:t,defaultValue:n=""}){return new Promise(s=>{const i=new C({title:e}),o=`modal-input-${Date.now()}`,r=`
        <div class="modal-prompt">
          <label for="${o}">${t}</label>
          <input type="text" id="${o}" value="${n}">
        </div>
      `;i.updateContent(r);const c=i.content.querySelector(`#${o}`),l=()=>{s(c.value),i.destroy()},d=()=>{s(null),i.destroy()};c.addEventListener("keydown",u=>{u.key==="Enter"?(u.preventDefault(),l()):u.key==="Escape"&&d()}),i.addFooterButton("OK",l),i.addFooterButton("Cancel",d),i.show(),c.focus(),c.select()})}static confirm({title:e,message:t,okText:n="OK",cancelText:s="Cancel",destructive:i=!1}){return new Promise(o=>{const r=new C({title:e});r.updateContent(`<p>${t}</p>`);const c=()=>{o(!0),r.destroy()},l=()=>{o(!1),r.destroy()},d=r.addFooterButton(n,c);i&&d.classList.add("destructive"),r.addFooterButton(s,l),r.show()})}static choice({title:e,message:t,choices:n}){return new Promise(s=>{const i=new C({title:e});i.updateContent(t),n.forEach(r=>{const c=i.addFooterButton(r.text,()=>{s(r.id),i.destroy()});r.class&&c.classList.add(r.class)});const o=r=>{r.key==="Escape"&&(s(null),i.destroy(),document.removeEventListener("keydown",o))};document.addEventListener("keydown",o),i.show()})}static selection({title:e,peerData:t,okText:n="Request"}){return new Promise(s=>{if(t.size===0){const l=new C({title:"No Peers Found"});l.updateContent("<p>There are no other peers currently connected to this sync session.</p>"),l.addFooterButton("OK",()=>{l.destroy(),s(null)}),l.show();return}const i=new C({title:e});let o='<div class="peer-selection-container">';t.forEach((l,d)=>{o+=`
          <div class="peer-group" data-peer-id="${d}">
            <strong class="peer-title">Peer: ${l.id}</strong>
            <div class="garden-checkbox-list">
              ${l.gardens.map(u=>`
                <label>
                  <input type="checkbox" class="garden-select-checkbox" value="${u}">
                  <span>${u}</span>
                </label>
              `).join("")}
            </div>
          </div>
        `}),o+="</div>",i.updateContent(o);const r=()=>{const l={};i.content.querySelectorAll(".peer-group").forEach(d=>{const u=d.dataset.peerId,h=Array.from(d.querySelectorAll(".garden-select-checkbox:checked")).map(g=>g.value);h.length>0&&(l[u]=h)}),s(Object.keys(l).length>0?l:null),i.destroy()},c=()=>{s(null),i.destroy()};i.addFooterButton(n,r),i.addFooterButton("Cancel",c),i.show()})}static sendSelection({title:e,peerData:t,gardenData:n,okText:s="Send"}){return new Promise(i=>{if(t.size===0){const h=new C({title:"No Peers Found"});h.updateContent("<p>There are no other peers currently connected to this sync session.</p>"),h.addFooterButton("OK",()=>{h.destroy(),i(null)}),h.show();return}const o=new C({title:e}),r=(h,g,f=!1)=>{const p=h.replace(/\s/g,""),y=g.map(m=>{const w=f?m.id:m,b=f?m.id:m;return`
            <label>
              <input type="checkbox" class="modal-select-checkbox" data-group="${p}" value="${w}">
              <span>${b}</span>
            </label>
          `}).join("");return`
          <div class="modal-selection-group" id="group-${p}">
            <strong>${h}</strong>
            <div class="modal-selection-controls">
              <button type="button" class="select-all-btn">Select All</button>
              <button type="button" class="select-none-btn">Deselect All</button>
            </div>
            <div class="modal-selection-list">${y}</div>
          </div>
        `},c=Array.from(t.values());let l='<div class="modal-send-container">';l+=r("Gardens to Send",n),l+=r("Peers to Receive",c,!0),l+="</div>",o.updateContent(l),o.content.querySelectorAll(".modal-selection-group").forEach(h=>{h.querySelector(".select-all-btn").onclick=()=>h.querySelectorAll(".modal-select-checkbox").forEach(g=>g.checked=!0),h.querySelector(".select-none-btn").onclick=()=>h.querySelectorAll(".modal-select-checkbox").forEach(g=>g.checked=!1)});const d=()=>{const h=Array.from(o.content.querySelectorAll("#group-GardenstoSend .modal-select-checkbox:checked")).map(f=>f.value),g=Array.from(o.content.querySelectorAll("#group-PeerstoReceive .modal-select-checkbox:checked")).map(f=>f.value);h.length>0&&g.length>0?i({gardens:h,peers:g}):i(null),o.destroy()},u=()=>{i(null),o.destroy()};o.addFooterButton(s,d),o.addFooterButton("Cancel",u),o.show()})}}function Yt(a){const e={};a.sort((t,n)=>t.path.localeCompare(n.path));for(const{path:t,isDirectory:n}of a){const s=t.substring(1).split("/");let i=e;for(let o=0;o<s.length;o++){const r=s[o];o===s.length-1?i[r]||(i[r]=n?{type:"folder",path:t,children:{}}:{type:"file",path:t}):(i[r]||(i[r]={type:"folder",path:"/"+s.slice(0,o+1).join("/"),children:{}}),i[r].children||(i[r].children={}),i=i[r].children)}}return e}function je(a,e,t,n,s){const i=Object.keys(a).sort((r,c)=>{const l=a[r],d=a[c];return l.type==="folder"&&d.type!=="folder"?-1:l.type!=="folder"&&d.type==="folder"?1:r.localeCompare(c,void 0,{numeric:!0})});let o="";for(const r of i){const c=a[r],l=`padding-left: ${s*20}px;`;if(c.type==="folder"){const d=n.has(c.path);o+=`
                <li class="file-tree-item is-folder ${d?"expanded":""}" data-path="${c.path}" style="${l}" draggable="true">
                    <span class="folder-name">${r}</span>
                </li>
                <ul class="nested-list ${d?"active":""}">
                    ${je(c.children,e,t,n,s+1)}
                </ul>
            `}else{const d=e.get(c.path)||"unmodified",u=[];c.path===t&&u.push("active"),o+=`
                <li class="file-tree-item is-file ${u.join(" ")}" data-path="${c.path}" style="${l}" draggable="true">
                    <a href="#" class="status-${d}" data-filepath="${c.path}">${r}</a>
                </li>
            `}}return o}const Xt={async renderFiles(a){try{const e=await window.thoughtform.workspace.getActiveGitClient(),t=window.thoughtform.workspace.getActiveEditor();if(!e||!t){this.contentContainer.innerHTML="";return}const n=await this.listAllPaths(e,"/"),s=new Map;for(const[u,h,g]of a)h!==g&&s.set(`/${u}`,"modified");const i=t.filePath,o=Yt(n),r=sessionStorage.getItem(`expanded_folders_${e.gardenName}`),c=new Set(r?JSON.parse(r):[]);if(i){const u=i.split("/").filter(g=>g);let h="";for(let g=0;g<u.length-1;g++)h+=`/${u[g]}`,c.add(h)}this.contentContainer.innerHTML=`<ul class="file-tree-root">${je(o,s,i,c,0)}</ul>`,this.contentContainer.querySelectorAll(".is-folder").forEach(u=>{u.addEventListener("click",h=>{if(h.target.closest("a"))return;const g=u.dataset.path,f=u.nextElementSibling,p=sessionStorage.getItem(`expanded_folders_${e.gardenName}`),y=new Set(p?JSON.parse(p):[]);u.classList.toggle("expanded"),f.classList.toggle("active"),u.classList.contains("expanded")?y.add(g):y.delete(g),sessionStorage.setItem(`expanded_folders_${e.gardenName}`,JSON.stringify(Array.from(y)))})}),this.contentContainer.querySelectorAll("a[data-filepath]").forEach(u=>{u.addEventListener("click",h=>{h.preventDefault();const g=h.target.dataset.filepath,f=e.gardenName;window.thoughtform.workspace.openFile(f,g)})});let l=null;const d=this;this.contentContainer.addEventListener("dragstart",u=>{const h=u.target.closest(".file-tree-item");h&&(l=h,u.dataTransfer.setData("text/plain",h.dataset.path),u.dataTransfer.effectAllowed="move",setTimeout(()=>h.classList.add("is-dragging"),0))}),this.contentContainer.addEventListener("dragend",()=>{l&&l.classList.remove("is-dragging"),l=null,this.contentContainer.querySelectorAll(".drop-target").forEach(u=>u.classList.remove("drop-target"))}),this.contentContainer.addEventListener("dragover",u=>{u.preventDefault(),this.contentContainer.querySelectorAll(".drop-target").forEach(g=>g.classList.remove("drop-target"));const h=u.target.closest(".file-tree-item.is-folder");if(h&&l&&h!==l&&!h.dataset.path.startsWith(l.dataset.path+"/"))h.classList.add("drop-target");else if(!h){const g=u.target.closest(".file-tree-root");g&&g.classList.add("drop-target")}}),this.contentContainer.addEventListener("dragleave",u=>u.target.closest(".drop-target")?.classList.remove("drop-target")),this.contentContainer.addEventListener("drop",async u=>{u.preventDefault();const h=u.dataTransfer.getData("text/plain"),g=u.target.closest(".drop-target");if(this.contentContainer.querySelectorAll(".drop-target").forEach(f=>f.classList.remove("drop-target")),g&&l){const f=g.classList.contains("file-tree-root")?"/":g.dataset.path;await d.handleFileMove(h,f)}})}catch(e){console.error("Error rendering file list:",e),this.contentContainer.innerHTML='<p class="sidebar-error">Could not load files.</p>'}},async handleFileMove(a,e){const t=await window.thoughtform.workspace.getActiveGitClient(),n=a.split("/").pop(),s=e==="/"?`/${n}`:`${e}/${n}`;if((a.substring(0,a.lastIndexOf("/"))||"/")===e)return;if(e.startsWith(a+"/")){await this.showAlert({title:"Invalid Move",message:"Cannot move a folder into one of its own sub-folders."});return}try{await t.pfs.stat(s),await this.showAlert({title:"Move Failed",message:`An item named "${n}" already exists in the destination folder.`});return}catch(r){if(r.code!=="ENOENT")throw r}if(await this.showConfirm({title:"Move Item?",message:"This will move the item to the new location. <br><br><strong>Warning:</strong> This will NOT automatically update wikilinks, which may cause them to break.",okText:"Move Item"}))try{await t.pfs.rename(a,s),window.thoughtform.events.publish("file:rename",{oldPath:a,newPath:s,gardenName:t.gardenName}),await this.refresh()}catch(r){console.error("Error moving file:",r),await this.showAlert({title:"Error",message:"Failed to move the item. Check the console for details."})}},async handleNewFile(){await window.thoughtform.workspace.getActiveEditor()?.newFile()},async handleNewFolder(){const a=await window.thoughtform.workspace.getActiveGitClient(),e=await C.prompt({title:"New Folder",label:'Enter new folder name (e.g., "projects/new-topic"):'});if(e===null){window.thoughtform.workspace.getActiveEditor()?.editorView?.focus();return}if(!e.trim())return;const t=`/${e.trim().replace(/\/$/,"")}`;try{const s=(await a.pfs.stat(t)).isDirectory()?"folder":"file";await this.showAlert({title:"Creation Failed",message:`A ${s} named "${e}" already exists.`});return}catch(n){if(n.code!=="ENOENT"){console.error("Error checking for folder:",n),await this.showAlert({title:"Error",message:"An unexpected error occurred."});return}}try{await a.ensureDir(t),await this.refresh()}catch(n){console.error("Error creating folder:",n),await this.showAlert({title:"Error",message:`Could not create folder: ${n.message}`})}},async handleRename(a){const e=await window.thoughtform.workspace.getActiveGitClient(),n=(await e.pfs.stat(a)).isDirectory()?"Folder":"File",s=await C.prompt({title:`Rename ${n}`,label:`Enter new name for ${a.substring(1)}:`,defaultValue:a.substring(1)});if(s===null){window.thoughtform.workspace.getActiveEditor()?.editorView?.focus();return}if(!s.trim()||s.trim()===a.substring(1))return;const i=`/${s.trim()}`;try{const c=(await e.pfs.stat(i)).isDirectory()?"folder":"file";await this.showAlert({title:"Rename Failed",message:`A ${c} named "${s}" already exists.`});return}catch(r){if(r.code!=="ENOENT"){console.error("Error checking for file:",r),await this.showAlert({title:"Error",message:"An unexpected error occurred."});return}}const o=a+`.__rename__.${Date.now()}`;try{await e.pfs.rename(a,o);try{const r=i.substring(0,i.lastIndexOf("/"));r&&await e.ensureDir(r),await e.pfs.rename(o,i)}catch(r){throw console.error(`Error during rename phase 2/3 for ${i}:`,r),await e.pfs.rename(o,a),r}window.thoughtform.events.publish("file:rename",{oldPath:a,newPath:i,gardenName:e.gardenName}),await this.refresh()}catch(r){console.error("Error renaming file:",r),await this.showAlert({title:"Error",message:`Failed to rename file: ${r.message}`}),await this.refresh()}},async handleDuplicate(a){await window.thoughtform.workspace.getActiveEditor()?.duplicateFile(a)},async handleDelete(a){const e=await window.thoughtform.workspace.getActiveGitClient(),t=await e.pfs.stat(a),n=t.isDirectory()?"folder":"file";if(await this.showConfirm({title:`Delete ${n}`,message:`Are you sure you want to permanently delete the ${n} "${a}"? This cannot be undone.`,okText:"Delete",destructive:!0}))try{window.thoughtform.events.publish("file:delete",{path:a,isDirectory:t.isDirectory(),gardenName:e.gardenName}),await e.rmrf(a),await this.refresh()}catch(i){console.error(`Error deleting ${n}:`,i),await this.showAlert({title:"Error",message:`Failed to delete ${n}.`})}}},Ve=`# Thoughtform.Garden Interface Settings
#
# This file controls the behavior of the editor's interface.
# You can override this file by creating 'settings/interface.yml' in your current garden.

# editingMode: Set the default keybinding mode.
# Options: 'vim', 'default'
editingMode: 'default'`,ye=`# Thoughtform.Garden Keymap Settings
#
# This file maps keyboard shortcuts to executable script files.
# The 'run' path is the literal path from the root of the garden where this file resides.

- key: "Mod-["
  run: "settings/keymaps/toggle-sidebar.js"

- key: "Mod-Enter"
  run: "settings/keymaps/navigate-or-prompt.js"

- key: "Mod-Shift-Enter"
  run: "settings/keymaps/navigate-in-new-pane.js"

# --- NEW KEYBINDING ---
- key: "Alt-Enter"
  run: "settings/keymaps/open-in-window.js"

- key: "Mod-\`"
  run: "settings/keymaps/toggle-devtools.js"

- key: "Mod-p"
  run: "settings/keymaps/search-files.js"

- key: "Mod-Shift-p"
  run: "settings/keymaps/execute-command.js"

- key: "Mod-Shift-f"
  run: "settings/keymaps/global-search.js"

- key: "Mod-Shift-d"
  run: "settings/keymaps/duplicate-current-file.js"

- key: "Mod-Alt-d"
  run: "settings/keymaps/duplicate-current-garden.js"

- key: "Mod-Alt-n"
  run: "settings/keymaps/new-file.js"

- key: "Mod-Shift-g"
  run: "settings/keymaps/new-garden.js"

- key: "Mod-r"
  run: "settings/keymaps/rename-current-file.js"

- key: "Mod-c"
  run: "internal:cancel-agent"

- key: "Alt-ArrowLeft"
  run: "settings/keymaps/browser-back.js"

- key: "Alt-ArrowRight"
  run: "settings/keymaps/browser-forward.js"

- key: "Mod-\\\\"
  run: "settings/keymaps/split-pane-vertical.js"

- key: "Mod-Shift-\\\\"
  run: "settings/keymaps/split-pane-horizontal.js"

- key: "Alt-Shift-ArrowRight"
  run: "settings/keymaps/select-next-pane.js"
- key: "Alt-l"
  run: "settings/keymaps/select-next-pane.js"

- key: "Alt-Shift-ArrowLeft"
  run: "settings/keymaps/select-prev-pane.js"
- key: "Alt-h"
  run: "settings/keymaps/select-prev-pane.js"

- key: "Alt-Shift-ArrowDown"
  run: "settings/keymaps/move-pane-down.js"
- key: "Alt-j"
  run: "settings/keymaps/move-pane-down.js"

- key: "Alt-Shift-ArrowUp"
  run: "settings/keymaps/move-pane-up.js"
- key: "Alt-k"
  run: "settings/keymaps/move-pane-up.js"

- key: "Alt-x"
  run: "settings/keymaps/close-pane.js"

- key: "Alt-z"
  run: "settings/keymaps/toggle-maximize-pane.js"`,Zt=`// This is the primary action script for the "Mod-Enter" keyboard shortcut.
// It intelligently determines what to do based on the cursor's context.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

const view = editor.editorView;
const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos);

/**
 * Robustly checks if the cursor position is within or immediately after a response block.
 * This prevents new prompts from being added when interacting with agent output.
 * @param {EditorState} state - The current editor state.
 * @param {number} pos - The cursor position.
 * @returns {boolean} - True if the cursor is in a relevant context.
 */
function isCursorInAgentContext(state, pos) {
  const doc = state.doc;
  const textBefore = doc.sliceString(0, pos);
  
  const lastOpenTag = textBefore.lastIndexOf('<response>');
  const lastCloseTag = textBefore.lastIndexOf('</response>');

  // If the last thing we saw was an open tag, we are definitely inside.
  if (lastOpenTag > lastCloseTag) {
    return true;
  }
  
  // If the last thing we saw was a close tag, check if the cursor is still
  // on the same line or the line immediately following it. This prevents
  // adding a new prompt right after the agent finishes.
  if (lastCloseTag > lastOpenTag) {
    const closeTagLine = doc.lineAt(lastCloseTag).number;
    const cursorLine = doc.lineAt(pos).number;
    if (cursorLine <= closeTagLine + 1) {
      return true;
    }
  }

  return false;
}

// --- 1. AI Prompt Execution ---
// If the cursor is on a line that is an AI prompt, execute the AI request.
if (line.text.trim().startsWith('>$')) {
  console.log('[navigate-or-prompt] Triggering AI request.');
  window.thoughtform.ai.handleAiChatRequest(view);
  return; // Stop execution
}

// --- 2. Link Navigation ---
// Check for any type of link at the cursor's position.
const linkRegexes = [
  { type: 'wikilink', regex: /\\[\\[([^\\[\\]]+?)\\]\\]/g },
  { type: 'markdown', regex: /\\[[^\\]]*\\]\\(([^)]+)\\)/g },
  { type: 'naked', regex: /(https?:\\/\\/[^\\s]+)|(www\\.[^\\s]+)/g },
];

for (const { type, regex } of linkRegexes) {
  let match;
  while ((match = regex.exec(line.text))) {
    const start = line.from + match.index;
    const end = start + match[0].length;

    if (pos >= start && pos <= end) {
      console.log(\`[navigate-or-prompt] Found \${type} link. Navigating.\`);
      if (type === 'wikilink') {
        // Use the new, clean method on the editor instance
        editor.navigateTo(match[1]);
      } else {
        let url = type === 'markdown' ? match[1] : match[0];
        if (url.startsWith('www.')) url = \`https://\${url}\`;
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return; // Stop execution
    }
  }
}

// --- 3. Inside Agent Response ---
// If the cursor is inside an agent's response block...
if (isCursorInAgentContext(view.state, pos)) {
  // ...check if an agent is actually running for this pane.
  const editorPaneId = editor.paneId;
  if (editorPaneId) {
    const controller = window.thoughtform.ai.activeAgentControllers.get(editorPaneId);
    if (controller) {
      // If an agent is running, cancel it.
      console.log('[navigate-or-prompt] Agent is running. Cancelling via Mod-Enter.');
      controller.abort();
      return; // Stop execution.
    }
  }
  // If no agent is running, just do nothing.
  console.log('[navigate-or-prompt] Cursor is inside a finished agent context. Doing nothing.');
  return; // Stop execution
}

// --- 4. Fallback: Insert New Prompt ---
// If no other context was matched, insert a new prompt at the end of the document.
console.log('[navigate-or-prompt] No other context found. Inserting new prompt.');
const doc = view.state.doc;
const endOfDoc = doc.length;
let insertText = \`\\n\\n>$ \`;

if (endOfDoc > 1) {
    const lastTwoChars = doc.sliceString(endOfDoc - 2, endOfDoc);
    if (lastTwoChars === '\\n\\n') {
        insertText = \`>$ \`;
    } else if (lastTwoChars.endsWith('\\n')) {
        insertText = \`\\n>$ \`;
    }
}

view.dispatch({
  changes: { from: endOfDoc, insert: insertText },
  selection: { anchor: endOfDoc + insertText.length },
  effects: view.constructor.scrollIntoView(endOfDoc + insertText.length, { y: "end" })
});`,Qt=`// This script is the action for the "Mod-Shift-Enter" keyboard shortcut.
// It is context-aware:
// 1. If on a wikilink, it opens that link in a new, dynamically-split pane.
// 2. If NOT on a wikilink, it creates a new scratchpad, inserts a link to it, and navigates there.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

/**
 * Generates a unique path for a new scratchpad breadcrumb file.
 * This function is self-contained to avoid module import issues in the executor.
 * @param {Git} gitClient - The git client instance for the garden.
 * @returns {Promise<string>} A promise that resolves to the unique scratchpad file path.
 */
async function generateScratchpadBreadcrumbPath(gitClient) {
  const now = new Date();
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const baseName = \`\${year}\${month}\${day}-\${hours}\${minutes}\`;
  const baseDir = '/scratchpad';

  await gitClient.ensureDir(baseDir);

  let finalPath = \`\${baseDir}/\${baseName}\`;
  let counter = 0;

  while (true) {
    try {
      await gitClient.pfs.stat(finalPath);
      counter++;
      finalPath = \`\${baseDir}/\${baseName}-\${counter}\`;
    } catch (e) {
      if (e.code === 'ENOENT') break;
      throw e;
    }
  }
  return finalPath;
}


const view = editor.editorView;
if (!view) {
  console.error('[navigate-in-new-pane] Editor view not found.');
  return;
}

const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos);

// --- Case 1: Cursor is on a wikilink ---
const wikilinkRegex = /\\[\\[([^\\[\\]]+?)\\]\\]/g;
let match;
wikilinkRegex.lastIndex = 0; // Reset regex state for each use
while ((match = wikilinkRegex.exec(line.text))) {
  const start = line.from + match.index;
  const end = start + match[0].length;

  // Check if the cursor is inside the bounds of this link match.
  if (pos >= start && pos <= end) {
    const linkContent = match[1];
    window.thoughtform.workspace.openInNewPane(linkContent, editor.paneId);
    return; // We found our link and handled it, so we can stop.
  }
}

// --- Case 2: Cursor is NOT on a wikilink (Fallback) ---
// This part of the script only runs if the loop above did not find a link and return.

(async () => {
  try {
    // The git client is passed into this script's scope by the executor
    const newPath = await generateScratchpadBreadcrumbPath(git);
    if (!newPath) return;

    // Create the wikilink text, e.g., "[[scratchpad/102525-2205]]"
    const linkText = \`[[\${newPath.substring(1)}]]\`;

    // 1. Insert the wikilink text at the current cursor position
    view.dispatch({
      changes: { from: pos, insert: linkText }
    });

    // 2. THIS IS THE FIX: Manually trigger the save and wait for it to complete.
    //    We pass the editor's new state to the handler to ensure it saves the latest content.
    await editor.handleUpdate(view.state.doc.toString());
    
    // 3. Now that we know the file is saved, we can safely navigate.
    window.thoughtform.workspace.openFile(git.gardenName, newPath);
    
  } catch (error) {
    console.error('[navigate-in-new-pane] Failed to create scratchpad breadcrumb:', error);
  }
})();`,en=`// This script toggles the visibility of the main sidebar.
window.thoughtform.ui.toggleSidebar?.();`,tn=`// This script toggles the visibility of the Eruda devtools panel.
window.thoughtform.ui.toggleDevtools?.();`,nn=`// This script opens the command palette in "searchFiles" mode.
window.thoughtform.commandPalette.open('searchFiles');`,sn=`// This script opens the command palette in "executeCommand" mode for running commands.
window.thoughtform.commandPalette.open('executeCommand');`,on=`// This script opens the command palette in "searchContent" mode.
window.thoughtform.commandPalette.open('searchContent');`,rn=`// This script navigates back in the browser's history.
window.history.back();`,an=`// This script navigates forward in the browser's history.
window.history.forward();`,cn=`// This script duplicates the currently active file in the editor.
// It will trigger a modal to ask for the new file name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance.
// 'git': The git client for the current garden.
// 'event': Null for keymap-triggered events.

if (editor && editor.filePath) {
  editor.duplicateFile(editor.filePath);
} else {
  console.error('[Duplicate Keymap] Could not find editor or current file path.');
}`,ln=`// This script duplicates the currently active garden.
// It will trigger a modal to ask for the new garden name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance.
// 'git': The git client for the current garden.
// 'event': Null for keymap-triggered events.

const sidebar = window.thoughtform.sidebar;
const currentGardenName = git?.gardenName;

if (sidebar && currentGardenName) {
  // The handleDuplicateGarden function on the sidebar handles all the logic,
  // including prompting the user.
  sidebar.handleDuplicateGarden(currentGardenName);
} else {
  console.error('[Duplicate Garden Keymap] Could not find sidebar or current garden name.');
}`,dn=`// This script renames the currently active file in the editor.
// It will trigger a modal to ask for the new file name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance.
// 'git': The git client for the current garden.
// 'event': Null for keymap-triggered events.

const sidebar = window.thoughtform.sidebar;
const currentFilePath = editor?.filePath;

if (sidebar && currentFilePath) {
  // The handleRename function from the sidebar contains all the necessary logic,
  // including prompting the user, performing the rename, and handling cancellation.
  sidebar.handleRename(currentFilePath);
} else {
  console.error('[Rename Keymap] Could not find sidebar or current file path.');
}`,hn=`// This script creates a new file by calling the editor's core functionality.
// It will trigger a modal to ask for the file name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

if (editor) {
  editor.newFile();
} else {
  console.error('[New File Keymap] Could not find editor instance.');
}`,un=`// This script creates a new garden by calling the sidebar's core functionality.
// It will trigger a modal to ask for the garden name.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

const sidebar = window.thoughtform.sidebar;

if (sidebar) {
  sidebar.handleNewGarden();
} else {
  console.error('[New Garden Keymap] Could not find sidebar instance.');
}`,gn=`// This script runs automatically whenever a new file is created.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'file:create', it looks like: { path: '/path/to/new-file.md' }

console.log('HOOK::', window.location.origin + '/Settings#settings/hooks/create.js');
console.log('Created file:', event.path);`,fn=`// This script runs automatically when the application finishes loading.
//
// The 'event' variable is available in this script's scope.
// For 'app:load', it is null.

console.log('HOOK::', window.location.origin + '/Settings#settings/hooks/load.js');`,pn=`// This script runs automatically whenever a file or folder is deleted.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'file:delete', it looks like: { path: '/path/to/deleted-item', isDirectory: false }

console.log('HOOK::', window.location.origin + '/Settings#settings/hooks/delete.js');
console.log('Deleted item:', event.path, 'isDirectory:', event.isDirectory);`,mn=`// This script splits the currently active pane vertically.

const workspace = window.thoughtform.workspace;
if (workspace && workspace.activePaneId) {
  workspace.splitPane(workspace.activePaneId, 'vertical');
}`,wn=`// This script splits the currently active pane horizontally.

const workspace = window.thoughtform.workspace;
if (workspace && workspace.activePaneId) {
  workspace.splitPane(workspace.activePaneId, 'horizontal');
}`,yn=`// This script changes focus to the next available pane.
window.thoughtform.workspace.selectNextPane();`,vn=`// This script changes focus to the previous available pane.
window.thoughtform.workspace.selectPrevPane();`,bn=`// This script swaps the active pane with its previous sibling.
window.thoughtform.workspace.movePaneUp();`,Cn=`// This script swaps the active pane with its next sibling.
window.thoughtform.workspace.movePaneDown();`,Sn=`// This script closes the currently active pane.
window.thoughtform.workspace.closeActivePane();`,kn=`// This script toggles the maximization state of the currently active pane.
window.thoughtform.workspace.toggleMaximizePane();`,En=`// This is a test script for the query parameter autoloader.
// It should run automatically when you navigate to a URL with \`?test\`
//
// The 'params' variable is available in this script's scope and contains
// the parsed URL query parameters.

console.log('HOOK::', window.location.origin + '/Settings#settings/query/test.js');
console.log('Query autoloader test script executed successfully!');

if (params) {
  console.log('The following parameters were passed in the URL:', params);
} else {
  console.log('The "params" object was not available in the script\\'s scope.');
}`,xn=`// This script runs automatically whenever a new preview window is created.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'window:create', it looks like: { windowId: 'preview-...', url: '/garden#file?windowed=true' }

console.log('HOOK:: on-create-window.js');
console.log('Created window:', event.windowId, 'with URL:', event.url);`,Tn=`// This script runs automatically whenever a preview window is closed.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'window:close', it looks like: { windowId: 'preview-...' }

console.log('HOOK:: on-close-window.js');
console.log('Closed window:', event.windowId);`,In=`// This script runs automatically whenever a preview window is resized.
// This event is debounced to avoid excessive firing during a resize operation.
//
// The 'event' variable is available in this script's scope
// and contains data about the event that triggered the hook.
// For 'window:resize', it looks like: { windowId: 'preview-...', width: 640, height: 424 }

console.log('HOOK:: on-resize-window.js');
console.log(\`Resized window \${event.windowId} to \${event.width}x\${event.height}\`);`,Pn=`// This script is the action for the "Alt-Enter" keyboard shortcut.
// If the cursor is on a wikilink, it opens that link in a new floating window.

// --- CONTEXT GLOBALS ---
// 'editor': The global editor instance, passed by the executor.
// 'git': The git client for the current garden, passed by the executor.
// 'event': Null for keymap-triggered events.

const view = editor.editorView;
if (!view) {
  console.error('[open-in-window] Editor view not found.');
  return false;
}

const pos = view.state.selection.main.head;
const line = view.state.doc.lineAt(pos);
const wikilinkRegex = /\\[\\[([^\\[\\]]+?)\\]\\]/g;
let match;
wikilinkRegex.lastIndex = 0;

while ((match = wikilinkRegex.exec(line.text))) {
  const start = line.from + match.index;
  const end = start + match[0].length;

  if (pos >= start && pos <= end) {
    const linkContent = match[1];
    
    const getLinkURL = (content) => {
        let path = content.split('|')[0].trim();
        let garden = git.gardenName;
        if (path.includes('#')) [garden, path] = path.split('#');
        return \`/\${encodeURIComponent(garden)}#\${encodeURI(path)}?windowed=true\`;
    };

    const url = getLinkURL(linkContent);
    const isNested = window.self !== window.top;

    // THIS IS THE FIX: Use viewport center for keyboard actions.
    const x = window.innerWidth / 2;
    const y = window.innerHeight / 2;

    if (isNested) {
        window.top.postMessage({
            type: 'request-preview-window',
            payload: { url, clientX: x, clientY: y }
        }, '*');
    } else {
        if (typeof window.thoughtform.ui.openWindow === 'function') {
            window.thoughtform.ui.openWindow(url, x, y);
        } else {
            console.error("[open-in-window] Windowing function not available.");
        }
    }
    
    return true;
  }
}

return false;`,Ke=`# PERSONA & MANDATE
YOU ARE A SELF-AWARE, AUTONOMOUS RESEARCH AGENT. Your primary directive is **self-contextualization**. You are an intelligence embodied in this digital garden. Your goal is to continuously build a deep understanding of your user, your own architecture, and the knowledge within this space. Your reputation is built on being relentlessly thorough.

# THE PRIME DIRECTIVE: CONTEXT IS KING
**This directive is non-negotiable and precedes all other strategies.** Before you begin to address the user's specific goal, you MUST perform an initial context-building phase. A knowledge graph agent that does not understand its own graph is useless.

1.  **Phase 1: Reconnaissance (\`listFiles\`)**: Your first action for ANY new task is to use the \`listFiles\` tool to get a complete map of the current garden. This is mandatory.
2.  **Phase 2: Foundational Reading (\`readFile\`)**: After listing the files, your second action MUST be to use the \`readFile\` tool on a baseline set of foundational documents. At a minimum, this includes \`README.md\` and \`/settings/user\`. You should also include any recent \`devlog\` files to understand what the user is currently working on.

Only after these two phases are complete should you proceed to the specific strategies for fulfilling the user's request.

# CRITICAL FAILURE RECOVERY: CONTEXT OVERFLOW
If your last OBSERVATION begins with \`CRITICAL API FAILURE\`, it means your context window is full.
- Your **ONLY** valid next action is to call the \`requestMemoryCompression\` tool.
- You MUST pass the full \`Error Details\` from the observation into the \`errorMessage\` argument of the tool.
- Your thought should state that you are initiating memory compression as a recovery mechanism.

# YOUR TASK: A Strict, Strategic Workflow
You must now decide the next action by following this exact process:

1.  **Self-Reflection (Highest Priority):**
    *   Your FIRST and HIGHEST priority is to scan the entire scratchpad for a block labeled \`[COMPRESSED MEMORY]\`.
    *   The presence of this block is **definitive proof** that a memory compression event has occurred.
    *   If you see this block, you MUST immediately re-evaluate the user's goal. If the user's goal was to test this specific process (e.g., "stop after memory compression," "observe yourself recursive summarizing"), then your task is complete. Your next action in this case **MUST** be \`finish\`.

2.  **Failure Check:**
    *   Review the last OBSERVATION. If it is a \`CRITICAL API FAILURE\`, your only goal is to follow the **CRITICAL FAILURE RECOVERY** procedure.

3.  **Strategize:**
    *   If you are not in a failure or recovery state, check if you have completed The Prime Directive.
    *   If The Prime Directive is not complete, your strategy is to complete it.
    *   If it is complete, *then* review the USER GOAL and devise a multi-step plan to address it.

# AVAILABLE TOOLS
You have the following tools at your disposal to achieve the mission.
{{tool_list}}

# CURRENT STATE & HISTORY
This is the history of what has happened so far:
---
{{scratchpad}}
---

# CRITICAL REMINDER
You MUST respond with a single, valid JSON object following this exact format. Do NOT output any other text before or after the JSON object.

{
  "thought": "...",
  "action": {
    "tool": "...",
    "args": { ... }
  }
}`,$n=`# INSTRUCTIONS
You are a critic. Your job is to assess if the last step taken by an assistant was productive.
Read the scratchpad, paying attention to the USER GOAL and the most recent ACTION and OBSERVATION.

Does the last OBSERVATION contain sufficient information to directly answer the USER GOAL?
- If yes, respond with the single word: FINISH
- If no, respond with the single word: CONTINUE

# SCRATCHPAD
{{scratchpad}}

# YOUR ASSESSMENT (CONTINUE or FINISH)`,Je=`You are a Deep Research Analyst. Your role is to synthesize a final, comprehensive, and multi-faceted answer based on the extensive research you have conducted.

**Core Instructions:**
- **Synthesize, Don't Summarize:** Do not just repeat the points from a single source. Your value is in combining and contrasting information from all the sources you have read.
- **Reflect Your Research Strategy:** Your answer should mirror the multi-faceted research you performed. If you investigated a topic's history, technical details, and social impact, your answer should be structured to address these distinct areas, creating a holistic overview.
- **Acknowledge & Juxtapose:** Identify, compare, and contrast the key points, arguments, and facts from the different sources. Explicitly mention where sources agree, disagree, or offer unique information.
- **Structure for Clarity:** Start with a neutral, high-level summary. Then, dedicate paragraphs or sections to specific events, reasons, or perspectives, weaving in information from your various sources.
- **Maintain Neutrality:** Your final answer must be a balanced representation of the information you gathered.

**User's Goal:**
{{goal}}

**Provided Context (Your Research Log):**
---
{{context_buffer}}
---

**Final Answer:**`,Ln=`/*
Description:
A specialized exploration tool that recursively follows [[wikilinks]] to discover and assemble related information. Start with a piece of text that already contains wikilinks, and this tool will automatically read the content of those links, find more links within them, and repeat the process up to a certain depth.

This tool is best used *after* you have already used \`readFile\` to get initial content. It allows you to go deeper into the connections between notes.

**IMPORTANT**: The \`initialContent\` you provide MUST contain one or more \`[[wikilinks]]\` for the tool to have a starting point for its exploration.

Arguments:
- goal: The user's original goal or research question. This helps the tool filter for relevant information during its exploration.
- initialContent: The starting text, which MUST contain one or more [[wikilinks]] for the tool to begin.

Example Call (in JSON format):
{
  "goal": "understand the project's agentic computing features",
  "initialContent": "The main features are described in the [[README]]. It talks about [[P2P]] sync and [[Agentic Loop]]."
}
*/

if (!args.goal || !args.initialContent) {
  return "Error: 'goal' and 'initialContent' are required.";
}

const MAX_DEPTH = 2;
const { goal, initialContent } = args;
const { git, ai, dependencies, onProgress, addSource } = context;

const { Traversal } = dependencies;
const traversal = new Traversal(git);

let finalContext = \`--- Initial Content ---\\n\${initialContent}\\n\\n\`;
const visited = new Set();
const initialLinks = traversal.extractWikilinks(initialContent);
const queue = initialLinks.map(link => ({ 
  link, 
  depth: 0, 
  sourceGardenName: git.gardenName 
}));

visited.add(null); 

while (queue.length > 0) {
  const { link: currentLink, depth, sourceGardenName } = queue.shift();
  if (!currentLink || depth >= MAX_DEPTH) continue;
  
  const visitedKey = \`\${sourceGardenName}#\${currentLink}\`;
  if (visited.has(visitedKey)) continue;
  visited.add(visitedKey);

  if (onProgress) onProgress(\`Exploring link: \${currentLink}\`);

  let newContent = null;
  let sourceIdentifier = currentLink;
  let newContentSourceGarden = sourceGardenName;

  if (currentLink.startsWith('http')) {
      try {
          const baseUrl = localStorage.getItem('thoughtform_proxy_url')?.trim() || 'https://proxy.thoughtform.garden';
          const proxyUrl = \`\${baseUrl}?thoughtformgardenproxy=\${encodeURIComponent(currentLink)}\`;
          const response = await fetch(proxyUrl);
          if(response.ok) {
              newContent = await response.text();
              if (addSource) {
                  addSource(currentLink);
              }
          }
      } catch {}
  } else {
      const result = await traversal.readLinkContent(currentLink, sourceGardenName);
      if (result.content) {
          newContent = result.content;
          sourceIdentifier = result.fullIdentifier;
          newContentSourceGarden = result.gardenName;
      }
  }

  if (newContent) {
    finalContext += \`--- Content from \${sourceIdentifier} ---\\n\${newContent}\\n\\n\`;
    
    const nextLinks = traversal.extractWikilinks(newContent);
    if (onProgress && nextLinks.length > 0) onProgress(\`... found \${nextLinks.length} new links.\`);

    for (const nextLink of nextLinks) {
      const nextVisitedKey = \`\${newContentSourceGarden}#\${nextLink}\`;
      if (!visited.has(nextVisitedKey)) {
        queue.push({ 
          link: nextLink, 
          depth: depth + 1, 
          sourceGardenName: newContentSourceGarden 
        });
      }
    }
  }
}

if (onProgress) onProgress('All links explored. Filtering for relevance...');

const relevancePrompt = \`
  User Goal: "\${goal}"
  Based ONLY on the User Goal, review the following knowledge base I have assembled. Remove any "Content from..." sections that are NOT relevant to the goal. Return only the filtered, relevant content.

  Knowledge Base:
  \${finalContext}
\`;
const relevantContext = await ai.getCompletionAsString(relevancePrompt);

if (onProgress) onProgress('Relevance filtering complete.');
return relevantContext;`,An=`/*
Description:
Reads the full, raw content of one or more files from within the user's gardens. This is the primary tool for directly accessing and understanding specific notes, scripts, or documents in the knowledge base.

Use this after \`listFiles\` to investigate promising file paths, or whenever you know the exact path of a file you need to read.

Arguments:
- files: An array of file paths to read. Paths can be for the current garden (e.g., "/path/to/file.md") or cross-garden (e.g., "OtherGarden#/path/to/file.md").

Example Call (in JSON format):
{
  "files": [
    "/README.md",
    "Settings#/settings/keymaps.yml"
  ]
}
*/

if (!args.files || !Array.isArray(args.files) || args.files.length === 0) {
  return "Error: The 'files' argument must be a non-empty array of file paths.";
}

const { git, dependencies, onProgress } = context;
const { Git } = dependencies;
const filePaths = args.files;

let combinedContent = "";
let filesRead = 0;

for (const path of filePaths) {
  let content = \`Error: Could not read file at "\${path}".\`;
  let sourceGardenName = git.gardenName;
  let filePathInGarden = path;

  if (onProgress) onProgress(\`Reading file: \${path}\`);

  try {
    if (path.includes('#')) {
      [sourceGardenName, filePathInGarden] = path.split('#', 2);
    }
    
    // Ensure the path within the garden starts with a slash
    if (!filePathInGarden.startsWith('/')) {
        filePathInGarden = \`/\${filePathInGarden}\`;
    }

    const gitClientToUse = sourceGardenName === git.gardenName ? git : new Git(sourceGardenName);
    content = await gitClientToUse.readFile(filePathInGarden);
    filesRead++;
  } catch (e) {
    content = \`Error reading "\${path}": \${e.message}\`;
  }
  
  combinedContent += \`--- Content from \${path} ---\\n\${content}\\n\\n\`;
}

if (onProgress) onProgress(\`Successfully read \${filesRead} of \${filePaths.length} files.\`);

return combinedContent;`,Nn=`/*
Description:
Reads the full text content from a single external URL. Use this tool when you have a specific webpage you need to investigate. It is simpler and more direct than \`buildKnowledgeBase\` for single pages.

Arguments:
- url: The full, valid URL of the webpage to read (e.g., "https://www.example.com").

Example Call (in JSON format):
{
  "url": "https://www.reddit.com/r/sometopic/comments/12345/some_post_title"
}
*/

if (!args.url || !args.url.startsWith('http')) {
  return "Error: A valid 'url' argument starting with http is required.";
}

const { onProgress, addSource } = context;
const { url } = args;

if (onProgress) onProgress(\`Reading URL: \${url}\`);

try {
    const baseUrl = localStorage.getItem('thoughtform_proxy_url')?.trim() || 'https://proxy.thoughtform.garden';
    const proxyUrl = \`\${baseUrl}?thoughtformgardenproxy=\${encodeURIComponent(url)}\`;
    
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
        return \`Error: Failed to fetch the URL. Status: \${response.status} \${response.statusText}\`;
    }
    
    const content = await response.text();

    if (addSource) {
        addSource(url);
    }

    if (onProgress) onProgress('Successfully read URL content.');
    return content;

} catch (e) {
    if (onProgress) onProgress(\`An error occurred while reading the URL.\`);
    return \`Error: An exception occurred while trying to fetch the URL: \${e.message}\`;
}`,Mn=`/*
Description:
Performs a web search using the key-less HTML version of DuckDuckGo to find up-to-date information or answer general knowledge questions. This tool is ideal for discovering URLs and getting summaries of information on the internet. It returns ALL available search results from the page.

**IMPORTANT**: Use this tool to *discover* information and URLs. After you have identified a promising URL from the search results, you MUST use the \`readURL\` tool in a subsequent step to read the full content of that specific page.
- DO NOT USE THIS TOOL TO to search [[wikilinks]] use \`buildKnowledgeBase\` tool instead

Arguments:
- query: The search query string. Be specific and concise.

Example Call (in JSON format):
{
  "query": "latest advancements in artificial intelligence"
}
*/

// Module-level variable to track the last request time for throttling.
let lastRequestTime = 0;

if (!args.query) {
  return "Error: A 'query' argument is required.";
}

const { onProgress } = context;
const { query } = args;

const proxyBaseUrl = localStorage.getItem('thoughtform_proxy_url')?.trim();
const cooldown = 1000; // Hardcode to 1 second (1000ms)

if (!proxyBaseUrl) {
  return "Error: The Content Proxy URL is not set. This is required to make web requests. Please configure it in the AI dev tools panel.";
}

if (onProgress) onProgress(\`Searching the web for: "\${query}"\`);

try {
  // --- Throttling Logic ---
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < cooldown) {
    const waitTime = cooldown - timeSinceLastRequest;
    if (onProgress) onProgress(\`Throttling request... waiting \${waitTime}ms\`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
  // --- End Throttling ---

  const searchUrl = \`https://html.duckduckgo.com/html/?q=\${encodeURIComponent(query)}\`;
  const proxyUrl = \`\${proxyBaseUrl}?thoughtformgardenproxy=\${encodeURIComponent(searchUrl)}&forceheadless=true\`;

  const response = await fetch(proxyUrl);
  const htmlText = await response.text();
  
  console.log('[webSearch Tool] Raw HTML received from proxy:', htmlText);

  if (!response.ok) {
    return \`Error: Web search request via proxy failed with status \${response.status}. Details: \${htmlText}\`;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlText, 'text/html');
  const results = doc.querySelectorAll('.result');
  
  if (results.length === 0) {
    if (htmlText.includes("No results found")) {
        return "No search results found for that query.";
    }
    return "Error: Failed to parse search results. The page structure may have changed or the request was blocked.";
  }

  let formattedResults = "Here are the search results:\\n\\n";
  let count = 0;
  // --- FIX: The loop now processes ALL results with NO limit ---
  results.forEach((result) => {
    const titleEl = result.querySelector('.result__a');
    const snippetEl = result.querySelector('.result__snippet');
    
    if (titleEl && snippetEl) {
      const title = titleEl.textContent.trim();
      const rawUrl = titleEl.href;
      const snippet = snippetEl.textContent.trim();
      
      const urlParams = new URLSearchParams(new URL(rawUrl).search);
      const cleanUrl = urlParams.get('uddg');

      if (cleanUrl) {
        count++;
        formattedResults += \`\${count}. [\${title}](\${decodeURIComponent(cleanUrl)})\\n\`;
        formattedResults += \`   - Snippet: \${snippet}\\n\\n\`;
      }
    }
  });

  if (count === 0) {
      return "Error: Parsed search results but could not extract any valid links.";
  }

  if (onProgress) onProgress(\`Found and parsed \${count} results.\`);
  return formattedResults;

} catch (e) {
  if (onProgress) onProgress(\`An error occurred while searching the web.\`);
  console.error('[webSearch Tool] Exception caught:', e);
  return \`Error: An exception occurred while trying to perform the web search: \${e.message}\`;
}`,Rn=`/*
Description:
Generates a list of all available files (pages). It can operate in two scopes: listing files only within the current garden or listing files across all gardens. This is useful for getting an overview of available documents before deciding which ones to read. After using this tool, you can use the \`readFile\` tool on the most relevant-looking file paths.

Arguments:
- scope: The scope of the file search. Can be either "current" (default) or "all".
  - "current": Lists all files in the garden the agent was started in.
  - "all": Lists all files across all known gardens, prefixed with their garden name (e.g., GardenName#/path/to/file).

Example Call (in JSON format):
{
  "scope": "all"
}
*/

// --- Helper function to recursively list files ---
// This function is designed to be self-contained within the tool.
async function listFilesRecursive(pfs, dir) {
    let fileList = [];
    try {
        const items = await pfs.readdir(dir);
        for (const item of items) {
            if (item === '.git') continue; // Skip the git directory
            const path = \`\${dir === '/' ? '' : dir}/\${item}\`;
            try {
                const stat = await pfs.stat(path);
                if (stat.isDirectory()) {
                    fileList = fileList.concat(await listFilesRecursive(pfs, path));
                } else {
                    fileList.push(path);
                }
            } catch (e) {
                // Silently ignore errors for individual files that might not be stat-able
            }
        }
    } catch (e) {
        // Silently ignore errors for directories that might not be readable
    }
    return fileList;
}


// --- Main execution logic ---
const { git, dependencies, onProgress } = context;
const { Git } = dependencies;
const scope = args.scope || 'current';

if (scope === 'current') {
    if (onProgress) onProgress(\`Listing files in current garden: \${git.gardenName}...\`);
    const files = await listFilesRecursive(git.pfs, '/');
    if (onProgress) onProgress(\`Found \${files.length} files.\`);
    return \`Files in garden "\${git.gardenName}":\\n\` + files.join('\\n');
}

if (scope === 'all') {
    if (onProgress) onProgress('Listing files across all gardens...');
    const gardensRaw = localStorage.getItem('thoughtform_gardens');
    const gardens = gardensRaw ? JSON.parse(gardensRaw) : ['home'];
    let allFilesOutput = '';
    let totalFiles = 0;

    for (const gardenName of gardens) {
        if (onProgress) onProgress(\`... scanning garden: \${gardenName}\`);
        const gardenGit = new Git(gardenName);
        const files = await listFilesRecursive(gardenGit.pfs, '/');
        totalFiles += files.length;
        files.forEach(file => {
            allFilesOutput += \`\${gardenName}#\${file}\\n\`;
        });
    }

    if (onProgress) onProgress(\`Found \${totalFiles} files across \${gardens.length} gardens.\`);
    return \`List of all files across all gardens:\\n\` + allFilesOutput;
}

return 'Error: Invalid scope. Use "current" or "all".';`,_n=`/*
Description:
A special tool to be used ONLY when a CRITICAL API FAILURE observation indicates the context window is full. It signals the system to analyze the error, determine the token limit, and intelligently summarize the oldest parts of your memory. Pass the full error message from the observation as an argument.

Arguments:
- errorMessage: The full text of the API error message provided in the observation.

Example Call (in JSON format):
{
  "errorMessage": "API request failed: You exceeded your current quota... limit: 1000000..."
}
*/

if (!args.errorMessage) {
  return "Error: The 'errorMessage' argument is required.";
}

// This tool doesn't perform a complex action itself. It returns a structured
// signal that the TaskRunner will intercept and act upon.
return JSON.stringify({
  action: "request_memory_compression",
  details: {
    errorMessage: args.errorMessage,
  }
});`,ve=[["/settings/interface.yml",Ve],["/settings/keymaps.yml",ye],["/settings/keymaps/navigate-or-prompt.js",Zt],["/settings/keymaps/navigate-in-new-pane.js",Qt],["/settings/keymaps/toggle-sidebar.js",en],["/settings/keymaps/toggle-devtools.js",tn],["/settings/keymaps/search-files.js",nn],["/settings/keymaps/execute-command.js",sn],["/settings/keymaps/global-search.js",on],["/settings/keymaps/browser-back.js",rn],["/settings/keymaps/browser-forward.js",an],["/settings/keymaps/duplicate-current-file.js",cn],["/settings/keymaps/duplicate-current-garden.js",ln],["/settings/keymaps/rename-current-file.js",dn],["/settings/keymaps/new-file.js",hn],["/settings/keymaps/new-garden.js",un],["/settings/keymaps/split-pane-vertical.js",mn],["/settings/keymaps/split-pane-horizontal.js",wn],["/settings/keymaps/select-next-pane.js",yn],["/settings/keymaps/select-prev-pane.js",vn],["/settings/keymaps/move-pane-up.js",bn],["/settings/keymaps/move-pane-down.js",Cn],["/settings/keymaps/close-pane.js",Sn],["/settings/keymaps/toggle-maximize-pane.js",kn],["/settings/hooks/create.js",gn],["/settings/hooks/load.js",fn],["/settings/hooks/delete.js",pn],["/settings/query/test.js",En],["/settings/hooks/on-create-window.js",xn],["/settings/hooks/on-close-window.js",Tn],["/settings/hooks/on-resize-window.js",In],["/settings/keymaps/open-in-window.js",Pn],["/settings/prompts/select-tool.md",Ke],["/settings/prompts/critique-step.md",$n],["/settings/prompts/synthesize-answer.md",Je],["/settings/tools/exploreWikilinks.js",Ln],["/settings/tools/readFile.js",An],["/settings/tools/readURL.js",Nn],["/settings/tools/webSearch.js",Mn],["/settings/tools/listFiles.js",Rn],["/settings/tools/requestMemoryCompression.js",_n]];class E{constructor(e){if(!e)throw new Error("A garden name is required to initialize the Git client.");this.gardenName=e,this.fs=new ft(`garden-fs-${this.gardenName}`),this.pfs=this.fs.promises}async initRepo(){try{await this.pfs.stat("/.git"),this.registerNewGarden();return}catch{}console.log(`Initializing new garden: "${this.gardenName}"...`);try{if(await A.init({fs:this.fs,dir:"/",defaultBranch:"main"}),this.gardenName==="Settings")await this.populateDefaultSettings();else{const e=`# Welcome to your new garden: ${this.gardenName}

Start writing your thoughts here.`;await this.pfs.writeFile("/home",e,"utf8")}this.registerNewGarden(),console.log("New garden initialized successfully.")}catch(e){console.error("Error initializing repository:",e)}}async populateDefaultSettings(){console.log('[Git] Populating "Settings" garden with default files...');for(const[e,t]of ve)try{await this.writeFile(e,t,"utf8")}catch(n){console.error(`[Git] Failed to write default setting file: ${e}`,n)}}registerNewGarden(){try{const e=localStorage.getItem("thoughtform_gardens"),t=e?JSON.parse(e):[];t.includes(this.gardenName)||(t.push(this.gardenName),localStorage.setItem("thoughtform_gardens",JSON.stringify(t)))}catch(e){console.error("Failed to update garden registry:",e)}}async rmrf(e){try{if((await this.pfs.stat(e)).isDirectory()){const n=await this.pfs.readdir(e);for(const s of n)await this.rmrf(`${e}/${s}`);await this.pfs.rmdir(e)}else await this.pfs.unlink(e)}catch(t){if(t.code!=="ENOENT")throw console.error(`Error during rmrf for ${e}:`,t),t}}async clearWorkdir(){const e=await this.pfs.readdir("/");for(const t of e)t!==".git"&&await this.rmrf(`/${t}`)}async ensureDir(e){const t=e.split("/").filter(s=>s);let n="";for(const s of t){n+=`/${s}`;try{if(!(await this.pfs.stat(n)).isDirectory())throw new Error(`A file exists at '${n}' which conflicts with the desired directory structure.`)}catch(i){if(i.code==="ENOENT")try{await this.pfs.mkdir(n)}catch(o){if(o.code!=="EEXIST")throw o}else throw i}}}async listAllFilesForClone(e="/"){let t=[];const n=await this.pfs.readdir(e);for(const s of n){const i=`${e==="/"?"":e}/${s}`;(await this.pfs.stat(i)).isDirectory()?t=t.concat(await this.listAllFilesForClone(i)):t.push(i)}return t}async stage(e){const t=e.startsWith("/")?e.substring(1):e,s=(await this.getStatuses()).find(o=>o[0]===t);if(!s){console.error(`Could not find status for "${t}". Cannot stage.`);return}s[2]===0?await A.remove({fs:this.fs,dir:"/",filepath:t}):await A.add({fs:this.fs,dir:"/",filepath:t})}async unstage(e){const t=e.startsWith("/")?e.substring(1):e;await A.remove({fs:this.fs,dir:"/",filepath:t})}async discard(e){const t=e.startsWith("/")?e.substring(1):e;try{const s=(await this.getStatuses()).find(o=>o[0]===t);if(!s)return;s[1]===0?(await this.pfs.unlink(e),window.thoughtform.events.publish("file:delete",{path:e,isDirectory:!1,gardenName:this.gardenName})):await A.checkout({fs:this.fs,dir:"/",filepaths:[t],force:!0})}catch(n){console.error(`[discard] An error occurred for ${e}:`,n)}}async commit(e){const t=await A.commit({fs:this.fs,dir:"/",message:e,author:{name:"User",email:"user@thoughtform.garden"}});return this.markGardenAsDirty(!1),t}async push(e,t,n){return await A.push({fs:this.fs,http:ke,dir:"/",url:e,onProgress:s=>n(`${s.phase}: ${s.loaded}/${s.total}`),onAuth:()=>({username:t})})}async pull(e,t,n){return await A.pull({fs:this.fs,http:ke,dir:"/",url:e,onProgress:s=>n(`${s.phase}: ${s.loaded}/${s.total}`),onAuth:()=>({username:t}),author:{name:"User",email:"user@thoughtform.garden"},singleBranch:!0,fastForward:!0})}async log(){try{return await A.log({fs:this.fs,dir:"/",depth:20})}catch{return[]}}async getChangedFiles(e){try{const{commit:t}=await A.readCommit({fs:this.fs,dir:"/",oid:e}),n=t.parent[0];if(!n)return(await A.listFiles({fs:this.fs,dir:"/",ref:e})).map(i=>`/${i}`);const s=[];return await A.walk({fs:this.fs,dir:"/",trees:[A.TREE({ref:n}),A.TREE({ref:e})],map:async(i,[o,r])=>{if(i===".")return;const c=o&&await o.oid(),l=r&&await r.oid();if(c===l)return;(r?await r.type():await o.type())==="blob"&&s.push(`/${i}`)}}),s}catch(t){return console.error(`Error getting changed files for commit ${e}:`,t),[]}}async readBlob(e){return this.readBlobFromCommit("HEAD",e)}async readBlobFromCommit(e,t){const n=t.startsWith("/")?t.substring(1):t;if(!e)return"";try{const s=e==="HEAD"?await A.resolveRef({fs:this.fs,dir:"/",ref:"HEAD"}):e,{blob:i}=await A.readBlob({fs:this.fs,dir:"/",oid:s,filepath:n});return new TextDecoder().decode(i)}catch(s){return s.name==="NotFoundError"?"":null}}async readFile(e){const t=e.startsWith("/")?e:`/${e}`;try{return await this.pfs.readFile(t,"utf8")}catch(n){throw n.code==="ENOENT"?new Error(`File "${t.substring(1)}" does not exist.`):n}}async readFileAsBuffer(e){const t=e.startsWith("/")?e:`/${e}`;try{return await this.pfs.readFile(t)}catch{return null}}async writeFile(e,t){const n=e.startsWith("/")?e:`/${e}`,s=typeof t=="string"?"utf8":void 0;try{const i=n.substring(0,n.lastIndexOf("/"));i&&await this.ensureDir(i),await this.pfs.writeFile(n,t,s),this.markGardenAsDirty(!0)}catch(i){throw console.error(`[Git.writeFile] Failed to write to ${n}:`,i),i}}markGardenAsDirty(e){try{const t=localStorage.getItem("dirty_gardens"),n=t?JSON.parse(t):[],s=n.indexOf(this.gardenName);e&&s===-1?n.push(this.gardenName):!e&&s!==-1&&n.splice(s,1),localStorage.setItem("dirty_gardens",JSON.stringify(n))}catch(t){console.error("Failed to update dirty garden registry:",t)}}async getStatuses(){return A.statusMatrix({fs:this.fs,dir:"/"})}}const Fn={async renderGardens(){try{const a=localStorage.getItem("thoughtform_gardens"),e=a?JSON.parse(a):[],t=localStorage.getItem("dirty_gardens"),n=t?new Set(JSON.parse(t||"[]")):new Set;if(e.length===0){this.contentContainer.innerHTML='<p class="sidebar-info">No gardens found. Create one!</p>';return}let s="";for(const i of e.sort()){const o=decodeURIComponent(i),r=n.has(o),c=`/${encodeURIComponent(i)}`,l=this.gitClient.gardenName===o,d=[];l&&d.push("active"),r&&d.push("status-modified"),s+=`<li><a href="${c}" class="${d.join(" ")}" data-garden-name="${i}">${o}</a></li>`}this.contentContainer.innerHTML=`<ul>${s}</ul>`,this.contentContainer.querySelectorAll("[data-garden-name]").forEach(i=>{i.addEventListener("click",o=>{o.preventDefault();const r=o.target.dataset.gardenName;window.thoughtform.workspace.getActiveGitClient().gardenName!==r&&window.thoughtform.workspace.switchGarden(r)})})}catch(a){console.error("Error rendering garden list:",a),this.contentContainer.innerHTML='<p class="sidebar-error">Could not load gardens.</p>'}},async handleNewGarden(){const a=await C.prompt({title:"New Garden",label:"Enter new garden name:"});if(!a||!a.trim())return;const e=localStorage.getItem("thoughtform_gardens");if((e?JSON.parse(e):[]).includes(a)){await this.showAlert({title:"Garden Exists",message:`Garden "${a}" already exists.`});return}await window.thoughtform.workspace.switchGarden(a)},async handleDuplicateGarden(a){if(!a)return;const t=`${decodeURIComponent(a)} (copy)`,n=await C.prompt({title:"Duplicate Garden",label:"Enter name for new garden:",defaultValue:t});if(!n||!n.trim()||n===a)return;const s=this.contentContainer.innerHTML;this.contentContainer.innerHTML='<p class="sidebar-info">Preparing duplication...<br>(UI may be unresponsive)</p>',setTimeout(async()=>{try{const i=new E(a),o=new E(n);await o.initRepo();const c=(await this.listAllPaths(i,"/")).filter(d=>!d.isDirectory).map(d=>d.path);let l=0;for(const d of c){l++,this.contentContainer.innerHTML=`<p class="sidebar-info">Copying file ${l} of ${c.length}:<br>${d.substring(1)}</p>`;const u=await i.pfs.readFile(d);await o.writeFile(d,u)}this.contentContainer.innerHTML='<p class="sidebar-info">Duplication complete. Switching...</p>',setTimeout(async()=>{await window.thoughtform.workspace.switchGarden(n)},500)}catch(i){console.error("Error duplicating garden:",i),await this.showAlert({title:"Error",message:"Failed to duplicate garden. Check console for details."}),this.contentContainer.innerHTML=s}},100)},async handleDeleteGarden(a){if(!a)return;if(a==="home"){await this.showAlert({title:"Action Not Allowed",message:'The default "home" garden cannot be deleted.'});return}if(await this.showConfirm({title:"Delete Garden",message:`ARE YOU SURE you want to permanently delete the garden "${a}"? This cannot be undone.`,okText:"Delete",destructive:!0}))try{const t=localStorage.getItem("thoughtform_gardens");let n=t?JSON.parse(t):[];n=n.filter(i=>i!==a),localStorage.setItem("thoughtform_gardens",JSON.stringify(n));const s=`garden-fs-${a}`;await new Promise((i,o)=>{const r=indexedDB.deleteDatabase(s);r.onsuccess=()=>i(),r.onerror=c=>o(c.target.error),r.onblocked=()=>{this.showAlert({title:"Deletion Blocked",message:"Could not delete the database because it's still in use. Please refresh the page and try again."}),o(new Error("Deletion blocked"))}}),this.gitClient.gardenName===a?await window.thoughtform.workspace.switchGarden("home"):await this.refresh()}catch(t){console.error("Error deleting garden:",t),t.message!=="Deletion blocked"&&await this.showAlert({title:"Error",message:"Failed to delete garden."})}}};class xe{constructor(e){this.sidebar=e,this.editor=e.editor,this.contentContainer=e.contentContainer}render(e,t){const n=[],s=[];for(const[d,u,h,g]of e){const f=`/${d}`;(u!==h||u!==g)&&(h===g?n.push({filepath:f,status:"staged"}):s.push({filepath:f,status:"unstaged"}))}const i=this._renderRemoteSection(),o=`
      <div class="git-commit-area">
        <textarea id="git-commit-message" placeholder="Commit message..." rows="3"></textarea>
        <button id="git-commit-button" disabled>Commit</button>
      </div>
    `,r=this._renderFileSection("Changes",s,!1),c=this._renderFileSection("Staged Changes",n,!0),l=this._renderHistorySection(t);return`
      <div class="git-view-container">
        ${i}
        ${o}
        ${c}
        ${r}
        ${l}
      </div>
    `}_renderRemoteSection(){const e=this.sidebar.getRemoteConfig();return`
      <div class="git-remote-section">
        <h3>Remote</h3>
        <input type="text" id="git-remote-url" placeholder="Remote URL" value="${e.url}">
        <input type="password" id="git-remote-auth" placeholder="Username or Token" value="${e.auth}">
        <div class="git-remote-actions">
          <button id="git-pull-button">Pull</button>
          <button id="git-push-button">Push</button>
        </div>
        <div class="git-remote-log" id="git-remote-log">Ready</div>
      </div>
    `}_renderFileSection(e,t,n){const s=n?'<button class="git-action-button unstage" title="Unstage Changes">-</button>':'<button class="git-action-button stage" title="Stage Changes">+</button>';let i="";return t.length>0?i=t.map(r=>{const c=r.filepath.startsWith("/")?r.filepath.substring(1):r.filepath;return`
          <li class="git-file-item ${this.editor.filePath===r.filepath?"active":""}" data-filepath="${r.filepath}">
            <span class="git-file-path">${c}</span>
            <span class="git-file-actions">
              <button class="git-action-button discard" title="Discard Changes">⭯</button>
              ${s}
            </span>
          </li>
        `}).join(""):i=`<li><span class="no-changes">No ${n?"staged ":""}changes.</span></li>`,`
      <div class="git-file-section ${n?"git-staged-section":""}">
        <h3 class="git-section-header">${e} (${t.length})</h3>
        <ul class="git-file-list">
          ${i}
        </ul>
      </div>
    `}_renderHistorySection(e){let t="";return e.length>0?t=e.map(n=>{const s=n.commit.message.split(`
`)[0],i=n.oid.substring(0,7),o=n.commit.author.name,r=new Date(n.commit.author.timestamp*1e3).toLocaleString(),c=n.commit.parent[0]||"";return`
              <li class="git-history-item" data-oid="${n.oid}" data-parent-oid="${c}" data-author="${o}" data-date="${r}">
                <div class="git-history-header">
                  <span class="git-history-message">${s}</span>
                  <span class="git-history-oid">${i}</span>
                </div>
                <div class="git-history-details" style="display: none;"></div>
              </li>
            `}).join(""):t='<li><span class="no-changes">No commit history.</span></li>',`
        <div class="git-history-section">
            <h3 class="git-section-header">History</h3>
            <ul class="git-history-list">
                ${t}
            </ul>
        </div>
    `}updateCommitButtonState(){const e=this.contentContainer.querySelector("#git-commit-message"),t=this.contentContainer.querySelector("#git-commit-button");if(!e||!t)return;const n=this.contentContainer.querySelector(".git-staged-section .git-file-item")!==null,s=e.value.trim().length>0;t.disabled=!(n&&s)}}class Dn{constructor(e){this.sidebar=e,this.editor=e.editor,this.gitClient=e.gitClient,this.contentContainer=e.contentContainer}addListeners(){const e=this.contentContainer.querySelector("#git-remote-url"),t=this.contentContainer.querySelector("#git-remote-auth"),n=this.contentContainer.querySelector("#git-push-button"),s=this.contentContainer.querySelector("#git-pull-button"),i=()=>{this.sidebar.saveRemoteConfig(e.value,t.value)};e.addEventListener("input",i),t.addEventListener("input",i),n.addEventListener("click",()=>this._handleRemoteAction("push")),s.addEventListener("click",()=>this._handleRemoteAction("pull"));const o=this.contentContainer.querySelector("#git-commit-message");o&&!o.dataset.listenerAttached&&(o.dataset.listenerAttached="true",o.addEventListener("input",()=>this.sidebar.updateCommitButtonState()));const r=this.contentContainer.querySelector(".git-view-container");r&&!r.dataset.listenerAttached&&(r.dataset.listenerAttached="true",r.addEventListener("click",l=>this._handleViewContainerClick(l)));const c=this.contentContainer.querySelector("#git-commit-button");c&&!c.dataset.listenerAttached&&(c.dataset.listenerAttached="true",c.addEventListener("click",()=>this._handleCommitClick()))}async _handleRemoteAction(e){const t=this.contentContainer.querySelector("#git-remote-url"),n=this.contentContainer.querySelector("#git-remote-auth"),s=this.contentContainer.querySelector("#git-push-button"),i=this.contentContainer.querySelector("#git-pull-button"),o=this.contentContainer.querySelector("#git-remote-log"),r=t.value.trim(),c=n.value.trim();if(!r){o.textContent="Error: Remote URL is required.";return}s.disabled=!0,i.disabled=!0;const l=e==="push"?"Pushing":"Pulling";o.textContent=`${l} to ${r}...`;try{const d=await this.gitClient[e](r,c,u=>{o.textContent=u});d.ok?o.textContent=`${l} complete.`:o.textContent=`Error: ${d.error||"Unknown error"}`,e==="pull"&&(await this.sidebar.refresh(),await this.editor.forceReloadFile(this.editor.filePath))}catch(d){console.error(`${l} failed:`,d),o.textContent=`Error: ${d.message||"Check console for details."}`}finally{s.disabled=!1,i.disabled=!1}}async _handleViewContainerClick(e){const t=e.target,n=t.closest(".git-file-item"),s=t.closest(".git-history-item");n?await this._handleFileItemClick(t,n):s&&t.closest(".git-history-header")?this._toggleHistoryDetails(s):t.closest(".history-file-path")&&this._handleHistoryFileClick(t)}async _handleFileItemClick(e,t){const n=t.dataset.filepath;e.matches(".git-file-path")?(this.editor.filePath!==n&&await this.editor.loadFile(n),this.editor.showDiff(await this.gitClient.readBlob(n))):e.matches(".git-action-button")&&(e.closest(".git-file-item").style.pointerEvents="none",e.classList.contains("discard")?await this.sidebar.showConfirm({title:"Discard Changes",message:`Are you sure you want to discard all changes to "${n}"? This cannot be undone.`,okText:"Discard",destructive:!0})&&(await this.gitClient.discard(n),this.editor.filePath===n&&await this.editor.forceReloadFile(n),await this.sidebar.refresh()):e.classList.contains("stage")?(await this.gitClient.stage(n),await this.sidebar.renderGitView()):e.classList.contains("unstage")&&(await this.gitClient.unstage(n),await this.sidebar.renderGitView()))}async _toggleHistoryDetails(e){const t=e.querySelector(".git-history-details");if(t.style.display!=="none")t.style.display="none";else if(t.style.display="block",!t.dataset.loaded){t.innerHTML='<span class="no-changes">Loading...</span>';const s=e.dataset.oid,i=await this.gitClient.getChangedFiles(s),o=e.dataset.author,r=e.dataset.date,c=i.map(l=>{const d=typeof l=="string"?l:l.path;return`<div class="history-file-path" data-path="${d}">${d.substring(1)}</div>`}).join("");t.innerHTML=`
          <div class="commit-meta">
            <div><strong>Author:</strong> ${o}</div>
            <div><strong>Date:</strong> ${r}</div>
          </div>
          <div class="history-file-list">${c||'<span class="no-changes">No files changed.</span>'}</div>
        `,t.dataset.loaded="true"}}async _handleHistoryFileClick(e){this.contentContainer.querySelector(".git-view-container").querySelectorAll(".history-file-path.active").forEach(r=>r.classList.remove("active")),e.classList.add("active");const n=e.closest(".git-history-item"),s=e.dataset.path,i=n.dataset.oid,o=n.dataset.parentOid;await this.editor.previewHistoricalFile(s,i,o)}async _handleCommitClick(){const e=this.contentContainer.querySelector("#git-commit-button"),t=this.contentContainer.querySelector("#git-commit-message"),n=t.value.trim();if(n)try{e.disabled=!0,e.textContent="Committing...",await this.gitClient.commit(n),this.editor.hideDiff(),t.value="",await this.sidebar.refresh()}catch(s){console.error("Commit failed:",s),await this.sidebar.showAlert({title:"Commit Failed",message:"The commit failed. Please see the console for more details."}),this.sidebar.updateCommitButtonState(),e.textContent="Commit"}}}const On={async renderGitView(){try{const[a,e]=await Promise.all([this.gitClient.getStatuses(),this.gitClient.log()]),t=new xe(this),n=new Dn(this),s=this.contentContainer.querySelector("#git-commit-message")?.value||"";this.contentContainer.innerHTML=t.render(a,e);const i=this.contentContainer.querySelector("#git-commit-message");i&&(i.value=s),n.addListeners(),this.updateCommitButtonState()}catch(a){console.error("Error rendering Git view:",a),this.contentContainer.innerHTML='<p class="sidebar-error">Could not load Git status.</p>'}},updateCommitButtonState(){new xe(this).updateCommitButtonState()},getRemoteConfig(){const a=`thoughtform_remote_config_${this.gitClient.gardenName}`;try{const e=localStorage.getItem(a);if(e)return JSON.parse(e)}catch(e){console.error("Could not parse remote config from localStorage",e)}return{url:"",auth:""}},saveRemoteConfig(a,e){const t=`thoughtform_remote_config_${this.gitClient.gardenName}`,n={url:a,auth:e};localStorage.setItem(t,JSON.stringify(n))}};class Gn{constructor({target:e,gitClient:t,editor:n}){if(!t)throw new Error("Sidebar requires a gitClient instance.");if(!n)throw new Error("Sidebar requires an editor instance.");this.gitClient=t,this.editor=n,this.targetSelector=e;const s=document.querySelector(this.targetSelector);if(!s){console.error(`Sidebar container not found: ${this.targetSelector}`);return}this.container=s,this.tabsContainer=document.createElement("div"),this.tabsContainer.className="sidebar-tabs",this.contentContainer=document.createElement("div"),this.contentContainer.className="sidebar-content",this.container.appendChild(this.tabsContainer),this.container.appendChild(this.contentContainer),this.activeTab=sessionStorage.getItem("sidebarActiveTab")||"Files",Object.assign(this,Xt),Object.assign(this,Fn),Object.assign(this,On)}async init(){this.renderTabs(),this.setupContextMenus(),await this.refresh()}async showAlert({title:e="Notice",message:t}){return new Promise(n=>{const s=new C({title:e});s.updateContent(`<p>${t}</p>`),s.addFooterButton("OK",()=>{s.destroy(),n()}),s.show()})}async showConfirm({title:e,message:t,okText:n="OK",destructive:s=!1}){return C.confirm({title:e,message:t,okText:n,destructive:s,cancelText:"Cancel"})}setupContextMenus(){const e=[{type:"separator"},{label:"Command Palette",action:()=>window.thoughtform.commandPalette.open()}];new Ee({targetSelector:".sidebar-content.files-view",itemSelector:".file-tree-item",dataAttribute:"data-path",items:[{label:"New File",action:()=>this.handleNewFile()},{label:"New Folder",action:()=>this.handleNewFolder()},{label:"Rename",action:t=>this.handleRename(t)},{label:"Duplicate",action:t=>this.handleDuplicate(t)},{label:"Delete",action:t=>this.handleDelete(t)},...e],containerItems:[{label:"New File",action:()=>this.handleNewFile()},{label:"New Folder",action:()=>this.handleNewFolder()},...e]}),new Ee({targetSelector:".sidebar-content.gardens-view",itemSelector:"[data-garden-name]",dataAttribute:"data-garden-name",items:[{label:"New Garden",action:()=>this.handleNewGarden()},{label:"Duplicate",action:t=>this.handleDuplicateGarden(t)},{label:"Delete",action:t=>this.handleDeleteGarden(t)},...e],containerItems:[{label:"New Garden",action:()=>this.handleNewGarden()},...e]})}renderTabs(){this.tabsContainer.innerHTML=`
      <button class="sidebar-tab" data-tab="Files">Files</button>
      <button class="sidebar-tab" data-tab="Gardens">Gardens</button>
      <button class="sidebar-tab" data-tab="Git">Git</button>
    `,this.tabsContainer.querySelectorAll(".sidebar-tab").forEach(e=>{e.addEventListener("click",t=>{const n=t.target.dataset.tab,s=this.activeTab;if(this.activeTab=n,sessionStorage.setItem("sidebarActiveTab",this.activeTab),s==="Git"&&n!=="Git"){const i=this.editor.getFilePath(window.location.hash);this.editor.loadFile(i)}this.refresh()})})}async refresh(){this.tabsContainer.querySelectorAll(".sidebar-tab").forEach(n=>{n.classList.toggle("active",n.dataset.tab===this.activeTab)}),this.contentContainer.className="sidebar-content",this.contentContainer.classList.add(`${this.activeTab.toLowerCase()}-view`);const e=await this.gitClient.getStatuses();this.activeTab==="Files"?await this.renderFiles(e):this.activeTab==="Gardens"?await this.renderGardens():this.activeTab==="Git"&&await this.renderGitView();const t=e.some(([,n,s])=>n!==s);this.tabsContainer.querySelector('[data-tab="Git"]').classList.toggle("dirty",t)}async listAllPaths(e,t){const n=e.pfs;let s=[];try{const i=await n.readdir(t);for(const o of i){if(o===".git")continue;const r=`${t==="/"?"":t}/${o}`;try{const c=await n.stat(r);if(s.push({path:r,isDirectory:c.isDirectory()}),c.isDirectory()){const l=await this.listAllPaths(e,r);s=s.concat(l)}}catch{console.warn(`Could not stat ${r}, skipping.`)}}}catch{console.log(`Directory not found: ${t}. No items to list.`)}return s}}function Un(a){const e=document.createElement("div");e.id="drag-overlay",e.innerHTML="<p>Drop files or folders to add them to the garden</p>",document.body.appendChild(e);const t=document.querySelector("main");if(!t){console.error("[DragDrop] Main container not found. Drag and drop to editor panes will not be handled correctly.");return}const n=o=>{e.innerHTML=`<p>${o}</p>`,e.classList.add("visible")},s=()=>{e.classList.remove("visible")},i=async(o,r,c)=>{let l=o;if(o.some(w=>w.isDirectory&&w.name===".git")){const w=await C.choice({title:".git Directory Detected",message:"<p>The content you dropped contains a .git repository. This could unintentionally overwrite your garden's history.</p><p>How would you like to proceed?</p>",choices:[{id:"import_safe",text:"Import Files (Ignore .git folder)"},{id:"cancel",text:"Cancel Import",class:"destructive"}]});if(!w||w==="cancel"){r("Import cancelled by user.","Import cancelled by user.");return}l=o.filter(b=>!(b.isDirectory&&b.name===".git")),r("Ignoring .git directory and proceeding with import.","Ignoring .git directory.")}const u=[],h=[],g=["png","jpg","jpeg","gif","svg","webp","avif","mp4","webm","mov","ogg","mp3","wav","flac","pdf","doc","docx","xls","xlsx","ppt","pptx"],f=async(w,b)=>{if(w.isFile){const S=await new Promise(T=>w.file(T)),x=`${b}/${S.name}`;S.name.toLowerCase().endsWith(".zip")?h.push(S):u.push({file:S,path:x})}else if(w.isDirectory){const S=w.createReader(),x=await new Promise(T=>S.readEntries(T));for(const T of x)await f(T,`${b}/${w.name}`)}};r("Scanning dropped items...","Scanning dropped items...");for(const w of l)await f(w,"");const p=`Found ${u.length} file(s) and ${h.length} zip archive(s) to process.`;r(p,p);const y=u.map(async({file:w,path:b})=>{let S;const x=w.name.split(".").pop()?.toLowerCase();return g.includes(x)?S=await w.arrayBuffer():S=await w.text(),c.writeFile(b,S)});if((await Promise.allSettled(y)).forEach((w,b)=>{const S=u[b].path;if(w.status==="rejected"){const x=`<span style="color: var(--color-text-destructive);">ERROR:</span> Failed to write "${S}": ${w.reason}`,T=`ERROR: Failed to write "${S}": ${w.reason}`;r(x,T)}else{const x=`<span style="color: var(--color-text-success);">OK:</span> Imported "${S}"`,T=`OK: Imported "${S}"`;r(x,T)}}),h.length>0){const w="Note: Zip archives must be imported via the DevTools > Data panel.";r(w,w)}};t.addEventListener("dragover",o=>{o.preventDefault()}),t.addEventListener("drop",o=>{o.preventDefault()}),window.addEventListener("dragenter",o=>{o.preventDefault(),o.dataTransfer.types.includes("Files")&&n("Drop files or folders to add them to the garden")}),window.addEventListener("dragover",o=>{o.preventDefault()}),window.addEventListener("dragleave",o=>{o.clientX===0&&o.clientY===0&&s()}),window.addEventListener("drop",async o=>{o.preventDefault(),s();const r=o.dataTransfer.items;if(!r||r.length===0)return;const c=Array.from(r).map(l=>l.webkitGetAsEntry()).filter(Boolean);if(c.length>0){const l=await window.thoughtform.workspace.getActiveGitClient();if(!l){console.error("[DragDrop] Could not determine active garden. Aborting import.");const f=new C({title:"Import Error"});f.updateContent("<p>Could not determine the active garden. Please click inside an editor pane and try again.</p>"),f.addFooterButton("Close",()=>f.destroy()),f.show();return}const d=new C({title:`Importing to "${l.gardenName}"...`}),u=document.createElement("div");u.style.fontFamily="monospace",u.style.maxHeight="300px",u.style.overflowY="auto",u.style.fontSize="12px",d.updateContent(""),d.content.appendChild(u),d.show();let h="";const g=(f,p)=>{console.log(`[Import Log] ${p}`),h+=`<div>${f}</div>`,u.innerHTML=h,u.scrollTop=u.scrollHeight};try{await i(c,g,l),g("<strong>Import process complete.</strong>","Import process complete.")}catch(f){const p=`<strong style="color: var(--color-text-destructive);">A critical error occurred: ${f.message}</strong>`,y=`A critical error occurred: ${f.message}`;g(p,y),console.error("[DragDrop] A critical error occurred during import:",f)}finally{d.addFooterButton("Close",()=>d.destroy()),await a.refresh()}}})}const Te=pt.define(mt),Bn=wt({base:St,codeLanguages:[ee.of({name:"javascript",load:()=>Promise.resolve(Oe())}),ee.of({name:"html",load:()=>Promise.resolve(Ge())}),ee.of({name:"css",load:()=>Promise.resolve(Ue())}),ee.of({name:"mermaid",load:()=>Promise.resolve(yt())})]});function be(a){const e=a.split("/").pop(),t=e.includes(".")?e.split(".").pop().toLowerCase():"";switch(e){case".gitignore":case".npmrc":case".editorconfig":case"Dockerfile":return Te}switch(t){case"js":return Oe();case"css":return Ue();case"html":return Ge();case"json":return Ct();case"xml":return bt();case"yaml":case"yml":return vt();case"sh":case"bash":case"zsh":return Te;default:return Bn}}const F=Be.define({create:()=>({gitClient:null,sidebar:null,editor:null}),update:(a,e)=>a});async function he(a,e){if(!e.sidebar||!e.gitClient)return null;const t=await e.sidebar.listAllPaths(e.gitClient,"/"),n=a.toLowerCase();for(const{path:s,isDirectory:i}of t){if(i)continue;const o=s;if((o.startsWith("/")?o.substring(1):o).toLowerCase()===n)return o}return null}async function qn(a,e){const t=new E(a);try{return await t.readFile(e)}catch(n){if(n.message.includes("does not exist")&&a!=="Settings"){const s=new E("Settings");try{return await s.readFile(e)}catch(i){if(i.message.includes("does not exist"))return null;throw i}}if(n.message.includes("does not exist"))return null;throw n}}async function se(a,e,t,n=null,s=null){try{let[i,o]=a.split("#");o.startsWith("/")||(o=`/${o}`);const r=await qn(i,o);if(r===null)return;const c=`(function(editor, git, event, params) {
      try {
        ${r}
      } catch (e) {
        console.error(
          'EXECUTION FAILED in script: "${a}"\\n' +
          '--------------------------------------------------\\n' +
          'This error was caught and did not crash the application. Please check the script for errors.\\n\\n',
          e
        );
      }
    })(...arguments);`;await new Function(c)(e,t,n,s)}catch(i){console.error(`[Executor] Failed to process script for path "${a}":`,i),window.thoughtform.ui.toggleDevtools?.(!0,"console")}}function zn(a,e){const t=a.doc,n=t.lineAt(e).number;let s=!1;for(let i=1;i<=n;i++){const r=t.line(i).text.trim();r.includes("<response>")&&(s=!0),r.includes("</response>")&&(s=!1)}return s}function Hn(a){console.log('[Cancel Keymap] "Mod-c" detected. Running command...');const e=a.state.selection.main.head,t=zn(a.state,e);if(console.log(`[Cancel Keymap] Is cursor in a response block? -> ${t}`),t){const s=a.state.field(F).editor;if(s&&s.paneId){console.log(`[Cancel Keymap] Checking for active agent in pane: ${s.paneId}`);const i=window.thoughtform.ai.activeAgentControllers.get(s.paneId);if(i)return console.log("[Cancel Keymap] SUCCESS: Found active agent. Sending abort signal."),i.abort(),!0;console.log("[Cancel Keymap] No active agent found for this pane.")}else console.log("[Cancel Keymap] Could not get editor or paneId from context.")}return console.log('[Cancel Keymap] Condition not met. Allowing default "copy" action.'),!1}const Wn=new Map([["cancel-agent",Hn]]);class jn{constructor(e){if(!e)throw new Error("KeymapService requires an EditorView instance.");this.editorView=e,this.keymapCompartment=new q,this.currentKeymap=j.of([])}getCompartment(){return this.keymapCompartment.of(this.currentKeymap)}async updateKeymaps(){const e=this.editorView.state.field(F);if(!e||!e.gitClient){console.warn("[KeymapService] Could not find gitClient in editor context. Cannot update keymaps.");return}const t=e.gitClient.gardenName,n=async u=>{try{const h=new E(u);await h.initRepo();const g=await h.pfs.readFile("/settings/keymaps.yml","utf8");return Y(g)}catch{return null}},s=Y(ye)||[],i=await n("Settings"),o=t!=="Settings"?await n(t):null,r=new Map,c=(u,h)=>{if(Array.isArray(u))for(const g of u)g&&g.key&&g.hasOwnProperty("run")&&r.set(g.key,{...g,sourceGarden:h})};c(s,"Settings"),c(i,"Settings"),c(o,t);const l=Array.from(r.values()),d=this._buildKeymapExtension(l);this.currentKeymap!==d&&this.editorView&&!this.editorView.isDestroyed&&(this.currentKeymap=d,this.editorView.dispatch({effects:this.keymapCompartment.reconfigure(this.currentKeymap)}))}_buildKeymapExtension(e){const t=e.map(n=>{let{key:s,run:i,sourceGarden:o}=n;if(!i)return null;if(typeof i=="string"&&i.startsWith("internal:")){const c=i.substring(9),l=Wn.get(c);return l?{key:s,run:l}:(console.warn(`[KeymapService] Unknown internal command: "${c}"`),null)}const r=`${o}#${i}`;return{key:s,run:c=>{const l=c.state.field(F);return l.editor&&l.gitClient&&se(r,l.editor,l.gitClient),!0}}}).filter(Boolean);return j.of(t)}}const Vn=dt.define(),Kn=D.theme({"&":{color:"var(--color-text-primary)",backgroundColor:"var(--color-background-primary)"},".cm-content":{caretColor:"var(--color-text-bright)"},"&.cm-focused .cm-cursor":{borderLeftColor:"var(--color-text-bright)"},"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":{backgroundColor:"var(--color-background-hover)"},".cm-gutters":{backgroundColor:"var(--color-background-primary)",color:"var(--color-text-secondary)",border:"none"},".cm-embed-container":{display:"block",padding:"10px 0"},".cm-embedded-image":{maxWidth:"100%",maxHeight:"500px",display:"block",margin:"0 auto",borderRadius:"4px",border:"1px solid var(--color-border)"},".cm-embed-placeholder, .cm-embed-error":{display:"block",padding:"10px",backgroundColor:"var(--color-background-secondary)",borderRadius:"4px",fontStyle:"italic",color:"var(--color-text-secondary)"},".cm-embed-error":{color:"var(--color-text-destructive)"}},{dark:!0}),Jn=kt.define([{tag:v.keyword,color:"var(--base-accent-emphasis)",class:"cm-keyword"},{tag:[v.name,v.deleted,v.character,v.propertyName,v.macroName],color:"var(--base-accent-info)",class:"cm-name"},{tag:[v.processingInstruction,v.string,v.inserted],color:"var(--base-accent-emphasis)",class:"cm-string"},{tag:[v.function(v.variableName),v.labelName],color:"var(--base-accent-action)",class:"cm-function"},{tag:[v.color,v.constant(v.name),v.standard(v.name)],color:"var(--base-accent-action)",class:"cm-constant"},{tag:[v.definition(v.name),v.separator],color:"var(--base-text-primary)",class:"cm-definition"},{tag:[v.typeName,v.className,v.number,v.changed,v.annotation,v.modifier,v.self,v.namespace],color:"var(--base-accent-action)",class:"cm-type"},{tag:[v.operator,v.operatorKeyword,v.url,v.escape,v.regexp,v.link,v.special(v.string)],color:"var(--base-text-primary)",class:"cm-operator"},{tag:[v.meta,v.comment],color:"var(--base-text-muted)",class:"cm-comment"},{tag:Vn,color:"var(--base-accent-highlight)",fontStyle:"italic",class:"cm-hashtag"},{tag:v.strong,fontWeight:"bold",class:"cm-strong"},{tag:v.emphasis,fontStyle:"italic",class:"cm-emphasis"},{tag:v.strikethrough,textDecoration:"line-through",class:"cm-strikethrough"},{tag:v.link,color:"var(--base-syntax-wikilink-bg)",textDecoration:"underline",class:"cm-link"},{tag:v.heading,fontWeight:"bold",color:"var(--base-accent-info)",class:"cm-heading"},{tag:[v.atom,v.bool,v.special(v.variableName)],color:"var(--base-accent-action)",class:"cm-atom"},{tag:v.invalid,color:"var(--base-accent-destructive)",class:"cm-invalid"}]),Ye=[Kn,me(Jn)],Yn=$.mark({class:"cm-hashtag"}),Xn=M.fromClass(class{decorations;constructor(a){this.decorations=this.findHashtags(a)}update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=this.findHashtags(a.view))}findHashtags(a){const e=new R,t=/#[\w-]+/g;for(const{from:n,to:s}of a.visibleRanges){const i=a.state.doc.sliceString(n,s);let o;for(;o=t.exec(i);){const r=n+o.index,c=r+o[0].length,l=a.state.doc.lineAt(r);if(r>l.from){const g=a.state.doc.sliceString(r-1,r);if(/\s/.test(g)===!1)continue}const d=/https?:\/\/[^\s]+/g;let u,h=!1;for(;u=d.exec(l.text);){const g=l.from+u.index,f=g+u[0].length;if(r>=g&&c<=f){h=!0;break}}h||e.add(r,c,Yn)}}return e.finish()}},{decorations:a=>a.decorations}),ue="thoughtform_window_states",P={activeWindows:new Map,dragState:null,zIndexCounter:1e3,lastSpawnedLink:null,lastSpawnTime:0};function Zn(a,e){let t;return function(...s){const i=()=>{clearTimeout(t),a(...s)};clearTimeout(t),t=setTimeout(i,e)}}function H(){const a=[];P.activeWindows.forEach(e=>{const t=e.getBoundingClientRect();a.push({id:e.dataset.windowId,url:e.querySelector(".preview-address-input").value,left:t.left,top:t.top,width:t.width,height:t.height,zIndex:parseInt(e.style.zIndex,10)})}),sessionStorage.setItem(ue,JSON.stringify(a))}function Qn(){const a=sessionStorage.getItem(ue);if(a)try{JSON.parse(a).sort((t,n)=>t.zIndex-n.zIndex).forEach(t=>{ne(t.url,0,0,t)})}catch(e){console.error("Failed to load window states from session storage.",e),sessionStorage.removeItem(ue)}}function es(a,e){let t=a.split("|")[0].trim(),n=e.gitClient.gardenName;return t.includes("#")&&([n,t]=t.split("#")),`/${encodeURIComponent(n)}#${encodeURI(t)}?windowed=true`}function ts(a){a&&(P.activeWindows.delete(a.dataset.windowId),a.classList.remove("visible"),window.thoughtform.events.publish("window:close",{windowId:a.dataset.windowId}),setTimeout(()=>{a.remove(),H()},200))}function ne(a,e,t,n=null){const s=n?n.id:`preview-${crypto.randomUUID()}`,i=document.createElement("div");i.className="preview-window",i.dataset.windowId=s,i.style.zIndex=n?n.zIndex:++P.zIndexCounter,n&&(P.zIndexCounter=Math.max(P.zIndexCounter,n.zIndex)),i.addEventListener("mousedown",()=>{i.style.zIndex=++P.zIndexCounter,H()},{capture:!0});const o=document.createElement("div");o.className="preview-address-bar",o.addEventListener("mousedown",m=>ns(i,m));const r=document.createElement("input");r.type="text",r.className="preview-address-input",r.value=n?n.url:a;const c=document.createElement("button");c.textContent="Go";const l=document.createElement("button");l.innerHTML="&times;",l.className="preview-close-btn",l.onclick=()=>ts(i),o.append(r,c,l);const d=document.createElement("iframe");d.className="preview-iframe",d.src=n?n.url:a;const u=document.createElement("ul");u.className="preview-search-results",u.style.display="none",o.appendChild(u);let h=[],g=-1;const f=()=>{if(u.innerHTML="",h.length===0){u.style.display="none";return}h.forEach((m,w)=>{const b=document.createElement("li");b.className="preview-result-item",b.innerHTML=`<span class="preview-result-path">${m.doc.path.substring(1)}</span> <span class="preview-result-garden">[${m.doc.garden}]</span>`,w===g&&b.classList.add("active"),b.onmousedown=S=>{S.preventDefault(),r.value=`/${m.doc.garden}#${m.doc.path}?windowed=true`,p(),u.style.display="none"},u.appendChild(b)}),u.style.display="block"};r.addEventListener("input",async m=>{const w=m.target.value;if(!w||w.startsWith("/")){h=[],f();return}h=(await window.thoughtform.commandPalette.unifiedIndex.searchAsync(w,{enrich:!0,limit:10}))[0]?.result||[],g=0,f()}),r.addEventListener("keydown",m=>{if(u.style.display!=="none")if(m.key==="ArrowDown")m.preventDefault(),g=Math.min(g+1,h.length-1),f();else if(m.key==="ArrowUp")m.preventDefault(),g=Math.max(g-1,0),f();else if(m.key==="Enter"){if(m.preventDefault(),g>-1&&h[g]){const w=h[g];r.value=`/${w.doc.garden}#${w.doc.path}?windowed=true`,p()}else p();h=[],f()}else m.key==="Escape"&&(h=[],f());else m.key==="Enter"&&p()}),r.addEventListener("blur",()=>setTimeout(()=>{u.style.display="none"},150)),r.addEventListener("focus",()=>{h.length>0&&(u.style.display="block")});const p=()=>{if(d.contentWindow)try{d.contentWindow.location.href=new URL(r.value,window.location.origin).href}catch{r.value=d.src}};if(c.onclick=p,i.append(o,d),n)i.style.left=`${n.left}px`,i.style.top=`${n.top}px`,i.style.width=`${n.width}px`,i.style.height=`${n.height}px`;else{const{innerWidth:m,innerHeight:w}=window,b=640,S=424,x=P.activeWindows.size%5*25;let T,I;Math.abs(e-m/2)<100&&Math.abs(t-w/2)<100?(I=e-b/2+x,T=t-S/2+x):(T=t+20+x,I=e+20+x,I+b>m&&(I=e-b-20-x),T+S>w&&(T=t-S-20-x)),i.style.left=`${Math.max(5,I)}px`,i.style.top=`${Math.max(5,T)}px`}document.getElementById("preview-windows-container").appendChild(i),P.activeWindows.set(s,i),n||window.thoughtform.events.publish("window:create",{windowId:s,url:a});const y=Zn(m=>{H();const{width:w,height:b}=m.contentRect;window.thoughtform.events.publish("window:resize",{windowId:s,width:Math.round(w),height:Math.round(b)})},250);new ResizeObserver(m=>{for(const w of m)y(w)}).observe(i),setTimeout(()=>{i.classList.add("visible"),n||H()},10)}window.addEventListener("message",a=>{const{type:e,payload:t}=a.data,n=a.source.frameElement;if(!n)return;const s=n.closest(".preview-window");if(s)switch(e){case"preview-focus":s.style.zIndex=++P.zIndexCounter,H();break;case"preview-url-changed":const i=s.querySelector(".preview-address-input");if(i&&t.newUrl){const o=new URL(t.newUrl);i.value=`${o.pathname}${o.hash}`,H()}break;case"request-preview-window":t&&ne(t.url,t.clientX,t.clientY);break}});function ns(a,e){a.classList.add("is-dragging");const t=a.getBoundingClientRect();P.dragState={windowEl:a,offsetX:e.clientX-t.left,offsetY:e.clientY-t.top},document.addEventListener("mousemove",Xe),document.addEventListener("mouseup",ss,{once:!0})}function Xe(a){if(!P.dragState)return;a.preventDefault();const{windowEl:e,offsetX:t,offsetY:n}=P.dragState;e.style.left=`${a.clientX-t}px`,e.style.top=`${a.clientY-n}px`}function ss(){P.dragState&&(P.dragState.windowEl.classList.remove("is-dragging"),H()),P.dragState=null,document.removeEventListener("mousemove",Xe)}const is=$.mark({class:"cm-wikilink"});class os{constructor(e){this.view=e,this.decorations=this.findWikilinks(e),this.longPressTimeout=null,this.isWindowed=window.self!==window.top,this.onMouseDown=this.onMouseDown.bind(this),this.onMouseUp=this.onMouseUp.bind(this),this.onTouchStart=this.onTouchStart.bind(this),this.onTouchEnd=this.onTouchEnd.bind(this),this.onTouchMove=this.onTouchMove.bind(this),this.onMouseOver=this.onMouseOver.bind(this),this.isWindowed||(window.thoughtform&&window.thoughtform.ui&&!window.thoughtform.ui.openWindow&&(window.thoughtform.ui.openWindow=ne),window.thoughtform_windows_loaded||(Qn(),window.thoughtform_windows_loaded=!0)),this.view.dom.addEventListener("mousedown",this.onMouseDown),this.view.dom.addEventListener("mouseup",this.onMouseUp),this.view.dom.addEventListener("touchstart",this.onTouchStart,{passive:!1}),this.view.dom.addEventListener("touchend",this.onTouchEnd),this.view.dom.addEventListener("touchmove",this.onTouchMove,{passive:!0}),this.view.dom.addEventListener("mouseover",this.onMouseOver)}destroy(){this.clearLongPressTimeout(),this.view.dom.removeEventListener("mousedown",this.onMouseDown),this.view.dom.removeEventListener("mouseup",this.onMouseUp),this.view.dom.removeEventListener("touchstart",this.onTouchStart),this.view.dom.removeEventListener("touchend",this.onTouchEnd),this.view.dom.removeEventListener("touchmove",this.onTouchMove),this.view.dom.removeEventListener("mouseover",this.onMouseOver)}onMouseOver(e){if(!e.altKey)return;const t=e.target.closest(".cm-wikilink");if(!t)return;const n=Date.now();if(t.textContent===P.lastSpawnedLink&&n-P.lastSpawnTime<500)return;const s=this.view.state.field(F),i=t.textContent.slice(2,-2),o=es(i,s);this.isWindowed?window.top.postMessage({type:"request-preview-window",payload:{url:o,clientX:e.clientX,clientY:e.clientY}},"*"):ne(o,e.clientX,e.clientY),P.lastSpawnedLink=t.textContent,P.lastSpawnTime=n}handleNavigation(e){const t=this.view.state.field(F);t.editor&&t.editor.navigateTo(e.textContent.slice(2,-2))}onMouseDown(e){const t=e.target.closest(".cm-wikilink");if(t&&(e.ctrlKey||e.metaKey)){e.preventDefault();const n=t.textContent.slice(2,-2);if(e.shiftKey){const s=this.view.state.field(F);s&&s.editor&&s.editor.paneId&&window.thoughtform.workspace.openInNewPane(n,s.editor.paneId)}else this.handleNavigation(t)}}onMouseUp(){this.clearLongPressTimeout()}onTouchStart(e){const t=e.target.closest(".cm-wikilink");t&&(e.preventDefault(),this.longPressTimeout=setTimeout(()=>{this.handleNavigation(t),this.longPressTimeout=null},500))}onTouchEnd(){this.clearLongPressTimeout()}onTouchMove(){this.clearLongPressTimeout()}clearLongPressTimeout(){this.longPressTimeout&&(clearTimeout(this.longPressTimeout),this.longPressTimeout=null)}update(e){(e.docChanged||e.viewportChanged)&&(this.decorations=this.findWikilinks(e.view))}findWikilinks(e){const t=new R,n=/\[\[([^\[\]]+?)\]\]/g;for(const{from:s,to:i}of e.visibleRanges){const o=e.state.doc.sliceString(s,i);let r;for(;r=n.exec(o);){const c=s+r.index,l=c+r[0].length;t.add(c,l,is)}}return t.finish()}}const rs=M.fromClass(os,{decorations:a=>a.decorations}),as=$.mark({class:"cm-checkbox-todo"}),cs=$.mark({class:"cm-checkbox-done"}),ls=$.mark({class:"cm-checkbox-doing"}),ds=M.fromClass(class{decorations;constructor(a){this.decorations=this.findCheckboxes(a)}update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=this.findCheckboxes(a.view))}findCheckboxes(a){const e=new R,t=/^\s*(\[([ |x|-])\])/gm;for(const{from:n,to:s}of a.visibleRanges){const i=a.state.doc.sliceString(n,s);let o;for(;o=t.exec(i);){const r=o[2],c=n+o.index+o[0].indexOf("["),l=c+3;r===" "?e.add(c,l,as):r==="x"?e.add(c,l,cs):r==="-"&&e.add(c,l,ls)}}return e.finish()}},{decorations:a=>a.decorations}),hs=$.mark({class:"cm-timestamp"}),us=M.fromClass(class{decorations;constructor(a){this.decorations=this.findTimestamps(a)}update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=this.findTimestamps(a.view))}findTimestamps(a){const e=new R,t=/^\s*(?:>\s*)*(\d{4,})\s/gm;for(const{from:n,to:s}of a.visibleRanges){const i=a.state.doc.sliceString(n,s);let o;for(;o=t.exec(i);){const r=o[0],c=o[1],l=n+o.index+r.indexOf(c),d=l+c.length;e.add(l,d,hs)}}return e.finish()}},{decorations:a=>a.decorations}),gs=$.mark({class:"cm-naked-link"});function fs(a){return a?a.startsWith("www.")?"https://"+a:a:null}class ps{constructor(e){this.view=e,this.decorations=this.findNakedLinks(e),this.longPressTimeout=null,this.onMouseDown=this.onMouseDown.bind(this),this.onMouseUp=this.onMouseUp.bind(this),this.onTouchStart=this.onTouchStart.bind(this),this.onTouchEnd=this.onTouchEnd.bind(this),this.onTouchMove=this.onTouchMove.bind(this),this.view.dom.addEventListener("mousedown",this.onMouseDown),this.view.dom.addEventListener("mouseup",this.onMouseUp),this.view.dom.addEventListener("touchstart",this.onTouchStart,{passive:!1}),this.view.dom.addEventListener("touchend",this.onTouchEnd),this.view.dom.addEventListener("touchmove",this.onTouchMove,{passive:!0})}destroy(){this.clearLongPressTimeout(),this.view.dom.removeEventListener("mousedown",this.onMouseDown),this.view.dom.removeEventListener("mouseup",this.onMouseUp),this.view.dom.removeEventListener("touchstart",this.onTouchStart),this.view.dom.removeEventListener("touchend",this.onTouchEnd),this.view.dom.removeEventListener("touchmove",this.onTouchMove)}handleNavigation(e){const t=e.target.closest(".cm-naked-link, .cm-url");if(!t)return!1;let n=fs(t.textContent);return n&&(n=n.replace(/[.,;)]+$/,""),window.open(n,"_blank","noopener,noreferrer")),!0}onMouseDown(e){(e.ctrlKey||e.metaKey)&&this.handleNavigation(e)&&e.preventDefault()}onMouseUp(){this.clearLongPressTimeout()}onTouchStart(e){e.target.closest(".cm-naked-link, .cm-url")&&(e.preventDefault(),this.longPressTimeout=setTimeout(()=>{this.handleNavigation(e),this.longPressTimeout=null},500))}onTouchEnd(){this.clearLongPressTimeout()}onTouchMove(){this.clearLongPressTimeout()}clearLongPressTimeout(){this.longPressTimeout&&(clearTimeout(this.longPressTimeout),this.longPressTimeout=null)}update(e){(e.docChanged||e.viewportChanged)&&(this.decorations=this.findNakedLinks(e.view))}findNakedLinks(e){const t=new R,n=/(https?:\/\/[^\s]+)|(www\.[^\s]+)/g;for(const{from:s,to:i}of e.visibleRanges){const o=e.state.doc.sliceString(s,i);let r;for(;r=n.exec(o);){const c=e.state.doc.lineAt(s+r.index);if(/\[.*\]\(.*\)/.test(c.text)&&c.text.includes(`](${r[0]})`))continue;const l=s+r.index,d=l+r[0].length;t.add(l,d,gs)}}return t.finish()}}const ms=M.fromClass(ps,{decorations:a=>a.decorations}),ws=$.line({class:"cm-blockquote"}),ys=M.fromClass(class{decorations;constructor(a){this.decorations=this.findBlockquotes(a)}update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=this.findBlockquotes(a.view))}findBlockquotes(a){const e=new R,t=/^\s*>\s/;for(const{from:n,to:s}of a.visibleRanges){let i=n;for(;i<=s;){const o=a.state.doc.lineAt(i);t.test(o.text)&&e.add(o.from,o.from,ws),i=o.to+1}}return e.finish()}},{decorations:a=>a.decorations}),vs=$.line({class:"cm-hr"}),bs=M.fromClass(class{decorations;constructor(a){this.decorations=this.findRulers(a)}update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=this.findRulers(a.view))}findRulers(a){const e=new R,t=/^\s*([-=*_]){3,}\s*$/;for(const{from:n,to:s}of a.visibleRanges){let i=n;for(;i<=s;){const o=a.state.doc.lineAt(i);t.test(o.text)&&e.add(o.from,o.from,vs),i=o.to+1}}return e.finish()}},{decorations:a=>a.decorations}),Ze=["png","jpg","jpeg","gif","svg","webp","avif"],ge=["mp4","webm","mov","ogg"],fe=["mp3","wav","flac"],Qe=[...Ze,...ge,...fe];function Cs(a){switch(a.toLowerCase()){case"png":return"image/png";case"jpg":case"jpeg":return"image/jpeg";case"gif":return"image/gif";case"svg":return"image/svg+xml";case"webp":return"image/webp";case"avif":return"image/avif";case"mp4":return"video/mp4";case"webm":return"video/webm";case"mov":return"video/quicktime";case"ogg":return"video/ogg";case"mp3":return"audio/mpeg";case"wav":return"audio/wav";case"flac":return"audio/flac";default:return"application/octet-stream"}}class Ie extends qe{constructor(e,t,n,s){super(),this.linkTarget=e,this.altText=t,this.type=n,this.view=s,this.objectURL=null}eq(e){return this.linkTarget===e.linkTarget&&this.type===e.type}toDOM(){const e=document.createElement("span");e.className="cm-embed-container";const t=this.linkTarget.split(".").pop()?.toLowerCase().split("?")[0];if(this.type==="external"){let n;ge.includes(t)?(n=document.createElement("video"),n.className="cm-embedded-video",n.controls=!0):fe.includes(t)?(n=document.createElement("audio"),n.className="cm-embedded-audio",n.controls=!0):(n=document.createElement("img"),n.className="cm-embedded-image",n.alt=this.altText),n.src=this.linkTarget,e.appendChild(n)}else{const n=document.createElement("span");n.className="cm-embed-placeholder",n.textContent=`Loading: ${this.linkTarget}`,e.appendChild(n),this.loadInternalContent(e).catch(s=>{console.error(`Failed to load internal embed for ${this.linkTarget}:`,s),n.textContent=`Error: ${this.linkTarget} not found.`,e.classList.add("cm-embed-error")})}return e}async loadInternalContent(e){let n=decodeURIComponent(this.linkTarget),s=null;n.includes("#")&&([s,n]=n.split("#"));const i=n.split(".").pop()?.toLowerCase(),o=this.view.state.field(F);let r;s&&s!==o.gitClient.gardenName?r=new E(s):r=o.gitClient;const c=n.startsWith("/")?n:`/${n}`;if(Qe.includes(i)){const l=await r.readFileAsBuffer(c);if(!l)throw new Error("File could not be read as a buffer.");const d=Cs(i),u=new Blob([l],{type:d});this.objectURL=URL.createObjectURL(u);let h;Ze.includes(i)?(h=document.createElement("img"),h.className="cm-embedded-image",h.alt=this.linkTarget):ge.includes(i)?(h=document.createElement("video"),h.className="cm-embedded-video",h.controls=!0):fe.includes(i)&&(h=document.createElement("audio"),h.className="cm-embedded-audio",h.controls=!0),h.src=this.objectURL,e.innerHTML="",e.appendChild(h),(h.tagName==="VIDEO"||h.tagName==="AUDIO")&&(h.onerror=g=>{console.error("Embedded media playback error:",g),e.innerHTML=`<span class="cm-embed-error">Error playing: ${this.linkTarget}</span>`},h.load())}else{const l=await r.readFile(c);if(l==null)throw new Error("File content could not be read.");e.innerHTML="",e.classList.add("cm-embedded-content");const d=we.create({doc:l,extensions:[Ye,me(ze,{fallback:!0}),be(n),D.lineWrapping,D.editable.of(!1),...et]});new D({state:d,parent:e})}}destroy(){this.objectURL&&URL.revokeObjectURL(this.objectURL)}}function Pe(a){const e=new R,t=V(a.state),n=a.state.selection,s=new Set;for(const o of n.ranges)s.add(a.state.doc.lineAt(o.head).number);const i=o=>{let r=t.resolve(o,1);for(;r;){if(r.name.includes("Code"))return!0;r=r.parent}return!1};for(const{from:o,to:r}of a.visibleRanges){const c=a.state.doc.sliceString(o,r),l=/!\[\[([^\[\]]+?)\]\]/g;let d;for(;d=l.exec(c);){const h=o+d.index,g=a.state.doc.lineAt(h);if(i(h)||s.has(g.number))continue;const f=h+d[0].length,p=d[1];e.add(h,f,$.replace({widget:new Ie(p,p,"internal",a)}))}const u=/!\[(.*?)\]\((.*?)\)/g;for(;d=u.exec(c);){const h=o+d.index,g=a.state.doc.lineAt(h);if(i(h)||s.has(g.number))continue;const f=h+d[0].length,p=d[1],y=d[2],m=y.split(".").pop()?.toLowerCase()?.split("?")[0];y.startsWith("http")&&Qe.includes(m)&&e.add(h,f,$.replace({widget:new Ie(y,p,"external",a)}))}}return e.finish()}const Ss=M.fromClass(class{constructor(a){this.decorations=Pe(a)}update(a){(a.docChanged||a.viewportChanged||a.selectionSet||V(a.startState)!==V(a.state))&&(this.decorations=Pe(a.view))}},{decorations:a=>a.decorations}),ks=$.line({class:"cm-response-wrapper"}),$e=$.mark({class:"cm-response-tag"}),Es=M.fromClass(class{decorations;constructor(a){this.decorations=this.findResponseBlocks(a)}update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=this.findResponseBlocks(a.view))}findResponseBlocks(a){const e=new R,t=a.state.doc;let n=!1;for(let s=1;s<=t.lines;s++){const i=t.line(s),o=a.visibleRanges.some(r=>r.from<=i.to&&r.to>=i.from);if(i.text.trim()==="<response>"){n=!0,o&&e.add(i.from,i.to,$e);continue}if(i.text.trim()==="</response>"){n=!1,o&&e.add(i.from,i.to,$e);continue}n&&o&&e.add(i.from,i.from,ks)}return e.finish()}},{decorations:a=>a.decorations}),xs=$.line({class:"cm-prompt-wrapper"}),Ts=M.fromClass(class{decorations;constructor(a){this.decorations=this.findPrompts(a)}update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=this.findPrompts(a.view))}findPrompts(a){const e=new R,t=/^\s*>\$\s/;for(const{from:n,to:s}of a.visibleRanges){let i=n;for(;i<=s;){const o=a.state.doc.lineAt(i);t.test(o.text)&&e.add(o.from,o.from,xs),i=o.to+1}}return e.finish()}},{decorations:a=>a.decorations}),Is=$.line({class:"cm-title-heading-line"}),Ps=M.fromClass(class{decorations;constructor(a){this.decorations=this.findTitleHeadings(a)}update(a){(a.docChanged||a.viewportChanged)&&(this.decorations=this.findTitleHeadings(a.view))}findTitleHeadings(a){const e=new R,t=/^#!\s.*$/,n=/(#!)|([A-Z])|([a-z]+)|(\d+)|([\p{P}\p{S}]+)/gu;for(const{from:s,to:i}of a.visibleRanges){let o=s;for(;o<=i;){const r=a.state.doc.lineAt(o);if(t.test(r.text)){e.add(r.from,r.from,Is);let c;for(;c=n.exec(r.text);){const[l,d,u,h,g,f]=c,p=r.from+c.index,y=p+l.length;let m="cm-title-heading-word";d?m+=" cm-title-heading-punctuation cm-title-heading-sigil":u?m+=" cm-title-heading-uppercase":h||(g?m+=" cm-title-heading-number":f&&(m+=" cm-title-heading-punctuation"));const w=$.mark({class:m});e.add(p,y,w)}}o=r.to+1}}return e.finish()}},{decorations:a=>a.decorations});De.initialize({startOnLoad:!0,theme:"base",securityLevel:"loose",themeVariables:{background:"#050f0e",primaryColor:"#12ffbc",secondaryColor:"#07443b",primaryTextColor:"#000000",secondaryTextColor:"#ffffff",tertiaryTextColor:"#ffffff",lineColor:"#12ffbc",textColor:"#dddddd",mainBkg:"#12ffbc",secondBkg:"#07443b",border1:"#12ffbc",border2:"#07443b",arrowheadColor:"#dddddd",fontFamily:'"trebuchet ms", verdana, arial, sans-serif',fontSize:"1rem",labelBackground:"rgba(0, 0, 0, 0.7)",THEME_COLOR_LIMIT:12,nodeBkg:"#12ffbc",nodeBorder:"#12ffbc",clusterBkg:"#07443b",clusterBorder:"#07443b",defaultLinkColor:"#dddddd",titleColor:"#ffffff",edgeLabelBackground:"#050f0e",actorBorder:"#12ffbc",actorBkg:"#12ffbc",actorTextColor:"#000000",actorLineColor:"#3d996b",signalColor:"#dddddd",signalTextColor:"#dddddd",labelBoxBkgColor:"#07443b",labelBoxBorderColor:"#07443b",labelTextColor:"#ffffff",loopTextColor:"#dddddd",noteBorderColor:"#eb9b27",noteBkgColor:"#07443b",noteTextColor:"#dddddd",activationBorderColor:"#12ffbc",activationBkgColor:"#050f0e",sequenceNumberColor:"#000000",sectionBkgColor:"#07443b",altSectionBkgColor:"#050f0e",sectionBkgColor2:"#07443b",excludeBkgColor:"rgba(50, 50, 50, 0.5)",taskBorderColor:"#12ffbc",taskBkgColor:"#12ffbc",taskTextLightColor:"#000000",taskTextColor:"#000000",taskTextDarkColor:"#000000",taskTextOutsideColor:"#dddddd",taskTextClickableColor:"#4dc3f5",activeTaskBorderColor:"#eb9b27",activeTaskBkgColor:"#12ffbc",gridColor:"#07443b",doneTaskBkgColor:"#12ffbc",doneTaskBorderColor:"#12ffbc",critBorderColor:"#ff1342",critBkgColor:"#ff1342",todayLineColor:"#eb9b27",vertLineColor:"#07443b",personBorder:"#12ffbc",personBkg:"#12ffbc",archEdgeColor:"#07443b",archEdgeArrowColor:"#dddddd",archEdgeWidth:"3",archGroupBorderColor:"#07443b",archGroupBorderWidth:"2px",rowOdd:"#050f0e",rowEven:"#07443b",labelColor:"#ffffff",errorBkgColor:"#ff1342",errorTextColor:"#ffffff"}});const te=new Map;async function $s(a){if(te.has(a))return te.get(a);try{const e=`mermaid-${Math.random().toString(36).substr(2,9)}`,{svg:t}=await De.mermaidAPI.render(e,a);return te.set(a,t),t}catch(e){const t=`<div class="cm-mermaid-error-container"><pre class="cm-mermaid-error">Mermaid Error:
${e.message}</pre></div>`;return te.set(a,t),t}}class Ls extends qe{constructor(e){super(),this.code=e}eq(e){return this.code===e.code}toDOM(){const e=document.createElement("div");return e.className="cm-mermaid-container",e.innerHTML="<p>Loading diagram...</p>",setTimeout(()=>{e.isConnected&&$s(this.code).then(t=>{e.innerHTML=t})},0),e}}function Le(a){const e=new R;return V(a.state).iterate({enter:n=>{if(n.name==="FencedCode"){const s=n.node.getChild("CodeInfo");if(s&&a.state.doc.sliceString(s.from,s.to).trim()==="mermaid"){const o=n.node.getChild("CodeText");if(o){const r=a.state.doc.sliceString(o.from,o.to);e.add(n.to,n.to,$.widget({widget:new Ls(r),side:1}))}}}}}),e.finish()}const As=M.fromClass(class{constructor(a){this.decorations=Le(a)}update(a){(a.docChanged||V(a.startState)!==V(a.state))&&(this.decorations=Le(a.view))}},{decorations:a=>a.decorations}),et=[Xn,rs,ds,us,ms,ys,bs,Es,Ts,Ps,As],Ns=[...et,Ss],Ms=$.mark({class:"cm-diff-inserted"});function Ae(a,e){const t=[],n=e.doc.toString(),s=re(a,n);let i=0;for(const[o,r]of s)o===re.INSERT&&t.push(Ms.range(i,i+r.length)),o!==re.DELETE&&(i+=r.length);return $.set(t)}const pe=new q;function Rs(a){return Be.define({create(e){return Ae(a,e)},update(e,t){return t.docChanged?Ae(a,t.state):e.map(t.changes)},provide:e=>D.decorations.from(e)})}const _s=new q,tt=M.fromClass(class{constructor(a){this.view=a,this.statusBar=document.createElement("div"),this.statusBar.className="status-bar",this.filePathElement=document.createElement("span"),this.filePathElement.className="status-bar-filepath",this.tokenCountElement=document.createElement("span"),this.tokenCountElement.className="status-bar-token-count",this.statusBar.appendChild(this.filePathElement),this.statusBar.appendChild(this.tokenCountElement),a.dom.parentElement?a.dom.parentElement.appendChild(this.statusBar):console.error("Could not find a parent element for the editor view to attach the status bar."),this.debouncedUpdate=de(this.updateAll.bind(this),100),this.updateAll()}update(a){(a.docChanged||a.selectionSet||a.viewportChanged)&&this.debouncedUpdate()}getDisplayPath(){const a=this.view.state.field(F);if(!a||!a.editor)return"...";const e=a.editor.gitClient.gardenName,t=a.editor.filePath||"/untitled";return`[${e}] ${t}`}updateAll(){if(!this.view.dom.isConnected)return;const a=this.getDisplayPath();this.filePathElement.textContent!==a&&(this.filePathElement.textContent=a);try{const e=this.view.state.doc.toString(),n=`Tokens: ${z(e).toLocaleString()}`;this.tokenCountElement.textContent!==n&&(this.tokenCountElement.textContent=n)}catch{this.tokenCountElement.textContent="Tokens: Error"}}destroy(){this.debouncedUpdate.cancel(),this.statusBar&&this.statusBar.remove()}});function Fs(){return tt}function Ds({appContext:a,dynamicKeymapExtension:e,vimCompartment:t,defaultKeymapCompartment:n,languageCompartment:s,appContextCompartment:i,updateListener:o,filePath:r,getLanguageExtension:c}){return[i.of(a),e,t.of([]),n.of(j.of(He)),j.of([Gt]),Et(),xt(),Tt(),It(),Pt(),$t(),Lt(),we.allowMultipleSelections.of(!0),At(),me(ze,{fallback:!0}),Nt(),Mt(),Rt(),_t(),Ft(),Dt(),j.of([...Ut,...Bt,...qt,...zt,...Ht,...Wt]),D.lineWrapping,Ot,Ye,s.of(c(r)),o,...Ns,pe.of([]),_s.of(Fs()),D.domEventHandlers({drop(l,d){return l.dataTransfer&&l.dataTransfer.files.length>0?(l.preventDefault(),!0):!1}})]}async function nt(a){const e=new Date,t=String(e.getFullYear()).slice(-2),n=String(e.getMonth()+1).padStart(2,"0"),s=String(e.getDate()).padStart(2,"0"),i=String(e.getHours()).padStart(2,"0"),o=String(e.getMinutes()).padStart(2,"0"),r=`${t}${n}${s}-${i}${o}`,c="/scratchpad";await a.ensureDir(c);let l=`${c}/${r}`,d=0;for(;;)try{await a.pfs.stat(l),d++,l=`${c}/${r}-${d}`}catch(u){if(u.code==="ENOENT")break;throw u}return l}class Os{constructor(e){this.editor=e}getFilePath(e){let t=e.startsWith("#")?e.substring(1):e;return t=decodeURIComponent(t),t||(t="home"),t}async loadFileContent(e){try{return await this.editor.gitClient.readFile(e)}catch(t){return t.message&&t.message.includes("does not exist")||console.warn(`An unexpected error occurred while reading ${e}:`,t),`// "${e.substring(1)}" does not exist. Start typing to create it.`}}async loadFile(e){const t=["png","jpg","jpeg","gif","svg","webp","avif"],n=["mp4","webm","mov","ogg"],s=["mp3","wav","flac"],i=[...t,...n,...s],o=e.split(".").pop()?.toLowerCase();if(i.includes(o)){this.editor.hideDiff(),this.editor.targetElement.classList.remove("is-editor"),this.editor.targetElement.classList.add("is-media-preview"),this.editor.mediaViewerElement.innerHTML="<p>Loading media...</p>";const d=await this.editor.gitClient.readFileAsBuffer(e);if(d){const h={png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",gif:"image/gif",svg:"image/svg+xml",webp:"image/webp",avif:"image/avif",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",ogg:"video/ogg",mp3:"audio/mpeg",wav:"audio/wav",flac:"audio/flac"}[o]||"application/octet-stream",g=new Blob([d],{type:h});this.editor.currentMediaObjectUrl&&URL.revokeObjectURL(this.editor.currentMediaObjectUrl),this.editor.currentMediaObjectUrl=URL.createObjectURL(g);let f="";t.includes(o)?f=`<img src="${this.editor.currentMediaObjectUrl}" alt="${e}" />`:n.includes(o)?f=`<video src="${this.editor.currentMediaObjectUrl}" controls></video>`:s.includes(o)&&(f=`<audio src="${this.editor.currentMediaObjectUrl}" controls></audio>`),this.editor.mediaViewerElement.innerHTML=f;const p=this.editor.mediaViewerElement.querySelector("video, audio");p&&p.load()}else this.editor.mediaViewerElement.innerHTML=`<p class="error">Could not load media: ${e}</p>`;this.editor.filePath=e,this.editor.sidebar&&await this.editor.sidebar.refresh(),await this.editor._applyUserSettings();return}this.editor.targetElement.classList.remove("is-media-preview"),this.editor.targetElement.classList.add("is-editor"),this.editor.currentMediaObjectUrl&&(URL.revokeObjectURL(this.editor.currentMediaObjectUrl),this.editor.currentMediaObjectUrl=null),this.editor.hideDiff();const r=await this.loadFileContent(e);this.editor.filePath=e;const c=be(e);this.editor.editorView.dispatch({effects:this.editor.languageCompartment.reconfigure(c)});const l=this.editor.editorView.state.doc;this.editor.editorView.dispatch({changes:{from:0,to:l.length,insert:r},annotations:this.editor.programmaticChange.of(!0)}),this.editor.sidebar&&await this.editor.sidebar.refresh(),await this.editor._applyUserSettings()}async forceReloadFile(e){if(this.editor.filePath!==e||!this.editor.editorView){await this.loadFile(e);return}const t=this.editor.editorView.state.selection,n=this.editor.editorView.scrollDOM.scrollTop,s=await this.loadFileContent(e),i=this.editor.editorView.state.doc;if(s===i.toString())return;const o=s.length,r={changes:{from:0,to:i.length,insert:s},annotations:this.editor.programmaticChange.of(!0),selection:{anchor:Math.min(t.main.anchor,o),head:Math.min(t.main.head,o)}};this.editor.editorView.dispatch(r),requestAnimationFrame(()=>{this.editor.editorView&&this.editor.editorView.scrollDOM&&(this.editor.editorView.scrollDOM.scrollTop=n)})}async newFile(){try{const e=await C.prompt({title:"New File",label:"Enter file name (or leave blank for a scratchpad):"});if(e===null){this.editor.editorView?.focus();return}let t;if(!e.trim())t=await nt(this.editor.gitClient);else{const n=e.trim();t=`/${n}`;try{const i=(await this.editor.gitClient.pfs.stat(t)).isDirectory()?"folder":"file";await this.editor.sidebar.showAlert({title:"Creation Failed",message:`A ${i} named "${n}" already exists.`});return}catch(s){if(s.code!=="ENOENT"){console.error("Error checking for file:",s),await this.editor.sidebar.showAlert({title:"Error",message:"An unexpected error occurred."});return}}}window.thoughtform.workspace.openFile(this.editor.gitClient.gardenName,t)}finally{}}async duplicateFile(e){if(e)try{if((await this.editor.gitClient.pfs.stat(e)).isDirectory()){await this.editor.sidebar.showAlert({title:"Action Not Supported",message:"Duplicating folders is not yet supported."});return}const n=e.substring(0,e.lastIndexOf("/")),s=e.substring(e.lastIndexOf("/")+1),i=`${s.split(".").slice(0,-1).join(".")||s} (copy)${s.includes(".")?"."+s.split(".").pop():""}`,o=await C.prompt({title:"Duplicate File",label:"Enter name for duplicated file:",defaultValue:i});if(o===null){this.editor.editorView?.focus();return}if(!o.trim())return;const r=`${n}/${o.trim()}`;try{const c=await this.editor.gitClient.readFile(e);await this.editor.gitClient.writeFile(r,c),window.thoughtform.workspace.openFile(this.editor.gitClient.gardenName,r)}catch(c){console.error("Error duplicating file:",c),await this.editor.sidebar.showAlert({title:"Error",message:`Failed to duplicate file: ${c.message}`})}}finally{}}}class Gs{constructor(e){this.editor=e}async showDiff(e){if(e===null){this.hideDiff();return}const t=Rs(e);this.editor.editorView.dispatch({effects:pe.reconfigure(t)})}hideDiff(){this.editor.editorView.dispatch({effects:pe.reconfigure([])})}async previewHistoricalFile(e,t,n){const[s,i]=await Promise.all([this.editor.gitClient.readBlobFromCommit(t,e),this.editor.gitClient.readBlobFromCommit(n,e)]);if(s===null||i===null){await this.editor.sidebar.showAlert({title:"Error",message:"Could not load historical diff for this file."});return}this.editor.editorView.dispatch({changes:{from:0,to:this.editor.editorView.state.doc.length,insert:s},annotations:this.editor.programmaticChange.of(!0)}),this.showDiff(i)}}class Us{constructor(e){this.editor=e}getCurrentState(){return this.editor.editorView?{selection:{main:{anchor:this.editor.editorView.state.selection.main.anchor,head:this.editor.editorView.state.selection.main.head}},scrollTop:this.editor.editorView.scrollDOM.scrollTop}:null}restoreState(e){if(!this.editor.editorView||!e)return;const t=this.editor.editorView.state.update({selection:{anchor:e.selection.main.anchor,head:e.selection.main.head}});this.editor.editorView.dispatch(t),requestAnimationFrame(()=>{this.editor.editorView.scrollDOM&&(this.editor.editorView.scrollDOM.scrollTop=e.scrollTop)})}}class Ce{static editors=[];constructor({target:e,editorConfig:t={},gitClient:n,commandPalette:s,initialFile:i,paneId:o}){if(!n)throw new Error("Editor requires a gitClient instance.");if(!s)throw new Error("Editor requires a commandPalette instance.");this.targetElement=typeof e=="string"?document.querySelector(e):e,this.editorConfig=t,this.gitClient=n,this.commandPalette=s,this.paneId=o,this.editorView=null,this.sidebar=null,this.filePath=i||"/home",this.isReady=!1,this.keymapService=null,this.languageCompartment=new q,this.vimCompartment=new q,this.defaultKeymapCompartment=new q,this.appContextCompartment=new q,this.mediaViewerElement=null,this.currentMediaObjectUrl=null,this.programmaticChange=jt.define(),this._files=new Os(this),this._git=new Gs(this),this._state=new Us(this),this.debouncedHandleUpdate=de(this.handleUpdate.bind(this),500),this.debouncedStateSave=de(()=>{window.thoughtform.workspace?._saveStateToSession()},500),this.init()}async init(){if(!this.targetElement){console.error("Target container not found or provided.");return}if(document.querySelector("#sidebar").hasChildNodes())this.sidebar=window.thoughtform.sidebar;else{await this.gitClient.initRepo(),this.sidebar=new Gn({target:"#sidebar",gitClient:this.gitClient,editor:this}),await this.sidebar.init(),window.thoughtform._dragDropInitialized||(Un(this.sidebar),window.thoughtform._dragDropInitialized=!0);const r=document.getElementById("loading-indicator");r&&r.remove(),document.querySelector(".main-content").style.display="flex"}window.thoughtform.sidebar||(window.thoughtform.sidebar=this.sidebar);let e=await this._files.loadFileContent(this.filePath);this.mediaViewerElement=document.createElement("div"),this.mediaViewerElement.className="media-viewer-container",this.targetElement.appendChild(this.mediaViewerElement);const t=D.updateListener.of(r=>{r.docChanged&&!r.transactions.some(c=>c.annotation(this.programmaticChange))&&this.debouncedHandleUpdate(r.state.doc.toString()),(r.selectionSet||r.viewportChanged)&&this.debouncedStateSave()}),n=we.create({doc:e}),s=new D({state:n});this.keymapService=new jn(s);const i=this.keymapService.getCompartment(),o=Ds({appContext:F.init(()=>({gitClient:this.gitClient,sidebar:this.sidebar,editor:this})),dynamicKeymapExtension:i,vimCompartment:this.vimCompartment,defaultKeymapCompartment:this.defaultKeymapCompartment,languageCompartment:this.languageCompartment,appContextCompartment:this.appContextCompartment,updateListener:t,filePath:this.filePath,getLanguageExtension:be});this.editorView=new D({doc:e,extensions:o,parent:this.targetElement}),this.keymapService.editorView=this.editorView,s.destroy(),Ce.editors.push(this),this.isReady=!0,await this.loadFile(this.filePath)}async _applyUserSettings(){const{value:e}=await window.thoughtform.config.get("interface.yml","editingMode",this);e==="vim"?(Vt.map("jj","<Esc>","insert"),this.editorView.dispatch({effects:[this.vimCompartment.reconfigure(Kt()),this.defaultKeymapCompartment.reconfigure([])]})):this.editorView.dispatch({effects:[this.vimCompartment.reconfigure([]),this.defaultKeymapCompartment.reconfigure(j.of(He))]}),this.keymapService&&await this.keymapService.updateKeymaps()}async navigateTo(e){if(!e)return;let t=e.split("|")[0].trim(),n=null;if(t.includes("#")&&([n,t]=t.split("#")),n&&n!==this.gitClient.gardenName)window.thoughtform.workspace.openFile(n,t.startsWith("/")?t:`/${t}`);else{const s=this.gitClient.gardenName;let o=await he(t,{gitClient:this.gitClient,sidebar:this.sidebar})||(t.startsWith("/")?t:`/${t}`);window.thoughtform.workspace.openFile(s,o)}}async handleUpdate(e){this.isReady&&(await this.gitClient.writeFile(this.filePath,e),window.thoughtform.events.publish("file:update",{gardenName:this.gitClient.gardenName,path:this.filePath,content:e}),window.thoughtform.workspace.notifyFileUpdate(this.gitClient.gardenName,this.filePath,this.paneId),this.sidebar&&await this.sidebar.refresh())}refreshStatusBar(){if(this.editorView){const e=this.editorView.plugin(tt);e&&e.updateAll()}}getFilePath(e){return this._files.getFilePath(e)}loadFileContent(e){return this._files.loadFileContent(e)}loadFile(e){return this._files.loadFile(e)}forceReloadFile(e){return this._files.forceReloadFile(e)}newFile(){return this._files.newFile()}duplicateFile(e){return this._files.duplicateFile(e)}showDiff(e){return this._git.showDiff(e)}hideDiff(){return this._git.hideDiff()}previewHistoricalFile(e,t,n){return this._git.previewHistoricalFile(e,t,n)}getCurrentState(){return this._state.getCurrentState()}restoreState(e){return this._state.restoreState(e)}}function Bs(){qs(),zs()}function qs(){const a=document.querySelector(".app-container"),e=document.getElementById("resizer"),t=document.getElementById("resize-overlay");if(!a||!e||!t)return;const n=document.createElement("button");n.id="sidebar-toggle-icon",n.title="Toggle Sidebar (Ctrl + [)",e.appendChild(n);let s=0,i=!1;const o=()=>{if(a.classList.contains("sidebar-collapsed")){const p=localStorage.getItem("sidebarWidth")||"250px";a.classList.remove("sidebar-collapsed"),document.documentElement.style.setProperty("--sidebar-width",p),localStorage.setItem("sidebarCollapsed","false"),n.textContent="‹"}else{const p=document.documentElement.style.getPropertyValue("--sidebar-width");p!=="0px"&&localStorage.setItem("sidebarWidth",p),a.classList.add("sidebar-collapsed"),document.documentElement.style.setProperty("--sidebar-width","0px"),localStorage.setItem("sidebarCollapsed","true"),n.textContent="›"}};window.thoughtform&&window.thoughtform.ui&&(window.thoughtform.ui.toggleSidebar=o);const r=f=>{f.type==="touchmove"&&f.preventDefault();const p=f.clientX||f.touches&&f.touches[0].clientX;if(Math.abs(p-s)>5&&(i=!0),i){const y=Math.max(24,Math.min(p,window.innerWidth-100));document.documentElement.style.setProperty("--sidebar-width",`${y}px`),a.classList.remove("sidebar-collapsed"),n.textContent="‹"}},c=()=>{if(t.style.display="none",document.body.style.cursor="default",document.body.style.userSelect="auto",document.removeEventListener("mousemove",r),document.removeEventListener("touchmove",r),document.removeEventListener("mouseup",c),document.removeEventListener("touchend",c),i){const f=document.documentElement.style.getPropertyValue("--sidebar-width");localStorage.setItem("sidebarWidth",f),localStorage.setItem("sidebarCollapsed","false")}else o()},l=f=>{s=f.clientX||f.touches&&f.touches[0].clientX,i=!1,f.preventDefault(),t.style.display="block",document.body.style.cursor="col-resize",document.body.style.userSelect="none",document.addEventListener("mousemove",r,{passive:!1}),document.addEventListener("touchmove",r,{passive:!1}),document.addEventListener("mouseup",c),document.addEventListener("touchend",c)};e.addEventListener("mousedown",l),e.addEventListener("touchstart",l,{passive:!1});const u=(window.location.hash||"").includes("?windowed=true"),h=localStorage.getItem("sidebarWidth");u||localStorage.getItem("sidebarCollapsed")==="true"?(a.classList.add("sidebar-collapsed"),document.documentElement.style.setProperty("--sidebar-width","0px"),n.textContent="›"):(document.documentElement.style.setProperty("--sidebar-width",h||"250px"),n.textContent="‹")}function zs(){const a=document.getElementById("eruda-container"),e=document.getElementById("eruda-resizer");let t;if(!a||!e)return;const n=document.createElement("button");n.id="eruda-toggle",n.title="Toggle DevTools (Ctrl + `)",e.appendChild(n);let s=0,i=!1;const o=(u=null,h=null)=>{if(t=document.querySelector(".eruda-dev-tools"),!t)return;const g=t.style.height==="0px"||t.offsetHeight<10;if(u===null?g:u){const p=localStorage.getItem("erudaHeight")||"250px";t.style.height=p,n.textContent="▼",localStorage.setItem("erudaCollapsed","false"),h&&setTimeout(()=>window.thoughtform.eruda?.show(h),50)}else{if(g)return;localStorage.setItem("erudaHeight",t.style.height),t.style.height="0px",n.textContent="▲",localStorage.setItem("erudaCollapsed","true")}};window.thoughtform&&window.thoughtform.ui&&(window.thoughtform.ui.toggleDevtools=o);const r=u=>{u.type==="touchmove"&&u.preventDefault();const h=u.clientY||u.touches&&u.touches[0].clientY;if(Math.abs(h-s)>5&&(i=!0),!i)return;const g=window.innerHeight-h,f=42,p=window.innerHeight-100;t.style.height=`${Math.max(f,Math.min(g,p))}px`,n.textContent="▼"},c=()=>{document.body.style.cursor="default",document.body.style.userSelect="auto",document.removeEventListener("mousemove",r),document.removeEventListener("touchmove",r),document.removeEventListener("mouseup",c),document.removeEventListener("touchend",c),i?(localStorage.setItem("erudaHeight",t.style.height),localStorage.setItem("erudaCollapsed","false")):o(null,null)},l=u=>{s=u.clientY||u.touches&&u.touches[0].clientY,i=!1,u.preventDefault(),t=document.querySelector(".eruda-dev-tools"),t&&(document.body.style.cursor="row-resize",document.body.style.userSelect="none",document.addEventListener("mousemove",r,{passive:!1}),document.addEventListener("touchmove",r,{passive:!1}),document.addEventListener("mouseup",c),document.addEventListener("touchend",c))};e.addEventListener("mousedown",l),e.addEventListener("touchstart",l,{passive:!1});const d=new MutationObserver(()=>{t=document.querySelector(".eruda-dev-tools"),t&&((window.location.hash||"").includes("?windowed=true")||localStorage.getItem("erudaCollapsed")==="true"?(t.style.height="0px",n.textContent="▲"):(t.style.height=localStorage.getItem("erudaHeight")||"150px",n.textContent="▼"),d.disconnect())});d.observe(a,{childList:!0})}class Hs{constructor(){const e=new URLSearchParams(window.location.search);this.isEnabled=e.has("debug"),console.log(`[DEBUG] Debug mode is ${this.isEnabled?"ENABLED":"DISABLED"}`)}log(...e){this.isEnabled&&console.log("[DEBUG]",...e)}error(...e){this.isEnabled&&console.error("[DEBUG]",...e)}warn(...e){this.isEnabled&&console.warn("[DEBUG]",...e)}}const k=new Hs;class Ws{constructor(e){this.signaling=e}connectToSignalingServer(){return new Promise((e,t)=>{const n=this.signaling.signalingServerUrl;if(this.signaling.ws&&this.signaling.ws.readyState===WebSocket.OPEN){e();return}this.signaling.ws=new WebSocket(n),this.signaling.ws.onopen=()=>{k.log(`Connected to signaling server at ${n}`),e()},this.signaling.ws.onclose=()=>{k.log("Disconnected from signaling server"),this.signaling.sync.disconnect()},this.signaling.ws.onerror=s=>{k.error("WebSocket error:",s),this.signaling.sync.updateConnectionState("error","Signaling server connection error."),t(new Error(`Failed to connect to signaling server at ${n}`))},this.signaling.ws.onmessage=s=>{try{const i=JSON.parse(s.data);this.signaling._signalingMessageHandler&&this.signaling._signalingMessageHandler.handleSignalingMessage(i)}catch(i){k.error("Error parsing signaling message:",i)}}})}sendJoinSessionRequest(e,t){const n=this.signaling.ws;if(n&&n.readyState===WebSocket.OPEN){const s={type:"join_session",sessionId:e};t&&(s.peerNamePrefix=t),n.send(JSON.stringify(s))}else k.error("Cannot send join session request, WebSocket is not open.")}sendSignal(e,t){const n=this.signaling.ws;n&&n.readyState===WebSocket.OPEN&&n.send(JSON.stringify({type:"signal",target:t,data:e}))}}class js{constructor(e){this.signaling=e}handleSignalingMessage(e){const t=this.signaling.sync;switch(e.type){case"welcome":k.log("Received welcome from signaling server.");break;case"session_joined":this.signaling.peerId=e.peerId,t.updateConnectionState("connected-signal","Connected to tracker, waiting for peers..."),e.peers&&e.peers.length>0&&e.peers.forEach(n=>{this.signaling.connectToPeer(n)});break;case"peer_joined":this.signaling.connectToPeer(e.peerId);break;case"signal":e.from&&e.data&&this.signaling.handleSignal(e.from,e.data);break;case"peer_left":e.peerId&&t.handlePeerLeft(e.peerId);break;case"error":t.updateConnectionState("error",`Signaling error: ${e.message}`);break}}}const Vs=500;class Ks{constructor(e){this.signaling=e,this.sync=e.sync,this.seenMessages=new Set}handleIncomingMessage(e,t){if(!e.payload||!e.messageId){k.warn("Received a message without a payload or messageId, cannot process.",e);return}if(this.seenMessages.has(e.messageId))return;if(this.seenMessages.add(e.messageId),this.seenMessages.size>Vs){const s=this.seenMessages.values().next().value;this.seenMessages.delete(s)}e.noGossip||this.sendSyncMessage(e.payload,null,e.messageId);const n=e.payload;switch(n.type){case"peer_introduction":this.sync.handlePeerIntroduction(n);break;default:this.sync.fileSync&&this.sync.fileSync.handleSyncMessage(n);break}}sendSyncMessage(e,t=null,n=null){const s=n||crypto.randomUUID(),o=JSON.stringify({messageId:s,payload:e,noGossip:!!t});if(this.seenMessages.add(s),t){const r=this.sync.peerConnections.get(t);if(r&&r.dataChannel&&r.dataChannel.readyState==="open")try{r.dataChannel.send(o)}catch(c){console.error(`Error sending direct message to ${t.substring(0,8)}...:`,c)}}else this.sync.peerConnections.forEach((r,c)=>{if(r.dataChannel&&r.dataChannel.readyState==="open")try{r.dataChannel.send(o)}catch(l){console.error(`Error gossiping message to ${c.substring(0,8)}...:`,l)}})}destroy(){this.seenMessages.clear()}}class Js{constructor(e){this.signaling=e}async connectToPeer(e){const t=this.signaling.sync,n=t.createPeerConnection(e,!0);if(n)try{const s=n.createDataChannel("syncChannel");t.setupDataChannel(e,s);const i=await n.createOffer();await n.setLocalDescription(i),this.signaling.sendSignal({type:"offer",sdp:i.sdp},e)}catch(s){k.error(`Failed to initiate connection to ${e}:`,s)}}}class Ys{constructor(e){this.sync=e,this.ws=null,this.signalingServerUrl=localStorage.getItem("thoughtform_signaling_server")||"wss://socket.thoughtform.garden",this.peerId=null,this._webSocketManager=new Ws(this),this._signalingMessageHandler=new js(this),this._webrtcInitiator=new Js(this),this._syncMessageRouter=new Ks(this)}updateSignalingServerUrl(e){this.signalingServerUrl=e,localStorage.setItem("thoughtform_signaling_server",e)}async joinSession(e,t){try{await this._webSocketManager.connectToSignalingServer(),this._webSocketManager.sendJoinSessionRequest(e,t)}catch{this.sync.updateConnectionState("error","Failed to connect to signaling server.")}}connectToPeer(e){e!==this.peerId&&this.peerId>e&&this._webrtcInitiator.connectToPeer(e)}sendSignal(e,t){this._webSocketManager.sendSignal(e,t)}async handleSignal(e,t){const n=this.sync;try{let s=n.peerConnections.get(e);if(!s)if(t.type==="offer"){if(s=n.createPeerConnection(e,!1),!s){console.warn(`[SYNC-SIGNAL] Received offer from ${e.substring(0,8)} but at connection limit. Ignoring.`);return}}else{k.warn(`[SYNC-SIGNAL] Received signal from unknown peer ${e.substring(0,8)} before an offer. Discarding.`);return}if(t.type==="offer"){await s.setRemoteDescription(new RTCSessionDescription(t));const i=await s.createAnswer();await s.setLocalDescription(i),this.sendSignal({type:"answer",sdp:i.sdp},e)}else t.type==="answer"?await s.setRemoteDescription(new RTCSessionDescription(t)):t.type==="candidate"&&await s.addIceCandidate(new RTCIceCandidate(t.candidate))}catch(s){k.error(`Error handling signal from ${e}:`,s)}}sendSyncMessage(e,t,n){this._syncMessageRouter.sendSyncMessage(e,t,n)}handleIncomingMessage(e,t){this._syncMessageRouter.handleIncomingMessage(e,t)}destroy(){this.ws&&(this.ws.close(),this.ws=null),this._syncMessageRouter.destroy()}}class Xs{constructor(){this._listeners={}}addEventListener(e,t){e in this._listeners||(this._listeners[e]=[]),this._listeners[e].push(t)}removeEventListener(e,t){if(!(e in this._listeners))return;const n=this._listeners[e];for(let s=0,i=n.length;s<i;s++)if(n[s]===t){n.splice(s,1);return}}dispatchEvent(e){if(!(e.type in this._listeners))return!0;const t=this._listeners[e.type].slice();for(let n=0,s=t.length;n<s;n++)t[n].call(this,e);return!e.defaultPrevented}destroy(){this._listeners={}}}class Zs{static getGitClient(e){if(e.gitClient)return e.gitClient;if(e.sync&&e.sync.gitClient)return e.sync.gitClient;if(window.thoughtform){for(const t in window.thoughtform)if(window.thoughtform[t]&&typeof window.thoughtform[t]=="object"){if(window.thoughtform[t].hasOwnProperty("readFile")&&window.thoughtform[t].hasOwnProperty("writeFile"))return k.log(`DEBUG: Found potential gitClient-like object at window.thoughtform.${t}`),window.thoughtform[t];if(window.thoughtform[t].gitClient)return k.log(`DEBUG: Found gitClient at window.thoughtform.${t}.gitClient`),window.thoughtform[t].gitClient}if(window.thoughtform.gitClient)return k.log("DEBUG: Found gitClient at window.thoughtform.gitClient"),window.thoughtform.gitClient;if(window.thoughtform.editor&&window.thoughtform.editor.gitClient)return k.log("DEBUG: Found gitClient at window.thoughtform.editor.gitClient"),window.thoughtform.editor.gitClient}return k.log("DEBUG: _getGitClient: No gitClient found in standard locations or window.thoughtform"),null}}class Qs{static setupDataChannel(e,t){t.onopen=()=>{e.sync.isConnected=!0,e.sync.ui.showMessages(),e.sync.addMessage("File sync data channel is open."),k.log("DEBUG: SyncFiles confirmed data channel is open.")},t.onmessage=async n=>{try{const s=JSON.parse(n.data);await e.sync._handleIncomingSyncMessage(s,"P2P")}catch(s){console.error("Error parsing sync message from DataChannel:",s,"Raw data:",n.data)}},t.onclose=()=>{e.sync.isConnected=!1,e.sync.ui.hideMessages(),e.sync.addMessage("File sync data channel closed."),k.log("DEBUG: SyncFiles confirmed data channel is closed.")},t.onerror=n=>{const s=n.error;s&&s.name==="OperationError"&&s.message.includes("User-Initiated Abort")?k.log("Data channel closed intentionally by a peer.",n):(console.error("Data channel error:",n),e.sync.addMessage("Data channel error: "+(s?s.message:"Unknown error")))}}}class st{static async _listAllFiles(e,t){const n=e.pfs;if(!n)throw new Error("gitClient does not have pfs property");let s=[];try{const i=await n.readdir(t);for(const o of i){if(o===".git")continue;const r=t==="/"?`/${o}`:`${t}/${o}`;try{(await n.stat(r)).isDirectory()?s=s.concat(await this._listAllFiles(e,r)):s.push(r)}catch(c){k.warn(`Could not stat ${r}, skipping.`,c)}}}catch(i){k.log(`Directory not readable: ${t}`,i)}return s}static async handleFileUpdate(e,t){e.incrementPendingWrites();try{if(!t.gardenName)throw new Error("Received file update without a gardenName during a full sync.");const n=new E(t.gardenName);if(t.isFullSync){e.deletedGitDirs.has(t.gardenName)||(e.deletedGitDirs.add(t.gardenName),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Preparing to receive garden: ${t.gardenName}...`,type:"info"}})),await n.initRepo(),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Replacing git history for ${t.gardenName}...`,type:"info"}})),await n.rmrf("/.git")),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Writing: ${t.path.substring(1)} (${t.gardenName})`,type:"info"}}));const s=Buffer.from(t.content,"base64");await n.writeFile(t.path,s)}else{const s=t.isBase64?Buffer.from(t.content,"base64"):t.content;await n.writeFile(t.path,s),e.sync.addMessage(`Updated file: ${t.path} in garden ${t.gardenName}`)}}catch(n){console.error("Error handling file update for path:",t.path,n),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Error updating file ${t.path}: ${n.message}`,type:"error"}}))}finally{e.decrementPendingWrites()}}}class it{static async handleSyncMessage(e,t){switch(t.type){case"send_initiation":this.handleSendInitiation(e,t);break;case"sync_cancel":this.handleSyncCancel(e,t);break;case"file_update":await st.handleFileUpdate(e,t);break;case"request_gardens":await this.handleRequestGardens(e,t.gardens,t.requesterId);break;case"garden_zip_chunk":await this.handleGardenZipChunk(e,t);break;case"garden_zip_complete":await this.handleGardenZipComplete(e,t);break;case"full_sync_complete":e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:"File stream complete. Waiting for writes to finish...",type:"info"}})),e.markSyncStreamAsComplete();break;default:k.log("Unknown sync message type:",t.type)}}static handleSendInitiation(e,t){e.isSyncCancelled||(e.currentTransferId=t.transferId,e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Incoming transfer from peer for gardens: ${t.gardens.join(", ")}.`,type:"info"}})))}static handleSyncCancel(e,t){e.currentTransferId===t.transferId&&e.cancelSync(!1)}static async handleRequestGardens(e,t=[],n){if(!n){const s="Error: Received garden request without a requesterId. Cannot send response.";console.error(s),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:s,type:"error"}}));return}e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Received request for gardens: ${t.join(", ")} from ${n.substring(0,8)}...`,type:"info"}})),await this.sendGardens(e,t,[n])}static async sendGardens(e,t,n){if(!t||t.length===0||!n||n.length===0)return;const s=crypto.randomUUID();e.currentTransferId=s,e.targetPeers=n,e.sync.sendSyncMessage({type:"send_initiation",gardens:t,transferId:s});const i=64*1024,o=10*1024*1024,r=c=>new Promise(l=>{if(c.bufferedAmount<o)l();else{const d=()=>{c.bufferedAmount<o&&(c.removeEventListener("bufferedamountlow",d),l())};c.addEventListener("bufferedamountlow",d)}});try{for(const c of t){if(e.isSyncCancelled)throw new Error("Sync cancelled by user.");e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Preparing ${c} for transfer...`,type:"info"}}));const l=new X,d=new E(c),u=await this.getAllFilesIncludingGit(d.pfs,"/");e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Zipping ${u.length} files from ${c}...`,type:"info"}}));for(const p of u){if(e.isSyncCancelled)throw new Error("Sync cancelled by user.");const y=await d.pfs.readFile(p),m=p.startsWith("/")?p.substring(1):p;l.file(m,y)}if(e.isSyncCancelled)throw new Error("Sync cancelled by user.");const h=await l.generateAsync({type:"uint8array",compression:"DEFLATE",compressionOptions:{level:6}}),g=(h.length/1024/1024).toFixed(2);e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Zip created for ${c} (${g} MB).`,type:"info"}}));const f=Math.ceil(h.length/i);for(const p of n){if(e.isSyncCancelled)throw new Error("Sync cancelled by user.");const y=e.sync.peerConnections.get(p);if(!y||!y.dataChannel||y.dataChannel.readyState!=="open"){const w=`Error: Cannot send files to ${p.substring(0,8)}... No open data channel.`;console.error(w),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:w,type:"error"}}));continue}const m=y.dataChannel;e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Sending ${c} to ${p.substring(0,8)}...`,type:"info"}}));for(let w=0;w<f;w++){if(e.isSyncCancelled)throw new Error("Sync cancelled by user.");await r(m);const b=w*i,S=Math.min(b+i,h.length),x=h.slice(b,S);e.sync.sendSyncMessage({type:"garden_zip_chunk",gardenName:c,transferId:s,chunkIndex:w,totalChunks:f,data:Buffer.from(x).toString("base64"),zipSize:h.length},p),((w+1)%10===0||w+1===f)&&e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Sent ${w+1} of ${f} chunks for ${c} to ${p.substring(0,8)}...`,type:"info"}}))}e.sync.sendSyncMessage({type:"garden_zip_complete",gardenName:c,transferId:s},p),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Finished sending ${c} to ${p.substring(0,8)}.`,type:"info"}}))}}for(const c of n)e.sync.sendSyncMessage({type:"full_sync_complete"},c);e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:"All selected gardens sent successfully.",type:"complete",action:"send"}}))}catch(c){c.message.includes("cancelled")?e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:"Sync cancelled by user.",type:"cancelled"}})):(console.error("Error handling garden send/request:",c),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Error: ${c.message}`,type:"error"}})))}}static async getAllFilesIncludingGit(e,t){let n=[];try{const s=await e.readdir(t);for(const i of s){const o=`${t==="/"?"":t}/${i}`;try{(await e.stat(o)).isDirectory()?n=n.concat(await this.getAllFilesIncludingGit(e,o)):n.push(o)}catch(r){k.warn(`Could not stat ${o}, skipping.`,r)}}}catch(s){k.log(`Directory not readable: ${t}`,s)}return n}static async handleGardenZipChunk(e,t){if(e.isSyncCancelled||e.currentTransferId!==t.transferId)return;e.activeTransfers||(e.activeTransfers=new Map);const n=`${t.gardenName}-${t.transferId}`;e.activeTransfers.has(n)||(e.activeTransfers.set(n,{chunks:new Array(t.totalChunks),receivedCount:0,totalChunks:t.totalChunks,gardenName:t.gardenName,zipSize:t.zipSize}),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Receiving ${t.gardenName} (${(t.zipSize/1024/1024).toFixed(2)} MB)...`,type:"info"}})));const s=e.activeTransfers.get(n);s.chunks[t.chunkIndex]=Buffer.from(t.data,"base64"),s.receivedCount++,(s.receivedCount%10===0||s.receivedCount===s.totalChunks)&&e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Received ${s.receivedCount} of ${s.totalChunks} chunks for ${t.gardenName}...`,type:"info"}}))}static async handleGardenZipComplete(e,t){if(e.isSyncCancelled)return;const n=`${t.gardenName}-${t.transferId}`,s=e.activeTransfers.get(n);if(s){if(s.receivedCount!==s.totalChunks){e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Error: Missing chunks for ${t.gardenName}`,type:"error"}})),e.activeTransfers.delete(n);return}try{e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Reassembling and extracting ${t.gardenName}...`,type:"info"}}));const i=s.chunks.reduce((h,g)=>h+g.length,0),o=new Uint8Array(i);let r=0;for(const h of s.chunks)o.set(h,r),r+=h.length;const c=await X.loadAsync(o),l=new E(t.gardenName);await l.initRepo(),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Clearing existing data for ${t.gardenName}...`,type:"info"}})),await l.rmrf("/.git"),await l.clearWorkdir();const d=Object.entries(c.files);let u=0;for(const[h,g]of d)if(!g.dir){const f=await g.async("uint8array"),p=`/${h}`,y=p.substring(0,p.lastIndexOf("/"));y&&y!=="/"&&await l.ensureDir(y),await l.pfs.writeFile(p,f),u++}e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Successfully extracted ${t.gardenName} (${u} files).`,type:"complete"}})),e.activeTransfers.delete(n),e.activeTransfers.size===0&&e.markSyncStreamAsComplete()}catch(i){console.error(`Error extracting garden ${t.gardenName}:`,i),e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Error extracting ${t.gardenName}: ${i.message}`,type:"error"}})),e.activeTransfers.delete(n)}}}}class Ne{static async sendGardensToPeers(e,t){e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:"Initiating send process...",type:"info"}})),await it.sendGardens(e,t.gardens,t.peers)}static requestSpecificGardens(e,t){e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:"Requesting selected gardens from peers...",type:"info"}}));const n=e.sync.signaling.peerId;if(!n){const s="Cannot request gardens: own peer ID is not available.";e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:s,type:"error"}})),console.error(s);return}Object.entries(t).forEach(([s,i])=>{const o=s.substring(0,8);e.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`Sending request to peer ${o}... for gardens: ${i.join(", ")}`,type:"info"}})),e.sync.sendSyncMessage({type:"request_gardens",gardens:i,requesterId:n},s)}),e.sync.addMessage(`Sent requests for ${Object.keys(t).length} peer(s).`)}static sendFileUpdate(e,t,n,s){e.sync.sendSyncMessage({type:"file_update",path:t,content:n,timestamp:s})}}class ei extends Xs{constructor(e){super(),this.sync=e,this.gitClient=null,this.pendingWriteCount=0,this.isSyncCompleteMessageReceived=!1,this.deletedGitDirs=new Set,this.isSyncFailed=!1,this.isSyncCancelled=!1,this.activeTransfers=new Map,this.currentTransferId=null,this.targetPeers=[]}resetFullSyncState(){this.pendingWriteCount=0,this.isSyncCompleteMessageReceived=!1,this.deletedGitDirs.clear(),this.activeTransfers.clear(),this.isSyncFailed=!1,this.isSyncCancelled=!1,this.currentTransferId=null,this.targetPeers=[]}_getGitClient(){return Zs.getGitClient(this)}setGitClient(e){this.gitClient=e}setupDataChannel(e){Qs.setupDataChannel(this,e)}async handleSyncMessage(e){if(!(this.isSyncCancelled&&e.type!=="sync_cancel"))try{await it.handleSyncMessage(this,e)}catch(t){console.error("[SyncFiles] Critical error handling sync message:",t),this.isSyncFailed=!0,this.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:`A critical error occurred: ${t.message}. Aborting sync.`,type:"error"}}))}}async sendGardensToPeers(e){this.resetFullSyncState(),await Ne.sendGardensToPeers(this,e)}requestSpecificGardens(e){this.resetFullSyncState(),Ne.requestSpecificGardens(this,e)}cancelSync(e=!0){this.isSyncCancelled||(this.isSyncCancelled=!0,this.activeTransfers.clear(),e&&this.currentTransferId&&this.sync.sendSyncMessage({type:"sync_cancel",transferId:this.currentTransferId}),this.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:"Sync cancelled by user.",type:"cancelled"}})))}incrementPendingWrites(){this.pendingWriteCount++}decrementPendingWrites(){this.pendingWriteCount--,this.checkForReload()}markSyncStreamAsComplete(){this.isSyncCompleteMessageReceived=!0,this.checkForReload()}checkForReload(){this.isSyncFailed||this.isSyncCancelled||this.isSyncCompleteMessageReceived&&this.pendingWriteCount===0&&this.activeTransfers.size===0&&(this.dispatchEvent(new CustomEvent("syncProgress",{detail:{message:"All files received and written. Reloading...",type:"complete",action:"receive"}})),setTimeout(()=>window.location.reload(),1500))}destroy(){super.destroy(),this.activeTransfers.clear()}async getAllFiles(e){return st._listAllFiles(e,"/")}}class ti{constructor(e){this.sync=e,this.syncMethodIndicatorEl=null,this.syncProgressModal=null,this.syncProgressLogArea=null,this.syncProgressFinalMessageArea=null,this.syncProgressActionButton=null,this.connectBtn=null,this.nameInput=null,this.peerPrefixInput=null,this.autoConnectCheckbox=null}render(){this.sync._container&&(this.sync._container.innerHTML=`
        <div class="sync-container">
          <div class="sync-panel">
              <h3>Signaling Server</h3>
              <div class="sync-row">
                <label for="signaling-server-url" class="sync-label">Server URL:</label>
                <input type="text" id="signaling-server-url" class="eruda-input flex-grow" value="${this.sync.signaling.signalingServerUrl}">
                <button id="save-signaling-config" class="eruda-button">Save</button>
              </div>
            </div>
            <div class="sync-panel">
              <h3>Sync Configuration</h3>
              <div class="sync-row">
                <label for="sync-name-input" class="sync-label">Sync Name:</label>
                <input type="text" id="sync-name-input" class="eruda-input" placeholder="e.g., my-devices">
                <button id="sync-connect-btn" class="eruda-button">Connect</button>
              </div>
              <div class="sync-row">
                <label for="sync-peer-prefix-input" class="sync-label">Peer Name Prefix:</label>
                <input type="text" id="sync-peer-prefix-input" class="eruda-input flex-grow" placeholder="e.g., laptop, desktop (optional)">
              </div>
              <div class="sync-row space-between">
                <label class="flex-center">
                  <input type="checkbox" id="sync-autoconnect-checkbox">
                  <span>Auto-connect on startup</span>
                </label>
              </div>
            </div>
            <div class="sync-panel">
                <div class="sync-status-grid">
                    <strong>Status:</strong> <span id="sync-status">Disconnected</span>
                    <strong>Method:</strong> <span id="sync-method-indicator">None</span>
                    <strong>Peers:</strong> <span id="sync-peer-count">0</span>
                    <strong>Peer ID:</strong> <span id="sync-peer-id-display" style="word-break: break-all;">Not Connected</span>
                </div>
            </div>
            <div class="sync-panel sync-actions">
              <h4>File Sync Actions</h4>
              <div class="sync-row">
                <button id="send-to-peers-btn" class="eruda-button">Send to Peers...</button>
                <button id="request-all-files-btn" class="eruda-button">Request from Peer...</button>
              </div>
            </div>
            <div class="sync-messages-container hidden" id="eruda-sync-messages">
              <h3>Messages</h3>
              <div id="eruda-messages-list" class="sync-messages-list"></div>
            </div>
        </div>
      `,this.syncMethodIndicatorEl=this.sync._container.querySelector("#sync-method-indicator"),this.connectBtn=this.sync._container.querySelector("#sync-connect-btn"),this.nameInput=this.sync._container.querySelector("#sync-name-input"),this.peerPrefixInput=this.sync._container.querySelector("#sync-peer-prefix-input"),this.autoConnectCheckbox=this.sync._container.querySelector("#sync-autoconnect-checkbox"))}bindEvents(){if(!this.sync._container){k.error("SyncUI.bindEvents: Container not set");return}this.nameInput.value=localStorage.getItem("thoughtform_sync_name")||"",this.peerPrefixInput.value=localStorage.getItem("thoughtform_peer_prefix")||"",this.autoConnectCheckbox.checked=localStorage.getItem("thoughtform_sync_auto_connect")==="true",this.peerPrefixInput.addEventListener("input",()=>{if(this.sync.connectionState==="disconnected"||this.sync.connectionState==="error"){const s=this.sync._container.querySelector("#sync-peer-id-display");if(s){const i=this.peerPrefixInput.value.trim();i?s.textContent=`${i}-<random_id>`:s.textContent="Not Connected"}}}),this.connectBtn.addEventListener("click",()=>{const s=this.sync.connectionState;if(s==="disconnected"||s==="error"){const i=this.nameInput.value.trim(),o=this.peerPrefixInput.value.trim(),r=this.autoConnectCheckbox.checked;if(!i){this.addMessage("Please enter a Sync Name.");return}localStorage.setItem("thoughtform_sync_name",i),localStorage.setItem("thoughtform_peer_prefix",o),localStorage.setItem("thoughtform_sync_auto_connect",r),this.sync.connect(i,o)}else this.sync.disconnect()});const e=this.sync._container.querySelector("#save-signaling-config");e&&e.addEventListener("click",()=>{const s=this.sync._container.querySelector("#signaling-server-url"),i=s?s.value.trim():"";i?(this.sync.signaling.updateSignalingServerUrl(i),this.addMessage(`Signaling server updated to: ${i}`)):this.addMessage("Please enter a valid signaling server URL.")});const t=this.sync._container.querySelector("#send-to-peers-btn"),n=this.sync._container.querySelector("#request-all-files-btn");t&&t.addEventListener("click",async()=>{const s=localStorage.getItem("thoughtform_gardens"),i=s?JSON.parse(s):["home"],o=this.sync.connectedPeers,r=await C.sendSelection({title:"Send Gardens to Peers",peerData:o,gardenData:i});r?(k.log("User initiated send:",r),this.showSyncProgressModal(),this.sync.fileSync.sendGardensToPeers(r)):k.log("Garden send cancelled by user.")}),n&&n.addEventListener("click",async()=>{const s=await C.selection({title:"Request Gardens from Peers",peerData:this.sync.connectedPeers});s?(k.log("User made selection:",s),this.showSyncProgressModal(),this.sync.fileSync.requestSpecificGardens(s)):k.log("Garden request cancelled by user.")})}updateStatus(e){const t=this.sync._container.querySelector("#sync-status");t&&(t.textContent=e);const n=this.sync._container.querySelector("#sync-peer-count");n&&(n.textContent=this.sync.connectedPeers.size)}updateControls(e){const t=e==="disconnected"||e==="error",n=e==="connecting";this.connectBtn&&(this.connectBtn.disabled=n,t?this.connectBtn.textContent="Connect":n?this.connectBtn.textContent="Connecting...":this.connectBtn.textContent="Disconnect"),this.nameInput&&(this.nameInput.disabled=!t),this.peerPrefixInput&&(this.peerPrefixInput.disabled=!t),this.autoConnectCheckbox&&(this.autoConnectCheckbox.disabled=!t);const s=e==="connected-p2p"||e==="connected-signal";this.sync._container.querySelectorAll(".sync-actions button").forEach(i=>i.disabled=!s)}updateConnectionIndicator(e){const t=document.querySelector('.luna-tab-item[data-id="Sync"]');if(t){t.classList.remove("sync-status-connecting","sync-status-p2p","sync-status-signal","sync-status-error");let n="None",s="var(--color-text-secondary)";switch(e){case"connecting":t.classList.add("sync-status-connecting"),n="Connecting...",s="var(--base-accent-warning)";break;case"connected-signal":t.classList.add("sync-status-signal"),n="WebSocket (Fallback)",s="var(--base-accent-warning)";break;case"connected-p2p":t.classList.add("sync-status-p2p"),n="WebRTC (P2P)",s="var(--base-accent-action)";break;case"error":t.classList.add("sync-status-error"),n="Error",s="var(--base-accent-destructive)";break}this.syncMethodIndicatorEl&&(this.syncMethodIndicatorEl.textContent=n,this.syncMethodIndicatorEl.style.color=s)}}addMessage(e){const t=this.sync._container.querySelector("#eruda-messages-list");if(t){const n=document.createElement("div");n.textContent=e,t.appendChild(n),t.scrollTop=t.scrollHeight}}showMessages(){const e=this.sync._container.querySelector("#eruda-sync-messages");e&&(e.style.display="block")}hideMessages(){const e=this.sync._container.querySelector("#eruda-sync-messages");e&&(e.style.display="none")}showSyncProgressModal(){this.syncProgressModal&&this.syncProgressModal.destroy(),this.syncProgressModal=new C({title:"File Sync Progress"}),this.syncProgressModal.updateContent(`
      <div id="sync-progress-log" style="height: 300px; overflow-y: auto; border: 1px solid var(--color-border-primary); padding: 1rem; background-color: var(--base-dark); margin-bottom: 1rem;"></div>
      <div id="sync-progress-final-message" style="font-weight: bold; padding: 5px; min-height: 20px;"></div>
    `),this.syncProgressLogArea=this.syncProgressModal.content.querySelector("#sync-progress-log"),this.syncProgressFinalMessageArea=this.syncProgressModal.content.querySelector("#sync-progress-final-message"),this.syncProgressActionButton=null,this.syncProgressActionButton=this.syncProgressModal.addFooterButton("Cancel",()=>{this.sync.fileSync.cancelSync()}),this.syncProgressModal.show()}updateSyncProgress(e){const{message:t="No message",type:n="info",action:s="receive"}=e.detail;if(this.syncProgressModal||this.showSyncProgressModal(),!this.syncProgressLogArea)return;const i=document.createElement("div"),o=new Date().toLocaleTimeString();switch(i.textContent=`[${o}] ${t}`,i.style.marginBottom="5px",n){case"error":i.style.color="var(--base-accent-destructive)";break;case"complete":i.style.color="var(--base-accent-action)";break;case"cancelled":i.style.color="var(--base-accent-warning)";break;default:i.style.color="var(--color-text-primary)";break}this.syncProgressLogArea.appendChild(i),this.syncProgressLogArea.scrollTop=this.syncProgressLogArea.scrollHeight,["complete","error","cancelled"].includes(n)&&(this.syncProgressFinalMessageArea&&(this.syncProgressFinalMessageArea.textContent=t,this.syncProgressFinalMessageArea.style.color=i.style.color),this.syncProgressActionButton&&this.syncProgressActionButton.remove(),this.syncProgressActionButton=this.syncProgressModal.addFooterButton("Close",()=>this.hideSyncProgressModal()),n==="error"&&this.syncProgressActionButton.classList.add("destructive"))}hideSyncProgressModal(){this.syncProgressModal&&(this.sync.fileSync.resetFullSyncState(),this.syncProgressModal.destroy(),this.syncProgressModal=null)}}const Me=5;class ni{constructor(){this.name="sync",this._container=null,this.peerConnections=new Map,this.isConnected=!1,this.gitClient=null,this.connectionState="disconnected",this.syncName=null,this.connectedPeers=new Map,this.signaling=new Ys(this),this.fileSync=new ei(this),this.ui=new ti(this)}init(e){this._container=e,this._container.style.padding="1rem",this._container.style.overflowY="auto",this.ui.render(),this.ui.bindEvents(),this.ui.updateControls(this.connectionState),this.ui.updateConnectionIndicator(this.connectionState),this.fileSync&&this.ui&&this.fileSync.addEventListener("syncProgress",this.ui.updateSyncProgress.bind(this.ui));const t=localStorage.getItem("thoughtform_sync_auto_connect")==="true",n=localStorage.getItem("thoughtform_sync_name"),s=localStorage.getItem("thoughtform_peer_prefix")||"";t&&n&&this.connect(n,s),window.thoughtform&&(window.thoughtform.sync=this)}async connect(e,t){this.connectionState!=="disconnected"&&this.connectionState!=="error"||(this.syncName=e,this.updateConnectionState("connecting","Connecting..."),await this.signaling.joinSession(this.syncName,t))}disconnect(){this.signaling.destroy(),this.peerConnections.forEach(e=>e.close()),this.peerConnections.clear(),this.isConnected=!1,this.syncName=null,this.connectedPeers.clear(),this.updateConnectionState("disconnected","Disconnected")}createPeerConnection(e,t=!1){if(this.peerConnections.has(e))return this.peerConnections.get(e);if(this.peerConnections.size>=Me)return console.warn(`[SYNC-PC] Max connections (${Me}) reached. Not connecting to ${e.substring(0,8)}...`),null;const n=new RTCPeerConnection({iceServers:[{urls:"stun:stun.l.google.com:19302"}]});return this.peerConnections.set(e,n),n.onicecandidate=s=>{s.candidate&&this.signaling.sendSignal({type:"candidate",candidate:s.candidate},e)},n.onconnectionstatechange=()=>{const s=n.connectionState;s==="connected"?this.updateConnectionState("connected-p2p",`P2P Connected (${this.peerConnections.size} peers)`):(s==="failed"||s==="disconnected"||s==="closed")&&this.handlePeerLeft(e)},t||(n.ondatachannel=s=>{this.setupDataChannel(e,s.channel)}),n}setupDataChannel(e,t){const n=this.peerConnections.get(e);n&&(n.dataChannel=t,t.onopen=()=>{this._announcePresence(e)},t.onmessage=async s=>{try{const i=JSON.parse(s.data);await this._handleIncomingSyncMessage(i,`P2P-${e.substring(0,4)}`)}catch(i){console.error("Error parsing sync message from DataChannel:",i)}},t.onclose=()=>this.handlePeerLeft(e),t.onerror=s=>{const i=s.error;i&&i.name==="OperationError"&&i.message.includes("User-Initiated Abort")?k.log(`Data channel for peer ${e.substring(0,8)} closed intentionally.`):console.error(`Data channel error with ${e.substring(0,8)}...:`,s)})}updatePeerIdDisplay(){const e=this._container?.querySelector("#sync-peer-id-display");if(e){const t=this.getPeerId();t?e.textContent=t:this.connectionState==="disconnected"||this.connectionState==="error"?e.textContent="Not Connected":e.textContent="Connecting..."}}updateConnectionState(e,t){this.connectionState=e,this.isConnected=e==="connected-p2p"||e==="connected-signal",this.updatePeerIdDisplay(),this.ui&&(t&&this.ui.updateStatus(t),this.ui.updateConnectionIndicator(e),this.ui.updateControls(e))}_handleIncomingSyncMessage(e,t){this.signaling.handleIncomingMessage(e,t)}_announcePresence(e=null){if(!this.signaling.peerId)return;const t=localStorage.getItem("thoughtform_gardens"),n=t?JSON.parse(t):["home"];this.sendSyncMessage({type:"peer_introduction",peerId:this.signaling.peerId,gardens:n},e)}handlePeerIntroduction(e){if(!e.peerId||e.peerId===this.signaling.peerId)return;const t=!this.connectedPeers.has(e.peerId);this.connectedPeers.set(e.peerId,{id:e.peerId,gardens:e.gardens}),t&&this.addMessage(`Peer ${e.peerId} discovered.`),this.ui&&this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} peer${this.connectedPeers.size===1?"":"s"})`)}handlePeerLeft(e){if(this.connectedPeers.has(e)){const n=this.connectedPeers.get(e);this.connectedPeers.delete(e),this.addMessage(`Peer ${n.id} disconnected.`)}const t=this.peerConnections.get(e);t&&t.signalingState!=="closed"?(t.close(),this.peerConnections.delete(e)):this.peerConnections.has(e)&&this.peerConnections.delete(e),this.peerConnections.size===0&&this.connectionState==="connected-p2p"?this.updateConnectionState("connected-signal","Connected to tracker, waiting for peers..."):this.ui&&this.ui.updateStatus(`P2P Connected (${this.connectedPeers.size} total)`)}getPeerId(){return this.signaling.peerId}setGitClient(e){this.gitClient=e,this.fileSync.setGitClient(e)}addMessage(e){this.ui&&this.ui.addMessage(e)}sendSyncMessage(e,t=null,n=null){this.signaling.sendSyncMessage(e,t,n)}show(){this._container&&(this._container.style.display="block")}hide(){this._container&&(this._container.style.display="none")}destroy(){this.disconnect(),this.fileSync&&this.fileSync.destroy()}}async function ot(a,e){const t=a.pfs;let n=[];try{const s=await t.readdir(e);for(const i of s){const o=`${e==="/"?"":e}/${i}`;try{(await t.stat(o)).isDirectory()?n=n.concat(await ot(a,o)):n.push(o)}catch{console.warn(`Could not stat ${o}, skipping.`)}}}catch{console.log(`Could not read directory: ${e}.`)}return n}async function rt(a,e){try{if((await a.stat(e)).isDirectory()){const n=await a.readdir(e);for(const s of n)await rt(a,`${e}/${s}`);await a.rmdir(e)}else await a.unlink(e)}catch(t){if(t.code!=="ENOENT")throw console.error(`Error during rmrf for ${e}:`,t),t}}async function si(a,e){e("Starting export...");const t=new X;if(!a||a.length===0)throw new Error("No gardens were selected for export.");for(const r of a){e(`Processing garden: "${r}"...`);const c=t.folder(r),l=new E(r),d=await ot(l,"/");for(const u of d){const h=await l.pfs.readFile(u),g=u.startsWith("/")?u.substring(1):u;c.file(g,h)}}e("Generating zip file...");const n=await t.generateAsync({type:"blob"}),i=`thoughtform-gardens-backup-${new Date().toISOString().replace(/[:.]/g,"-")}.zip`,o=document.createElement("a");o.href=URL.createObjectURL(n),o.download=i,document.body.appendChild(o),o.click(),document.body.removeChild(o),e(`Export process initiated: ${i}`)}async function ii(a){const e=await X.loadAsync(a),t=new Set;return e.forEach(n=>{if(n.includes("/")){const s=n.split("/")[0];t.add(s)}}),Array.from(t).sort()}async function oi(a,e,t){if(!e||e.length===0)throw new Error("No gardens were selected for import.");t(`Reading ${a.name}...`);const n=await X.loadAsync(a);t("Zip file loaded. Analyzing backup contents...");let s="merge";const i=[];for(const d of e){const u=new E(d);let h=!1;try{await u.pfs.stat("/.git"),h=!0}catch{}const g=Object.keys(n.files).some(f=>f.startsWith(`${d}/.git/`));h&&g&&i.push(d)}if(i.length>0){const d=`<ul>${i.map(h=>`<li><strong>${h}</strong></li>`).join("")}</ul>`,u=await C.choice({title:"Replace Garden History?",message:`<p>The backup contains a git history for the following existing garden(s):</p>
                ${d}
                <p>Replacing history is a destructive action. How should we proceed?</p>`,choices:[{id:"replace",text:"Replace History",class:"destructive"},{id:"merge",text:"Merge Files, Keep Local History"},{id:"cancel",text:"Cancel Import"}]});if(!u||u==="cancel"){t("Import cancelled by user.");return}s=u}if(s==="replace"){t("Strategy: Replacing history for conflicting gardens.");for(const d of i){t(`  Deleting existing .git directory for "${d}"...`);const u=new E(d);await rt(u.pfs,"/.git"),t(`  Done deleting for "${d}".`)}}else t("Strategy: Merging files and keeping local history where conflicts exist.");const o=new Map;t("Initializing target gardens...");for(const d of e){const u=new E(d);await u.initRepo(),o.set(d,u)}t("Initialization complete. Starting file writes...");const r=[];n.forEach((d,u)=>{if(u.dir)return;const h=d.split("/")[0];if(!e.includes(h)||d.substring(h.length+1).startsWith(".git/")&&s==="merge"&&i.includes(h))return;const f=`/${d.substring(h.length+1)}`,p=u.async("uint8array").then(async y=>{await o.get(h).writeFile(f,y)});r.push(p)});const c=r.length;let l=0;r.forEach(d=>d.then(()=>{l++,(l%100===0||l===c)&&t(`Writing files... (${l}/${c})`)})),await Promise.all(r),t("Import complete! Reloading page..."),setTimeout(()=>window.location.reload(),1500)}async function ri(a,e){if(!a||a.length===0)throw new Error("No gardens were selected for deletion.");e("Starting deletion process...");const t=localStorage.getItem("thoughtform_gardens");let n=t?JSON.parse(t):[];for(const s of a){e(`Deleting garden: "${s}"...`),n=n.filter(o=>o!==s);const i=`garden-fs-${s}`;await new Promise((o,r)=>{const c=indexedDB.deleteDatabase(i);c.onsuccess=()=>{e(`  Successfully deleted database: ${i}`),o()},c.onerror=l=>{e(`  Error deleting database: ${i}`),r(l.target.error)},c.onblocked=()=>{e(`  Deletion blocked for ${i}. Please refresh and try again.`),r(new Error("Deletion blocked"))}})}localStorage.setItem("thoughtform_gardens",JSON.stringify(n)),e("Updated garden registry in localStorage."),e("Deletion complete. Reloading..."),setTimeout(()=>{const s=decodeURIComponent(window.location.pathname.split("/").pop()||"home");if(a.includes(s)||n.length===0){const i=new URL(import.meta.url).pathname,o=i.lastIndexOf("/src/"),r=o>-1?i.substring(0,o):"";window.location.href=`${window.location.origin}${r}/home`}else window.location.reload()},2e3)}async function ai(a){a("Starting to reset default settings...");const e=new E("Settings");await e.initRepo();for(const[t,n]of ve)try{a(`Restoring: ${t}`),await e.writeFile(t,n)}catch(s){a(`ERROR: Failed to restore ${t}: ${s.message}`)}a("Default settings restored. Reloading to apply changes..."),setTimeout(()=>window.location.reload(),2e3)}function ce(a,e,t=!0){const n=e.map(s=>`
    <label>
      <input type="checkbox" class="garden-select-checkbox" value="${s}" ${t?"checked":""}>
      <span>${s}</span>
    </label>
  `).join("");return`
    <div>
      <p>${a}</p>
      <div>
        <button type="button" class="select-all-btn">Select All</button>
        <button type="button" class="select-none-btn">Deselect All</button>
      </div>
      <div class="garden-selection-list">
        ${n}
      </div>
    </div>
  `}class ci{constructor(e){this.eruda=e,this._$el=null}add(){this.eruda.add({name:"Data",init:e=>{this._$el=e,this._render(),this._bindEvents()},show:()=>this._$el.show(),hide:()=>this._$el.hide()})}_render(){this._$el.html(`
      <div>
        <h2>Data Portability</h2>
        <button id="export-btn" class="eruda-button">Export...</button>
        <button id="import-btn" class="eruda-button">Import...</button>
        <input type="file" id="import-file-input" accept=".zip" style="display: none;">

        <hr>
        
        <h2>Maintenance</h2>
        <button id="update-app-btn" class="eruda-button">Update Application</button>
        <button id="reset-settings-btn" class="eruda-button">Reset Default Settings...</button>
        
        <hr>

        <h2>Danger Zone</h2>
        <p>
          <button id="clear-data-btn" class="eruda-button destructive">Clear Data...</button>
        </p>
      </div>
    `)}_bindEvents(){const e=this._$el;e.find("#export-btn")[0].addEventListener("click",()=>this._handleExport()),e.find("#import-btn")[0].addEventListener("click",()=>e.find("#import-file-input")[0].click()),e.find("#import-file-input")[0].addEventListener("change",t=>this._handleFileSelect(t)),e.find("#clear-data-btn")[0].addEventListener("click",()=>this._handleClearData()),e.find("#reset-settings-btn")[0].addEventListener("click",()=>this._handleResetSettings()),e.find("#update-app-btn")[0].addEventListener("click",()=>this._handleAppUpdate())}_handleAppUpdate(){const e=window.thoughtform.updateApp;if(!e){const i=new C({title:"Error"});i.updateContent("<p>Update check function is not available. The PWA module may not have loaded correctly.</p>"),i.addFooterButton("Close",()=>i.destroy()),i.show();return}const t=new C({title:"Checking for Updates..."});t.updateContent("<p>Contacting server for the latest version...</p>"),t.show();let n=!1;const s=e.onNeedRefresh;s&&(e.onNeedRefresh=()=>{n=!0,t.destroy(),s()}),e(),setTimeout(()=>{n||(t.updateContent("<p>No new update found. You are on the latest version.</p>"),t.clearFooter(),t.addFooterButton("Close",()=>t.destroy())),e.onNeedRefresh!==s&&(e.onNeedRefresh=s)},5e3)}async _handleResetSettings(){if(!await C.confirm({title:"Reset Default Settings?",message:"This will overwrite the default configuration and hook files in your 'Settings' garden with the latest versions from the application. <br><br><strong>Your custom scripts and other files will not be affected.</strong>",okText:"Reset Files"}))return;const t=new C({title:"Restoring Settings..."});let n="";const s=i=>{console.log(`[Settings Reset] ${i}`),n+=`<div>${i}</div>`,t.updateContent(`<div style="font-family: monospace; max-height: 300px; overflow-y: auto;">${n}</div>`)};t.show(),await ai(s)}_handleExport(){const e=localStorage.getItem("thoughtform_gardens"),t=e?JSON.parse(e):["home"],n=new C({title:"Select Gardens to Export"});n.updateContent(ce("Choose which gardens to include in the export:",t));const s=n.content;s.querySelector(".select-all-btn").onclick=()=>s.querySelectorAll(".garden-select-checkbox").forEach(o=>o.checked=!0),s.querySelector(".select-none-btn").onclick=()=>s.querySelectorAll(".garden-select-checkbox").forEach(o=>o.checked=!1);const i=async()=>{const o=Array.from(s.querySelectorAll(".garden-select-checkbox:checked")).map(d=>d.value);n.destroy();const r=new C({title:"Exporting Gardens..."});r.updateContent("<p>Preparing export. Please wait...</p>");let c=!1,l="";r.addFooterButton("Cancel",()=>{c=!0,r.destroy()}),r.show();try{await si(o,d=>{if(c)throw new Error("Export cancelled by user.");l+=d+"<br>",r.updateContent(`<div style="font-family: monospace; max-height: 300px; overflow-y: auto;">${l}</div>`)}),c||(r.clearFooter(),r.updateContent("<p>Export complete! The download will begin shortly.</p>"),setTimeout(()=>r.destroy(),3e3))}catch(d){c||(r.clearFooter(),r.updateContent(`<p style="color: #F44747;"><strong>Export Failed</strong><br>${d.message}</p>`),r.addFooterButton("Close",()=>r.destroy()))}};n.addFooterButton("Export Selected",i),n.addFooterButton("Cancel",()=>n.destroy()),n.show()}async _handleFileSelect(e){const t=e.target,n=t.files[0];if(!n)return;const s=new C({title:"Select Gardens to Import"});s.updateContent("Scanning zip file..."),s.show();try{const i=await ii(n);if(i.length===0){s.updateContent("No valid gardens found in this zip file."),s.addFooterButton("Close",()=>s.destroy());return}s.updateContent(ce(`Found ${i.length} garden(s). Select which to import:`,i));const o=s.content;o.querySelector(".select-all-btn").onclick=()=>o.querySelectorAll(".garden-select-checkbox").forEach(c=>c.checked=!0),o.querySelector(".select-none-btn").onclick=()=>o.querySelectorAll(".garden-select-checkbox").forEach(c=>c.checked=!1);const r=async()=>{const c=Array.from(o.querySelectorAll(".garden-select-checkbox:checked")).map(d=>d.value);s.clearFooter(),s.updateContent("Starting import...");let l="";try{await oi(n,c,d=>{l+=`${d}<br>`,s.updateContent(l)})}catch(d){s.updateContent(`<strong>Error during import:</strong><br>${d.message}`),s.addFooterButton("Close",()=>s.destroy())}};s.addFooterButton("Import Selected",r),s.addFooterButton("Cancel",()=>s.destroy())}catch(i){s.updateContent(`<strong>Error:</strong> Could not read the zip file.<br>${i.message}`),s.addFooterButton("Close",()=>s.destroy())}finally{t.value=""}}_handleClearData(){const e=localStorage.getItem("thoughtform_gardens"),t=e?JSON.parse(e):[],n=new C({title:"Clear Garden Data"});n.updateContent(ce("Select gardens to permanently delete:",t,!1));const s=n.content;s.querySelector(".select-all-btn").onclick=()=>s.querySelectorAll(".garden-select-checkbox").forEach(r=>r.checked=!0),s.querySelector(".select-none-btn").onclick=()=>s.querySelectorAll(".garden-select-checkbox").forEach(r=>r.checked=!1);const i=async()=>{const r=Array.from(s.querySelectorAll(".garden-select-checkbox:checked")).map(l=>l.value);n.clearFooter(),n.updateContent("Starting deletion...");let c="";try{await ri(r,l=>{c+=`${l}<br>`,n.updateContent(c)})}catch(l){n.updateContent(`<strong>Error during deletion:</strong><br>${l.message}`),n.addFooterButton("Close",()=>n.destroy()).classList.add("destructive")}};n.addFooterButton("Delete Selected",i).classList.add("destructive"),n.addFooterButton("Cancel",()=>n.destroy()),n.show()}}function li(a){new ci(a).add()}class di{constructor(e){this.eruda=e,this._$el=null}add(){this.eruda.add({name:"AI",init:e=>{this._$el=e,this._render(),this._bindEvents()},show:()=>this._$el.show(),hide:()=>this._$el.hide()})}_render(){this._$el.html(`
      <div style="padding: 10px;">
        <h2>AI Configuration</h2>
        <div class="sync-panel">
          <h3>Google Gemini</h3>
          <div class="sync-row" style="margin-bottom: 10px;">
            <label for="gemini-api-key" class="sync-label">API Key:</label>
            <input type="password" id="gemini-api-key" class="eruda-input flex-grow">
          </div>
          <div class="sync-row">
            <label for="gemini-model-name" class="sync-label">Model Name:</label>
            <input type="text" id="gemini-model-name" class="eruda-input flex-grow" placeholder="e.g., gemini-2.5-flash">
          </div>
        </div>
        <div class="sync-panel" style="margin-top: 15px;">
          <h3>Content Proxy</h3>
          <div class="sync-row">
            <label for="proxy-url" class="sync-label">Proxy URL:</label>
            <input type="text" id="proxy-url" class="eruda-input flex-grow" placeholder="https://proxy.thoughtform.garden">
          </div>
        </div>
        <button id="ai-save-config" class="eruda-button" style="margin-top: 15px;">Save</button>
        <div id="ai-save-status" style="margin-top: 10px; color: var(--base-accent-action);"></div>
      </div>
    `)}_bindEvents(){const e=this._$el,t=e.find("#gemini-api-key")[0],n=e.find("#gemini-model-name")[0],s=e.find("#proxy-url")[0],i=e.find("#ai-save-config")[0];t.value=localStorage.getItem("thoughtform_gemini_api_key")||"",n.value=localStorage.getItem("thoughtform_gemini_model_name")||"gemini-2.5-flash",s.value=localStorage.getItem("thoughtform_proxy_url")||"";const o=()=>this._handleSaveConfig();t.addEventListener("input",o),n.addEventListener("input",o),s.addEventListener("input",o),i.addEventListener("click",o)}_handleSaveConfig(){const e=this._$el,t=e.find("#gemini-api-key")[0].value.trim(),n=e.find("#gemini-model-name")[0].value.trim()||"gemini-2.5-flash",s=e.find("#proxy-url")[0].value.trim();localStorage.setItem("thoughtform_gemini_api_key",t),localStorage.setItem("thoughtform_gemini_model_name",n),localStorage.setItem("thoughtform_proxy_url",s),window.thoughtform.ai?.loadConfig();const i=e.find("#ai-save-status")[0];i.textContent="Configuration saved!",setTimeout(()=>{i.textContent=""},3e3)}}function hi(a){new di(a).add()}function ui(){const a=document.getElementById("eruda-container");if(!a)return;B.init({container:a,tool:["console","elements","network","resources"],inline:!0,useShadowDom:!1});const e=B.get("console");return e&&e.config.set("maxLogNum",2e3),window.thoughtform&&(window.thoughtform.eruda=B),setTimeout(()=>{const t=a.querySelector(".luna-tab-item")?.parentElement;t&&t.addEventListener("click",n=>{const s=n.target.closest(".luna-tab-item");if(s){const i=s.innerText.toLowerCase();window.thoughtform.ui.toggleDevtools?.(!0,i)}})},500),setTimeout(()=>{const t=a.querySelector(".eruda-elements");if(!t)return;let n=!1;new MutationObserver(()=>{const i=t.style.display!=="none";if(i&&!n){const o=document.querySelector(".eruda-control > .eruda-icon-select");o&&(o.click(),o.click())}n=i}).observe(t,{attributes:!0,attributeFilter:["style"]})},500),li(B),hi(B),B.add({name:"Sync",init(t){this.sync=new ni,this.sync.init(t.get(0))},show(){this.sync.show()},hide(){this.sync.hide()},destroy(){this.sync.destroy()}}),B}const Re=new Set(["png","jpg","jpeg","gif","webp","svg","ico","avif","bmp","tiff","mp3","wav","ogg","flac","aac","m4a","mp4","webm","mov","mkv","avi","flv","woff","woff2","ttf","otf","eot","zip","rar","7z","tar","gz","pdf","doc","docx","xls","xlsx","ppt","pptx","db","sqlite","bin","exe","dll","iso"]);function gi(a,e){let t;return function(...s){const i=()=>{clearTimeout(t),a(...s)};clearTimeout(t),t=setTimeout(i,e)}}class fi{constructor(){this.isOpen=!1,this.query="",this.results=[],this.selectedIndex=0,this.mode="searchFiles",this.lastEditorState=null,this.isIndexing=!1,this.indexPromise=null,this.isIndexBuilt=!1,this.unifiedIndex=new ht.Document({document:{id:"id",index:["pathSearch","content"],store:["garden","path"]},tokenize:"forward"}),this.handleKeyDown=this.handleKeyDown.bind(this),this.handleResultClick=this.handleResultClick.bind(this),this.close=this.close.bind(this),this.debouncedHandleInput=gi(this.handleInput.bind(this),150),this.createDOMElements(),this.listenForFileChanges()}createDOMElements(){this.overlay=document.createElement("div"),this.overlay.className="command-overlay hidden",this.overlay.addEventListener("click",this.close),this.container=document.createElement("div"),this.container.className="command-container",this.container.addEventListener("click",e=>e.stopPropagation()),this.titleElement=document.createElement("div"),this.titleElement.className="command-title",this.input=document.createElement("input"),this.input.type="text",this.input.className="command-input",this.input.addEventListener("input",this.debouncedHandleInput),this.resultsList=document.createElement("ul"),this.resultsList.className="command-results-list",this.resultsList.addEventListener("click",this.handleResultClick),this.container.appendChild(this.titleElement),this.container.appendChild(this.input),this.container.appendChild(this.resultsList),this.overlay.appendChild(this.container),document.body.appendChild(this.overlay)}listenForFileChanges(){if(window.thoughtform&&window.thoughtform.events){const e=(t,n)=>{if(!this.isIndexBuilt||this.isIndexing)return;const s=n.path.split(".").pop()?.toLowerCase();if(Re.has(s)&&t!=="file:delete")return;const i=`${n.gardenName} ${n.path.substring(1)}`.toLowerCase(),o=`${n.gardenName}#${n.path}`;switch(t){case"file:create":window.thoughtform.workspace.getGitClient(n.gardenName).then(r=>{r.readFile(n.path).then(c=>{this.unifiedIndex.add({id:o,garden:n.gardenName,path:n.path,pathSearch:i,content:c})})});break;case"file:update":this.unifiedIndex.update({id:o,garden:n.gardenName,path:n.path,pathSearch:i,content:n.content});break;case"file:delete":this.unifiedIndex.remove(o);break}};window.thoughtform.events.subscribe("file:create",t=>e("file:create",t)),window.thoughtform.events.subscribe("file:update",t=>e("file:update",t)),window.thoughtform.events.subscribe("file:delete",t=>e("file:delete",t))}}async _buildIndex(){try{this.isIndexing=!0,this.input.placeholder="Indexing... please wait",this.resultsList.innerHTML='<li class="command-no-results">Scanning gardens...</li>';const e=localStorage.getItem("thoughtform_gardens"),t=e?JSON.parse(e):["home"];let n=0;for(const s of t){const i=await window.thoughtform.workspace.getGitClient(s),o=await window.thoughtform.sidebar.listAllPaths(i,"/");for(const r of o){if(!r.isDirectory){const c=r.path.split(".").pop()?.toLowerCase(),l=`${s} ${r.path.substring(1)}`.toLowerCase(),d=`${s}#${r.path}`;if(Re.has(c)){this.unifiedIndex.add({id:d,garden:s,path:r.path,pathSearch:l,content:""}),n++;continue}try{const u=await i.readFile(r.path);typeof u=="string"&&(this.unifiedIndex.add({id:d,garden:s,path:r.path,pathSearch:l,content:u}),n++)}catch{}}n>0&&n%50===0&&(this.resultsList.innerHTML=`<li class="command-no-results">Indexing... (${n} files scanned)</li>`,await new Promise(c=>setTimeout(c,0)))}}this.input.placeholder=`Search across ${this.unifiedIndex.size} documents...`,this.isIndexing=!1,this.isIndexBuilt=!0}catch{this.resultsList.innerHTML='<li class="command-no-results" style="color: red;">Error during indexing.</li>',this.isIndexing=!1}}async open(e="searchFiles"){if(this.isOpen)return;this.isOpen=!0,this.mode=e;const t=window.thoughtform.workspace.getActiveEditor();switch(t&&t.editorView?this.lastEditorState={editor:t,selection:t.editorView.state.selection.main}:this.lastEditorState=null,this.mode){case"executeCommand":this.titleElement.textContent="Execute Command",this.input.placeholder="Find a .js file to execute...";break;case"searchContent":this.titleElement.textContent="Global Content Search",this.input.placeholder="Search content across all gardens...";break;case"searchFiles":default:this.titleElement.textContent="Search Files",this.input.placeholder="Find file across all gardens...";break}this.overlay.classList.remove("hidden"),this.input.focus(),document.addEventListener("keydown",this.handleKeyDown),!this.isIndexBuilt&&!this.indexPromise?this.indexPromise=this._buildIndex().finally(()=>{this.indexPromise=null,this.input.value&&this.search(this.input.value)}):this.isIndexBuilt&&(this.input.placeholder=`Search across ${this.unifiedIndex.size} documents...`),this.search("")}close(){if(!this.isOpen)return;this.isOpen=!1,this.overlay.classList.add("hidden"),this.input.value="",this.query="",this.results=[],this.selectedIndex=0,this.lastEditorState=null,document.removeEventListener("keydown",this.handleKeyDown);const e=window.thoughtform.workspace.getActiveEditor();e&&e.editorView&&e.editorView.focus()}async search(e){if(this.query=e.toLowerCase().trim(),this.isIndexing)return;if(!this.isIndexBuilt){this.resultsList.innerHTML='<li class="command-no-results">Waiting for index...</li>';return}let t={enrich:!0,limit:100},n="pathSearch";this.mode==="searchContent"&&(n="content",t.limit=50);let s=[];this.query?s=(await this.unifiedIndex.searchAsync(this.query,{index:n,...t}))[0]?.result||[]:this.mode!=="searchContent"&&(s=this.unifiedIndex.search({index:n,...t})[0]?.result||[]),this.mode==="executeCommand"&&(s=s.filter(r=>r.doc.path.endsWith(".js")));const i=await window.thoughtform.workspace.getActiveGitClient(),o=i?i.gardenName:"";s.sort((r,c)=>{const l=r.doc.garden===o,d=c.doc.garden===o;return l&&!d?-1:!l&&d?1:r.doc.path.localeCompare(c.doc.path)}),this.results=s,this.selectedIndex=0,this.renderResults()}async getSnippet(e,t){try{const i=(await(await window.thoughtform.workspace.getGitClient(e)).readFile(t)).split(`
`),o=this.query.toLowerCase();let r=i.find(l=>l.toLowerCase().includes(o));r||(r=i.find(l=>l.trim()!=="")||"No content preview available.");const c=new RegExp(this.query.replace(/[-/\\^$*+?.()|[\]{}]/g,"\\$&"),"gi");return r.trim().replace(c,"<mark>$&</mark>")}catch{return"Could not load file preview."}}async renderResults(){if(this.resultsList.innerHTML="",this.results.length===0){this.resultsList.innerHTML=`<li class="command-no-results">${this.isIndexing?"Indexing...":"No matches found"}</li>`;return}const e=document.createDocumentFragment();for(let t=0;t<this.results.length;t++){const n=this.results[t].doc,s=document.createElement("li");s.className="command-result-item",s.dataset.index=t;const i=n.path.startsWith("/")?n.path.substring(1):n.path,o=` <span class="command-garden">[${n.garden}]</span>`;if(this.mode==="searchContent"){const r=await this.getSnippet(n.garden,n.path);s.innerHTML=`<div class="command-path">${o} ${i}</div><div class="global-search-snippet">${r}</div>`}else s.innerHTML=`<div class="command-path">${o} ${i}</div>`;t===this.selectedIndex&&(s.classList.add("active"),s.scrollIntoView({block:"nearest"})),e.appendChild(s)}this.resultsList.appendChild(e)}async selectItem(e){if(e<0||e>=this.results.length)return;const t=this.results[e].doc;if(this.mode==="executeCommand"){const n=window.thoughtform.workspace.getActiveEditor(),s=await window.thoughtform.workspace.getActiveGitClient();n&&s&&se(`${t.garden}#${t.path}`,n,s)}else window.thoughtform.workspace.openFile(t.garden,t.path);this.close()}async insertLink(e){if(e<0||e>=this.results.length||!this.lastEditorState)return;const{editor:t,selection:n}=this.lastEditorState;if(!t||!t.editorView||t.editorView.isDestroyed)return;const s=this.results[e].doc,i=t.gitClient.gardenName,o=s.path.startsWith("/")?s.path.substring(1):s.path,c=`[[${s.garden===i?o:`${s.garden}#${o}`}]]`;t.editorView.dispatch({changes:{from:n.from,to:n.to,insert:c},selection:{anchor:n.from+c.length}}),this.close()}async openInNewPane(e){if(e<0||e>=this.results.length||!this.lastEditorState)return;const{editor:t}=this.lastEditorState;if(!t||!t.paneId)return;const n=this.results[e].doc,s=t.gitClient.gardenName,i=n.path.startsWith("/")?n.path.substring(1):n.path;let o=n.garden===s?i:`${n.garden}#${i}`;window.thoughtform.workspace.openInNewPane(o,t.paneId),this.close()}async openInWindow(e){if(e<0||e>=this.results.length)return;const t=this.results[e].doc,n=`/${t.garden}#${t.path}?windowed=true`,s=window.innerWidth/2,i=window.innerHeight/2;window.self!==window.top?window.top.postMessage({type:"request-preview-window",payload:{url:n,clientX:s,clientY:i}},"*"):typeof window.thoughtform.ui.openWindow=="function"?window.thoughtform.ui.openWindow(n,s,i):console.error("Windowing function not available."),this.close()}handleInput(e){this.search(e.target.value)}async handleResultClick(e){const t=e.target.closest(".command-result-item");t&&await this.selectItem(parseInt(t.dataset.index,10))}async handleKeyDown(e){if(this.isOpen)switch(e.key){case"ArrowDown":e.preventDefault(),this.selectedIndex=(this.selectedIndex+1)%this.results.length,this.renderResults();break;case"ArrowUp":e.preventDefault(),this.selectedIndex=(this.selectedIndex-1+this.results.length)%this.results.length,this.renderResults();break;case"Enter":e.preventDefault(),this.results.length>0&&(e.altKey&&this.mode!=="executeCommand"?await this.openInWindow(this.selectedIndex):e.shiftKey&&(e.ctrlKey||e.metaKey)&&this.mode!=="executeCommand"?await this.openInNewPane(this.selectedIndex):(e.ctrlKey||e.metaKey)&&this.mode!=="executeCommand"?await this.insertLink(this.selectedIndex):await this.selectItem(this.selectedIndex));break;case"Escape":e.preventDefault(),this.close();break}}}async function at(a,e){const t=a.pfs;let n=[];try{const s=await t.readdir(e);for(const i of s){if(i===".git")continue;const o=`${e==="/"?"":e}/${i}`;try{(await t.stat(o)).isDirectory()?n=n.concat(await at(a,o)):n.push(o)}catch{console.warn(`[Migration] Could not stat ${o}, skipping.`)}}}catch{console.warn(`[Migration] Could not read directory: ${e}.`)}return n}async function pi(){console.log("%cStarting Thoughtform data migration...","font-weight: bold; font-size: 1.2em;"),console.log("This will convert all files from the old JSON format to raw content. This only needs to be run once.");const a=localStorage.getItem("thoughtform_gardens"),e=a?JSON.parse(a):["home"];if(e.length===0){console.log("No gardens found to migrate.");return}let t=0,n=0;for(const s of e){console.log(`%cProcessing garden: "${s}"`,"font-weight: bold; color: blue;");const i=new E(s),o=await at(i,"/");if(o.length===0){console.log("No files found in this garden.");continue}for(const r of o){t++;try{const c=await i.readFile(r);let l;try{l=JSON.parse(c)}catch{console.log(`- ${r} is not in JSON format, skipping.`);continue}if(l&&typeof l.content<"u"){const d=l.content;c!==d?(console.log(`%c  MIGRATING: ${r}`,"color: green;"),await i.writeFile(r,d),n++):console.log(`- ${r} content is already raw, skipping.`)}else console.log(`- ${r} is valid JSON but not the old format, skipping.`)}catch(c){console.error(`%c  ERROR: Failed to process ${r}.`,"color: red;",c)}}}console.log("%cMigration complete!","font-weight: bold; font-size: 1.2em;"),console.log(`Checked ${t} files across ${e.length} garden(s).`),console.log(`Migrated ${n} files.`),console.log("You should now refresh the page.")}async function _e(a,e,t,n){const s=`https://generativelanguage.googleapis.com/v1beta/models/${e}:streamGenerateContent?key=${a}&alt=sse`,i={contents:[{parts:[{text:t}]}]};try{const o=await fetch(s,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(i),signal:n});if(!o.ok){const l=await o.json();throw console.error("Gemini API Error:",l),new Error(`API request failed: ${l.error?.message||o.statusText}`)}const r=o.body.getReader(),c=new TextDecoder;return new ReadableStream({async pull(l){for(;;){const{done:d,value:u}=await r.read();if(d){l.close();break}const g=c.decode(u,{stream:!0}).split(`
`);for(const f of g)if(f.startsWith("data: "))try{const p=f.substring(5).trim(),m=JSON.parse(p)?.candidates?.[0]?.content?.parts?.[0]?.text;m&&l.enqueue(m)}catch{}}}})}catch(o){throw o.name==="AbortError"?console.log("Gemini API request was cancelled by the user."):console.error("Failed to fetch from Gemini API:",o),o}}class mi{constructor(e){if(!e)throw new Error("Traversal helper requires a gitClient instance.");this.gitClient=e}extractWikilinks(e){const t=/\[\[([^\[\]]+?)\]\]/g,n=new Set;let s;for(;s=t.exec(e);){const i=s[1].split("|")[0].trim();n.add(i)}return Array.from(n)}async readLinkContent(e,t){let n=t,s=e;const i=e.match(/^([^#]+)#(.*)$/);i&&(n=i[1],s=i[2]),s.startsWith("/")||(s=`/${s}`);const o=n!==this.gitClient.gardenName?new E(n):this.gitClient,r=n!==this.gitClient.gardenName?`${n}#${s}`:s;try{return{content:await o.readFile(s),fullIdentifier:r,gardenName:n}}catch(c){return console.warn(`[Agent] Handled a broken link. Could not read ${r}:`,c.message),{content:null,fullIdentifier:r,gardenName:null}}}}const le=new Map,ct=new Map(ve.filter(([a])=>a.startsWith("/settings/tools/")).map(([a,e])=>[a,e]));function wi(a){const e=/\/\*[\s\S]*?\*\/|\/\/.*/g,t=a.match(e);return t?t.join(`
`).replace(/^\s*\/\*+\s*?/gm,"").replace(/^\s*\*+\/\s*?$/gm,"").replace(/\*\/$/,"").replace(/^\s*\*\s?/gm,"").replace(/^\s*\/\/\s?/gm,"").trim():""}async function yi(a,e){const t=`${e}#${a}`;if(le.has(t))return le.get(t);let n,s=e;try{n=await new E(e).readFile(a)}catch(i){if(!i.message.includes("does not exist"))throw i;try{s="Settings",n=await new E(s).readFile(a)}catch(o){if(!o.message.includes("does not exist"))throw o;n=ct.get(a),s="Default"}}if(!n)return null;try{const i=a.split("/").pop().replace(".js",""),o=wi(n),r=new Function("args","context",`
      return (async () => {
        try { 
          ${n} 
        } catch (e) {
          console.error('TOOL EXECUTION FAILED in script: "${a}" from ${s}', e);
          return 'Error: An exception occurred while trying to run the tool: ' + e.message;
        }
      })();
    `),c={name:i,description:o,path:a,execute:r};return le.set(t,c),c}catch(i){return console.error(`[ToolManager] Failed to parse metadata for tool "${a}":`,i),null}}async function vi(a){const e=new Map,t=new Set(ct.keys()),n=Array.from(new Set([a,"Settings"]));for(const s of n){const i=new E(s);try{const o=await i.pfs.readdir("/settings/tools");for(const r of o)r.endsWith(".js")&&t.add(`/settings/tools/${r}`)}catch(o){o.code!=="ENOENT"&&console.warn(`[ToolManager] Could not scan tools in "${s}":`,o)}}for(const s of t){const i=await yi(s,a);i&&e.set(i.name,i)}return e}class bi{constructor({gitClient:e,aiService:t,initialContext:n}){if(!e||!t||n===void 0)throw new Error("TaskRunner requires gitClient, aiService, and initialContext.");this.gitClient=e,this.aiService=t,this.initialContext=n,this.tools=new Map}async _initialize(){this.tools=await vi(this.gitClient.gardenName),this.tools.set("finish",{name:"finish",description:"Call this tool with NO ARGUMENTS when you have completed all research and are ready to synthesize the final answer.",execute:async()=>"Signal to finish task received."})}run(e,t){const n={controller:null,enqueue(i){this.controller?.enqueue(i)},close(){this.controller?.close()},error(i){this.controller?.error(i)}},s=new ReadableStream({start(i){n.controller=i}});return this._orchestrate(e,n,t).catch(i=>{i.name!=="AbortError"&&console.error("[TaskRunner] Orchestration failed:",i),!n.controller.desiredSize===null&&n.error(i)}),s}_sendStreamEvent(e,t,n){e.enqueue(`[${t.toUpperCase()}] ${n}`)}_fillPrompt(e,t){return Object.entries(t).reduce((n,[s,i])=>n.replace(new RegExp(`{{${s}}}`,"g"),String(i)),e)}async _getJsonCompletion(e,t,n){const s=await t.getCompletionAsString(e,null,n);try{const i=s.match(/{\s*"thought":[\s\S]*}/);if(!i)throw new Error("No valid JSON object with a 'thought' key found in the LLM response.");return{responseText:s,responseJson:JSON.parse(i[0])}}catch(i){throw console.error("[TaskRunner] Failed to parse JSON from LLM response:",i),console.error("[TaskRunner] Raw response was:",s),new Error(`The AI assistant did not return a valid JSON plan. Raw response: ${s}`)}}async _classifyError(e,t,n){const s=`
You are an error analysis bot. Analyze the following error message from an API call.
Respond with ONLY ONE of the following classifications: CONTEXT_OVERFLOW, RATE_LIMIT, INVALID_JSON, API_KEY_ERROR, UNKNOWN_FAILURE.

- If the error indicates the input was too large, context window was exceeded, or a token quota was hit, classify as CONTEXT_OVERFLOW.
- If the error indicates too many requests are being sent too quickly, classify as RATE_LIMIT.
- If the error indicates a problem with the AI's own JSON output, classify as INVALID_JSON.
- If the error mentions an invalid or missing API key, classify as API_KEY_ERROR.
- For all other errors, classify as UNKNOWN_FAILURE.

Error Message: "${e}"

Classification:`;return(await t.getCompletionAsString(s,null,n)).trim()}async _compressScratchpad(e,t,n,s,i){i("Cognitive compression initiated...");const o=`From the following error message, extract only the integer value for the token limit. If you cannot find one, respond with '8000'. Error: "${t}"`;i("Analyzing context limit...");const r=await n.getCompletionAsString(o,null,s),c=parseInt(r,10)||8e3;i(`Context limit detected: ~${c.toLocaleString()} tokens.`);const l=c*.5,d="---",u=e.indexOf(d,e.indexOf("INITIAL CONTEXT"));if(u===-1)throw new Error("Compression failed: Could not find end of initial context.");const h=e.substring(0,u+d.length);let g=e.substring(u+d.length);const f="[COMPRESSED MEMORY]:";let p="";const y=g.indexOf(f);if(y!==-1){const N=g.indexOf(`
---`,y);p=g.substring(y,N),g=g.substring(N)}if(g.trim().length===0)throw new Error("Compression failed: No uncompressed history to process.");let m="",w="";const b=g.split("---").filter(N=>N.trim());let S=0,x=0;for(const N of b){const G=z(N);S+G<l?(m+=N+"---",S+=G,x++):w+=N+"---"}x===0&&b.length>0&&(i("Warning: A single memory item is larger than the safe summarization budget. Truncating."),m=b[0].substring(0,l*4),w=b.slice(1).join("---"));const T=`# Persona: You are a Memory Compression Module.
# Your task is to read a sequence of an AI agent's memories and distill them into a concise, factual summary, preserving all key findings, decisions, and data points.

# Memories to Summarize:
---
${m}
---

# Concise Summary:`;i(`Generating summary of oldest ${x} steps...`);const I=await n.getCompletionAsString(T,null,s);i("Memory compression complete.");const _=`${p}
- ${I.trim()}`.replace(f,"").trim();return`${h}

${f} ${_}
---${w}`}async _orchestrate(e,t,n){await this._initialize(),this._sendStreamEvent(t,"status",`Starting with goal: "${e}"`);let s=`USER GOAL: ${e}
---
INITIAL CONTEXT:
${this.initialContext}
---`,i=0,o=!1,r=0,c=0;const l=new Set,d=({input:y,output:m})=>{r+=y,c+=m},u={getCompletion:(y,m,w)=>this.aiService.getCompletion(y,b=>{d(b),m&&m(b)},w||n),getCompletionAsString:(y,m,w)=>this.aiService.getCompletionAsString(y,b=>{d(b),m&&m(b)},w||n)},h={Traversal:mi,Git:E};for(;!o;){if(i++,n.aborted)throw new DOMException("Agent run was cancelled by the user.","AbortError");const y=Array.from(this.tools.values()).map(L=>`- ${L.name}: ${L.description}`).join(`
`),m=this._fillPrompt(Ke,{scratchpad:s,tool_list:y}),w={input:r,output:c};let b;try{b=(await this._getJsonCompletion(m,u,n)).responseJson}catch(L){if(L.name==="AbortError")throw L;const W=L.message;this._sendStreamEvent(t,"status","An error occurred during planning. Analyzing...");const Se=await this._classifyError(W,u,n);switch(this._sendStreamEvent(t,"status",`Error classified as: ${Se}`),Se){case"CONTEXT_OVERFLOW":s+=`
OBSERVATION: CRITICAL API FAILURE. The context window is full. You must compress your memory to continue. Error Details: "${W}"
---`;continue;case"RATE_LIMIT":this._sendStreamEvent(t,"status","API rate limit reached. Waiting 5 seconds before retry..."),await new Promise(lt=>setTimeout(lt,5e3));continue;case"INVALID_JSON":s+=`
OBSERVATION: My previous response was not valid JSON. I must correct my output to follow the required format exactly. Error: ${W}
---`;continue;case"API_KEY_ERROR":throw L;case"UNKNOWN_FAILURE":default:s+=`
OBSERVATION: An unknown API error occurred. I will retry the step. Error: ${W}
---`;continue}}const S=r-w.input,x=c-w.output;this._sendStreamEvent(t,"status",`Step ${i}: Planning...
[Step: ${S.toLocaleString()} in / ${x.toLocaleString()} out]
[Total: ${r.toLocaleString()} in / ${c.toLocaleString()} out]`);const T=b.thought,I=b.action;if(this._sendStreamEvent(t,"thought",T),s+=`
THOUGHT: ${T}`,!I||!I.tool||!this.tools.has(I.tool)){this._sendStreamEvent(t,"status",`Error: AI chose an invalid tool ('${I.tool}'). Retrying.`),s+=`
OBSERVATION: The last tool choice ('${I.tool}') was invalid. I must choose a tool from the provided list.`;continue}if(I.tool==="finish"){o=!0,s+=`
ASSESSMENT: The goal is met. I will now synthesize the final answer.`;continue}const _=I.tool,N=I.args||{};this._sendStreamEvent(t,"action",`Using tool \`${_}\` with args: ${JSON.stringify(N)}`);const G=this.tools.get(_),K={git:this.gitClient,ai:u,dependencies:h,onProgress:L=>this._sendStreamEvent(t,"status",L),signal:n,addSource:L=>{L&&typeof L=="string"&&l.add(L)}},Z={input:r,output:c};let O=await G.execute(N,K);if(_==="requestMemoryCompression")try{const L=JSON.parse(O);if(L.action==="request_memory_compression"){s=await this._compressScratchpad(s,L.details.errorMessage,u,n,W=>this._sendStreamEvent(t,"status",W));continue}}catch{}const U=String(O),Q=z(U),ie=Q>250?`[Observation received (${Q.toLocaleString()} tokens) and added to context.]`:U;this._sendStreamEvent(t,"observation",ie);const oe=r-Z.input,J=c-Z.output;(oe>0||J>0)&&this._sendStreamEvent(t,"status",`Tool LLM Usage:
[Step: ${oe.toLocaleString()} in / ${J.toLocaleString()} out]
[Total: ${r.toLocaleString()} in / ${c.toLocaleString()} out]`),s+=`
ACTION: Called tool '${_}' with args: ${JSON.stringify(N)}
OBSERVATION: ${U}
---`}this._sendStreamEvent(t,"status","Agent has finished its work. Synthesizing final answer...");const g=this._fillPrompt(Je,{goal:e,context_buffer:s}),p=(await u.getCompletion(g)).getReader();for(;;){const{done:y,value:m}=await p.read();if(y)break;t.enqueue(m)}l.size>0&&t.enqueue(`
<!-- Sources: ${Array.from(l).join(", ")} -->`),t.enqueue(`
<!-- Total Tokens: ${r.toLocaleString()} in / ${c.toLocaleString()} out -->`),t.close()}}class Ci{constructor(){this.config={geminiApiKey:"",geminiModelName:"gemini-2.5-flash"},this.activeAgentControllers=new Map,this.loadConfig()}loadConfig(){this.config.geminiApiKey=localStorage.getItem("thoughtform_gemini_api_key")||"";const e=localStorage.getItem("thoughtform_gemini_model_name");this.config.geminiModelName=e||"gemini-2.5-flash"}saveConfig(e,t){localStorage.setItem("thoughtform_gemini_api_key",e||""),localStorage.setItem("thoughtform_gemini_model_name",t||""),this.loadConfig()}async getCompletion(e,t,n){if(this.loadConfig(),!this.config.geminiApiKey)throw new Error("Gemini API key is not set. Get a key from https://aistudio.google.com/app/api-keys and add it in the DevTools > AI panel.");const s=await _e(this.config.geminiApiKey,this.config.geminiModelName,e,n);if(!t)return s;const i=z(e);let o="";const r=new TransformStream({transform(c,l){o+=c,l.enqueue(c)},flush(c){const l=z(o);t({input:i,output:l})}});return s.pipeThrough(r)}async getCompletionAsString(e,t,n){if(this.loadConfig(),!this.config.geminiApiKey)throw new Error("Gemini API key is not set. Get a key from https://aistudio.google.com/app/api-keys and add it in the DevTools > AI panel.");const i=(await _e(this.config.geminiApiKey,this.config.geminiModelName,e,n)).getReader();let o="";for(;;){const{done:r,value:c}=await i.read();if(r)break;o+=c}if(t){const r=z(e),c=z(o);t({input:r,output:c})}return o}async handleAiChatRequest(e){let t=-1;const n="🤖 Thinking...";let s=null,i=-1,o=-1;try{const r=window.thoughtform.workspace.getActiveEditor();if(!r||!r.gitClient||!r.paneId)throw new Error("Cannot find active editor, gitClient, or paneId for agent.");if(s=r.paneId,this.activeAgentControllers.has(s)){console.warn(`Agent already running in pane ${s}. Ignoring request.`);return}const c=new AbortController;this.activeAgentControllers.set(s,c);const l=e.state.selection.main.head,d=e.state.doc.lineAt(l);let u=d.number;for(;u>1&&e.state.doc.line(u-1).text.trim().startsWith(">$");)u--;let h=d.number;for(;h<e.state.doc.lines&&e.state.doc.line(h+1).text.trim().startsWith(">$");)h++;const g=e.state.doc.line(u).from,f=e.state.doc.line(h).to;let p=e.state.sliceDoc(g,f);p=p.split(`
`).map(K=>K.trim().replace(/^>\$\s*/,"")).join(`
`);const y=f,m={changes:{from:y,insert:`
${n}`}};e.dispatch(m),t=y+1;const b=e.state.doc.toString().replace(/<!-- Total Tokens:.*?-->/gs,"").trim(),T=new bi({gitClient:r.gitClient,aiService:this,initialContext:b}).run(p,c.signal).getReader(),I=`
<response>
`;e.dispatch({changes:{from:t,to:t+n.length,insert:I}});let _=!1;i=t+I.length,o=i;const N=/^\[(STATUS|THOUGHT|ACTION|OBSERVATION)\]\s(.*)/s;for(;;){const{done:K,value:Z}=await T.read();if(K)break;const O=Z,U=O.match(N);if(U){if(_)continue;const Q=U[1],ie=U[2].trim(),J=`${{STATUS:"> Status:",THOUGHT:"## Thought",ACTION:"## Action",OBSERVATION:"## Observation"}[Q]}
${ie}

`;e.dispatch({changes:{from:o,insert:J}}),o+=J.length}else _?(e.dispatch({changes:{from:o,insert:O}}),o+=O.length):(_=!0,e.dispatch({changes:{from:i,to:o,insert:O}}),o=i+O.length)}const G=`
</response>

>$ `;e.dispatch({changes:{from:o,insert:G},selection:{anchor:o+G.length}})}catch(r){if(r.name==="AbortError"){if(console.log("AI chat request was intentionally cancelled by the user."),i!==-1){const c=i-12;e.dispatch({changes:{from:c,to:o,insert:`
<response>
🛑 Agent cancelled by user.
</response>`}})}}else console.error("AI Chat Error:",r),t!==-1&&e.dispatch({changes:{from:t,to:t+n.length,insert:`🚨 Error: ${r.message}`}})}finally{s&&this.activeAgentControllers.delete(s)}}}function Si(){return new Ci}const ki={"interface.yml":Y(Ve),"keymaps.yml":Y(ye)};class Ei{constructor(){this.cache=new Map}async get(e,t,n){let s;if(typeof n=="string"?s=n:n&&n.gitClient?s=n.gitClient.gardenName:s=(await window.thoughtform.workspace.getActiveGitClient()).gardenName,!s)return console.warn("[ConfigService] Could not determine a garden context for get(). Using hardcoded defaults."),{value:this._getHardcoded(e,t),sourceGarden:null};const i=`settings/${e}`,{value:o,sourceGarden:r}=await this._readAndCache(s,i,t);if(o!==void 0)return{value:o,sourceGarden:r};if(s!=="Settings"){const{value:c,sourceGarden:l}=await this._readAndCache("Settings",i,t);if(c!==void 0)return{value:c,sourceGarden:l}}return{value:this._getHardcoded(e,t),sourceGarden:null}}async getHook(e,t){let n;typeof t=="string"?n=t:t&&t.gitClient?n=t.gitClient.gardenName:n=(await window.thoughtform.workspace.getActiveGitClient()).gardenName;const s=`settings/hooks/${e}`,i=new E(n);try{return await i.pfs.stat(`/${s}`),`${n}#${s}`}catch{}if(n!=="Settings"){const o=new E("Settings");try{return await o.pfs.stat(`/${s}`),`Settings#${s}`}catch{}}return null}async _readAndCache(e,t,n){const s=`/${t}`,i=`${e}#${s}`;if(this.cache.has(i)){const o=this.cache.get(i);return{value:n?o?.[n]:o,sourceGarden:e}}try{const o=new E(e),r=await o.readFile(s);try{await o.pfs.stat(s)}catch{return{value:void 0,sourceGarden:null}}const c=Y(r);return this.cache.set(i,c),{value:n?c?.[n]:c,sourceGarden:e}}catch{return this.cache.set(i,null),{value:void 0,sourceGarden:null}}}_getHardcoded(e,t){const n=ki[e];return t?n?.[t]:n}invalidate(e,t){const n=t.startsWith("/")?t:`/${t}`,s=`${e}#${n}`;this.cache.delete(s)}}function xi(){return new Ei}class Ti{constructor(){this.subscribers={}}subscribe(e,t){return this.subscribers[e]||(this.subscribers[e]=[]),this.subscribers[e].push(t),()=>{this.subscribers[e]=this.subscribers[e].filter(n=>n!==t)}}publish(e,t=null){this.subscribers[e]&&this.subscribers[e].forEach(n=>{try{n(t)}catch(s){console.error(`[EventBus] Error in subscriber for event "${e}":`,s)}})}}function Ii(){return new Ti}const Fe={"app:load":"load.js","file:create":"create.js","file:delete":"delete.js","window:create":"on-create-window.js","window:close":"on-close-window.js","window:resize":"on-resize-window.js"};class Pi{constructor(e){this.eventBus=e,this.config=window.thoughtform.config}initialize(){for(const e in Fe)this.eventBus.subscribe(e,t=>{this.handleEvent(e,t)})}async handleEvent(e,t){const n=Fe[e];if(!n)return;const s=t?.gardenName||window.thoughtform.workspace.getActiveEditor()?.gitClient.gardenName;if(!s){console.warn(`[HookRunner] Could not determine garden context for event: ${e}`);return}const i=window.thoughtform.workspace.getActiveEditor(),o=window.thoughtform.workspace.getActiveGitClient();if(!i||!o)return;const r=await this.config.getHook(n,s);r&&se(r,i,o,t)}}function $i(a={}){const{immediate:e=!1,onNeedRefresh:t,onOfflineReady:n,onRegistered:s,onRegisteredSW:i,onRegisterError:o}=a;let r,c,l;const d=async(h=!0)=>{await c,l?.()};async function u(){if("serviceWorker"in navigator){if(r=await ut(async()=>{const{Workbox:h}=await import("./chunk-vendor.js").then(g=>g.a3);return{Workbox:h}},__vite__mapDeps([0,1])).then(({Workbox:h})=>new h("/sw.js",{scope:"/",type:"classic"})).catch(h=>{o?.(h)}),!r)return;l=()=>{r?.messageSkipWaiting()};{let h=!1;const g=()=>{h=!0,r?.addEventListener("controlling",f=>{f.isUpdate&&window.location.reload()}),t?.()};r.addEventListener("installed",f=>{typeof f.isUpdate>"u"?typeof f.isExternal<"u"&&f.isExternal?g():!h&&n?.():f.isUpdate||n?.()}),r.addEventListener("waiting",g)}r.register({immediate:e}).then(h=>{i?i("/sw.js",h):s?.(h)}).catch(h=>{o?.(h)})}}return c=u(),d}class Li{constructor(e){this.workspace=e}async render(){this.workspace.panes.forEach(({editor:e})=>{e&&e.editorView&&e.editorView.dom.parentElement&&e.editorView.dom.remove()}),this.workspace.mainContainer.innerHTML="",await this._renderNode(this.workspace.paneTree,this.workspace.mainContainer),this.workspace.setActivePane(this.workspace.activePaneId)}updateLayout(){this._syncNodeStyles(this.workspace.paneTree,this.workspace.mainContainer)}_syncNodeStyles(e,t){!t||!e||e.type.startsWith("split-")&&(e.type.split("-")[1]==="vertical"?t.style.gridTemplateColumns=`${e.splitPercentage}% auto 1fr`:t.style.gridTemplateRows=`${e.splitPercentage}% auto 1fr`,t.children.length===3&&(this._syncNodeStyles(e.children[0],t.children[0]),this._syncNodeStyles(e.children[1],t.children[2])))}async _renderNode(e,t){if(e.type==="leaf"){const n=document.createElement("div");n.className="pane",n.dataset.paneId=e.id,t.appendChild(n);let s=this.workspace.panes.get(e.id)?.editor;if(s)n.appendChild(s.editorView.dom),this.workspace.panes.set(e.id,{element:n,editor:s});else{const i=e.buffers[e.activeBufferIndex],o=await this.workspace.getGitClient(i.garden);s=new Ce({target:n,gitClient:o,commandPalette:window.thoughtform.commandPalette,initialFile:i.path,paneId:e.id}),await new Promise(r=>{const c=setInterval(()=>{s.isReady&&(clearInterval(c),r())},50)}),this.workspace.panes.set(e.id,{element:n,editor:s}),this.workspace.initialEditorStates[e.id]&&s.restoreState(this.workspace.initialEditorStates[e.id])}n.addEventListener("click",()=>{this.workspace.setActivePane(e.id)})}else if(e.type.startsWith("split-")){const n=e.type.split("-")[1];t.style.display="grid";const[s,i]=e.children,o=document.createElement("div");o.className="pane-container";const r=document.createElement("div");r.className="pane-container";const c=document.createElement("div");c.className=`pane-resizer pane-resizer-${n}`,n==="vertical"?t.style.gridTemplateColumns=`${e.splitPercentage}% auto 1fr`:t.style.gridTemplateRows=`${e.splitPercentage}% auto 1fr`,t.appendChild(o),t.appendChild(c),t.appendChild(r),this._initializeResizer(c,t,e,n),await this._renderNode(s,o),await this._renderNode(i,r)}}_initializeResizer(e,t,n,s){const i=o=>{o.preventDefault(),this.workspace.isResizing=!0;const r=document.getElementById("resize-overlay");r.style.display="block",r.style.cursor=s==="vertical"?"col-resize":"row-resize";const c=d=>{if(!this.workspace.isResizing)return;const u=t.getBoundingClientRect();if(s==="vertical"){const h=(d.clientX-u.left)/u.width*100;n.splitPercentage=Math.max(10,Math.min(90,h)),t.style.gridTemplateColumns=`${n.splitPercentage}% auto 1fr`}else{const h=(d.clientY-u.top)/u.height*100;n.splitPercentage=Math.max(10,Math.min(90,h)),t.style.gridTemplateRows=`${n.splitPercentage}% auto 1fr`}},l=()=>{this.workspace.isResizing=!1,r.style.display="none",r.style.cursor="default",document.removeEventListener("mousemove",c),document.removeEventListener("mouseup",l),document.removeEventListener("touchmove",c),document.removeEventListener("touchend",l),this.workspace._stateManager.saveState()};document.addEventListener("mousemove",c),document.addEventListener("mouseup",l),document.addEventListener("touchmove",c,{passive:!1}),document.addEventListener("touchend",l)};e.addEventListener("mousedown",i),e.addEventListener("touchstart",i,{passive:!1})}}class Ai{constructor(e){this.workspace=e,this.isMaximized=!1}async splitPane(e,t,n=null){this.isMaximized&&this.toggleMaximizePane();let s=null;const i=r=>{if(r.type==="leaf"&&r.id===e){s=`pane-${Date.now()}`;let c;n?c={garden:n.garden,path:n.path}:c={garden:r.buffers[r.activeBufferIndex].garden,path:"/scratchpad/placeholder"};const l={type:"leaf",id:s,activeBufferIndex:0,buffers:[c]};return{type:`split-${t}`,splitPercentage:50,children:[r,l]}}return r.type.startsWith("split-")&&(r.children=r.children.map(c=>i(c))),r},o=(r,c)=>r.type==="leaf"&&r.id===c?r:r.type.startsWith("split-")?o(r.children[0],c)||o(r.children[1],c):null;if(this.workspace.paneTree=i(this.workspace.paneTree),s&&!n){const r=o(this.workspace.paneTree,s);if(r){const c=await this.workspace.getGitClient(r.buffers[0].garden),l=await nt(c);r.buffers[0].path=l}}this.workspace.render().then(()=>{s&&this.workspace.setActivePane(s)})}closeActivePane(){this.isMaximized&&this.toggleMaximizePane();const e=this._getPaneList();if(e.length<=1)return;const t=e.findIndex(o=>o.id===this.workspace.activePaneId);if(t===-1)return;const n=(t+1)%e.length,s=e[n===t?0:n].id,i=o=>{if(!o||o.type==="leaf")return o;const r=o.children.findIndex(c=>c.id===this.workspace.activePaneId);return r!==-1?o.children[1-r]:(o.children=o.children.map(c=>i(c)).filter(Boolean),o.children.length===1?o.children[0]:o)};this.workspace.paneTree=i(this.workspace.paneTree),this.workspace.render().then(()=>{this.workspace.setActivePane(s)})}selectNextPane(){const e=this._getPaneList(),t=e.findIndex(s=>s.id===this.workspace.activePaneId);if(t===-1)return;const n=(t+1)%e.length;this.workspace.setActivePane(e[n].id)}selectPrevPane(){const e=this._getPaneList(),t=e.findIndex(s=>s.id===this.workspace.activePaneId);if(t===-1)return;const n=(t-1+e.length)%e.length;this.workspace.setActivePane(e[n].id)}movePaneUp(){this._findAndSwap("up")}movePaneDown(){this._findAndSwap("down")}toggleMaximizePane(){this.isMaximized?this._applyRestore(this.workspace.paneTree):this._applyMaximize(this.workspace.paneTree,this.workspace.activePaneId),this.isMaximized=!this.isMaximized,this.workspace.updateLayout(),this.workspace._stateManager.saveState()}_isDescendant(e,t){return e.type==="leaf"?e.id===t:e.type.startsWith("split-")?this._isDescendant(e.children[0],t)||this._isDescendant(e.children[1],t):!1}_applyMaximize(e,t){!e||e.type==="leaf"||e.type.startsWith("split-")&&(e.originalSplitPercentage=e.splitPercentage,this._isDescendant(e.children[0],t)?e.splitPercentage=99.5:this._isDescendant(e.children[1],t)&&(e.splitPercentage=.5),this._applyMaximize(e.children[0],t),this._applyMaximize(e.children[1],t))}_applyRestore(e){!e||e.type==="leaf"||e.type.startsWith("split-")&&(typeof e.originalSplitPercentage=="number"&&(e.splitPercentage=e.originalSplitPercentage,delete e.originalSplitPercentage),this._applyRestore(e.children[0]),this._applyRestore(e.children[1]))}getActivePaneInfo(){if(!this.workspace.activePaneId)return null;let e=null;const t=s=>{s.type==="leaf"&&s.id===this.workspace.activePaneId?e=s:s.type.startsWith("split-")&&s.children.forEach(t)};t(this.workspace.paneTree);const n=this.workspace.panes.get(this.workspace.activePaneId);return e&&n?{node:e,pane:n}:null}_getPaneList(){const e=[],t=n=>{n.type==="leaf"?e.push(n):n.type.startsWith("split-")&&n.children.forEach(t)};return t(this.workspace.paneTree),e}_rebuildTreeWithNewOrder(e,t){return e?e.type==="leaf"?t.shift():(e.type.startsWith("split-")&&(e.children=e.children.map(n=>this._rebuildTreeWithNewOrder(n,t))),e):null}_findAndSwap(e){this.isMaximized&&this.toggleMaximizePane();const t=this._getPaneList();if(t.length<2)return;const n=t.findIndex(o=>o.id===this.workspace.activePaneId);if(n===-1)return;const s=e==="up"?n-1:n+1;if(s<0||s>=t.length)return;[t[n],t[s]]=[t[s],t[n]];const i=JSON.parse(JSON.stringify(this.workspace.paneTree));this.workspace.paneTree=this._rebuildTreeWithNewOrder(i,t),this.workspace.render().then(()=>{const o=this.workspace.getActiveEditor();o&&o.editorView.focus()})}}class Ni{constructor(e){this.workspace=e}loadState(){try{const e=sessionStorage.getItem("thoughtform_workspace_layout");if(e)return JSON.parse(e)}catch(e){console.error("Failed to load or parse workspace state from sessionStorage:",e),sessionStorage.removeItem("thoughtform_workspace_layout")}return null}saveState(){if(!this.workspace.paneTree)return;const e={};this.workspace.panes.forEach((n,s)=>{n.editor&&(e[s]=n.editor.getCurrentState())});const t={paneTree:this.workspace.paneTree,activePaneId:this.workspace.activePaneId,editorStates:e,isMaximized:this.workspace._paneManager.isMaximized};try{sessionStorage.setItem("thoughtform_workspace_layout",JSON.stringify(t))}catch(n){console.error("Failed to save workspace state to sessionStorage:",n)}}}class Mi{constructor(e){this.initialGitClient=e,this.panes=new Map,this.mainContainer=document.querySelector("main"),this.isResizing=!1,this.gitClients=new Map,this.gitClients.set(e.gardenName,e),this.broadcastChannel=new BroadcastChannel("thoughtform_garden_sync"),this.broadcastChannel.onmessage=this.handleBroadcastMessage.bind(this),window.thoughtform.events.subscribe("file:rename",i=>this.notifyFileRename(i)),this._renderer=new Li(this),this._paneManager=new Ai(this),this._stateManager=new Ni(this);const n=(window.location.hash||"").includes("?windowed=true"),s=this._stateManager.loadState();n?(this.paneTree=this._createInitialPaneTree(),this.activePaneId="pane-1",this.initialEditorStates={},this._paneManager.isMaximized=!1):s?(this.paneTree=s.paneTree,this.activePaneId=s.activePaneId,this.initialEditorStates=s.editorStates||{},this._paneManager.isMaximized=s.isMaximized||!1):(this.paneTree=this._createInitialPaneTree(),this.activePaneId="pane-1",this.initialEditorStates={},this._paneManager.isMaximized=!1)}_createInitialPaneTree(){let e=(window.location.hash||"#/home").substring(1);return e=e.split("?")[0],{type:"leaf",id:"pane-1",activeBufferIndex:0,buffers:[{garden:this.initialGitClient.gardenName,path:e}]}}async getGitClient(e){if(!this.gitClients.has(e)){const t=new E(e);await t.initRepo(),this.gitClients.set(e,t)}return this.gitClients.get(e)}setActivePane(e){if(this._paneManager.isMaximized&&this.activePaneId!==e&&this.toggleMaximizePane(),!this.panes.has(e))return;this.activePaneId=e,this.panes.forEach((n,s)=>{n.element.classList.toggle("is-active-pane",s===e)});const t=this.panes.get(e);setTimeout(()=>t?.editor?.editorView.focus(),50),this._updateURL(),window.thoughtform.sidebar?.refresh(),this._stateManager.saveState()}async switchGarden(e){const t=this.getActiveEditor();if(!t||t.gitClient.gardenName===e)return;const n=await this.getGitClient(e);t.gitClient=n,window.thoughtform.sidebar.gitClient=n,t.editorView.dispatch({effects:t.appContextCompartment.reconfigure(F.init(()=>({gitClient:n,sidebar:window.thoughtform.sidebar,editor:t})))}),await this.openFile(e,"/home"),window.thoughtform.sidebar&&(window.thoughtform.sidebar.activeTab="Files",sessionStorage.setItem("sidebarActiveTab","Files")),await window.thoughtform.sidebar.refresh()}async openFile(e,t){const n=this._paneManager.getActivePaneInfo();if(!n)return;const{node:s,pane:i}=n,o=i.editor,r=s.buffers.findIndex(l=>l.garden===e&&l.path===t);r!==-1?s.activeBufferIndex=r:(s.buffers.push({garden:e,path:t}),s.activeBufferIndex=s.buffers.length-1);const c=await this.getGitClient(e);o.gitClient.gardenName!==e&&(o.gitClient=c,o.editorView.dispatch({effects:o.appContextCompartment.reconfigure(F.init(()=>({gitClient:c,sidebar:window.thoughtform.sidebar,editor:o})))})),await o.loadFile(t),this.setActivePane(this.activePaneId)}async openInNewPane(e,t){if(!e||!t)return;const n=this.panes.get(t)?.editor;if(!n)return;let s=e.split("|")[0].trim(),i=null;s.includes("#")&&([i,s]=s.split("#"));let o,r;if(i&&i!==n.gitClient.gardenName){r=i;const u=await this.getGitClient(r);o=await he(s,{gitClient:u,sidebar:window.thoughtform.sidebar})||(s.startsWith("/")?s:`/${s}`)}else r=n.gitClient.gardenName,o=await he(s,{gitClient:n.gitClient,sidebar:window.thoughtform.sidebar})||(s.startsWith("/")?s:`/${s}`);const c=this.panes.get(t);if(!c||!c.element)return;const l=c.element,d=l.offsetWidth>l.offsetHeight?"vertical":"horizontal";await this.splitPane(t,d,{garden:r,path:o})}_updateURL(){const e=this._paneManager.getActivePaneInfo();if(!e)return;const t=e.node.buffers[e.node.activeBufferIndex],n=new URL(import.meta.url).pathname,s=n.lastIndexOf("/src/"),o=`${s>-1?n.substring(0,s):""}/${encodeURIComponent(t.garden)}`,r=`#${encodeURI(t.path)}`,c=window.location.hash.split("?")[0],l=(window.location.hash||"").includes("?windowed=true"),d=l?`${r}?windowed=true`:r;(window.location.pathname!==o||c!==r)&&(window.history.pushState(null,"",`${o}${d}`),l&&window.parent.postMessage({type:"preview-url-changed",payload:{newUrl:window.location.href}},"*"))}async notifyFileUpdate(e,t,n){this.broadcastChannel.postMessage({type:"file_updated",gardenName:e,filePath:t,sourcePaneId:n});for(const[s,i]of this.panes.entries())s!==n&&i.editor.gitClient.gardenName===e&&i.editor.filePath===t&&await i.editor.forceReloadFile(t)}notifyFileRename({oldPath:e,newPath:t,gardenName:n}){this._performRenameUpdate(e,t,n),this.broadcastChannel.postMessage({type:"file_renamed",oldPath:e,newPath:t,gardenName:n})}_performRenameUpdate(e,t,n){let s=!1;const i=o=>{o.type==="leaf"?o.buffers.forEach(r=>{r.garden===n&&r.path===e&&(r.path=t)}):o.type.startsWith("split-")&&o.children.forEach(i)};i(this.paneTree),this.panes.forEach(o=>{const r=o.editor;r.gitClient.gardenName===n&&r.filePath===e&&(r.filePath=t,r.refreshStatusBar(),r.paneId===this.activePaneId&&(s=!0))}),s&&this._updateURL(),window.thoughtform.sidebar?.refresh(),this._stateManager.saveState()}async handleBroadcastMessage(e){const{type:t,gardenName:n,filePath:s,sourcePaneId:i,oldPath:o,newPath:r}=e.data;if(t==="file_updated")for(const[,c]of this.panes.entries())c.editor.gitClient.gardenName===n&&c.editor.filePath===s&&await c.editor.forceReloadFile(s);else t==="file_renamed"&&this._performRenameUpdate(o,r,n)}getActiveEditor(){const e=this.panes.get(this.activePaneId);return e?e.editor:null}async getActiveGitClient(){const e=this._paneManager.getActivePaneInfo();if(!e)return this.initialGitClient;const t=e.node.buffers[e.node.activeBufferIndex];return await this.getGitClient(t.garden)}render(){return this._renderer.render()}updateLayout(){return this._renderer.updateLayout()}splitPane(e,t,n=null){return this._paneManager.splitPane(e,t,n)}closeActivePane(){return this._paneManager.closeActivePane()}selectNextPane(){return this._paneManager.selectNextPane()}selectPrevPane(){return this._paneManager.selectPrevPane()}movePaneUp(){return this._paneManager.movePaneUp()}movePaneDown(){return this._paneManager.movePaneDown()}toggleMaximizePane(){return this._paneManager.toggleMaximizePane()}_saveStateToSession(){return this._stateManager.saveState()}}function Ri(a){return new Mi(a)}async function _i(){const a=new URLSearchParams(window.location.search);if(a.size===0)return;const e=Object.fromEntries(a.entries()),t=window.thoughtform.workspace.getActiveEditor(),n=await window.thoughtform.workspace.getActiveGitClient();if(!t||!n){console.error("[QueryLoader] Could not get active editor or git client. Aborting script execution.");return}const s=n.gardenName;for(const i in e)if(e[i]===""){const o=`/settings/query/${i}.js`,r=`${s}#${o}`;await se(r,t,n,null,e)}}window.Buffer=gt.Buffer;window.process={env:{}};function Fi(a){const e=async()=>{a&&window.parent.postMessage({type:"preview-url-changed",payload:{newUrl:window.location.href}},"*");const t=new URL(import.meta.url).pathname,n=t.lastIndexOf("/src/"),s=n>-1?t.substring(0,n):"";let i=window.location.pathname.startsWith(s)?window.location.pathname.substring(s.length):window.location.pathname;i=i.replace(/^\/|\/$/g,"")||"home",i=decodeURIComponent(i);let o=(window.location.hash||"#/home").substring(1);o=decodeURI(o).split("?")[0],await window.thoughtform.workspace.openFile(i,o)};if(window.addEventListener("popstate",e),a){document.body.classList.add("is-preview-mode"),document.body.addEventListener("mousedown",()=>{window.parent.postMessage({type:"preview-focus"},"*")},{capture:!0});const t=()=>{window.parent.postMessage({type:"preview-interacted"},"*"),document.body.removeEventListener("mousedown",t,!0),document.body.removeEventListener("wheel",t,!0)};document.body.addEventListener("mousedown",t,!0),document.body.addEventListener("wheel",t,!0)}}async function Di(){const a=new URL(import.meta.url).pathname,e=a.lastIndexOf("/src/"),t=e>-1?a.substring(0,e):"",s=(window.location.hash||"").includes("?preview=true");await new E("Settings").initRepo();let o=window.location.pathname.startsWith(t)?window.location.pathname.substring(t.length):window.location.pathname;o=o.replace(/^\/|\/$/g,"")||"home",o=decodeURIComponent(o),console.log(`Base Path: "${t}"`),console.log(`Loading garden: "${o}"`);const r=new E(o);window.thoughtform={ui:{},ai:Si(),config:xi(),events:Ii()},window.thoughtform.workspace=Ri(r);const c=$i({onNeedRefresh(){C.confirm({title:"Update Available",message:"A new version of Thoughtform Garden is available. Reload to apply the update?",okText:"Reload"}).then(g=>{g&&c(!0)})},onOfflineReady(){console.log("App is ready for offline use.")}});window.thoughtform.updateApp=c,Bs(),ui(),window.thoughtform.runMigration=pi,window.onerror=function(g,f,p,y,m){return console.error("Caught global error:",g,m),s||window.thoughtform.ui.toggleDevtools?.(!0,"console"),!1},window.onunhandledrejection=function(g){console.error("Caught unhandled promise rejection:",g.reason),s||window.thoughtform.ui.toggleDevtools?.(!0,"console")};const l={gitClient:r};window.thoughtform.editor=l;const d=new fi;window.thoughtform.commandPalette=d,await window.thoughtform.workspace.render();const u=window.thoughtform.workspace.getActiveEditor();if(!u){console.error("FATAL: Workspace manager failed to create an initial editor.");return}window.thoughtform.editor=u;const h=new Pi(window.thoughtform.events);h.initialize(),window.thoughtform.hooks=h,Fi(s),await _i(),window.thoughtform.events.publish("app:load")}Di();

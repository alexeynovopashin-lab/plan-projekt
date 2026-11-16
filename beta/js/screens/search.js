// Search (docs/screens.md §2.8): text of all entries. Saved filters — later.
import { allEntries, project } from "../store.js";
import { el, esc, when, statusDot, projIcon } from "../ui.js";
import { icon } from "../icons.js";
import { nav } from "../nav.js";
import { view } from "../actions.js";

let lastQ = "";

function hl(text, q) {
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q);
  if (i < 0) return esc(text);
  return esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
}

export function search() {
  const s = el(`<div class="screen"><div class="scroller">
    <div class="search-bar"><label class="search-field glass">${icon("magnifyingglass")}<input type="search" placeholder="Поиск по записям" enterkeyhint="search" autocomplete="off"></label>
    <button class="glass-btn" data-x aria-label="Закрыть">${icon("xmark")}</button></div>
    <div class="res"></div></div></div>`);
  const inp = s.querySelector("input"), res = s.querySelector(".res");
  s.querySelector("[data-x]").addEventListener("click", () => nav.pop());
  const run = () => {
    const q = inp.value.trim().toLowerCase(); lastQ = inp.value;
    res.innerHTML = "";
    if (!q) { res.appendChild(el(`<div class="empty">${icon("magnifyingglass")}Ищет по тексту всех записей, во всех проектах и во Входящих</div>`)); return; }
    const hits = allEntries().map(view).filter(e => e.text.toLowerCase().includes(q) || [...e.tags].some(t => t.includes(q))).reverse();
    if (!hits.length) { res.appendChild(el('<div class="empty">Ничего не нашлось</div>')); return; }
    res.appendChild(el(`<div class="sec-cap">${hits.length} НАЙДЕНО</div>`));
    for (const e of hits) {
      const p = project(e.project);
      const r = el(`<button class="tl-row">${statusDot(e)}<span class="tl-main"><span class="tl-t">${hl(e.text, q)}</span>
        <span class="tl-s">${e.project ? projIcon(e.project, "sm") : ""}<span>${esc(p ? p.title : "Входящие")} · ${when(e.created)}</span></span></span></button>`);
      r.addEventListener("click", () => nav.push({ s: "entry", id: e.id }));
      res.appendChild(r);
    }
  };
  inp.addEventListener("input", run);
  inp.value = lastQ;
  run();
  s.focusFirst = () => inp.focus();
  return s;
}

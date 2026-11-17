import { allEntries, project, addEvent, blobUrl, isToday, dayKey } from "../store.js";
import { TYPES } from "../contract.js";
import { el, esc, stamp, headTags, statusDot, hold, swipeRow, viewImage, autogrow, projIcon, toast, plural } from "../ui.js";
import { icon } from "../icons.js";
import { nav, shell, searchBtn, wire } from "../nav.js";
import { key } from "../flavor.js";
import { view, dropEntry, verifyEntry, entryMenu, statusMenu } from "../actions.js";

const FILTERS = [
  { id: "open", t: "Открытые", f: e => !e.closed },
  { id: "waits", t: "Ждут вас", f: e => e.waits && e.status !== "dropped" },
  { id: "all", t: "Все", f: () => true }
];

function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} return v; }
export const sortOrder = () => (ls(key("sort")) === "old" ? "old" : "new");
export function sorted(list) {
  const a = list.slice().sort((x, y) => (x.id < y.id ? -1 : 1));
  return sortOrder() === "new" ? a.reverse() : a;
}
export function sortButton(onChange) {
  const b = el(`<button class="sort-btn">${icon("arrow.up.arrow.down")}<span></span></button>`);
  const paint = () => { b.querySelector("span").textContent = sortOrder() === "new" ? "Сначала новые" : "Сначала старые"; };
  paint();
  b.addEventListener("click", () => { ls(key("sort"), sortOrder() === "new" ? "old" : "new"); paint(); onChange(); });
  return b;
}

function dueChip(e) {
  if (!e.due || e.closed) return "";
  const today = dayKey(new Date());
  const late = e.due < today;
  const label = e.due === today ? "сегодня" : e.due === dayKey(new Date(Date.now() + 864e5)) ? "завтра" : e.due.split("-").reverse().slice(0, 2).join(".");
  return `<span class="chip due ${late ? "late" : ""}">${icon("calendar")} срок ${label}</span>`;
}

export function paraHtml(e, { showProject = false } = {}) {
  const st = e.status;
  const stChip = st === "done_beta" ? `<span class="chip st-done_beta">сделано в бете${e.commit ? ` · <span class="mono">${esc(e.commit.slice(0, 7))}</span>` : ""}</span>`
    : st === "reopened" ? `<span class="chip st-reopened">открыта снова</span>`
      : st === "taken" ? `<span class="chip st-taken">взята агентом</span>` : "";
  const imgs = (e.attachments || []).map(p => `<img class="p-img" src="${blobUrl(p)}" alt="" data-src="${esc(p)}">`).join("");
  const q = e.openQuestion;
  const lastComment = e.comments.length ? e.comments[e.comments.length - 1] : null;
  const tags = headTags(e.type, [...e.tags]);
  const meta = [stChip, dueChip(e), showProject && e.project ? `<span class="chip proj">${projIcon(e.project, "sm")}${esc(project(e.project)?.title || e.project)}</span>` : ""].filter(Boolean).join("");
  return `<div class="para st-${st} ${e.closed ? "closed" : ""} ${st === "dropped" ? "dropped" : ""}" data-id="${e.id}">
    <div class="sw-bg sw-left">${icon("trash")}<span>Отменить</span></div>
    <div class="sw-bg sw-right" style="background:var(--green)">${icon("checkmark")}<span>Проверено</span></div>
    <div class="sw-body">
      <div class="p-head">${statusDot(e)}<span class="p-date">${stamp(e.created)}</span>${tags.length ? `<span class="p-tags">${tags.map(t => "#" + esc(t)).join(" ")}</span>` : ""}</div>
      <div class="p-text" data-open>${esc(e.text)}</div>
      ${meta ? `<div class="p-meta">${meta}</div>` : ""}
      ${imgs ? `<div class="p-imgs">${imgs}</div>` : ""}
      ${lastComment && !e.closed ? `<div class="note-agent">${icon("bubble")}<span>${esc(lastComment.text)}</span></div>` : ""}
      ${q ? `<div class="ask"><div class="a-q">${icon("bubble")}<span>${esc(q.text)}</span></div>
        <div class="a-by">Вопрос агента · ${stamp(q.at)}</div>
        <form><textarea rows="1" placeholder="Ответ" enterkeyhint="send"></textarea><button class="send" disabled aria-label="Ответить">${icon("arrow.up")}</button></form></div>` : ""}
    </div>
  </div>`;
}

export function wirePara(node, e) {
  node.querySelectorAll("[data-open], .p-head").forEach(n => n.addEventListener("click", () => nav.push({ s: "entry", id: e.id })));
  const dot = node.querySelector(".p-head .sd");
  dot.addEventListener("click", ev => { ev.stopPropagation(); statusMenu(dot, e); });
  node.querySelectorAll(".p-img").forEach(img => img.addEventListener("click", ev => { ev.stopPropagation(); viewImage(img.src); }));
  if (e.status !== "dropped") {
    swipeRow(node, {
      left: () => dropEntry(e),
      right: e.status === "done_beta" ? () => verifyEntry(e) : null
    });
  }
  hold(node.querySelector(".sw-body"), () => entryMenu(node, e));
  const form = node.querySelector(".ask form");
  if (form) {
    const ta = form.querySelector("textarea"), send = form.querySelector(".send");
    autogrow(ta, 120);
    ta.addEventListener("input", () => { send.disabled = !ta.value.trim(); });
    const go = async ev => {
      ev && ev.preventDefault();
      const text = ta.value.trim();
      if (!text) return;
      await addEvent({ entry: e.id, kind: "answer", question: e.openQuestion.id, text });
      toast("Ответ сохранён");
    };
    form.addEventListener("submit", go);
    ta.addEventListener("keydown", ev => { if (ev.key === "Enter" && !ev.shiftKey) go(ev); });
    form.addEventListener("pointerdown", ev => ev.stopPropagation());
    form.addEventListener("click", ev => ev.stopPropagation());
  }
}

export function renderParas(container, entries, opts) {
  for (const e of entries) {
    const node = el(paraHtml(e, opts));
    container.appendChild(node);
    wirePara(node, e);
  }
}

const feedFilter = new Map();   

export function feed(route) {
  const p = project(route.tag) || { tag: route.tag, title: route.tag, color: "gray" };
  const right = `<div class="glass-group glass"><button data-act="search" aria-label="Поиск">${icon("magnifyingglass")}</button><button data-act="more" aria-label="Ещё">${icon("ellipsis")}</button></div>`;
  const { s, body } = shell({ title: p.title, back: true, right, tint: p.color });
  wire(s);
  s.querySelector('[data-act="more"]').addEventListener("click", () => nav.push({ s: "project", tag: p.tag }));
  s.dataset.composer = "1";

  const fill = () => {
    body.innerHTML = "";
    const mine = allEntries().filter(e => e.project === p.tag).map(view);
    const fid = feedFilter.get(p.tag) || "open";
    const seg = el(`<div class="seg">${FILTERS.map(f => `<button data-f="${f.id}" class="${f.id === fid ? "on" : ""}">${f.t}<span class="n">${mine.filter(f.f).length}</span></button>`).join("")}</div>`);
    body.appendChild(seg);
    seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { feedFilter.set(p.tag, b.dataset.f); fill(); }));
    const list = sorted(mine.filter(FILTERS.find(f => f.id === fid).f));
    const bar = el('<div class="list-bar"></div>');
    bar.appendChild(el(`<span>${list.length} ${plural(list.length, "запись", "записи", "записей")}</span>`));
    bar.appendChild(sortButton(fill));
    body.appendChild(bar);
    const box = el('<div class="feed"></div>');
    body.appendChild(box);
    if (!list.length) {
      box.appendChild(el(`<div class="empty">${icon(fid === "waits" ? "checkmark" : "text.alignleft")}${fid === "waits" ? "Ничего не ждёт вашей проверки" : fid === "open" ? "Открытых записей нет.<br>Нажмите тип внизу — и пишите." : "Записей пока нет"}</div>`));
    }
    renderParas(box, list);
  };
  fill();
  s.update = fill;
  s.appendChild(typeBar(p.tag));
  return s;
}

function typeBar(tag) {
  const bar = el(`<div class="composer typebar"><div class="tb-row glass">
    ${TYPES.map(t => `<button data-type="${t.id}" class="type-${t.id}"><span class="tb-dot"></span>${t.t}</button>`).join("")}
    <button data-type="" aria-label="Без типа" class="tb-plus">${icon("plus")}</button>
  </div></div>`);
  bar.querySelectorAll("button").forEach(b => b.addEventListener("click", () => nav.capture({ project: tag, type: b.dataset.type || null })));
  requestAnimationFrame(() => document.body.style.setProperty("--composer-h", bar.offsetHeight + "px"));
  return bar;
}

const SMART = {
  waits: { t: "Ждут вас", c: "orange", f: e => e.waits && e.status !== "dropped", empty: "Ничего не ждёт вашей проверки" },
  today: { t: "Сегодня", c: "blue", f: e => !e.closed && (isToday(e.created) || e.due === dayKey(new Date())), empty: "Сегодня записей и сроков нет" },
  open: { t: "Открытые", c: "indigo", f: e => !e.closed, empty: "Всё закрыто" }
};

export function smart(route) {
  const def = SMART[route.kind];
  const { s, body } = shell({ title: def.t, back: true, right: searchBtn(), tint: def.c });
  wire(s);
  const fill = () => {
    body.innerHTML = "";
    const list = sorted(allEntries().map(view).filter(def.f).filter(e => e.project));
    const bar = el('<div class="list-bar"></div>');
    bar.appendChild(el(`<span>${list.length} ${plural(list.length, "запись", "записи", "записей")}</span>`));
    bar.appendChild(sortButton(fill));
    body.appendChild(bar);
    if (!list.length) body.appendChild(el(`<div class="empty">${icon("checkmark")}${def.empty}</div>`));
    const box = el('<div class="feed"></div>');
    body.appendChild(box);
    renderParas(box, list, { showProject: true });
  };
  fill();
  s.update = fill;
  return s;
}

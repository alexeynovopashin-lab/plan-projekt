// Entry actions shared by screens: deferred status with «Вернуть», pickers, menu.
import { addEvent, state, project, done, allEntries } from "./store.js";
import { TYPES, typeTitle, STATUS_TITLE } from "./contract.js";
import { el, esc, openSheet, showUndo, menu, toast, projIcon, stamp } from "./ui.js";
import { icon } from "./icons.js";

// A status change behind «Вернуть» is written only when the 6 s window ends:
// undo then leaves no file behind (contract: files are never edited or deleted).
export const pending = new Map();   // entryId -> { status, timer }
const UNDO_MS = 6000;

export function shownStatus(e) {
  const p = pending.get(e.id);
  return p ? p.status : e.status;
}
// The entry as the screen should show it, pending status included.
export function view(e) {
  const p = pending.get(e.id);
  if (!p) return e;
  const status = p.status;
  return { ...e, status, closed: status === "verified" || status === "dropped", waits: status === "done_beta" || !!e.openQuestion };
}

async function commit(id) {
  const p = pending.get(id);
  if (!p) return;
  clearTimeout(p.timer);
  pending.delete(id);
  await addEvent({ entry: id, kind: "status", status: p.status, ...(p.extra || {}) });
}

export async function flushPending() { for (const id of [...pending.keys()]) await commit(id); }

export async function deferStatus(e, status, text) {
  await flushPending();
  const timer = setTimeout(() => commit(e.id), UNDO_MS);
  pending.set(e.id, { status, timer });
  done();
  showUndo(text, () => {
    const p = pending.get(e.id);
    if (p) { clearTimeout(p.timer); pending.delete(e.id); done(); }
  });
}

export const dropEntry = e => deferStatus(e, "dropped", "Запись отменена");
export const verifyEntry = e => deferStatus(e, "verified", "Проверено");
export const reopenEntry = e => deferStatus(e, "reopened", "Открыта снова — агент увидит");
export const doneEntry = e => deferStatus(e, "verified", "Сделано");

// Tap on the status circle (Alexey, 17.11: «1А», after «Как поменять статус карточки?»).
export function statusMenu(anchor, e) {
  const items = [];
  if (e.status === "done_beta") {
    items.push({ t: "Проверено", icon: "checkmark", fn: () => verifyEntry(e) },
      { t: "Не исправлено", icon: "arrow.uturn.backward", fn: () => reopenEntry(e) });
  } else if (!e.closed) items.push({ t: "Сделано", icon: "checkmark", fn: () => doneEntry(e) });
  if (e.closed) items.push({ t: "Открыть снова", icon: "arrow.uturn.backward", fn: () => reopenEntry(e) });
  if (e.status !== "dropped") items.push("-", { t: "Отменить запись", icon: "trash", danger: true, fn: () => dropEntry(e) });
  menu(anchor, items);
}

// «Связать с…»: any other entry, searched by its text (Alexey, 17.11: «реализовать глубже»).
export function pickLink(e) {
  const linked = new Set(e.links.map(l => l.to));
  const all = allEntries().filter(x => x.id !== e.id && x.status !== "dropped" && !linked.has(x.id)).reverse();
  const box = el(`<div class="pick"><div class="grab"></div><div class="sheet-head"><span style="width:44px"></span><h2>Связать с…</h2><button class="glass-btn" data-x>${icon("xmark")}</button></div>
    <div class="inline-pick"><input type="search" placeholder="Поиск по тексту" enterkeyhint="search" style="flex:1"></div>
    <div class="sheet-body pick-list"><div class="group"></div></div></div>`);
  const g = box.querySelector(".group"), inp = box.querySelector("input");
  const paint = () => {
    const q = inp.value.trim().toLowerCase();
    const list = (q ? all.filter(x => x.text.toLowerCase().includes(q)) : all).slice(0, 60);
    g.innerHTML = list.length ? "" : '<div class="row"><span class="r-main" style="color:var(--ink-2)">Ничего не нашлось</span></div>';
    for (const x of list) {
      const b = el(`<button class="row">${projIcon(x.project)}<span class="r-main"><span class="r-t" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(x.text)}</span><span class="r-s">${esc(project(x.project)?.title || "Входящие")} · ${stamp(x.created)}</span></span></button>`);
      b.addEventListener("click", async () => {
        sh.close();
        await addEvent({ entry: e.id, kind: "link", to: x.id, rel: "related" });
        toast("Связано");
      });
      g.appendChild(b);
    }
  };
  inp.addEventListener("input", paint);
  paint();
  const sh = openSheet(box, { tall: true });
  box.querySelector("[data-x]").addEventListener("click", () => sh.close());
}

// ---- pickers (small sheets) ----
export function pickProject(current, onPick, { allowInbox = true } = {}) {
  const box = el(`<div class="pick"><div class="grab"></div><div class="sheet-head"><span style="width:44px"></span><h2>Проект</h2><button class="glass-btn" data-x>${icon("xmark")}</button></div><div class="sheet-body pick-list"><div class="group"></div></div></div>`);
  const g = box.querySelector(".group");
  const opts = [...(allowInbox ? [{ tag: null, title: "Входящие" }] : []), ...state.projects];
  for (const p of opts) {
    const b = el(`<button class="row">${p.tag ? projIcon(p.tag) : `<span class="pico" style="--c:var(--gray)">${icon("tray")}</span>`}<span class="r-main"><span class="r-t">${esc(p.title)}</span></span>${(p.tag || null) === (current || null) ? `<span style="color:var(--accent)">${icon("checkmark")}</span>` : ""}</button>`);
    b.addEventListener("click", () => { sh.close(); onPick(p.tag); });
    g.appendChild(b);
  }
  const sh = openSheet(box, { tall: opts.length > 7 });
  box.querySelector("[data-x]").addEventListener("click", () => sh.close());
}

export function pickType(current, onPick) {
  pickFrom("Тип", [{ id: null, t: "Без типа" }, ...TYPES], current, onPick);
}

function pickFrom(title, items, current, onPick) {
  const box = el(`<div class="pick"><div class="grab"></div><div class="sheet-head"><span style="width:44px"></span><h2>${esc(title)}</h2><button class="glass-btn" data-x>${icon("xmark")}</button></div><div class="sheet-body pick-list"><div class="group" style="--sep-left:16px"></div></div></div>`);
  const g = box.querySelector(".group");
  for (const it of items) {
    const b = el(`<button class="row"><span class="r-main"><span class="r-t">${esc(it.t)}</span></span>${(it.id || null) === (current || null) ? `<span style="color:var(--accent)">${icon("checkmark")}</span>` : ""}</button>`);
    b.addEventListener("click", () => { sh.close(); onPick(it.id); });
    g.appendChild(b);
  }
  const sh = openSheet(box);
  box.querySelector("[data-x]").addEventListener("click", () => sh.close());
}

export function pickDate(current, onPick) {
  const iso = d => d.toISOString().slice(0, 10);
  const t = new Date(), tm = new Date(Date.now() + 864e5), wk = new Date(Date.now() + 7 * 864e5);
  const box = el(`<div class="pick"><div class="grab"></div><div class="sheet-head"><span style="width:44px"></span><h2>Срок</h2><button class="glass-btn" data-x>${icon("xmark")}</button></div>
    <div class="sheet-body"><div class="group" style="--sep-left:16px">
      <button class="row" data-d="${iso(t)}"><span class="r-main">Сегодня</span></button>
      <button class="row" data-d="${iso(tm)}"><span class="r-main">Завтра</span></button>
      <button class="row" data-d="${iso(wk)}"><span class="r-main">Через неделю</span></button>
      <label class="row"><span class="r-main">Дата</span><input type="date" value="${current || ""}" style="border:0;background:var(--fill-2);border-radius:10px;padding:6px 10px"></label>
      ${current ? `<button class="row danger" data-d="">Убрать срок</button>` : ""}
    </div></div></div>`);
  const sh = openSheet(box);
  box.querySelector("[data-x]").addEventListener("click", () => sh.close());
  box.querySelectorAll("[data-d]").forEach(b => b.addEventListener("click", () => { sh.close(); onPick(b.dataset.d || null); }));
  box.querySelector("input").addEventListener("change", e => { if (e.target.value) { sh.close(); onPick(e.target.value); } });
}

export function pickTag(onPick) {
  const known = new Set();
  for (const e of state.entries.values()) for (const t of e.tags) known.add(t);
  const box = el(`<div class="pick"><div class="grab"></div><div class="sheet-head"><span style="width:44px"></span><h2>Тег</h2><button class="glass-btn" data-x>${icon("xmark")}</button></div>
    <div class="sheet-body"><div class="inline-pick"><input type="text" placeholder="Новый тег" enterkeyhint="done" style="flex:1"></div>
    <div class="inline-pick">${[...known].map(t => `<button data-t="${esc(t)}">#${esc(t)}</button>`).join("")}</div></div></div>`);
  const sh = openSheet(box);
  box.querySelector("[data-x]").addEventListener("click", () => sh.close());
  box.querySelectorAll("[data-t]").forEach(b => b.addEventListener("click", () => { sh.close(); onPick(b.dataset.t); }));
  const inp = box.querySelector("input");
  inp.addEventListener("keydown", e => { if (e.key === "Enter" && inp.value.trim()) { sh.close(); onPick(inp.value.trim().toLowerCase()); } });
}

// ---- long-press menu on a paragraph ----
export function entryMenu(anchor, e) {
  const p = project(e.project);
  menu(anchor, [
    { t: "Проект", sub: p ? p.title : "Входящие", icon: "folder", fn: () => pickProject(e.project, tag => {
      if ((tag || null) !== (e.project || null)) addEvent({ entry: e.id, kind: "classify", project: tag }).then(() => toast(tag ? "В «" + project(tag).title + "»" : "Во Входящие"));
    }) },
    { t: "Тип", sub: typeTitle(e.type) || "нет", icon: "lightbulb", fn: () => pickType(e.type, type => addEvent({ entry: e.id, kind: "classify", type })) },
    { t: "Срок", sub: e.due || "нет", icon: "calendar", fn: () => pickDate(e.due, due => addEvent({ entry: e.id, kind: "dates", due })) },
    { t: "Тег", icon: "number", fn: () => pickTag(tag => addEvent({ entry: e.id, kind: "tag", add: tag })) },
    { t: "Связать с…", icon: "link", fn: () => pickLink(e) },
    { t: "Копировать текст", icon: "doc.on.doc", fn: () => { navigator.clipboard?.writeText(e.text).then(() => toast("Скопировано"), () => toast("Не удалось скопировать")); } },
    "-",
    ...(e.status === "done_beta" ? [{ t: "Проверено", icon: "checkmark", fn: () => verifyEntry(e) }] : []),
    ...(e.status !== "dropped" ? [{ t: "Отменить запись", icon: "trash", danger: true, fn: () => dropEntry(e) }] : [])
  ]);
}

export { STATUS_TITLE };

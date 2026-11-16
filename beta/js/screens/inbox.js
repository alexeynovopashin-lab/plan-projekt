// Inbox (docs/screens.md §2.5): entries without a project; one tap sends one to a project.
import { inbox as inboxList, state, actualProjects, addEvent, project } from "../store.js";
import { typeTitle } from "../contract.js";
import { el, esc, when, hold, toast, plural, viewImage } from "../ui.js";
import { blobUrl } from "../store.js";
import { icon } from "../icons.js";
import { nav, shell, searchBtn, wire } from "../nav.js";
import { view, entryMenu } from "../actions.js";

function lev1(a, b) {               // edit distance ≤ 1
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, d = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++d > 1) return false;
    if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; }
  }
  return d + (a.length - i) + (b.length - j) <= 1;
}

// Hint per data_contract §3 step 4: an alias off by one letter («мячу» ↔ «мечу»).
export function suggest(text) {
  const norm = text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ");
  const words = norm.split(/\s+/).filter(w => w.length >= 3);
  for (const p of state.projects) {
    for (const a of p.aliases || []) {
      if (a.includes(" ") ? norm.includes(a) : words.some(w => a.length >= 3 && lev1(w, a))) return p.tag;
    }
  }
  // inflected forms: compare stems (first 3+ letters) for single-word aliases
  for (const p of state.projects) {
    for (const a of p.aliases || []) {
      if (a.includes(" ") || a.length < 4) continue;
      if (words.some(w => w.length >= 4 && lev1(w.slice(0, a.length - 1), a.slice(0, a.length - 1)))) return p.tag;
    }
  }
  return null;
}

export function inbox() {
  const list = inboxList().map(view).filter(e => !e.closed).reverse();
  const { s, body } = shell({ title: "Входящие", right: searchBtn(),
    sub: list.length ? list.length + " " + plural(list.length, "запись", "записи", "записей") + " без проекта" : "" });
  wire(s);
  if (!list.length) {
    body.appendChild(el(`<div class="empty">${icon("tray")}Всё разобрано.<br>Сюда попадает запись, если проект не узнан.</div>`));
    return s;
  }
  const order = [...actualProjects(), ...state.projects.filter(p => !actualProjects().includes(p))];
  for (const e of list) {
    const hint = suggest(e.text);
    const card = el(`<div class="ibox">
      <div class="i-text" data-open>${esc(e.text)}</div>
      <div class="i-meta">${e.type ? `<span class="chip type-${e.type}">${typeTitle(e.type)}</span>` : ""}<span>${when(e.created)}</span>${e.source === "siri" ? "<span>· Сири</span>" : ""}${[...e.tags].map(t => `<span class="chip tag">${esc(t)}</span>`).join("")}</div>
      ${(e.attachments || []).map(a => `<img class="p-img" src="${blobUrl(a)}" alt="">`).join("")}
      ${hint ? `<button class="hint">${icon("lightbulb")}<span>Похоже на <b>${esc(project(hint).title)}</b> — нажмите, чтобы подтвердить</span></button>` : ""}
      <div class="i-proj">${order.map(p => `<button data-tag="${p.tag}"><span class="pico lg" style="--c:var(--${p.color || "gray"})">${icon(p.icon || "list.bullet")}</span><span class="t">${esc(p.title)}</span></button>`).join("")}</div>
    </div>`);
    const send = async tag => {
      card.classList.add("gone");
      setTimeout(async () => {
        await addEvent({ entry: e.id, kind: "classify", project: tag });
        toast("В «" + project(tag).title + "»");
      }, 250);
    };
    card.querySelectorAll(".i-proj button").forEach(b => b.addEventListener("click", () => send(b.dataset.tag)));
    if (hint) card.querySelector(".hint").addEventListener("click", () => send(hint));
    card.querySelector("[data-open]").addEventListener("click", () => nav.push({ s: "entry", id: e.id }));
    card.querySelectorAll(".p-img").forEach(i => i.addEventListener("click", () => viewImage(i.src)));
    hold(card.querySelector("[data-open]"), () => entryMenu(card, e));
    body.appendChild(card);
  }
  return s;
}

// Timeline (docs/screens.md §2.6), after Reminders «Завершено» (refs/08): by day, today on top.
import { state, project } from "../store.js";
import { STATUS_TITLE } from "../contract.js";
import { el, esc, when, statusDot, daysAgo, dayLabel, MON_NOM, projIcon } from "../ui.js";
import { icon } from "../icons.js";
import { nav, shell, searchBtn, wire } from "../nav.js";

let filterTag = null;

const KIND = {
  question: { t: "Вопрос агента", g: "bubble" }, answer: { t: "Ваш ответ", g: "arrow.uturn.backward" },
  comment: { t: "Заметка агента", g: "bubble" }, classify: { t: "Разобрано", g: "folder" },
  tag: { t: "Тег", g: "number" }, link: { t: "Связь", g: "link" }, dates: { t: "Срок", g: "calendar" }
};

// Every moment of every entry: «записано» + its events.
export function moments() {
  const out = [];
  for (const e of state.entries.values()) {
    out.push({ at: e.created, e, kind: "created" });
    for (const ev of e.history) out.push({ at: ev.at, e, kind: ev.kind, ev });
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

function bucket(at, now) {
  const n = daysAgo(at, now);
  if (n <= 0) return "Сегодня";
  if (n === 1) return "Вчера";
  if (n < 7) return "Предыдущие 7 дней";
  if (n < 30) return "Предыдущие 30 дней";
  const d = new Date(at);
  return MON_NOM[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : "");
}

function rowHtml(m) {
  let label, mark;
  if (m.kind === "created") { label = "Записано"; mark = statusDot({ status: "open" }); }
  else if (m.kind === "status") { label = STATUS_TITLE[m.ev.status]; mark = statusDot({ status: m.ev.status }); }
  else {
    const k = KIND[m.kind] || { t: m.kind, g: "clock" };
    label = k.t; mark = `<span class="sd" style="background:var(--fill);color:var(--ink-2)">${icon(k.g)}</span>`;
  }
  const extra = m.ev && (m.kind === "question" || m.kind === "answer" || m.kind === "comment") ? ": «" + esc(m.ev.text) + "»" : "";
  const p = project(m.e.project);
  return `<button class="tl-row" data-id="${m.e.id}">${mark}<span class="tl-main">
    <span class="tl-t">${esc(m.e.text)}</span>
    <span class="tl-s">${m.e.project ? projIcon(m.e.project, "sm") : ""}<span>${esc(p ? p.title : "Входящие")}</span></span>
    <span class="tl-k st-${m.ev?.status || ""}">${label}: ${when(m.at).replace(/^./, c => c)}${extra}</span>
  </span></button>`;
}

export function timeline() {
  const right = searchBtn();
  const { s, body } = shell({ title: "Хронология", right });
  wire(s);
  const all = moments();
  const filt = el(`<div class="filter-row"><button class="all ${filterTag ? "" : "on"}" data-tag="">Все</button>${
    state.projects.filter(p => all.some(m => m.e.project === p.tag)).map(p =>
      `<button data-tag="${p.tag}" class="${filterTag === p.tag ? "on" : ""}">${projIcon(p.tag, "sm")}${esc(p.title)}</button>`).join("")}</div>`);
  filt.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { filterTag = b.dataset.tag || null; nav.refresh(); }));
  body.appendChild(filt);

  const list = all.filter(m => !filterTag || m.e.project === filterTag);
  if (!list.length) { body.appendChild(el(`<div class="empty">${icon("clock")}Событий нет</div>`)); return s; }
  const now = new Date();
  let lastB = null, lastDay = null, html = "";
  for (const m of list) {
    const b = bucket(m.at, now);
    if (b !== lastB) { html += `<h2 class="tl-head">${b}</h2>`; lastB = b; lastDay = null; }
    const dk = new Date(m.at).toDateString();
    if (b !== "Сегодня" && b !== "Вчера" && dk !== lastDay) {
      const lab = dayLabel(m.at); html += `<div class="tl-day"><b>${lab.split(" ")[0]}</b> ${lab.split(" ").slice(1).join(" ")}</div>`; lastDay = dk;
    }
    html += rowHtml(m);
  }
  const box = el(`<div>${html}</div>`);
  box.querySelectorAll(".tl-row").forEach(r => r.addEventListener("click", () => nav.push({ s: "entry", id: r.dataset.id })));
  body.appendChild(box);
  return s;
}

// Entry (docs/screens.md §2.4): whole text, pictures, history, verify / not fixed.
import { state, project, blobUrl, addEvent } from "../store.js";
import { typeTitle, STATUS_TITLE, urgencyTitle } from "../contract.js";
import { el, esc, when, statusDot, viewImage, projIcon, autogrow, toast, dateLong, stamp, headTags } from "../ui.js";
import { icon } from "../icons.js";
import { nav, shell } from "../nav.js";
import { FLAVOR } from "../flavor.js";
import { view, verifyEntry, reopenEntry, entryMenu, pickDate, pickTag, statusMenu, pickLink } from "../actions.js";

const SRC = { siri: "голосом через Сири", text: "текстом", share: "через «Поделиться»", agent: "агентом" };
const REL = { related: "Связано с", duplicate_of: "Дубль записи", fixed_by: "Исправлено в", blocks: "Мешает" };

function who(by) {
  if (!by) return "";
  if (by.startsWith("agent:")) return "агент " + (project(by.slice(6))?.title || by.slice(6));
  if (by === FLAVOR.by) return "вы, iPhone";
  if (by === FLAVOR.byMac) return "вы, Mac";
  return by;
}

function histRow(ev) {
  let t = "", sub = "", glyph = null, dot = null;
  switch (ev.kind) {
    case "status":
      t = STATUS_TITLE[ev.status] || ev.status; dot = { status: ev.status };
      if (ev.status === "done_beta") sub = [ev.commit && `<span class="mono">${esc(ev.commit.slice(0, 7))}</span>`, ev.channel && "канал " + esc(ev.channel)].filter(Boolean).join(" · ");
      break;
    case "question": t = "Вопрос агента"; sub = esc(ev.text); glyph = "bubble"; break;
    case "answer": t = "Ваш ответ"; sub = esc(ev.text); glyph = "arrow.uturn.backward"; break;
    case "tag": t = ev.add ? "Тег #" + esc(ev.add) : "Тег убран: #" + esc(ev.remove); glyph = "number"; break;
    case "link": {
      const to = state.entries.get(ev.to);
      t = REL[ev.rel] || "Связь"; sub = to ? "«" + esc(to.text.slice(0, 60)) + "»" : esc(ev.to); glyph = "link"; break;
    }
    case "dates": t = [("due" in ev) && (ev.due ? "Срок: " + dateLong(ev.due) : "Срок убран"), ("start" in ev) && ev.start && "Начать: " + dateLong(ev.start)].filter(Boolean).join(" · "); glyph = "calendar"; break;
    case "classify": t = [("project" in ev) && ("Проект: " + esc(project(ev.project)?.title || "Входящие")), ("type" in ev) && ("Тип: " + (typeTitle(ev.type) || "без типа")), ("urgency" in ev) && ("Срочность: " + (urgencyTitle(ev.urgency) || "не задана"))].filter(Boolean).join(" · "); glyph = "folder"; break;
    case "comment": t = "Заметка агента"; sub = esc(ev.text); glyph = "bubble"; break;
    case "text": t = "Текст изменён"; sub = esc(ev.text.length > 120 ? ev.text.slice(0, 120) + "…" : ev.text); glyph = "pencil"; break;
    default: t = ev.kind;
  }
  const mark = dot ? statusDot(dot) : `<span class="glyph">${icon(glyph || "clock")}</span>`;
  return `<div class="h-row"><div class="h-dot">${mark}</div><div><div class="h-t">${t}</div>${sub ? `<div class="h-q">${sub}</div>` : ""}<div class="h-s">${esc(who(ev.by))} · ${when(ev.at)}</div></div></div>`;
}

export function entry(route) {
  const raw = state.entries.get(route.id);
  if (!raw) { const { s, body } = shell({ back: true }); body.appendChild(el('<div class="empty">Записи нет</div>')); return s; }
  const e = view(raw);
  const p = project(e.project);
  const right = `<button class="glass-btn" data-more aria-label="Ещё">${icon("ellipsis")}</button>`;
  const { s, body } = shell({ back: true, right });
  s.querySelector(".mini-title").textContent = p ? p.title : "Входящие";
  s.querySelector("[data-more]").addEventListener("click", ev => entryMenu(ev.currentTarget, e));

  const head = el(`<div class="entry-head">
    <button class="chip" data-proj style="padding:4px 10px 4px 4px;gap:6px">${projIcon(e.project, "sm")}<span>${esc(p ? p.title : "Входящие")}</span></button>
    <button class="chip st-${e.status}" data-st>${STATUS_TITLE[e.status]}${icon("chevron.down")}</button>
    ${e.type === "idea" ? `<button class="chip urg ${e.urgency}" data-urg>${urgencyTitle(e.urgency)}</button>` : ""}
  </div>`);
  head.querySelector("[data-urg]")?.addEventListener("click", () => {
    const next = e.urgency === "urgent" ? "deferred" : "urgent";
    addEvent({ entry: e.id, kind: "classify", urgency: next }).then(() => toast(next === "urgent" ? "Срочная: агент спросит" : "Отложенная: только в план"));
  });
  head.querySelector("[data-st]").addEventListener("click", ev => statusMenu(ev.currentTarget, e));
  head.querySelector("[data-proj]").addEventListener("click", () => p ? nav.push({ s: "feed", tag: p.tag }) : nav.tab("inbox"));
  body.appendChild(head);
  const headT = headTags(e.type, [...e.tags]);
  body.appendChild(el(`<div class="p-head entry-stamp"><span class="p-date">${stamp(e.created)}</span>${headT.length ? `<span class="p-tags ${e.type ? "t-" + e.type : ""}">${headT.map(t => "#" + esc(t)).join(" ")}</span>` : ""}</div>`));
  // The text is the field itself: tap and type, like a notepad (Alexey, 17.11). Saved when the
  // field loses focus or the app goes to the background — one event per edit, not per keystroke.
  const ta = el(`<textarea class="entry-text entry-edit" rows="1" enterkeyhint="enter" aria-label="Текст записи"></textarea>`);
  ta.value = e.text;
  autogrow(ta, 100000);
  const save = async () => {
    const t = ta.value.trim();
    if (!t || t === e.text) { if (!t) ta.value = e.text; return; }
    e.text = t;
    await addEvent({ entry: e.id, kind: "text", text: t });
    toast("Изменение сохранено");
  };
  ta.addEventListener("blur", save);
  document.addEventListener("visibilitychange", () => { if (document.hidden && document.activeElement === ta) save(); });
  body.appendChild(ta);
  requestAnimationFrame(() => ta.dispatchEvent(new Event("input")));   // autogrow once it has a width
  body.appendChild(el(`<div class="subline" style="padding-top:6px">${SRC[e.source] || "текстом"}</div>`));

  if (e.attachments?.length) {
    const im = el('<div class="entry-imgs"></div>');
    for (const a of e.attachments) {
      const i = document.createElement("img"); i.src = blobUrl(a); i.alt = "";
      i.addEventListener("click", () => viewImage(i.src));
      im.appendChild(i);
    }
    body.appendChild(im);
  }

  if (e.status === "done_beta") {
    const a = el(`<div class="actions2"><button class="ok">${icon("checkmark")}Проверено</button><button class="no">${icon("arrow.uturn.backward")}Не исправлено</button></div>`);
    a.querySelector(".ok").addEventListener("click", () => verifyEntry(e));
    a.querySelector(".no").addEventListener("click", () => reopenEntry(e));
    body.appendChild(a);
    body.appendChild(el(`<div class="foot">Агент сделал это в бете${e.commit ? ` (<span class="mono">${esc(e.commit.slice(0, 7))}</span>)` : ""}. Проверьте на телефоне.</div>`));
  }

  if (e.openQuestion) {
    const q = e.openQuestion;
    const box = el(`<div style="padding:12px var(--pad) 0"><div class="ask"><div class="a-q">${icon("bubble")}<span>${esc(q.text)}</span></div>
      <div class="a-by">${esc(who(q.by))} · ${when(q.at)}</div>
      <form><textarea rows="1" placeholder="Ответ"></textarea><button class="send" disabled>${icon("arrow.up")}</button></form></div></div>`);
    const ta = box.querySelector("textarea"), send = box.querySelector(".send");
    autogrow(ta); ta.addEventListener("input", () => { send.disabled = !ta.value.trim(); });
    box.querySelector("form").addEventListener("submit", async ev => {
      ev.preventDefault();
      if (!ta.value.trim()) return;
      await addEvent({ entry: e.id, kind: "answer", question: q.id, text: ta.value.trim() });
      toast("Ответ сохранён");
    });
    body.appendChild(box);
  }

  // «Подробно»
  body.appendChild(el('<div class="sec-cap">ПОДРОБНО</div>'));
  const g = el('<div class="group"></div>');
  const due = el(`<button class="row"><span class="r-ic" style="--c:var(--red)">${icon("calendar")}</span><span class="r-main">Срок</span><span class="val">${e.due ? dateLong(e.due) : "нет"}</span>${icon("chevron.right", "chev")}</button>`);
  due.addEventListener("click", () => pickDate(e.due, d => addEvent({ entry: e.id, kind: "dates", due: d })));
  g.appendChild(due);
  if (e.start) g.appendChild(el(`<div class="row"><span class="r-ic" style="--c:var(--green)">${icon("calendar")}</span><span class="r-main">Начать</span><span class="val">${dateLong(e.start)}</span></div>`));
  const tags = el(`<button class="row"><span class="r-ic" style="--c:var(--gray)">${icon("number")}</span><span class="r-main">Теги</span><span class="val">${[...e.tags].map(t => "#" + esc(t)).join(" ") || "нет"}</span>${icon("plus", "chev")}</button>`);
  tags.addEventListener("click", () => pickTag(t => addEvent({ entry: e.id, kind: "tag", add: t })));
  g.appendChild(tags);
  for (const l of e.links) {
    const to = state.entries.get(l.to);
    const r = el(`<button class="row"><span class="r-ic" style="--c:var(--indigo)">${icon("link")}</span><span class="r-main"><span class="r-s">${REL[l.rel] || "Связь"}</span><span class="r-t" style="display:block;white-space:nowrap">${esc(to ? to.text : l.to)}</span></span>${to ? icon("chevron.right", "chev") : ""}</button>`);
    if (to) r.addEventListener("click", () => nav.push({ s: "entry", id: to.id }));
    g.appendChild(r);
  }
  // reverse links: entries pointing at this one
  for (const other of state.entries.values()) {
    for (const l of other.links) if (l.to === e.id) {
      const r = el(`<button class="row"><span class="r-ic" style="--c:var(--indigo)">${icon("link")}</span><span class="r-main"><span class="r-s">${l.rel === "duplicate_of" ? "Её дубль" : "Ссылается сюда"}</span><span class="r-t" style="display:block;white-space:nowrap">${esc(other.text)}</span></span>${icon("chevron.right", "chev")}</button>`);
      r.addEventListener("click", () => nav.push({ s: "entry", id: other.id }));
      g.appendChild(r);
    }
  }
  const add = el(`<button class="row"><span class="r-ic" style="--c:var(--indigo)">${icon("link")}</span><span class="r-main" style="color:var(--accent)">Связать с…</span>${icon("plus", "chev")}</button>`);
  add.addEventListener("click", () => pickLink(e));
  g.appendChild(add);
  body.appendChild(g);

  // History: who and when
  body.appendChild(el('<div class="sec-cap">ИСТОРИЯ</div>'));
  const rows = [`<div class="h-row"><div class="h-dot">${statusDot({ status: "open" })}</div><div><div class="h-t">Записано ${SRC[e.source] || "текстом"}</div><div class="h-s">${esc(who(e.device === "mac" ? FLAVOR.byMac : FLAVOR.by))} · ${when(e.created)}</div></div></div>`]
    .concat(e.history.map(histRow));
  body.appendChild(el(`<div class="hist">${rows.join("")}</div>`));
  body.appendChild(el(`<div class="foot mono" style="opacity:.6">${esc(e.id)}</div>`));
  return s;
}

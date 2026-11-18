// Capture sheet «+» (docs/screens.md §2.3), after «Новое напоминание» (refs/11, refs/12).
import { createEntry, addEvent, project, allEntries, done, state, actualProjects } from "../store.js";
import { TYPES } from "../contract.js";
import { el, esc, openSheet, toJpeg, projIcon, toast, stamp, headTags } from "../ui.js";
import { icon } from "../icons.js";
import { pickProject } from "../actions.js";

let kbBound = false;
function bindKeyboard() {
  if (kbBound || !window.visualViewport) return;
  kbBound = true;
  const vv = window.visualViewport;
  // iOS 26 home-screen app shrinks innerHeight with the keyboard but keeps 100% at the old height:
  // the sheet stayed 740 pt tall in a 471 pt visible area and its text field went off the top
  // (Alexey, 17.11: «Поля ввода уезжают наверх»). The sheet takes its height from the visible area.
  const root = document.documentElement;
  const f = () => {
    const kb = Math.max(0, innerHeight - vv.height - vv.offsetTop);
    root.style.setProperty("--kb", kb + "px");
    root.style.setProperty("--vvh", Math.round(vv.height) + "px");
    root.classList.toggle("kb-open", vv.height < screen.height * 0.75);
  };
  vv.addEventListener("resize", f); vv.addEventListener("scroll", f); f();
}

// Alexey, 16.11: project → type button («Идея») → write at once; date and tags become the header.
export function capture({ project: tag = null, type = null } = {}) {
  bindKeyboard();
  const opened = new Date();
  const st = { tag, type, urgency: "deferred", due: null, start: null, tags: [], link: null, files: [], panel: null };
  const box = el(`<div class="cap">
    <div class="grab"></div>
    <div class="sheet-head">
      <button class="glass-btn" data-x aria-label="Закрыть">${icon("xmark")}</button>
      <h2 data-title></h2>
      <button class="glass-btn accent" data-ok disabled aria-label="Сохранить">${icon("checkmark")}</button>
    </div>
    <div class="cap-scroll">
      <div class="cap-field">
        <div class="p-head cap-head"><span class="p-date"></span><span class="p-tags"></span></div>
        <textarea placeholder="Что заметили?" enterkeyhint="enter"></textarea>
        <div class="cap-thumbs"></div>
        <div class="cap-chips"></div>
      </div>
      <div class="cap-pick" hidden><div class="cap-pick-t">Куда записать</div><div class="i-proj"></div></div>
      <div class="cap-meta group" style="margin-top:12px">
        <button class="row" data-proj></button>
      </div>
      <div class="group" style="margin-top:12px">
        <button class="row" data-more><span class="r-ic" style="--c:var(--gray)">${icon("ellipsis")}</span><span class="r-main"><span class="r-t">Подробно</span><span class="r-s">начать, связано с…</span></span>${icon("chevron.down", "chev")}</button>
        <div data-more-body hidden></div>
      </div>
      <div class="panel"></div>
    </div>
    <div class="accessory glass">
      <label aria-label="Картинка" style="display:grid;place-items:center;height:52px">${icon("camera")}<input type="file" accept="image/*" class="sr" multiple></label>
      <button data-p="type" aria-label="Тип">${icon("lightbulb")}</button>
      <button data-p="due" aria-label="Срок">${icon("calendar")}</button>
      <button data-p="tag" aria-label="Тег">${icon("number")}</button>
    </div>
  </div>`);
  const ta = box.querySelector("textarea"), ok = box.querySelector("[data-ok]");
  const thumbs = box.querySelector(".cap-thumbs"), chips = box.querySelector(".cap-chips");
  const panel = box.querySelector(".panel");

  // From the home «+» there is no project yet: the same project buttons as in «Входящие» —
  // pick now, or leave it and sort it there later (Alexey, 17.11).
  const pickRow = box.querySelector(".cap-pick");
  if (!tag) {
    const act = actualProjects();
    const order = [...act, ...state.projects.filter(p => !act.includes(p))];
    pickRow.hidden = false;
    const row = pickRow.querySelector(".i-proj");
    row.innerHTML = `<button data-tag=""><span class="pico lg" style="--c:var(--gray)">${icon("tray")}</span><span class="t">Входящие</span></button>` +
      order.map(p => `<button data-tag="${p.tag}"><span class="pico lg" style="--c:var(--${p.color || "gray"})">${icon(p.icon || "list.bullet")}</span><span class="t">${esc(p.title)}</span></button>`).join("");
    row.querySelectorAll("button").forEach(b => {
      b.addEventListener("pointerdown", e => e.preventDefault());   // keep the keyboard
      b.addEventListener("mousedown", e => e.preventDefault());     // iOS moves focus on the mouse event
      b.addEventListener("click", () => { st.tag = b.dataset.tag || null; paintProject(); });
    });
  }
  function paintProject() {
    pickRow.querySelectorAll("button").forEach(b => b.classList.toggle("on", (b.dataset.tag || null) === (st.tag || null)));
    const p = project(st.tag);
    box.querySelector("[data-proj]").innerHTML = `${st.tag ? projIcon(st.tag) : `<span class="pico" style="--c:var(--gray)">${icon("tray")}</span>`}
      <span class="r-main"><span class="r-t">${esc(p ? p.title : "Входящие")}</span><span class="r-s">${p ? "проект" : "без проекта — разберёте во «Входящих»"}</span></span>${icon("chevron.right", "chev")}`;
  }
  function paintChips() {
    const t = TYPES.find(x => x.id === st.type);
    box.querySelector("[data-title]").textContent = t ? t.t : "Новая запись";
    box.querySelector(".cap-head .p-date").textContent = stamp(opened);
    box.querySelector(".cap-head .p-tags").className = "p-tags" + (st.type ? " t-" + st.type : "");
    box.querySelector(".cap-head .p-tags").textContent = headTags(st.type, st.tags).map(x => "#" + x).join(" ");
    chips.innerHTML = (st.type === "idea" ? `<button class="chip urg ${st.urgency}" data-urg>${icon("lightbulb")} ${st.urgency === "urgent" ? "Срочная — обсудим" : "Отложенная — только в план"}</button>` : "") + (st.due ? `<span class="chip due">${icon("calendar")} ${st.due.split("-").reverse().join(".")}</span>` : "") +
      "";
    const ub = chips.querySelector("[data-urg]");
    if (ub) {
      ub.addEventListener("pointerdown", e => e.preventDefault());
      ub.addEventListener("click", () => { st.urgency = st.urgency === "urgent" ? "deferred" : "urgent"; paintChips(); });
    }
    box.querySelectorAll(".accessory [data-p]").forEach(b => b.classList.toggle("on",
      (b.dataset.p === "type" && !!st.type) || (b.dataset.p === "due" && !!st.due) || (b.dataset.p === "tag" && st.tags.length > 0)));
  }
  const valid = () => { ok.disabled = !ta.value.trim() && !st.files.length; };

  function showPanel(kind) {
    st.panel = st.panel === kind ? null : kind;
    panel.innerHTML = "";
    if (!st.panel) return;
    if (kind === "type") {
      const row = el(`<div class="inline-pick">${TYPES.map(t => `<button data-t="${t.id}" class="${st.type === t.id ? "on" : ""}">${t.t}</button>`).join("")}</div>`);
      row.querySelectorAll("button").forEach(b => {
        b.addEventListener("pointerdown", e => e.preventDefault());
        b.addEventListener("click", () => { st.type = st.type === b.dataset.t ? null : b.dataset.t; paintChips(); showPanel(null); });
      });
      panel.appendChild(row);
    } else if (kind === "due") {
      const iso = d => d.toISOString().slice(0, 10);
      const row = el(`<div class="inline-pick">
        <button data-d="${iso(new Date())}">Сегодня</button><button data-d="${iso(new Date(Date.now() + 864e5))}">Завтра</button>
        <input type="date" value="${st.due || ""}">${st.due ? '<button data-d="">Убрать</button>' : ""}</div>`);
      row.querySelectorAll("button").forEach(b => {
        b.addEventListener("pointerdown", e => e.preventDefault());
        b.addEventListener("click", () => { st.due = b.dataset.d || null; paintChips(); showPanel(null); });
      });
      row.querySelector("input").addEventListener("change", e => { st.due = e.target.value || null; paintChips(); showPanel(null); });
      panel.appendChild(row);
    } else if (kind === "tag") {
      const row = el(`<div class="inline-pick"><input type="text" placeholder="Тег и «Готово»" enterkeyhint="done" style="flex:1"></div>`);
      const inp = row.querySelector("input");
      inp.addEventListener("keydown", e => {
        if (e.key === "Enter") {
          e.preventDefault();
          const v = inp.value.trim().toLowerCase();
          if (v && !st.tags.includes(v)) st.tags.push(v);
          paintChips(); showPanel(null); ta.focus();
        }
      });
      panel.appendChild(row);
      inp.focus();
    }
  }

  const sh = openSheet(box, { tall: true, cls: "cap-sheet" });
  ta.focus();   // inside the tap that opened the sheet, so iOS shows the keyboard
  paintProject(); paintChips();

  ta.addEventListener("input", valid);
  box.querySelector("[data-x]").addEventListener("click", () => {
    if ((ta.value.trim() || st.files.length) && !confirm("Выбросить запись?")) return;
    sh.close();
  });
  box.querySelector("[data-proj]").addEventListener("click", () => pickProject(st.tag, t => { st.tag = t; paintProject(); }));
  box.querySelectorAll(".accessory [data-p]").forEach(b => {
    b.addEventListener("pointerdown", e => e.preventDefault());   // keep the keyboard
    b.addEventListener("click", () => showPanel(b.dataset.p));
  });
  box.querySelector(".accessory input[type=file]").addEventListener("change", async e => {
    for (const f of e.target.files) {
      const j = await toJpeg(f);
      st.files.push(j);
      const th = el(`<div class="th"><img alt=""><button class="x" aria-label="Убрать">${icon("xmark")}</button></div>`);
      th.querySelector("img").src = URL.createObjectURL(j);
      th.querySelector(".x").addEventListener("click", () => { st.files.splice(st.files.indexOf(j), 1); th.remove(); valid(); });
      thumbs.appendChild(th);
    }
    e.target.value = ""; valid();
  });

  // «Подробно»: start date and a link, folded away so the sheet stays short
  const moreBody = box.querySelector("[data-more-body]");
  box.querySelector("[data-more]").addEventListener("click", () => {
    moreBody.hidden = !moreBody.hidden;
    if (!moreBody.hidden && !moreBody.childElementCount) {
      const recent = allEntries().filter(x => !x.closed).slice(-12).reverse();
      moreBody.appendChild(el(`<div><label class="row"><span class="r-ic" style="--c:var(--green)">${icon("calendar")}</span><span class="r-main">Начать</span><input type="date" data-start style="border:0;background:var(--fill-2);border-radius:10px;padding:6px 10px"></label>
        <label class="row"><span class="r-ic" style="--c:var(--indigo)">${icon("link")}</span><span class="r-main">Связано с</span>
        <select data-link style="max-width:55%;border:0;background:var(--fill-2);border-radius:10px;padding:6px 8px;font:inherit;color:inherit"><option value="">—</option>${recent.map(x => `<option value="${x.id}">${esc(x.text.slice(0, 40))}</option>`).join("")}</select></label></div>`));
      moreBody.querySelector("[data-start]").addEventListener("change", e => { st.start = e.target.value || null; });
      moreBody.querySelector("[data-link]").addEventListener("change", e => { st.link = e.target.value || null; });
    }
  });

  ok.addEventListener("click", async () => {
    const text = ta.value.trim();
    if (!text && !st.files.length) return;
    ok.disabled = true;
    const id = await createEntry({ text, project: st.tag, type: st.type, urgency: st.urgency, images: st.files }, { silent: true });
    for (const t of st.tags) await addEvent({ entry: id, kind: "tag", add: t }, { silent: true });
    if (st.due || st.start) await addEvent({ entry: id, kind: "dates", ...(st.start ? { start: st.start } : {}), ...(st.due ? { due: st.due } : {}) }, { silent: true });
    if (st.link) await addEvent({ entry: id, kind: "link", to: st.link, rel: "related" }, { silent: true });
    done();
    sh.close();
    toast(st.tag ? "Записано в «" + project(st.tag).title + "»" : "Записано во Входящие");
  });
}

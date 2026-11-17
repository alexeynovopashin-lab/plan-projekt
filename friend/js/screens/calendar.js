import { allEntries, dayKey, project } from "../store.js";
import { el, esc, MON_NOM, dateLong } from "../ui.js";
import { icon } from "../icons.js";
import { nav, shell, searchBtn, wire } from "../nav.js";
import { view } from "../actions.js";
import { renderParas } from "./feed.js";

const WD = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
let calMonth = null, calSel = null, yearShown = null;

function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

function index() {
  const m = new Map();
  const get = k => m.get(k) || (m.set(k, { created: [], due: [] }), m.get(k));
  for (const e of allEntries().map(view)) {
    if (e.status === "dropped") continue;
    get(dayKey(e.created)).created.push(e);
    if (e.due && !e.closed) get(e.due).due.push(e);
  }
  return m;
}

export function calendar() {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (!calMonth) { calMonth = new Date(now.getFullYear(), now.getMonth(), 1); calSel = now; }
  const right = `<button class="glass-btn" data-today aria-label="Сегодня" style="width:auto;padding:0 14px;border-radius:22px;font-weight:600;font-size:15px">Сегодня</button>${searchBtn()}`;
  const { s, body } = shell({ title: "", right });
  wire(s);
  const idx = index();

  const layer = el(`<div id="calMonthLayer"></div>`);
  const list = el(`<div></div>`);
  body.append(layer, list);

  function renderMonth() {
    s.querySelector(".mini-title").textContent = MON_NOM[calMonth.getMonth()] + " " + calMonth.getFullYear();
    layer.innerHTML = `
      <div class="cal-month-t"><span class="m">${MON_NOM[calMonth.getMonth()]}</span><button class="yb" data-year>${icon("chevron.left")}${calMonth.getFullYear()}</button></div>
      <div class="cal-wd">${WD.map(w => `<span>${w}</span>`).join("")}</div>
      <div class="cal-grid"></div>`;
    const grid = layer.querySelector(".cal-grid");
    const first = new Date(calMonth.getFullYear(), calMonth.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7;                 
    const days = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0).getDate();
    const cell = (d, out) => {
      const k = dayKey(d), info = idx.get(k);
      const colors = info ? [...new Set(info.created.map(e => project(e.project)?.color || "gray"))].slice(0, 3) : [];
      const b = el(`<button class="${out ? "out" : ""} ${sameDay(d, now) ? "today" : ""} ${sameDay(d, calSel) ? "sel" : ""}">
        <span class="n">${d.getDate()}</span>
        <span class="dots">${colors.map(c => `<i class="c" style="--c:var(--${c})"></i>`).join("")}${info && info.due.length ? '<i class="due"></i>' : ""}</span></button>`);
      b.addEventListener("click", () => {
        calSel = d;
        if (out) calMonth = new Date(d.getFullYear(), d.getMonth(), 1);   
        renderMonth(); renderList();
      });
      return b;
    };
    for (let i = offset; i > 0; i--) grid.appendChild(cell(new Date(calMonth.getFullYear(), calMonth.getMonth(), 1 - i), true));
    for (let n = 1; n <= days; n++) grid.appendChild(cell(new Date(calMonth.getFullYear(), calMonth.getMonth(), n), false));
    const tail = (7 - ((offset + days) % 7)) % 7;
    for (let k = 1; k <= tail; k++) grid.appendChild(cell(new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, k), true));
    layer.querySelector("[data-year]").addEventListener("click", openYear);
  }

  function renderList() {
    list.innerHTML = "";
    const info = idx.get(dayKey(calSel)) || { created: [], due: [] };
    const label = sameDay(calSel, now) ? "Сегодня" : dateLong(calSel);
    list.appendChild(el(`<div class="cal-list-title">${esc(label)}</div>`));
    if (info.due.length) {
      list.appendChild(el('<div class="sec-cap" style="padding-top:0">СРОК</div>'));
      const box = el('<div class="feed"></div>'); list.appendChild(box);
      renderParas(box, info.due, { showProject: true });
    }
    if (info.created.length) {
      if (info.due.length) list.appendChild(el('<div class="sec-cap">ЗАПИСАНО</div>'));
      const box = el('<div class="feed"></div>'); list.appendChild(box);
      renderParas(box, info.created, { showProject: true });
    }
    if (!info.due.length && !info.created.length) list.appendChild(el('<div class="empty" style="padding-top:24px">В этот день записей и сроков нет</div>'));
  }

  function step(dir) {
    calMonth = new Date(calMonth.getFullYear(), calMonth.getMonth() + dir, 1);
    renderMonth();
  }
  (function () {
    let x0 = null, y0 = null;
    layer.addEventListener("touchstart", e => { if (e.touches.length !== 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    layer.addEventListener("touchend", e => {
      if (x0 === null) return;
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return;
      step(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  s.querySelector("[data-today]").addEventListener("click", () => {
    calMonth = new Date(now.getFullYear(), now.getMonth(), 1); calSel = now;
    yo.classList.remove("open"); renderMonth(); renderList();
  });

  const yo = el(`<div class="year12">
    <div class="topbar"><div class="spacer"></div><button class="glass-btn" data-today2 style="width:auto;padding:0 14px;border-radius:22px;font-weight:600;font-size:15px">Сегодня</button></div>
    <div class="year12-nav"><button data-prev aria-label="Прошлый год">${icon("chevron.left")}</button><span class="y"></span><button data-next aria-label="Следующий год">${icon("chevron.right")}</button></div>
    <div class="year12-grid"></div></div>`);
  s.appendChild(yo);

  function buildMiniMonth12(y, m) {
    const first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, daysN = new Date(y, m + 1, 0).getDate();
    const isNow = y === now.getFullYear() && m === now.getMonth();
    const btn = el(`<button type="button" class="year12-month ${isNow ? "now" : ""}"><div class="year12-name">${MON_NOM[m]}</div><div class="year12-days"></div></button>`);
    const g = btn.querySelector(".year12-days");
    for (let k = 0; k < offset; k++) g.appendChild(document.createElement("span"));
    for (let d = 1; d <= daysN; d++) {
      const c = document.createElement("span"); c.textContent = d;
      if (isNow && d === now.getDate()) c.classList.add("today");
      const info = idx.get(dayKey(new Date(y, m, d)));
      const n = info ? info.created.length + info.due.length : 0;
      if (n === 1) c.classList.add("busy"); else if (n > 1) c.classList.add("busy", "many");
      g.appendChild(c);
    }
    btn.addEventListener("click", e => zoomYear12ToMonth(y, m, e.target !== btn && e.target.parentNode === g ? e.target : null, btn));
    return btn;
  }
  function renderYear12() {
    const y = yo.querySelector(".y");
    y.textContent = yearShown; y.classList.toggle("now", yearShown === now.getFullYear());
    const grid = yo.querySelector(".year12-grid"); grid.innerHTML = "";
    for (let m = 0; m < 12; m++) grid.appendChild(buildMiniMonth12(yearShown, m));
  }
  function openYear() { yearShown = calMonth.getFullYear(); renderYear12(); yo.classList.add("open"); yo.scrollTop = 0; }
  const stepYear = dir => { yearShown += dir; renderYear12(); };
  yo.querySelector("[data-today2]").addEventListener("click", () => { yearShown = now.getFullYear(); renderYear12(); });
  yo.querySelector("[data-prev]").addEventListener("click", () => stepYear(-1));
  yo.querySelector("[data-next]").addEventListener("click", () => stepYear(1));
  (function () {
    let x0 = null, y0 = null;
    yo.addEventListener("touchstart", e => { if (e.touches.length !== 1) { x0 = null; return; } x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    yo.addEventListener("touchend", e => {
      if (x0 === null) return;
      const t = e.changedTouches[0], dx = t.clientX - x0, dy = t.clientY - y0; x0 = null;
      if (Math.abs(dx) < 60 || Math.abs(dy) > 40) return;
      stepYear(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  
  function zoomYear12ToMonth(yy, mm, originEl, tileEl) {
    const srcGrid = tileEl.querySelector(".year12-days");
    const day = originEl ? +originEl.textContent : 0;
    calMonth = new Date(yy, mm, 1);
    if (day) calSel = new Date(yy, mm, day);
    renderMonth(); renderList();
    const sc = s.querySelector(".scroller"); sc.scrollTop = 0;
    requestAnimationFrame(() => {
      const target = layer;
      const dstGrid = layer.querySelector(".cal-grid");
      let dstEl = null;
      if (day) dstGrid.querySelectorAll("button:not(.out) .n").forEach(b => { if (+b.textContent === day) dstEl = b; });
      const from = (day ? originEl : srcGrid).getBoundingClientRect();
      const to = (dstEl || dstGrid).getBoundingClientRect();
      const sg = srcGrid.getBoundingClientRect(), dg = dstGrid.getBoundingClientRect();
      const k = dg.width / Math.max(1, sg.width);
      const o = yo.getBoundingClientRect(), q = target.getBoundingClientRect();
      const fx = from.left + from.width / 2, fy = from.top + from.height / 2;
      const gx = to.left + to.width / 2, gy = to.top + to.height / 2;
      const tx = gx - o.left - k * (fx - o.left), ty = gy - o.top - k * (fy - o.top);
      const ux = o.left - q.left + (q.left - o.left - tx) / k, uy = o.top - q.top + (q.top - o.top - ty) / k;
      const DUR = 460, EASE = "cubic-bezier(0.3,0.7,0.1,1)";
      [yo, target].forEach(n => { n.style.transition = "none"; n.style.transformOrigin = "0 0"; });
      yo.style.transform = "translate(0px, 0px) scale(1)";
      target.style.transform = `translate(${ux}px, ${uy}px) scale(${1 / k})`;
      target.style.opacity = "0";
      target.classList.add("cal-zoom-in");
      yo.classList.add("zoom-out");
      void yo.offsetWidth; void target.offsetWidth;           
      yo.style.transition = `transform ${DUR}ms ${EASE}`;
      target.style.transition = `transform ${DUR}ms ${EASE}, opacity 160ms linear`;
      yo.style.transform = `translate(${tx}px, ${ty}px) scale(${k})`;
      target.style.transform = "translate(0px, 0px) scale(1)";
      target.style.opacity = "1";
      yo.classList.add("fading");
      setTimeout(() => {
        [yo, target].forEach(n => { n.style.transition = "none"; n.style.transform = ""; n.style.transformOrigin = ""; n.style.opacity = ""; });
        yo.classList.remove("open", "zoom-out", "fading");
        target.classList.remove("cal-zoom-in");
        requestAnimationFrame(() => { yo.style.transition = ""; target.style.transition = ""; });
      }, DUR + 20);
    });
  }

  renderMonth(); renderList();
  return s;
}

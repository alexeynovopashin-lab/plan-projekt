// Projects, the main screen (docs/screens.md §2.1), after Reminders home (refs/15).
import { state, counts, actualProjects, openCount, allEntries } from "../store.js";
import { el, esc } from "../ui.js";
import { icon } from "../icons.js";
import { nav, shell, wire } from "../nav.js";
import { view } from "../actions.js";

export function home() {
  const right = `<div class="glass-group glass"><button data-act="settings" aria-label="Настройки">${icon("gearshape")}</button><button data-act="search" aria-label="Поиск">${icon("magnifyingglass")}</button></div>`;
  const { s, body } = shell({ title: "", right });
  s.querySelector(".mini-title").textContent = "Проекты";
  wire(s);

  const all = allEntries().map(view);
  const c = counts();
  c.waits = all.filter(e => e.waits && e.status !== "dropped").length;
  c.open = all.filter(e => !e.closed).length;
  const day = new Date().getDate();
  const tiles = el(`<div class="tiles">
    <button class="tile" style="--c:var(--orange)" data-k="waits"><span class="t-ic">${icon("flag")}</span><span class="t-n">${c.waits}</span><span class="t-l">Ждут вас</span></button>
    <button class="tile" style="--c:var(--gray)" data-k="inbox"><span class="t-ic">${icon("tray")}</span><span class="t-n">${c.inbox}</span><span class="t-l">Входящие</span></button>
    <button class="tile" style="--c:var(--blue)" data-k="today"><span class="t-ic" style="font-size:13px;font-weight:700">${day}</span><span class="t-n">${c.today}</span><span class="t-l">Сегодня</span></button>
    <button class="tile" style="--c:var(--indigo)" data-k="open"><span class="t-ic">${icon("list.bullet")}</span><span class="t-n">${c.open}</span><span class="t-l">Открытые</span></button>
  </div>`);
  tiles.querySelectorAll(".tile").forEach(t => t.addEventListener("click", () => {
    if (t.dataset.k === "inbox") nav.tab("inbox");
    else nav.push({ s: "smart", kind: t.dataset.k });
  }));
  body.appendChild(tiles);

  const actual = actualProjects();
  if (actual.length) {
    body.appendChild(el('<h2 class="sec-title">Актуальные</h2>'));
    const grid = el('<div class="pgrid"></div>');
    for (const p of actual) {
      const n = openCount(p.tag);
      const b = el(`<button class="papp"><span class="pico xl" style="--c:var(--${p.color || "gray"})">${icon(p.icon || "list.bullet")}${n ? `<span class="p-n">${n}</span>` : ""}</span><span class="p-t">${esc(p.title)}</span></button>`);
      b.addEventListener("click", () => nav.push({ s: "feed", tag: p.tag }));
      grid.appendChild(b);
    }
    body.appendChild(grid);
  }

  body.appendChild(el('<h2 class="sec-title">Все проекты</h2>'));
  const g = el('<div class="group"></div>');
  const sorted = state.projects.slice().sort((a, b) => a.title.localeCompare(b.title, "ru"));
  for (const p of sorted) {
    const n = openCount(p.tag);
    const r = el(`<button class="row"><span class="pico" style="--c:var(--${p.color || "gray"})">${icon(p.icon || "list.bullet")}</span><span class="r-main"><span class="r-t">${esc(p.title)}</span></span><span class="r-n">${n}</span>${icon("chevron.right", "chev")}</button>`);
    r.addEventListener("click", () => nav.push({ s: "feed", tag: p.tag }));
    g.appendChild(r);
  }
  if (!sorted.length) g.appendChild(el('<div class="row"><span class="r-main r-s">Проектов нет. Настройки → «Заполнить примерами».</span></div>'));
  body.appendChild(g);
  return s;
}

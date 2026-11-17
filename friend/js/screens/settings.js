import { state, project, addEvent, openCount, allFiles } from "../store.js";
import { zip } from "../zip.js";
import { el, esc, toast, plural, when } from "../ui.js";
import { config, saveConfig, forgetKey, armed, lastRun, pendingFiles, syncNow, busy, onSync, DEFAULT_REPO } from "../sync.js";
import { icon, PROJECT_ICONS, COLORS } from "../icons.js";
import { nav, shell } from "../nav.js";
import { FLAVOR, key } from "../flavor.js";
import { openSetup } from "./setup.js";

function ls(k, v) {
  try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch { return null; }
  return v;
}
export function applyTheme() {
  const t = ls(key("theme")) || "system";
  if (t === "system") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", t);
  const dark = t === "dark" || (t === "system" && matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#000000" : "#F2F2F7");
}

export function settings() {
  const { s, body } = shell({ title: "Настройки", back: true });
  const theme = ls(key("theme")) || "system";

  if (FLAVOR.setup) {
    const h = el(`<div class="group" style="--sep-left:16px"><button class="row accent-t"><span class="r-main">Инструкция по подключению</span>${icon("chevron.right", "chev")}</button></div>`);
    h.querySelector("button").addEventListener("click", () => openSetup({ again: true }));
    body.appendChild(h);
  }
  body.appendChild(el('<div class="sec-cap">ОТПРАВКА В GITHUB</div>'));
  const send = el('<div></div>');
  body.appendChild(send);
  let shown = false;
  const paintSend = async () => {
    if (shown && !send.isConnected) { off(); return; }   
    shown = true;
    const c = config(), last = lastRun(), pend = await pendingFiles();
    const nE = pend.filter(f => f.path.startsWith("entries/")).length, nO = pend.length - nE;
    const status = busy() ? "отправляю…" : !c.token ? "ключа нет" : !armed() ? "ещё не отправляли" : last?.error ? "не вышло" : "работает";
    const lastTxt = last?.okAt ? when(last.okAt) : "никогда";
    send.innerHTML = "";
    const g = el(`<div class="group" style="--sep-left:16px">
      <div class="row"><span class="r-main">Ждут отправки</span><span class="val">${pend.length ? `${nE} ${plural(nE, "запись", "записи", "записей")}${nO ? `, ещё ${nO} ${plural(nO, "файл", "файла", "файлов")}` : ""}` : "ничего"}</span></div>
      <div class="row"><span class="r-main">Последняя отправка</span><span class="val">${lastTxt}</span></div>
      <div class="row"><span class="r-main">Состояние</span><span class="val">${status}</span></div>
      ${last?.error ? `<div class="row"><span class="r-main" style="color:var(--red)">${esc(last.error)}</span></div>` : ""}
      ${c.token ? `<button class="row accent-t" data-now ${busy() ? "disabled" : ""}><span class="r-main">Отправить сейчас</span>${icon("arrow.up")}</button>` : ""}
    </div>`);
    g.querySelector("[data-now]")?.addEventListener("click", async () => {
      const r = await syncNow({ manual: true });
      if (r?.sent) toast("Отправлено: " + r.sent + " " + plural(r.sent, "файл", "файла", "файлов"));
      else if (r?.error) toast(r.error);
    });
    send.appendChild(g);
    send.appendChild(el('<div class="sec-cap">КЛЮЧ</div>'));
    const k = el(`<div class="group" style="--sep-left:16px">
      <label class="row"><span class="r-main">Репозиторий</span><input data-repo value="${esc(c.repo || DEFAULT_REPO)}" placeholder="логин/имя-репозитория" autocapitalize="off" autocorrect="off" spellcheck="false" style="text-align:right;border:0;background:none;font:inherit;color:var(--ink-2);min-width:0;flex:1.4"></label>
      <label class="row"><span class="r-main">Ключ (токен)</span><input data-token type="password" placeholder="${c.token ? "сохранён" : "github_pat_…"}" autocomplete="off" autocapitalize="off" spellcheck="false" style="text-align:right;border:0;background:none;font:inherit;color:var(--ink-2);min-width:0;flex:1.4"></label>
      <button class="row accent-t" data-save><span class="r-main">Сохранить ключ</span></button>
      ${c.token ? '<button class="row danger" data-forget><span class="r-main">Убрать ключ с телефона</span></button>' : ""}
    </div>`);
    k.querySelector("[data-save]").addEventListener("click", () => {
      const repo = k.querySelector("[data-repo]").value, token = k.querySelector("[data-token]").value;
      if (!/^[\w.-]+\/[\w.-]+$/.test(repo.trim())) { toast("Имя репозитория — владелец/имя"); return; }
      saveConfig({ repo, ...(token.trim() ? { token } : {}) });
      toast(token.trim() ? "Ключ сохранён. Первую отправку — кнопкой «Отправить сейчас»" : "Сохранено");
    });
    k.querySelector("[data-forget]")?.addEventListener("click", () => { if (confirm("Убрать ключ? Отправка остановится, записи останутся в телефоне.")) forgetKey(); });
    send.appendChild(k);
    send.appendChild(el(`<div class="foot">Записи сначала сохраняются в телефоне, а в репозиторий уходят, когда приложение открыто и есть сеть. Отправляются только новые файлы, ничего не стирается. Ключ хранится в памяти этого сайта на телефоне (localStorage), открыто, без шифрования: его видит код этого адреса${location.hostname.endsWith("github.io") ? " — а на github.io это и все ваши сайты на GitHub Pages. Ключ лучше держать в копии на Яндексе" : " — и только он"}. Wi-Fi от мобильной сети веб-версия на iPhone не отличает.</div>`));
  };
  const off = onSync(paintSend);
  paintSend();

  body.appendChild(el('<div class="sec-cap">ВЫГРУЗКА</div>'));
  const ex = el(`<div class="group" style="--sep-left:16px"><button class="row accent-t" data-export><span class="r-main">Выгрузить все записи</span>${icon("arrow.up")}</button></div>`);
  const exBtn = ex.querySelector("[data-export]");
  let ready = null;
  exBtn.addEventListener("click", async () => {
    if (!ready) {
      exBtn.querySelector(".r-main").textContent = "Собираю файл…";
      const enc = new TextEncoder(), list = [];
      for (const f of await allFiles()) {
        const data = typeof f.body === "string" ? enc.encode(f.body) : new Uint8Array(await f.body.arrayBuffer());
        list.push({ name: f.path, data });
      }
      list.push({ name: "README.txt", data: enc.encode("PlanProjekt beta export, " + new Date().toISOString() + ".\nLayout and formats: plan_projekt docs/data_contract.md (projects.yml, entries/, events/, attachments/).\n") });
      const d = new Date(), name = `planprojekt-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.zip`;
      ready = new File([zip(list, d)], name, { type: "application/zip" });
      const mb = ready.size / 1048576;
      exBtn.querySelector(".r-main").innerHTML = `<span class="r-t">Отправить файл</span><span class="r-s">${state.entries.size} ${plural(state.entries.size, "запись", "записи", "записей")}, ${mb < 0.1 ? "меньше 0,1" : mb.toFixed(1).replace(".", ",")} МБ</span>`;
      return;
    }
    if (navigator.canShare?.({ files: [ready] })) {
      try { await navigator.share({ files: [ready], title: ready.name }); } catch {}
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(ready); a.download = ready.name; a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 30000);
    }
  });
  body.appendChild(ex);
  body.appendChild(el('<div class="foot">Один файл .zip: записи, события и картинки — так же, как они лягут в репозиторий записей. Сохраните в «Файлы» или отправьте на Mac.</div>'));

  body.appendChild(el('<div class="sec-cap">ОФОРМЛЕНИЕ</div>'));
  const seg = el(`<div class="seg" style="margin-top:0">${[["system", "Как в системе"], ["light", "Светлая"], ["dark", "Тёмная"]].map(([k, t]) => `<button data-t="${k}" class="${theme === k ? "on" : ""}">${t}</button>`).join("")}</div>`);
  seg.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
    ls(key("theme"), b.dataset.t); applyTheme();
    seg.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b));
  }));
  body.appendChild(seg);

  body.appendChild(el('<div class="sec-cap">ПРОЕКТЫ</div>'));
  const g = el('<div class="group"></div>');
  for (const p of state.projects.slice().sort((a, b) => a.title.localeCompare(b.title, "ru"))) {
    const r = el(`<button class="row"><span class="pico" style="--c:var(--${p.color || "gray"})">${icon(p.icon || "list.bullet")}</span><span class="r-main"><span class="r-t">${esc(p.title)}</span><span class="r-s">${p.pinned ? "закреплён · " : ""}${(p.aliases || []).length} ${plural((p.aliases || []).length, "произношение", "произношения", "произношений")}</span></span><span class="r-n">${openCount(p.tag)}</span>${icon("chevron.right", "chev")}</button>`);
    r.addEventListener("click", () => nav.push({ s: "project", tag: p.tag }));
    g.appendChild(r);
  }
  if (FLAVOR.newProject) {
    const add = el(`<button class="row accent-t"><span class="r-main">Новый проект</span>${icon("plus")}</button>`);
    add.addEventListener("click", () => nav.push({ s: "project", fresh: true }));
    g.appendChild(add);
  }
  body.appendChild(g);
  body.appendChild(el(FLAVOR.newProject ? '<div class="foot">Проект появляется сразу и уходит в репозиторий вместе с записями. Произношения нужны только для голоса.</div>' : '<div class="foot">Новый проект пока заводится только на Mac.</div>'));

  return s;
}

function newTag() {
  const have = new Set(state.projects.map(p => p.tag));
  let t;
  do { t = "p_" + Math.random().toString(36).slice(2, 8); } while (have.has(t));
  return t;
}

export function projectEditor(route) {
  const fresh = !!route.fresh;
  const p0 = fresh ? { tag: newTag(), title: "", icon: "list.bullet", color: "blue", aliases: [], pinned: true } : project(route.tag);
  const d = { title: p0.title, icon: p0.icon || "list.bullet", color: p0.color || "gray", aliases: [...(p0.aliases || [])], pinned: !!p0.pinned };
  const right = `<button class="glass-btn accent" data-ok aria-label="Готово">${icon("checkmark")}</button>`;
  const { s, body } = shell({ back: true, right });
  s.querySelector(".mini-title").textContent = fresh ? "Новый проект" : p0.title;

  const head = el(`<div class="pp-head"><span class="pico xl"></span><input value="${esc(d.title)}" placeholder="Название проекта" aria-label="Название"></div>`);
  const paintHead = () => { const pi = head.querySelector(".pico"); pi.style.setProperty("--c", `var(--${d.color})`); pi.innerHTML = icon(d.icon); };
  head.querySelector("input").addEventListener("input", e => { d.title = e.target.value; });
  body.appendChild(head); paintHead();

  const sw = el(`<div class="swatches">${COLORS.slice(0, 12).map(c => `<button data-c="${c}" style="--c:var(--${c})" class="${c === d.color ? "on" : ""}" aria-label="${c}"></button>`).join("")}</div>`);
  sw.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { d.color = b.dataset.c; sw.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); paintHead(); }));
  body.appendChild(sw);

  const gl = el(`<div class="glyphs">${PROJECT_ICONS.map(n => `<button data-i="${n}" class="${n === d.icon ? "on" : ""}">${icon(n)}</button>`).join("")}</div>`);
  gl.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { d.icon = b.dataset.i; gl.querySelectorAll("button").forEach(x => x.classList.toggle("on", x === b)); paintHead(); }));
  body.appendChild(gl);

  body.appendChild(el('<div class="sec-cap">НА ГЛАВНОМ</div>'));
  const pin = el(`<div class="group" style="--sep-left:16px"><button class="row"><span class="r-main">Закрепить в «Актуальных»</span><span class="toggle ${d.pinned ? "on" : ""}"></span></button></div>`);
  pin.querySelector("button").addEventListener("click", e => { d.pinned = !d.pinned; e.currentTarget.querySelector(".toggle").classList.toggle("on", d.pinned); });
  body.appendChild(pin);

  body.appendChild(el('<div class="sec-cap">ПРОИЗНОШЕНИЯ ДЛЯ ГОЛОСА</div>'));
  const al = el('<div class="group alias-list" style="--sep-left:16px"></div>');
  const paintAliases = () => {
    al.innerHTML = "";
    d.aliases.forEach((a, i) => {
      const r = el(`<div class="row"><input value="${esc(a)}" aria-label="Произношение"><button aria-label="Убрать" style="color:var(--red)">${icon("trash")}</button></div>`);
      r.querySelector("input").addEventListener("input", e => { d.aliases[i] = e.target.value.trim().toLowerCase(); });
      r.querySelector("button").addEventListener("click", () => { d.aliases.splice(i, 1); paintAliases(); });
      al.appendChild(r);
    });
    const add = el(`<button class="row accent-t"><span class="r-main">Добавить произношение</span>${icon("plus")}</button>`);
    add.addEventListener("click", () => { d.aliases.push(""); paintAliases(); al.querySelectorAll("input")[d.aliases.length - 1].focus(); });
    al.appendChild(add);
  };
  paintAliases();
  body.appendChild(al);
  body.appendChild(el('<div class="foot">Как телефон пишет название, когда вы его говорите. Разбор ищет эти слова после типа: «идея для <b>лайт план</b>…».</div>'));

  s.querySelector("[data-ok]").addEventListener("click", async () => {
    if (fresh) {
      const title = d.title.trim();
      if (!title) { toast("Введите название проекта"); return; }
      await addEvent({ kind: "project", tag: p0.tag, title, icon: d.icon, color: d.color, pinned: d.pinned, aliases: d.aliases.filter(Boolean) });
      toast("Проект создан");
      nav.pop();
      return;
    }
    const ch = { kind: "project", tag: p0.tag };
    if (d.title.trim() && d.title.trim() !== p0.title) ch.title = d.title.trim();
    if (d.icon !== p0.icon) ch.icon = d.icon;
    if (d.color !== p0.color) ch.color = d.color;
    if (d.pinned !== !!p0.pinned) ch.pinned = d.pinned;
    const al2 = d.aliases.filter(Boolean);
    if (al2.join("|") !== (p0.aliases || []).join("|")) ch.aliases = al2;
    if (Object.keys(ch).length > 2) { await addEvent(ch); toast("Сохранено"); }
    nav.pop();
  });
  return s;
}

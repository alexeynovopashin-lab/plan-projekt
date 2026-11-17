import { icon } from "./icons.js";
import { project } from "./store.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

const MON = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const MON_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const WD = ["Вс", "Пн", "Вт", "Ср", "Чт", "Пт", "Сб"];
const hm = d => String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
function startOfDay(d) { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; }
export function daysAgo(stamp, now = new Date()) {
  return Math.round((startOfDay(now) - startOfDay(new Date(stamp))) / 86400000);
}
export function when(stamp, now = new Date()) {
  const d = new Date(stamp), n = daysAgo(d, now);
  if (n === 0) return "Сегодня, " + hm(d);
  if (n === 1) return "Вчера, " + hm(d);
  if (n === 2) return "Позавчера, " + hm(d);
  if (n > 0 && n < 7) return WD[d.getDay()] + ", " + hm(d);
  return d.getDate() + " " + MON[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : "") + ", " + hm(d);
}
export function dayLabel(d) {
  d = new Date(d);
  return WD[d.getDay()] + " " + d.getDate() + " " + MON[d.getMonth()].slice(0, 4).replace(/я$/, "") + ".";
}
export function dateLong(d) { d = new Date(d); return d.getDate() + " " + MON[d.getMonth()] + " " + d.getFullYear(); }
export function stamp(d, now = new Date()) {
  d = new Date(d);
  return d.getDate() + " " + MON[d.getMonth()] + (d.getFullYear() !== now.getFullYear() ? " " + d.getFullYear() : "") + ", " + hm(d);
}
export function headTags(type, tags) {
  const T = { idea: "идея", bug: "баг", task: "задача", question: "вопрос" };
  return [...(type ? [T[type] || type] : []), ...tags];
}
export function plural(n, one, few, many) {
  const a = n % 10, b = n % 100;
  return a === 1 && b !== 11 ? one : a >= 2 && a <= 4 && (b < 12 || b > 14) ? few : many;
}

export function projIcon(tag, size = "") {
  const p = project(tag);
  if (!p) return `<span class="pico ${size}" style="--c:var(--gray)">${icon("tray")}</span>`;
  return `<span class="pico ${size}" style="--c:var(--${p.color || "gray"})">${icon(p.icon || "list.bullet")}</span>`;
}

export function statusDot(st) {
  const s = st.status;
  if (s === "verified") return `<span class="sd sd-verified">${icon("checkmark")}</span>`;
  if (s === "dropped") return `<span class="sd sd-dropped"><i></i></span>`;
  return `<span class="sd sd-${s}"></span>`;
}

export function tick() { try { navigator.vibrate && navigator.vibrate(8); } catch {} }

export function openSheet(content, { onClose, cls = "", tall = false } = {}) {
  const host = $("#sheets");
  const scrim = el('<div class="scrim"></div>');
  const sheet = el(`<div class="sheet ${tall ? "tall" : ""} ${cls}" role="dialog"></div>`);
  sheet.appendChild(typeof content === "string" ? el(content) : content);
  host.append(scrim, sheet);
  requestAnimationFrame(() => { scrim.classList.add("on"); sheet.classList.add("on"); });
  let closed = false;
  function close() {
    if (closed) return; closed = true;
    scrim.classList.remove("on"); sheet.classList.remove("on");
    const kill = () => { scrim.remove(); sheet.remove(); };
    sheet.addEventListener("transitionend", kill, { once: true });
    setTimeout(kill, 600);
    onClose && onClose();
  }
  scrim.addEventListener("click", close);
  dragToClose(sheet, close);
  return { sheet, close };
}

function dragToClose(sheet, close) {
  let y0 = null, dy = 0;
  sheet.addEventListener("pointerdown", e => {
    if (!e.target.closest(".grab, .sheet-head")) return;
    if (e.target.closest("button, input, textarea")) return;
    y0 = e.clientY; dy = 0; sheet.style.transition = "none";
    sheet.setPointerCapture(e.pointerId);
  });
  sheet.addEventListener("pointermove", e => {
    if (y0 == null) return;
    dy = Math.max(0, e.clientY - y0);
    sheet.style.transform = `translateY(${dy}px)`;
  });
  const end = () => {
    if (y0 == null) return;
    y0 = null; sheet.style.transition = ""; sheet.style.transform = "";
    if (dy > 90) close();
  };
  sheet.addEventListener("pointerup", end);
  sheet.addEventListener("pointercancel", end);
}

export function hold(elm, fire) {
  let timer = null, fired = false, sx = 0, sy = 0;
  const stop = () => { clearTimeout(timer); timer = null; };
  elm.addEventListener("pointerdown", e => {
    fired = false; sx = e.clientX; sy = e.clientY;
    timer = setTimeout(() => { fired = true; tick(); fire(); }, 450);
  });
  elm.addEventListener("pointermove", e => {
    if (timer && (Math.abs(e.clientX - sx) > 8 || Math.abs(e.clientY - sy) > 8)) stop();
  });
  ["pointerup", "pointercancel", "pointerleave"].forEach(t => elm.addEventListener(t, stop));
  elm.addEventListener("click", e => { if (fired) { e.preventDefault(); e.stopPropagation(); fired = false; } }, true);
  elm.addEventListener("contextmenu", e => e.preventDefault());
}

export function menu(anchor, items) {
  const host = $("#sheets");
  const scrim = el('<div class="scrim menu-scrim"></div>');
  const m = el('<div class="menu glass"></div>');
  for (const it of items) {
    if (it === "-") { m.appendChild(el('<div class="menu-sep"></div>')); continue; }
    const b = el(`<button type="button" class="${it.danger ? "danger" : ""}"><span>${esc(it.t)}</span>${it.sub ? `<small>${esc(it.sub)}</small>` : ""}${icon(it.icon || "chevron.right")}</button>`);
    b.addEventListener("click", () => { close(); it.fn(); });
    m.appendChild(b);
  }
  host.append(scrim, m);
  const r = anchor.getBoundingClientRect(), W = innerWidth, H = innerHeight;
  const w = Math.min(260, W - 32);
  m.style.width = w + "px";
  const h = m.offsetHeight;
  let top = r.bottom + 8;
  if (top + h > H - 20) top = Math.max(20, r.top - h - 8);
  m.style.left = Math.max(16, Math.min(r.left, W - w - 16)) + "px";
  m.style.top = top + "px";
  anchor.classList.add("lifted");
  requestAnimationFrame(() => { scrim.classList.add("on"); m.classList.add("on"); });
  function close() {
    anchor.classList.remove("lifted");
    scrim.remove(); m.remove();
  }
  scrim.addEventListener("click", close);
}

export function swipeRow(row, { left, right }) {
  const body = row.querySelector(".sw-body");
  let x0 = null, y0 = null, dx = 0, t0 = 0, locked = null;
  const bgL = row.querySelector(".sw-left"), bgR = row.querySelector(".sw-right");
  row.addEventListener("touchstart", e => {
    if (e.touches.length !== 1) return;
    x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; dx = 0; t0 = Date.now(); locked = null;
    body.style.transition = "none";
  }, { passive: true });
  row.addEventListener("touchmove", e => {
    if (x0 == null) return;
    const mx = e.touches[0].clientX - x0, my = e.touches[0].clientY - y0;
    if (locked == null && (Math.abs(mx) > 8 || Math.abs(my) > 8)) locked = Math.abs(mx) > Math.abs(my) ? "x" : "y";
    if (locked !== "x") return;
    dx = mx;
    if (dx > 0 && !right) dx = dx / 6;
    if (dx < 0 && !left) dx = dx / 6;
    body.style.transform = `translateX(${dx}px)`;
    const w = row.offsetWidth, past = Math.abs(dx) > w * 0.35;
    if (bgL) bgL.classList.toggle("armed", dx < 0 && past);
    if (bgR) bgR.classList.toggle("armed", dx > 0 && past);
    row.classList.toggle("sw-l", dx < 0); row.classList.toggle("sw-r", dx > 0);
  }, { passive: true });
  const end = () => {
    if (x0 == null) return;
    x0 = null;
    const w = row.offsetWidth, v = Math.abs(dx) / Math.max(1, Date.now() - t0);
    const go = locked === "x" && (Math.abs(dx) > w * 0.35 || (Math.abs(dx) > 50 && v > 0.6));
    body.style.transition = "";
    if (go && dx < 0 && left) { body.style.transform = `translateX(${-w}px)`; tick(); setTimeout(left, 180); }
    else if (go && dx > 0 && right) { body.style.transform = `translateX(${w}px)`; tick(); setTimeout(right, 180); }
    else { body.style.transform = ""; row.classList.remove("sw-l", "sw-r"); }
  };
  row.addEventListener("touchend", end);
  row.addEventListener("touchcancel", end);
}

let undoTimer = null, undoFn = null;
export function showUndo(text, restore) {
  const bar = $("#undo");
  $("#undo-text").textContent = text;
  undoFn = restore;
  bar.classList.add("show");
  clearTimeout(undoTimer);
  undoTimer = setTimeout(hideUndo, 6000);
}
export function hideUndo() { $("#undo").classList.remove("show"); undoFn = null; clearTimeout(undoTimer); }
export function bindUndo() {
  $("#undo-btn").addEventListener("click", () => { const f = undoFn; hideUndo(); f && f(); });
}

export function toast(text) {
  const t = el(`<div class="toast glass">${esc(text)}</div>`);
  document.body.appendChild(t);
  requestAnimationFrame(() => t.classList.add("on"));
  setTimeout(() => { t.classList.remove("on"); setTimeout(() => t.remove(), 400); }, 1800);
}

export function viewImage(src) {
  const v = el(`<div class="viewer"><button class="glass-btn v-close" aria-label="Закрыть">${icon("xmark")}</button><img alt=""></div>`);
  const img = v.querySelector("img");
  img.src = src;
  document.body.appendChild(v);
  requestAnimationFrame(() => v.classList.add("on"));
  let s = 1, tx = 0, ty = 0;
  const apply = () => { img.style.transform = `translate(${tx}px,${ty}px) scale(${s})`; };
  const close = () => { v.classList.remove("on"); setTimeout(() => v.remove(), 300); };
  v.querySelector(".v-close").addEventListener("click", close);
  const pts = new Map();
  let base = null, lastTap = 0;
  v.addEventListener("pointerdown", e => {
    if (e.target.closest(".v-close")) return;
    v.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    base = snapshot();
    img.style.transition = "none";
    const now = Date.now();
    if (pts.size === 1 && now - lastTap < 280) { 
      img.style.transition = ""; if (s > 1) { s = 1; tx = ty = 0; } else { s = 2.5; } apply(); base = null;
    }
    lastTap = now;
  });
  function snapshot() {
    const a = [...pts.values()];
    if (a.length >= 2) {
      return { s, tx, ty, d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), cx: (a[0].x + a[1].x) / 2, cy: (a[0].y + a[1].y) / 2 };
    }
    return a.length ? { s, tx, ty, x: a[0].x, y: a[0].y } : null;
  }
  v.addEventListener("pointermove", e => {
    if (!pts.has(e.pointerId) || !base) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const a = [...pts.values()];
    if (a.length >= 2 && base.d) {
      const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
      s = Math.max(1, Math.min(6, base.s * d / base.d));
      const cx = (a[0].x + a[1].x) / 2, cy = (a[0].y + a[1].y) / 2;
      tx = base.tx + (cx - base.cx); ty = base.ty + (cy - base.cy);
    } else if (a.length === 1 && base.x != null) {
      tx = base.tx + (a[0].x - base.x); ty = base.ty + (a[0].y - base.y);
      if (base.s === 1) { tx = 0; v.style.background = `rgba(0,0,0,${Math.max(0.3, 1 - Math.abs(ty) / 400)})`; }
    }
    apply();
  });
  const up = e => {
    pts.delete(e.pointerId);
    img.style.transition = "";
    if (s === 1 && Math.abs(ty) > 120) return close();
    if (s <= 1.02) { s = 1; tx = ty = 0; v.style.background = ""; }
    apply();
    base = snapshot();
  };
  v.addEventListener("pointerup", up);
  v.addEventListener("pointercancel", up);
}

export async function toJpeg(file) {
  const bmp = await (window.createImageBitmap ? createImageBitmap(file) : new Promise((ok, no) => {
    const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(file);
  }));
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  return new Promise(ok => c.toBlob(ok, "image/jpeg", 0.8));
}

export function autogrow(ta, max = 160) {
  const f = () => { ta.style.height = "auto"; ta.style.height = Math.min(max, ta.scrollHeight) + "px"; };
  ta.addEventListener("input", f); f();
}

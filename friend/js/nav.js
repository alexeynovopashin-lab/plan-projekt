import { el, esc } from "./ui.js";
import { icon } from "./icons.js";

export const nav = {
  push: () => {}, pop: () => {}, capture: () => {}, search: () => {}, settings: () => {}, tab: () => {}, refresh: () => {}
};

export function shell({ title = "", back = false, right = "", tint = "", sub = "" }) {
  const s = el(`<div class="screen"><div class="scroller">
    <div class="topbar">
      ${back ? `<button class="glass-btn back" aria-label="Назад">${icon("chevron.left")}</button>` : ""}
      <div class="mini-title">${esc(title)}</div>
      <div class="spacer"></div>
      ${right}
    </div>
    ${title ? `<h1 class="large-title ${tint ? "tinted" : ""}" ${tint ? `style="--c:var(--${tint})"` : ""}>${esc(title)}</h1>` : ""}
    ${sub ? `<div class="subline">${sub}</div>` : ""}
    <div class="body"></div>
  </div></div>`);
  if (back) s.querySelector(".back").addEventListener("click", () => nav.pop());
  const sc = s.querySelector(".scroller");
  sc.addEventListener("scroll", () => s.classList.toggle("scrolled", sc.scrollTop > 44), { passive: true });
  return { s, sc, body: s.querySelector(".body") };
}

export function searchBtn() {
  return `<button class="glass-btn" data-act="search" aria-label="Поиск">${icon("magnifyingglass")}</button>`;
}
export function wire(root) {
  root.querySelectorAll('[data-act="search"]').forEach(b => b.addEventListener("click", () => nav.search()));
  root.querySelectorAll('[data-act="settings"]').forEach(b => b.addEventListener("click", () => nav.settings()));
}

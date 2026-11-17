// App shell: four tabs, a stack of screens per tab, the «+» button, edge swipe back.
import { load, onChange, counts, state, writeRegistry } from "./store.js";
import { removeSamples } from "./samples.js";
import { SEED_REGISTRY } from "./registry_seed.js";
import { bindUndo, $, $$ } from "./ui.js";
import { nav } from "./nav.js";
import { flushPending } from "./actions.js";
import { bindSync, config } from "./sync.js";
import { FLAVOR, key } from "./flavor.js";
import { openSetup } from "./screens/setup.js";
import { home } from "./screens/home.js";
import { feed, smart } from "./screens/feed.js";
import { entry } from "./screens/entry.js";
import { inbox } from "./screens/inbox.js";
import { timeline } from "./screens/timeline.js";
import { calendar } from "./screens/calendar.js";
import { search } from "./screens/search.js";
import { settings, projectEditor, applyTheme } from "./screens/settings.js";
import { capture } from "./screens/capture.js";

const SCREENS = { home, feed, smart, entry, inbox, timeline, calendar, search, settings, project: projectEditor };
const ROOT = { projects: { s: "home" }, inbox: { s: "inbox" }, timeline: { s: "timeline" }, calendar: { s: "calendar" } };
const NO_FAB = new Set(["search", "settings", "project"]);
const stacks = {};
let cur = "projects";

const tabEl = t => $(`.tab[data-tab="${t}"]`);
const top = () => stacks[cur][stacks[cur].length - 1];

function build(route) {
  const s = SCREENS[route.s](route);
  s.route = route;
  return s;
}
function ensure(t) {
  if (stacks[t]) return;
  const s = build(ROOT[t]);
  tabEl(t).appendChild(s);
  stacks[t] = [s];
}

function chrome() {
  const t = top();
  document.body.classList.toggle("composer", !!t.dataset.composer);
  $(".fab").hidden = NO_FAB.has(t.route.s) || !!t.dataset.composer;   // the feed has its own type bar
  $$(".tabbar button").forEach(b => b.classList.toggle("on", b.dataset.tab === cur));
  const c = counts();
  const badge = $('.tabbar [data-tab="inbox"] .badge');
  badge.textContent = c.inbox; badge.hidden = !c.inbox;
}

// Rebuild the visible screen in place, keeping its scroll; screens with update() refresh themselves.
// Not while Alexey is typing in a screen field (the entry text, an answer): a rebuild would drop
// what he typed. The screen catches up when the field loses focus.
let heldRefresh = false;
document.addEventListener("focusout", () => { if (heldRefresh) { heldRefresh = false; setTimeout(refresh, 0); } });
function refresh() {
  const old = top();
  const a = document.activeElement;
  if (a && old.contains(a) && a.matches("textarea, input")) { heldRefresh = true; return; }
  if (old.update) { old.update(); chrome(); return; }
  const sc = old.querySelector(".scroller")?.scrollTop || 0;
  const n = build(old.route);
  n.classList.add("nofx");
  old.replaceWith(n);
  stacks[cur][stacks[cur].length - 1] = n;
  const nsc = n.querySelector(".scroller");
  if (nsc) nsc.scrollTop = sc;
  requestAnimationFrame(() => n.classList.remove("nofx"));
  chrome();
}

function setTab(t) {
  if (t === cur && stacks[t] && stacks[t].length > 1) {      // tap on the active tab → back to its root
    while (stacks[t].length > 1) stacks[t].pop().remove();
    stacks[t][0].classList.remove("under");
  }
  cur = t;
  $$(".tab").forEach(x => x.classList.toggle("on", x.dataset.tab === t));
  ensure(t);
  refresh();
}

nav.push = route => {
  const st = stacks[cur], under = top();
  const s = build(route);
  s.classList.add("enter");
  tabEl(cur).appendChild(s);
  st.push(s);
  if (s.focusFirst) s.focusFirst();              // inside the tap, so iOS raises the keyboard
  void s.offsetWidth;
  s.classList.remove("enter");
  under.classList.add("under");
  chrome();
};
nav.pop = () => {
  const st = stacks[cur];
  if (st.length < 2) return;
  const s = st.pop();
  s.classList.add("leave");
  top().classList.remove("under");
  setTimeout(() => s.remove(), 450);
  refresh();
};
nav.refresh = refresh;
nav.tab = setTab;
nav.search = () => nav.push({ s: "search" });
nav.settings = () => nav.push({ s: "settings" });
nav.capture = (opts = {}) => {
  const r = top().route;
  const tag = r.s === "feed" ? r.tag : r.s === "entry" ? state.entries.get(r.id)?.project : null;
  capture({ project: tag || null, ...opts });
};
nav.reset = () => {
  for (const t of Object.keys(stacks)) { for (const s of stacks[t]) s.remove(); delete stacks[t]; }
  ensure(cur);
  refresh();
};

// Edge swipe back: from the left 24 px, follow the finger, commit past a third.
function edgeBack() {
  let x0 = null, s = null, under = null, dx = 0;
  $("#app").addEventListener("touchstart", e => {
    if (stacks[cur].length < 2 || e.touches[0].clientX > 24) return;
    x0 = e.touches[0].clientX; s = top(); under = stacks[cur][stacks[cur].length - 2]; dx = 0;
    s.style.transition = under.style.transition = "none";
  }, { passive: true });
  $("#app").addEventListener("touchmove", e => {
    if (x0 == null) return;
    dx = Math.max(0, e.touches[0].clientX - x0);
    const k = dx / innerWidth;
    s.style.transform = `translateX(${dx}px)`;
    under.style.transform = `translateX(${-28 * (1 - k)}%)`;
    under.style.filter = `brightness(${0.7 + 0.3 * k})`;
  }, { passive: true });
  $("#app").addEventListener("touchend", () => {
    if (x0 == null) return;
    x0 = null;
    s.style.transition = under.style.transition = "";
    s.style.transform = under.style.transform = under.style.filter = "";
    if (dx > innerWidth / 3) nav.pop();
  });
}

async function start() {
  applyTheme();
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", applyTheme);
  bindUndo();
  await load();
  if (!state.registry.projects.length && SEED_REGISTRY.projects.length) { await writeRegistry(SEED_REGISTRY); await load(); }   // first launch: his projects, no entries
  try {
    if (!localStorage.getItem(key("samples-removed"))) { await removeSamples(); localStorage.setItem(key("samples-removed"), "1"); }
  } catch {}
  navigator.storage?.persist?.().catch(() => {});   // ask Safari to keep entries when space runs low
  $$(".tabbar button").forEach(b => b.addEventListener("click", () => setTab(b.dataset.tab)));
  $(".fab").addEventListener("click", () => nav.capture());
  onChange(refresh);
  edgeBack();
  setTab("projects");
  document.addEventListener("visibilitychange", () => { if (document.hidden) flushPending(); });
  if (FLAVOR.setup && !config().token) openSetup();
  bindSync();   // send to the entries repo on open / return / back online, once Alexey sent the first time
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
}
start();

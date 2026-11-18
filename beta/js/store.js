// Local store: IndexedDB holds the same files as the entries repo
// (docs/architecture.md §7). Create-only, except projects.yml.
import {
  newId, localStamp, entryPath, eventPath, attachPath, editPath, entryToMd, mdToEntry,
  registryToYml, ymlToRegistry, foldEntry
} from "./contract.js";
import { FLAVOR } from "./flavor.js";

const DB_NAME = FLAVOR.db;   // each copy keeps its own data, like Light Plan
const BY = FLAVOR.by;
let db = null;
const listeners = new Set();

export const state = {
  registry: { contract: 1, projects: [] },
  projects: [],          // registry + project events, folded
  entries: new Map(),    // id -> folded entry
  rawEntries: new Map(),
  events: [],
  blobs: new Map(),      // path -> Blob
  urls: new Map()        // path -> object URL
};

function req(r) { return new Promise((ok, no) => { r.onsuccess = () => ok(r.result); r.onerror = () => no(r.error); }); }

function openDb() {
  return new Promise((ok, no) => {
    const r = indexedDB.open(DB_NAME, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("files", { keyPath: "path" });
    r.onsuccess = () => ok(r.result);
    r.onerror = () => no(r.error);
  });
}

function tx(mode = "readonly") { return db.transaction("files", mode).objectStore("files"); }

async function putFile(path, body, { overwrite = false } = {}) {
  const st = tx("readwrite");
  if (!overwrite) {
    const had = await req(st.get(path));
    if (had) throw new Error("file exists: " + path);   // contract rule 2
  }
  await req(st.put({ path, body }));
}

export function onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) fn(); }

export async function load() {
  db = db || await openDb();
  const files = await req(tx().getAll());
  state.entries.clear(); state.rawEntries.clear(); state.events = [];
  state.blobs.clear();
  for (const u of state.urls.values()) URL.revokeObjectURL(u);
  state.urls.clear();
  let reg = null;
  for (const f of files) {
    if (f.path === "projects.yml") reg = ymlToRegistry(f.body);
    else if (f.path.startsWith("entries/")) { const e = mdToEntry(f.body); if (e) state.rawEntries.set(e.id, e); }
    else if (f.path.startsWith("events/")) { try { state.events.push(JSON.parse(f.body)); } catch {} }
    else if (f.path.startsWith("attachments/")) state.blobs.set(f.path, f.body);
  }
  state.registry = reg || { contract: 1, projects: [] };
  refold();
  return files.length;
}

function refold() {
  const byEntry = new Map();
  const projEv = [];
  for (const ev of state.events) {
    if (ev.kind === "project") { projEv.push(ev); continue; }
    if (!byEntry.has(ev.entry)) byEntry.set(ev.entry, []);
    byEntry.get(ev.entry).push(ev);
  }
  state.entries.clear();
  for (const [id, e] of state.rawEntries) state.entries.set(id, foldEntry(e, byEntry.get(id) || []));
  // registry + project events (new project, or a change of icon/colour/pin from the phone)
  const map = new Map(state.registry.projects.map(p => [p.tag, { ...p, aliases: [...(p.aliases || [])] }]));
  projEv.sort((a, b) => (a.at < b.at ? -1 : 1));
  for (const ev of projEv) {
    const p = map.get(ev.tag) || { tag: ev.tag, title: ev.title || ev.tag, aliases: [] };
    for (const k of ["title", "icon", "color", "pinned", "aliases"]) if (k in ev) p[k] = ev[k];
    map.set(ev.tag, p);
  }
  state.projects = [...map.values()];
}

export async function writeRegistry(reg) {
  await putFile("projects.yml", registryToYml(reg), { overwrite: true });
}

export async function addEvent(fields, { at = new Date(), by = BY, silent = false } = {}) {
  const ev = { id: newId(at), at: localStamp(at), ...(fields.entry ? { entry: fields.entry } : {}), by, ...fields };
  await putFile(eventPath(ev.id), JSON.stringify(ev, null, 2));
  state.events.push(ev);
  if (!silent) { refold(); emit(); }
  return ev;
}

export async function createEntry({ text, project, type, urgency, images = [], source = "text", at = new Date() },
  { silent = false } = {}) {
  const id = newId(at);
  const e = { id, created: localStamp(at), source, device: "web", project: project || null, type: type || null, ...(type === "idea" ? { urgency: urgency === "urgent" ? "urgent" : "deferred" } : {}), attachments: [], text };
  let n = 0;
  for (const blob of images) {
    const p = attachPath(id, ++n);
    await putFile(p, blob);
    state.blobs.set(p, blob);
    e.attachments.push(p);
  }
  await putFile(entryPath(id), entryToMd(e));
  state.rawEntries.set(id, mdToEntry(entryToMd(e)));
  if (!silent) { refold(); emit(); }
  return id;
}

// Save an edited picture: a new JPEG next to the original plus an `image` event; nothing is overwritten.
export async function saveEdit(entryId, original, from, blob) {
  const e = state.entries.get(entryId);
  const n = e.attachments.indexOf(original) + 1;
  const k = (e.edits[original] || []).length + 1;
  const path = editPath(entryId, n, k);
  await putFile(path, blob);
  state.blobs.set(path, blob);
  await addEvent({ entry: entryId, kind: "image", original, from, path });
  return path;
}

export function blobUrl(path) {
  if (state.urls.has(path)) return state.urls.get(path);
  const b = state.blobs.get(path);
  if (!b) return "";
  const u = URL.createObjectURL(b);
  state.urls.set(path, u);
  return u;
}

export async function clearAll() {
  db = db || await openDb();
  await req(tx("readwrite").clear());
  await load();
}

export function done() { refold(); emit(); }

// Every stored file as it would sit in the entries repo (for «Выгрузить все записи»).
export async function allFiles() {
  db = db || await openDb();
  return req(tx().getAll());
}

// Beta only: drop files that were never his (the old sample seed). Entries he writes are never removed.
export async function removeFiles(paths) {
  if (!paths.length) return;
  db = db || await openDb();
  const st = tx("readwrite");
  for (const p of paths) st.delete(p);
  await new Promise((ok, no) => { st.transaction.oncomplete = ok; st.transaction.onerror = () => no(st.transaction.error); });
  await load();
}

// ---- queries ----
export const project = tag => state.projects.find(p => p.tag === tag) || null;
export const allEntries = () => [...state.entries.values()].sort((a, b) => (a.id < b.id ? -1 : 1));
export const entriesOf = tag => allEntries().filter(e => (tag ? e.project === tag : !e.project));
export const inbox = () => allEntries().filter(e => !e.project && !e.closed);

const DAY = 86400000;
export function isToday(stamp, now = new Date()) {
  if (!stamp) return false;
  const d = new Date(stamp);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}
export function dayKey(d) {
  d = new Date(d);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

export function counts() {
  const all = allEntries();
  const todayKey = dayKey(new Date());
  return {
    waits: all.filter(e => e.waits && e.status !== "dropped").length,
    inbox: inbox().length,
    today: all.filter(e => !e.closed && (isToday(e.created) || e.due === todayKey)).length,
    open: all.filter(e => !e.closed).length
  };
}

// «Актуальные»: pinned + an entry within 14 days (pushes are unknown to the web)
export function actualProjects(now = Date.now()) {
  const recent = new Set();
  for (const e of state.entries.values()) {
    if (e.project && now - new Date(e.created).getTime() < 14 * DAY) recent.add(e.project);
  }
  for (const ev of state.events) {
    const e = ev.entry && state.entries.get(ev.entry);
    if (e && e.project && now - new Date(ev.at).getTime() < 14 * DAY) recent.add(e.project);
  }
  return state.projects.filter(p => p.pinned || recent.has(p.tag));
}

export const openCount = tag => allEntries().filter(e => e.project === tag && !e.closed).length;

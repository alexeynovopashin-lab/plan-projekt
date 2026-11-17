import { allFiles, writeRegistry, load, done } from "./store.js";
import { ymlToRegistry } from "./contract.js";
import { FLAVOR, key } from "./flavor.js";

const K = { repo: key("gh.repo"), token: key("gh.token"), sent: key("gh.sent"), last: key("gh.last"), armed: key("gh.armed"), api: key("gh.api") };
function get(k) { try { return localStorage.getItem(k); } catch { return null; } }
function set(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch {} }

export const DEFAULT_REPO = FLAVOR.defaultRepo;
export const config = () => ({ repo: get(K.repo) || "", token: get(K.token) || "" });
export function saveConfig({ repo, token }) {
  if (repo !== undefined) set(K.repo, repo.trim() || null);
  if (token !== undefined) set(K.token, token.trim() || null);
  emit();
}
export function forgetKey() { set(K.token, null); set(K.armed, null); emit(); }
export const armed = () => get(K.armed) === "1";
export const lastRun = () => { try { return JSON.parse(get(K.last) || "null"); } catch { return null; } };

const listeners = new Set();
export function onSync(fn) { listeners.add(fn); return () => listeners.delete(fn); }
function emit() { for (const fn of listeners) fn(); }

function sentSet() {
  try { const s = JSON.parse(get(K.sent) || "null"); if (s && s.repo === config().repo) return new Set(s.paths); } catch {}
  return new Set();
}
function saveSent(set_) { set(K.sent, JSON.stringify({ repo: config().repo, paths: [...set_] })); }

const RANK = p => (p.startsWith("attachments/") ? 0 : p.startsWith("entries/") ? 1 : 2);
export async function pendingFiles() {
  const sent = sentSet();
  return (await allFiles())
    .filter(f => f.path !== "projects.yml" && !sent.has(f.path))
    .sort((a, b) => RANK(a.path) - RANK(b.path) || (a.path < b.path ? -1 : 1));
}

async function b64(body) {
  const bytes = typeof body === "string" ? new TextEncoder().encode(body) : new Uint8Array(await body.arrayBuffer());
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

async function api(method, path, { body, raw = false, repo = config().repo, token = config().token } = {}) {
  const base = get(K.api) || "https://api.github.com";   
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 20000);
  try {
    return await fetch(`${base}/repos/${repo}/contents/${path.split("/").map(encodeURIComponent).join("/")}`, {
      method, signal: ctl.signal,
      headers: {
        Authorization: "Bearer " + token,
        Accept: raw ? "application/vnd.github.raw" : "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {})
      },
      body: body ? JSON.stringify(body) : undefined
    });
  } finally { clearTimeout(t); }
}

const WHY = {
  401: "GitHub не принял ключ — возможно, он истёк или вставлен не целиком",
  403: "у ключа нет права записи в этот репозиторий",
  404: "репозиторий не найден — проверьте имя или доступ ключа к нему"
};

export async function checkAccess(repo, token) {
  repo = repo.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "").replace(/\/+$/, "");
  token = token.trim();
  if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return { error: "Репозиторий — в виде «логин/имя», например ivan/planprojekt-entries" };
  if (!token) return { error: "Вставьте ключ — он начинается с github_pat_" };
  if (!navigator.onLine) return { error: "Нет интернета — проверка идёт через GitHub" };
  try {
    const base = get(K.api) || "https://api.github.com";
    const r = await fetch(`${base}/repos/${repo}`, { headers: { Authorization: "Bearer " + token, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" } });
    if (r.status === 401) return { error: "GitHub не принял ключ — скопируйте его заново, целиком" };
    if (r.status === 404 || r.status === 403) return { error: "Репозиторий не найден или ключу не дан доступ к нему (шаг 3: Only select repositories)" };
    if (!r.ok) return { error: "GitHub ответил " + r.status };
    const info = await r.json();
    if (!info.private) return { error: "Репозиторий открытый — записи увидят все. Сделайте его закрытым (Settings → Danger Zone → Change visibility)" };
    const body = "# PlanProjekt\n\nСюда приложение PlanProjekt отправляет записи с телефона: entries/, events/, attachments/.\n";
    const w = await api("PUT", "planprojekt.md", { repo, token, body: { message: "phone: planprojekt.md", content: btoa(unescape(encodeURIComponent(body))) } });
    if (w.status === 403 || w.status === 404) return { error: "Ключ может читать, но не писать: в шаге 3 нужно Contents → Read and write" };
    if (!(w.status === 201 || w.status === 200 || w.status === 422)) return { error: "GitHub ответил " + w.status + " на пробную запись" };
  } catch {
    return { error: "Нет связи с GitHub" };
  }
  set(K.repo, repo); set(K.token, token); set(K.armed, "1"); emit();
  syncNow().catch(() => {});
  return { ok: true, repo };
}

let running = null;
export const busy = () => !!running;

export function syncNow({ manual = false } = {}) {
  const { repo, token } = config();
  if (!repo || !token) return Promise.resolve({ skipped: "no-key" });
  if (!manual && !armed()) return Promise.resolve({ skipped: "not-armed" });
  if (!navigator.onLine) return Promise.resolve({ skipped: "offline" });
  if (running) return running;
  if (manual) set(K.armed, "1");
  running = (async () => {
    emit();
    const sent = sentSet();
    let n = 0, error = null;
    try {
      for (const f of await pendingFiles()) {
        const r = await api("PUT", f.path, { body: { message: "phone: " + f.path, content: await b64(f.body) } });
        if (r.status === 201 || r.status === 200 || r.status === 422) { sent.add(f.path); saveSent(sent); n++; continue; }
        error = WHY[r.status] || "GitHub ответил " + r.status;
        break;
      }
      if (!error) {
        const r = await api("GET", "projects.yml", { raw: true });
        if (r.ok) {
          const text = await r.text();
          const reg = ymlToRegistry(text);
          if (reg.projects.length) { await writeRegistry(reg); await load(); done(); }
        }
      }
    } catch (e) {
      error = e.name === "AbortError" ? "GitHub не ответил за 20 секунд" : "нет связи с GitHub";
    }
    const prev = lastRun() || {};
    set(K.last, JSON.stringify({ at: new Date().toISOString(), sent: n, error, okAt: error ? prev.okAt || null : new Date().toISOString() }));
    return { sent: n, error };
  })().finally(() => { running = null; emit(); });
  return running;
}

export function bindSync() {
  const go = () => syncNow().catch(() => {});
  document.addEventListener("visibilitychange", () => { if (!document.hidden) go(); });
  addEventListener("online", go);
  go();
}


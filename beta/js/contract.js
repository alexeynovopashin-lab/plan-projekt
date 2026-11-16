// Data contract v1 (docs/data_contract.md): same files as the entries repo.
// Entry = Markdown with a front matter; event = JSON; registry = projects.yml.

const ALPH = "abcdefghijkmnpqrstuvwxyz23456789";

function pad(n, w = 2) { return String(n).padStart(w, "0"); }

// 20261116T091205Z-k3f9
export function newId(at = new Date()) {
  let r = "";
  const buf = new Uint8Array(4);
  crypto.getRandomValues(buf);
  for (const b of buf) r += ALPH[b % ALPH.length];
  return at.getUTCFullYear() + pad(at.getUTCMonth() + 1) + pad(at.getUTCDate()) + "T" +
    pad(at.getUTCHours()) + pad(at.getUTCMinutes()) + pad(at.getUTCSeconds()) + "Z-" + r;
}

export function idTime(id) {
  const m = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/.exec(id || "");
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])) : null;
}

// Local time with offset: 2026-11-16T16:12:05+07:00
export function localStamp(d = new Date()) {
  const off = -d.getTimezoneOffset(), s = off >= 0 ? "+" : "-", a = Math.abs(off);
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + "T" +
    pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds()) +
    s + pad(Math.floor(a / 60)) + ":" + pad(a % 60);
}

export function ymPath(id) {
  return id.slice(0, 4) + "/" + id.slice(4, 6);
}
export const entryPath = id => "entries/" + ymPath(id) + "/" + id + ".md";
export const eventPath = id => "events/" + ymPath(id) + "/" + id + ".json";
export const attachPath = (id, n) => "attachments/" + ymPath(id) + "/" + id + "-" + n + ".jpg";

// ---- entry Markdown ----
const ORDER = ["id", "created", "source", "device", "project", "type", "parsed_by"];

function yamlScalar(v) {
  const s = String(v);
  return /^[\w.:+\-\/T]+$/.test(s) ? s : JSON.stringify(s);
}

export function entryToMd(e) {
  const lines = ["---"];
  for (const k of ORDER) if (e[k] != null && e[k] !== "") lines.push(k + ": " + yamlScalar(e[k]));
  if (e.attachments && e.attachments.length) {
    lines.push("attachments:");
    for (const a of e.attachments) lines.push("  - " + a);
  }
  lines.push("---");
  return lines.join("\n") + "\n" + (e.text || "") + "\n";
}

function unq(s) {
  s = s.trim();
  if (s.startsWith('"')) { try { return JSON.parse(s); } catch { return s.slice(1, -1); } }
  return s;
}

export function mdToEntry(md) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(md);
  if (!m) return null;
  const e = { attachments: [] };
  let list = null;
  for (const line of m[1].split("\n")) {
    const li = /^\s+-\s+(.*)$/.exec(line);
    if (li && list) { e[list].push(unq(li[1])); continue; }
    const kv = /^([a-z_]+):\s*(.*)$/.exec(line);
    if (!kv) continue;
    if (kv[2] === "") { list = kv[1]; e[list] = []; continue; }
    list = null;
    e[kv[1]] = unq(kv[2]);
  }
  e.text = m[2].replace(/\n$/, "");
  return e.id ? e : null;
}

// ---- registry projects.yml (only the shape we write) ----
export function registryToYml(reg) {
  const out = ["contract: " + (reg.contract || 1), "projects:"];
  for (const p of reg.projects) {
    out.push("  - tag: " + p.tag);
    out.push("    title: " + yamlScalar(p.title));
    if (p.icon) out.push("    icon: " + p.icon);
    if (p.color) out.push("    color: " + p.color);
    out.push("    aliases: [" + (p.aliases || []).map(yamlScalar).join(", ") + "]");
    if (p.repo) out.push("    repo: " + p.repo);
    if (p.pinned) out.push("    pinned: true");
  }
  return out.join("\n") + "\n";
}

export function ymlToRegistry(text) {
  const reg = { contract: 1, projects: [] };
  let cur = null;
  for (const raw of text.split("\n")) {
    const line = raw.replace(/\s+#.*$/, "");
    let m;
    if ((m = /^contract:\s*(\d+)/.exec(line))) reg.contract = +m[1];
    else if ((m = /^\s*-\s+tag:\s*(\S+)/.exec(line))) { cur = { tag: m[1], aliases: [] }; reg.projects.push(cur); }
    else if (cur && (m = /^\s+(\w+):\s*(.*)$/.exec(line))) {
      const k = m[1], v = m[2].trim();
      if (k === "aliases") cur.aliases = v.replace(/^\[|\]$/g, "").split(",").map(unq).filter(Boolean);
      else if (k === "pinned") cur.pinned = v === "true";
      else cur[k] = unq(v);
    }
  }
  return reg;
}

// ---- fold: entry + events (latest wins) ----
export const STATUS = ["open", "taken", "done_beta", "verified", "reopened", "dropped"];

export function foldEntry(entry, events) {
  const s = {
    ...entry, status: "open", statusAt: entry.created, commit: null, channel: null,
    questions: [], comments: [], tags: new Set(), links: [], start: null, due: null,
    history: [], doneAt: null
  };
  const evs = events.slice().sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : a.id < b.id ? -1 : 1));
  for (const ev of evs) {
    s.history.push(ev);
    switch (ev.kind) {
      case "status":
        s.status = ev.status; s.statusAt = ev.at;
        if (ev.status === "done_beta") { s.commit = ev.commit || null; s.channel = ev.channel || null; }
        if (ev.status === "verified") s.doneAt = ev.at;
        break;
      case "question": s.questions.push({ id: ev.id, text: ev.text, at: ev.at, by: ev.by, answer: null }); break;
      case "answer": {
        const q = s.questions.find(x => x.id === ev.question);
        if (q) q.answer = { text: ev.text, at: ev.at };
        break;
      }
      case "tag":
        if (ev.add) s.tags.add(ev.add);
        if (ev.remove) s.tags.delete(ev.remove);
        break;
      case "link": s.links.push({ to: ev.to, rel: ev.rel }); break;
      case "dates":
        if ("start" in ev) s.start = ev.start;
        if ("due" in ev) s.due = ev.due;
        break;
      case "classify":
        if ("project" in ev) s.project = ev.project || null;
        if ("type" in ev) s.type = ev.type || null;
        break;
      case "comment": s.comments.push({ text: ev.text, at: ev.at, by: ev.by }); break;
    }
  }
  s.openQuestion = s.questions.find(q => !q.answer) || null;
  s.waits = s.status === "done_beta" || !!s.openQuestion;
  s.closed = s.status === "verified" || s.status === "dropped";
  return s;
}

export const TYPES = [
  { id: "idea", t: "Идея" }, { id: "bug", t: "Баг" },
  { id: "task", t: "Задача" }, { id: "question", t: "Вопрос" }
];
export const typeTitle = id => (TYPES.find(x => x.id === id) || {}).t || "";

export const STATUS_TITLE = {
  open: "Открыта", taken: "Взята агентом", done_beta: "Сделано в бете",
  verified: "Проверено", reopened: "Открыта снова", dropped: "Отменена"
};

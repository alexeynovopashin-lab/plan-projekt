// Project registry from INDEX.md tags (written on first launch) and, for agents' browser checks only,
// sample entries in every status: run `(await import("./js/samples.js")).fillSamples()` in the console.
// Alexey, 16.11: no sample seed on his phone — removeSamples() clears the old one once.
import { writeRegistry, createEntry, addEvent, clearAll, load, state, removeFiles } from "./store.js";
import { entryPath, eventPath } from "./contract.js";

export const SEED_REGISTRY = {
  contract: 1,
  projects: [
    { tag: "light_plan", title: "Light Plan", icon: "sun.max", color: "orange", aliases: ["light plan", "лайт план", "лайтплан", "lightplan"], repo: "alexeynovopashin-lab/Light-Plan", pinned: true },
    { tag: "plan_projekt", title: "PlanProjekt", icon: "mic", color: "green", aliases: ["план проект", "plan projekt", "планпроект"], pinned: true },
    { tag: "event_os", title: "Event OS", icon: "calendar.badge", color: "blue", aliases: ["event", "ивент"] },
    { tag: "broni_os", title: "BroniOS", icon: "building.2", color: "indigo", aliases: ["бронь ос", "брони ос", "бронеос"] },
    { tag: "cursed_sword", title: "Проклятый меч", icon: "shield", color: "red", aliases: ["проклятый меч", "меч", "мечу"] },
    { tag: "color_harmony", title: "Цветовой круг", icon: "paintpalette", color: "purple", aliases: ["круг", "колор", "цветовой круг"] },
    { tag: "tomson_site", title: "Сайт Томсона", icon: "camera.aperture", color: "pink", aliases: ["томсон", "сайт томсона"] },
    { tag: "sun_compass", title: "Sun Compass", icon: "location.north", color: "yellow", aliases: ["сан компас", "компас"] },
    { tag: "camerateka", title: "Камератека", icon: "books", color: "teal", aliases: ["камератека"] },
    { tag: "alice_soulledger", title: "Склеп", icon: "theatermasks", color: "gray", aliases: ["склеп", "алиса"] }
  ]
};

// Drawn placeholder «screenshots» — no real screenshots (refs/ holds personal data).
function fakeShot(kind, hue) {
  const c = document.createElement("canvas");
  c.width = 900; c.height = kind === "wide" ? 520 : 1300;
  const g = c.getContext("2d");
  g.fillStyle = `hsl(${hue} 18% 12%)`; g.fillRect(0, 0, c.width, c.height);
  const rr = (x, y, w, h, r, col) => { g.fillStyle = col; g.beginPath(); g.roundRect(x, y, w, h, r); g.fill(); };
  if (kind === "wide") {
    rr(40, 40, 820, 440, 28, `hsl(${hue} 25% 92%)`);
    g.fillStyle = `hsl(${hue} 10% 55%)`; g.font = "34px -apple-system, sans-serif";
    g.fillText("17:00", 70, 120); g.fillText("18:00", 70, 260);
    rr(200, 150, 620, 120, 20, `hsl(${hue} 70% 85%)`);
    g.fillStyle = `hsl(${hue} 30% 20%)`; g.font = "600 40px -apple-system, sans-serif"; g.fillText("Встреча", 240, 210);
    g.fillStyle = `hsl(${hue} 10% 70%)`; g.font = "32px -apple-system, sans-serif"; g.fillText("встреча · портрет", 240, 252);
  } else {
    rr(40, 80, 820, 160, 30, `hsl(${hue} 60% 55%)`);
    rr(40, 270, 400, 200, 30, `hsl(${(hue + 40) % 360} 55% 50%)`);
    rr(460, 270, 400, 200, 30, `hsl(${(hue + 200) % 360} 45% 50%)`);
    for (let i = 0; i < 6; i++) rr(40, 520 + i * 120, 820, 96, 22, `hsl(${hue} 6% ${20 + (i % 2) * 3}%)`);
    g.fillStyle = "rgba(255,255,255,0.9)"; g.font = "600 52px -apple-system, sans-serif"; g.fillText("Пример экрана", 80, 180);
  }
  return new Promise(ok => c.toBlob(ok, "image/jpeg", 0.8));
}

// Texts of the sample entries, read from fillSamples itself so the two never drift apart.
const sampleTexts = () => new Set([...fillSamples.toString().matchAll(/mk\(\{ text: "([^"]+)"/g)].map(m => m[1]));

export async function removeSamples() {
  const texts = sampleTexts();
  const ids = new Set([...state.rawEntries.values()].filter(e => texts.has(e.text)).map(e => e.id));
  if (!ids.size) return 0;
  const paths = [];
  for (const id of ids) {
    paths.push(entryPath(id), ...(state.rawEntries.get(id).attachments || []));
  }
  for (const ev of state.events) if (ids.has(ev.entry)) paths.push(eventPath(ev.id));
  await removeFiles(paths);
  return ids.size;
}

export async function fillSamples() {
  await clearAll();
  await writeRegistry(SEED_REGISTRY);
  const now = Date.now(), H = 3600e3, D = 24 * H;
  const at = (ago) => new Date(now - ago);
  const day = n => { const d = new Date(now + n * D); return d.toISOString().slice(0, 10); };
  const shot1 = await fakeShot("wide", 40), shot2 = await fakeShot("tall", 210), shot3 = await fakeShot("tall", 300);
  const agent = tag => ({ by: "agent:" + tag });
  const mk = (o, ago) => createEntry({ ...o, at: at(ago) }, { silent: true });
  const ev = (f, ago, by) => addEvent(f, { at: at(ago), silent: true, ...(by || {}) });

  // Light Plan
  const lp1 = await mk({ text: "идея для лайт план добавить свечение строке поиска", project: "light_plan", type: "idea", source: "siri" }, 4 * D);
  await ev({ entry: lp1, kind: "tag", add: "стекло" }, 4 * D - H);
  await ev({ entry: lp1, kind: "status", status: "taken" }, 3 * D, agent("light_plan"));
  await ev({ entry: lp1, kind: "question", text: "Свечение — только в тёмной теме или в обеих?" }, 3 * D - 2 * H, agent("light_plan"));
  await ev({ entry: lp1, kind: "status", status: "done_beta", commit: "a1b2c3d", channel: "beta" }, 20 * H, agent("light_plan"));

  const lp2 = await mk({ text: "В светлой теме, в дневном виде плохо читается текст, за какой срок надо сдать. Текст слишком светлый.", project: "light_plan", type: "bug", images: [shot1] }, 2 * D + 5 * H);
  await ev({ entry: lp2, kind: "tag", add: "светлая тема" }, 2 * D + 4 * H);
  await ev({ entry: lp2, kind: "status", status: "taken" }, 3 * H, agent("light_plan"));

  const lp3 = await mk({ text: "Откусывать цифры в барабане была плохая идея. Шаг по умолчанию 5 минут, в настройках — 5, 10, 30 минут.", project: "light_plan", type: "task" }, 9 * D);
  await ev({ entry: lp3, kind: "status", status: "taken" }, 8 * D, agent("light_plan"));
  await ev({ entry: lp3, kind: "status", status: "done_beta", commit: "57b435b", channel: "beta" }, 7 * D, agent("light_plan"));
  await ev({ entry: lp3, kind: "status", status: "verified" }, 5 * D);

  const lp4 = await mk({ text: "Когда блок маленький, информацию лучше не обрезать, а располагать справа — там пусто.", project: "light_plan", type: "idea", images: [shot2] }, 6 * D);
  await ev({ entry: lp4, kind: "status", status: "done_beta", commit: "ee5b4c3", channel: "beta" }, 4 * D, agent("light_plan"));
  await ev({ entry: lp4, kind: "status", status: "reopened" }, 2 * D);
  await ev({ entry: lp4, kind: "comment", text: "Справа не помещается при 3 и более событиях — нужен перенос на вторую строку?" }, 1 * D, agent("light_plan"));

  // PlanProjekt
  const pp1 = await mk({ text: "Плитки на главном — как в Напоминаниях, две в ряд, со счётчиком", project: "plan_projekt", type: "idea" }, 2 * H);
  const pp2 = await mk({ text: "Хронология: фильтр по проекту сверху", project: "plan_projekt", type: "task" }, 26 * H);
  await ev({ entry: pp2, kind: "dates", due: day(0) }, 25 * H);

  // Event OS
  const eo1 = await mk({ text: "ивент ос роль водителя показывать адрес следующей точки крупно", project: "event_os", type: "idea", source: "siri" }, 11 * D);
  const eo2 = await mk({ text: "Баг: в карточке клиента дата свадьбы съезжает на день назад", project: "event_os", type: "bug" }, 5 * D);
  await ev({ entry: eo2, kind: "status", status: "taken" }, 4 * D, agent("event_os"));
  await ev({ entry: eo2, kind: "status", status: "done_beta", commit: "9f3e1aa", channel: "beta" }, 2 * D, agent("event_os"));

  // BroniOS
  const bo1 = await mk({ text: "бронь ос в расписании зала Вегас пропадает вечерний слот", project: "broni_os", type: "bug", source: "siri" }, 3 * D);
  await ev({ entry: bo1, kind: "status", status: "taken" }, 2 * D, agent("broni_os"));
  await ev({ entry: bo1, kind: "dates", due: day(1) }, 2 * D);

  // others
  const cs1 = await mk({ text: "Проклятый меч: во второй сцене меч говорит шёпотом, когда игрок врёт", project: "cursed_sword", type: "idea" }, 13 * D);
  const ch1 = await mk({ text: "Круг: подпись оттенка кожи не помещается на маленьком экране", project: "color_harmony", type: "bug", images: [shot3] }, 20 * D);
  await ev({ entry: ch1, kind: "status", status: "done_beta", commit: "7cd7bc3", channel: "beta" }, 18 * D, agent("color_harmony"));
  await ev({ entry: ch1, kind: "status", status: "verified" }, 17 * D);
  const ts1 = await mk({ text: "Сайт Томсона: цены зала Сфера не обновились после правки", project: "tomson_site", type: "bug" }, 8 * D);
  const ts2 = await mk({ text: "томсон цены сфера не поменялись", project: "tomson_site", type: "bug", source: "siri" }, 8 * D - 3 * H);
  await ev({ entry: ts2, kind: "link", to: ts1, rel: "duplicate_of" }, 7 * D);
  await ev({ entry: ts2, kind: "status", status: "dropped" }, 7 * D);

  // Inbox: project not recognised
  await mk({ text: "идея для мячу добавить кубики в каждую сцену", type: "idea", source: "siri" }, 5 * H);
  const ib2 = await mk({ text: "не забыть посмотреть, как iOS 26 рисует стекло у кнопки «назад»", source: "text" }, 40 * 60e3);
  await ev({ entry: ib2, kind: "tag", add: "стекло" }, 39 * 60e3);
  await mk({ text: "баг в календаре неделя начинается с воскресенья", type: "bug", source: "siri" }, 30 * D);

  void pp1; void eo1; void cs1;
  await load();
}

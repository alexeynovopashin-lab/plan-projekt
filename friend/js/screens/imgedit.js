import { el, toast } from "../ui.js";
import { icon } from "../icons.js";

const COLORS = [["red", "#FF3B30"], ["yellow", "#FFCC00"], ["blue", "#0A84FF"]];
const MAX_EDGE = 2400;      

async function bitmapOf(blob) {
  if (window.createImageBitmap) return createImageBitmap(blob);
  return new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = URL.createObjectURL(blob); });
}
const canvasOf = (w, h) => { const c = document.createElement("canvas"); c.width = w; c.height = h; return c; };

function paintStroke(ctx, s, w) {
  ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = w; ctx.lineCap = "round"; ctx.lineJoin = "round";
  const p = s.pts;
  if (p.length === 1) { ctx.beginPath(); ctx.arc(p[0][0], p[0][1], w / 2, 0, 7); ctx.fill(); return; }
  ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
  for (let i = 1; i < p.length - 1; i++) ctx.quadraticCurveTo(p[i][0], p[i][1], (p[i][0] + p[i + 1][0]) / 2, (p[i][1] + p[i + 1][1]) / 2);
  const l = p[p.length - 1]; ctx.lineTo(l[0], l[1]); ctx.stroke();
}

export async function editImage(blob, { mode: start = "draw" } = {}) {
  const src = await bitmapOf(blob);
  return new Promise(resolve => {
    const ops = [];                      
    let color = COLORS[0][1], mode = start, cur = null, scale = 1, frame = null, live = null;
    const root = el(`<div class="ie" role="dialog" aria-label="Изменить картинку">
      <div class="ie-top"><button data-no>Отмена</button><b>Изменить картинку</b><button data-ok class="ie-done">Готово</button></div>
      <div class="ie-stage"><div class="ie-wrap"><canvas></canvas><div class="ie-crop" hidden><i data-h="nw"></i><i data-h="ne"></i><i data-h="sw"></i><i data-h="se"></i></div></div></div>
      <div class="ie-bar">
        <div class="ie-modes"><button data-m="draw">${icon("pencil")}Рисовать</button><button data-m="crop">Обрезать</button></div>
        <div class="ie-tools">
          <span class="ie-colors">${COLORS.map(([n, c]) => `<button data-c="${c}" aria-label="${n}" style="--c:${c}"></button>`).join("")}</span>
          <button data-apply hidden>Обрезать по рамке</button>
          <button data-undo aria-label="Отменить последнее">${icon("arrow.uturn.backward")}Отменить</button>
        </div>
      </div></div>`);
    const cv = root.querySelector("canvas"), wrap = root.querySelector(".ie-wrap"), cropEl = root.querySelector(".ie-crop");
    const stage = root.querySelector(".ie-stage");

    const lineW = () => Math.max(4, Math.round(Math.max(cur.width, cur.height) / 150));
    function replay() {
      let c = canvasOf(src.width, src.height); c.getContext("2d").drawImage(src, 0, 0);
      for (const o of ops) {
        if (o.t === "stroke") paintStroke(c.getContext("2d"), o, Math.max(4, Math.round(Math.max(c.width, c.height) / 150)));
        else { const n = canvasOf(o.w, o.h); n.getContext("2d").drawImage(c, o.x, o.y, o.w, o.h, 0, 0, o.w, o.h); c = n; }
      }
      cur = c;
    }
    function layout() {
      const r = stage.getBoundingClientRect();
      scale = Math.min((r.width - 24) / cur.width, (r.height - 24) / cur.height);
      cv.width = cur.width; cv.height = cur.height;
      cv.style.width = Math.round(cur.width * scale) + "px"; cv.style.height = Math.round(cur.height * scale) + "px";
      cv.getContext("2d").drawImage(cur, 0, 0);
      placeFrame();
    }
    function refresh() {
      replay(); layout();
      root.querySelector("[data-undo]").disabled = !ops.length;
      root.querySelectorAll("[data-m]").forEach(b => b.classList.toggle("on", b.dataset.m === mode));
      root.querySelector(".ie-colors").style.display = mode === "draw" ? "" : "none";
      root.querySelector("[data-apply]").hidden = mode !== "crop";
      cropEl.hidden = mode !== "crop";
      cv.style.cursor = mode === "draw" ? "crosshair" : "default";
    }
    function fullFrame() { frame = { x: 0, y: 0, w: cur.width, h: cur.height }; }
    function placeFrame() {
      if (!frame || frame.w > cur.width + 1 || frame.h > cur.height + 1) fullFrame();
      Object.assign(cropEl.style, { left: frame.x * scale + "px", top: frame.y * scale + "px", width: frame.w * scale + "px", height: frame.h * scale + "px" });
    }
    const changedFrame = () => frame && (frame.x > 0 || frame.y > 0 || Math.round(frame.w) < cur.width || Math.round(frame.h) < cur.height);
    function applyCrop() {
      if (!changedFrame()) return false;
      ops.push({ t: "crop", x: Math.round(frame.x), y: Math.round(frame.y), w: Math.max(1, Math.round(frame.w)), h: Math.max(1, Math.round(frame.h)) });
      frame = null; refresh(); return true;
    }

    const at = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) / scale, (e.clientY - r.top) / scale]; };
    cv.style.touchAction = "none";
    cv.addEventListener("pointerdown", e => {
      if (mode !== "draw" || !e.isPrimary) return;
      cv.setPointerCapture(e.pointerId);
      live = { t: "stroke", color, pts: [at(e)] };
      cv.getContext("2d").drawImage(cur, 0, 0); paintStroke(cv.getContext("2d"), live, lineW());
    });
    cv.addEventListener("pointermove", e => {
      if (!live || !e.isPrimary) return;
      for (const ev of (e.getCoalescedEvents ? e.getCoalescedEvents() : [e])) live.pts.push(at(ev));
      const g = cv.getContext("2d"); g.drawImage(cur, 0, 0); paintStroke(g, live, lineW());
    });
    const end = () => { if (!live) return; ops.push(live); live = null; refresh(); };
    cv.addEventListener("pointerup", end); cv.addEventListener("pointercancel", end);

    cropEl.style.touchAction = "none";
    let drag = null;
    cropEl.addEventListener("pointerdown", e => {
      cropEl.setPointerCapture(e.pointerId);
      drag = { h: e.target.dataset.h || "move", x: e.clientX, y: e.clientY, f: { ...frame } };
    });
    cropEl.addEventListener("pointermove", e => {
      if (!drag) return;
      const dx = (e.clientX - drag.x) / scale, dy = (e.clientY - drag.y) / scale, f = drag.f, min = 40;
      let { x, y, w, h } = f;
      if (drag.h === "move") { x = Math.min(Math.max(0, f.x + dx), cur.width - f.w); y = Math.min(Math.max(0, f.y + dy), cur.height - f.h); }
      else {
        if (drag.h.includes("w")) { const nx = Math.min(Math.max(0, f.x + dx), f.x + f.w - min); w = f.w + (f.x - nx); x = nx; }
        if (drag.h.includes("e")) w = Math.min(Math.max(min, f.w + dx), cur.width - f.x);
        if (drag.h.includes("n")) { const ny = Math.min(Math.max(0, f.y + dy), f.y + f.h - min); h = f.h + (f.y - ny); y = ny; }
        if (drag.h.includes("s")) h = Math.min(Math.max(min, f.h + dy), cur.height - f.y);
      }
      frame = { x, y, w, h }; placeFrame();
    });
    const endDrag = () => { drag = null; };
    cropEl.addEventListener("pointerup", endDrag); cropEl.addEventListener("pointercancel", endDrag);

    root.querySelectorAll("[data-m]").forEach(b => b.addEventListener("click", () => { mode = b.dataset.m; refresh(); }));
    root.querySelectorAll("[data-c]").forEach(b => b.addEventListener("click", () => { color = b.dataset.c; paintColors(); }));
    const paintColors = () => root.querySelectorAll("[data-c]").forEach(b => b.classList.toggle("on", b.dataset.c === color));
    root.querySelector("[data-undo]").addEventListener("click", () => { ops.pop(); frame = null; refresh(); });
    root.querySelector("[data-apply]").addEventListener("click", () => { if (!applyCrop()) toast("Сдвиньте углы рамки"); });
    const close = v => { removeEventListener("resize", onResize); root.remove(); resolve(v); };
    root.querySelector("[data-no]").addEventListener("click", () => {
      if (ops.length || changedFrame()) { if (!confirm("Выбросить изменения?")) return; }
      close(null);
    });
    root.querySelector("[data-ok]").addEventListener("click", () => {
      if (mode === "crop") applyCrop();
      if (!ops.length) { close(null); return; }
      let out = cur;
      const k = Math.min(1, MAX_EDGE / Math.max(cur.width, cur.height));
      if (k < 1) { out = canvasOf(Math.round(cur.width * k), Math.round(cur.height * k)); out.getContext("2d").drawImage(cur, 0, 0, out.width, out.height); }
      out.toBlob(b => close(b), "image/jpeg", 0.85);
    });
    const onResize = () => { if (cur) layout(); };
    addEventListener("resize", onResize);

    document.body.appendChild(root);
    paintColors(); refresh();
  });
}

// First screen of the friend copy (Alexey, 17.11: «открываешь PWA - там инструкция»): how to connect
// his own GitHub, the two fields right here, and a check that they work before the app opens.
// Shown while the key is missing (FLAVOR.setup); reachable later from Settings.
import { el, esc, toast } from "../ui.js";
import { config, checkAccess } from "../sync.js";

const standalone = () => navigator.standalone === true || matchMedia("(display-mode: standalone)").matches;

export function openSetup({ again = false } = {}) {
  document.querySelector(".setup")?.remove();
  const c = config();
  const home = standalone();
  const s = el(`<div class="setup" role="dialog" aria-label="Подключение GitHub"><div class="setup-in">
    <h1>Подключите свой GitHub</h1>
    <p class="setup-lead">Записи хранятся в телефоне и сами уходят в ваш закрытый репозиторий на GitHub — оттуда их читает Claude Code на компьютере. Настройка один раз, минут пять.</p>
    <ol class="setup-steps">
      <li class="${home ? "done" : ""}"><b>Добавьте приложение на экран «Домой».</b> В Safari: кнопка «Поделиться» → «На экран „Домой“». Дальше открывайте его оттуда — у значка своя память, настройки из Safari туда не переносятся.${home ? " <span class=\"ok\">Готово</span>" : ""}</li>
      <li><b>Создайте пустой закрытый репозиторий.</b> <a href="https://github.com/new" target="_blank" rel="noopener">github.com/new</a> → имя, например <code>planprojekt-entries</code> → <b>Private</b> → Create repository.</li>
      <li><b>Создайте ключ только для него.</b> <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">Новый fine-grained token</a> → Repository access: <b>Only select repositories</b> → этот репозиторий → Permissions → Repository permissions → <b>Contents: Read and write</b> → Generate token. Скопируйте ключ: он начинается с <code>github_pat_</code> и показывается один раз.</li>
      <li><b>Вставьте оба значения ниже</b> и нажмите «Проверить».</li>
    </ol>
    <div class="group setup-form" style="--sep-left:16px">
      <label class="row"><span class="r-main">Репозиторий</span><input data-repo value="${esc(c.repo)}" placeholder="логин/planprojekt-entries" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="next"></label>
      <label class="row"><span class="r-main">Ключ</span><input data-token type="password" placeholder="${c.token ? "сохранён" : "github_pat_…"}" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="done"></label>
    </div>
    <div class="setup-err" hidden></div>
    <button class="setup-go">Проверить и начать</button>
    <p class="setup-note">Проверка прочитает репозиторий и запишет в него маленький файл <code>planprojekt.md</code> — так видно, что ключ может писать. Ключ хранится только в этом телефоне.</p>
    <button class="setup-skip">${again ? "Закрыть" : "Пока без GitHub — записи останутся в телефоне"}</button>
  </div></div>`);
  const err = s.querySelector(".setup-err"), go = s.querySelector(".setup-go");
  const fail = t => { err.textContent = t; err.hidden = false; };
  go.addEventListener("click", async () => {
    err.hidden = true;
    const repo = s.querySelector("[data-repo]").value;
    const token = s.querySelector("[data-token]").value || (c.token && repo.trim() === c.repo ? c.token : "");
    go.disabled = true; go.textContent = "Проверяю…";
    const r = await checkAccess(repo, token);
    go.disabled = false; go.textContent = "Проверить и начать";
    if (r.error) { fail(r.error); return; }
    s.remove();
    toast("GitHub подключён: " + r.repo);
  });
  s.querySelector(".setup-skip").addEventListener("click", () => s.remove());
  document.body.appendChild(s);
  return s;
}

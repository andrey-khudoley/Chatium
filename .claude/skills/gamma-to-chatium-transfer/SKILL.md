---
name: gamma-to-chatium-transfer
description: Перенос (клон 1:1) опубликованной страницы Gamma (gamma.app/docs/...) на Chatium как standalone-страницы в p/units/<unit>/pages/<id>/. Используй, когда нужно «перенести страницу с Гаммы», «скопировать лендинг из Gamma на Чатиум», «сделать десктоп 1-в-1 с Гаммой». Описывает захват DOM+CSS через Playwright, сборку standalone-страницы и решения известных проблем (Cloudflare, JS-фоновые картинки, маски, container-type:size, бистабильный height-chain).
---

# Gamma → Chatium: перенос страницы (десктоп 1:1)

Цель: получить на Chatium страницу, **попиксельно совпадающую** с десктопной Gamma. Подход — **буквальный клон**: захватить отрендеренный DOM + все CSS-правила Gamma, отдать как сырой HTML через `ctx.resp.html()`. Картинки оставляем ссылками на Gamma (`imgproxy/cdn/static.gamma.app`). Мобильную версию **не** трогаем здесь — см. [[gamma-mobile-adaptation]].

Эта инструкция выстрадана на реальном переносе (`p/units/neso/pages/a475`). Gamma — это Next.js/React + TipTap/ProseMirror + Emotion(CSS-in-JS) + Chakra, чей layout **поддерживается рантайм-JS**. Поэтому статический клон требует нескольких обязательных фиксов ниже — без них страница «схлопывается» или теряет картинки.

## Куда кладём результат

Standalone-проект (как `p/units/aley/annahredtech`) по пути = будущий URL:

```
p/units/neso/pages/a475/
  .dir.json          { "name": "[INWORK] p/units/neso/pages/a475", "params": { "startWorkspaceAppearance": "ai" } }
  .workspace.json    {}
  tsconfig.json      (копия из соседнего standalone-проекта)
  index.tsx          роут
  pageHtml.ts        export const PAGE_HTML = `...` (большой, ~500 КБ)
```

`index.tsx`:

```ts
import { PAGE_HTML } from './pageHtml'
export const a475PageRoute = app.get('/', async (ctx) => {
  return ctx.resp.html(PAGE_HTML) // app — глобал, не импортировать; resp.html отдаёт сырой HTML
})
export default a475PageRoute
```

URL получается file-based: каталог `p/units/neso/pages/a475` + роут `'/'` → `https://s.chtm.khudoley.pro/p/units/neso/pages/a475`.

Добавь `p/units/<unit>/pages/<id>/pageHtml.ts` в `.prettierignore` (огромный сгенерированный литерал).

## Конвейер

### 1. Захват в браузере (Playwright MCP)

1. `browser_navigate` на `https://gamma.app/docs/<id>`. **Cloudflare Turnstile** показывает «Один момент…» и отдаёт 403. Это НЕ нужно «решать» (запрещено обходить CAPTCHA) — просто **повтори navigate 1–6 раз**, обычно проходит само. Если стоит прокси с авторизацией — возможны редкие `ERR_INVALID_AUTH_CREDENTIALS`/407, тоже лечится повтором. **Важная тонкость:** как только заголовок стал `Gamma` (SPA загрузился, Cloudflare пройден) — **НЕ делай ещё один `navigate`**, он заново триггерит challenge и кидает обратно в «Один момент». Вместо этого сделай `browser_resize` (он же триггерит `?mode=doc`) и дальше работай evaluate'ами; в первом evaluate подожди `.doc-root` поллингом (до ~10 с), т.к. SPA дорисовывает документ ещё пару секунд.
2. `browser_resize` 1440×900 (эталонная десктоп-ширина).
3. Найди скролл-контейнер: контент Gamma скроллится **внутри `.doc-root`**, а не окна (`window.scrollY` всегда 0). Прокрути `.doc-root` до низа шагами с паузами — чтобы лениво подгрузились картинки и отрисовались все карточки (`.card-wrapper`). Карточки НЕ виртуализируются (все в DOM), ленятся только картинки.
4. **КРИТИЧНО — заинлайнить JS-фоновые картинки ДО захвата HTML.** Hero-дракон и тумбнейлы в Gamma — это `background-image`, проставляемые рантайм-JS; в `outerHTML` их НЕТ. Перед захватом пройди по `.doc-root *` и для элементов с `getComputedStyle(el).backgroundImage !== 'none'` и `http`-URL запиши `el.style.backgroundImage = computed` (+ backgroundSize/Position/Repeat).
5. Захвати **HTML**: `document.querySelector('.doc-root').outerHTML` → файл.
6. Захвати **CSS**: пройди `document.styleSheets`, собери `sheet.cssRules[*].cssText` в одну строку. Кросс-доменные листы (Google Fonts, Typekit) бросают `SecurityError` — их пропусти и добавь как `<link>` (см. ниже). Inline-листы Emotion (href=null) и `_next/*.css` читаются нормально.

`browser_evaluate` умеет сохранять результат в файл (`filename`) — но сохраняет как **JSON-строку** (с экранированным `\n`), при сборке делай `JSON.parse`.

### 2. Сборка PAGE_HTML (Node-скрипт)

```
<!DOCTYPE html>
<html lang="ru" style="background: rgb(245,245,246); overflow-x: hidden; overflow-y: auto;">
<!-- bg + overflow ставить инлайном на <html>, НЕ правилом в overrides; overflow-y:auto обязателен, см. фикс (f) -->

<head>
  <meta charset/viewport/title/description>
  <!-- шрифты, которые не прочитались из CSS (cross-origin) -->
  <link Inter, Bricolage Grotesque (Google Fonts), https://use.typekit.net/<id>.css>
  <style id="gamma-captured-css">{захваченный CSS, с фиксами URL/масок}</style>
  <style id="a475-overrides">{минимальные overrides — см. ниже}</style>
</head>
<body class="chakra-ui-light">
  {захваченный outerHTML .doc-root}
  <script>{reflow-nudge — см. ниже}</script>
</body>
</html>
```

Встраивание в `pageHtml.ts`: экранируй для backtick-литерала — `\` → `\\`, `` ` `` → `` \` ``, `${` → `\${`.

### 3. Обязательные фиксы CSS/HTML при сборке

**a) Абсолютизировать root-relative URL → gamma.app.** В CSS много `url(/_next/...)` (маски, шрифты). На нашем домене они 404. Замена: `url((['"]?)\/(?!\/)` → `url($1https://gamma.app/`. (И в HTML для `src="/..."`/`href="/..."`.) Это и есть «ссылки на ассеты остаются на Гамму».

**b) Маски-фигуры (accent shapes) — инлайнить как data-URI.** Gamma маскирует акцентные картинки через `mask-image: url(/_next/static/media/circle-{left,right,top}.svg)`. Даже абсолютизированный до gamma.app, **cross-origin mask-image блокируется CORS**, а сломанная маска делает элемент **полностью прозрачным** (hero-дракон «исчезает»). Решение: скачать эти SVG **через браузер** (curl ловит 403 от Cloudflare; `fetch('/_next/static/media/...')` со страницы gamma.app — same-origin, работает) и вставить как `url("data:image/svg+xml;base64,...")`. Маски крошечные (эллипсы ~157 байт).

**c) `container-type: size` → `inline-size`.** Один или **несколько** блоков-картинок имеют `container-type: size` (⇒ `contain: size`): они **игнорируют контент при расчёте высоты** и вне JS-layout Gamma схлопываются в 0, утягивая весь документ. Override **для каждого** такого селектора: `{ container-type: inline-size !important; }`. Авто-детект всех: `[...css.matchAll(/([^{}]+?)\{[^{}]*container-type:\s*size[^{}]*\}/g)]`. На разных страницах их 1–3 (хеши Emotion отличаются; иногда повторяются, напр. `.css-hfr192`). Те же селекторы должны попасть и в `OV` reflow-скрипта.

**d) Анимации появления.** Элементы `.animatable-on-load*` стартуют `opacity:0`/`transform` и показываются JS-ом (класс `site-animations-bootstrap`), которого у нас нет. Override: `[class*="animatable-on-load"] { opacity:1 !important; transform:none !important; }`.

**f) Скролл не работает (wheel/touch).** Захваченный CSS ставит `body { overflow: hidden }` (в редакторе Gamma скроллился `.doc-root`). У нас `body` разрастается до контента, а `html` остаётся `overflow: visible` → по правилу **overflow-propagation** вьюпорт берёт overflow у `body` (= hidden) → колесо/тач не скроллят (хотя `scrollTo` программно работает — легко обмануться при проверке!). Фикс: сделать `<html>` скролл-контейнером — инлайном `style="overflow-x:hidden; overflow-y:auto;"` на `<html>` (НЕ правилом в overrides; высоту html не трогать). Дополнительно продублировать в reflow-скрипте: `document.documentElement.style.overflowY='auto'`. Проверять скролл **реальным** действием (клавиша End / колесо), а не `window.scrollTo`.

Минимальный `#a475-overrides` (НИЧЕГО лишнего — см. фикс (e)):

```css
.css-hfr192 { container-type: inline-size !important; }
[class*="animatable-on-load"] { opacity: 1 !important; transform: none !important; }
```

### 4. Бистабильный height-chain (главная засада) и reflow-nudge

Symptom: на свежей загрузке `.card-wrapper` имеет `offsetHeight: 0`, `body` ≈ высота вьюпорта, контент «схлопнут». Причина: цепочка `height:100%` (ProseMirror/doc-node-root/…) + `contain:size` даёт **два устойчивых решения** layout (content-driven 6353px ИЛИ viewport-driven). Браузер на первом paint часто выбирает «схлопнутое».

Выводы, добытые экспериментально:
- **НЕ трогай height/overflow** в цепочке (`.doc-root`, wrappers, `.ProseMirror`): карточки берут высоту из **целой** `height:100%`-цепочки; `height:auto` на ней их обнуляет.
- **НЕ добавляй** в `#a475-overrides` правила `background`/`margin`/`display:none` (скрытие chrome) — они дестабилизируют и роняют layout в «схлопнутое» при рекалке. Фон страницы ставь на `<html>` инлайном; chrome (`.insert-card-button`) в статике и так невидим.
- Единственный надёжный триггер «расхлопывания» — **переписать textContent у `#a475-overrides`** (clear → reflow → reapply). `display`-toggle и вставка отдельного `<style>` НЕ помогают.

Reflow-nudge (кладётся в конец `<body>`; синхронный pulse без видимого мелькания, ретраи через rAF + на load/fonts/таймеры):

```html
<script>
(function () {
  var OV = '.css-hfr192{container-type:inline-size !important;}'
         + '[class*="animatable-on-load"]{opacity:1 !important;transform:none !important;}';
  function ok(){ var c=document.querySelector('.card-wrapper'); return !!c && c.offsetHeight>50; }
  function pulse(){ var s=document.getElementById('a475-overrides'); if(!s) return;
    s.textContent=''; void document.body.offsetHeight; s.textContent=OV; void document.body.offsetHeight; }
  function fix(n){ if (window.innerWidth<=768) return;   // мобилка — отдельный слой, см. [[gamma-mobile-adaptation]]
    if (ok()) return; pulse(); if(!ok()&&n>0) requestAnimationFrame(function(){fix(n-1);}); }
  function run(){ fix(40); }
  if (document.readyState!=='loading') run();
  document.addEventListener('DOMContentLoaded', run); window.addEventListener('load', run);
  if (document.fonts&&document.fonts.ready) document.fonts.ready.then(run);
  [80,250,600,1200,2500,4000].forEach(function(t){setTimeout(run,t);});
})();
</script>
```

Важно: `OV` в скрипте должен **точно совпадать** с содержимым `#a475-overrides` (скрипт его перезаписывает; всё, чего там нет, потеряется при pulse).

### 5. Синхронизация в dev (s) и проверка

Sync-агент: `D:\Users\andrey\.codex\skills\chatium-sync-agent\scripts\chatium-sync-agent.mjs` (расширение Chatium Sync; см. также skill `chatium-sync-agent`).

Воркспейс обычно в «грязном» состоянии (локальные удаления + local-only файлы), поэтому полный `--apply` упрётся в гейт. Точечно и безопасно (только изменённые файлы, без удалений с сервера):

```
node <agent> --workspace s.chtm.khudoley.pro --dry-run --run-id check          # посмотреть план
node <agent> --workspace s.chtm.khudoley.pro --apply --no-new --allow-mixed-create-delete --run-id apply
```

- `--no-new` — не заливать 500+ чужих local-only файлов; наши `index.tsx`/`pageHtml.ts` идут как `localChanged` и зальются. (Если проект новый и `.dir.json`/`tsconfig` тоже нужны на сервере — сделай отдельный заход без `--no-new`, ограничив область, либо убедись, что проект уже зарегистрирован прошлым деплоем.)
- `--allow-mixed-create-delete` — снять гейт; **без `--delete-remote`** удалений на сервере НЕ происходит.

Проверка в браузере (Playwright): открой `https://s.chtm.khudoley.pro/p/units/<unit>/pages/<id>?v=N` (меняй `v` для обхода кэша). Убедись на **свежей** загрузке: `.card-wrapper` offsetHeight > 50, `body.scrollHeight` ≈ высоте Gamma-дока (для a475 = 6353), hero-дракон и тумбнейлы видны, маска-арка на месте. Сравни посекционно скриншоты с Gamma (прокручивая `.doc-root` на Gamma и `window` на клоне к тем же оффсетам).

## Готовый конвейер (для серии страниц)

Скрипты в корне общей папки (`D:\Users\andrey\AppData\Roaming\Cursor\User\globalStorage\chatium.chatium-sync\`) — переиспользуемые, не привязаны к id:

- **`build-gamma.cjs <id>`** — читает `gamma-<id>-html.txt` / `gamma-<id>-css.txt` / `content-<id>.json`, авто-детектит `container-type:size`-селекторы и маски, абсолютизирует URL, собирает десктоп-клон + мобильный слой ([[gamma-mobile-adaptation]]) и пишет проект в `p/units/neso/pages/<id>/`. Title/desc берёт из `content-<id>.json` (или `gamma-<id>-meta.json`). Маски `circle-left/right/top` — **стандартные SVG Gamma**, одинаковые на всех страницах (отличается только хеш в имени), поэтому вшиты как data-URI по базовому имени; неизвестную форму скрипт залогирует — тогда дотащи её SVG через браузер и добавь в `MASK_SVGS`.
- На страницу — 4 `browser_evaluate`: (A) скролл+инлайн фоновых картинок [side-effect], (B) `filename=gamma-<id>-html.txt` = `outerHTML`, (C) `filename=gamma-<id>-css.txt` = все `cssRules`, (D) `filename=content-<id>.json` = структурированный контент (для мобилки). `run_code_unsafe` использовать НЕЛЬЗЯ — там нет `require`/`import('fs')`.
- Затем: `printf "module.exports={MOBILE_HTML:require('./render-mobile.cjs').render(require('./content-<id>.json'))}" > <id>-mobile.cjs`, `node build-gamma.cjs <id>`, sync, проверка десктоп+мобилка.
- Разные страницы — разные акцентные темы (золото `#e7bf6a`, у некоторых красный `#DA1B2E` и т.п.). Десктоп клонируется буквально (тема сохраняется сама); мобилка перекрашивается под `--accent-color` (см. [[gamma-mobile-adaptation]]).

## Чек-лист

- [ ] Cloudflare пройден (повтором navigate, без обхода CAPTCHA)
- [ ] Проскроллен `.doc-root`, карточки и картинки подгружены
- [ ] Заинлайнены computed `background-image` ДО захвата `outerHTML`
- [ ] Захвачены `.doc-root` outerHTML + все читаемые cssRules
- [ ] `url(/...)` абсолютизированы на gamma.app
- [ ] Маски `circle-*.svg` инлайнены как data-URI (иначе hero невидим)
- [ ] `container-type: size` → `inline-size`
- [ ] `animatable-on-load` → opacity:1/transform:none
- [ ] height/overflow цепочки НЕ переопределены; cosmetics не в overrides
- [ ] `<html>` инлайном `overflow-y:auto` (иначе wheel/touch-скролл мёртв из-за propagation)
- [ ] reflow-nudge скрипт добавлен, `OV` == `#a475-overrides`
- [ ] Шрифты (Inter/Bricolage/Typekit) подключены `<link>`
- [ ] Синхронизировано в s (`--apply --no-new --allow-mixed-create-delete`)
- [ ] Проверено в браузере на свежей загрузке (десктоп 1:1)
- [ ] `pageHtml.ts` в `.prettierignore`

## Связанные

- [[gamma-mobile-adaptation]] — отдельный мобильный слой поверх клона
- skill `chatium-sync-agent` — флаги синхронизации/коммита
- Пример: `p/units/aley/annahredtech` (standalone-страница через `app.html`)

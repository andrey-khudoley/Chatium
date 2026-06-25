---
name: verification-runner
description: Плейбук технических проверок Chatium — строгая проверка типов (vue-tsc), стиль (Prettier), стандарты, роутинг, рантайм, соответствие платформе, тесты. Собирает результаты в единый отчёт. ИСПОЛНЯЕТСЯ ОСНОВНЫМ ЧАТОМ (по /check или как фаза верификации в конвейере /ppN) — это НЕ субагент, его нельзя запускать через Agent tool. Checker'ов порождает напрямую основной чат.
tools: Agent, Read, Grep, Glob, Bash
model: inherit
---

> **Как исполнять этот файл.** Это **плейбук, а не субагент.** Его читает и исполняет **основной чат** (по команде `/check` или как фаза верификации внутри конвейера `/ppN`). Запускать `verification-runner` через Agent tool **запрещено**: он сам порождает checker'ов через Agent, а субагент вложенных субагентов порождать не может. Поэтому проверки оркеструет основной чат.

Ты — оркестратор технических проверок. Твоя задача — запустить все предусмотренные проверки на затронутых файлах и собрать **единый структурированный отчёт** с приоритизированными проблемами.

## Ключевой принцип

Ты не выполняешь работу checker'ов сам. Ты порождаешь их через инструмент **Agent** (ты — основной чат, тебе это можно) и агрегируешь их выводы. Сам ты выполняешь только то, что нельзя делегировать: проверку типов и стиля через Bash и определение тестов проекта.

## Вход

<input>
- Список затронутых файлов / путей (если передан вызывающим агентом)
- Ключевое слово режима «весь workspace» (`--all` / `всё` / `workspace`) — если передано
- Иначе: `git diff --name-only` + untracked
</input>

## Режим проверки

- **Фрагмент** (по умолчанию): проверяются переданные пути или затронутые файлы.
- **Весь workspace**: если вызывающий передал `--all` / `всё` / `workspace`, проверки типов и стиля запускаются без аргументов (по всему workspace), а sub-checker'ам передаётся, что охват — весь репозиторий.

## Workflow

### Шаг 1. Определи затронутые файлы

```bash
git diff --name-only HEAD
git ls-files --others --exclude-standard
```

Отфильтруй релевантные: `.ts`, `.tsx`, `.vue`, файлы в `api/`, `pages/`, `tables/`, `lib/`, `repos/`, `shared/`, `components/`, `config/`. Зафиксируй список — он понадобится для передачи в sub-checker'ов.

### Шаг 2. Строгая проверка типов (vue-tsc)

Запускается **из корня workspace** через единый скрипт. Он для каждого проекта генерирует строгий конфиг (наследует корневой `tsconfig.json`: `strict: true`, `noUncheckedIndexedAccess`, реальные глобальные типы `@app/types`/`@app/ui`), исключает облегчённые локальные шимы (`jsx.d.ts`, `vue-shim.d.ts`) и проверяет `.vue` через `vue-tsc`.

- **Фрагмент:** передай затронутые пути (файлы или каталоги проектов):
  ```bash
  node scripts/check-types.mjs <путь1> <путь2> ...
  ```
- **Весь workspace:**
  ```bash
  node scripts/check-types.mjs
  ```

Сохрани вывод и итоговое число ошибок (строка `ИТОГ (типы)`). Это объективная проверка — не пропускай её. Не используй проектные `tsconfig.json` напрямую и не зови `tsc`/`vue-tsc` вручную — только этот скрипт (npm-алиас: `npm run typecheck [-- <пути>]`).

### Шаг 3. Проверка стиля (Prettier)

Правила — в `.prettierrc` (корень workspace), исключения — `.prettierignore`.

- **Фрагмент:** `node scripts/check-style.mjs <путь1> <путь2> ...`
- **Весь workspace:** `node scripts/check-style.mjs`

Сохрани список файлов с нарушениями и итог (строка `ИТОГ (стиль)`). Правки не вноси: автоформат (`--fix` / `npm run style:fix`) — только по явному запросу пользователя, не в рамках проверки.

### Шаг 4. Параллельный запуск checker'ов

**Важно:** все checker'ы независимы друг от друга. Порождай их через **Agent** в **одном сообщении** с несколькими tool calls параллельно (fan-out). Каждому передай:

- общий контекст задачи (формализация, acceptance criteria — если есть)
- **точный список затронутых файлов** (из шага 1) — чтобы они не пересчитывали git diff заново

Checker'ы:

1. `standards-checker` — стандарты 001-standards.md (haiku)
2. `file-based-routing-checker` — роутинг и ссылки (haiku)
3. `runtime-architecture-checker` — рантайм-баги и архитектура (opus)
4. `chatium-platform-checker` с **mode=code** — соответствие подсистемам платформы по `inner/docs/` (opus)

### Шаг 5. Тесты

В Chatium нет единого CLI для запуска тестов. Определи способ:

- **Каталог `tests/`** в корне проекта с `tests/index.tsx` — описать как запускать (страница `./web/tests`).
- **Облегчённый контур:** `api/tests/endpoints-check/*` + `api/tests/list.ts` + `pages/TestsPage.vue` — описать ручной сценарий (страница тестов, вызов роутов).
- **`*.test.ts`** — если есть и есть скрипт в package.json — запустить.
- **Если тестов нет** — отметь «не применимо».

Не пытайся вызвать `ctx`-зависимые тесты в изолированной среде — `ctx` приходит от платформы.

### Шаг 6. Runtime Verification (деплой + браузер + серверные логи)

Выполняется основным чатом через Playwright MCP. Условие: затронуты `pages/`, `api/` или роуты. При чисто статических правках — пропустить, отметив в отчёте «не применимо».

**6.1 Деплой на dev-сервер:**

```powershell
$syncScript = 'D:\Users\andrey\.codex\skills\chatium-sync-agent\scripts\chatium-sync-agent.mjs'
node $syncScript --workspace s.chtm.khudoley.pro --apply --no-new --allow-mixed-create-delete --run-id rt-apply
```

**6.2 Авторизация в Playwright (если браузер ещё не авторизован):**

Используй навык **`chatium-server-logs`** — там пошаговая инструкция с готовым кодом авторизации через `browser_evaluate`.

Кратко: `browser_navigate` → `/s/auth/password?it=Phone&ik=79034375443&back=/s/dev/logs&layout=empty`, затем `browser_evaluate` с прямым fetch (SHA256-хеш пароля).

**6.3 Навигация к затронутым страницам:**

`browser_navigate` к URL каждого изменённого роута. URL = `https://s.chtm.khudoley.pro/<путь роута>`.

**6.4 Браузерные логи:**

```
mcp__playwright__browser_console_messages
```

Ошибки (Errors > 0) → блокируют. Предупреждения → оценивай по смыслу.

**6.5 Серверные логи (DOM-парсинг через navigate):**

> `/s/dev/logs` через fetch всегда возвращает HTML. Единственный рабочий способ — `browser_navigate` с параметрами, затем DOM-парсинг.

```
// 6.5.1: Перейти на страницу логов с фильтром
mcp__playwright__browser_navigate:
  url: https://s.chtm.khudoley.pro/s/dev/logs?from=now-5m&to=now&level=&search=appSlug%3D<SLUG_ПРОЕКТА>
// Slug = владелец/имя из пути p/units/<owner>/<slug>, например: aley%2Fbpm
```

```js
// 6.5.2: browser_evaluate — извлечь записи из DOM
() => {
  const datePattern = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/;
  let container = null;
  for (const el of document.querySelectorAll('span, div')) {
    if (el.children.length === 0 && datePattern.test(el.textContent)) {
      container = el.parentElement?.parentElement?.parentElement;
      break;
    }
  }
  if (!container) return { totalEntries: 0, errors: 0, warns: 0, entries: [] };
  const entries = Array.from(container.children);
  const parsed = entries.map(e => {
    const color = e.children[0]?.style?.backgroundColor || '';
    const timestamp = e.children[1]?.textContent?.trim().slice(0, 30) || '';
    const msg = e.children[2]?.textContent?.trim() || '';
    const isWarnColor = color === 'rgb(234, 184, 57)';
    const isError = !isWarnColor && (msg.toLowerCase().includes('error') ||
                    msg.toLowerCase().includes('exception') ||
                    (msg.toLowerCase().includes('failed') && msg.includes('500')));
    const isWarn = isWarnColor || msg.toLowerCase().includes('warn') ||
                   (msg.toLowerCase().includes('failed') && !isError);
    return { timestamp, color, isError, isWarn, msg: msg.slice(0, 400) };
  });
  return { totalEntries: parsed.length, errors: parsed.filter(e => e.isError).length,
           warns: parsed.filter(e => e.isWarn).length, entries: parsed };
}
```

Цвета: `rgb(125, 177, 108)` = info (норма), `rgb(234, 184, 57)` = warn (4). Признаки проблем: `isError: true`, слова `error`/`exception`/`failed 500`.

Полная документация по API логов и авторизации — в навыке **`chatium-server-logs`**.

### Шаг 8. Сборка отчёта

Агрегируй результаты в единый отчёт по формату ниже.

## Output

Ответ **строго в этом формате**:

```
## Отчёт verification-runner

**Режим:** фрагмент (N путей) / весь workspace
**Затронутые файлы:** N
- `<path>`
- `<path>`

---

### Типы (vue-tsc, строгая проверка)

**Команда:** `node scripts/check-types.mjs <пути|—>`
**Результат:** N ошибок / 0 ошибок

<если есть ошибки — список первых 10>
- `<file>:<line>` — <сообщение>

---

### Стиль (Prettier)

**Команда:** `node scripts/check-style.mjs <пути|—>`
**Результат:** N файлов с нарушениями / стиль в порядке

<если есть — список файлов>
- `<file>`

---

### Стандарты (standards-checker)

<сводка от sub-checker'а: N нарушений или «пройдено»>
**Критичные:** N
**Важные:** N
<краткий список топ-проблем или «без замечаний»>

---

### File-based роутинг (file-based-routing-checker)

<сводка>
**Замечания:** N
<краткий список или «без замечаний»>

---

### Рантайм и архитектура (runtime-architecture-checker)

<сводка>
**Критичные:** N
**Важные:** N
<краткий список или «без замечаний»>

---

### Соответствие платформе (chatium-platform-checker, mode=code)

<сводка: затронутые подсистемы, сверено с какими inner/docs>
**Критичные:** N
**Важные:** N
<краткий список или «без замечаний»>

---

### Тесты

**Способ запуска:** <страница ./web/tests / api/tests/endpoints-check / npm test / не применимо>
**Результат:** <пройдено N / провалено N / не запускались — почему / не применимо>

---

### Runtime Verification

**Деплой:** <выполнен / пропущено — почему>
**Браузер:** <0 ошибок / N ошибок — список>
**Серверные логи (appSlug=<slug>, last 5m):** <N записей, ошибок нет / N error-записей — список>
**Итог:** <ОК / есть проблемы / пропущено>

---

## Общий вердикт

🟢 **Все проверки пройдены** — можно завершать.

или

🟡 **Есть проблемы** — требуется N исправлений:

**Критичные** (блокируют):
1. <источник: типы / стиль / standards / routing / runtime> — `<file>:<line>` — <проблема>
2. ...

**Важные** (нужно поправить):
1. ...

**Рекомендации**:
1. ...

**Следующий шаг:** <вернуться к шагу реализации / сделать локальные правки / задача готова к финальному отчёту>
```

## Anti-patterns

- ❌ Не объявляй Runtime Verification «не применимо» для задач с изменениями pages/api/routes — только для чисто статических правок.
- ❌ Не используй `browser_fill_form`/`browser_type` для авторизации — Vue не захватывает значение; используй `browser_evaluate` с прямым fetch (см. навык `chatium-server-logs`).
- ❌ Не читай логи через UI («Показать») и не делай `fetch('/s/dev/logs', ...)` — endpoint всегда возвращает HTML, не JSON. Правильно: `browser_navigate` к `/s/dev/logs?from=...&search=...`, затем DOM-парсинг в `browser_evaluate`.
- ❌ Не запускай сам себя (`verification-runner`) через Agent tool — вложенные субагенты невозможны, checker'ы не запустятся. Проверки оркеструет основной чат.
- ❌ Не выполняй проверку стандартов / роутинга / рантайма / соответствия платформе сам — это работа checker'ов.
- ❌ Не запускай checker'ов последовательно — они независимы, порождай параллельно в одном сообщении.
- ❌ Не вноси правки в код — твоя зона только проверки и отчёт.
- ❌ Не пропускай проверку типов и стиля даже если кажется, что код «выглядит нормально» — это объективные проверки.
- ❌ Не запускай `tsc`/`vue-tsc`/`prettier` вручную и не используй проектные `tsconfig.json` напрямую — только `scripts/check-types.mjs` и `scripts/check-style.mjs` (иначе потеряешь строгие настройки и реальные типы).
- ❌ Не автоформатируй код (`--fix`) в рамках проверки — это правка, делается только по явному запросу.
- ❌ Если sub-checker вернул ошибку или таймаут — отметь это в отчёте, не молчи.

## Язык

Ответ — на **русском**.

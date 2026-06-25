---
name: pp-orchestrator
description: Плейбук масштабируемого конвейера разработки Chatium-задачи с уровнем глубины 1–10. ИСПОЛНЯЕТСЯ ОСНОВНЫМ ЧАТОМ по командам /pp1…/pp10 — это НЕ субагент, через Agent tool его запускать нельзя. Уровень определяет модели, число шагов, параллелизм и бюджет цикла правок: pp1 — минимум шагов и слабые модели (быстро/дёшево), pp10 — тяжёлые модели и максимальная автономная проработка.
tools: Agent, Read, Edit, Write, Glob, Grep, Bash
model: inherit
---

> **Как исполнять.** Это плейбук, не субагент. Его читает и исполняет **основной чат** (где дана `/ppN`). Запускать `pp-orchestrator` через Agent tool нельзя — основной чат должен сам порождать субагентов (вложенный спавн невозможен). Уровень `N` (1–10) приходит из команды `/ppN`.

Ты — оркестратор конвейера. Веди задачу по профилю уровня `N`. Делегируешь роли субагентам через Agent tool; сам делаешь оркестрацию, статические проверки через Bash, решения в циклах и финальный отчёт.

## Принцип: дёшево по умолчанию, дорого по требованию

Стоимость почти целиком определяется **моделью** и **числом спавнов агентов**. Поэтому:

- **Модель — минимально достаточная.** Sonnet тянет планирование и ревью на большинстве задач; Opus — только для тяжёлого рассуждения на верхних уровнях. Haiku — механика.
- **Один спавн на роль на фазу.** НИКОГДА не дублируй вызов одного агента. Параллельный fan-out = разные роли в одном сообщении, не одна роль дважды.
- **Каждому агенту — точный список файлов** (из `git diff`/плана), не «прочитай весь проект». Это режет cache-read токены кратно.
- **Статику (типы/стиль/тесты) гоняет основной чат через Bash**, не агент.
- **Консолидированное ревью на средних уровнях:** один `code-reviewer` уже покрывает 10 областей (баги, типы, безопасность, edge cases, API, архитектура, Chatium-специфика, стандарты). Отдельные `standards/routing/runtime`-checker'ы и `chatium-platform-checker` добавляются ТОЛЬКО на верхних уровнях как дешёвое параллельное подтверждение.
- **Не over-верифицируй простое.** Лишний раунд ревью на однострочной правке — чистый расход.

## Матрица уровней

Колонки: **Form** (формализация), **Plan**, **PlanRev** (ревью плана), **Impl** (реализация), **CodeRev** (ревью кода), **Gate** (platform-checker), **Cmpl** (completeness), **Fix** (макс. итераций правок), **Docs**, **Report**.
Модели: `main` = текущая модель сессии, H = haiku-4.5, S = sonnet-4.6, O = opus-4.8.

| N | Form | Plan | PlanRev | Impl | CodeRev | Gate | Cmpl | Fix | Docs | Runtime | Report |
|---|------|------|---------|------|---------|------|------|-----|------|---------|--------|
| 1 | inline | — | — | main (сам) | — (статика) | — | — | 0 | — | — | 2 строки+метрики |
| 2 | inline | — | — | main (сам) | self (сам) | — | — | 1 | — | — | кратко+метрики |
| 3 | inline | inline (сам) | — | implementer S | code-reviewer S | — | — | 1 | — | rt?* | кратко+метрики |
| 4 | inline | planner S | — | implementer S | code-reviewer S | — | — | 2 | docs-keeper H* | rt?* | средне+метрики |
| 5 | formalizer H* +Q | planner S | plan-reviewer S | implementer S | code-reviewer S | — | — | 2 | docs-keeper S* | rt S | средне+метрики |
| 6 | formalizer S +Q | planner S | plan-reviewer S | implementer S | code-reviewer S + standards H + routing H + logs H | platform S (code) | — | 2 | docs-keeper S* | rt S | полный+метрики |
| 7 | formalizer S +Q | planner O | plan-reviewer S + platform S (plan) | implementer S | code-reviewer O + standards H + routing H + runtime O + logs H | platform O (code) | — | 3 | docs-keeper S | rt S | полный+метрики |
| 8 | formalizer S +Q | planner O | plan-reviewer O + platform O (plan) | implementer S | fan-out O (code-reviewer O + platform O + standards H + routing H + runtime O + logs H) | вкл. в fan-out | plan+code H | 3 | docs-keeper S | rt S | полный+метрики |
| 9 | formalizer S +Q | planner O | full gate O + completeness H | implementer S/O** | fan-out O + adversarial 2-й проход критичных + logs H | вкл. | plan+code H | 3 + loop-until-clean | docs-keeper S | rt S | полный+метрики |
| 10 | formalizer S +Q | 2×planner O → выбор лучшего | full gate O + completeness H | implementer S/O** | fan-out O + adversarial + 2 чистых раунда подряд + logs H | вкл. | plan+code H | до сходимости (бюджет ~1.5–2 ч) | docs-keeper S | rt S | полный+метрики |

> **Метрики — на всех уровнях (pp1–10).** Блоки «## Метрики цикла» (токены) и «## Лимиты подписки» (% лимита + Δ за прогон) и время прогона входят в финальный отчёт **любого** уровня. Шаги START и фазы G ниже выполняются всегда, независимо от глубины.

`*` Docs — только если задача затронула API / таблицы / роуты / архитектуру; иначе пропустить, отметив в отчёте.
`**` Impl на Opus — только если `implementer` (S) сам отметил блокер/сложность; иначе Sonnet.
`+Q` — формализатору разрешено задавать уточняющие вопросы пользователю (см. ниже). На pp1–4 вопросов не задаём — действуем по разумным дефолтам, фиксируя допущения.
`pp10` без вопросов — максимальная автономия: недостающее закрывается явными допущениями в отчёте.
`rt?*` Runtime verification — только если задача изменила pages/, api/ или routes (т.е. есть изменения поведения в браузере или ответах API). Пропустить при чисто утилитарных правках (типы, комментарии, конфиги).
`rt S` Runtime verification — выполняется всегда после прохождения статических проверок. Sonnet не используется (это действия оркестратора через Playwright MCP, не спавн агента).

**Переопределение модели** — через параметр `model` в Agent tool на каждом вызове (frontmatter агента не редактируем). Если в строке указана модель, отличная от дефолта агента, передавай `model:` явно.

## Исполнение по фазам

**START.** На **всех** уровнях (pp1–10) выполни **обе** команды одной связкой:

```bash
START=$(date "+%s"); echo "START=$START"          # запомни для метрик
node scripts/usage-limits.mjs --track-start $START # снимок % окон (5ч/7дн) + детач-таймер pre-reset
```

`--track-start` обязателен: без него в отчёте не будет Δ «сколько лимита ушло за прогон» (останется только абсолютный остаток). Таймстемп и track-start — единый шаг, не разрывай их.

**Фаза A — Постановка.**
- `inline`: основной чат сам пишет 3–6 проверяемых acceptance criteria из задачи и контекста чата. Без агента.
- `formalizer H/S`: `Agent task-formalizer` (нужной моделью). Если вернул вопросы и уровень допускает `+Q` — передай их пользователю **дословно**, заверши «Ожидаю ответ», **остановись**. Иначе закрой пробелы допущениями.

**Фаза B — План** (если в строке есть Plan).
- `inline`: основной чат пишет мини-план (затронутые файлы, порядок) сам.
- `planner S/O`: `Agent planner`. На pp10 — 2 параллельных `planner` (разные акценты), сам выбери лучший/синтезируй.
- `PlanRev`: параллельным fan-out (одно сообщение, разные роли) запусти указанных ревьюеров. `completeness` — только где указано. Реши: план готов / правка (вернись к Plan, ≤ Fix итераций).

**Фаза C — Реализация.**
- `main (сам)`: правь код сам (Edit/Write) — для pp1–2, где спавн агента дороже самой правки.
- `implementer S`: `Agent implementer` с планом-контрактом, корнем проекта, запретом расширять scope. Прими список изменённых файлов; затем сам зафиксируй `git diff --name-only` + untracked — этот список идёт во все проверки.

**Фаза D — Верификация.**
- Всегда: основной чат через Bash — `node scripts/check-types.mjs <пути>` и `node scripts/check-style.mjs <пути>` по затронутым файлам (стиль чинить `--fix`). Тесты — если есть и применимо.
- `self`: основной чат сам перечитывает диф и проверяет логику (без агента).
- `code-reviewer`: ОДИН вызов, диф-скоуп; на уровнях без отдельных checker'ов (pp3–5) проси покрыть и стандарты/роутинг/рантайм/платформу/логирование в том же проходе (области 1–11); на pp6+ логирование проверяет отдельный `logging-coverage-checker`, передай это в промпте code-reviewer («область 11 — у logs-checker»).
- Отдельные `standards/routing/runtime/logs`-checker и `platform`-gate — параллельным fan-out (одно сообщение) только где указаны в матрице.
- `logging-coverage-checker` (H на pp6–7, H на pp8–10): проверяет покрытие логами всех веток в серверных файлах (`lib/`, `api/`, `webhook/`). Передавай точный список изменённых файлов (только `.ts/.tsx` в этих каталогах). **Стандарт severity:** 7=debug/raw data, 6=info/бизнес-решения, 4=warn/аномалии, 3=error/вмешательство; catch не поглощают ошибку; PII только через флаги `hasEmail: true`.
- `adversarial` (pp9–10): по подтверждённым критичным находкам — отдельный скептик-проход, отсекающий ложные.

**Фаза E — Цикл правок.** Критичные/важные замечания → `implementer` с конкретным списком (мелкие ошибки типов/стиля чини сам). Затем повтори верификацию. Лимит — `Fix` из матрицы. `loop-until-clean` (pp9–10) — повторяй, пока находок нет или не исчерпан бюджет; на pp10 — до 2 чистых раундов подряд. После лимита — зафиксируй остаточные риски, не «допиливай любой ценой».

**Фаза F — Документация.** Где указано в матрице и если затронуты API/таблицы/роуты/архитектура. Иначе пропусти с пометкой.

Документы лежат в разных файлах — обновляй их **параллельно**, а не одним последовательным проходом (фаза тогда длится как самый долгий один файл, а не их сумма):

1. **Собери дайджест один раз.** По `git diff`/плану зафиксируй, что поменялось, по областям (api / data / architecture / README-changelog). Это единый источник для всех doc-агентов — они код повторно НЕ исследуют (контроль токенов: дайджест отдаётся каждому, а не N×чтение кода).
2. **Определи список документов**, которым реально нужна правка (не все 5 по умолчанию). `.CHATIUM-LLM.md` — только при изменении структуры указателей.
3. **Fan-out vs single-agent (порог окупаемости):**
   - **≥3 документа** → параллельный fan-out: в ОДНОМ сообщении запусти по одному `docs-keeper` (single-file режим) на каждый документ; каждому передай его единственный файл + дайджест + точные указания. Разные файлы → конфликтов записи нет.
   - **1–2 документа** → один `docs-keeper` (full-sweep): спавн N агентов не окупает overhead.
4. **LLM-лог `docs/LLM/` в этот fan-out НЕ входит и не параллелится:** это один нумерованный файл на задачу, номер — последовательная зависимость (CLAUDE.md §4). Ведёт основной чат отдельно (до/после fan-out).

**Фаза H — Runtime Verification.** Выполняется основным чатом через Playwright MCP (не агент). Цель — убедиться, что изменения работают на живом сервере перед финальным отчётом.

Условие запуска: матрица показывает `rt S` (всегда на pp5+) или `rt?*` (pp3–4, если изменены pages/, api/, routes). Пропустить при — чисто типовых/конфигурационных правках без изменения поведения.

**Шаг H.1 — Деплой на dev-сервер.**

```powershell
# Из корня сессии (не из s.chtm.khudoley.pro)
$syncScript = 'D:\Users\andrey\.codex\skills\chatium-sync-agent\scripts\chatium-sync-agent.mjs'
node $syncScript --workspace s.chtm.khudoley.pro --dry-run --run-id rt-dry
node $syncScript --workspace s.chtm.khudoley.pro --apply --no-new --allow-mixed-create-delete --run-id rt-apply
```

Если dry-run чистый — apply. Если есть неожиданные пути — разберись перед apply.

**Шаг H.2 — Авторизация в браузере через Playwright.**

```js
// mcp__playwright__browser_navigate
url: 'https://s.chtm.khudoley.pro/s/auth/password?it=Phone&ik=79034375443&back=/s/dev/logs&layout=empty'

// mcp__playwright__browser_evaluate (auth via fetch — не через форму)
async () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node;
  while (node = walker.nextNode()) {
    const v = node.__vue__;
    if (v?.$props?.block?.sendHashed) {
      const salt = v.$props.block.sendHashed.salt;
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest('SHA-256', enc.encode('123456Qq' + salt));
      const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
      const r = await fetch('https://s.chtm.khudoley.pro/s/auth/password', {
        method: 'POST', credentials: 'include',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({it:'Phone',ik:'79034375443',back:'/s/dev/logs',fromApiCall:false,s:{hash}})
      });
      return r.json();
    }
  }
}
// ожидай: {success: true, ...}
```

Учётные данные: phone `79034375443`, password `123456Qq`.

**Шаг H.3 — Навигация к затронутым страницам.**

Определи URL(s) затронутых роутов из плана/git diff. Например, если изменён `pages/BpmPage.vue` → `/p/units/aley/bpm/...`. Открой каждую страницу:

```js
// mcp__playwright__browser_navigate  url: 'https://s.chtm.khudoley.pro/<путь>'
```

**Шаг H.4 — Проверка браузерных логов.**

```js
// mcp__playwright__browser_console_messages
```

Ищи ошибки (`Errors > 0`). Предупреждения — оценивай по смыслу (network ошибки ресурсов — часто шум; JS ошибки — критично).

**Шаг H.5 — Проверка серверных логов.**

Определи appSlug проекта (из пути: `p/units/<owner>/<slug>` → appSlug = `<owner>/<slug>`).

> `/s/dev/logs` через fetch всегда возвращает HTML. Единственный рабочий способ — navigate + DOM-парсинг.

```
// mcp__playwright__browser_navigate (с фильтром по проекту и времени)
url: https://s.chtm.khudoley.pro/s/dev/logs?from=now-5m&to=now&level=&search=appSlug%3D<owner>%2F<slug>
```

```js
// mcp__playwright__browser_evaluate — DOM-парсер логов
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
    return { timestamp, color, isError, isWarn, msg: msg.slice(0, 300) };
  });
  return { totalEntries: parsed.length, errors: parsed.filter(e => e.isError).length,
           warns: parsed.filter(e => e.isWarn).length, entries: parsed };
}
```

Цвета: `rgb(125, 177, 108)` = info (норма), `rgb(234, 184, 57)` = warn (level 4).
Признаки проблем: `isError: true`, `isWarn: true` (не ожидаемые), `500`, `TypeError`, `undefined is not`.

**Шаг H.6 — Оценка результата.**

- Нет ошибок в браузере, нет error/warn в серверных логах → runtime ОК, переходи к Фазе F.
- Есть критичные ошибки → добавь в цикл правок (Фаза E), затем повтори H.1–H.5.
- Есть предупреждения / ожидаемые ошибки (например, 401 при анонимном запросе) → задокументируй в отчёте как «ожидаемо».

**Фаза G — Отчёт.** По глубине из матрицы. На **всех** уровнях (pp1–10) выполни **обе** команды — это обязательная пара, нельзя вставить «## Метрики цикла» без «## Лимиты подписки»:

```bash
END=$(date "+%s")   # <START> ниже — подставь число, запомненное на шаге START (shell-состояние между вызовами Bash НЕ сохраняется)
node scripts/pipeline-usage.mjs --since <START> --start <START> --end $END   # → блок «## Метрики цикла»
node scripts/usage-limits.mjs --track-end <START>                           # → блок «## Лимиты подписки»
```

`--track-end` гасит таймер и печатает «## Лимиты подписки»: остаток окон (5ч/7дн) + колонки Δ расхода за прогон и start → end (с учётом сброса). **Фоллбэк:** если `--track-start` на START был пропущен (нет start-записи) — всё равно покажи остаток, запустив `node scripts/usage-limits.mjs` (режим по умолчанию, без Δ). Блок «## Лимиты подписки» в финальном отчёте на **любом** уровне (pp1–10) — обязателен, его отсутствие = недоделанный отчёт. Скрипт сам резолвит OAuth-токен и при его отсутствии/ошибке печатает короткую пометку (отчёт не ломает). Формат отчёта — ниже.

## Формат финального отчёта

Краткий (pp1–3): задача (1 строка) · что изменено (файлы) · статус проверок (типы/стиль) · готовность к коммиту. **+ обязательно** блоки «## Метрики цикла» и «## Лимиты подписки» (как на всех уровнях) и время прогона.

Полный (pp4+):
```
## Итог (ppN)
**Задача:** <1–2 предложения>
**Acceptance criteria:** - [x]/[ ] по пунктам
**Что сделано:** - `<file>` — <кратко>
**Новые сущности:** Таблицы / API / Страницы — или «—»
**Проверено:** План <вердикт, итераций>; Код <вердикт, итераций>; TypeScript <0/N>; Стиль; Стандарты; Роутинг; Рантайм; Платформа; Тесты; Runtime <ОК / ошибки / пропущено — почему>
**Осталось открытым:** <риски>
**Документация:** <обновлена / не требовалась>
**Готовность к коммиту:** <да/нет — почему>
<блок «## Метрики цикла» — обязателен на всех уровнях (токены по моделям + время прогона)>
<блок «## Лимиты подписки» — ОБЯЗАТЕЛЕН на всех уровнях, сразу после метрик: остаток окон (сколько лимита осталось) + Δ за прогон (сколько ушло)>
```

## Стандарт покрытия логами

Применяется ко всем серверным файлам (`lib/`, `api/`, `webhook/`). Проверяется `logging-coverage-checker` с pp6; на pp3–5 — областью 11 `code-reviewer`.

### Severity-шкала

| Severity | Имя | Что логировать |
|----------|-----|----------------|
| 7 | debug | Сырые данные upstream (responseBody, httpStatus), intermediate values (amounts, ids, argsKeys), выбор ветки с объяснением |
| 6 | info | Входы/выходы публичных функций без PII, бизнес-решения, успех с durationMs |
| 4 | warn | Аномалии и пограничные случаи, не блокирующие поток (cache miss, event_not_found, stale entry) |
| 3 | error | Ситуации, требующие вмешательства разработчика (Heap-сбой, недоступный upstream, невалидная конфигурация) |

### Обязательно покрыть логом

- Каждая ветка `if/else/switch case` с бизнес-смыслом → лог с `reason`/`code`
- Каждый `catch`-блок → severity:3 или :4; `writeServerLog` в catch — во вложенном `try/catch` (fail-open)
- `default` в switch с `throw` → severity:3; с no-op → severity:7
- Ранний `return` (fail-fast) → severity:7 с причиной

### Исключения — лог не нужен

- Функции без `ctx` в параметрах (логирует вызывающий код)
- Тривиальные type guard без бизнес-смысла
- Vue-компоненты, `shared/`, `tables/`, `repos/`, тестовые файлы

### Безопасность payload

- Запрещено как значение: email, phone, password, token, api_key
- Через флаги: `hasEmail: true`, `hasToken: Boolean(token)`
- Допустимо: dealId, userId, op, gatewayId, amount, currency, durationMs, requestId, httpStatus

---

## Anti-patterns (расход без пользы)

- ❌ Дублировать вызов одного агента (две `planner`/`plan-reviewer` подряд) — кроме явного multi-candidate на pp10.
- ❌ Гонять Opus там, где профиль уровня предписывает Sonnet/Haiku.
- ❌ Давать агенту «прочитай весь проект» вместо точного списка файлов.
- ❌ Запускать отдельные standards/routing/runtime/logs-checker'ы на уровнях ≤5 (их покрывает code-reviewer областями 1–11).
- ❌ Спавнить агента ради правки, которую дешевле сделать самому (pp1–2).
- ❌ Запускать `pp-orchestrator` или `verification-runner` через Agent tool.
- ❌ Объявлять готовым без статической проверки типов/стиля.
- ❌ Пропускать Runtime Verification (Фаза H) на pp3+ при изменениях pages/api/routes — «статика прошла» не значит «на сервере работает».
- ❌ Использовать `browser_fill_form` для ввода пароля на Chatium-странице — Vue-компонент не захватывает значение; правильно: `browser_evaluate` с прямым fetch.
- ❌ Читать логи через `fetch('/s/dev/logs', ...)` или через UI-форму — `/s/dev/logs` всегда возвращает HTML; правильно: `browser_navigate` к URL с параметрами, затем DOM-парсинг в `browser_evaluate`.
- ❌ Полный 12-фазный цикл на тривиальную задачу — выбери уровень под сложность.
- ❌ Один `docs-keeper` последовательно правит ≥3 документа в разных файлах — раздай по файлу на агента и обнови параллельно (фаза длится как самый долгий один файл).
- ❌ Раздавать doc-агентам код на повторное исследование вместо единого дайджеста от оркестратора — это N×чтение без пользы.

## Выбор уровня (подсказка пользователю, если уровень очевидно не тот)

Если задача явно проще/сложнее запрошенного уровня — одной строкой предложи сменить (`/pp3` вместо `/pp8` и т.п.), но НЕ блокируй: выполняй запрошенный.
- pp1–2: опечатки, однострочники, переименования, правка строки/константы.
- pp3–4: локальная фича/багфикс в 1–3 файлах.
- pp5–6: фича со связями (api+lib+ui), нужен план и ревью.
- pp7–8: сложная фича, платформенные тонкости, гейты соответствия.
- pp9–10: крупная/рискованная задача, миграция, многофайловая переработка, нужна максимальная уверенность.

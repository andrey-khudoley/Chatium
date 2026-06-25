---
name: chatium-server-logs
description: Авторизация в s.chtm.khudoley.pro через Playwright evaluate (прямые запросы, без UI-взаимодействия) и чтение серверных логов через DOM после browser_navigate. Использовать для верификации после деплоя: браузерные ошибки + серверные логи.
---

# chatium-server-logs

Инструкция по авторизации и чтению серверных логов **прямыми запросами** — без взаимодействия с UI-формами Playwright. Авторизация — через `browser_evaluate` + fetch. Логи — через `browser_navigate` + DOM-парсинг.

> **Важно:** `/s/dev/logs` через fetch всегда возвращает HTML (SSR-страница, не JSON API). Единственный способ получить данные — `browser_navigate` к нужному URL с параметрами, затем извлечение из DOM.

---

## Авторизация (прямые запросы)

### Почему нельзя использовать `browser_fill_form` / `browser_type` для пароля

Поле пароля — Vue-компонент `TextInputBlock` с `name: "s"` и `sendHashed: { salt: "<hex>" }`. Форма **не отправляет пароль напрямую**: она вычисляет `SHA256(password + salt)` и посылает `s: { hash: "<hex>" }`. Playwright-заполнение через `fill`/`type` не триггерит Vue-реактивность корректно — пароль не попадает в тело POST.

**Правильный подход**: зайти на страницу пароля, затем выполнить `browser_evaluate` с прямым fetch.

### Шаг 1 — Перейти на страницу ввода пароля

```
mcp__playwright__browser_navigate:
  url: https://s.chtm.khudoley.pro/s/auth/password?it=Phone&ik=79034375443&back=/s/dev/logs&layout=empty
```

Страница должна открыться с заголовком «Вход по паролю».

### Шаг 2 — Авторизоваться через evaluate

```js
// browser_evaluate → function:
async () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let node, inputVue;
  while (node = walker.nextNode()) {
    const v = node.__vue__;
    if (v && v.$props && v.$props.block && v.$props.block.sendHashed) {
      inputVue = v;
      break;
    }
  }
  if (!inputVue) return { error: 'no input vue found' };

  const salt = inputVue.$props.block.sendHashed.salt;
  const password = '123456Qq';

  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(password + salt));
  const hash = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');

  const resp = await fetch('https://s.chtm.khudoley.pro/s/auth/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      it: 'Phone',
      ik: '79034375443',
      back: '/s/dev/logs',
      fromApiCall: false,
      s: { hash }
    }),
    credentials: 'include'
  });
  return await resp.json();
}
```

**Успешный ответ:** `{ success: true, appAction: [...] }` — сессионная cookie выставлена, браузер авторизован.

**Учётные данные:**
- Телефон: `79034375443`
- Пароль: `123456Qq`

### Шаг 3 — Проверить авторизацию

```
mcp__playwright__browser_navigate:
  url: https://s.chtm.khudoley.pro/s/dev/logs
```

Если заголовок страницы «Логи аккаунта» — авторизация прошла. Если редирект на `/s/auth/signin` — повторить шаг 2.

---

## Чтение серверных логов (DOM-парсинг)

> `/s/dev/logs` — SSR-страница. Fetch всегда возвращает HTML независимо от заголовков (Accept, X-Requested-With и т.д.). Единственный рабочий способ: `browser_navigate` → `browser_evaluate` для DOM-парсинга.

### Шаг 1 — Навигация с параметрами

```
mcp__playwright__browser_navigate:
  url: https://s.chtm.khudoley.pro/s/dev/logs?from=now-5m&to=now&level=&search=appSlug%3D<slug>
```

**Параметры URL:**

| Параметр | Значения | Описание |
|----------|----------|----------|
| `from`   | `now-1h`, `now-30m`, `now-5m`, ISO datetime | Начало периода |
| `to`     | `now`, ISO datetime | Конец периода |
| `level`  | `` (все), `3` (error), `4` (warn), `6` (info) | Уровень |
| `search` | Любой текст | Поиск; для фильтра по проекту: `appSlug%3D<slug>` |

Пример для проекта aley/bpm:
```
/s/dev/logs?from=now-5m&to=now&level=&search=appSlug%3Daley%2Fbpm
```

### Шаг 2 — Извлечение из DOM

Структура DOM каждой записи лога (выяснена эмпирически):
```
DIV[3]  ← log entry
  children[0]: DIV  — цветовая полоска (style.backgroundColor = уровень)
  children[1]: DIV  — левая колонка (textContent = timestamp "YYYY-MM-DD HH:MM:SS.mmm")
  children[2]: DIV  — сообщение (textContent = полный текст лога)
```

Контейнер с записями находится на 3 уровня выше первого SPAN с timestamp.

```js
// browser_evaluate:
() => {
  const datePattern = /\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}/;

  // Найти контейнер: SPAN(ts) → DIV(ts-col) → DIV(entry) → DIV(container)
  let container = null;
  for (const el of document.querySelectorAll('span, div')) {
    if (el.children.length === 0 && datePattern.test(el.textContent)) {
      container = el.parentElement?.parentElement?.parentElement;
      break;
    }
  }

  // Нет записей
  if (!container) return { totalEntries: 0, errors: 0, warns: 0, entries: [] };

  const entries = Array.from(container.children);

  const parsed = entries.map(e => {
    const color = e.children[0]?.style?.backgroundColor || '';
    const timestamp = e.children[1]?.textContent?.trim().slice(0, 30) || '';
    const msg = e.children[2]?.textContent?.trim() || '';

    // Цвет — первичный сигнал (сервер выставляет явно); текст — вторичный
    const isWarnColor = color === 'rgb(234, 184, 57)'; // warn (level 4) — жёлтый
    // Не ставим isError если сервер пометил warn-цветом (напр. 404 с текстом "NotFoundError")
    const isError = !isWarnColor && (
      msg.toLowerCase().includes('error') ||
      msg.toLowerCase().includes('exception') ||
      (msg.toLowerCase().includes('failed') && msg.includes('500'))
    );
    const isWarn  = isWarnColor ||
                    msg.toLowerCase().includes('warn') ||
                    (msg.toLowerCase().includes('failed') && !isError);

    return { timestamp, color, isError, isWarn, msg: msg.slice(0, 400) };
  });

  const errors = parsed.filter(e => e.isError);
  const warns  = parsed.filter(e => e.isWarn);

  return {
    totalEntries: parsed.length,
    errors: errors.length,
    warns: warns.length,
    entries: parsed  // полный список для дальнейшей фильтрации
  };
}
```

### Цветовая кодировка уровней

| Цвет (style.backgroundColor) | Уровень |
|-------------------------------|---------|
| `rgb(125, 177, 108)` = `#7DB16C` | info (6) — норма |
| `rgb(234, 184, 57)` = `#EAB839`  | warn (4) — предупреждение |
| красный / тёмно-красный           | error (3) — проблема |

### Формат сообщения лога

```
request complete
216.73.216.229 → GET /robots.txt → 200 in 168.27 ms
Host: s.chtm.aley.pro
TraceId: e138cacc70ced12fac9b346ce29ecc5b
accountId=4533 source=account statusCode=200 appSlug=telegram-auth
```

Ключевые поля в тексте: `Host`, `TraceId`, `Handler`, `EntryModule`, `Method`, `appSlug`.

### Как определить appSlug проекта

1. Путь проекта: `s.chtm.khudoley.pro/p/units/<owner>/<slug>/`
2. В логах — строка вида `appSlug=aley/bpm` в конце каждой записи
3. В `search` параметре: `appSlug%3D<owner>%2F<slug>` (URL-encoded `=` и `/`)

---

## Workflow для верификации после деплоя

Запускать **после** синхронизации изменений с dev-сервером (`chatium-sync-agent`), **до** финального отчёта.

### 1. Авторизоваться (если сессия не установлена)

```
browser_navigate → https://s.chtm.khudoley.pro/s/auth/password?it=Phone&ik=79034375443&back=/s/dev/logs&layout=empty
browser_evaluate → [auth script выше]
// Проверить result.success === true
browser_navigate → https://s.chtm.khudoley.pro/s/dev/logs
// Проверить Page Title === "Логи аккаунта"
```

### 2. Навигация к проверяемой странице

```
browser_navigate → https://s.chtm.khudoley.pro/<project-route>/
```

Это триггерит выполнение серверного кода и генерирует логи в проекте.

### 3. Проверка браузерной консоли

```
mcp__playwright__browser_console_messages
```

Искать `[ERROR]` и `[WARN]` записи. Ошибки типа `404`, `500`, `Cannot read properties of undefined` — блокеры.

### 4. Получить серверные логи

```
browser_navigate → https://s.chtm.khudoley.pro/s/dev/logs?from=now-5m&to=now&level=&search=appSlug%3D<slug>
browser_evaluate → [DOM-парсер выше]
```

### 5. Анализ результатов

Проверить:
- [ ] `totalEntries > 0` (подтверждение, что код выполнился)
- [ ] `errors === 0` — нет записей с error в тексте
- [ ] `warns === 0` или warns связаны не с новым кодом (цвет `rgb(234, 184, 57)`)
- [ ] `Handler` возвращает ожидаемые статусы (200, не 404/500)
- [ ] Нет `exception`, `undefined is not a function` в сообщениях

### 6. Отчёт

Если всё чисто: `Runtime-верификация пройдена. Ошибок в консоли: 0. Предупреждений в серверных логах: 0. Логи проекта появились (N записей).`

Если есть проблемы: привести `timestamp`, первые 300 символов `msg` для каждого найденного error/warn.

---

## Anti-patterns

- ❌ Не использовать `browser_fill_form` / `browser_type` для ввода пароля — Vue-реактивность не захватывает значение, пароль не попадает в POST-запрос
- ❌ Не делать `fetch('/s/dev/logs', ...)` — всегда возвращает HTML, независимо от заголовков (Accept, X-Requested-With, Content-Type). Данные только через `browser_navigate` + DOM
- ❌ Не пытаться POST к `/s/dev/logs` — 404, этот метод не поддерживается
- ❌ Не определять warn только по цвету — используй комбинацию цвета и текста сообщения
- ❌ Не игнорировать `browser_console_messages` — браузерные ошибки могут указывать на проблемы до серверного запроса
- ❌ Не считать `totalEntries === 0` всегда ошибкой — если проект не менял серверный код, логов за 5 мин может не быть; расширь диапазон до `now-30m` или проверь, что навигация к роуту была выполнена

# chatium-testing

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-testing/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/020-testing.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

# chatium-testing

Написание тестов для Chatium: проверки через HTTP к роутам приложения и при необходимости `route.run()` **внутри серверного обработчика**, где `ctx` уже передан платформой. Следует 020-testing.md. Использовать при написании или обновлении тестов.

## Когда использовать

- При добавлении или изменении API, страниц, логики приложения
- При требовании покрытия тестами или проверки регрессий
- В рамках конвейера (run-verification, финальные проверки)

## Два способа проверки API (где применимо)

1. **HTTP** к эндпоинту приложения (`fetch` / `request()` с cookie или заголовками) — на сервер приходит **реальный** `ctx` запроса (пользователь, аккаунт, Heap).
2. **`route.run(ctx, { body: … })` внутри кода тестового роута** — используется **тот же** `ctx`, что и у входящего запроса к этому роуту; это не «сборка мок-объекта ctx» в изолированном тесте.

Отдельные приложения могут дополнительно иметь каталог `tests/` с `tests/index.tsx` (см. 020-testing.md и примеры в репозитории).

**Облегчённый контур** (без обязательного `tests/`): `api/tests/endpoints-check/*` (один роут на файл), реестр в `api/tests/list.ts`, UI на `pages/TestsPage.vue` — клиент бьёт в GET/POST с сессией; на сервере тот же реальный `ctx`. В 020-testing.md — раздел «Контекст запроса (ctx) и варианты организации тестов». Пример проектной документации: `p/units/aom/lava_gc_integration/docs/testing.md`.

## Структура тестов (если используется шаблон с `tests/`)

- Каталог `tests/` в корне приложения
- Подкаталоги: `tests/unit/`, `tests/integration/`, `tests/ai/`
- Точка входа: `tests/index.tsx`

## Паттерны

- **`ctx` не подменяют** как в Jest: контекст — часть серверной среды Chatium. Интерактивные тесты со страницы `./web/tests` выполняются под **реальной** сессией пользователя (часто админа); проверки прав — через `requireAccountRole` / `requireAnyUser` в роуте.
- **Heap:** при необходимости изолированных данных — тестовые записи в Heap/отдельный аккаунт, а не «мок ctx».
- **Покрытие:** целевое покрытие ≥ 80% где договорено; happy path и основные edge cases.
- **Сценарии:** happy path, edge cases (пустые данные, граничные значения), ошибки авторизации, невалидные данные (body/query).

## Чеклист

- [ ] Где применимо: проверка через HTTP к API приложения (реальный `ctx` запроса)
- [ ] Где применимо: `route.run(ctx, …)` **внутри серверного тестового роута** — тот же `ctx`, что у GET/POST к этому роуту (не мок)
- [ ] Happy path покрыт
- [ ] Edge cases покрыты (пустые списки, null, границы)
- [ ] Ошибки авторизации проверены (401/403 при отсутствии прав)
- [ ] Невалидные данные проверены (неверный body, отсутствующие поля)

## Ссылки

- **020-testing.md** — полный гайд по тестированию на платформе Chatium

## Примеры

- `inner/samples/new_project/tests/` — структура и паттерны тестов
- `tg/pa_sample/tests/` — тесты в контексте Telegram-приложения (при наличии в репозитории)
- `p/units/aom/lava_gc_integration/docs/testing.md` — вкладки «Юнит» / «Интеграция», раздельные GET для GetCourse и Lava

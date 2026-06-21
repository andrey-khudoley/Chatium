# Сценарий B — quiz-table (client2)

## Назначение

`p/units/chatiumclub/client2` реализует **сценарий B**: посетитель отвечает на квиз → ответы сохраняются в Heap-таблицу `QuizAnswers` (Heap = SSOT квиза) → опционально синхронизируются в GetCourse через `updateUserCustomFields` (gateway → Legacy API).

Спецификация: `obsidian://second-brain/03_Projects/active/course-chatium-gc-integration-3fa7c2/docs/specifications/clients/quiz-table/app-scenario-b-quiz-table.md`.

## Поток

1. GET `/api/quiz/config` — описание квиза для UI: `{ quizId, questions: [...] }`. Источник истины — `lib/quizConfig.ts` (`QUIZ_QUESTIONS`).
2. POST `/api/quiz/save` (анонимно): `{ email, name?, answers: { [questionId]: value }, syncToGc?: boolean }`.
3. `lib/quizFlow.processQuizSubmit`:
   - валидация (`validateAnswers`): email формат, тип ответов (single-choice / multiple-choice / scale / text), required, options, scale-диапазон, maxLength;
   - запись нормализованных ответов в Heap-таблицу `QuizAnswers` (всегда, независимо от GC);
   - если `syncToGc !== false` — `invoke(ctx, { op: 'updateUserCustomFields', args: buildUpdateUserCustomFieldsArgs(email, normalized) })`.
4. Ответ роуту: `{ success, recordId, gcSync: { ok, skipped, errorCode?, requestId } }` или `{ success: false, validationErrors }`.

## Конфигурация

В админке (POST `/api/settings/save`) задаются три gateway-настройки (см. `lib/settings.lib`, ключи `GATEWAY_URL`, `GC_SCHOOL_HOST`, `GC_SCHOOL_API_KEY`) — те же, что и в client1/3/4. Без них `invoke` вернёт `error.code = SDK_NOT_CONFIGURED` (см. SDK-клиент).

## SDK-клиент

`lib/gateway/gatewayClient.ts` — локальная копия тонкого SDK с реестром поддерживаемых `op` (`shared/v1OpsList.generated.ts`). В client2 используется: `updateUserCustomFields`.

## Структура квиза

`lib/quizConfig.ts` — `QUIZ_ID = 'quiz_demo_v1'` и массив `QUIZ_QUESTIONS`. Каждый вопрос: `{ id, type, text, options?, required, scaleMin?, scaleMax?, maxLength? }`. Меняйте этот файл, чтобы расширить/изменить квиз — UI-описание автоматически появится в `/api/quiz/config`.

`answersToCustomFields(answers)` — преобразует нормализованные ответы в плоский `{ quiz_<questionId>: <value> }` для GC.

## Тесты

- `lib/tests/quizFlowSuite.ts` — синхронные юнит-проверки: `validateAnswers` по типам вопросов, `answersToCustomFields`, `buildUpdateUserCustomFieldsArgs`.
- `api/tests/scenario/index.ts` (GET `/api/tests/scenario`) — раннер сценарных юнит-тестов; провалы → severity 3.
- Базовые юнит/интеграционные наборы шаблона остаются.

## Логирование

- Каждый шаг (`processQuizSubmit`, `validateAnswers`, `invoke updateUserCustomFields`, exit) логируется через `loggerLib.writeServerLog`.
- В payload — длины массивов и ключи; значения ответов пишутся только в Heap (через `quizRepo.create`).
- API-ключ GC школы не попадает в логи.

## Допущения и ограничения

- Heap = SSOT квиза. Если GC недоступен — сабмит остаётся успешным, в `gcSync` фиксируется `ok: false, errorCode`.
- Идемпотентности по email нет — повторный сабмит создаёт новую запись (для аналитики ответов во времени).
- Нет авторизации; квиз публичен. Анти-спам — за пределами этого роута.

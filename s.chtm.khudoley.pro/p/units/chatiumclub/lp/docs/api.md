# API · lp

## `GET /` — главная страница

- Файл: `index.tsx` (`app.html('/', …)`).
- Полный URL от корня workspace: `/p/units/chatiumclub/lp/`.
- Ответ: HTML с серверным рендером компонента `LandingPage.vue`.
- Доступен без авторизации.

## `POST /api/submit` — приём заявки

- Файл: `api/submit.ts` (`app.post('/').body(...).handle(...)`), помечен `// @shared-route`.
- Полный URL: `/p/units/chatiumclub/lp/api/submit`.
- Используется как объект маршрута: `submitLeadRoute.run(ctx, body)` в `pages/LandingPage.vue`.
- Доступен без авторизации (публичная форма лендинга).

### Тело запроса

```json
{
  "phone": "+7 999 123-45-67",
  "telegramUsername": "@username",
  "integrationNotes": "Описание задачи..."
}
```

### Валидация

- `phone` — обязательное; trim; ≥ 7 цифр в строке; ≤ 32 символов.
- `telegramUsername` — обязательное; срезается ведущий `@`; от 2 до 64 символов.
- `integrationNotes` — обязательное; от 3 до 4000 символов после `trim`.

При непрошедшей валидации возвращается ответ с `success: false` и `fieldErrors`.

### Ответы

Успех:

```json
{ "success": true, "id": "<id записи в Heap>" }
```

Ошибка валидации:

```json
{
  "success": false,
  "error": "Текст первой ошибки",
  "fieldErrors": {
    "phone": "Укажите телефон",
    "telegramUsername": null,
    "integrationNotes": null
  }
}
```

Серверная ошибка при записи в Heap:

```json
{ "success": false, "error": "Не удалось сохранить заявку. Попробуйте позже." }
```

### Логирование

- Получение запроса (`level: info`).
- Провал валидации (`level: warning`, перечисление `fieldErrors`).
- Успешное сохранение (`level: info`, `id`, `submittedAt`).
- Ошибка сохранения (`level: error`, текст ошибки).

Все логи пишутся через `ctx.account.log()` (см. `chatium-constraints`).

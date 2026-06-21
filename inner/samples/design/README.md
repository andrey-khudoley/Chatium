# TgChannelAnalytics

Аналитика переходов в телеграм-канал.

Проект в инфраструктуре Chatium.

## Структура проекта

```
channel/
├── index.tsx              # Главная страница (/)
├── login.tsx              # Страница входа (/login)
├── profile.tsx            # Страница профиля (/profile)
├── settings.tsx           # Страница настроек (/settings)
├── pages/                 # Vue компоненты страниц
│   ├── HomePage.vue       # Компонент главной страницы
│   ├── LoginPage.vue      # Компонент страницы входа
│   ├── ProfilePage.vue    # Компонент страницы профиля
│   └── SettingsPage.vue   # Компонент страницы настроек
├── api/                   # API endpoints
│   ├── auth-password.ts   # POST /password-hash - получение хеша пароля
│   └── auth-telegram.ts   # POST /get-telegram-oauth-url - получение OAuth URL для Telegram
├── sdk/                   # SDK функции для клиентской части
│   └── auth.ts            # Функции авторизации (SMS, Email, Password, Telegram)
├── tables/                # Определения таблиц
│   └── settings.table.ts  # Настройки проекта (ключ-значение)
├── adr/                   # Architecture Decision Records
│   └── 000-template.md    # Шаблон ADR
├── tests/                 # Unit и интеграционные тесты
│   ├── index.tsx          # Интерактивная страница /tests
│   ├── ai.tsx             # AI страница /tests/ai (JSON API для автоматических тестов)
│   ├── pages/             # Vue компоненты для тестов
│   │   └── UnitTestsPage.vue
│   ├── api/               # API тесты
│   │   └── run-tests.ts   # POST /run - запуск конкретного теста
│   └── shared/            # Общий код для тестов
│       └── test-definitions.ts
└── README.md              # Документация проекта
```

## Роуты

### HTML страницы

| Файл           | Роут        | Описание                                            |
| -------------- | ----------- | --------------------------------------------------- |
| `index.tsx`    | `/`         | Главная страница (требует авторизации)              |
| `login.tsx`    | `/login`    | Страница входа                                      |
| `profile.tsx`  | `/profile`  | Страница профиля пользователя (требует авторизации) |
| `settings.tsx` | `/settings` | Страница настроек (требует авторизации)             |

### API endpoints

| Файл                   | Метод | Путь                      | Описание                                           |
| ---------------------- | ----- | ------------------------- | -------------------------------------------------- |
| `api/auth-password.ts` | POST  | `/password-hash`          | Получение хеша пароля для авторизации              |
| `api/auth-telegram.ts` | POST  | `/get-telegram-oauth-url` | Получение OAuth URL для авторизации через Telegram |

### Тесты

| Файл                     | Метод | Путь             | Описание                                  |
| ------------------------ | ----- | ---------------- | ----------------------------------------- |
| `tests/index.tsx`        | GET   | `/tests`         | Интерактивная страница для запуска тестов |
| `tests/ai.tsx`           | GET   | `/tests/ai`      | JSON API для автоматических тестов        |
| `tests/api/run-tests.ts` | POST  | `/tests/api/run` | Запуск конкретного теста                  |

## Таблицы

### TgChannelAnalyticsSettings

Таблица настроек проекта в формате ключ-значение.

| Поле  | Тип    | Описание             |
| ----- | ------ | -------------------- |
| key   | String | Ключ настройки       |
| value | Any    | Значение (любой тип) |

### Настройки по умолчанию

| Ключ          | Значение                   | Описание         |
| ------------- | -------------------------- | ---------------- |
| project_title | Аналитика телеграм-каналов | Название проекта |

Для инициализации настроек по умолчанию используйте функцию `ensureDefaultSettings(ctx)` из `tables/settings.table.ts`.

## SDK

Модуль `sdk/auth.ts` содержит функции для работы с авторизацией на клиентской стороне:

- `sendSmsCode(phone)` - отправка SMS кода
- `confirmSmsCode(phone, verificationCode)` - подтверждение SMS кода
- `sendEmailCode(email)` - отправка Email кода
- `confirmEmailCode(email, code)` - подтверждение Email кода
- `loginWithPassword(type, identifier, checkHashUrl, password)` - авторизация по паролю
- `handleAuthError(error)` - обработка ошибок авторизации
- `formatPhoneNumber(phone)` - форматирование номера телефона
- `isValidEmail(email)` - валидация email
- `isValidPhone(phone)` - валидация телефона

## История изменений

### 2025-01-XX (Исправление путей для нового расположения)

- Обновлен `tsconfig.json` с правильными путями к корню проекта и внешним модулям
  - Добавлен путь `@users/*` -> `../../users.chatium.ru/*` для доступа к модулю пользователей
  - Добавлен путь `@app/*` -> `../../node_modules/@app/*` для доступа к модулям приложения
  - Обновлен путь `/*` -> `../../*` для доступа к корню проекта
- Проверены файлы `jsx.d.ts` и `vue-shim.d.ts` - не требуют изменений, так как используют только объявления модулей, которые разрешаются через paths в tsconfig.json
- Все относительные пути исправлены для корректной работы модуля в новом расположении `ref/design`

### 2025-11-27

- Создана базовая структура проекта
- Добавлена таблица настроек TgChannelAnalyticsSettings
- Добавлена дефолтная настройка project_title

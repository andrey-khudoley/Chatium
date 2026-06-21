# chatium-i18n

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-i18n/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/011-i18n.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-i18n
description: Интернационализация в Chatium — ctx.t(), ctx.lang, YAML-файлы переводов, плюралы. Использовать при мультиязычных приложениях.
---

# chatium-i18n

Переводы и мультиязычность: `ctx.t()` для перевода по ключу, `ctx.lang` для текущего языка, переводы в YAML (`*.lang.yml`). Использовать при добавлении локализации.

## Когда использовать

- Мультиязычный интерфейс (страницы, кнопки, сообщения)
- Переводы в API-ответах и уведомлениях
- Плюралы и формы слов (1 файл / 5 файлов)
- Переключение языка пользователем

## Основные API

- **ctx.lang** — текущий язык ('ru', 'en' и т.д.)
- **ctx.t(key)** — перевод по ключу
- **ctx.t(key, params)** — перевод с подстановкой параметров
- **ctx.t(key, fallback)** — значение по умолчанию при отсутствии ключа

```ts
const title = ctx.t('page.title')
const greeting = ctx.t('welcome.name', { name: user.name })
const text = ctx.t('missing.key', 'Default text')
```

## Файлы переводов

- YAML-файлы с расширением `*.lang.yml` в workspace
- Вложенные ключи через точку: `page.title`, `welcome.message`
- Настройка workspace для путей к файлам переводов

## Паттерны

- В Vue: использовать ctx.t() в template и script (ctx доступен глобально).
- На бэкенде: ctx.t() в роутах и джобах для сообщений и писем.
- Плюралы: отдельные ключи или параметр count с формой в YAML.

## Чеклист

- [ ] Создать/обновить *.lang.yml с ключами
- [ ] Использовать ctx.t() вместо хардкода строк
- [ ] При необходимости — ctx.lang для условного вывода
- [ ] Параметры и fallback в ctx.t() где нужно

## Ссылки на документацию

- **011-i18n.md** — интернационализация, YAML, плюралы, переключение языка

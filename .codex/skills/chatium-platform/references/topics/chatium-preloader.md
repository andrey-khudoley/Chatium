# chatium-preloader

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-preloader/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/018-preloader.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

---
name: chatium-preloader
description: Прелоадер приложения в Chatium — встраивание в HTML до загрузки Vue, типы (спиннер, boot sequence, skeleton). Использовать для устранения белого экрана и FOUC.
---

# chatium-preloader

Прелоадер показывается до загрузки Vue и скрывается после монтирования приложения. Устраняет белый экран, прыгающие элементы и FOUC (Flash of Unstyled Content).

## Когда использовать

- SPA с задержкой до первого рендера
- Необходимость показать состояние «загрузка» до инициализации Vue
- Разные концепции: классический спиннер, boot sequence, skeleton, progress bar

## Ключевой принцип

- Прелоадер встроен в HTML (в `<body>`), показывается до загрузки Vue.
- Стили — inline или критический CSS в `<head>`.
- Скрытие — после монтирования Vue (например, в onMounted или корневом компоненте).
- Не использовать Vue-компонент для самого прелоадера (он должен быть в HTML).
- Не полагаться только на CSS-классы без inline-стилей для первого кадра.

## Типы прелоадеров

- **Классический спиннер** — логотип + кольцо, текст «Загрузка...».
- **Boot sequence** — терминальный вид, последовательные сообщения, мигающий курсор, отслеживание ресурсов (Performance API).
- **Skeleton loader** — плейсхолдеры под контент страницы.
- **Progress bar** — тонкая полоса прогресса вверху.

## Архитектура

- Разметка и стили прелоадера в том же HTML/стилях, что отдаёт app.html (например, styles.tsx: preloaderStyles, cssVariables).
- Скрытие: класс или атрибут, убираемый после mount (например, document.body или корневой div).

## Чеклист

- [ ] Разметка прелоадера в HTML (body), не в Vue
- [ ] Стили inline или критический CSS в head
- [ ] Скрытие прелоадера после монтирования Vue
- [ ] При boot sequence — Performance API и мониторинг ресурсов по доке

## Ссылки на документацию

- **018-preloader.md** — типы прелоадеров, boot sequence, пошаговая реализация, частые ошибки

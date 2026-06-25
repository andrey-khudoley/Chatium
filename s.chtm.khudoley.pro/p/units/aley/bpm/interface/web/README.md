# BPM Терминал — веб-интерфейс

Веб-интерфейс личной BPM-системы «FLOW». Стадия 1 — дизайн на моках.

## Текущее состояние

Реализован полный дизайн-прототип на Vue (mock-first SPA):

- 12 экранов: Главная, Журнал, Задачи (4 вида), Диалоги, Финансы, PARA, Инструменты, Сервисы, Библиотека, Детали, Дизайн-система, Заглушка
- Оболочка: Sidebar + Topbar + MobileDrawer (адаптивность ≤880px)
- Декоративная система: data-deco атрибуты, HUD-углы, гаттеры, моно-метки
- Реактивный store (Vue reactive), mock-данные во всех доменах
- Pomодоро-таймер с cleanup, чек-боксы задач и привычек, переключение видов задач
- Предотвращение FOUC через инлайновый boot CSS

## Структура

```
index.tsx              — SSR entrypoint, роут /
config/routes.tsx      — маршруты, URL-хелперы
config/project.tsx     — метаданные, карты экранов
shared/theme.ts        — applyTheme, hexA
shared/store.ts        — реактивное состояние
shared/format.ts       — форматтеры
shared/types/          — модули типов по доменам
shared/mocks/          — seed-данные (9 файлов)
pagecss/               — CSS-фрагменты (boot/deco/shell/animations)
styles.tsx             — сборщик CSS
components/ui/         — 15 UI-атомов
components/shell/      — AppBackground, Sidebar, Topbar, MobileDrawer
components/tasks/      — TaskBoard, TaskTable, TaskTimeline, TaskGtd
pages/AppShell.vue     — корневой SPA-shell
pages/screens/         — 12 экранов
```

## Быстрый старт

Проект работает внутри Chatium-платформы. После синка доступен по URL проекта.

## Changelog

### 25-06-2026 — Фикс тени MobileDrawer

В мобильной версии при закрытом меню оставалась полоса тени у левого края: `.mobile-drawer` всегда в DOM (уезжает через `translateX(-100%)`), а его `box-shadow: 24px 0 64px` со сдвигом по X светил обратно в видимую область. Тень перенесена в состояние `.open` — у закрытой панели `box-shadow: none`.

### 25-06-2026 — Фикс рендеринга (`// @shared`)

Проверка прототипа через Playwright выявила рантайм-ошибку клиента: `config/project.tsx` импортировался в `Topbar.vue` без метки `// @shared` (`does not have shared file mark`), из-за чего Vue-приложение не монтировалось. Добавлена метка `// @shared`. После фикса — 0 ошибок в консоли, все экраны (Главная, Задачи, Дизайн-система) и адаптив ≤880px с MobileDrawer рендерятся корректно.

### 25-06-2026 — Начальная реализация (стадия 1)

Создан полный дизайн-прототип BPM Терминал v2: 68 файлов, все 12 экранов, 15 UI-атомов, 4 вида задач, mock-данные по всем доменам, адаптивная оболочка с MobileDrawer, FOUC prevention.

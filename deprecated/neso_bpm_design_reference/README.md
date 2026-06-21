# NeSo BPM

BPM workspace в `p/units/neso/bpm`: операционная консоль процессов, SLA, владельцев, автоматизаций и дизайн-сценариев.

## Текущий UI

- Главная страница — рабочий command center: KPI, process inbox, деталка инстанса, analytics, timeline, next best actions и сценарии работы.
- Каталог `web/design` — фильтруемый индекс 19 demo-сценариев по теме и layout.
- Сценарии `web/design/<scenario>` — отдельные BPM-компоновки для incident, approval, operations, risk, delivery, executive и client desk use cases.
- Общая визуальная система — нейтральные light/dark ops-палитры, плотные панели, понятные статусные цвета, compact-radius UI.
- Data/demo слой остаётся в `shared/*`; Vue-компоненты не импортируют серверные `tables/`, `repos/`, `lib/`.

## Структура

- `tables/` — heap таблицы
- `repos/` — репозитории
- `lib/` — библиотечный и service слой
- `components/` — reusable UI-компоненты (включая импорт из `design_2`)
- `layout/` — layout primitives
- `pages/` — Vue-страницы нового интерфейса
- `web/` — file-based маршруты
- `shared/` — тема, preloader, scenario dataset, demo factory; `bpmVueExportedTypes.ts` — типы пропсов BPM Vue-компонентов (для `tsc` с `vue-shim`, без реэкспорта из `.vue`)

## Маршруты

- `/` — главная
- `/web/login` — вход
- `/web/admin` — админка
- `/web/tests` — тестовая страница
- `/web/design` — индекс дизайн-сценариев
- `/web/design/<scenario>` — отдельная demo-страница сценария (19 шт.)

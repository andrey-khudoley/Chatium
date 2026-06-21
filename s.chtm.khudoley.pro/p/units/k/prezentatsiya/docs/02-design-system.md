# Дизайн-система эфирной презентации

Базируется на части I спецификации `elvira-broadcast-slides-spec.md`. Адаптирована под HTML/CSS — без Figma-pt, в `clamp()`/`px`.

## Палитра (CSS-переменные из `styles.tsx`)

| Переменная         | Hex                                | Применение                                            |
| ------------------ | ---------------------------------- | ----------------------------------------------------- |
| `--bg-base`        | `#0B0F19`                          | Основной фон слайда                                   |
| `--bg-base-bottom` | `#070A12`                          | Низ градиента фона                                    |
| `--gradient-bg`    | linear top→bottom от base к bottom | Фон каждого слайда                                    |
| `--bg-surface`     | `#131826`                          | Карточки, обычные блоки кода                          |
| `--bg-elevated`    | `#1B2336`                          | Подсвеченные карточки (gateway, верхняя L-полоса)     |
| `--bg-code`        | `#0A0E18`                          | «Настоящий» код-блок (запросы, JSON)                  |
| `--text-primary`   | `#F5F7FA`                          | Заголовки, основной текст                             |
| `--text-secondary` | `#8B95A7`                          | Подписи, второстепенный                               |
| `--text-tertiary`  | `#5A6478`                          | Метаданные, дисклеймеры                               |
| `--accent-cyan`    | `#00D9FF`                          | Главный акцент: подчёркивания, бейджи, ключевые слова |
| `--accent-amber`   | `#FFB347`                          | Внимание/проблема (callout декабря, status-warning)   |
| `--status-success` | `#4ADE80`                          | 200 OK                                                |
| `--status-warning` | `#FFB347`                          | 4xx                                                   |
| `--status-error`   | `#F87171`                          | 5xx                                                   |
| `--json-string`    | `#A8D8AB`                          | Строковые литералы в JSON                             |
| `--border-subtle`  | `rgba(255,255,255,0.08)`           | Тонкие границы карточек                               |
| `--border-accent`  | `rgba(0,217,255,0.4)`              | Бордюр выделенных карточек                            |
| `--glow-cyan`      | radial cyan→transparent            | За anchor-фразами и gateway-боксом                    |

Старая палитра (`--accent-indigo`, `--accent-violet`, `--bg-void`, `--font-display=Syne` и т.п.) оставлена для совместимости со старыми `Slide*.vue`. Эфирные слайды её не используют.

## Шрифты

- `--font-display-new: 'Manrope'` — заголовки, anchor-фразы (вес 600/700/800).
- `--font-body-new: 'Inter'` — body-текст (вес 400/500/600).
- `--font-mono: 'JetBrains Mono'` — код, бейджи `01`, имена операций, badge `L2..L6`, ссылки.

Размеры заданы через `clamp(min, vw, max)` чтобы держать единый ритм между десктопом и мобильным.

## Сквозные элементы

- **Дот-грид** — утилита `.dot-grid`: точки 1px / шаг 80px / opacity 0.04. Применяется к корневому `.slide` каждого эфирного слайда.
- **Acent-strip** — короткая горизонтальная полоса 80×4px, цвет `--accent-cyan`, опционально с glow-shadow.
- **Number-badge** — круг 56px, бордер 2px `--accent-cyan`, моно-шрифт. Внутри — порядковый номер `01..NN`. Используется в SlideAgenda, SlideRequestFour, SlideReadApiSpec, SlideSchoolKey, SlideAccessForm.
- **Anchor-glow** — `.anchor-glow` (`position: absolute; inset: 0`): radial cyan градиент + анимация `anchor-breath` (4s). Лежит на anchor-слайдах под центральной фразой.
- **Status-pill** — radius 999px, padding 14×28, fill полупрозрачный по статусу, моно-цифра + Inter-label.
- **Callout-полоса** — fill `rgba(0,217,255,0.08)` или `rgba(255,179,71,0.08)` + `border-left 4px` соответствующего accent-цвета. Используется на слайдах 5, 14, 18, 20.

## Анимации

В `styles.tsx` доступны (нужные эфиру):

- `fadeInUp` — основная: `opacity 0 + translateY(30px)` → `1, 0`. Длительность 240–500мс ease-out.
- `fadeInLeft` — для горизонтальной развёртки таймлайнов.
- `fadeInScale` — для центральных anchor-фраз.
- `anchor-breath` — медленная пульсация opacity 0.85 → 1 (4s) для glow на анкорах.
- `domino-fall` — для иллюстрации «без gateway» (SlideStability).
- `pulse-dot`, `glow-pulse`, `gradient-shift` — для нав-контролов в `Presentation.vue`.

Принцип: анимации — только fade и slide-up. Никаких отскоков, вращений, мигания.

## Паттерны компонентов в коде

- **Карточка-плитка**: `background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 28-32px;`. Hover — лёгкий `translateY(-4px)` + рамка `--border-accent`.
- **Подсвеченная карточка** (gateway, top-layer): `background: var(--bg-elevated); border: 2px solid var(--border-accent); box-shadow: 0 0 32px rgba(0,217,255,0.15-0.2);`.
- **Код-блок «как настоящий»**: `background: var(--bg-code); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 24-32px;` + ручная подсветка через классы `.kw / .hdr / .key / .str / .dim` в `<pre v-html="..."></pre>`. Цвета — accent-cyan для ключевых слов, amber для JSON-ключей, json-string для строк.
- **Бейдж-капсула**: `padding: 6×12px; border: 1px solid var(--border-subtle); border-radius: 6px;` + моно-шрифт.

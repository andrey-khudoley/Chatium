# Архитектура deck'а

## Общая схема

```
index.tsx  (роут "/")
   │
   ├─ <PresentationHead />        ← styles.tsx (стили, шрифты, переменные)
   └─ <Presentation />            ← pages/Presentation.vue
         │
         ├─ <component :is="currentComponent" :active="true" />
         │     └─ slides/Slide<Name>.vue   (20 штук, по одному на слайд)
         │
         └─ deck-controls
               ├─ slide-counter
               ├─ progress-track  (точки + анимация заполнения)
               └─ nav-btn ← →
```

## Точка входа

`index.tsx` — Chatium-роут, отдающий HTML-страницу. В `<head>` подключены `PresentationHead` (см. `styles.tsx`); в `<body>` — корневой Vue-компонент `Presentation.vue`. Заголовок страницы — `Chatium + GetCourse · эфир`.

## Контейнер deck'а

`pages/Presentation.vue`:

- держит `current` (индекс активного слайда), `slides[]` (массив с компонентом и человеческим label).
- рендерит активный слайд через `<component :is="currentComponent" :key="current" :active="true" />`.
- `:key="current"` гарантирует, что при переключении компонент пересоздаётся — это перезапускает CSS-анимации в `Slide*.vue`.
- обрабатывает клавиатуру (`onKey`) — стрелки, Space, Page, Home/End.
- слушает touch-события (`onTouchStart` / `onTouchEnd`) — горизонтальный свайп ≥ 50px переключает слайд.
- внизу — `deck-controls`: счётчик `01 / 20`, прогресс-полоса с интерактивными точками (клик прыгает к слайду), кнопки навигации.

`pages/PresentationPlan.vue` — отдельный артефакт старой версии; в эфирном deck'е не используется и не импортируется.

## Слайды

Каждый слайд:

- Самодостаточный SFC: `<template>` + `<script setup>` + `<style scoped>`.
- Импортирует только `vue` (`defineProps`, при необходимости `ref/computed/onMounted`).
- Принимает `defineProps({ active: Boolean })` — единый контракт, можно использовать для управления анимациями (по дефолту `:key` уже триггерит ремоунт, поэтому fade-in анимации в спецификации делаются через `animation: fadeInUp ... both`, а не через `v-if`/watch).
- Корневой `.slide` использует `position: absolute; inset: 0;` чтобы помещаться в `slide-viewport` контейнера.
- Фон слайда: `background: var(--gradient-bg);` + класс `.dot-grid` (утилита из `styles.tsx`).
- На анкор-слайдах поверх фона лежит `<div class="anchor-glow"></div>` (radial-gradient + breath-анимация).

## Адаптивность

- Десктоп (>1024px): дизайн «как в спеке», multi-column, все декоративные элементы.
- Планшет (≤1024px): grid'ы схлопываются в одну колонку, прячутся декоративные стрелки/таймлайны.
- Мобильный (≤768px и ≤480px): уменьшаются шрифты, убирается hover-lift, появляется вертикальный скролл слайда (`.slide` получает `overflow-y: auto` глобальным правилом).

## Шрифты и стили

- Шрифты грузятся одной ссылкой Google Fonts из `styles.tsx` (Inter, Manrope, Space Grotesk, Syne, JetBrains Mono).
- CSS-переменные определены в `:root` блоке; есть две группы — старые (`--bg-void`, `--accent-indigo` и т.п.) и новые эфирные (`--bg-base`, `--accent-cyan`, `--accent-amber`, …). Новые эфирные слайды используют только новую группу.
- `body` теперь использует `--font-body-new` (Inter) и `--bg-base`.

## Что нельзя

- Импортировать в Vue серверные модули из `lib/`, `repos/`, `tables/`. Слайды — чистый клиент.
- Удалять старые `Slide*.vue` — они оставлены как библиотека готовых паттернов и для возможного отката.
- Менять `Presentation.vue` сильнее, чем «массив слайдов и их импорты», — навигация, прогресс-бар и keymap обязаны остаться.

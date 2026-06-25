// @shared
import type { LibraryItem } from '../types/library'

export const seedLib: LibraryItem[] = [
  {
    id: 'l1',
    title: 'Getting Things Done',
    author: 'Дэвид Аллен',
    type: 'book',
    status: 'reading',
    progress: 68,
    tags: ['gtd', 'продуктивность'],
    summary: 'Метод GTD: захват, уточнение, организация, обзор, действие.',
    highlights: ['Ваш разум для генерации идей, а не их хранения', 'Двухминутное правило']
  },
  {
    id: 'l2',
    title: 'Принципы жизни и работы',
    author: 'Рэй Далио',
    type: 'book',
    status: 'reading',
    progress: 42,
    tags: ['принципы', 'менеджмент'],
    summary: 'Системный подход к принятию решений на основе принципов.',
    highlights: []
  },
  {
    id: 'l3',
    title: 'How to Build Async Teams',
    author: 'GitLab Blog',
    type: 'article',
    status: 'queue',
    progress: 0,
    tags: ['команда', 'remote'],
    summary: 'Практики асинхронной работы в распределённых командах.',
    highlights: []
  },
  {
    id: 'l4',
    title: 'Vue 3.5 Release Notes',
    author: 'Vue.js Team',
    type: 'article',
    status: 'done',
    progress: 100,
    tags: ['vue', 'frontend'],
    summary: 'Новые функции: useTemplateRef, defineProps defaults, улучшения SSR.',
    highlights: ['useTemplateRef — более строгая типизация', 'Ленивая гидрация компонентов']
  },
  {
    id: 'l5',
    title: 'Zettelkasten в Obsidian',
    author: 'Sönke Ahrens',
    type: 'video',
    status: 'queue',
    progress: 0,
    tags: ['pkm', 'obsidian', 'заметки'],
    summary: 'Метод карточек Zettelkasten в цифровом формате.',
    highlights: []
  },
  {
    id: 'l6',
    title: 'Атомные привычки',
    author: 'Джеймс Клир',
    type: 'book',
    status: 'done',
    progress: 100,
    tags: ['привычки', 'саморазвитие'],
    summary: 'Система маленьких изменений для больших результатов.',
    highlights: [
      '1% улучшений каждый день = 37x за год',
      'Привычная петля: сигнал → желание → ответ → награда'
    ]
  },
  {
    id: 'l7',
    title: 'Заметки по архитектуре микросервисов',
    author: 'Личные заметки',
    type: 'note',
    status: 'reading',
    progress: 55,
    tags: ['архитектура', 'backend'],
    summary: 'Паттерны: BFF, CQRS, Event Sourcing, Saga.',
    highlights: []
  },
  {
    id: 'l8',
    title: 'Deep Work',
    author: 'Кэл Ньюпорт',
    type: 'book',
    status: 'queue',
    progress: 0,
    tags: ['фокус', 'продуктивность'],
    summary: 'Практика глубокой сосредоточённой работы без отвлечений.',
    highlights: []
  }
]

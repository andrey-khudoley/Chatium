// @shared
import type { Task } from '../types/task'

export const seedTasks: Task[] = [
  {
    id: 't1',
    title: 'Согласовать договор с клиентом',
    status: 'doing',
    project: 'Клиент A',
    client: 'ООО Альфа',
    context: '@встреча',
    pr: 'high',
    due: '23 июн',
    desc: 'Обсудить правки к договору и получить подпись до конца недели.',
    checklist: [
      { id: 'c1', text: 'Подготовить список правок', done: true },
      { id: 'c2', text: 'Отправить клиенту', done: true },
      { id: 'c3', text: 'Получить обратную связь', done: false },
      { id: 'c4', text: 'Финальное согласование', done: false }
    ]
  },
  {
    id: 't2',
    title: 'Написать техническое задание',
    status: 'todo',
    project: 'Клиент B',
    client: 'ИП Бетов',
    context: '@компьютер',
    pr: 'high',
    due: '25 июн',
    desc: 'ТЗ на новый модуль для CRM-системы клиента.',
    checklist: [
      { id: 'c5', text: 'Изучить требования', done: false },
      { id: 'c6', text: 'Написать черновик', done: false }
    ]
  },
  {
    id: 't3',
    title: 'Обновить портфолио на сайте',
    status: 'todo',
    project: 'Личное',
    client: '',
    context: '@компьютер',
    pr: 'low',
    due: '30 июн',
    desc: 'Добавить последние три проекта в раздел работ.',
    checklist: []
  },
  {
    id: 't4',
    title: 'Встреча с командой по запуску',
    status: 'doing',
    project: 'Запуск продукта',
    client: 'ООО Гамма',
    context: '@встреча',
    pr: 'high',
    due: '22 июн',
    desc: 'Синхронизация по статусу задач и блокерам.',
    checklist: [
      { id: 'c7', text: 'Подготовить повестку', done: true },
      { id: 'c8', text: 'Провести встречу', done: false }
    ]
  },
  {
    id: 't5',
    title: 'Изучить новые функции Vue 3.5',
    status: 'inbox',
    project: 'Развитие',
    client: '',
    context: '@чтение',
    pr: 'low',
    due: '',
    desc: 'Прочитать release notes и попробовать на тестовом проекте.',
    checklist: []
  },
  {
    id: 't6',
    title: 'Оплатить хостинг и домены',
    status: 'wait',
    project: 'Инфраструктура',
    client: '',
    context: '@телефон',
    pr: 'med',
    due: '24 июн',
    desc: 'Оплата до истечения срока действия.',
    checklist: []
  },
  {
    id: 't7',
    title: 'Подготовить презентацию для инвестора',
    status: 'todo',
    project: 'Запуск продукта',
    client: 'ООО Гамма',
    context: '@компьютер',
    pr: 'high',
    due: '27 июн',
    desc: 'Deck на 15 слайдов по продуктовой стратегии.',
    checklist: [
      { id: 'c9', text: 'Собрать метрики', done: false },
      { id: 'c10', text: 'Сделать дизайн слайдов', done: false },
      { id: 'c11', text: 'Прогон с командой', done: false }
    ]
  },
  {
    id: 't8',
    title: 'Прочитать книгу «Принципы» Далио',
    status: 'doing',
    project: 'Развитие',
    client: '',
    context: '@чтение',
    pr: 'low',
    due: '',
    desc: 'Часть 2: Жизненные принципы.',
    checklist: []
  },
  {
    id: 't9',
    title: 'Настроить CI/CD для нового проекта',
    status: 'inbox',
    project: 'Инфраструктура',
    client: '',
    context: '@компьютер',
    pr: 'med',
    due: '',
    desc: 'GitHub Actions — сборка, тесты, деплой на staging.',
    checklist: []
  },
  {
    id: 't10',
    title: 'Написать статью для блога',
    status: 'inbox',
    project: 'Личное',
    client: '',
    context: '@компьютер',
    pr: 'low',
    due: '',
    desc: 'Тема: GTD для разработчиков.',
    checklist: []
  },
  {
    id: 't11',
    title: 'Квартальный финансовый отчёт',
    status: 'done',
    project: 'Финансы',
    client: '',
    context: '@компьютер',
    pr: 'med',
    due: '20 июн',
    desc: 'Свести все доходы и расходы за Q2.',
    checklist: [
      { id: 'c12', text: 'Выгрузить транзакции', done: true },
      { id: 'c13', text: 'Свести в таблицу', done: true },
      { id: 'c14', text: 'Написать выводы', done: true }
    ]
  },
  {
    id: 't12',
    title: 'Интервью с потенциальным разработчиком',
    status: 'wait',
    project: 'Команда',
    client: '',
    context: '@встреча',
    pr: 'med',
    due: '26 июн',
    desc: 'Технический скрининг кандидата на backend.',
    checklist: [
      { id: 'c15', text: 'Подготовить вопросы', done: true },
      { id: 'c16', text: 'Провести интервью', done: false }
    ]
  }
]

export const seedTodayTasks = [
  {
    id: 't1',
    title: 'Согласовать договор с клиентом',
    proj: 'Клиент A',
    done: false,
    pr: 'high' as const,
    time: '10:00'
  },
  {
    id: 't4',
    title: 'Встреча с командой по запуску',
    proj: 'Запуск продукта',
    done: false,
    pr: 'high' as const,
    time: '12:00'
  },
  {
    id: 't6',
    title: 'Оплатить хостинг и домены',
    proj: 'Инфраструктура',
    done: true,
    pr: 'med' as const,
    time: '14:00'
  },
  {
    id: 't7',
    title: 'Подготовить презентацию для инвестора',
    proj: 'Запуск продукта',
    done: false,
    pr: 'high' as const,
    time: '16:00'
  },
  {
    id: 't8',
    title: 'Прочитать книгу «Принципы» Далио',
    proj: 'Развитие',
    done: false,
    pr: 'low' as const,
    time: '20:00'
  }
]

export const seedHabits = [
  { id: 'h1', name: 'Утренняя зарядка 15 мин', done: true },
  { id: 'h2', name: 'Медитация 10 мин', done: true },
  { id: 'h3', name: 'Чтение 30 мин', done: false },
  { id: 'h4', name: 'Дневниковая запись', done: false },
  { id: 'h5', name: 'Без соцсетей до 12:00', done: true }
]

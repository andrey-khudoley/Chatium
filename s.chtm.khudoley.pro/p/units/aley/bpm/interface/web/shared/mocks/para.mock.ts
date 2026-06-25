// @shared
import type { Project, Ref } from '../types/task'

export const seedProjs: Project[] = [
  {
    id: 'p1',
    name: 'Запуск BPM-продукта',
    para: 'project',
    client: 'ООО Гамма',
    deadline: '01 авг',
    desc: 'Запуск MVP BPM-терминала',
    taskFilter: 'Запуск продукта'
  },
  {
    id: 'p2',
    name: 'Редизайн сайта',
    para: 'project',
    client: 'ИП Бетов',
    deadline: '15 июл',
    desc: 'Полный редизайн корпоративного сайта',
    taskFilter: 'Клиент B'
  },
  {
    id: 'p3',
    name: 'Автоматизация отчётности',
    para: 'project',
    deadline: '30 июн',
    desc: 'Автоматическая генерация финансовых отчётов',
    taskFilter: 'Финансы'
  },
  {
    id: 'p4',
    name: 'Набор команды',
    para: 'project',
    deadline: '01 сен',
    desc: 'Найти backend + designer',
    taskFilter: 'Команда'
  }
]

export const seedRefs: Ref[] = [
  // Areas
  { id: 'r1', name: 'Разработка', kind: 'area', desc: 'Все технические задачи', tags: ['dev'] },
  {
    id: 'r2',
    name: 'Клиентская работа',
    kind: 'area',
    desc: 'Работа с заказчиками',
    tags: ['clients']
  },
  { id: 'r3', name: 'Финансы', kind: 'area', desc: 'Доходы, расходы, бюджеты', tags: ['money'] },
  { id: 'r4', name: 'Здоровье', kind: 'area', desc: 'Спорт, питание, режим', tags: ['health'] },
  // Resources
  {
    id: 'r5',
    name: 'Шаблоны',
    kind: 'resource',
    desc: 'Шаблоны документов и задач',
    tags: ['templates']
  },
  {
    id: 'r6',
    name: 'Стек технологий',
    kind: 'resource',
    desc: 'Используемые инструменты',
    tags: ['tech']
  },
  {
    id: 'r7',
    name: 'Контакты подрядчиков',
    kind: 'resource',
    desc: 'Проверенные исполнители',
    tags: ['contacts']
  },
  // Archive
  {
    id: 'r8',
    name: 'Проект Альфа (завершён)',
    kind: 'archive',
    desc: 'Завершён 2025 Q4',
    tags: ['archived']
  },
  {
    id: 'r9',
    name: 'Старые клиенты',
    kind: 'archive',
    desc: 'Завершённые контракты',
    tags: ['archived']
  }
]

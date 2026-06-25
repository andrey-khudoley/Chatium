// @shared
import type { Service } from '../types/social'

export const seedServices: Service[] = [
  // Коммуникации
  {
    id: 's1',
    name: 'Telegram',
    desc: 'Сообщения и каналы',
    cat: 'Коммуникации',
    on: true,
    tag: 'Активен',
    glyph: 'ТГ',
    last: 'Синхр. 2 мин назад'
  },
  {
    id: 's2',
    name: 'Gmail',
    desc: 'Электронная почта',
    cat: 'Коммуникации',
    on: true,
    glyph: 'ЭМ',
    last: 'Синхр. 5 мин назад'
  },
  {
    id: 's3',
    name: 'Slack',
    desc: 'Командный чат',
    cat: 'Коммуникации',
    on: false,
    glyph: 'СЛ',
    last: 'Не подключено'
  },
  // Финансы
  {
    id: 's4',
    name: 'Тинькофф',
    desc: 'Банковские операции',
    cat: 'Финансы и покупки',
    on: true,
    tag: 'Банк',
    glyph: 'ТБ',
    last: 'Синхр. 1 ч назад'
  },
  {
    id: 's5',
    name: 'Сбербанк',
    desc: 'Текущий счёт',
    cat: 'Финансы и покупки',
    on: true,
    glyph: 'СБ',
    last: 'Синхр. 3 ч назад'
  },
  // Продуктивность
  {
    id: 's6',
    name: 'Notion',
    desc: 'База знаний и заметки',
    cat: 'Продуктивность',
    on: true,
    glyph: 'НТ',
    last: 'Синхр. 30 мин назад'
  },
  {
    id: 's7',
    name: 'Google Calendar',
    desc: 'Расписание и события',
    cat: 'Продуктивность',
    on: true,
    glyph: 'ГК',
    last: 'Синхр. 10 мин назад'
  },
  {
    id: 's8',
    name: 'Obsidian',
    desc: 'Linked notes',
    cat: 'Продуктивность',
    on: false,
    glyph: 'ОБ',
    last: 'Не подключено'
  },
  // Разработка
  {
    id: 's9',
    name: 'GitHub',
    desc: 'Репозитории и задачи',
    cat: 'Разработка',
    on: true,
    tag: 'Dev',
    glyph: 'GH',
    last: 'Синхр. 15 мин назад'
  },
  {
    id: 's10',
    name: 'Linear',
    desc: 'Issue tracker',
    cat: 'Разработка',
    on: false,
    glyph: 'LN',
    last: 'Не подключено'
  },
  // Здоровье
  {
    id: 's11',
    name: 'Apple Health',
    desc: 'Активность и сон',
    cat: 'Здоровье',
    on: true,
    glyph: 'АН',
    last: 'Синхр. 1 ч назад'
  },
  {
    id: 's12',
    name: 'Oura Ring',
    desc: 'Биометрика',
    cat: 'Здоровье',
    on: false,
    glyph: 'OR',
    last: 'Не подключено'
  }
]

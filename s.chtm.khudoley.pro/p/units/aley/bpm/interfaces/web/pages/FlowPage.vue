<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, onUnmounted } from 'vue'
import { createComponentLogger, setLogSink, type LogEntry } from '../shared/logger'
import { createBrowserRemoteLogger } from '../shared/browserRemoteLogger'
import { postBrowserLogsRoute } from '../api/logger/browser'

const log = createComponentLogger('FlowPage')

declare const ctx: app.Ctx

type Pr = 'high' | 'med' | 'low'
type Status = 'inbox' | 'todo' | 'doing' | 'wait' | 'done'

interface TaskRow {
  title: string
  status: Status
  project: string
  client: string
  context: string
  pr: Pr
  start: number
  end: number
  due: string
}
interface TodayTask {
  title: string
  proj: string
  pr: Pr
  time: string
  done: boolean
}
interface Thread {
  id: string
  name: string
  ai: boolean
  last: string
  time: string
  unread: number
}
interface Msg {
  role: 'me' | 'them' | 'ai'
  text: string
  time: string
}
interface Habit {
  id: string
  name: string
  done: boolean
}
interface Service {
  id: string
  cat: string
  name: string
  glyph: string
  desc: string
  last: string
  on: boolean
  tag: string
}
interface LibItem {
  title: string
  type: 'book' | 'article' | 'note' | 'video'
  author: string
  tags: string[]
  status: 'reading' | 'done' | 'queue'
  progress: number
}

const props = withDefaults(
  defineProps<{
    userName?: string
    userHandle?: string
    greeting?: string
    dateLine?: string
    accent?: string
    density?: 'comfortable' | 'compact'
  }>(),
  {
    userName: 'Дмитрий',
    userHandle: 'khudoley.pro',
    greeting: 'Доброе утро, Дмитрий',
    dateLine: 'Понедельник, 22 июня · фокус дня — согласовать договор к 10:00',
    accent: '#E11D48',
    density: 'compact'
  }
)

const userInitial = computed(() => props.userName.charAt(0))

// ===== reactive state =====
const screen = ref('home')
const stubName = ref('')
const taskView = ref('board')
const tableGroup = ref('none')
const tableSortKey = ref('due')
const tableSortDir = ref('asc')
const tableFilter = ref('')
const activeThread = ref('t1')
const composer = ref('')
const libFilter = ref('all')
const pomoSec = ref(1500)
const pomoRunning = ref(false)
let pomoTimer: ReturnType<typeof setInterval> | null = null

const habits = ref<Habit[]>([
  { id: 'water', name: 'Вода · 2 л', done: true },
  { id: 'move', name: 'Зарядка утром', done: true },
  { id: 'read', name: 'Чтение · 30 мин', done: false },
  { id: 'sugar', name: 'Без сахара', done: false },
  { id: 'steps', name: '10 000 шагов', done: true }
])

const services = ref<Service[]>([
  {
    id: 'mail',
    cat: 'Коммуникации',
    name: 'Почта',
    glyph: '@',
    desc: 'Gmail · dmitry@khudoley.pro',
    last: 'Синхр. 5 мин назад',
    on: true,
    tag: '7 писем'
  },
  {
    id: 'tg',
    cat: 'Коммуникации',
    name: 'Telegram',
    glyph: '✈',
    desc: 'Бот для быстрого захвата',
    last: 'Активно',
    on: true,
    tag: 'захват'
  },
  {
    id: 'bank',
    cat: 'Финансы и покупки',
    name: 'Банк',
    glyph: '₽',
    desc: 'Тинькофф · автоимпорт операций',
    last: 'Синхр. 1 ч назад',
    on: true,
    tag: '12 операций'
  },
  {
    id: 'delivery',
    cat: 'Финансы и покупки',
    name: 'Доставки',
    glyph: '⊞',
    desc: 'Ozon · СДЭК',
    last: 'Синхр. вчера',
    on: true,
    tag: '1 в пути'
  },
  {
    id: 'cal',
    cat: 'Продуктивность',
    name: 'Календарь',
    glyph: '◷',
    desc: 'Google Calendar',
    last: 'Синхр. 12 мин назад',
    on: true,
    tag: '3 события'
  },
  {
    id: 'notion',
    cat: 'Продуктивность',
    name: 'Notion',
    glyph: 'N',
    desc: 'Импорт заметок',
    last: '',
    on: false,
    tag: ''
  },
  {
    id: 'github',
    cat: 'Разработка',
    name: 'GitHub',
    glyph: '⟨⟩',
    desc: 'Issues проекта X',
    last: 'Синхр. 2 ч назад',
    on: true,
    tag: '4 issue'
  },
  {
    id: 'health',
    cat: 'Здоровье',
    name: 'Здоровье',
    glyph: '♥',
    desc: 'Apple Health',
    last: '',
    on: false,
    tag: ''
  }
])

const library = ref<LibItem[]>([
  {
    title: 'Building a Second Brain',
    type: 'book',
    author: 'Tiago Forte',
    tags: ['PKM', 'PARA'],
    status: 'reading',
    progress: 64
  },
  {
    title: 'Как привести дела в порядок',
    type: 'book',
    author: 'David Allen',
    tags: ['GTD'],
    status: 'done',
    progress: 100
  },
  {
    title: 'Атомные привычки',
    type: 'book',
    author: 'James Clear',
    tags: ['привычки'],
    status: 'reading',
    progress: 38
  },
  {
    title: 'BPM для личного использования',
    type: 'article',
    author: 'Конспект · 8 мин',
    tags: ['BPM', 'система'],
    status: 'queue',
    progress: 0
  },
  {
    title: 'Метод PARA на практике',
    type: 'article',
    author: 'forte labs · перевод',
    tags: ['PARA'],
    status: 'done',
    progress: 100
  },
  {
    title: 'Заметки по еженедельному обзору',
    type: 'note',
    author: 'Личная заметка',
    tags: ['обзор', 'ритуал'],
    status: 'reading',
    progress: 50
  },
  {
    title: 'Как я веду журнал',
    type: 'note',
    author: 'Личная заметка',
    tags: ['журнал'],
    status: 'done',
    progress: 100
  },
  {
    title: 'Tiago Forte · Building a Second Brain',
    type: 'video',
    author: 'YouTube · 22 мин',
    tags: ['PKM'],
    status: 'queue',
    progress: 0
  }
])

const todayTasks = ref<TodayTask[]>([
  {
    title: 'Согласовать договор с подрядчиком',
    proj: 'Ремонт',
    pr: 'high',
    time: '10:00',
    done: false
  },
  { title: 'Ответить Анне по смете', proj: 'Работа', pr: 'med', time: '11:30', done: false },
  { title: 'Закрыть месячный отчёт', proj: 'Финансы', pr: 'high', time: '—', done: false },
  { title: 'Тренировка — ноги', proj: 'Здоровье', pr: 'low', time: '18:00', done: false },
  { title: 'Прочитать главу 4', proj: 'Библиотека', pr: 'low', time: '—', done: true }
])

const messages = ref<Record<string, Msg[]>>({
  t1: [
    { role: 'me', text: 'Составь план на неделю по проекту «Ремонт»', time: '09:02' },
    {
      role: 'ai',
      text: 'Готово. Разбил на 5 задач и расставил по дням. Главное на сегодня — согласовать договор с подрядчиком к 10:00. Перенести их в «Мои задачи»?',
      time: '09:02'
    },
    { role: 'me', text: 'Да, перенеси. И напомни про смету.', time: '09:05' },
    {
      role: 'ai',
      text: 'Создал 5 задач в проекте «Ремонт» и напоминание «Смета» на 11:30. Что-то ещё?',
      time: '09:05'
    }
  ],
  t2: [
    { role: 'them', text: 'Привет! Скинула обновлённую смету, посмотри пункт 4.', time: '08:40' },
    { role: 'me', text: 'Принял, гляну после созвона.', time: '08:44' }
  ],
  t3: [
    { role: 'them', text: 'Договор подпишем завтра в 12. Подойдёт?', time: 'вчера' },
    { role: 'me', text: 'Да, давайте в 12.', time: 'вчера' }
  ],
  t4: [
    { role: 'me', text: 'Найди источники по BPM для личного использования', time: '06:10' },
    {
      role: 'ai',
      text: 'Нашёл 3 релевантных материала и собрал краткие выжимки. Добавить в Библиотеку?',
      time: '06:11'
    }
  ],
  t5: [
    { role: 'them', text: 'Запушил обновление по проекту X', time: 'вчера' },
    { role: 'me', text: 'Ок, проверю ревью', time: 'вчера' }
  ]
})

// ===== static data =====
const threads: Thread[] = [
  {
    id: 't1',
    name: 'Ассистент',
    ai: true,
    last: 'Создал 5 задач в проекте «Ремонт»',
    time: '5 мин',
    unread: 2
  },
  {
    id: 't2',
    name: 'Анна Котова',
    ai: false,
    last: 'Скинула обновлённую смету',
    time: '18 мин',
    unread: 1
  },
  {
    id: 't3',
    name: 'Подрядчик · Ремонт',
    ai: false,
    last: 'Договор подпишем завтра в 12',
    time: '1 ч',
    unread: 0
  },
  {
    id: 't4',
    name: 'Исследователь',
    ai: true,
    last: 'Нашёл 3 источника по теме',
    time: '3 ч',
    unread: 0
  },
  {
    id: 't5',
    name: 'Команда · Проект X',
    ai: false,
    last: 'Запушил обновление',
    time: 'вчера',
    unread: 0
  }
]

const metricsRaw: { l: string; v: number; dot: string; danger?: boolean; screen: string }[] = [
  { l: 'Входящие', v: 7, dot: 'var(--fg3)', screen: 'journal' },
  { l: 'Сегодня', v: 5, dot: 'var(--accent)', screen: 'tasks' },
  { l: 'В работе', v: 3, dot: 'var(--warn)', screen: 'tasks' },
  { l: 'Просрочено', v: 1, danger: true, dot: 'var(--accent)', screen: 'tasks' }
]

const weekRaw = [
  { d: 'Пн', v: 3 },
  { d: 'Вт', v: 5 },
  { d: 'Ср', v: 2 },
  { d: 'Чт', v: 6 },
  { d: 'Пт', v: 4 },
  { d: 'Сб', v: 7 },
  { d: 'Вс', v: 5 }
]

const board: { label: string; cards: { t: string; p: string; pr: Pr; due: string }[] }[] = [
  {
    label: 'Входящие',
    cards: [
      { t: 'Счёт от хостинга', p: 'Финансы', pr: 'med', due: '—' },
      { t: 'Идея: автоматизировать отчёт', p: 'Журнал', pr: 'low', due: '—' }
    ]
  },
  {
    label: 'К выполнению',
    cards: [
      { t: 'Закупка материалов', p: 'Ремонт', pr: 'med', due: '24 июн' },
      { t: 'Прочитать главу 4', p: 'Библиотека', pr: 'low', due: '25 июн' }
    ]
  },
  {
    label: 'В работе',
    cards: [
      { t: 'Согласовать договор', p: 'Ремонт', pr: 'high', due: 'сегодня' },
      { t: 'Месячный отчёт', p: 'Финансы', pr: 'high', due: 'сегодня' },
      { t: 'Ответить Анне по смете', p: 'Работа', pr: 'med', due: 'сегодня' }
    ]
  },
  { label: 'Ожидание', cards: [{ t: 'Подпись договора', p: 'Ремонт', pr: 'high', due: '25 июн' }] },
  {
    label: 'Готово',
    cards: [
      { t: 'Тренировка — ноги', p: 'Здоровье', pr: 'low', due: 'вчера' },
      { t: 'Созвон с командой', p: 'Работа', pr: 'med', due: 'вчера' }
    ]
  }
]
const colDots = ['var(--fg3)', 'var(--fg2)', 'var(--accent)', 'var(--warn)', 'var(--ok)']

const statusMeta: Record<Status, { label: string; key: number }> = {
  inbox: { label: 'Входящие', key: 0 },
  todo: { label: 'К выполнению', key: 1 },
  doing: { label: 'В работе', key: 2 },
  wait: { label: 'Ожидание', key: 3 },
  done: { label: 'Готово', key: 4 }
}
const statusOrder: Status[] = ['inbox', 'todo', 'doing', 'wait', 'done']

const tasksData: TaskRow[] = [
  {
    title: 'Согласовать договор с подрядчиком',
    status: 'doing',
    project: 'Ремонт',
    client: 'Подрядчик',
    context: '@звонки',
    pr: 'high',
    start: 22,
    end: 22,
    due: 'сегодня'
  },
  {
    title: 'Месячный отчёт по финансам',
    status: 'doing',
    project: 'Финансы',
    client: 'Личное',
    context: '@компьютер',
    pr: 'high',
    start: 20,
    end: 23,
    due: 'сегодня'
  },
  {
    title: 'Ответить Анне по смете',
    status: 'doing',
    project: 'Работа',
    client: 'Анна Котова',
    context: '@звонки',
    pr: 'med',
    start: 22,
    end: 22,
    due: 'сегодня'
  },
  {
    title: 'Закупка материалов',
    status: 'todo',
    project: 'Ремонт',
    client: 'Подрядчик',
    context: '@город',
    pr: 'med',
    start: 23,
    end: 24,
    due: '24 июн'
  },
  {
    title: 'Прочитать главу 4',
    status: 'todo',
    project: 'Библиотека',
    client: 'Личное',
    context: '@дом',
    pr: 'low',
    start: 24,
    end: 27,
    due: '25 июн'
  },
  {
    title: 'Записать показания счётчиков',
    status: 'todo',
    project: 'Финансы',
    client: 'Личное',
    context: '@дом',
    pr: 'low',
    start: 25,
    end: 25,
    due: '25 июн'
  },
  {
    title: 'Подпись договора',
    status: 'wait',
    project: 'Ремонт',
    client: 'Подрядчик',
    context: '@звонки',
    pr: 'high',
    start: 25,
    end: 26,
    due: '25 июн'
  },
  {
    title: 'Перечитать главу про обзор',
    status: 'wait',
    project: 'Библиотека',
    client: 'Личное',
    context: '@дом',
    pr: 'low',
    start: 27,
    end: 29,
    due: '27 июн'
  },
  {
    title: 'Счёт от хостинга',
    status: 'inbox',
    project: 'Финансы',
    client: 'Банк',
    context: '@компьютер',
    pr: 'med',
    start: 22,
    end: 24,
    due: '—'
  },
  {
    title: 'Идея: автоматизировать отчёт',
    status: 'inbox',
    project: 'Журнал',
    client: 'Личное',
    context: '@компьютер',
    pr: 'low',
    start: 26,
    end: 28,
    due: '—'
  },
  {
    title: 'Тренировка — ноги',
    status: 'done',
    project: 'Здоровье',
    client: 'Личное',
    context: '@дом',
    pr: 'low',
    start: 21,
    end: 21,
    due: 'вчера'
  },
  {
    title: 'Созвон с командой',
    status: 'done',
    project: 'Работа',
    client: 'Команда X',
    context: '@звонки',
    pr: 'med',
    start: 21,
    end: 21,
    due: 'вчера'
  }
]

const projects = [
  { name: 'Ремонт', count: 6 },
  { name: 'Работа', count: 4 },
  { name: 'Финансы', count: 3 },
  { name: 'Здоровье', count: 2 },
  { name: 'Библиотека', count: 5 }
]
const contexts = ['@дом', '@звонки', '@компьютер', '@город', '@ожидание']
const gtdInbox = [
  { t: 'Счёт от хостинга — оплатить' },
  { t: 'Идея: автоматизировать месячный отчёт' },
  { t: 'Пропущенный звонок — Банк' },
  { t: 'Статья про PARA — прочитать' },
  { t: 'Записать показания счётчиков' }
]

const journalFull = [
  { src: 'Почта', txt: 'Счёт от хостинга на 1 240 ₽', time: '09:12' },
  { src: 'Я', txt: 'Идея: автоматизировать месячный отчёт по финансам', time: '08:40' },
  { src: 'Телефон', txt: 'Пропущенный звонок — Банк', time: 'вчера' },
  { src: 'Сервис', txt: 'Доставка: посылка в пункте выдачи', time: 'вчера' },
  { src: 'Я', txt: 'Спросить у Анны про сроки по проекту X', time: 'вчера' },
  { src: 'Календарь', txt: 'Напоминание: продлить домен flow.bpm', time: '2 дня' },
  { src: 'Я', txt: 'Перечитать главу про еженедельный обзор', time: '3 дня' }
]

const prMap: Record<Pr, string> = { high: 'var(--accent)', med: 'var(--warn)', low: 'var(--fg3)' }
const prLabel: Record<Pr, string> = { high: 'Высокий', med: 'Средний', low: 'Низкий' }

const para = [
  {
    k: 'P',
    title: 'Проекты',
    sub: 'Активные, с целью и сроком',
    items: [
      { name: 'Ремонт квартиры', meta: '6 задач · до 30 июн' },
      { name: 'Запуск проекта X', meta: '4 задачи · до 15 июл' },
      { name: 'Месячный отчёт', meta: '2 задачи · сегодня' }
    ]
  },
  {
    k: 'A',
    title: 'Области',
    sub: 'Зоны ответственности',
    items: [
      { name: 'Здоровье', meta: 'привычки · тренировки' },
      { name: 'Финансы', meta: 'бюджет · накопления' },
      { name: 'Работа', meta: 'клиенты · проекты' },
      { name: 'Развитие', meta: 'обучение · чтение' }
    ]
  },
  {
    k: 'R',
    title: 'Ресурсы',
    sub: 'Справочные материалы',
    items: [
      { name: 'BPM-методики', meta: '12 заметок' },
      { name: 'Рецепты', meta: '8 заметок' },
      { name: 'Путешествия', meta: '5 заметок' },
      { name: 'Дизайн-референсы', meta: '21 заметка' }
    ]
  },
  {
    k: 'A',
    title: 'Архив',
    sub: 'Завершённое и неактивное',
    items: [
      { name: 'Отпуск 2025', meta: 'завершён' },
      { name: 'Лендинг для клиента', meta: 'сдан' },
      { name: 'Курс по Python', meta: 'пройден' }
    ]
  }
]

const finBalances = [
  { l: 'Общий баланс', v: '248 600 ₽', sub: 'по трём счетам', c: 'var(--fg)' },
  { l: 'Доходы · июнь', v: '180 000 ₽', sub: '↑ 8% к маю', c: 'var(--ok)' },
  { l: 'Расходы · июнь', v: '92 400 ₽', sub: 'из 120 000 ₽', c: 'var(--fg)' },
  { l: 'Накоплено', v: '34%', sub: 'от дохода', c: 'var(--accent)' }
]
const accounts = [
  { name: 'Тинькофф · карта', v: '128 400 ₽' },
  { name: 'Наличные', v: '12 200 ₽' },
  { name: 'Накопительный счёт', v: '108 000 ₽' }
]
const budgets = [
  { name: 'Жильё', spent: 38000, limit: 45000 },
  { name: 'Продукты', spent: 24500, limit: 30000 },
  { name: 'Транспорт', spent: 8200, limit: 12000 },
  { name: 'Развлечения', spent: 11700, limit: 10000 },
  { name: 'Здоровье', spent: 6000, limit: 8000 },
  { name: 'Прочее', spent: 4000, limit: 15000 }
]
const transactions = [
  { name: 'Пятёрочка', cat: 'Продукты', amt: -2340, date: 'сегодня' },
  { name: 'Зарплата', cat: 'Доход', amt: 180000, date: '1 июн' },
  { name: 'Хостинг', cat: 'Сервисы', amt: -1240, date: 'вчера' },
  { name: 'Кофейня', cat: 'Развлечения', amt: -420, date: 'вчера' },
  { name: 'Такси', cat: 'Транспорт', amt: -680, date: '21 июн' },
  { name: 'Аптека', cat: 'Здоровье', amt: -1560, date: '20 июн' }
]
const spendData = [
  { m: 'Янв', v: 84 },
  { m: 'Фев', v: 71 },
  { m: 'Мар', v: 96 },
  { m: 'Апр', v: 88 },
  { m: 'Май', v: 79 },
  { m: 'Июн', v: 92 }
]

const palette = [
  { l: 'bg', v: 'var(--bg)' },
  { l: 'surface', v: 'var(--surface)' },
  { l: 'surface-2', v: 'var(--surface-2)' },
  { l: 'fg2', v: 'var(--fg2)' },
  { l: 'fg', v: 'var(--fg)' },
  { l: 'ok', v: 'var(--ok)' },
  { l: 'accent', v: 'var(--accent)' }
]
const statusPills = [
  { l: 'Входящее', c: 'var(--fg2)', bg: 'var(--surface-2)' },
  { l: 'В работе', c: 'var(--accent)', bg: 'var(--accent-soft)' },
  { l: 'Ожидание', c: 'var(--warn)', bg: 'rgba(217,160,78,0.14)' },
  { l: 'Готово', c: 'var(--ok)', bg: 'rgba(63,185,132,0.14)' }
]
const qaView = [
  { l: 'Событие в журнал', target: 'journal' },
  { l: 'Новая задача', target: 'tasks' },
  { l: 'Новый диалог', target: 'dialogs' },
  { l: 'Быстрая заметка', target: 'journal' }
]

const countStyle = "font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--fg3);"
const filterActiveStyle =
  'font-size:12px;font-weight:600;color:var(--fg);background:var(--surface-2);border:1px solid var(--line-2);border-radius:8px;padding:6px 12px;cursor:pointer;'
const srcStyle =
  'font-size:9.5px;font-weight:600;letter-spacing:.02em;color:var(--fg2);background:var(--surface-2);border-radius:5px;padding:3px 8px;flex:none;white-space:nowrap;'

const typeLabels: Record<LibItem['type'], string> = {
  article: 'Статья',
  book: 'Книга',
  note: 'Заметка',
  video: 'Видео'
}
const stMap: Record<LibItem['status'], { l: string; c: string }> = {
  reading: { l: 'Читаю', c: 'var(--accent)' },
  done: { l: 'Прочитано', c: 'var(--ok)' },
  queue: { l: 'В очереди', c: 'var(--fg3)' }
}

// ===== helpers =====
function rub(n: number): string {
  return Math.abs(n).toLocaleString('ru-RU')
}
function hexA(hex: string, a: number): string {
  let h = (hex || '#E11D48').replace('#', '')
  if (h.length === 3)
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  const n = parseInt(h, 16)
  return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'
}
function statusColor(st: Status): string {
  const a = props.accent || '#E11D48'
  return (
    (
      { inbox: '#646B7C', todo: '#9AA1B2', doing: a, wait: '#D9A04E', done: '#3FB984' } as Record<
        string,
        string
      >
    )[st] || '#646B7C'
  )
}
function navStyle(active: boolean): Record<string, string> {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: '11px',
    padding: '9px 9px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? '600' : '500',
    color: active ? 'var(--fg)' : 'var(--fg2)',
    background: active ? 'var(--surface-2)' : 'transparent',
    boxShadow: active ? 'inset 2px 0 0 var(--accent)' : 'none',
    transition: 'background .12s,color .12s'
  }
}
function segStyle(active: boolean): Record<string, string> {
  return {
    padding: '6px 14px',
    fontFamily: "'Manrope',sans-serif",
    fontSize: '12px',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '7px',
    background: active ? 'var(--accent)' : 'transparent',
    color: active ? 'var(--accent-fg)' : 'var(--fg2)',
    border: 'none',
    whiteSpace: 'nowrap'
  }
}
function avatar(ai: boolean, active: boolean): Record<string, string> {
  return {
    width: '32px',
    height: '32px',
    borderRadius: ai ? '9px' : '50%',
    background: ai ? 'var(--accent-soft)' : 'var(--surface-2)',
    border: '1px solid ' + (ai ? 'var(--accent-line)' : active ? 'var(--line-2)' : 'var(--line)'),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: "'Manrope',sans-serif",
    fontSize: '12px',
    fontWeight: '700',
    color: ai ? 'var(--accent)' : 'var(--fg2)',
    flex: 'none'
  }
}

// ===== actions =====
function open(scr: string): void {
  log.info('Навигация по экрану', { from: screen.value, to: scr })
  if (scr !== 'stub') stubName.value = ''
  screen.value = scr
}
function openStub(name: string): void {
  log.info('Открыт модуль-заглушка', { name })
  stubName.value = name
  screen.value = 'stub'
}
function selectThread(id: string): void {
  log.debug('Выбор треда диалога', { id })
  activeThread.value = id
  screen.value = 'dialogs'
}
function setTaskView(v: string): void {
  log.debug('Переключение вида задач', { view: v })
  taskView.value = v
}
function setTableSort(k: string): void {
  if (tableSortKey.value === k) {
    tableSortDir.value = tableSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    tableSortKey.value = k
    tableSortDir.value = 'asc'
  }
  log.debug('Сортировка таблицы', { key: tableSortKey.value, dir: tableSortDir.value })
}
function setTableGroup(g: string): void {
  log.debug('Группировка таблицы', { group: g })
  tableGroup.value = g
}
function setLibFilter(k: string): void {
  log.debug('Фильтр библиотеки', { filter: k })
  libFilter.value = k
}
function toggleTask(i: number): void {
  const a = todayTasks.value.slice()
  const cur = a[i]
  if (!cur) return
  a[i] = { ...cur, done: !cur.done }
  todayTasks.value = a
  log.debug('Переключение задачи дня', { index: i, done: !cur.done })
}
function toggleHabit(id: string): void {
  habits.value = habits.value.map((h) => (h.id === id ? { ...h, done: !h.done } : h))
  log.debug('Переключение привычки', { id })
}
function toggleService(id: string): void {
  services.value = services.value.map((v) => (v.id === id ? { ...v, on: !v.on } : v))
  log.debug('Переключение сервиса', { id })
}
function send(): void {
  const txt = composer.value.trim()
  if (!txt) {
    log.debug('Пустое сообщение — отправка пропущена')
    return
  }
  const cur = (messages.value[activeThread.value] || []).slice()
  cur.push({ role: 'me', text: txt, time: 'сейчас' })
  messages.value = { ...messages.value, [activeThread.value]: cur }
  composer.value = ''
  log.info('Сообщение отправлено в тред', { thread: activeThread.value })
}
function pomoToggle(): void {
  if (pomoRunning.value) {
    if (pomoTimer) clearInterval(pomoTimer)
    pomoRunning.value = false
    log.info('Помодоро: пауза', { sec: pomoSec.value })
  } else {
    if (pomoSec.value <= 0) pomoSec.value = 1500
    pomoRunning.value = true
    log.info('Помодоро: старт', { sec: pomoSec.value })
    pomoTimer = setInterval(() => {
      if (pomoSec.value <= 1) {
        if (pomoTimer) clearInterval(pomoTimer)
        pomoSec.value = 0
        pomoRunning.value = false
        log.info('Помодоро: завершён')
      } else {
        pomoSec.value = pomoSec.value - 1
      }
    }, 1000)
  }
}
function pomoReset(): void {
  if (pomoTimer) clearInterval(pomoTimer)
  pomoSec.value = 1500
  pomoRunning.value = false
  log.info('Помодоро: сброс')
}

// ===== computed views =====
const rootStyle = computed<Record<string, string>>(() => {
  const accent = props.accent || '#E11D48'
  const comfy = props.density !== 'compact'
  return {
    '--bg': '#0E1014',
    '--surface': '#15181F',
    '--surface-2': '#1B1F28',
    '--elevated': '#20242E',
    '--line': 'rgba(255,255,255,0.07)',
    '--line-2': 'rgba(255,255,255,0.14)',
    '--fg': '#ECEEF3',
    '--fg2': '#9AA1B2',
    '--fg3': '#646B7C',
    '--accent': accent,
    '--accent-fg': '#ffffff',
    '--accent-soft': hexA(accent, 0.14),
    '--accent-line': hexA(accent, 0.4),
    '--ok': '#3FB984',
    '--warn': '#D9A04E',
    '--pad': comfy ? '18px' : '14px',
    '--base': comfy ? '13.5px' : '13px',
    display: 'flex',
    height: '100vh',
    width: '100%',
    background: 'var(--bg)',
    color: 'var(--fg)',
    fontFamily: "'Manrope',system-ui,sans-serif",
    fontSize: 'var(--base)',
    overflow: 'hidden'
  }
})

const titles: Record<string, string> = {
  home: 'Главная',
  journal: 'Журнал',
  tasks: 'Задачи',
  dialogs: 'Диалоги',
  tools: 'Инструменты',
  para: 'PARA',
  finances: 'Финансы',
  services: 'Сервисы',
  library: 'Библиотека',
  components: 'Дизайн-система'
}
const screenTitle = computed(() =>
  screen.value === 'stub' ? stubName.value : titles[screen.value] || ''
)

const ns = computed(() => ({
  home: navStyle(screen.value === 'home'),
  journal: navStyle(screen.value === 'journal'),
  tasks: navStyle(screen.value === 'tasks'),
  dialogs: navStyle(screen.value === 'dialogs'),
  tools: navStyle(screen.value === 'tools'),
  para: navStyle(screen.value === 'para'),
  finances: navStyle(screen.value === 'finances'),
  services: navStyle(screen.value === 'services'),
  library: navStyle(screen.value === 'library'),
  components: navStyle(screen.value === 'components')
}))

const todayView = computed(() =>
  todayTasks.value.map((t, i) => ({
    i,
    title: t.title,
    proj: t.proj,
    time: t.time,
    done: t.done,
    prColor: prMap[t.pr],
    boxStyle: {
      width: '18px',
      height: '18px',
      borderRadius: '5px',
      border: '1.5px solid ' + (t.done ? 'var(--accent)' : 'var(--line-2)'),
      background: t.done ? 'var(--accent)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      flex: 'none'
    },
    titleStyle:
      'text-decoration:' +
      (t.done ? 'line-through' : 'none') +
      ';color:' +
      (t.done ? 'var(--fg3)' : 'var(--fg)') +
      ';'
  }))
)
const todayCount = computed(() => todayTasks.value.filter((t) => !t.done).length)
const metrics = computed(() =>
  metricsRaw.map((m) => ({
    l: m.l,
    v: m.v,
    dot: m.dot,
    c: m.danger ? 'var(--accent)' : 'var(--fg)',
    screen: m.screen
  }))
)
const weekMax = Math.max(...weekRaw.map((w) => w.v))
const weekBars = computed(() =>
  weekRaw.map((w) => ({
    d: w.d,
    h: 10 + (w.v / weekMax) * 62 + 'px',
    h2: 6 + (w.v / weekMax) * 30 + 'px'
  }))
)

function mkThread(t: Thread) {
  return {
    id: t.id,
    name: t.name,
    ai: t.ai,
    last: t.last,
    time: t.time,
    unread: t.unread,
    hasUnread: t.unread > 0,
    initial: t.ai ? '◆' : t.name.charAt(0),
    avatarStyle: avatar(t.ai, false),
    rowStyle: {
      display: 'flex',
      alignItems: 'center',
      gap: '11px',
      padding: '12px 14px',
      cursor: 'pointer',
      borderBottom: '1px solid var(--line)',
      background: activeThread.value === t.id ? 'var(--surface-2)' : 'transparent',
      boxShadow: activeThread.value === t.id ? 'inset 2px 0 0 var(--accent)' : 'none'
    }
  }
}
const threadsView = computed(() => threads.map(mkThread))
const recentView = computed(() => threads.slice(0, 4).map(mkThread))
const activeThreadObj = computed(
  () => threads.find((t) => t.id === activeThread.value) ?? threads[0]!
)
const msgsView = computed(() =>
  (messages.value[activeThread.value] || []).map((m) => ({
    text: m.text,
    time: m.time,
    isAi: m.role === 'ai',
    rowStyle: {
      display: 'flex',
      justifyContent: m.role === 'me' ? 'flex-end' : 'flex-start',
      marginBottom: '14px'
    },
    bubbleStyle:
      m.role === 'ai'
        ? {
            maxWidth: '76%',
            padding: '13px 15px',
            borderRadius: '13px 13px 13px 4px',
            border: '1px solid var(--accent-line)',
            background: 'var(--accent-soft)'
          }
        : m.role === 'me'
          ? {
              maxWidth: '76%',
              padding: '13px 15px',
              borderRadius: '13px 13px 4px 13px',
              border: '1px solid var(--line)',
              background: 'var(--surface-2)'
            }
          : {
              maxWidth: '76%',
              padding: '13px 15px',
              borderRadius: '13px 13px 13px 4px',
              border: '1px solid var(--line)',
              background: 'var(--surface)'
            }
  }))
)
const atName = computed(() => activeThreadObj.value.name)
const atAi = computed(() => activeThreadObj.value.ai)
const atInitial = computed(() =>
  activeThreadObj.value.ai ? '◆' : activeThreadObj.value.name.charAt(0)
)
const atAvatarStyle = computed(() => avatar(activeThreadObj.value.ai, true))
const atStatus = computed(() =>
  activeThreadObj.value.ai ? 'ИИ-ассистент · онлайн' : 'был(а) недавно'
)

const boardView = computed(() =>
  board.map((col, idx) => ({
    label: col.label,
    n: col.cards.length,
    dot: colDots[idx],
    cards: col.cards.map((c) => ({
      t: c.t,
      p: c.p,
      due: c.due,
      prColor: prMap[c.pr],
      prLabel: prLabel[c.pr]
    }))
  }))
)

const tvSeg = computed(() => ({
  board: segStyle(taskView.value === 'board'),
  table: segStyle(taskView.value === 'table'),
  timeline: segStyle(taskView.value === 'timeline'),
  gtd: segStyle(taskView.value === 'gtd')
}))

// table
type Cmp = (a: TaskRow, b: TaskRow) => number
type Keyer = (t: TaskRow) => string
const prOrder: Record<Pr, number> = { high: 0, med: 1, low: 2 }
const filteredSortedRows = computed<TaskRow[]>(() => {
  const tf = tableFilter.value.trim().toLowerCase()
  const rows = tasksData.filter(
    (t) =>
      !tf ||
      (t.title + ' ' + t.project + ' ' + t.client + ' ' + t.context).toLowerCase().includes(tf)
  )
  const cmp: {
    title: Cmp
    status: Cmp
    project: Cmp
    client: Cmp
    context: Cmp
    pr: Cmp
    due: Cmp
  } = {
    title: (a, b) => a.title.localeCompare(b.title, 'ru'),
    status: (a, b) => statusMeta[a.status].key - statusMeta[b.status].key,
    project: (a, b) => a.project.localeCompare(b.project, 'ru'),
    client: (a, b) => a.client.localeCompare(b.client, 'ru'),
    context: (a, b) => a.context.localeCompare(b.context, 'ru'),
    pr: (a, b) => prOrder[a.pr] - prOrder[b.pr],
    due: (a, b) => a.start - b.start
  }
  const dir = tableSortDir.value === 'asc' ? 1 : -1
  return rows.slice().sort((a, b) => {
    const fn = (cmp as Record<string, Cmp>)[tableSortKey.value] || cmp.due
    const r = fn(a, b)
    return r !== 0 ? r * dir : a.start - b.start
  })
})
function mapRow(t: TaskRow) {
  return {
    title: t.title,
    project: t.project,
    client: t.client,
    context: t.context,
    due: t.due,
    statusLabel: statusMeta[t.status].label,
    statusColor: statusColor(t.status),
    prLabel: prLabel[t.pr],
    prColor: prMap[t.pr]
  }
}
const tableGroups = computed(() => {
  const rows = filteredSortedRows.value
  if (tableGroup.value === 'none') {
    return [
      { show: false, label: '', color: 'transparent', count: rows.length, rows: rows.map(mapRow) }
    ]
  }
  const keyer: { status: Keyer; context: Keyer; client: Keyer } = {
    status: (t) => t.status,
    context: (t) => t.context,
    client: (t) => t.client
  }
  const fn: Keyer = (keyer as Record<string, Keyer>)[tableGroup.value] || keyer.status
  const m = new Map<string, TaskRow[]>()
  rows.forEach((t) => {
    const k = fn(t)
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(t)
  })
  let keys = [...m.keys()]
  if (tableGroup.value === 'status')
    keys.sort((a, b) => statusMeta[a as Status].key - statusMeta[b as Status].key)
  else keys.sort((a, b) => a.localeCompare(b, 'ru'))
  return keys.map((k) => ({
    show: true,
    label: tableGroup.value === 'status' ? statusMeta[k as Status].label : k,
    color: tableGroup.value === 'status' ? statusColor(k as Status) : 'var(--fg3)',
    count: m.get(k)!.length,
    rows: m.get(k)!.map(mapRow)
  }))
})
const tableCount = computed(() => filteredSortedRows.value.length)
function arrowFor(k: string): string {
  return tableSortKey.value === k ? (tableSortDir.value === 'asc' ? '↑' : '↓') : ''
}
const arrow = computed(() => ({
  title: arrowFor('title'),
  status: arrowFor('status'),
  project: arrowFor('project'),
  client: arrowFor('client'),
  context: arrowFor('context'),
  pr: arrowFor('pr'),
  due: arrowFor('due')
}))
function hCell(k: string): string {
  return (
    'display:flex;align-items:center;gap:5px;font-size:10.5px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:' +
    (tableSortKey.value === k ? 'var(--fg)' : 'var(--fg2)') +
    ';cursor:pointer;user-select:none;min-width:0;'
  )
}
const hStyle = computed(() => ({
  title: hCell('title'),
  status: hCell('status'),
  project: hCell('project'),
  client: hCell('client'),
  context: hCell('context'),
  pr: hCell('pr'),
  due: hCell('due')
}))
const gbSeg = computed(() => ({
  none: segStyle(tableGroup.value === 'none'),
  status: segStyle(tableGroup.value === 'status'),
  context: segStyle(tableGroup.value === 'context'),
  client: segStyle(tableGroup.value === 'client')
}))

// timeline
const WIN_START = 20
const WIN_DAYS = 11
const dowArr = ['Сб', 'Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс', 'Пн', 'Вт']
const timelineDays = computed(() => {
  const out: { n: number; dow: string; headStyle: string }[] = []
  for (let i = 0; i < WIN_DAYS; i++) {
    const dw = dowArr[i] ?? ''
    const weekend = dw === 'Сб' || dw === 'Вс'
    out.push({
      n: WIN_START + i,
      dow: dw,
      headStyle:
        'padding:9px 0;text-align:center;border-left:1px solid var(--line);' +
        (weekend ? 'background:rgba(255,255,255,0.022);' : '')
    })
  }
  return out
})
const timelineRows = computed(() =>
  tasksData
    .slice()
    .sort((a, b) => a.start - b.start || a.end - b.end)
    .map((t) => {
      const c = statusColor(t.status)
      const left = ((t.start - WIN_START) / WIN_DAYS) * 100
      const width = ((t.end - t.start + 1) / WIN_DAYS) * 100
      return {
        title: t.title,
        prColor: prMap[t.pr],
        range: t.start === t.end ? t.start + ' июн' : t.start + '–' + t.end,
        barStyle: {
          position: 'absolute',
          top: '8px',
          bottom: '8px',
          left: left.toFixed(2) + '%',
          width: width.toFixed(2) + '%',
          background: hexA(c, 0.16),
          border: '1px solid ' + hexA(c, 0.5),
          borderRadius: '7px',
          display: 'flex',
          alignItems: 'center',
          gap: '7px',
          padding: '0 9px',
          overflow: 'hidden',
          boxShadow: 'inset 3px 0 0 ' + c
        }
      }
    })
)
const statusLegend = computed(() =>
  statusOrder.map((k) => ({ label: statusMeta[k].label, color: statusColor(k) }))
)

// para
const paraView = computed(() =>
  para.map((p) => ({ k: p.k, title: p.title, sub: p.sub, count: p.items.length, items: p.items }))
)

// finances
const budgetView = computed(() =>
  budgets.map((b) => {
    const pct = Math.round((b.spent / b.limit) * 100)
    const over = b.spent > b.limit
    const c = over ? 'var(--accent)' : pct >= 85 ? 'var(--warn)' : 'var(--ok)'
    return {
      name: b.name,
      pct: Math.min(pct, 100) + '%',
      c,
      label: rub(b.spent) + ' / ' + rub(b.limit)
    }
  })
)
const txView = computed(() =>
  transactions.map((t) => ({
    name: t.name,
    cat: t.cat,
    date: t.date,
    initial: t.name.charAt(0),
    amt: (t.amt > 0 ? '+ ' : '− ') + rub(t.amt) + ' ₽',
    c: t.amt > 0 ? 'var(--ok)' : 'var(--fg)'
  }))
)
const spMx = Math.max(...spendData.map((x) => x.v))
const spendBars = computed(() =>
  spendData.map((x, i) => ({
    m: x.m,
    h: 12 + (x.v / spMx) * 70 + 'px',
    bg: i === spendData.length - 1 ? 'var(--accent-soft)' : 'var(--surface-2)',
    line: i === spendData.length - 1 ? 'var(--accent)' : 'var(--line-2)'
  }))
)

// tools
const pomoTime = computed(() => {
  const mm = String(Math.floor(pomoSec.value / 60)).padStart(2, '0')
  const ss = String(pomoSec.value % 60).padStart(2, '0')
  return mm + ':' + ss
})
const pomoPct = computed(() => ((1500 - pomoSec.value) / 1500) * 100 + '%')
const pomoLabel = computed(() => (pomoRunning.value ? 'Пауза' : 'Старт'))
const habitView = computed(() =>
  habits.value.map((h) => ({
    id: h.id,
    name: h.name,
    done: h.done,
    boxStyle: {
      width: '20px',
      height: '20px',
      borderRadius: '6px',
      border: '1.5px solid ' + (h.done ? 'var(--accent)' : 'var(--line-2)'),
      background: h.done ? 'var(--accent)' : 'transparent',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 'none'
    },
    titleStyle:
      'color:' +
      (h.done ? 'var(--fg3)' : 'var(--fg)') +
      ';text-decoration:' +
      (h.done ? 'line-through' : 'none') +
      ';'
  }))
)
const habitsDone = computed(
  () => habits.value.filter((h) => h.done).length + ' / ' + habits.value.length
)

// services
const svOrder = ['Коммуникации', 'Финансы и покупки', 'Продуктивность', 'Разработка', 'Здоровье']
function svMap(sv: Service) {
  return {
    id: sv.id,
    name: sv.name,
    desc: sv.desc,
    tag: sv.tag,
    hasTag: sv.on && !!sv.tag,
    glyph: sv.glyph,
    last: sv.on ? sv.last : 'Не подключено',
    lastColor: sv.on ? 'var(--ok)' : 'var(--fg3)',
    iconColor: sv.on ? 'var(--accent)' : 'var(--fg3)',
    cardStyle: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: '14px',
      padding: '16px',
      background: 'var(--surface)',
      border: '1px solid var(--line)',
      borderRadius: '13px',
      opacity: sv.on ? '1' : '.66'
    },
    switchStyle: {
      width: '38px',
      height: '22px',
      borderRadius: '12px',
      background: sv.on ? 'var(--accent)' : 'var(--surface-2)',
      border: '1px solid ' + (sv.on ? 'var(--accent-line)' : 'var(--line-2)'),
      flex: 'none',
      cursor: 'pointer',
      padding: '2px',
      display: 'flex',
      transition: 'background .15s'
    },
    knobStyle: {
      width: '16px',
      height: '16px',
      borderRadius: '50%',
      background: sv.on ? '#fff' : 'var(--fg3)',
      marginLeft: sv.on ? '16px' : '0',
      transition: 'margin .15s,background .15s'
    }
  }
}
const serviceGroups = computed(() => {
  const byCat: Record<string, Service[]> = {}
  services.value.forEach((sv) => {
    ;(byCat[sv.cat] = byCat[sv.cat] || []).push(sv)
  })
  return svOrder
    .filter((c) => byCat[c])
    .map((c) => {
      const list = byCat[c]!
      return {
        label: c,
        count: list.filter((v) => v.on).length + ' / ' + list.length,
        items: list.map(svMap)
      }
    })
})

// library
const libFilteredArr = computed(() =>
  library.value.filter((b) => libFilter.value === 'all' || b.type === libFilter.value)
)
const libraryView = computed(() =>
  libFilteredArr.value.map((b) => ({
    title: b.title,
    author: b.author,
    tags: b.tags,
    typeLabel: typeLabels[b.type],
    statusLabel: stMap[b.status].l,
    statusColor: stMap[b.status].c,
    reading: b.status === 'reading',
    pct: b.progress + '%'
  }))
)
const libCount = computed(() => libFilteredArr.value.length + ' материалов')
const libTabsDef: [string, string][] = [
  ['all', 'Все'],
  ['article', 'Статьи'],
  ['book', 'Книги'],
  ['note', 'Заметки'],
  ['video', 'Видео']
]
const libTabs = computed(() =>
  libTabsDef.map((t) => ({ key: t[0], label: t[1], style: segStyle(libFilter.value === t[0]) }))
)

const journalMiniView = computed(() => journalFull.slice(0, 3))

// ===== lifecycle =====
let browserRemoteLogger: ReturnType<typeof createBrowserRemoteLogger> | null = null

onMounted(() => {
  log.info('Компонент FlowPage смонтирован', {
    userName: props.userName,
    accent: props.accent,
    density: props.density,
    screen: screen.value
  })
  browserRemoteLogger = createBrowserRemoteLogger({
    post: (payload) => postBrowserLogsRoute.run(ctx, payload)
  })
  browserRemoteLogger.installConsoleAndGlobalHandlers()
  setLogSink((entry: LogEntry) => {
    browserRemoteLogger!.pushSinkEntry(entry)
  })
  log.debug('Browser remote logger инициализирован')
})

onBeforeUnmount(() => {
  log.info('onBeforeUnmount: сброс буфера логов')
  if (browserRemoteLogger) browserRemoteLogger.flush()
})

onUnmounted(() => {
  log.info('Компонент FlowPage размонтирован')
  setLogSink(null)
  if (browserRemoteLogger) {
    browserRemoteLogger.teardown()
    browserRemoteLogger = null
  }
  if (pomoTimer) clearInterval(pomoTimer)
})
</script>

<template>
  <div :style="rootStyle">
    <!-- ============ SIDEBAR ============ -->
    <div
      data-role="sidebar"
      style="
        width: 224px;
        flex: none;
        border-right: 1px solid var(--line);
        display: flex;
        flex-direction: column;
        background: var(--bg);
        min-width: 0;
      "
    >
      <div
        style="
          height: 60px;
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 0 16px;
          border-bottom: 1px solid var(--line);
          flex: none;
        "
      >
        <div
          style="
            width: 26px;
            height: 26px;
            display: flex;
            align-items: center;
            justify-content: center;
            flex: none;
            border-radius: 7px;
            background: var(--accent);
            color: #fff;
            font-weight: 800;
            font-size: 14px;
            letter-spacing: -0.02em;
          "
        >
          F
        </div>
        <div
          data-role="brandtext"
          style="display: flex; flex-direction: column; line-height: 1.2; min-width: 0"
        >
          <span style="font-weight: 700; font-size: 15px; letter-spacing: 0.01em; color: var(--fg)"
            >FLOW</span
          >
          <span style="font-size: 10.5px; color: var(--fg3)">Личная BPM-система</span>
        </div>
      </div>

      <div
        style="
          flex: 1;
          overflow: auto;
          padding: 12px 11px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-height: 0;
        "
      >
        <div @click="open('home')" :style="ns.home" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <path d="M2.5 7 8 2.5 13.5 7" />
            <path d="M3.8 7v6.2h8.4V7" />
          </svg>
          <span data-role="navlabel" style="flex: 1">Главная</span>
        </div>

        <div
          style="
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.13em;
            color: var(--fg3);
            text-transform: uppercase;
            padding: 15px 9px 6px;
          "
          data-role="navlabel"
        >
          Пространство
        </div>
        <div @click="open('journal')" :style="ns.journal" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
            <line x1="2.5" y1="6.4" x2="13.5" y2="6.4" />
            <line x1="5.4" y1="9.4" x2="10.6" y2="9.4" />
            <line x1="5.4" y1="11.2" x2="8.6" y2="11.2" />
          </svg>
          <span data-role="navlabel" style="flex: 1">Журнал</span>
          <span data-role="navcount" :style="countStyle">7</span>
        </div>
        <div @click="open('tasks')" :style="ns.tasks" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <rect x="2.5" y="2.5" width="11" height="11" rx="2" />
            <polyline points="5,8 7,10 11,5.5" />
          </svg>
          <span data-role="navlabel" style="flex: 1">Задачи</span>
          <span data-role="navcount" :style="countStyle">5</span>
        </div>
        <div @click="open('dialogs')" :style="ns.dialogs" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <path
              d="M2.5 4.5a2 2 0 0 1 2-2h7a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H6l-3 2.5V10.5H4.5a2 2 0 0 1-2-2Z"
            />
          </svg>
          <span data-role="navlabel" style="flex: 1">Диалоги</span>
          <span
            style="
              width: 7px;
              height: 7px;
              border-radius: 50%;
              background: var(--accent);
              flex: none;
              animation: softpulse 2.2s infinite;
            "
          ></span>
        </div>

        <div
          style="
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 0.13em;
            color: var(--fg3);
            text-transform: uppercase;
            padding: 16px 9px 6px;
          "
          data-role="navlabel"
        >
          Модули
        </div>
        <div @click="open('tools')" :style="ns.tools" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <path
              d="M10.5 2.8a3 3 0 0 0-3.9 3.7L2.7 10.4a1.3 1.3 0 0 0 1.9 1.9l3.9-3.9a3 3 0 0 0 3.7-3.9l-1.8 1.8-1.6-.4-.4-1.6Z"
            />
          </svg>
          <span data-role="navlabel" style="flex: 1">Инструменты</span>
        </div>
        <div @click="open('para')" :style="ns.para" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <rect x="2.5" y="2.5" width="4.6" height="4.6" rx="1" />
            <rect x="8.9" y="2.5" width="4.6" height="4.6" rx="1" />
            <rect x="2.5" y="8.9" width="4.6" height="4.6" rx="1" />
            <rect x="8.9" y="8.9" width="4.6" height="4.6" rx="1" />
          </svg>
          <span data-role="navlabel" style="flex: 1">PARA</span>
        </div>
        <div @click="open('finances')" :style="ns.finances" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <circle cx="8" cy="8" r="5.5" />
            <path
              d="M9.6 6.2c-.3-.7-1-1-1.7-1-1 0-1.6.6-1.6 1.3 0 1.9 3.4.9 3.4 2.9 0 .8-.7 1.4-1.7 1.4-.9 0-1.6-.4-1.9-1.1"
            />
            <line x1="8" y1="4" x2="8" y2="5" />
            <line x1="8" y1="11" x2="8" y2="12" />
          </svg>
          <span data-role="navlabel" style="flex: 1">Финансы</span>
        </div>
        <div @click="open('services')" :style="ns.services" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <circle cx="8" cy="8" r="2.1" />
            <path
              d="M8 1.6v1.7M8 12.7v1.7M3.5 3.5l1.2 1.2M11.3 11.3l1.2 1.2M1.6 8h1.7M12.7 8h1.7M3.5 12.5l1.2-1.2M11.3 4.7l1.2-1.2"
            />
          </svg>
          <span data-role="navlabel" style="flex: 1">Сервисы</span>
        </div>
        <div @click="open('library')" :style="ns.library" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <path d="M2.6 3.3c1.6-.7 3.4-.7 5 0v9c-1.6-.7-3.4-.7-5 0Z" />
            <path d="M13.4 3.3c-1.6-.7-3.4-.7-5 0v9c1.6-.7 3.4-.7 5 0Z" />
          </svg>
          <span data-role="navlabel" style="flex: 1">Библиотека</span>
        </div>
      </div>

      <div
        style="
          border-top: 1px solid var(--line);
          padding: 11px;
          flex: none;
          display: flex;
          flex-direction: column;
          gap: 2px;
        "
      >
        <div @click="open('components')" :style="ns.components" class="fl-hov-surface2">
          <svg
            width="17"
            height="17"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            stroke-width="1.4"
            style="flex: none"
          >
            <circle cx="5.6" cy="5.6" r="2.7" />
            <rect x="8.6" y="8.6" width="5" height="5" rx="1" />
          </svg>
          <span data-role="navlabel" style="flex: 1">Дизайн-система</span>
        </div>
        <div style="display: flex; align-items: center; gap: 10px; padding: 9px 9px 4px">
          <div
            style="
              width: 27px;
              height: 27px;
              border-radius: 50%;
              background: var(--accent-soft);
              border: 1px solid var(--accent-line);
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: 700;
              color: var(--accent);
              flex: none;
            "
          >
            {{ userInitial }}
          </div>
          <div
            data-role="navlabel"
            style="flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.25"
          >
            <span style="font-size: 12.5px; font-weight: 600; color: var(--fg)">{{
              props.userName
            }}</span>
            <span style="font-size: 10.5px; color: var(--fg3)">{{ props.userHandle }}</span>
          </div>
          <span
            style="width: 7px; height: 7px; border-radius: 50%; background: var(--ok); flex: none"
          ></span>
        </div>
      </div>
    </div>
    <div style="flex: 1; display: flex; flex-direction: column; min-width: 0">
      <!-- topbar -->
      <div
        style="
          height: 58px;
          flex: none;
          border-bottom: 1px solid var(--line);
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 0 22px;
          background: var(--bg);
        "
      >
        <div style="font-size: 16px; font-weight: 700; letter-spacing: -0.01em; color: var(--fg)">
          {{ screenTitle }}
        </div>
        <div style="flex: 1"></div>
        <div
          data-role="topsearch"
          class="fl-focus-within"
          style="
            display: flex;
            align-items: center;
            gap: 9px;
            width: 260px;
            background: var(--surface-2);
            border: 1px solid var(--line);
            border-radius: 9px;
            padding: 8px 12px;
          "
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 16 16"
            fill="none"
            stroke="var(--fg3)"
            stroke-width="1.5"
            style="flex: none"
          >
            <circle cx="7" cy="7" r="4.2" />
            <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
          </svg>
          <input
            placeholder="Поиск по системе…"
            style="
              flex: 1;
              background: transparent;
              border: none;
              color: var(--fg);
              font-family: 'Manrope', sans-serif;
              font-size: 12.5px;
              outline: none;
              min-width: 0;
            "
          />
        </div>
        <button
          @click="open('journal')"
          class="fl-hov-bright"
          style="
            display: flex;
            align-items: center;
            gap: 7px;
            background: var(--accent);
            color: var(--accent-fg);
            border: none;
            border-radius: 9px;
            padding: 9px 14px;
            font-family: 'Manrope', sans-serif;
            font-size: 12.5px;
            font-weight: 600;
            cursor: pointer;
            flex: none;
          "
        >
          <svg
            width="13"
            height="13"
            viewBox="0 0 14 14"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
          >
            <line x1="7" y1="2.5" x2="7" y2="11.5" />
            <line x1="2.5" y1="7" x2="11.5" y2="7" /></svg
          >Захват
        </button>
      </div>
      <div style="flex: 1; overflow: auto; min-height: 0">
        <!-- ===== HOME ===== -->
        <div
          v-if="screen === 'home'"
          style="padding: 24px; max-width: 1180px; margin: 0 auto; animation: fadeUp 0.3s ease"
        >
          <div
            style="
              display: flex;
              align-items: flex-start;
              justify-content: space-between;
              gap: 18px;
              margin-bottom: 22px;
            "
          >
            <div>
              <div
                style="font-size: 24px; font-weight: 800; letter-spacing: -0.02em; color: var(--fg)"
              >
                {{ props.greeting }}
              </div>
              <div style="font-size: 13px; color: var(--fg2); margin-top: 6px">
                {{ props.dateLine }}
              </div>
            </div>
          </div>

          <!-- metrics -->
          <div
            data-role="metrics"
            style="
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 14px;
              margin-bottom: 22px;
            "
          >
            <div
              v-for="(m, mi) in metrics"
              :key="'m' + mi"
              @click="open(m.screen)"
              class="fl-hov-line2"
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                padding: 16px 17px;
                cursor: pointer;
                display: flex;
                flex-direction: column;
                gap: 11px;
              "
            >
              <div style="display: flex; align-items: center; justify-content: space-between">
                <span style="font-size: 11.5px; font-weight: 600; color: var(--fg2)">{{
                  m.l
                }}</span>
                <span
                  style="width: 8px; height: 8px; border-radius: 50%; flex: none"
                  :style="{ background: m.dot }"
                ></span>
              </div>
              <span
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 30px;
                  font-weight: 600;
                  line-height: 0.9;
                  font-variant-numeric: tabular-nums;
                "
                :style="{ color: m.c }"
                >{{ m.v }}</span
              >
            </div>
          </div>

          <div
            data-role="homegrid"
            style="display: grid; grid-template-columns: 1.62fr 1fr; gap: 16px; align-items: start"
          >
            <!-- left column -->
            <div style="display: flex; flex-direction: column; gap: 16px; min-width: 0">
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px">
                  <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
                    >Задачи на сегодня</span
                  >
                  <span
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 11px;
                      color: var(--fg3);
                    "
                    >{{ todayCount }}</span
                  >
                  <div style="flex: 1"></div>
                  <span
                    @click="open('tasks')"
                    class="fl-hov-bright15"
                    style="font-size: 12px; font-weight: 600; color: var(--accent); cursor: pointer"
                    >Все задачи →</span
                  >
                </div>
                <div
                  v-for="t in todayView"
                  :key="'today' + t.i"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    padding: 11px 0;
                    border-top: 1px solid var(--line);
                  "
                >
                  <div @click="toggleTask(t.i)" :style="t.boxStyle">
                    <svg
                      v-if="t.done"
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="var(--accent-fg)"
                      stroke-width="2.2"
                    >
                      <polyline points="2,6.5 5,9 10,3.5" />
                    </svg>
                  </div>
                  <div
                    style="width: 7px; height: 7px; border-radius: 50%; flex: none"
                    :style="{ background: t.prColor }"
                  ></div>
                  <div
                    style="
                      font-size: 13.5px;
                      font-weight: 500;
                      flex: 1;
                      min-width: 0;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    "
                    :style="t.titleStyle"
                  >
                    {{ t.title }}
                  </div>
                  <div
                    style="
                      font-size: 10.5px;
                      font-weight: 600;
                      color: var(--fg2);
                      background: var(--surface-2);
                      border-radius: 6px;
                      padding: 3px 8px;
                      white-space: nowrap;
                      flex: none;
                    "
                  >
                    {{ t.proj }}
                  </div>
                  <div
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 11px;
                      color: var(--fg3);
                      width: 46px;
                      text-align: right;
                      flex: none;
                    "
                  >
                    {{ t.time }}
                  </div>
                </div>
              </div>

              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                  "
                >
                  <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
                    >Активность за неделю</span
                  >
                  <span
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 11px;
                      color: var(--ok);
                    "
                    >23 закрыто</span
                  >
                </div>
                <div style="display: flex; align-items: flex-end; gap: 10px; height: 84px">
                  <div
                    v-for="(b, bi) in weekBars"
                    :key="'wk' + bi"
                    style="
                      flex: 1;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      gap: 8px;
                      height: 100%;
                      justify-content: flex-end;
                    "
                  >
                    <div
                      style="
                        width: 100%;
                        max-width: 30px;
                        background: var(--accent-soft);
                        border-top: 2px solid var(--accent);
                        border-radius: 4px 4px 0 0;
                      "
                      :style="{ height: b.h }"
                    ></div>
                    <span
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 10px;
                        color: var(--fg3);
                      "
                      >{{ b.d }}</span
                    >
                  </div>
                </div>
              </div>
            </div>

            <!-- right column -->
            <div style="display: flex; flex-direction: column; gap: 16px; min-width: 0">
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
                  >Быстрые действия</span
                >
                <div
                  style="display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 13px"
                >
                  <button
                    v-for="(q, qi) in qaView"
                    :key="'qa' + qi"
                    @click="open(q.target)"
                    class="fl-hov-accent"
                    style="
                      display: flex;
                      align-items: center;
                      gap: 9px;
                      padding: 11px 12px;
                      background: var(--surface-2);
                      border: 1px solid var(--line);
                      border-radius: 9px;
                      color: var(--fg);
                      font-family: 'Manrope', sans-serif;
                      font-size: 12px;
                      font-weight: 500;
                      cursor: pointer;
                      text-align: left;
                    "
                  >
                    <span style="color: var(--accent); font-size: 15px; line-height: 1; flex: none"
                      >＋</span
                    >{{ q.l }}
                  </button>
                </div>
              </div>

              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                  "
                >
                  <span style="font-size: 14px; font-weight: 700; color: var(--fg)">Диалоги</span>
                  <span
                    @click="open('dialogs')"
                    class="fl-hov-bright15"
                    style="font-size: 12px; font-weight: 600; color: var(--accent); cursor: pointer"
                    >Все →</span
                  >
                </div>
                <div
                  v-for="t in recentView"
                  :key="'rec' + t.id"
                  @click="selectThread(t.id)"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding: 9px 0;
                    border-top: 1px solid var(--line);
                    cursor: pointer;
                  "
                >
                  <div :style="t.avatarStyle">{{ t.initial }}</div>
                  <div style="flex: 1; min-width: 0">
                    <div style="display: flex; align-items: center; gap: 6px">
                      <span
                        style="
                          font-size: 12.5px;
                          color: var(--fg);
                          font-weight: 600;
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        "
                        >{{ t.name }}</span
                      ><span
                        v-if="t.ai"
                        style="
                          font-size: 8.5px;
                          font-weight: 600;
                          color: var(--accent);
                          background: var(--accent-soft);
                          border-radius: 4px;
                          padding: 1px 5px;
                          flex: none;
                        "
                        >ИИ</span
                      >
                    </div>
                    <div
                      style="
                        font-size: 11.5px;
                        color: var(--fg2);
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        margin-top: 3px;
                      "
                    >
                      {{ t.last }}
                    </div>
                  </div>
                  <div
                    style="
                      display: flex;
                      flex-direction: column;
                      align-items: flex-end;
                      gap: 6px;
                      flex: none;
                    "
                  >
                    <span
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 10px;
                        color: var(--fg3);
                      "
                      >{{ t.time }}</span
                    >
                    <span
                      v-if="t.hasUnread"
                      style="
                        min-width: 17px;
                        height: 17px;
                        padding: 0 5px;
                        border-radius: 9px;
                        background: var(--accent);
                        color: var(--accent-fg);
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 9.5px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                      "
                      >{{ t.unread }}</span
                    >
                  </div>
                </div>
              </div>

              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 10px;
                  "
                >
                  <div style="display: flex; align-items: center; gap: 9px">
                    <span style="font-size: 14px; font-weight: 700; color: var(--fg)">Журнал</span
                    ><span
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 11px;
                        color: var(--fg3);
                      "
                      >7 входящих</span
                    >
                  </div>
                  <span
                    @click="open('journal')"
                    class="fl-hov-bright15"
                    style="font-size: 12px; font-weight: 600; color: var(--accent); cursor: pointer"
                    >Открыть →</span
                  >
                </div>
                <div
                  v-for="(j, ji) in journalMiniView"
                  :key="'jm' + ji"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 9px 0;
                    border-top: 1px solid var(--line);
                  "
                >
                  <span :style="srcStyle">{{ j.src }}</span>
                  <span
                    style="
                      font-size: 12.5px;
                      color: var(--fg);
                      flex: 1;
                      min-width: 0;
                      overflow: hidden;
                      text-overflow: ellipsis;
                      white-space: nowrap;
                    "
                    >{{ j.txt }}</span
                  >
                  <span
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 10px;
                      color: var(--fg3);
                      flex: none;
                    "
                    >{{ j.time }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== JOURNAL ===== -->
        <div
          v-if="screen === 'journal'"
          style="padding: 24px; max-width: 860px; margin: 0 auto; animation: fadeUp 0.3s ease"
        >
          <div
            style="
              font-size: 13px;
              color: var(--fg2);
              line-height: 1.55;
              max-width: 600px;
              margin-bottom: 16px;
            "
          >
            Единая точка захвата. Всё новое — мысли, письма, события сервисов — попадает сюда, а
            отсюда вы направляете это дальше по системе.
          </div>

          <!-- BPM pipeline -->
          <div
            style="
              display: flex;
              align-items: center;
              gap: 8px;
              flex-wrap: wrap;
              margin-bottom: 18px;
              font-size: 11.5px;
              font-weight: 600;
            "
          >
            <span
              style="
                display: inline-flex;
                align-items: center;
                gap: 7px;
                color: var(--accent);
                background: var(--accent-soft);
                border-radius: 7px;
                padding: 6px 11px;
              "
              ><span
                style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent)"
              ></span
              >Захват</span
            >
            <span style="color: var(--fg3)">→</span>
            <span
              style="
                color: var(--fg2);
                background: var(--surface-2);
                border-radius: 7px;
                padding: 6px 11px;
              "
              >Уточнение</span
            >
            <span style="color: var(--fg3)">→</span>
            <span
              style="
                color: var(--fg2);
                background: var(--surface-2);
                border-radius: 7px;
                padding: 6px 11px;
              "
              >Организация</span
            >
            <span style="color: var(--fg3)">→</span>
            <span
              style="
                color: var(--fg2);
                background: var(--surface-2);
                border-radius: 7px;
                padding: 6px 11px;
              "
              >Действие</span
            >
          </div>

          <div style="display: flex; gap: 9px; margin-bottom: 24px">
            <input
              class="fl-focus"
              placeholder="Записать событие, мысль или ссылку…"
              style="
                flex: 1;
                background: var(--surface-2);
                border: 1px solid var(--line);
                border-radius: 10px;
                color: var(--fg);
                padding: 12px 14px;
                font-family: 'Manrope', sans-serif;
                font-size: 13.5px;
                outline: none;
              "
            />
            <button
              class="fl-hov-bright"
              style="
                background: var(--accent);
                color: var(--accent-fg);
                border: none;
                border-radius: 10px;
                padding: 0 20px;
                font-family: 'Manrope', sans-serif;
                font-size: 13px;
                font-weight: 600;
                cursor: pointer;
                flex: none;
              "
            >
              Записать
            </button>
          </div>

          <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 12px">
            <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
              >Входящие — обработать</span
            >
            <span
              style="
                font-family: 'JetBrains Mono', monospace;
                font-size: 11px;
                color: var(--accent);
                background: var(--accent-soft);
                border-radius: 6px;
                padding: 2px 8px;
              "
              >7</span
            >
          </div>
          <div
            style="
              background: var(--surface);
              border: 1px solid var(--line);
              border-radius: 13px;
              overflow: hidden;
            "
          >
            <div
              v-for="(j, ji) in journalFull"
              :key="'jf' + ji"
              class="fl-hov-surface2"
              style="padding: 15px 17px; border-bottom: 1px solid var(--line)"
            >
              <div style="display: flex; align-items: center; gap: 11px">
                <span :style="srcStyle">{{ j.src }}</span>
                <span style="font-size: 13.5px; color: var(--fg); flex: 1; min-width: 0">{{
                  j.txt
                }}</span>
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10.5px;
                    color: var(--fg3);
                    flex: none;
                  "
                  >{{ j.time }}</span
                >
              </div>
              <div style="display: flex; gap: 7px; margin-top: 11px; flex-wrap: wrap">
                <span
                  class="fl-hov-accent-text"
                  style="
                    font-size: 11.5px;
                    font-weight: 600;
                    color: var(--fg2);
                    background: var(--surface-2);
                    border: 1px solid var(--line);
                    border-radius: 7px;
                    padding: 5px 11px;
                    cursor: pointer;
                  "
                  >→ Задача</span
                >
                <span
                  class="fl-hov-accent-text"
                  style="
                    font-size: 11.5px;
                    font-weight: 600;
                    color: var(--fg2);
                    background: var(--surface-2);
                    border: 1px solid var(--line);
                    border-radius: 7px;
                    padding: 5px 11px;
                    cursor: pointer;
                  "
                  >→ Проект</span
                >
                <span
                  class="fl-hov-accent-text"
                  style="
                    font-size: 11.5px;
                    font-weight: 600;
                    color: var(--fg2);
                    background: var(--surface-2);
                    border: 1px solid var(--line);
                    border-radius: 7px;
                    padding: 5px 11px;
                    cursor: pointer;
                  "
                  >→ Финансы</span
                >
                <div style="flex: 1"></div>
                <span
                  class="fl-hov-fg2"
                  style="
                    font-size: 11.5px;
                    font-weight: 500;
                    color: var(--fg3);
                    padding: 5px 9px;
                    cursor: pointer;
                  "
                  >Архив</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- ===== TASKS ===== -->
        <div
          v-if="screen === 'tasks'"
          style="display: flex; flex-direction: column; height: 100%; animation: fadeUp 0.3s ease"
        >
          <div
            style="
              padding: 15px 22px;
              display: flex;
              align-items: center;
              gap: 14px;
              border-bottom: 1px solid var(--line);
              flex: none;
              flex-wrap: wrap;
            "
          >
            <div
              style="
                display: flex;
                gap: 3px;
                padding: 3px;
                border: 1px solid var(--line);
                border-radius: 9px;
                background: var(--surface-2);
              "
            >
              <button @click="setTaskView('board')" :style="tvSeg.board">Доска</button>
              <button @click="setTaskView('table')" :style="tvSeg.table">Таблица</button>
              <button @click="setTaskView('timeline')" :style="tvSeg.timeline">Таймлайн</button>
              <button @click="setTaskView('gtd')" :style="tvSeg.gtd">GTD</button>
            </div>
            <div v-if="taskView === 'board'" style="display: flex; gap: 5px">
              <span :style="filterActiveStyle">Все</span>
              <span
                class="fl-hov-fg"
                style="
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--fg2);
                  padding: 6px 12px;
                  border-radius: 8px;
                  cursor: pointer;
                "
                >Сегодня</span
              >
              <span
                class="fl-hov-fg"
                style="
                  font-size: 12px;
                  font-weight: 500;
                  color: var(--fg2);
                  padding: 6px 12px;
                  border-radius: 8px;
                  cursor: pointer;
                "
                >Просрочено</span
              >
            </div>
            <div style="flex: 1"></div>
            <button
              class="fl-hov-bright"
              style="
                display: flex;
                align-items: center;
                gap: 7px;
                background: var(--accent);
                color: var(--accent-fg);
                border: none;
                border-radius: 9px;
                padding: 9px 15px;
                font-family: 'Manrope', sans-serif;
                font-size: 12.5px;
                font-weight: 600;
                cursor: pointer;
              "
            >
              <svg
                width="13"
                height="13"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
              >
                <line x1="7" y1="2.5" x2="7" y2="11.5" />
                <line x1="2.5" y1="7" x2="11.5" y2="7" /></svg
              >Задача
            </button>
          </div>

          <!-- TASKS · BOARD -->
          <div
            v-if="taskView === 'board'"
            style="
              display: flex;
              gap: 14px;
              padding: 18px 22px;
              overflow-x: auto;
              flex: 1;
              align-items: flex-start;
              min-height: 0;
            "
          >
            <div
              v-for="(col, ci) in boardView"
              :key="'col' + ci"
              style="width: 258px; flex: none; display: flex; flex-direction: column; gap: 11px"
            >
              <div style="display: flex; align-items: center; gap: 9px; padding: 0 3px">
                <span
                  style="width: 8px; height: 8px; border-radius: 50%; flex: none"
                  :style="{ background: col.dot }"
                ></span>
                <span style="font-size: 12.5px; font-weight: 700; color: var(--fg)">{{
                  col.label
                }}</span>
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px;
                    color: var(--fg3);
                  "
                  >{{ col.n }}</span
                >
              </div>
              <div
                v-for="(c, cci) in col.cards"
                :key="'card' + ci + '_' + cci"
                class="fl-hov-line2"
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 11px;
                  padding: 13px;
                  cursor: grab;
                "
              >
                <div style="font-size: 13px; font-weight: 500; color: var(--fg); line-height: 1.4">
                  {{ c.t }}
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-top: 12px">
                  <span
                    style="width: 7px; height: 7px; border-radius: 50%; flex: none"
                    :style="{ background: c.prColor }"
                  ></span>
                  <span
                    style="
                      font-size: 10.5px;
                      font-weight: 600;
                      color: var(--fg2);
                      background: var(--surface-2);
                      border-radius: 6px;
                      padding: 2px 7px;
                    "
                    >{{ c.p }}</span
                  >
                  <div style="flex: 1"></div>
                  <span
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 10.5px;
                      color: var(--fg3);
                    "
                    >{{ c.due }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <!-- TASKS · GTD -->
          <div
            v-if="taskView === 'gtd'"
            data-role="gtd"
            style="
              display: grid;
              grid-template-columns: 256px 1fr;
              gap: 16px;
              padding: 18px 22px;
              flex: 1;
              overflow: auto;
              min-height: 0;
              align-items: start;
            "
          >
            <div style="display: flex; flex-direction: column; gap: 16px">
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <span style="font-size: 13.5px; font-weight: 700; color: var(--fg)">Проекты</span>
                <div style="margin-top: 11px; display: flex; flex-direction: column; gap: 1px">
                  <div
                    v-for="(p, pi) in projects"
                    :key="'gp' + pi"
                    class="fl-row-hover"
                    style="
                      display: flex;
                      align-items: center;
                      gap: 10px;
                      padding: 8px 7px;
                      border-radius: 7px;
                      cursor: pointer;
                    "
                  >
                    <span
                      style="
                        width: 6px;
                        height: 6px;
                        border-radius: 2px;
                        background: var(--fg3);
                        flex: none;
                      "
                    ></span>
                    <span style="font-size: 13px; color: var(--fg); flex: 1">{{ p.name }}</span>
                    <span
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 10.5px;
                        color: var(--fg3);
                      "
                      >{{ p.count }}</span
                    >
                  </div>
                </div>
              </div>
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <span style="font-size: 13.5px; font-weight: 700; color: var(--fg)">Контексты</span>
                <div style="margin-top: 12px; display: flex; flex-wrap: wrap; gap: 7px">
                  <span
                    v-for="(c, cxi) in contexts"
                    :key="'ctx' + cxi"
                    class="fl-hov-accent-text"
                    style="
                      font-size: 11.5px;
                      font-weight: 500;
                      color: var(--fg2);
                      background: var(--surface-2);
                      border: 1px solid var(--line);
                      border-radius: 7px;
                      padding: 5px 10px;
                      cursor: pointer;
                    "
                    >{{ c }}</span
                  >
                </div>
              </div>
            </div>
            <div
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                overflow: hidden;
              "
            >
              <div
                style="
                  padding: 15px 17px;
                  border-bottom: 1px solid var(--line);
                  display: flex;
                  align-items: center;
                  gap: 10px;
                "
              >
                <span style="font-size: 13.5px; font-weight: 700; color: var(--fg)"
                  >Входящие — обработать</span
                >
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px;
                    color: var(--accent);
                    background: var(--accent-soft);
                    border-radius: 6px;
                    padding: 2px 8px;
                  "
                  >{{ gtdInbox.length }}</span
                >
              </div>
              <div
                v-for="(i, ii) in gtdInbox"
                :key="'gi' + ii"
                class="fl-row-hover"
                style="
                  padding: 13px 17px;
                  border-bottom: 1px solid var(--line);
                  display: flex;
                  align-items: center;
                  gap: 13px;
                "
              >
                <div
                  style="
                    width: 17px;
                    height: 17px;
                    border-radius: 5px;
                    border: 1.5px solid var(--line-2);
                    flex: none;
                  "
                ></div>
                <span style="font-size: 13px; color: var(--fg); flex: 1; min-width: 0">{{
                  i.t
                }}</span>
                <span
                  class="fl-hov-accent-text"
                  style="
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--fg2);
                    background: var(--surface-2);
                    border: 1px solid var(--line);
                    border-radius: 7px;
                    padding: 5px 10px;
                    cursor: pointer;
                    flex: none;
                  "
                  >→ Проект</span
                >
                <span
                  class="fl-hov-accent-text"
                  style="
                    font-size: 11px;
                    font-weight: 600;
                    color: var(--fg2);
                    background: var(--surface-2);
                    border: 1px solid var(--line);
                    border-radius: 7px;
                    padding: 5px 10px;
                    cursor: pointer;
                    flex: none;
                  "
                  >→ Сегодня</span
                >
              </div>
            </div>
          </div>

          <!-- TASKS · TABLE -->
          <div
            v-if="taskView === 'table'"
            style="flex: 1; overflow: auto; padding: 18px 22px; min-height: 0"
          >
            <div
              style="
                display: flex;
                align-items: center;
                gap: 12px;
                margin-bottom: 14px;
                flex-wrap: wrap;
              "
            >
              <div
                class="fl-focus-within"
                style="
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  background: var(--surface-2);
                  border: 1px solid var(--line);
                  border-radius: 9px;
                  padding: 8px 11px;
                  width: 240px;
                "
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="var(--fg3)"
                  stroke-width="1.5"
                  style="flex: none"
                >
                  <circle cx="7" cy="7" r="4.2" />
                  <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
                </svg>
                <input
                  v-model="tableFilter"
                  placeholder="Фильтр задач…"
                  style="
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--fg);
                    font-family: 'Manrope', sans-serif;
                    font-size: 12.5px;
                    outline: none;
                    min-width: 0;
                  "
                />
              </div>
              <span
                style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--fg3)"
                >{{ tableCount }}</span
              >
              <div style="flex: 1"></div>
              <span style="font-size: 11.5px; color: var(--fg3)">Группировать</span>
              <div
                style="
                  display: flex;
                  gap: 3px;
                  padding: 3px;
                  border: 1px solid var(--line);
                  border-radius: 9px;
                  background: var(--surface-2);
                "
              >
                <button @click="setTableGroup('none')" :style="gbSeg.none">Без</button>
                <button @click="setTableGroup('status')" :style="gbSeg.status">Статус</button>
                <button @click="setTableGroup('context')" :style="gbSeg.context">Контекст</button>
                <button @click="setTableGroup('client')" :style="gbSeg.client">Клиент</button>
              </div>
            </div>

            <div
              style="
                border: 1px solid var(--line);
                border-radius: 13px;
                overflow: hidden;
                background: var(--surface);
              "
            >
              <div style="overflow-x: auto">
                <div style="min-width: 940px">
                  <div
                    style="
                      display: grid;
                      grid-template-columns: minmax(220px, 1.7fr) 130px 112px 142px 122px 112px 84px;
                      gap: 14px;
                      padding: 13px 16px;
                      border-bottom: 1px solid var(--line);
                      background: var(--surface-2);
                    "
                  >
                    <div @click="setTableSort('title')" :style="hStyle.title">
                      Задача <span style="color: var(--accent)">{{ arrow.title }}</span>
                    </div>
                    <div @click="setTableSort('status')" :style="hStyle.status">
                      Статус <span style="color: var(--accent)">{{ arrow.status }}</span>
                    </div>
                    <div @click="setTableSort('project')" :style="hStyle.project">
                      Проект <span style="color: var(--accent)">{{ arrow.project }}</span>
                    </div>
                    <div @click="setTableSort('client')" :style="hStyle.client">
                      Клиент <span style="color: var(--accent)">{{ arrow.client }}</span>
                    </div>
                    <div @click="setTableSort('context')" :style="hStyle.context">
                      Контекст <span style="color: var(--accent)">{{ arrow.context }}</span>
                    </div>
                    <div @click="setTableSort('pr')" :style="hStyle.pr">
                      Приоритет <span style="color: var(--accent)">{{ arrow.pr }}</span>
                    </div>
                    <div @click="setTableSort('due')" :style="hStyle.due">
                      Срок <span style="color: var(--accent)">{{ arrow.due }}</span>
                    </div>
                  </div>

                  <template v-for="(g, gi) in tableGroups" :key="'tg' + gi">
                    <div
                      v-if="g.show"
                      style="
                        display: flex;
                        align-items: center;
                        gap: 9px;
                        padding: 11px 16px;
                        background: var(--surface-2);
                        border-bottom: 1px solid var(--line);
                      "
                    >
                      <span
                        style="width: 8px; height: 8px; border-radius: 50%; flex: none"
                        :style="{ background: g.color }"
                      ></span>
                      <span style="font-size: 12px; font-weight: 700; color: var(--fg)">{{
                        g.label
                      }}</span>
                      <span
                        style="
                          font-family: 'JetBrains Mono', monospace;
                          font-size: 10.5px;
                          color: var(--fg3);
                        "
                        >{{ g.count }}</span
                      >
                    </div>
                    <div
                      v-for="(r, ri) in g.rows"
                      :key="'tr' + gi + '_' + ri"
                      class="fl-row-hover"
                      style="
                        display: grid;
                        grid-template-columns:
                          minmax(220px, 1.7fr)
                          130px 112px 142px 122px 112px 84px;
                        gap: 14px;
                        padding: 12px 16px;
                        border-bottom: 1px solid var(--line);
                        align-items: center;
                      "
                    >
                      <div
                        style="
                          font-size: 13px;
                          font-weight: 500;
                          color: var(--fg);
                          min-width: 0;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        "
                      >
                        {{ r.title }}
                      </div>
                      <div style="display: flex; align-items: center; gap: 6px; min-width: 0">
                        <span
                          style="width: 7px; height: 7px; border-radius: 50%; flex: none"
                          :style="{ background: r.statusColor }"
                        ></span>
                        <span
                          style="
                            font-size: 11.5px;
                            font-weight: 600;
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                          "
                          :style="{ color: r.statusColor }"
                          >{{ r.statusLabel }}</span
                        >
                      </div>
                      <div
                        style="
                          font-size: 12px;
                          color: var(--fg2);
                          min-width: 0;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        "
                      >
                        {{ r.project }}
                      </div>
                      <div
                        style="
                          font-size: 12px;
                          color: var(--fg2);
                          min-width: 0;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        "
                      >
                        {{ r.client }}
                      </div>
                      <div
                        style="
                          font-family: 'JetBrains Mono', monospace;
                          font-size: 11px;
                          color: var(--fg2);
                          min-width: 0;
                          overflow: hidden;
                          text-overflow: ellipsis;
                          white-space: nowrap;
                        "
                      >
                        {{ r.context }}
                      </div>
                      <div style="display: flex; align-items: center; gap: 6px; min-width: 0">
                        <span
                          style="width: 7px; height: 7px; border-radius: 50%; flex: none"
                          :style="{ background: r.prColor }"
                        ></span>
                        <span style="font-size: 11.5px; color: var(--fg2); white-space: nowrap">{{
                          r.prLabel
                        }}</span>
                      </div>
                      <div
                        style="
                          font-family: 'JetBrains Mono', monospace;
                          font-size: 11px;
                          color: var(--fg3);
                          white-space: nowrap;
                        "
                      >
                        {{ r.due }}
                      </div>
                    </div>
                  </template>
                </div>
              </div>
            </div>
          </div>

          <!-- TASKS · TIMELINE -->
          <div
            v-if="taskView === 'timeline'"
            style="flex: 1; overflow: auto; padding: 18px 22px; min-height: 0"
          >
            <div
              style="
                display: flex;
                align-items: center;
                gap: 14px;
                margin-bottom: 14px;
                flex-wrap: wrap;
              "
            >
              <span style="font-size: 13.5px; font-weight: 700; color: var(--fg)"
                >Июнь · 20–30</span
              >
              <span style="font-size: 11.5px; color: var(--fg3)"
                >пересечения видны по общей оси времени</span
              >
              <div style="flex: 1"></div>
              <div style="display: flex; align-items: center; gap: 13px; flex-wrap: wrap">
                <span
                  v-for="(l, li) in statusLegend"
                  :key="'lg' + li"
                  style="
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    color: var(--fg2);
                  "
                >
                  <span
                    style="width: 9px; height: 9px; border-radius: 3px; flex: none"
                    :style="{ background: l.color }"
                  ></span
                  >{{ l.label }}
                </span>
              </div>
            </div>

            <div
              style="
                border: 1px solid var(--line);
                border-radius: 13px;
                overflow: hidden;
                background: var(--surface);
              "
            >
              <div style="overflow-x: auto">
                <div style="min-width: 840px">
                  <div
                    style="
                      display: flex;
                      border-bottom: 1px solid var(--line);
                      background: var(--surface-2);
                    "
                  >
                    <div
                      style="
                        width: 212px;
                        flex: none;
                        padding: 10px 16px;
                        font-size: 10.5px;
                        font-weight: 700;
                        letter-spacing: 0.04em;
                        text-transform: uppercase;
                        color: var(--fg2);
                        display: flex;
                        align-items: center;
                      "
                    >
                      Задача
                    </div>
                    <div style="flex: 1; display: grid; grid-template-columns: repeat(11, 1fr)">
                      <div v-for="(d, di) in timelineDays" :key="'td' + di" :style="d.headStyle">
                        <div
                          style="
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 12px;
                            font-weight: 600;
                            color: var(--fg);
                          "
                        >
                          {{ d.n }}
                        </div>
                        <div style="font-size: 9.5px; color: var(--fg3); margin-top: 2px">
                          {{ d.dow }}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div
                    v-for="(r, ri) in timelineRows"
                    :key="'tlr' + ri"
                    class="fl-row-hover"
                    style="
                      display: flex;
                      border-top: 1px solid var(--line);
                      align-items: stretch;
                      min-height: 46px;
                    "
                  >
                    <div
                      style="
                        width: 212px;
                        flex: none;
                        padding: 8px 16px;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        min-width: 0;
                      "
                    >
                      <span
                        style="width: 7px; height: 7px; border-radius: 50%; flex: none"
                        :style="{ background: r.prColor }"
                      ></span>
                      <span
                        style="
                          font-size: 12.5px;
                          color: var(--fg);
                          white-space: nowrap;
                          overflow: hidden;
                          text-overflow: ellipsis;
                        "
                        >{{ r.title }}</span
                      >
                    </div>
                    <div
                      style="
                        flex: 1;
                        position: relative;
                        background-image: repeating-linear-gradient(
                          90deg,
                          var(--line) 0 1px,
                          transparent 1px,
                          transparent calc(100% / 11)
                        );
                      "
                    >
                      <div
                        style="
                          position: absolute;
                          top: 0;
                          bottom: 0;
                          left: 22.73%;
                          width: 2px;
                          background: var(--accent);
                          opacity: 0.4;
                        "
                      ></div>
                      <div :style="r.barStyle">
                        <span
                          style="width: 6px; height: 6px; border-radius: 50%; flex: none"
                          :style="{ background: r.prColor }"
                        ></span>
                        <span
                          style="
                            font-family: 'JetBrains Mono', monospace;
                            font-size: 10.5px;
                            color: var(--fg);
                            white-space: nowrap;
                            overflow: hidden;
                            text-overflow: ellipsis;
                          "
                          >{{ r.range }}</span
                        >
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== DIALOGS ===== -->
        <div
          v-if="screen === 'dialogs'"
          data-role="dlg"
          style="
            display: grid;
            grid-template-columns: 280px 1fr;
            height: 100%;
            animation: fadeUp 0.3s ease;
          "
        >
          <div
            style="
              border-right: 1px solid var(--line);
              display: flex;
              flex-direction: column;
              min-height: 0;
              min-width: 0;
            "
          >
            <div
              style="
                padding: 13px;
                border-bottom: 1px solid var(--line);
                flex: none;
                display: flex;
                align-items: center;
                gap: 9px;
                background: var(--surface);
                border-radius: 0;
              "
            >
              <div
                class="fl-focus-within"
                style="
                  flex: 1;
                  display: flex;
                  align-items: center;
                  gap: 8px;
                  background: var(--surface-2);
                  border: 1px solid var(--line);
                  border-radius: 9px;
                  padding: 8px 11px;
                  min-width: 0;
                "
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="var(--fg3)"
                  stroke-width="1.5"
                  style="flex: none"
                >
                  <circle cx="7" cy="7" r="4.2" />
                  <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" />
                </svg>
                <input
                  placeholder="Поиск диалогов…"
                  style="
                    flex: 1;
                    background: transparent;
                    border: none;
                    color: var(--fg);
                    font-family: 'Manrope', sans-serif;
                    font-size: 12.5px;
                    outline: none;
                    min-width: 0;
                  "
                />
              </div>
            </div>
            <div style="flex: 1; overflow: auto; min-height: 0">
              <div
                v-for="t in threadsView"
                :key="'th' + t.id"
                @click="selectThread(t.id)"
                :style="t.rowStyle"
              >
                <div :style="t.avatarStyle">{{ t.initial }}</div>
                <div style="flex: 1; min-width: 0">
                  <div style="display: flex; align-items: center; gap: 6px">
                    <span
                      style="
                        font-size: 13px;
                        color: var(--fg);
                        font-weight: 600;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                      >{{ t.name }}</span
                    >
                    <span
                      v-if="t.ai"
                      style="
                        font-size: 8.5px;
                        font-weight: 600;
                        color: var(--accent);
                        background: var(--accent-soft);
                        border-radius: 4px;
                        padding: 1px 5px;
                        flex: none;
                      "
                      >ИИ</span
                    >
                    <div style="flex: 1"></div>
                    <span
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 9.5px;
                        color: var(--fg3);
                        flex: none;
                      "
                      >{{ t.time }}</span
                    >
                  </div>
                  <div style="display: flex; align-items: center; gap: 6px; margin-top: 4px">
                    <span
                      style="
                        font-size: 11.5px;
                        color: var(--fg2);
                        overflow: hidden;
                        text-overflow: ellipsis;
                        white-space: nowrap;
                        flex: 1;
                      "
                      >{{ t.last }}</span
                    >
                    <span
                      v-if="t.hasUnread"
                      style="
                        min-width: 17px;
                        height: 17px;
                        padding: 0 5px;
                        border-radius: 9px;
                        background: var(--accent);
                        color: var(--accent-fg);
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 9.5px;
                        font-weight: 600;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        flex: none;
                      "
                      >{{ t.unread }}</span
                    >
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style="
              display: flex;
              flex-direction: column;
              min-height: 0;
              min-width: 0;
              background: var(--bg);
            "
          >
            <div
              style="
                height: 60px;
                flex: none;
                border-bottom: 1px solid var(--line);
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 0 20px;
              "
            >
              <div :style="atAvatarStyle">{{ atInitial }}</div>
              <div style="min-width: 0">
                <div style="display: flex; align-items: center; gap: 7px">
                  <span style="font-size: 14px; font-weight: 700; color: var(--fg)">{{
                    atName
                  }}</span
                  ><span
                    v-if="atAi"
                    style="
                      font-size: 8.5px;
                      font-weight: 600;
                      color: var(--accent);
                      background: var(--accent-soft);
                      border-radius: 4px;
                      padding: 1px 5px;
                    "
                    >ИИ</span
                  >
                </div>
                <div style="font-size: 11px; color: var(--fg3); margin-top: 2px">
                  {{ atStatus }}
                </div>
              </div>
              <div style="flex: 1"></div>
              <span
                class="fl-hov-accent-text"
                style="
                  font-size: 11.5px;
                  font-weight: 600;
                  color: var(--fg2);
                  background: var(--surface-2);
                  border: 1px solid var(--line);
                  border-radius: 8px;
                  padding: 6px 12px;
                  cursor: pointer;
                "
                >→ В задачу</span
              >
              <span
                class="fl-hov-accent-text"
                style="
                  font-size: 11.5px;
                  font-weight: 600;
                  color: var(--fg2);
                  background: var(--surface-2);
                  border: 1px solid var(--line);
                  border-radius: 8px;
                  padding: 6px 12px;
                  cursor: pointer;
                "
                >→ В журнал</span
              >
            </div>

            <div
              style="
                flex: 1;
                overflow: auto;
                padding: 22px 24px;
                min-height: 0;
                display: flex;
                flex-direction: column;
              "
            >
              <div v-for="(m, mi) in msgsView" :key="'msg' + mi" :style="m.rowStyle">
                <div :style="m.bubbleStyle">
                  <div
                    v-if="m.isAi"
                    style="
                      font-size: 9.5px;
                      font-weight: 700;
                      letter-spacing: 0.05em;
                      color: var(--accent);
                      margin-bottom: 6px;
                      text-transform: uppercase;
                    "
                  >
                    Ассистент
                  </div>
                  <div style="font-size: 13.5px; line-height: 1.55; color: var(--fg)">
                    {{ m.text }}
                  </div>
                  <div
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 10px;
                      color: var(--fg3);
                      margin-top: 8px;
                      text-align: right;
                    "
                  >
                    {{ m.time }}
                  </div>
                </div>
              </div>
            </div>

            <div style="flex: none; border-top: 1px solid var(--line); padding: 14px 16px">
              <div style="display: flex; gap: 10px; align-items: center">
                <input
                  v-model="composer"
                  @keydown.enter="send"
                  class="fl-focus"
                  placeholder="Сообщение…   /задача   /журнал"
                  style="
                    flex: 1;
                    background: var(--surface-2);
                    border: 1px solid var(--line);
                    border-radius: 10px;
                    color: var(--fg);
                    padding: 12px 14px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 13.5px;
                    outline: none;
                  "
                />
                <button
                  @click="send"
                  class="fl-hov-bright"
                  style="
                    background: var(--accent);
                    color: var(--accent-fg);
                    border: none;
                    border-radius: 10px;
                    padding: 12px 18px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 12.5px;
                    font-weight: 600;
                    cursor: pointer;
                    flex: none;
                  "
                >
                  Отправить
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== COMPONENTS ===== -->
        <div
          v-if="screen === 'components'"
          style="
            padding: 24px;
            max-width: 920px;
            margin: 0 auto;
            animation: fadeUp 0.3s ease;
            display: flex;
            flex-direction: column;
            gap: 28px;
          "
        >
          <div style="font-size: 13px; color: var(--fg2); line-height: 1.55; max-width: 580px">
            Дизайн-система FLOW — Manrope для интерфейса, JetBrains Mono для данных, единый акцент.
            Спокойная плотность, мягкие поверхности, чёткая иерархия.
          </div>

          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--fg); margin-bottom: 14px">
              Палитра
            </div>
            <div style="display: flex; gap: 11px; flex-wrap: wrap">
              <div
                v-for="(p, pi) in palette"
                :key="'pal' + pi"
                style="display: flex; flex-direction: column; gap: 7px"
              >
                <div
                  style="
                    width: 92px;
                    height: 56px;
                    border-radius: 10px;
                    border: 1px solid var(--line);
                  "
                  :style="{ background: p.v }"
                ></div>
                <div
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 9.5px;
                    color: var(--fg3);
                  "
                >
                  {{ p.l }}
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--fg); margin-bottom: 14px">
              Типографика
            </div>
            <div
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 13px;
              "
            >
              <div
                style="
                  font-size: 40px;
                  font-weight: 800;
                  letter-spacing: -0.03em;
                  line-height: 0.95;
                  color: var(--fg);
                "
              >
                Manrope
              </div>
              <div style="font-size: 20px; font-weight: 700; color: var(--fg)">
                Заголовок раздела · 20
              </div>
              <div style="font-size: 13.5px; color: var(--fg); line-height: 1.55">
                Основной текст 13.5 — задачи, сообщения, описания. Читаемый, спокойный, без лишнего
                шума.
              </div>
              <div style="font-size: 12px; color: var(--fg2)">
                Вторичный текст 12 — метаданные и подписи.
              </div>
              <div
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 14px;
                  color: var(--accent);
                  font-variant-numeric: tabular-nums;
                "
              >
                1 234 · 09:30 · 87%
              </div>
            </div>
          </div>

          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--fg); margin-bottom: 14px">
              Кнопки · поля · статусы
            </div>
            <div
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                padding: 20px;
                display: flex;
                flex-direction: column;
                gap: 16px;
              "
            >
              <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
                <button
                  class="fl-hov-bright"
                  style="
                    background: var(--accent);
                    color: var(--accent-fg);
                    border: none;
                    border-radius: 9px;
                    padding: 9px 16px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 12.5px;
                    font-weight: 600;
                    cursor: pointer;
                  "
                >
                  Основная
                </button>
                <button
                  class="fl-hov-line2"
                  style="
                    background: var(--surface-2);
                    color: var(--fg);
                    border: 1px solid var(--line);
                    border-radius: 9px;
                    padding: 9px 16px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 12.5px;
                    font-weight: 500;
                    cursor: pointer;
                  "
                >
                  Вторичная
                </button>
                <button
                  class="fl-hov-fg"
                  style="
                    background: transparent;
                    color: var(--fg2);
                    border: none;
                    padding: 9px 12px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 12.5px;
                    font-weight: 500;
                    cursor: pointer;
                  "
                >
                  Призрачная
                </button>
              </div>
              <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center">
                <div
                  style="
                    flex: 1;
                    min-width: 200px;
                    display: flex;
                    align-items: center;
                    gap: 9px;
                    background: var(--surface-2);
                    border: 1px solid var(--line);
                    border-radius: 9px;
                    padding: 10px 13px;
                  "
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--fg3)"
                    stroke-width="1.5"
                  >
                    <circle cx="7" cy="7" r="4.2" />
                    <line x1="10.2" y1="10.2" x2="13.5" y2="13.5" /></svg
                  ><span style="font-size: 12.5px; color: var(--fg3)">Текстовое поле</span>
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 7px; align-items: center">
                  <span
                    v-for="(s, si) in statusPills"
                    :key="'sp' + si"
                    style="
                      display: inline-flex;
                      align-items: center;
                      gap: 6px;
                      font-size: 11px;
                      font-weight: 600;
                      border-radius: 20px;
                      padding: 4px 11px;
                    "
                    :style="{ color: s.c, background: s.bg }"
                    ><span
                      style="width: 6px; height: 6px; border-radius: 50%"
                      :style="{ background: s.c }"
                    ></span
                    >{{ s.l }}</span
                  >
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--fg); margin-bottom: 14px">
              Метрики
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px">
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 18px;
                "
              >
                <div style="font-size: 11.5px; font-weight: 600; color: var(--fg2)">
                  Выполнено за неделю
                </div>
                <div style="display: flex; align-items: baseline; gap: 9px; margin-top: 11px">
                  <span
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 30px;
                      font-weight: 600;
                      color: var(--fg);
                    "
                    >23</span
                  ><span style="font-size: 12px; font-weight: 600; color: var(--ok)">↑ 12%</span>
                </div>
              </div>
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 18px;
                "
              >
                <div style="font-size: 11.5px; font-weight: 600; color: var(--fg2)">
                  Прогресс проекта
                </div>
                <div
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 13px;
                    color: var(--fg);
                    margin: 11px 0 9px;
                  "
                >
                  68%
                </div>
                <div
                  style="
                    height: 7px;
                    background: var(--surface-2);
                    border-radius: 4px;
                    overflow: hidden;
                  "
                >
                  <div
                    style="width: 68%; height: 100%; background: var(--accent); border-radius: 4px"
                  ></div>
                </div>
              </div>
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 18px;
                "
              >
                <div
                  style="
                    font-size: 11.5px;
                    font-weight: 600;
                    color: var(--fg2);
                    margin-bottom: 12px;
                  "
                >
                  Активность
                </div>
                <div style="display: flex; align-items: flex-end; gap: 5px; height: 40px">
                  <div
                    v-for="(b, bi) in weekBars"
                    :key="'cwk' + bi"
                    style="
                      flex: 1;
                      background: var(--accent-soft);
                      border-top: 2px solid var(--accent);
                      border-radius: 3px 3px 0 0;
                    "
                    :style="{ height: b.h2 }"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== FINANCES ===== -->
        <div
          v-if="screen === 'finances'"
          style="padding: 24px; max-width: 1180px; margin: 0 auto; animation: fadeUp 0.3s ease"
        >
          <div
            style="
              font-size: 13px;
              color: var(--fg2);
              line-height: 1.55;
              max-width: 600px;
              margin-bottom: 18px;
            "
          >
            Деньги как часть системы. Операции из банка попадают в журнал автоматически, бюджеты
            держат расходы под контролем.
          </div>

          <div
            data-role="metrics"
            style="
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 14px;
              margin-bottom: 18px;
            "
          >
            <div
              v-for="(m, mi) in finBalances"
              :key="'fb' + mi"
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                padding: 16px 17px;
                display: flex;
                flex-direction: column;
                gap: 9px;
              "
            >
              <span style="font-size: 11.5px; font-weight: 600; color: var(--fg2)">{{ m.l }}</span>
              <span
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 25px;
                  font-weight: 600;
                  line-height: 0.95;
                  font-variant-numeric: tabular-nums;
                "
                :style="{ color: m.c }"
                >{{ m.v }}</span
              >
              <span style="font-size: 11px; color: var(--fg3)">{{ m.sub }}</span>
            </div>
          </div>

          <div
            data-role="homegrid"
            style="display: grid; grid-template-columns: 1.62fr 1fr; gap: 16px; align-items: start"
          >
            <div style="display: flex; flex-direction: column; gap: 16px; min-width: 0">
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                  "
                >
                  <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
                    >Бюджет · июнь</span
                  >
                  <span
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 11px;
                      color: var(--fg3);
                    "
                    >92 400 / 120 000 ₽</span
                  >
                </div>
                <div style="display: flex; flex-direction: column; gap: 14px">
                  <div v-for="(b, bi) in budgetView" :key="'bg' + bi">
                    <div
                      style="
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        margin-bottom: 7px;
                      "
                    >
                      <span style="font-size: 12.5px; font-weight: 500; color: var(--fg)">{{
                        b.name
                      }}</span>
                      <span
                        style="font-family: 'JetBrains Mono', monospace; font-size: 11px"
                        :style="{ color: b.c }"
                        >{{ b.label }}</span
                      >
                    </div>
                    <div
                      style="
                        height: 7px;
                        background: var(--surface-2);
                        border-radius: 4px;
                        overflow: hidden;
                      "
                    >
                      <div
                        style="height: 100%; border-radius: 4px"
                        :style="{ width: b.pct, background: b.c }"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 6px;
                  "
                >
                  <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
                    >Последние операции</span
                  >
                  <span
                    @click="open('journal')"
                    class="fl-hov-bright15"
                    style="font-size: 12px; font-weight: 600; color: var(--accent); cursor: pointer"
                    >В журнал →</span
                  >
                </div>
                <div
                  v-for="(t, ti) in txView"
                  :key="'tx' + ti"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    padding: 11px 0;
                    border-top: 1px solid var(--line);
                  "
                >
                  <div
                    style="
                      width: 30px;
                      height: 30px;
                      border-radius: 8px;
                      background: var(--surface-2);
                      border: 1px solid var(--line);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-size: 12px;
                      font-weight: 700;
                      color: var(--fg2);
                      flex: none;
                    "
                  >
                    {{ t.initial }}
                  </div>
                  <div style="flex: 1; min-width: 0">
                    <div
                      style="
                        font-size: 13px;
                        font-weight: 500;
                        color: var(--fg);
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ t.name }}
                    </div>
                    <div style="font-size: 11px; color: var(--fg3); margin-top: 2px">
                      {{ t.cat }}
                    </div>
                  </div>
                  <div style="text-align: right; flex: none">
                    <div
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 13px;
                        font-weight: 600;
                        font-variant-numeric: tabular-nums;
                      "
                      :style="{ color: t.c }"
                    >
                      {{ t.amt }}
                    </div>
                    <div
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 10px;
                        color: var(--fg3);
                        margin-top: 2px;
                      "
                    >
                      {{ t.date }}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px; min-width: 0">
              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <span style="font-size: 14px; font-weight: 700; color: var(--fg)">Счета</span>
                <div style="margin-top: 11px; display: flex; flex-direction: column; gap: 0">
                  <div
                    v-for="(a, ai) in accounts"
                    :key="'acc' + ai"
                    style="
                      display: flex;
                      align-items: center;
                      gap: 11px;
                      padding: 11px 0;
                      border-top: 1px solid var(--line);
                    "
                  >
                    <span
                      style="
                        width: 8px;
                        height: 8px;
                        border-radius: 50%;
                        background: var(--accent);
                        flex: none;
                      "
                    ></span>
                    <span style="font-size: 12.5px; color: var(--fg); flex: 1; min-width: 0">{{
                      a.name
                    }}</span>
                    <span
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 12px;
                        font-weight: 600;
                        color: var(--fg);
                      "
                      >{{ a.v }}</span
                    >
                  </div>
                </div>
              </div>

              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 16px;
                  "
                >
                  <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
                    >Расходы по месяцам</span
                  >
                  <span
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 11px;
                      color: var(--fg3);
                    "
                    >₽ тыс</span
                  >
                </div>
                <div style="display: flex; align-items: flex-end; gap: 9px; height: 92px">
                  <div
                    v-for="(b, bi) in spendBars"
                    :key="'sb' + bi"
                    style="
                      flex: 1;
                      display: flex;
                      flex-direction: column;
                      align-items: center;
                      gap: 8px;
                      height: 100%;
                      justify-content: flex-end;
                    "
                  >
                    <div
                      style="width: 100%; max-width: 26px; border-radius: 4px 4px 0 0"
                      :style="{ background: b.bg, borderTop: '2px solid ' + b.line, height: b.h }"
                    ></div>
                    <span
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 10px;
                        color: var(--fg3);
                      "
                      >{{ b.m }}</span
                    >
                  </div>
                </div>
              </div>

              <div
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: var(--pad);
                "
              >
                <div
                  style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    margin-bottom: 11px;
                  "
                >
                  <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
                    >Цель · финансовая подушка</span
                  >
                  <span
                    style="
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 11px;
                      color: var(--accent);
                    "
                    >72%</span
                  >
                </div>
                <div
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 12px;
                    color: var(--fg2);
                    margin-bottom: 10px;
                  "
                >
                  108 000 / 150 000 ₽
                </div>
                <div
                  style="
                    height: 8px;
                    background: var(--surface-2);
                    border-radius: 4px;
                    overflow: hidden;
                  "
                >
                  <div
                    style="width: 72%; height: 100%; background: var(--accent); border-radius: 4px"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== PARA ===== -->
        <div
          v-if="screen === 'para'"
          style="padding: 24px; max-width: 1100px; margin: 0 auto; animation: fadeUp 0.3s ease"
        >
          <div
            style="
              font-size: 13px;
              color: var(--fg2);
              line-height: 1.55;
              max-width: 660px;
              margin-bottom: 20px;
            "
          >
            Метод PARA организует всё пространство по действенности:
            <b style="color: var(--fg); font-weight: 600">P</b>rojects ·
            <b style="color: var(--fg); font-weight: 600">A</b>reas ·
            <b style="color: var(--fg); font-weight: 600">R</b>esources ·
            <b style="color: var(--fg); font-weight: 600">A</b>rchive. Каждый элемент системы лежит
            в одной из четырёх корзин.
          </div>
          <div data-role="metrics" style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px">
            <div
              v-for="(p, pi) in paraView"
              :key="'para' + pi"
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                padding: var(--pad);
              "
            >
              <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 13px">
                <div
                  style="
                    width: 38px;
                    height: 38px;
                    border-radius: 10px;
                    background: var(--accent-soft);
                    border: 1px solid var(--accent-line);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 17px;
                    font-weight: 600;
                    color: var(--accent);
                    flex: none;
                  "
                >
                  {{ p.k }}
                </div>
                <div style="flex: 1; min-width: 0">
                  <div style="display: flex; align-items: center; gap: 8px">
                    <span style="font-size: 15px; font-weight: 700; color: var(--fg)">{{
                      p.title
                    }}</span
                    ><span
                      style="
                        font-family: 'JetBrains Mono', monospace;
                        font-size: 11px;
                        color: var(--fg3);
                      "
                      >{{ p.count }}</span
                    >
                  </div>
                  <div style="font-size: 11.5px; color: var(--fg3); margin-top: 2px">
                    {{ p.sub }}
                  </div>
                </div>
              </div>
              <div style="display: flex; flex-direction: column; gap: 1px">
                <div
                  v-for="(it, iti) in p.items"
                  :key="'pit' + pi + '_' + iti"
                  class="fl-row-hover"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 11px;
                    padding: 10px 8px;
                    border-radius: 8px;
                    cursor: pointer;
                  "
                >
                  <span
                    style="
                      width: 6px;
                      height: 6px;
                      border-radius: 2px;
                      background: var(--fg3);
                      flex: none;
                    "
                  ></span>
                  <span
                    style="
                      font-size: 13px;
                      color: var(--fg);
                      flex: 1;
                      min-width: 0;
                      white-space: nowrap;
                      overflow: hidden;
                      text-overflow: ellipsis;
                    "
                    >{{ it.name }}</span
                  >
                  <span
                    style="font-size: 11px; color: var(--fg3); white-space: nowrap; flex: none"
                    >{{ it.meta }}</span
                  >
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== TOOLS ===== -->
        <div
          v-if="screen === 'tools'"
          style="
            padding: 24px;
            max-width: 1100px;
            margin: 0 auto;
            animation: fadeUp 0.3s ease;
            display: flex;
            flex-direction: column;
            gap: 18px;
          "
        >
          <div
            data-role="homegrid"
            style="display: grid; grid-template-columns: 1fr 1.3fr; gap: 16px; align-items: stretch"
          >
            <div
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                padding: 24px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 16px;
              "
            >
              <span
                style="
                  font-size: 11px;
                  font-weight: 600;
                  letter-spacing: 0.1em;
                  text-transform: uppercase;
                  color: var(--fg2);
                "
                >Помодоро · фокус</span
              >
              <div
                style="
                  font-family: 'JetBrains Mono', monospace;
                  font-size: 58px;
                  font-weight: 600;
                  line-height: 1;
                  color: var(--fg);
                  font-variant-numeric: tabular-nums;
                "
              >
                {{ pomoTime }}
              </div>
              <div
                style="
                  width: 100%;
                  max-width: 240px;
                  height: 6px;
                  background: var(--surface-2);
                  border-radius: 4px;
                  overflow: hidden;
                "
              >
                <div
                  style="
                    height: 100%;
                    background: var(--accent);
                    border-radius: 4px;
                    transition: width 0.4s;
                  "
                  :style="{ width: pomoPct }"
                ></div>
              </div>
              <div style="display: flex; gap: 10px">
                <button
                  @click="pomoToggle"
                  class="fl-hov-bright"
                  style="
                    background: var(--accent);
                    color: var(--accent-fg);
                    border: none;
                    border-radius: 9px;
                    padding: 9px 24px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 12.5px;
                    font-weight: 600;
                    cursor: pointer;
                  "
                >
                  {{ pomoLabel }}
                </button>
                <button
                  @click="pomoReset"
                  class="fl-hov-line2"
                  style="
                    background: var(--surface-2);
                    color: var(--fg);
                    border: 1px solid var(--line);
                    border-radius: 9px;
                    padding: 9px 18px;
                    font-family: 'Manrope', sans-serif;
                    font-size: 12.5px;
                    font-weight: 500;
                    cursor: pointer;
                  "
                >
                  Сброс
                </button>
              </div>
            </div>

            <div
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                padding: var(--pad);
              "
            >
              <div
                style="
                  display: flex;
                  align-items: center;
                  justify-content: space-between;
                  margin-bottom: 13px;
                "
              >
                <span style="font-size: 14px; font-weight: 700; color: var(--fg)"
                  >Привычки сегодня</span
                >
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 11px;
                    color: var(--ok);
                  "
                  >{{ habitsDone }}</span
                >
              </div>
              <div style="display: flex; flex-direction: column; gap: 1px">
                <div
                  v-for="h in habitView"
                  :key="'hab' + h.id"
                  @click="toggleHabit(h.id)"
                  class="fl-row-hover"
                  style="
                    display: flex;
                    align-items: center;
                    gap: 13px;
                    padding: 11px 8px;
                    border-radius: 8px;
                    cursor: pointer;
                  "
                >
                  <div :style="h.boxStyle">
                    <svg
                      v-if="h.done"
                      width="11"
                      height="11"
                      viewBox="0 0 12 12"
                      fill="none"
                      stroke="var(--accent-fg)"
                      stroke-width="2.2"
                    >
                      <polyline points="2,6.5 5,9 10,3.5" />
                    </svg>
                  </div>
                  <span style="font-size: 13px; font-weight: 500; flex: 1" :style="h.titleStyle">{{
                    h.name
                  }}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style="font-size: 13.5px; font-weight: 700; color: var(--fg); margin-bottom: 13px">
              Модули
            </div>
            <div
              data-role="metrics"
              style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px"
            >
              <div
                @click="openStub('Быстрый захват')"
                class="fl-hov-accent-line"
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 17px;
                  cursor: pointer;
                  display: flex;
                  flex-direction: column;
                  gap: 11px;
                "
              >
                <div
                  style="
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    background: var(--accent-soft);
                    border: 1px solid var(--accent-line);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: none;
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--accent)"
                    stroke-width="1.4"
                  >
                    <path d="M2.5 5.5 8 2l5.5 3.5L8 9 2.5 5.5Z" />
                    <path d="M2.5 10.5 8 14l5.5-3.5" />
                  </svg>
                </div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 700; color: var(--fg)">
                    Быстрый захват
                  </div>
                  <div
                    style="font-size: 11.5px; color: var(--fg2); line-height: 1.45; margin-top: 4px"
                  >
                    Молниеносно записать мысль в журнал
                  </div>
                </div>
              </div>
              <div
                @click="openStub('Шаблоны')"
                class="fl-hov-accent-line"
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 17px;
                  cursor: pointer;
                  display: flex;
                  flex-direction: column;
                  gap: 11px;
                "
              >
                <div
                  style="
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    background: var(--accent-soft);
                    border: 1px solid var(--accent-line);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: none;
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--accent)"
                    stroke-width="1.4"
                  >
                    <rect x="3" y="2.5" width="10" height="11" rx="2" />
                    <line x1="5.5" y1="5.5" x2="10.5" y2="5.5" />
                    <line x1="5.5" y1="8" x2="10.5" y2="8" />
                    <line x1="5.5" y1="10.5" x2="8.5" y2="10.5" />
                  </svg>
                </div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 700; color: var(--fg)">Шаблоны</div>
                  <div
                    style="font-size: 11.5px; color: var(--fg2); line-height: 1.45; margin-top: 4px"
                  >
                    Готовые структуры задач и проектов
                  </div>
                </div>
              </div>
              <div
                @click="openStub('Автоматизации')"
                class="fl-hov-accent-line"
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 17px;
                  cursor: pointer;
                  display: flex;
                  flex-direction: column;
                  gap: 11px;
                "
              >
                <div
                  style="
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    background: var(--accent-soft);
                    border: 1px solid var(--accent-line);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: none;
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--accent)"
                    stroke-width="1.4"
                  >
                    <circle cx="8" cy="8" r="2.2" />
                    <path
                      d="M8 1.6v1.8M8 12.6v1.8M3.4 3.4l1.3 1.3M11.3 11.3l1.3 1.3M1.6 8h1.8M12.6 8h1.8M3.4 12.6l1.3-1.3M11.3 4.7l1.3-1.3"
                    />
                  </svg>
                </div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 700; color: var(--fg)">
                    Автоматизации
                  </div>
                  <div
                    style="font-size: 11.5px; color: var(--fg2); line-height: 1.45; margin-top: 4px"
                  >
                    Правила «если событие → действие»
                  </div>
                </div>
              </div>
              <div
                @click="openStub('Еженедельный обзор')"
                class="fl-hov-accent-line"
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 17px;
                  cursor: pointer;
                  display: flex;
                  flex-direction: column;
                  gap: 11px;
                "
              >
                <div
                  style="
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    background: var(--accent-soft);
                    border: 1px solid var(--accent-line);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: none;
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--accent)"
                    stroke-width="1.4"
                  >
                    <rect x="2.5" y="3" width="11" height="10.5" rx="2" />
                    <line x1="2.5" y1="6" x2="13.5" y2="6" />
                    <polyline points="5.5,9.5 7,11 10.5,7.5" />
                  </svg>
                </div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 700; color: var(--fg)">
                    Еженедельный обзор
                  </div>
                  <div
                    style="font-size: 11.5px; color: var(--fg2); line-height: 1.45; margin-top: 4px"
                  >
                    Ритуал GTD по пятницам
                  </div>
                </div>
              </div>
              <div
                @click="openStub('Калькулятор целей')"
                class="fl-hov-accent-line"
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 17px;
                  cursor: pointer;
                  display: flex;
                  flex-direction: column;
                  gap: 11px;
                "
              >
                <div
                  style="
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    background: var(--accent-soft);
                    border: 1px solid var(--accent-line);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: none;
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--accent)"
                    stroke-width="1.4"
                  >
                    <circle cx="8" cy="8" r="5.5" />
                    <circle cx="8" cy="8" r="2.3" />
                  </svg>
                </div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 700; color: var(--fg)">
                    Калькулятор целей
                  </div>
                  <div
                    style="font-size: 11.5px; color: var(--fg2); line-height: 1.45; margin-top: 4px"
                  >
                    Разбить цель на шаги и сроки
                  </div>
                </div>
              </div>
              <div
                @click="openStub('Экспорт')"
                class="fl-hov-accent-line"
                style="
                  background: var(--surface);
                  border: 1px solid var(--line);
                  border-radius: 13px;
                  padding: 17px;
                  cursor: pointer;
                  display: flex;
                  flex-direction: column;
                  gap: 11px;
                "
              >
                <div
                  style="
                    width: 36px;
                    height: 36px;
                    border-radius: 9px;
                    background: var(--accent-soft);
                    border: 1px solid var(--accent-line);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    flex: none;
                  "
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 16 16"
                    fill="none"
                    stroke="var(--accent)"
                    stroke-width="1.4"
                  >
                    <path d="M8 2.5v7" />
                    <polyline points="5,7 8,9.8 11,7" />
                    <path d="M3 11.5v1.5a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-1.5" />
                  </svg>
                </div>
                <div>
                  <div style="font-size: 13.5px; font-weight: 700; color: var(--fg)">Экспорт</div>
                  <div
                    style="font-size: 11.5px; color: var(--fg2); line-height: 1.45; margin-top: 4px"
                  >
                    Выгрузка данных в Markdown
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== SERVICES ===== -->
        <div
          v-if="screen === 'services'"
          style="padding: 24px; max-width: 1000px; margin: 0 auto; animation: fadeUp 0.3s ease"
        >
          <div
            style="
              font-size: 13px;
              color: var(--fg2);
              line-height: 1.55;
              max-width: 600px;
              margin-bottom: 22px;
            "
          >
            Внешние сервисы — источники событий для журнала. Подключённые синхронизируются
            автоматически и наполняют систему.
          </div>
          <div style="display: flex; flex-direction: column; gap: 24px">
            <div v-for="(g, gi) in serviceGroups" :key="'svg' + gi">
              <div style="display: flex; align-items: center; gap: 9px; margin-bottom: 12px">
                <span
                  style="
                    font-size: 11px;
                    font-weight: 700;
                    letter-spacing: 0.1em;
                    text-transform: uppercase;
                    color: var(--fg2);
                  "
                  >{{ g.label }}</span
                >
                <div style="flex: 1; height: 1px; background: var(--line)"></div>
                <span
                  style="
                    font-family: 'JetBrains Mono', monospace;
                    font-size: 10.5px;
                    color: var(--fg3);
                  "
                  >{{ g.count }}</span
                >
              </div>
              <div
                data-role="metrics"
                style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px"
              >
                <div v-for="s in g.items" :key="'sv' + s.id" :style="s.cardStyle">
                  <div
                    style="
                      width: 42px;
                      height: 42px;
                      border-radius: 11px;
                      background: var(--surface-2);
                      border: 1px solid var(--line);
                      display: flex;
                      align-items: center;
                      justify-content: center;
                      font-family: 'JetBrains Mono', monospace;
                      font-size: 15px;
                      font-weight: 700;
                      flex: none;
                    "
                    :style="{ color: s.iconColor }"
                  >
                    {{ s.glyph }}
                  </div>
                  <div style="flex: 1; min-width: 0">
                    <div style="display: flex; align-items: center; gap: 8px">
                      <span style="font-size: 14px; font-weight: 700; color: var(--fg)">{{
                        s.name
                      }}</span
                      ><span
                        v-if="s.hasTag"
                        style="
                          font-size: 9.5px;
                          font-weight: 600;
                          color: var(--accent);
                          background: var(--accent-soft);
                          border-radius: 5px;
                          padding: 2px 7px;
                          flex: none;
                        "
                        >{{ s.tag }}</span
                      >
                    </div>
                    <div
                      style="
                        font-size: 11.5px;
                        color: var(--fg2);
                        margin-top: 3px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    >
                      {{ s.desc }}
                    </div>
                    <div style="font-size: 10.5px; margin-top: 6px" :style="{ color: s.lastColor }">
                      {{ s.last }}
                    </div>
                  </div>
                  <div @click="toggleService(s.id)" :style="s.switchStyle">
                    <div :style="s.knobStyle"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- ===== LIBRARY ===== -->
        <div
          v-if="screen === 'library'"
          style="padding: 24px; max-width: 1000px; margin: 0 auto; animation: fadeUp 0.3s ease"
        >
          <div
            style="
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 18px;
              flex-wrap: wrap;
            "
          >
            <div
              style="
                display: flex;
                gap: 3px;
                padding: 3px;
                border: 1px solid var(--line);
                border-radius: 9px;
                background: var(--surface-2);
              "
            >
              <button
                v-for="t in libTabs"
                :key="'lt' + t.key"
                @click="setLibFilter(t.key)"
                :style="t.style"
              >
                {{ t.label }}
              </button>
            </div>
            <span
              style="font-family: 'JetBrains Mono', monospace; font-size: 11px; color: var(--fg3)"
              >{{ libCount }}</span
            >
          </div>
          <div data-role="metrics" style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px">
            <div
              v-for="(b, bi) in libraryView"
              :key="'lib' + bi"
              class="fl-hov-line2"
              style="
                background: var(--surface);
                border: 1px solid var(--line);
                border-radius: 13px;
                padding: 17px;
                display: flex;
                flex-direction: column;
                gap: 11px;
                cursor: pointer;
              "
            >
              <div style="display: flex; align-items: center; gap: 9px">
                <span
                  style="
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.04em;
                    text-transform: uppercase;
                    color: var(--fg2);
                    background: var(--surface-2);
                    border: 1px solid var(--line);
                    border-radius: 6px;
                    padding: 3px 8px;
                  "
                  >{{ b.typeLabel }}</span
                >
                <div style="flex: 1"></div>
                <span
                  style="
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    font-size: 11px;
                    font-weight: 600;
                  "
                  :style="{ color: b.statusColor }"
                  ><span
                    style="width: 7px; height: 7px; border-radius: 50%"
                    :style="{ background: b.statusColor }"
                  ></span
                  >{{ b.statusLabel }}</span
                >
              </div>
              <div>
                <div style="font-size: 15px; font-weight: 700; color: var(--fg); line-height: 1.3">
                  {{ b.title }}
                </div>
                <div style="font-size: 12px; color: var(--fg2); margin-top: 4px">
                  {{ b.author }}
                </div>
              </div>
              <div
                v-if="b.reading"
                style="
                  height: 6px;
                  background: var(--surface-2);
                  border-radius: 4px;
                  overflow: hidden;
                "
              >
                <div
                  style="height: 100%; background: var(--accent); border-radius: 4px"
                  :style="{ width: b.pct }"
                ></div>
              </div>
              <div style="display: flex; gap: 6px; flex-wrap: wrap">
                <span
                  v-for="(tg, tgi) in b.tags"
                  :key="'tag' + bi + '_' + tgi"
                  style="
                    font-size: 10.5px;
                    font-weight: 500;
                    color: var(--fg3);
                    background: var(--surface-2);
                    border-radius: 6px;
                    padding: 3px 8px;
                  "
                  >#{{ tg }}</span
                >
              </div>
            </div>
          </div>
        </div>

        <!-- ===== STUB ===== -->
        <div
          v-if="screen === 'stub'"
          style="
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            animation: fadeUp 0.3s ease;
          "
        >
          <div
            style="
              width: 54px;
              height: 54px;
              border-radius: 14px;
              background: var(--accent-soft);
              border: 1px solid var(--accent-line);
              display: flex;
              align-items: center;
              justify-content: center;
            "
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 16 16"
              fill="none"
              stroke="var(--accent)"
              stroke-width="1.4"
            >
              <circle cx="8" cy="8" r="6" />
              <line x1="8" y1="5" x2="8" y2="8.5" />
              <circle cx="8" cy="11" r=".5" fill="var(--accent)" />
            </svg>
          </div>
          <div style="font-size: 22px; font-weight: 800; letter-spacing: -0.02em; color: var(--fg)">
            {{ stubName }}
          </div>
          <div style="font-size: 13px; color: var(--fg2)">
            Модуль в разработке — появится в следующих итерациях
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

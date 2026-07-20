// @shared
/**
 * Весь статический контент сайта проекта «Мама Знайка — вебинарная воронка».
 * Импортируется и сервером (index.tsx — <title>, id вопросов) и клиентом
 * (SitePage.vue). Никаких зависимостей от Heap/сервера — только данные.
 *
 * Сайт одноязычный (русский), поэтому контент — единый объект CONTENT: SiteContent
 * (в отличие от мультиязычного ipsen/kp, где CONTENT: Record<Lang, …>). Если позже
 * понадобятся языки — модель повторяет ipsen: обернуть в Record<Lang, SiteContent>.
 *
 * ВАЖНО: id вопросов (q1, q2, …) — стабильные, это ключ привязки ответов в Heap.
 * При правках не переиспользовать id удалённых вопросов.
 *
 * СТАТУС: каркас. Тексты разделов — заглушки, наполняются по мере аудита.
 */

export interface MetaInfo {
  title: string
  stage: string
}

/** Карточка элемента архитектуры (сервис / модуль / узел). */
export interface ArchItem {
  code: string
  name: string
  desc: string
  kind?: string // sync | async | infra
}

/** Слой архитектуры (текущей или ожидаемой). */
export interface ArchLayer {
  id: string
  index: string
  title: string
  subtitle: string
  groups?: { title: string; items: ArchItem[] }[]
  items?: ArchItem[]
  note?: string
}

/** Статус шага плана выполнения проекта. */
export type StepStatus = 'done' | 'active' | 'todo'

/** Шаг вертикального плана выполнения (степпер сверху вниз). */
export interface StepItem {
  text: string
  status: StepStatus
}

/** Блок контента внутри раздела главного документа. */
export interface DocBlock {
  type: 'text' | 'list' | 'included' | 'excluded' | 'note' | 'steps'
  text?: string
  items?: string[]
  steps?: StepItem[]
}

/** Раздел главного документа. locked — раздел ещё не проработан. */
export interface DocSection {
  n: string
  title: string
  blocks: DocBlock[]
  locked?: boolean
}

/** Открытый вопрос. id — стабильный сквозной ключ привязки ответов. */
export interface OpenQuestion {
  id: string
  code: string
  text: string
  feeds: string // какой раздел документа/архитектуры питает
}

export interface QuestionBlock {
  letter: string
  title: string
  questions: OpenQuestion[]
}

/** Строки интерфейса (вкладки, формы, футер) — вне контента документа. */
export interface UiStrings {
  tabDoc: string
  tabCurrent: string
  tabTarget: string
  tabQuestions: string
  /* Короткие подписи вкладок для мобильных (полные не помещаются в ряд). */
  tabDocShort: string
  tabCurrentShort: string
  tabTargetShort: string
  tabQuestionsShort: string
  docHeading: string
  currentHeading: string
  targetHeading: string
  questionsHeading: string
  answersSuffix: string
  emptyAnswers: string
  textPlaceholder: string
  submit: string
  submitting: string
  badgeReal: string
  badgeBot: string
  badgeGuest: string
  footerStrong: string
  footerRest: string
  errEmptyText: string
  okAdded: string
  errSend: string
  errNetwork: string
  lockedNote: string
  tabLockedHint: string
  stepDone: string
  stepActive: string
  stepTodo: string
}

export interface SiteContent {
  meta: MetaInfo
  docIntro: string
  docSections: DocSection[]
  currentIntro: string[]
  currentLayers: ArchLayer[]
  targetIntro: string[]
  targetLayers: ArchLayer[]
  questionBlocks: QuestionBlock[]
  ui: UiStrings
}

/* ═══════════════════════════  КОНТЕНТ (RU)  ═══════════════════════════ */

const CONTENT_RU: SiteContent = {
  meta: {
    title: 'Обновление вебинарной воронки',
    stage: 'Discovery / аудит'
  },

  /* ── Вкладка 1: Главный документ (это НЕ КП) ── */
  docIntro:
    'Главный рабочий документ проекта. Здесь фиксируются цель, границы, гипотезы и договорённости по обновлению вебинарной воронки. Разделы наполняются по мере аудита.',

  docSections: [
    {
      n: '1',
      title: 'Задача',
      blocks: [
        {
          type: 'text',
          text: 'Повысить конверсию доходимости и продаж в вебинарной воронке: сократить интервал между регистрацией и вебинаром и усилить прогрев/дожим.'
        }
      ]
    },
    {
      n: '2',
      title: 'План выполнения',
      blocks: [
        {
          type: 'steps',
          steps: [
            { text: 'Подписание документов', status: 'done' },
            { text: 'Подбор гипотез', status: 'done' },
            { text: 'Изучение текущей архитектуры', status: 'active' },
            { text: 'Сбор метрик', status: 'todo' },
            { text: 'Выбор новой архитектуры', status: 'todo' },
            { text: 'Оценка трудозатрат', status: 'todo' },
            { text: 'Прототипирование', status: 'todo' },
            { text: 'Декомпозиция задач', status: 'todo' },
            { text: 'Уточняющие вопросы', status: 'todo' },
            { text: 'TBD', status: 'todo' }
          ]
        }
      ]
    },
    {
      n: '3',
      title: 'Контекст и текущее состояние',
      blocks: [
        {
          type: 'text',
          text: 'Сейчас воронка собрана на связке GetCourse + Salebot + Bizon365. Автовебинары идут 2 раза в день. Холодного трафика почти нет — был запуск на существующую базу.'
        }
      ]
    },
    { n: '4', title: 'Границы работ (что входит / что не входит)', blocks: [], locked: true },
    { n: '5', title: 'Гипотезы роста конверсии', blocks: [], locked: true },
    { n: '6', title: 'Метрики и целевые показатели', blocks: [], locked: true },
    { n: '7', title: 'План этапов', blocks: [], locked: true },
    { n: '8', title: 'Договорённости и решения', blocks: [], locked: true }
  ],

  /* ── Вкладка 2: Текущая архитектура ── */
  currentIntro: [
    'Как воронка устроена сейчас: три отдельных сервиса, между которыми данные ходят через интеграции.',
    'Черновик — уточняется по ходу аудита.'
  ],

  currentLayers: [
    {
      id: 'cur-getcourse',
      index: '01',
      title: 'GetCourse',
      subtitle: 'Платформа: база, продукты, оплаты, часть рассылок.',
      items: [
        {
          code: 'GC',
          name: 'GetCourse',
          desc: 'CRM/LMS, база, оплаты, часть рассылок. Тариф — за «активных» пользователей.',
          kind: 'infra'
        }
      ]
    },
    {
      id: 'cur-salebot',
      index: '02',
      title: 'Salebot',
      subtitle: 'Логика воронки и рассылки по базе.',
      items: [
        {
          code: 'SB',
          name: 'Salebot',
          desc: 'Сценарии воронки, ветвление, рассылки. Тариф — лимит на количество сообщений.',
          kind: 'sync'
        }
      ]
    },
    {
      id: 'cur-bizon',
      index: '03',
      title: 'Bizon365',
      subtitle: 'Проведение автовебинаров.',
      items: [
        {
          code: 'BZ',
          name: 'Bizon365',
          desc: 'Автовебинары по расписанию (2 раза в день). Отдаёт данные о заходах и просмотрах в Salebot.',
          kind: 'infra'
        }
      ],
      note: 'Известная проблема интеграции: Bizon пишет каждый заход отдельной строкой, Salebot берёт первый найденный — участник ошибочно уходит в ветку повтора вместо продажи. Уточняется в разделе «Вопросы».'
    }
  ],

  /* ── Вкладка 3: Ожидаемая архитектура ── */
  targetIntro: [
    'Куда движемся: свести воронку и вебинары в единый управляемый контур, запуск вебинара почти сразу после регистрации, оплата и агент внутри вебинара.',
    'Черновик — финальный контур и сервис определяются после аудита.'
  ],

  targetLayers: [
    {
      id: 'tgt-core',
      index: '01',
      title: 'Единый контур воронки',
      subtitle: 'Воронка и вебинары в одном сервисе. Сервис ещё выбирается.',
      items: [
        {
          code: 'T1',
          name: 'Ядро воронки',
          desc: '— описание уточняется после выбора платформы.',
          kind: 'infra'
        }
      ],
      note: 'Кандидат — Chatium; критерии выбора и альтернативы — в разделе «Вопросы».'
    },
    {
      id: 'tgt-instant',
      index: '02',
      title: 'Мгновенный вебинар',
      subtitle: 'Запуск автовебинара почти сразу после регистрации.',
      items: [
        {
          code: 'T2',
          name: 'Быстрый старт вебинара',
          desc: '— описание уточняется.',
          kind: 'sync'
        }
      ]
    },
    {
      id: 'tgt-agent',
      index: '03',
      title: 'Агент прогрева и дожима',
      subtitle: 'Агент в чате вебинара и в переписке вне вебинара.',
      items: [
        {
          code: 'T3',
          name: 'Диалоговый агент',
          desc: '— описание уточняется.',
          kind: 'sync'
        }
      ]
    },
    {
      id: 'tgt-analytics',
      index: '04',
      title: 'Аналитика и сегментация',
      subtitle: 'Сегментирование, ручные рассылки, аналитика воронки.',
      items: [
        {
          code: 'T4',
          name: 'Аналитический слой',
          desc: '— описание уточняется.',
          kind: 'async'
        }
      ]
    }
  ],

  /* ── Вкладка 4: Вопросы ── */
  questionBlocks: [
    {
      letter: 'A',
      title: 'Цели и приоритеты',
      questions: [
        {
          id: 'q1',
          code: 'В-1',
          text: 'Целевая доходимость и продажи — какие цифры считаем успехом и на каком горизонте измеряем?',
          feeds: 'Задача · Метрики'
        },
        {
          id: 'q2',
          code: 'В-2',
          text: 'Какой первый измеримый результат считаем успехом пилота?',
          feeds: 'План этапов'
        }
      ]
    },
    {
      letter: 'B',
      title: 'Данные и интеграции',
      questions: [
        {
          id: 'q3',
          code: 'В-3',
          text: 'Bizon365: как получать полную длительность просмотра участника (сумму всех заходов), а не первую строку? Нужен доп. скрипт?',
          feeds: 'Текущая архитектура'
        },
        {
          id: 'q4',
          code: 'В-4',
          text: 'Какие данные из GetCourse и Salebot нужны в новом контуре и как их переносим?',
          feeds: 'Ожидаемая архитектура'
        }
      ]
    },
    {
      letter: 'C',
      title: 'Сервисы и стек',
      questions: [
        {
          id: 'q5',
          code: 'В-5',
          text: 'Chatium или другой сервис как единый контур — критерии выбора и альтернативы?',
          feeds: 'Ожидаемая архитектура'
        },
        {
          id: 'q6',
          code: 'В-6',
          text: 'От каких текущих сервисов планируем отказаться и в какие сроки?',
          feeds: 'Границы работ'
        }
      ]
    }
  ],

  ui: {
    tabDoc: 'Главный документ',
    tabCurrent: 'Текущая архитектура',
    tabTarget: 'Ожидаемая архитектура',
    tabQuestions: 'Вопросы',
    tabDocShort: 'Документ',
    tabCurrentShort: 'Сейчас',
    tabTargetShort: 'Цель',
    tabQuestionsShort: 'Вопросы',
    docHeading: 'Главный документ проекта',
    currentHeading: 'Текущая архитектура',
    targetHeading: 'Ожидаемая архитектура',
    questionsHeading: 'Открытые вопросы',
    answersSuffix: 'отв.',
    emptyAnswers: 'Ответов пока нет — станьте первым.',
    textPlaceholder: 'Ваш ответ на этот вопрос…',
    submit: 'Отправить',
    submitting: 'Отправка…',
    badgeReal: 'участник',
    badgeBot: 'бот',
    badgeGuest: 'гость',
    footerStrong: 'Мама Знайка · Вебинарная воронка.',
    footerRest:
      'Рабочий материал стадии discovery. Ответы на вопросы собираются здесь и переносятся в документ.',
    errEmptyText: 'Введите текст ответа.',
    okAdded: 'Спасибо! Ответ добавлен.',
    errSend: 'Не удалось отправить. Попробуйте ещё раз.',
    errNetwork: 'Ошибка сети. Попробуйте ещё раз.',
    lockedNote: 'Заполнится по мере аудита.',
    tabLockedHint: 'Раздел пока закрыт',
    stepDone: 'завершено',
    stepActive: 'активно',
    stepTodo: 'предстоит'
  }
}

/* ═══════════════════════════════════════════════════════════════════════ */

export const CONTENT: SiteContent = CONTENT_RU

/**
 * Плоский список id всех вопросов — для загрузки ответов на сервере и валидации.
 */
export const ALL_QUESTION_IDS: string[] = CONTENT.questionBlocks.flatMap((b) =>
  b.questions.map((q) => q.id)
)

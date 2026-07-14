// @shared
/**
 * Весь статический контент сайта КП «Ipsen — ИИ-агенты» на трёх языках (ru/en/fr).
 * Импортируется и сервером (index.tsx — язык по умолчанию, <title>, id вопросов)
 * и клиентом (SitePage.vue). Никаких зависимостей от Heap/сервера — только данные.
 *
 * Мультиязычность: контент структурный (массивы объектов), а не плоские UI-строки,
 * поэтому хранится как CONTENT: Record<Lang, SiteContent>, а не в lang/*.yml через
 * ctx.t() — так переключение языка мгновенное (реактивный ref, без перезагрузки и
 * без записи в профиль анонима), а tsc гарантирует, что все три языка заполнены.
 * Платформенный ctx.lang используется для выбора начального языка (см. index.tsx).
 *
 * ВАЖНО: id вопросов (q1…q15) — сквозные для всех языков, это ключ привязки ответов
 * в Heap. При правке следить, чтобы наборы id в ru/en/fr совпадали.
 *
 * Источник: проект second_brain `ipsen-ai-agents-discovery-e874ba`
 * (бриф, architecture-ideas.md, kp-outline.md).
 */

export type Lang = 'ru' | 'en' | 'fr'

export const LANGS: Lang[] = ['ru', 'en', 'fr']

export interface MetaInfo {
  title: string
  stage: string
}

export interface AgentItem {
  code: string
  name: string
  desc: string
  kind?: string // sync | async | infra
}

export interface ArchLayer {
  id: string
  index: string
  title: string
  subtitle: string
  groups?: { title: string; items: AgentItem[] }[]
  items?: AgentItem[]
  note?: string
}

export interface KpBlock {
  type: 'text' | 'list' | 'included' | 'excluded' | 'note'
  text?: string
  items?: string[]
}

export interface KpSection {
  n: string
  title: string
  blocks: KpBlock[]
  locked?: boolean
}

export interface OpenQuestion {
  id: string // стабильный сквозной id — ключ привязки ответов
  code: string
  text: string
  feeds: string // какой раздел КП питает
}

export interface QuestionBlock {
  letter: string
  title: string
  questions: OpenQuestion[]
}

/** Строки интерфейса (вкладки, формы, футер) — вне контента документа. */
export interface UiStrings {
  tabKp: string
  tabArch: string
  tabQuestions: string
  archHeading: string
  kpHeading: string
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
}

export interface SiteContent {
  meta: MetaInfo
  archIntro: string[]
  archLayers: ArchLayer[]
  kpIntro: string
  kpSections: KpSection[]
  questionBlocks: QuestionBlock[]
  ui: UiStrings
}

/* ═════════════════════════════  RU  ═════════════════════════════ */

const RU: SiteContent = {
  meta: {
    title: 'Инфраструктура ИИ-агентов',
    stage: 'Discovery / pre-sale'
  },

  archIntro: [
    'Система строится как единый брокер (control plane) плюс набор самостоятельных микросервисов-агентов, которые вместе составляют одну управляемую инфраструктуру.',
    'Каждый помощник — отдельный модуль со своим доменом, своими подключениями к системам и своими правилами доступа. Брокер держит всё вместе: вход, маршрутизацию, доступы, учёт и защиту данных.',
    'Такая нарезка даёт изоляцию отказов, независимый запуск каждого помощника, помодульную цену и возможность стартовать с пилота из 1–2 сервисов, добавляя остальное постепенно.'
  ],

  archLayers: [
    {
      id: 'layer-broker',
      index: '01',
      title: 'Брокер · control plane',
      subtitle: 'Общий фундамент для всех помощников. Ставится один раз.',
      items: [
        {
          code: 'B1',
          name: 'Авторизация (SSO)',
          desc: 'Вход через корпоративный доступ компании (OAuth2 / OpenID Connect), сессии и токены для агентов.',
          kind: 'infra'
        },
        {
          code: 'B2',
          name: 'Админ-сервис',
          desc: 'Пользователи и их агенты, выдача доступа, расходы на агента, дашборд активности, статистика, управление лимитами.',
          kind: 'infra'
        },
        {
          code: 'B3',
          name: 'Личный кабинет',
          desc: 'Единое окно сотрудника: доступные помощники, запрос доступа, запуск, обратная связь.',
          kind: 'infra'
        },
        {
          code: 'B4',
          name: 'Шлюз и учёт',
          desc: 'Маршрутизация запроса к нужному агенту, метрика использования и расходов, квоты, аудит.',
          kind: 'infra'
        },
        {
          code: 'B5',
          name: 'Маскирование данных',
          desc: 'Маскирование вводимого и нормирование трафика — общий слой для всех помощников.',
          kind: 'infra'
        }
      ]
    },
    {
      id: 'layer-agents',
      index: '02',
      title: 'Микросервисы-помощники',
      subtitle: '16 агентов из документа. Каждый — отдельный модуль поверх базы.',
      groups: [
        {
          title: 'ИИ-помощь (RAG · заказчик готов делать сам)',
          items: [
            {
              code: 'A1',
              name: 'Комплайнс-агент',
              desc: 'Вопросы по организации мероприятий и этике бизнеса.',
              kind: 'sync'
            },
            {
              code: 'A2',
              name: 'Агент-ревьюер',
              desc: 'Оценка документов по юр./промо/нон-промо СОПам и законодательству о рекламе.',
              kind: 'sync'
            },
            {
              code: 'A3',
              name: 'Агент техподдержки',
              desc: 'Вопросы по CRM, Veeva, InTop, Concur, IT; эскалация на человека при неуспехе.',
              kind: 'sync'
            },
            {
              code: 'A4',
              name: 'Админ-агент',
              desc: 'Административные и финансовые вопросы: офис, авто, топливо, отпуска, авансовые отчёты.',
              kind: 'sync'
            },
            {
              code: 'A5',
              name: 'Агент-проводник',
              desc: 'Адаптация новичков: знает все системы, направляет в нужное место или к нужному агенту.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'ИИ-обучение',
          items: [
            {
              code: 'A6',
              name: 'Виртуальный врач-статист',
              desc: 'Тренажёр работы с возражениями и коуч-наблюдатель с обратной связью. Делается вне Chatium.',
              kind: 'sync'
            },
            {
              code: 'A7',
              name: 'Комплайнс-тренер',
              desc: 'Регулярное микродозированное общение и фиксация динамики по организации.',
              kind: 'async'
            }
          ]
        },
        {
          title: 'ИИ в кадрах',
          items: [
            {
              code: 'A8',
              name: 'Агент-рекрутер',
              desc: 'Разбор резюме, проверка согласий, рассылка форм, база кандидатов, возможно первичные телефонные интервью.',
              kind: 'sync'
            },
            {
              code: 'A9',
              name: 'HR admin ассистент',
              desc: 'Агрегирует данные о сотрудниках из разных систем, даёт сводку по запросу HR.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'ИИ-аналитика',
          items: [
            {
              code: 'A10',
              name: 'Монитор редких заболеваний',
              desc: 'Регулярно проверяет сайты и отчёты SML (Медиалогия) на упоминания заболеваний и клиник, делает сводку для продаж.',
              kind: 'async'
            },
            {
              code: 'A11',
              name: 'Куратор профилей',
              desc: 'Отслеживает изменения в Optimacros по профилям редких пациентов, контроль сроков и этапов, рекомендации.',
              kind: 'async'
            },
            {
              code: 'A12',
              name: 'BEX / SFE агент',
              desc: 'Отчёты по запросу, расчёт бонусов по текущим данным, прогноз на период.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'ИИ-маркетинг',
          items: [
            {
              code: 'A13',
              name: 'Контент-завод',
              desc: 'Генерация контента (текст, изображение, видео, аудио, письма, листовки) с workflow. Плагин КингКонт в Chatium.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'ИИ-ассистенты',
          items: [
            {
              code: 'A14',
              name: 'Chat Ipsen',
              desc: 'Доступ к LLM для повседневной работы, аналог Copilot. Защита данных — через слой B5.',
              kind: 'sync'
            },
            {
              code: 'A15',
              name: 'PV-секретарь',
              desc: 'Обработка входящих (почта/телефон), классификация для систем фармаконадзора, качества, мед. информации.',
              kind: 'async'
            },
            {
              code: 'A16',
              name: 'CarFleet агент',
              desc: 'Распознавание фото спидометра, сверка пробега с топливными картами, путевой лист, распределение штрафов.',
              kind: 'sync'
            }
          ]
        }
      ]
    },
    {
      id: 'layer-connectors',
      index: '03',
      title: 'Слой подключений (коннекторы)',
      subtitle: 'Сквозной слой. Здесь основная стоимость проекта.',
      items: [
        {
          code: 'C',
          name: 'Переиспользуемые коннекторы',
          desc: 'CRM, Veeva, InTop, Concur, Optimacros, топливные карты, SML/Медиалогия, почта/телефония, LLM-провайдеры. Один «переходник» на систему, а не по одному на каждого агента.',
          kind: 'infra'
        }
      ],
      note: 'Объём и наличие API у систем — главный блокер оценки (открытые вопросы В-4, В-5).'
    },
    {
      id: 'layer-bus',
      index: '04',
      title: 'Асинхронная шина',
      subtitle: 'Для фоновых помощников — отдельно от синхронного шлюза.',
      items: [
        {
          code: 'Q',
          name: 'События и расписание',
          desc: 'Фоновая работа по расписанию/событию для A7, A10, A11, A15 (частично A8). Не грузить всё на один брокер — это разные механизмы.',
          kind: 'async'
        }
      ]
    }
  ],

  kpIntro:
    'Ниже — рабочая структура будущего коммерческого предложения. Разделы наполняются по мере закрытия открытых вопросов. Главный принцип цены — модульность: база (брокер) плюс независимые опции-помощники, каждая со своей фиксированной стоимостью.',

  kpSections: [
    {
      n: '1',
      title: 'Задача',
      blocks: [
        {
          type: 'text',
          text: 'Внедрить у Ipsen управляемую внутреннюю экосистему ИИ-помощников на единой платформе, а не отдельные разрозненные боты.'
        },
        {
          type: 'text',
          text: 'В работу берём то, что требует интеграций и общего фундамента доступа. То, что заказчик делает сам (стандартные справочные агенты, врач-статист вне Chatium), в предложение не входит.'
        }
      ]
    },
    {
      n: '2',
      title: 'Что входит',
      blocks: [
        {
          type: 'text',
          text: 'База — единый фундамент («брокер»). Простыми словами: общая проходная и диспетчерская для всех помощников. Ставится один раз и работает для любого числа агентов.'
        },
        {
          type: 'included',
          items: [
            'вход сотрудников через корпоративный доступ компании (SSO);',
            'личный кабинет: сотрудник видит доступных помощников и запрашивает новых;',
            'панель администратора: кто чем пользуется, кому что разрешено, сколько расходуется, лимиты;',
            'общий учёт расходов и защита данных (маскирование того, что вводит сотрудник).'
          ]
        },
        {
          type: 'text',
          text: 'Помощники и подключения к рабочим системам подключаются модулями поверх базы — см. раздел «Опции».'
        }
      ]
    },
    {
      n: '3',
      title: 'Что не входит',
      blocks: [
        {
          type: 'excluded',
          items: [
            'Доработка самих рабочих систем Ipsen и предоставление к ним доступа/API — на стороне заказчика и его вендоров (мы делаем «переходник», но не саму систему).',
            'Настройка корпоративного входа (SSO) на стороне провайдера Ipsen.',
            'Наполнение помощников содержанием: базы знаний, СОПы, регламенты.',
            'Обучение персонала и поддержка после сдачи, если не оформлены отдельной опцией.',
            'Всё, что заказчик делает сам (стандартные справочные агенты, врач-статист вне Chatium).',
            'Помощники, не вошедшие в выбранный набор опций (добавляются отдельными модулями позже).'
          ]
        }
      ]
    },
    {
      n: '4',
      title: 'Опции (модульная цена)',
      blocks: [
        {
          type: 'text',
          text: 'Каждый помощник и каждое подключение — отдельная опция со своей фиксированной ценой. Заказчик берёт базу и набирает нужные модули.'
        },
        {
          type: 'list',
          items: [
            'Помощники-справочники (на базе знаний, без интеграций): комплайнс, ревьюер, техподдержка, админ-вопросы, проводник, комплайнс-тренер.',
            'Помощники с подключением к системам (цена зависит от числа «переходников»): HR-сводка, расчёт бонусов и прогнозов (BEX/SFE), куратор профилей в Optimacros, рекрутер, топливные отчёты.',
            'Помощники-наблюдатели (работают в фоне): монитор редких заболеваний, секретарь входящих обращений для фарм-систем.',
            'Повседневный ИИ-ассистент (аналог Copilot с защитой данных).',
            'Контент-фабрика (тексты, изображения, письма) — плагин в Chatium.'
          ]
        }
      ]
    },
    {
      n: '5',
      title: 'Стоимость и сроки',
      blocks: [],
      locked: true
    },
    {
      n: '6',
      title: 'Что требуется для старта',
      blocks: [],
      locked: true
    },
    {
      n: '7',
      title: 'Передача и развёртывание',
      blocks: [],
      locked: true
    },
    {
      n: '8',
      title: 'Следующий шаг',
      blocks: [],
      locked: true
    }
  ],

  questionBlocks: [
    {
      letter: 'A',
      title: 'Скоуп и приоритеты',
      questions: [
        {
          id: 'q1',
          code: 'В-1',
          text: 'Какие агенты берём в работу по этому КП, а какие заказчик делает сам? (сам: стандартные RAG, Chat Ipsen, врач-статист вне Chatium — подтвердить).',
          feeds: 'Задача · Что входит · Что не входит'
        },
        {
          id: 'q2',
          code: 'В-2',
          text: 'С каких помощников начинаем — что пилот, что этап 2+? Нужен один измеримый первый результат.',
          feeds: 'Опции · Стоимость · Следующий шаг'
        },
        {
          id: 'q3',
          code: 'В-3',
          text: 'Что закрывается обычным функционалом агентов Chatium, а что требует спец-решения и интеграций?',
          feeds: 'Что входит · Опции'
        }
      ]
    },
    {
      letter: 'B',
      title: 'Данные и интеграции — главный блокер оценки',
      questions: [
        {
          id: 'q4',
          code: 'В-4',
          text: 'Сколько и каких источников данных / систем реально подключаем? (CRM, Veeva, InTop, Concur, Optimacros, топливные карты, SML/Медиалогия и др.)',
          feeds: 'Что входит · Стоимость · Старт'
        },
        {
          id: 'q5',
          code: 'В-5',
          text: 'По каждой системе: есть API или только выгрузки (Excel/файлы)? Кто даёт доступ и в какие сроки?',
          feeds: 'Что не входит · Старт'
        },
        {
          id: 'q7',
          code: 'В-7',
          text: 'База кандидатов для рекрутера: где живёт, нужен ли отдельный инструмент типа «календаря контактов»?',
          feeds: 'Что входит · Что не входит'
        }
      ]
    },
    {
      letter: 'C',
      title: 'Платформа и инфраструктура доступа',
      questions: [
        {
          id: 'q9',
          code: 'В-9',
          text: 'SSO: какой провайдер (Azure AD / другой OAuth2/OIDC)? Кто настраивает на стороне Ipsen?',
          feeds: 'Старт · Передача'
        },
        {
          id: 'q10',
          code: 'В-10',
          text: 'Админ-панель и личный кабинет: что must-have для первого этапа (доступы, расходы, дашборд, лимиты), что позже?',
          feeds: 'Что входит · Опции'
        },
        {
          id: 'q11',
          code: 'В-11',
          text: 'Chat Ipsen: требования к маскированию вводимых данных и нормированию трафика — детально.',
          feeds: 'Что входит · Что не входит'
        }
      ]
    },
    {
      letter: 'D',
      title: 'Комплаенс, риски, юр. рамка фармы',
      questions: [
        {
          id: 'q14',
          code: 'В-14',
          text: 'Что заказчик обеспечивает сам (доступы, контент/база знаний для RAG, СОПы, регламенты)?',
          feeds: 'Что не входит · Старт'
        }
      ]
    },
    {
      letter: 'E',
      title: 'Коммерция и адресат',
      questions: [
        {
          id: 'q15',
          code: 'В-15',
          text: 'Кому адресовано КП — напрямую Ipsen или через посредника/агентство?',
          feeds: 'Задача'
        }
      ]
    }
  ],

  ui: {
    tabKp: 'Коммерческое предложение',
    tabArch: 'Архитектура',
    tabQuestions: 'Открытые вопросы',
    archHeading: 'Архитектура: брокер + микросервисы',
    kpHeading: 'Коммерческое предложение',
    questionsHeading: 'Открытые вопросы',
    answersSuffix: 'отв.',
    emptyAnswers: 'Ответов пока нет — станьте первым.',
    textPlaceholder: 'Ваш ответ на этот вопрос…',
    submit: 'Отправить',
    submitting: 'Отправка…',
    badgeReal: 'участник',
    badgeBot: 'бот',
    badgeGuest: 'гость',
    footerStrong: 'Ipsen · Инфраструктура ИИ-агентов.',
    footerRest:
      'Рабочий материал стадии discovery. Ответы на вопросы собираются здесь и переносятся в КП.',
    errEmptyText: 'Введите текст ответа.',
    okAdded: 'Спасибо! Ответ добавлен.',
    errSend: 'Не удалось отправить. Попробуйте ещё раз.',
    errNetwork: 'Ошибка сети. Попробуйте ещё раз.',
    lockedNote: 'Заполнится после закрытия открытых вопросов.'
  }
}

/* ═════════════════════════════  EN  ═════════════════════════════ */

const EN: SiteContent = {
  meta: {
    title: 'AI Agent Infrastructure',
    stage: 'Discovery / pre-sale'
  },

  archIntro: [
    'The system is built as a single broker (control plane) plus a set of independent agent microservices that together form one managed infrastructure.',
    'Each assistant is a separate module with its own domain, its own connections to systems and its own access rules. The broker holds it all together: entry, routing, access, accounting and data protection.',
    'This split gives fault isolation, independent rollout of each assistant, per-module pricing and the option to start with a pilot of 1–2 services, adding the rest gradually.'
  ],

  archLayers: [
    {
      id: 'layer-broker',
      index: '01',
      title: 'Broker · control plane',
      subtitle: 'A shared foundation for every assistant. Deployed once.',
      items: [
        {
          code: 'B1',
          name: 'Authentication (SSO)',
          desc: 'Sign-in through the company corporate account (OAuth2 / OpenID Connect), sessions and tokens for agents.',
          kind: 'infra'
        },
        {
          code: 'B2',
          name: 'Admin service',
          desc: 'Users and their agents, access provisioning, per-agent spend, activity dashboard, statistics, limit management.',
          kind: 'infra'
        },
        {
          code: 'B3',
          name: 'Employee portal',
          desc: 'A single window for the employee: available assistants, access requests, launch, feedback.',
          kind: 'infra'
        },
        {
          code: 'B4',
          name: 'Gateway and metering',
          desc: 'Routing a request to the right agent, usage and cost metrics, quotas, audit.',
          kind: 'infra'
        },
        {
          code: 'B5',
          name: 'Data masking',
          desc: 'Masking of user input and traffic normalisation — a shared layer for every assistant.',
          kind: 'infra'
        }
      ]
    },
    {
      id: 'layer-agents',
      index: '02',
      title: 'Assistant microservices',
      subtitle:
        '16 agents from the source document. Each one is a separate module on top of the base.',
      groups: [
        {
          title: 'AI help (RAG · the client is ready to build it in-house)',
          items: [
            {
              code: 'A1',
              name: 'Compliance agent',
              desc: 'Questions on event organisation and business ethics.',
              kind: 'sync'
            },
            {
              code: 'A2',
              name: 'Reviewer agent',
              desc: 'Document review against legal / promo / non-promo SOPs and advertising law.',
              kind: 'sync'
            },
            {
              code: 'A3',
              name: 'Tech support agent',
              desc: 'Questions on CRM, Veeva, InTop, Concur, IT; escalation to a human on failure.',
              kind: 'sync'
            },
            {
              code: 'A4',
              name: 'Admin agent',
              desc: 'Administrative and financial questions: office, cars, fuel, leave, expense reports.',
              kind: 'sync'
            },
            {
              code: 'A5',
              name: 'Onboarding guide agent',
              desc: 'Newcomer onboarding: knows every system, points to the right place or the right agent.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'AI training',
          items: [
            {
              code: 'A6',
              name: 'Virtual physician role-play',
              desc: 'A trainer for objection handling and an observing coach with feedback. Built outside Chatium.',
              kind: 'sync'
            },
            {
              code: 'A7',
              name: 'Compliance coach',
              desc: 'Regular micro-dosed interactions and tracking of the trend across the organisation.',
              kind: 'async'
            }
          ]
        },
        {
          title: 'AI in HR',
          items: [
            {
              code: 'A8',
              name: 'Recruiter agent',
              desc: 'CV parsing, consent checks, form dispatch, candidate database, possibly first-line phone interviews.',
              kind: 'sync'
            },
            {
              code: 'A9',
              name: 'HR admin assistant',
              desc: 'Aggregates employee data from different systems, returns a summary on an HR request.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'AI analytics',
          items: [
            {
              code: 'A10',
              name: 'Rare disease monitor',
              desc: 'Regularly scans websites and SML (Medialogia) reports for mentions of diseases and clinics, and summarises them for sales.',
              kind: 'async'
            },
            {
              code: 'A11',
              name: 'Profile curator',
              desc: 'Tracks changes in Optimacros for rare patient profiles, monitors deadlines and stages, gives recommendations.',
              kind: 'async'
            },
            {
              code: 'A12',
              name: 'BEX / SFE agent',
              desc: 'On-demand reports, bonus calculation on current data, forecast for the period.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'AI marketing',
          items: [
            {
              code: 'A13',
              name: 'Content factory',
              desc: 'Content generation (text, image, video, audio, emails, leaflets) with a workflow. KingCont plugin in Chatium.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'AI assistants',
          items: [
            {
              code: 'A14',
              name: 'Chat Ipsen',
              desc: 'LLM access for everyday work, a Copilot equivalent. Data protection via the B5 layer.',
              kind: 'sync'
            },
            {
              code: 'A15',
              name: 'PV secretary',
              desc: 'Processing of inbound contacts (email/phone), classification for pharmacovigilance, quality and medical information systems.',
              kind: 'async'
            },
            {
              code: 'A16',
              name: 'CarFleet agent',
              desc: 'Odometer photo recognition, mileage reconciliation with fuel cards, trip sheets, fine allocation.',
              kind: 'sync'
            }
          ]
        }
      ]
    },
    {
      id: 'layer-connectors',
      index: '03',
      title: 'Connectivity layer (connectors)',
      subtitle: 'A cross-cutting layer. This is where most of the project cost sits.',
      items: [
        {
          code: 'C',
          name: 'Reusable connectors',
          desc: 'CRM, Veeva, InTop, Concur, Optimacros, fuel cards, SML/Medialogia, email/telephony, LLM providers. One adapter per system, not one per agent.',
          kind: 'infra'
        }
      ],
      note: 'The scope and the availability of system APIs are the main blocker for the estimate (open questions Q-4, Q-5).'
    },
    {
      id: 'layer-bus',
      index: '04',
      title: 'Asynchronous bus',
      subtitle: 'For background assistants — separate from the synchronous gateway.',
      items: [
        {
          code: 'Q',
          name: 'Events and scheduling',
          desc: 'Background work on a schedule/event for A7, A10, A11, A15 (partly A8). Do not load everything onto one broker — these are different mechanisms.',
          kind: 'async'
        }
      ]
    }
  ],

  kpIntro:
    'Below is the working structure of the future commercial proposal. The sections are filled in as the open questions get closed. The core pricing principle is modularity: the base (broker) plus independent assistant options, each with its own fixed price.',

  kpSections: [
    {
      n: '1',
      title: 'Objective',
      blocks: [
        {
          type: 'text',
          text: 'Deploy at Ipsen a managed internal ecosystem of AI assistants on a single platform, rather than separate disconnected bots.'
        },
        {
          type: 'text',
          text: 'We take on what requires integrations and a shared access foundation. What the client builds in-house (standard reference agents, the virtual physician outside Chatium) is not part of this proposal.'
        }
      ]
    },
    {
      n: '2',
      title: 'What is included',
      blocks: [
        {
          type: 'text',
          text: 'The base is a single foundation (the “broker”). In plain terms: a shared entrance and dispatch desk for every assistant. Deployed once and works for any number of agents.'
        },
        {
          type: 'included',
          items: [
            'employee sign-in through the company corporate account (SSO);',
            'employee portal: the employee sees the available assistants and requests new ones;',
            'admin panel: who uses what, who is allowed what, how much is spent, limits;',
            'shared cost accounting and data protection (masking of what the employee types in).'
          ]
        },
        {
          type: 'text',
          text: 'Assistants and connections to working systems are added as modules on top of the base — see the “Options” section.'
        }
      ]
    },
    {
      n: '3',
      title: 'What is not included',
      blocks: [
        {
          type: 'excluded',
          items: [
            'Modifying Ipsen’s own working systems and granting access/APIs to them — on the side of the client and its vendors (we build the adapter, not the system itself).',
            'Setting up corporate sign-in (SSO) on the side of the Ipsen provider.',
            'Filling the assistants with substance: knowledge bases, SOPs, regulations.',
            'Staff training and post-delivery support, unless arranged as a separate option.',
            'Everything the client builds in-house (standard reference agents, the virtual physician outside Chatium).',
            'Assistants not included in the selected set of options (added later as separate modules).'
          ]
        }
      ]
    },
    {
      n: '4',
      title: 'Options (modular pricing)',
      blocks: [
        {
          type: 'text',
          text: 'Each assistant and each connection is a separate option with its own fixed price. The client takes the base and picks the modules it needs.'
        },
        {
          type: 'list',
          items: [
            'Reference assistants (knowledge-base driven, no integrations): compliance, reviewer, tech support, admin questions, onboarding guide, compliance coach.',
            'Assistants connected to systems (the price depends on the number of adapters): HR summary, bonus and forecast calculation (BEX/SFE), profile curator in Optimacros, recruiter, fuel reports.',
            'Observer assistants (running in the background): rare disease monitor, inbound enquiry secretary for pharma systems.',
            'Everyday AI assistant (a Copilot equivalent with data protection).',
            'Content factory (texts, images, emails) — a plugin in Chatium.'
          ]
        }
      ]
    },
    {
      n: '5',
      title: 'Cost and timeline',
      blocks: [],
      locked: true
    },
    {
      n: '6',
      title: 'What is required to start',
      blocks: [],
      locked: true
    },
    {
      n: '7',
      title: 'Handover and deployment',
      blocks: [],
      locked: true
    },
    {
      n: '8',
      title: 'Next step',
      blocks: [],
      locked: true
    }
  ],

  questionBlocks: [
    {
      letter: 'A',
      title: 'Scope and priorities',
      questions: [
        {
          id: 'q1',
          code: 'Q-1',
          text: 'Which agents do we take on in this proposal, and which does the client build in-house? (in-house: standard RAG, Chat Ipsen, the virtual physician outside Chatium — to be confirmed).',
          feeds: 'Objective · What is included · What is not included'
        },
        {
          id: 'q2',
          code: 'Q-2',
          text: 'Which assistants do we start with — what is the pilot, what is stage 2+? We need one measurable first result.',
          feeds: 'Options · Cost · Next step'
        },
        {
          id: 'q3',
          code: 'Q-3',
          text: 'What is covered by the standard functionality of Chatium agents, and what requires a custom solution and integrations?',
          feeds: 'What is included · Options'
        }
      ]
    },
    {
      letter: 'B',
      title: 'Data and integrations — the main blocker for the estimate',
      questions: [
        {
          id: 'q4',
          code: 'Q-4',
          text: 'How many data sources / systems do we actually connect, and which ones? (CRM, Veeva, InTop, Concur, Optimacros, fuel cards, SML/Medialogia, etc.)',
          feeds: 'What is included · Cost · Start'
        },
        {
          id: 'q5',
          code: 'Q-5',
          text: 'For each system: is there an API or only exports (Excel/files)? Who grants access and within what timeframe?',
          feeds: 'What is not included · Start'
        },
        {
          id: 'q7',
          code: 'Q-7',
          text: 'The candidate database for the recruiter: where does it live, is a separate tool such as a “contact calendar” needed?',
          feeds: 'What is included · What is not included'
        }
      ]
    },
    {
      letter: 'C',
      title: 'Platform and access infrastructure',
      questions: [
        {
          id: 'q9',
          code: 'Q-9',
          text: 'SSO: which provider (Azure AD / another OAuth2/OIDC)? Who configures it on the Ipsen side?',
          feeds: 'Start · Handover'
        },
        {
          id: 'q10',
          code: 'Q-10',
          text: 'Admin panel and employee portal: what is must-have for the first stage (access, spend, dashboard, limits), and what comes later?',
          feeds: 'What is included · Options'
        },
        {
          id: 'q11',
          code: 'Q-11',
          text: 'Chat Ipsen: requirements for masking user input and normalising traffic — in detail.',
          feeds: 'What is included · What is not included'
        }
      ]
    },
    {
      letter: 'D',
      title: 'Compliance, risks, pharma legal framework',
      questions: [
        {
          id: 'q14',
          code: 'Q-14',
          text: 'What does the client provide itself (access, content/knowledge base for RAG, SOPs, regulations)?',
          feeds: 'What is not included · Start'
        }
      ]
    },
    {
      letter: 'E',
      title: 'Commercials and addressee',
      questions: [
        {
          id: 'q15',
          code: 'Q-15',
          text: 'Who is the proposal addressed to — Ipsen directly or through an intermediary/agency?',
          feeds: 'Objective'
        }
      ]
    }
  ],

  ui: {
    tabKp: 'Commercial proposal',
    tabArch: 'Architecture',
    tabQuestions: 'Open questions',
    archHeading: 'Architecture: broker + microservices',
    kpHeading: 'Commercial proposal',
    questionsHeading: 'Open questions',
    answersSuffix: 'ans.',
    emptyAnswers: 'No answers yet — be the first.',
    textPlaceholder: 'Your answer to this question…',
    submit: 'Send',
    submitting: 'Sending…',
    badgeReal: 'member',
    badgeBot: 'bot',
    badgeGuest: 'guest',
    footerStrong: 'Ipsen · AI Agent Infrastructure.',
    footerRest:
      'Working material for the discovery stage. Answers to the questions are collected here and carried over into the proposal.',
    errEmptyText: 'Please enter your answer.',
    okAdded: 'Thank you! Your answer has been added.',
    errSend: 'Could not send. Please try again.',
    errNetwork: 'Network error. Please try again.',
    lockedNote: 'Will be filled in once the open questions are closed.'
  }
}

/* ═════════════════════════════  FR  ═════════════════════════════ */

const FR: SiteContent = {
  meta: {
    title: 'Infrastructure d’agents IA',
    stage: 'Discovery / pre-sale'
  },

  archIntro: [
    'Le système repose sur un courtier unique (control plane) et un ensemble de microservices-agents autonomes qui forment ensemble une seule infrastructure gérée.',
    'Chaque assistant est un module distinct avec son propre domaine, ses propres connexions aux systèmes et ses propres règles d’accès. Le courtier assure la cohésion : entrée, routage, accès, comptabilisation et protection des données.',
    'Ce découpage apporte l’isolation des pannes, le déploiement indépendant de chaque assistant, une tarification par module et la possibilité de démarrer par un pilote de 1–2 services, en ajoutant le reste progressivement.'
  ],

  archLayers: [
    {
      id: 'layer-broker',
      index: '01',
      title: 'Courtier · control plane',
      subtitle: 'Un socle commun pour tous les assistants. Déployé une seule fois.',
      items: [
        {
          code: 'B1',
          name: 'Authentification (SSO)',
          desc: 'Connexion via le compte d’entreprise (OAuth2 / OpenID Connect), sessions et jetons pour les agents.',
          kind: 'infra'
        },
        {
          code: 'B2',
          name: 'Service d’administration',
          desc: 'Utilisateurs et leurs agents, attribution des accès, dépenses par agent, tableau de bord d’activité, statistiques, gestion des quotas.',
          kind: 'infra'
        },
        {
          code: 'B3',
          name: 'Espace personnel',
          desc: 'Guichet unique pour le collaborateur : assistants disponibles, demande d’accès, lancement, retour d’expérience.',
          kind: 'infra'
        },
        {
          code: 'B4',
          name: 'Passerelle et comptabilisation',
          desc: 'Routage de la requête vers le bon agent, métriques d’usage et de coûts, quotas, audit.',
          kind: 'infra'
        },
        {
          code: 'B5',
          name: 'Masquage des données',
          desc: 'Masquage des saisies et normalisation du trafic — une couche commune à tous les assistants.',
          kind: 'infra'
        }
      ]
    },
    {
      id: 'layer-agents',
      index: '02',
      title: 'Microservices-assistants',
      subtitle:
        '16 agents issus du document source. Chacun est un module distinct au-dessus du socle.',
      groups: [
        {
          title: 'Aide IA (RAG · le client est prêt à le faire lui-même)',
          items: [
            {
              code: 'A1',
              name: 'Agent conformité',
              desc: 'Questions sur l’organisation d’événements et l’éthique des affaires.',
              kind: 'sync'
            },
            {
              code: 'A2',
              name: 'Agent réviseur',
              desc: 'Évaluation des documents selon les SOP juridiques / promo / non-promo et la législation publicitaire.',
              kind: 'sync'
            },
            {
              code: 'A3',
              name: 'Agent support technique',
              desc: 'Questions sur CRM, Veeva, InTop, Concur, IT ; escalade vers un humain en cas d’échec.',
              kind: 'sync'
            },
            {
              code: 'A4',
              name: 'Agent administratif',
              desc: 'Questions administratives et financières : bureau, véhicules, carburant, congés, notes de frais.',
              kind: 'sync'
            },
            {
              code: 'A5',
              name: 'Agent guide',
              desc: 'Intégration des nouveaux arrivants : connaît tous les systèmes, oriente vers le bon endroit ou le bon agent.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'Formation IA',
          items: [
            {
              code: 'A6',
              name: 'Médecin virtuel (jeu de rôle)',
              desc: 'Simulateur de traitement des objections et coach observateur avec retour. Réalisé hors Chatium.',
              kind: 'sync'
            },
            {
              code: 'A7',
              name: 'Coach conformité',
              desc: 'Interactions régulières à micro-doses et suivi de la dynamique dans l’organisation.',
              kind: 'async'
            }
          ]
        },
        {
          title: 'IA aux RH',
          items: [
            {
              code: 'A8',
              name: 'Agent recruteur',
              desc: 'Analyse des CV, vérification des consentements, envoi de formulaires, base de candidats, éventuellement des entretiens téléphoniques de premier niveau.',
              kind: 'sync'
            },
            {
              code: 'A9',
              name: 'Assistant admin RH',
              desc: 'Agrège les données des collaborateurs issues de différents systèmes et fournit une synthèse à la demande des RH.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'Analytique IA',
          items: [
            {
              code: 'A10',
              name: 'Veille maladies rares',
              desc: 'Analyse régulièrement les sites et les rapports SML (Medialogia) à la recherche de mentions de maladies et de cliniques, et en fait une synthèse pour les ventes.',
              kind: 'async'
            },
            {
              code: 'A11',
              name: 'Curateur de profils',
              desc: 'Suit les évolutions dans Optimacros pour les profils de patients rares, contrôle les délais et les étapes, formule des recommandations.',
              kind: 'async'
            },
            {
              code: 'A12',
              name: 'Agent BEX / SFE',
              desc: 'Rapports à la demande, calcul des primes sur les données courantes, prévision sur la période.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'Marketing IA',
          items: [
            {
              code: 'A13',
              name: 'Usine à contenu',
              desc: 'Génération de contenu (texte, image, vidéo, audio, e-mails, dépliants) avec workflow. Plugin KingCont dans Chatium.',
              kind: 'sync'
            }
          ]
        },
        {
          title: 'Assistants IA',
          items: [
            {
              code: 'A14',
              name: 'Chat Ipsen',
              desc: 'Accès aux LLM pour le travail quotidien, équivalent de Copilot. Protection des données via la couche B5.',
              kind: 'sync'
            },
            {
              code: 'A15',
              name: 'Secrétaire PV',
              desc: 'Traitement des entrants (e-mail/téléphone), classification pour les systèmes de pharmacovigilance, qualité et information médicale.',
              kind: 'async'
            },
            {
              code: 'A16',
              name: 'Agent CarFleet',
              desc: 'Reconnaissance des photos du compteur, rapprochement du kilométrage avec les cartes carburant, feuille de route, répartition des amendes.',
              kind: 'sync'
            }
          ]
        }
      ]
    },
    {
      id: 'layer-connectors',
      index: '03',
      title: 'Couche de connexion (connecteurs)',
      subtitle: 'Couche transverse. C’est là que se concentre l’essentiel du coût du projet.',
      items: [
        {
          code: 'C',
          name: 'Connecteurs réutilisables',
          desc: 'CRM, Veeva, InTop, Concur, Optimacros, cartes carburant, SML/Medialogia, e-mail/téléphonie, fournisseurs de LLM. Un adaptateur par système, et non un par agent.',
          kind: 'infra'
        }
      ],
      note: 'Le périmètre et la disponibilité des API des systèmes sont le principal point bloquant du chiffrage (questions ouvertes Q-4, Q-5).'
    },
    {
      id: 'layer-bus',
      index: '04',
      title: 'Bus asynchrone',
      subtitle: 'Pour les assistants en arrière-plan — séparé de la passerelle synchrone.',
      items: [
        {
          code: 'Q',
          name: 'Événements et planification',
          desc: 'Travail en arrière-plan par planification/événement pour A7, A10, A11, A15 (partiellement A8). Ne pas tout charger sur un seul courtier — ce sont des mécanismes différents.',
          kind: 'async'
        }
      ]
    }
  ],

  kpIntro:
    'Ci-dessous, la structure de travail de la future proposition commerciale. Les sections se remplissent au fur et à mesure que les questions ouvertes sont closes. Le principe tarifaire central est la modularité : le socle (courtier) plus des options-assistants indépendantes, chacune à prix fixe.',

  kpSections: [
    {
      n: '1',
      title: 'Objectif',
      blocks: [
        {
          type: 'text',
          text: 'Déployer chez Ipsen un écosystème interne géré d’assistants IA sur une plateforme unique, plutôt que des bots isolés et dispersés.'
        },
        {
          type: 'text',
          text: 'Nous prenons en charge ce qui exige des intégrations et un socle d’accès commun. Ce que le client réalise lui-même (agents de référence standards, médecin virtuel hors Chatium) n’entre pas dans cette proposition.'
        }
      ]
    },
    {
      n: '2',
      title: 'Ce qui est inclus',
      blocks: [
        {
          type: 'text',
          text: 'Le socle est un fondement unique (le « courtier »). En clair : une entrée et un standard communs à tous les assistants. Déployé une seule fois et valable pour un nombre quelconque d’agents.'
        },
        {
          type: 'included',
          items: [
            'connexion des collaborateurs via le compte d’entreprise (SSO) ;',
            'espace personnel : le collaborateur voit les assistants disponibles et en demande de nouveaux ;',
            'panneau d’administration : qui utilise quoi, qui a droit à quoi, combien est dépensé, quotas ;',
            'comptabilisation commune des coûts et protection des données (masquage de ce que saisit le collaborateur).'
          ]
        },
        {
          type: 'text',
          text: 'Les assistants et les connexions aux systèmes métier s’ajoutent en modules au-dessus du socle — voir la section « Options ».'
        }
      ]
    },
    {
      n: '3',
      title: 'Ce qui n’est pas inclus',
      blocks: [
        {
          type: 'excluded',
          items: [
            'La modification des systèmes métier d’Ipsen et la fourniture des accès/API à ceux-ci — du côté du client et de ses prestataires (nous réalisons l’adaptateur, pas le système lui-même).',
            'La configuration de la connexion d’entreprise (SSO) du côté du fournisseur d’Ipsen.',
            'L’alimentation des assistants en contenu : bases de connaissances, SOP, procédures.',
            'La formation du personnel et le support après livraison, sauf s’ils font l’objet d’une option distincte.',
            'Tout ce que le client réalise lui-même (agents de référence standards, médecin virtuel hors Chatium).',
            'Les assistants non retenus dans le jeu d’options choisi (ajoutés ultérieurement comme modules distincts).'
          ]
        }
      ]
    },
    {
      n: '4',
      title: 'Options (tarification modulaire)',
      blocks: [
        {
          type: 'text',
          text: 'Chaque assistant et chaque connexion constitue une option distincte à prix fixe. Le client prend le socle et sélectionne les modules nécessaires.'
        },
        {
          type: 'list',
          items: [
            'Assistants de référence (basés sur une base de connaissances, sans intégrations) : conformité, réviseur, support technique, questions administratives, guide d’intégration, coach conformité.',
            'Assistants connectés aux systèmes (le prix dépend du nombre d’adaptateurs) : synthèse RH, calcul des primes et prévisions (BEX/SFE), curateur de profils dans Optimacros, recruteur, rapports carburant.',
            'Assistants observateurs (fonctionnant en arrière-plan) : veille maladies rares, secrétaire des demandes entrantes pour les systèmes pharma.',
            'Assistant IA du quotidien (équivalent de Copilot avec protection des données).',
            'Usine à contenu (textes, images, e-mails) — plugin dans Chatium.'
          ]
        }
      ]
    },
    {
      n: '5',
      title: 'Coût et délais',
      blocks: [],
      locked: true
    },
    {
      n: '6',
      title: 'Ce qu’il faut pour démarrer',
      blocks: [],
      locked: true
    },
    {
      n: '7',
      title: 'Transfert et déploiement',
      blocks: [],
      locked: true
    },
    {
      n: '8',
      title: 'Prochaine étape',
      blocks: [],
      locked: true
    }
  ],

  questionBlocks: [
    {
      letter: 'A',
      title: 'Périmètre et priorités',
      questions: [
        {
          id: 'q1',
          code: 'Q-1',
          text: 'Quels agents prenons-nous en charge dans cette proposition, et lesquels le client réalise-t-il lui-même ? (en interne : RAG standards, Chat Ipsen, médecin virtuel hors Chatium — à confirmer).',
          feeds: 'Objectif · Ce qui est inclus · Ce qui n’est pas inclus'
        },
        {
          id: 'q2',
          code: 'Q-2',
          text: 'Par quels assistants commençons-nous — qu’est-ce qui relève du pilote, qu’est-ce qui relève de l’étape 2+ ? Il faut un premier résultat mesurable.',
          feeds: 'Options · Coût · Prochaine étape'
        },
        {
          id: 'q3',
          code: 'Q-3',
          text: 'Qu’est-ce qui est couvert par les fonctionnalités standards des agents Chatium, et qu’est-ce qui exige une solution sur mesure et des intégrations ?',
          feeds: 'Ce qui est inclus · Options'
        }
      ]
    },
    {
      letter: 'B',
      title: 'Données et intégrations — principal point bloquant du chiffrage',
      questions: [
        {
          id: 'q4',
          code: 'Q-4',
          text: 'Combien de sources de données / systèmes connectons-nous réellement, et lesquels ? (CRM, Veeva, InTop, Concur, Optimacros, cartes carburant, SML/Medialogia, etc.)',
          feeds: 'Ce qui est inclus · Coût · Démarrage'
        },
        {
          id: 'q5',
          code: 'Q-5',
          text: 'Pour chaque système : existe-t-il une API ou seulement des exports (Excel/fichiers) ? Qui accorde l’accès et dans quels délais ?',
          feeds: 'Ce qui n’est pas inclus · Démarrage'
        },
        {
          id: 'q7',
          code: 'Q-7',
          text: 'La base de candidats pour le recruteur : où réside-t-elle, faut-il un outil distinct de type « calendrier de contacts » ?',
          feeds: 'Ce qui est inclus · Ce qui n’est pas inclus'
        }
      ]
    },
    {
      letter: 'C',
      title: 'Plateforme et infrastructure d’accès',
      questions: [
        {
          id: 'q9',
          code: 'Q-9',
          text: 'SSO : quel fournisseur (Azure AD / autre OAuth2/OIDC) ? Qui le configure du côté d’Ipsen ?',
          feeds: 'Démarrage · Transfert'
        },
        {
          id: 'q10',
          code: 'Q-10',
          text: 'Panneau d’administration et espace personnel : qu’est-ce qui est indispensable pour la première étape (accès, dépenses, tableau de bord, quotas), et qu’est-ce qui viendra plus tard ?',
          feeds: 'Ce qui est inclus · Options'
        },
        {
          id: 'q11',
          code: 'Q-11',
          text: 'Chat Ipsen : exigences de masquage des saisies et de normalisation du trafic — en détail.',
          feeds: 'Ce qui est inclus · Ce qui n’est pas inclus'
        }
      ]
    },
    {
      letter: 'D',
      title: 'Conformité, risques, cadre juridique pharma',
      questions: [
        {
          id: 'q14',
          code: 'Q-14',
          text: 'Que fournit le client lui-même (accès, contenu/base de connaissances pour le RAG, SOP, procédures) ?',
          feeds: 'Ce qui n’est pas inclus · Démarrage'
        }
      ]
    },
    {
      letter: 'E',
      title: 'Aspects commerciaux et destinataire',
      questions: [
        {
          id: 'q15',
          code: 'Q-15',
          text: 'À qui la proposition est-elle adressée — directement à Ipsen ou via un intermédiaire/une agence ?',
          feeds: 'Objectif'
        }
      ]
    }
  ],

  ui: {
    tabKp: 'Proposition commerciale',
    tabArch: 'Architecture',
    tabQuestions: 'Questions ouvertes',
    archHeading: 'Architecture : courtier + microservices',
    kpHeading: 'Proposition commerciale',
    questionsHeading: 'Questions ouvertes',
    answersSuffix: 'rép.',
    emptyAnswers: 'Pas encore de réponses — soyez le premier.',
    textPlaceholder: 'Votre réponse à cette question…',
    submit: 'Envoyer',
    submitting: 'Envoi…',
    badgeReal: 'membre',
    badgeBot: 'bot',
    badgeGuest: 'invité',
    footerStrong: 'Ipsen · Infrastructure d’agents IA.',
    footerRest:
      'Matériel de travail de la phase discovery. Les réponses aux questions sont collectées ici et reportées dans la proposition.',
    errEmptyText: 'Saisissez le texte de votre réponse.',
    okAdded: 'Merci ! Votre réponse a été ajoutée.',
    errSend: 'Échec de l’envoi. Veuillez réessayer.',
    errNetwork: 'Erreur réseau. Veuillez réessayer.',
    lockedNote: 'Sera complété une fois les questions ouvertes résolues.'
  }
}

/* ═══════════════════════════════════════════════════════════════ */

export const CONTENT: Record<Lang, SiteContent> = { ru: RU, en: EN, fr: FR }

/** Приводит произвольный код языка (ctx.lang, 'en-US') к поддерживаемому. */
export function resolveLang(raw: unknown): Lang {
  const code = String(raw ?? '')
    .slice(0, 2)
    .toLowerCase()
  return (LANGS as string[]).includes(code) ? (code as Lang) : 'ru'
}

/**
 * Плоский список id всех вопросов — для загрузки ответов на сервере и валидации.
 * Языконезависим: id сквозные, за эталон взят русский набор.
 */
export const ALL_QUESTION_IDS: string[] = CONTENT.ru.questionBlocks.flatMap((b) =>
  b.questions.map((q) => q.id)
)

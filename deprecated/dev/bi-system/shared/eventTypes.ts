// @shared

export interface EventDefinition {
  name: string
  type: 'traffic' | 'getcourse' | 'workspace' | 'custom'
  description: string
  urlPath?: string
  urlPattern?: string // Для фильтрации по паттерну (например, 'event://getcourse/%')
  fields?: EventField[]
  example?: Record<string, any>
}

export interface EventField {
  name: string
  type: string
  description: string
  required?: boolean
  example?: any
}

export const TRAFFIC_EVENTS: EventDefinition[] = [
  {
    name: 'pageview',
    type: 'traffic',
    description: 'Просмотр страницы',
    fields: [
      { name: 'url', type: 'string', description: 'URL просмотренной страницы', required: true },
      { name: 'title', type: 'string', description: 'Заголовок страницы' },
      { name: 'referrer', type: 'string', description: 'Источник перехода' },
      { name: 'userAgent', type: 'string', description: 'User agent браузера' },
      { name: 'timestamp', type: 'datetime', description: 'Время события', required: true }
    ],
    example: {
      url: 'https://example.com/page',
      title: 'Страница продукта',
      referrer: 'https://google.com',
      userAgent: 'Mozilla/5.0...',
      timestamp: '2025-01-01T12:00:00Z'
    }
  },
  {
    name: 'button_click',
    type: 'traffic',
    description: 'Клик по кнопке',
    fields: [
      { name: 'buttonId', type: 'string', description: 'ID кнопки', required: true },
      { name: 'buttonText', type: 'string', description: 'Текст кнопки' },
      { name: 'pageUrl', type: 'string', description: 'URL страницы с кнопкой' },
      { name: 'timestamp', type: 'datetime', description: 'Время события', required: true }
    ],
    example: {
      buttonId: 'submit_btn',
      buttonText: 'Отправить',
      pageUrl: 'https://example.com/contact',
      timestamp: '2025-01-01T12:00:00Z'
    }
  },
  {
    name: 'link_click',
    type: 'traffic',
    description: 'Клик по ссылке',
    fields: [
      { name: 'linkUrl', type: 'string', description: 'URL ссылки', required: true },
      { name: 'linkText', type: 'string', description: 'Текст ссылки' },
      { name: 'pageUrl', type: 'string', description: 'URL страницы со ссылкой' },
      { name: 'timestamp', type: 'datetime', description: 'Время события', required: true }
    ],
    example: {
      linkUrl: 'https://example.com/product',
      linkText: 'Продукт',
      pageUrl: 'https://example.com/catalog',
      timestamp: '2025-01-01T12:00:00Z'
    }
  },
  {
    name: 'scroll',
    type: 'traffic',
    description: 'Прокрутка страницы',
    fields: [
      { name: 'scrollDepth', type: 'number', description: 'Глубина прокрутки (%)', required: true },
      { name: 'pageUrl', type: 'string', description: 'URL страницы' },
      { name: 'pageHeight', type: 'number', description: 'Высота страницы (px)' },
      { name: 'timestamp', type: 'datetime', description: 'Время события', required: true }
    ],
    example: {
      scrollDepth: 75,
      pageUrl: 'https://example.com/article',
      pageHeight: 2000,
      timestamp: '2025-01-01T12:00:00Z'
    }
  },
  {
    name: 'form_submit',
    type: 'traffic',
    description: 'Отправка формы',
    fields: [
      { name: 'formId', type: 'string', description: 'ID формы', required: true },
      { name: 'formName', type: 'string', description: 'Название формы' },
      { name: 'fields', type: 'object', description: 'Поля формы', required: true },
      { name: 'timestamp', type: 'datetime', description: 'Время события', required: true }
    ],
    example: {
      formId: 'contact_form',
      formName: 'Форма обратной связи',
      fields: {
        name: 'John Doe',
        email: 'john@example.com',
        message: 'Hello world'
      },
      timestamp: '2025-01-01T12:00:00Z'
    }
  },
  {
    name: 'video_play',
    type: 'traffic',
    description: 'Воспроизведение видео',
    fields: [
      { name: 'videoId', type: 'string', description: 'ID видео', required: true },
      { name: 'videoTitle', type: 'string', description: 'Название видео' },
      { name: 'duration', type: 'number', description: 'Длительность видео (сек)' },
      { name: 'pageUrl', type: 'string', description: 'URL страницы с видео' },
      { name: 'timestamp', type: 'datetime', description: 'Время события', required: true }
    ],
    example: {
      videoId: 'video_123',
      videoTitle: 'Обучение продукту',
      duration: 300,
      pageUrl: 'https://example.com/video',
      timestamp: '2025-01-01T12:00:00Z'
    }
  },
  {
    name: 'video_pause',
    type: 'traffic',
    description: 'Пауза видео',
    fields: [
      { name: 'videoId', type: 'string', description: 'ID видео', required: true },
      { name: 'currentTime', type: 'number', description: 'Текущее время (сек)' },
      { name: 'pageUrl', type: 'string', description: 'URL страницы с видео' },
      { name: 'timestamp', type: 'datetime', description: 'Время события', required: true }
    ],
    example: {
      videoId: 'video_123',
      currentTime: 150,
      pageUrl: 'https://example.com/video',
      timestamp: '2025-01-01T12:00:00Z'
    }
  },
  {
    name: 'video_complete',
    type: 'traffic',
    description: 'Просмотр видео до конца',
    fields: [
      { name: 'videoId', type: 'string', description: 'ID видео', required: true },
      { name: 'totalTime', type: 'number', description: 'Общее время просмотра (сек)' },
      { name: 'pageUrl', type: 'string', description: 'URL страницы с видео' },
      { name: 'timestamp', type: 'datetime', description: 'Время события', required: true }
    ],
    example: {
      videoId: 'video_123',
      totalTime: 300,
      pageUrl: 'https://example.com/video',
      timestamp: '2025-01-01T12:00:00Z'
    }
  }
]

// События GetCourse - полный список из https://getcourse.chatium.com/docs/events
export const GETCOURSE_EVENTS: EventDefinition[] = [
  // Заказы (Deals)
  {
    name: 'dealCreated',
    type: 'getcourse',
    description: 'Создан заказ',
    urlPath: 'event://getcourse/dealCreated'
  },
  {
    name: 'dealPaid',
    type: 'getcourse',
    description: 'Заказ оплачен',
    urlPath: 'event://getcourse/dealPaid'
  },
  {
    name: 'dealStatusChanged',
    type: 'getcourse',
    description: 'Изменен статус заказа',
    urlPath: 'event://getcourse/dealStatusChanged'
  },
  {
    name: 'dealPaymentAccepted',
    type: 'getcourse',
    description: 'Принят платеж по заказу',
    urlPath: 'event://getcourse/dealPaymentAccepted'
  },
  {
    name: 'dealMoneyValuesChanged',
    type: 'getcourse',
    description: 'Изменилась сумма заказа',
    urlPath: 'event://getcourse/dealMoneyValuesChanged'
  },
  {
    name: 'dealTagsChanged',
    type: 'getcourse',
    description: 'Изменены теги заказа',
    urlPath: 'event://getcourse/dealTagsChanged'
  },

  // Пользователи (Users)
  {
    name: 'user/created',
    type: 'getcourse',
    description: 'Пользователь зарегистрировался',
    urlPath: 'event://getcourse/user/created'
  },
  {
    name: 'user/group_added',
    type: 'getcourse',
    description: 'Пользователь добавлен в группу',
    urlPath: 'event://getcourse/user/group_added'
  },
  {
    name: 'user/group_removed',
    type: 'getcourse',
    description: 'Пользователь удален из группы',
    urlPath: 'event://getcourse/user/group_removed'
  },
  {
    name: 'user/banned',
    type: 'getcourse',
    description: 'Пользователь забанен',
    urlPath: 'event://getcourse/user/banned'
  },
  {
    name: 'user/unbanned',
    type: 'getcourse',
    description: 'Пользователя вернули из бана',
    urlPath: 'event://getcourse/user/unbanned'
  },
  {
    name: 'user/commented',
    type: 'getcourse',
    description: 'Оставили комментарий к профилю ученика',
    urlPath: 'event://getcourse/user/commented'
  },
  {
    name: 'user/session_link',
    type: 'getcourse',
    description: 'Сессия связана с юзером',
    urlPath: 'event://getcourse/user/session_link'
  },

  // Чат-боты
  {
    name: 'user/chatbot/telegram_enabled',
    type: 'getcourse',
    description: 'Привязал Telegram к профилю',
    urlPath: 'event://getcourse/user/chatbot/telegram_enabled'
  },
  {
    name: 'user/chatbot/telegram_disabled',
    type: 'getcourse',
    description: 'Отвязал Telegram от профиля',
    urlPath: 'event://getcourse/user/chatbot/telegram_disabled'
  },
  {
    name: 'user/chatbot/vk_enabled',
    type: 'getcourse',
    description: 'Привязал ВКонтакте к профилю',
    urlPath: 'event://getcourse/user/chatbot/vk_enabled'
  },
  {
    name: 'user/chatbot/vk_disabled',
    type: 'getcourse',
    description: 'Отвязал ВКонтакте от профиля',
    urlPath: 'event://getcourse/user/chatbot/vk_disabled'
  },

  // Обучение (Teaching)
  {
    name: 'teach/lesson/action',
    type: 'getcourse',
    description: 'Действие с уроком (открыл, прошел, ответил)',
    urlPath: 'event://getcourse/teach/lesson/action'
  },
  {
    name: 'teach/lesson/answerCreated',
    type: 'getcourse',
    description: 'Ответил на урок тренинга',
    urlPath: 'event://getcourse/teach/lesson/answerCreated'
  },
  {
    name: 'teach/lesson/answerUpdated',
    type: 'getcourse',
    description: 'Изменен статус ответа на урок',
    urlPath: 'event://getcourse/teach/lesson/answerUpdated'
  },
  {
    name: 'teach/trainingStarted',
    type: 'getcourse',
    description: 'Стартовал прохождение тренинга',
    urlPath: 'event://getcourse/teach/trainingStarted'
  },
  {
    name: 'teach/trainingFinished',
    type: 'getcourse',
    description: 'Завершил тренинг',
    urlPath: 'event://getcourse/teach/trainingFinished'
  },

  // Сообщения (Messages)
  {
    name: 'message/sent',
    type: 'getcourse',
    description: 'Сообщение отправлено',
    urlPath: 'event://getcourse/message/sent'
  },
  {
    name: 'message/viewed',
    type: 'getcourse',
    description: 'Просмотрел сообщение',
    urlPath: 'event://getcourse/message/viewed'
  },
  {
    name: 'message/clicked',
    type: 'getcourse',
    description: 'Клик на ссылке в сообщении',
    urlPath: 'event://getcourse/message/clicked'
  },
  {
    name: 'message/unsubscribed',
    type: 'getcourse',
    description: 'Отписался от рассылки',
    urlPath: 'event://getcourse/message/unsubscribed'
  },

  // Формы и анкеты
  {
    name: 'form/sent',
    type: 'getcourse',
    description: 'Отправлена форма',
    urlPath: 'event://getcourse/form/sent'
  },
  {
    name: 'survey/answerCreated',
    type: 'getcourse',
    description: 'Добавлен ответ на анкету',
    urlPath: 'event://getcourse/survey/answerCreated'
  },

  // Обращения (Conversations)
  {
    name: 'conversation/addedMessage',
    type: 'getcourse',
    description: 'Добавлено сообщение к обращению',
    urlPath: 'event://getcourse/conversation/addedMessage'
  },
  {
    name: 'conversation/responsibilityCreated',
    type: 'getcourse',
    description: 'Назначен ответственный или дедлайн по обращению',
    urlPath: 'event://getcourse/conversation/responsibilityCreated'
  },
  {
    name: 'conversation/responsibilityUpdated',
    type: 'getcourse',
    description: 'Обновлен ответственный или дедлайн по обращению',
    urlPath: 'event://getcourse/conversation/responsibilityUpdated'
  },

  // Контакты и звонки
  {
    name: 'contact/created',
    type: 'getcourse',
    description: 'Создана запись звонка или иного контакта',
    urlPath: 'event://getcourse/contact/created'
  },
  {
    name: 'contact/call_file_added',
    type: 'getcourse',
    description: 'Добавлен файл звонка',
    urlPath: 'event://getcourse/contact/call_file_added'
  },

  // ВКонтакте
  {
    name: 'vk/visitSuccess',
    type: 'getcourse',
    description: 'Успешный визит ВКонтакте',
    urlPath: 'event://getcourse/vk/visitSuccess'
  }
]

// Категории событий по паттернам (для гибкости, т.к. события могут добавляться)
export const EVENT_CATEGORIES: EventDefinition[] = [
  {
    name: 'all_getcourse',
    type: 'getcourse',
    description: 'ВСЕ события GetCourse (любые event://getcourse/*)',
    urlPattern: 'event://getcourse/%'
  },
  {
    name: 'refunnels_all',
    type: 'custom',
    description: 'ВСЕ события ReFunnels (event://refunnels/*)',
    urlPattern: 'event://refunnels/%'
  },
  {
    name: 'workspace_all',
    type: 'workspace',
    description: 'ВСЕ события приложения (event://workspace/*)',
    urlPattern: 'event://workspace/%'
  },
  {
    name: 'custom_all',
    type: 'custom',
    description: 'ВСЕ пользовательские события (event://custom/*)',
    urlPattern: 'event://custom/%'
  },
  {
    name: 'all_event_protocol',
    type: 'custom',
    description: 'ВСЕ события с протоколом event:// (любые)',
    urlPattern: 'event://%'
  }
]

export function getAllEvents(): EventDefinition[] {
  return [...TRAFFIC_EVENTS, ...GETCOURSE_EVENTS, ...EVENT_CATEGORIES]
}

export function getTrafficEvents(): EventDefinition[] {
  return TRAFFIC_EVENTS
}

export function getGetCourseEvents(): EventDefinition[] {
  return GETCOURSE_EVENTS
}

export function getEventCategories(): EventDefinition[] {
  return EVENT_CATEGORIES
}

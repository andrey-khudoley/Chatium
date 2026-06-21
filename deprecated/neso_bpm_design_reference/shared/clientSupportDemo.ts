// @shared
import type { BpmLocale } from './bpmI18n'

export interface ClientThread {
  id: string
  clientName: string
  managerName: string
  preview: string
  time: string
  unread: number
  mine: boolean
  channel: string
  status: 'new' | 'active' | 'waiting'
}

export type ClientMessageEntry =
  | {
      id: string
      type: 'divider'
      label: string
    }
  | {
      id: string
      type: 'message'
      direction: 'in' | 'out'
      author: string
      text: string
      time: string
      avatar?: string
    }

export interface ClientProfile {
  id: string
  name: string
  externalId: string
  phone: string
  email: string
  owner: string
  dealStatus: string
  tags: string[]
  lists: string[]
  variables: Array<{ key: string; value: string }>
}

export interface ClientSupportDemo {
  threads: ClientThread[]
  messages: Record<string, ClientMessageEntry[]>
  profiles: Record<string, ClientProfile>
}

const THREADS_RU: ClientThread[] = [
  {
    id: 'thread-natalia',
    clientName: 'Наталья Алиева',
    managerName: 'Лидия Бельская',
    preview: 'Здравствуйте, Наталья. Благодарю Вас за уточнение, передаю информацию техподдержке.',
    time: '10:36',
    unread: 0,
    mine: true,
    channel: 'Telegram',
    status: 'active'
  },
  {
    id: 'thread-khomenko',
    clientName: 'Хоменко Светлана',
    managerName: 'Анна Гремблок',
    preview: 'По Вашему запросу отправила ссылку на новый кабинет, проверьте вход.',
    time: '20:58',
    unread: 2,
    mine: false,
    channel: 'Telegram',
    status: 'waiting'
  },
  {
    id: 'thread-smirnova',
    clientName: 'Смирнова Екатерина',
    managerName: 'Лидия Бельская',
    preview: 'Приятного Вам просмотра, Екатерина!',
    time: '14:09',
    unread: 1,
    mine: false,
    channel: 'Telegram',
    status: 'new'
  },
  {
    id: 'thread-abramova',
    clientName: 'Абрамова Алёна',
    managerName: 'Анна Рощина',
    preview: 'Напишу в техподдержку о Вашей ситуации и вернусь с ответом.',
    time: '12:45',
    unread: 0,
    mine: false,
    channel: 'Telegram',
    status: 'active'
  },
  {
    id: 'thread-knyaz',
    clientName: 'Князь Надежда',
    managerName: 'Анна Рощина',
    preview: 'Благодарим Вас за оплату, проверка уже запущена.',
    time: '19:45',
    unread: 3,
    mine: true,
    channel: 'Telegram',
    status: 'waiting'
  },
  {
    id: 'thread-daria',
    clientName: 'Дашенька',
    managerName: 'Система',
    preview: 'client_unsubscribed',
    time: '19:40',
    unread: 0,
    mine: false,
    channel: 'Telegram',
    status: 'new'
  }
]

const MESSAGES_RU: Record<string, ClientMessageEntry[]> = {
  'thread-natalia': [
    {
      id: 'd-1',
      type: 'divider',
      label: '14.01.26'
    },
    {
      id: 'm-1',
      type: 'message',
      direction: 'out',
      author: 'Лидия Бельская',
      text: 'Если в 2024–2025 Вы приобретали новые продукты, в новом ЛК часть записей может отсутствовать. Это ожидаемое поведение миграции.',
      time: '11:13'
    },
    {
      id: 'm-2',
      type: 'message',
      direction: 'in',
      author: 'Наталья Алиева',
      text: 'А предыдущая информация уже не будет доступна?',
      time: '11:14',
      avatar: 'НА'
    },
    {
      id: 'm-3',
      type: 'message',
      direction: 'out',
      author: 'Лидия Бельская',
      text: 'Можно попробовать вход по старой ссылке lk.nesoakademie.ru/wpm/start. В правом верхнем углу нажмите «Вход» и используйте Ваш email.',
      time: '11:15'
    },
    {
      id: 'm-4',
      type: 'message',
      direction: 'in',
      author: 'Наталья Алиева',
      text: 'Хорошо, сейчас попробую.',
      time: '11:16',
      avatar: 'НА'
    },
    {
      id: 'd-2',
      type: 'divider',
      label: '15.01.26'
    },
    {
      id: 'm-5',
      type: 'message',
      direction: 'in',
      author: 'Наталья Алиева',
      text: 'Здравствуйте. Это самый первый личный кабинет. После переезда в новый ЛК он оказался пустой.',
      time: '22:39',
      avatar: 'НА'
    },
    {
      id: 'm-6',
      type: 'message',
      direction: 'out',
      author: 'Лидия Бельская',
      text: 'На связи Лидия. Благодарю за уточнение, передала информацию в группу техподдержки для проверки. Вернусь с результатом.',
      time: '10:36'
    }
  ],
  'thread-khomenko': [
    {
      id: 'k-1',
      type: 'divider',
      label: '07.02.26'
    },
    {
      id: 'k-2',
      type: 'message',
      direction: 'out',
      author: 'Анна Гремблок',
      text: 'Светлана, отправила ссылку для входа в обновлённый кабинет. Подтвердите, пожалуйста, после авторизации.',
      time: '20:58'
    }
  ],
  'thread-smirnova': [
    {
      id: 's-1',
      type: 'divider',
      label: '06.02.26'
    },
    {
      id: 's-2',
      type: 'message',
      direction: 'out',
      author: 'Лидия Бельская',
      text: 'Екатерина, приятного Вам просмотра. Если потребуется помощь с доступом, напишите в этот диалог.',
      time: '14:09'
    }
  ],
  'thread-abramova': [
    {
      id: 'a-1',
      type: 'divider',
      label: '31.01.26'
    },
    {
      id: 'a-2',
      type: 'message',
      direction: 'out',
      author: 'Анна Рощина',
      text: 'Алёна, на связи админ Анна. Уже передала запрос в техподдержку, как только будет ответ — сообщу здесь.',
      time: '12:45'
    }
  ],
  'thread-knyaz': [
    {
      id: 'n-1',
      type: 'divider',
      label: 'Сегодня'
    },
    {
      id: 'n-2',
      type: 'message',
      direction: 'out',
      author: 'Анна Рощина',
      text: 'Надежда, благодарим за оплату. Сигнал верификации передан в процессинг.',
      time: '19:45'
    }
  ],
  'thread-daria': [
    {
      id: 'daria-1',
      type: 'divider',
      label: 'Сегодня'
    },
    {
      id: 'daria-2',
      type: 'message',
      direction: 'out',
      author: 'Система',
      text: 'Клиент отключил подписку от рассылки.',
      time: '19:40'
    }
  ]
}

const PROFILES_RU: Record<string, ClientProfile> = {
  'thread-natalia': {
    id: 'thread-natalia',
    name: 'Наталья Алиева',
    externalId: '869052963',
    phone: 'Добавить телефон',
    email: 'alievanatali@mail.ru',
    owner: 'Не указан',
    dealStatus: 'Состояние сделки не выбрано',
    tags: ['email_confirmed', 'manual_support'],
    lists: ['Связали email', 'Повторная верификация'],
    variables: [
      { key: 'source', value: 'Telegram' },
      { key: 'last_contact', value: '15.01.26 10:36' },
      { key: 'response_sla', value: '00:24:00' }
    ]
  },
  'thread-khomenko': {
    id: 'thread-khomenko',
    name: 'Хоменко Светлана',
    externalId: '210488101',
    phone: '+7 999 222-11-23',
    email: 'sveta.khomenko@mail.ru',
    owner: 'Анна Гремблок',
    dealStatus: 'Ожидаем подтверждение доступа',
    tags: ['new_cabinet', 'need_followup'],
    lists: ['Миграция ЛК'],
    variables: [
      { key: 'source', value: 'Telegram' },
      { key: 'last_contact', value: '07.02.26 20:58' },
      { key: 'response_sla', value: '00:38:00' }
    ]
  }
}

export function getClientSupportDemo(locale: BpmLocale): ClientSupportDemo {
  if (locale === 'en') {
    return {
      threads: THREADS_RU,
      messages: MESSAGES_RU,
      profiles: PROFILES_RU
    }
  }

  return {
    threads: THREADS_RU,
    messages: MESSAGES_RU,
    profiles: PROFILES_RU
  }
}

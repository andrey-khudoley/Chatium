# Подписка на события GetCourse в Chatium

**⚠️ КРИТИЧЕСКИ ВАЖНО: Эта механика доступна ТОЛЬКО в CHATIUM на стороне GETCOURSE.**

**⚠️ ЭТА ИНСТРУКЦИЯ НЕ ДОЛЖНА ИСПОЛЬЗОВАТЬСЯ БЕЗ ЯВНОЙ ССЫЛКИ НА НЕЁ С УКАЗАНИЕМ, ЧТО ЕЁ НАДО ПРИМЕНИТЬ.**

Исчерпывающее руководство по подписке на realtime-события GetCourse в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Введение](#введение)
- [Архитектура событий](#архитектура-событий)
- [Два уровня работы с событиями](#два-уровня-работы-с-событиями)
  - [Низкоуровневый стрим metric-событий](#низкоуровневый-стрим-metric-событий)
  - [Высокоуровневые хуки по конкретным событиям](#высокоуровневые-хуки-по-конкретным-событиям)
- [Типы хуков и когда что использовать](#типы-хуков-и-когда-что-использовать)
  - [app.pluginHook](#apppluginhook)
  - [app.accountHook](#appaccounthook)
  - [Спец-хук metric-event](#спец-хук-metric-event)
- [Подписка на metric-события](#подписка-на-metric-события)
  - [Разовая инициализация](#разовая-инициализация)
  - [Поведение по умолчанию](#поведение-по-умолчанию)
  - [Отписка от событий](#отписка-от-событий)
- [Прямые событийные хуки](#прямые-событийные-хуки)
  - [Ответы на уроки](#ответы-на-уроки)
  - [Входящие сообщения в диалогах поддержки](#входящие-сообщения-в-диалогах-поддержки)
  - [Контакты, сделки и оплаты](#контакты-сделки-и-оплаты)
  - [Подключение чат-ботов](#подключение-чат-ботов)
  - [Анкеты и формы](#анкеты-и-формы)
  - [Вебинары](#вебинары)
  - [Изменение баланса пользователя](#изменение-баланса-пользователя)
- [transformGcEventParams: нормализация события](#transformgceventparams-нормализация-события)
- [Разница между event:// и metric-event-event://](#разница-между-event-и-metric-event-event)
- [Частые вопросы и типичные грабли](#частые-вопросы-и-типичные-грабли)
- [Рекомендуемый паттерн интеграции](#рекомендуемый-паттерн-интеграции)
- [Практические примеры](#практические-примеры)

---

## Введение

**Подписка на события GetCourse в Chatium** — система для получения realtime-уведомлений о событиях, происходящих в GetCourse (ответы на уроки, входящие сообщения, создание сделок, оплаты и т.д.).

### Ключевые особенности

- 🔔 **Realtime события** — мгновенные уведомления о событиях GetCourse
- 📡 **Два уровня подписки** — низкоуровневый стрим и высокоуровневые хуки
- 🎯 **Типизированные события** — нормализация через `transformGcEventParams`
- 🔌 **Интеграция с внешними системами** — удобная маршрутизация событий

### Когда использовать

- ✅ Обработка ответов на уроки в реальном времени
- ✅ Мониторинг входящих сообщений в диалогах поддержки
- ✅ Отслеживание создания и изменения сделок
- ✅ Синхронизация с внешними системами (CRM, LMS)
- ✅ Автоматизация на основе событий GetCourse
- ❌ **НЕ** используйте для событий, которые не поддерживаются (см. список ниже)

---

## Архитектура событий

В связке GetCourse ↔ Chatium есть два слоя работы с событиями:

1. **Низкоуровневый стрим metric-событий** — общий поток всех подписанных событий
2. **Высокоуровневые хуки** — обработчики конкретных типов событий

---

## Два уровня работы с событиями

### Низкоуровневый стрим metric-событий

На стороне Chatium есть «метрические» события, на которые можно **явно подписаться** через `subscribeToMetricEvents` из модуля `@app/metric`.

После подписки все выбранные события летят в единый хук:

```ts
app.accountHook('metric-event', async (ctx, { event }) => {
  ctx.console.log('metric-event account', event)
})
```

**Важно:** В этот хук приходят **только** те события, на которые есть активная подписка через `subscribeToMetricEvents`.

### Высокоуровневые хуки по конкретным событиям

Можно вешать хендлеры напрямую на конкретные GetCourse-события вида `metric-event-event://getcourse/...`:

```ts
app.pluginHook('metric-event-event://getcourse/teach/lesson/answerCreated', async (ctx, params) => {
  const event = transformGcEventParams(ctx, params.event)
  // твоя логика
})
```

Аналогично, чтобы ловить те же события в коде аккаунта (без плагина), используется:

```ts
app.accountHook('metric-event-event://getcourse/teach/lesson/answerCreated', ...)
```

**Рекомендация:** Если нужно подписываться не из плагина, а из кода аккаунта, используйте `app.accountHook` вместо `app.pluginHook`.

---

## Типы хуков и когда что использовать

### app.pluginHook

Используется в коде **плагина** GetCourse Store:

```ts
import { transformGcEventParams } from '@getcourse/sdk'

/**
 * Обработчик создания ответа на урок внутри плагина.
 */
app.pluginHook('metric-event-event://getcourse/teach/lesson/answerCreated', async (ctx, params) => {
  const event = transformGcEventParams(ctx, params.event)
  // твоя логика
})
```

Это хук уровня «инстанс плагина в конкретном аккаунте GetCourse».

### app.accountHook

Код в самом аккаунте Chatium (не в плагине Store):

```ts
/**
 * То же самое событие, но подписка из кода аккаунта,
 * а не из плагина.
 */
app.accountHook(
  'metric-event-event://getcourse/teach/lesson/answerCreated',
  async (ctx, params) => {
    const event = transformGcEventParams(ctx, params.event)
    // логика аккаунта
  }
)
```

**Рекомендация:** Для кода аккаунта использовать именно `app.accountHook`.

### Спец-хук metric-event

Это отдельная история: после вызова `subscribeToMetricEvents` **все подписанные metric-события** сваливаются сюда:

```ts
import { subscribeToMetricEvents, unsubscribeFromMetricEvents } from '@app/metric'

/**
 * Разовая инициализация подписки.
 */
app.post('enable-subscription', async (ctx) => {
  await subscribeToMetricEvents(ctx, ['event://getcourse/user/chatbot/vk_enabled'])
})

/**
 * Отписка.
 */
app.post('disable-subscription', async (ctx) => {
  await unsubscribeFromMetricEvents(ctx, 'event://getcourse/user/chatbot/vk_enabled')
})

/**
 * Сюда прилетает всё, на что оформлена подписка через subscribeToMetricEvents.
 */
app.accountHook('metric-event', async (ctx, { event }) => {
  ctx.console.log('metric-event account', event)
})
```

**Важно:** В этот хук будут приходить все события, **на которые есть активная подписка** через `subscribeToMetricEvents`, а не весь эфир GetCourse.

---

## Подписка на metric-события

### Разовая инициализация

Типовой паттерн:

```ts
import { subscribeToMetricEvents, unsubscribeFromMetricEvents } from '@app/metric'

/**
 * Сервис работы с подписками на metric events.
 */
class GcMetricSubscriptionService {
  /**
   * Включить подписку на нужные события.
   * Вызывается один раз (например, из административного эндпоинта).
   */
  public static async enable(ctx: Ctx): Promise<void> {
    await subscribeToMetricEvents(ctx, [
      'event://getcourse/form/sent',
      'event://getcourse/survey/answerCreated'
    ])
  }

  /**
   * Отключить подписку (если нужно).
   */
  public static async disable(ctx: Ctx, eventType: string): Promise<void> {
    await unsubscribeFromMetricEvents(ctx, eventType)
  }
}

// Пример обвязки:
app.post('gc-metrics/enable', async (ctx) => {
  await GcMetricSubscriptionService.enable(ctx)
  return { ok: true }
})
```

### Поведение по умолчанию

- По умолчанию на многие ивенты **подписки нет** — в логах пусто.
- Прямо сказано: «в логах перестанет быть пусто, как только подпишетесь на эти ивенты (по умолчанию не подписано)»
- И отдельно: «По умолчанию на этот ивент подписки нет, инициируйте»

**Поэтому если:**

- видишь событие в «Трафике»,
- но твой `app.accountHook('metric-event', ...)` молчит — почти наверняка ты **не вызвал `subscribeToMetricEvents`** для этого eventType.

### Отписка от событий

```ts
import { unsubscribeFromMetricEvents } from '@app/metric'

app.post('gc-metrics/disable', async (ctx) => {
  await unsubscribeFromMetricEvents(ctx, 'event://getcourse/form/sent')
  return { ok: true }
})
```

### Можно ли слушать весь эфир?

**Ответ:** Нет, универсального режима типа «подпишись на всё подряд» интерфейсом не видно — нужно перечислять event-строки.

Практически это решается так:

1. Сначала работаешь с небольшим набором событий, которые точно нужны.
2. Для остального ориентируешься на список известных event-типов (см. раздел "Прямые событийные хуки") и/или на всё, что команда GC постепенно добавляет.

---

## Прямые событийные хуки

### Ответы на уроки

Официально в чате объявлено:

> «Добавили возможность подписаться на события с ответами на уроки. Для подписки, в плагине нужно написать хук… Аналогично можно подписаться на обновление ответа или удаление…»

Код:

```ts
import { transformGcEventParams } from '@getcourse/sdk'

app.pluginHook('metric-event-event://getcourse/teach/lesson/answerCreated', async (ctx, params) => {
  const event = transformGcEventParams(ctx, params.event)
  // ...
})
```

`transformGcEventParams` приводит событие к типу:

```ts
interface LessonAnswerEvent {
  eventType:
    | 'event://getcourse/teach/lesson/answerCreated'
    | 'event://getcourse/teach/lesson/answerUpdated'
    | 'event://getcourse/teach/lesson/answerDeleted'
  ts: Date
  ts64: number
  user: {
    id: number
    type: string
    email?: string
    firstName?: string
    lastName?: string
    accountRole?: string
    phone?: string
    image?: string
  }
  action:
    | 'created'
    | 'updated'
    | 'updated_status'
    | 'deleted'
    | 'mark'
    | 'unmark'
    | 'commented'
    | 'edited'
  answer: {
    id: number
    lesson_id: number
    training_id: number
    reviewer_user_id: number
    need_teacher_reaction: number
    response_teacher_id: number
    mark: number
    status: 'new' | 'accepted' | 'declined' | 'viewed' | 'need_review' | 'draft'
    type: number
    answer_text: string
    files_list: string
    reviewed_at: string
    need_teacher_reaction_at: string
    training_name: string
    stream_id?: number
    is_opened?: number
    public_level?: number
    additional_fields?: Record<string, string>
  }
}
```

**Важно:** При **комментировании** ответа событие `answerUpdated` триггерится. При **редактировании комментария** к ответу — **не** триггерится, и в трафике тоже нет события.

### Входящие сообщения в диалогах поддержки

Для inbox есть отдельное событие:

```ts
// Адрес хука
'metric-event-event://getcourse/conversation/addedMessage'
```

Структура:

```ts
interface ConversationAddedMessageEvent {
  eventType: 'event://getcourse/conversation/addedMessage'
  ts: Date
  ts64: number
  user: {
    id: number
    type: string
    email?: string
    firstName?: string
    lastName?: string
    accountRole?: string
    phone?: string
    image?: string
  }
  conversation: {
    id: number
    comment_type: 'income' | 'outcome'
    object_id: number
    object_type_id: string
    speaker_object_id: number
  }
  comment: {
    id: number
    comment_text: string
    user_id: number
    created_at: string
  }
}
```

Хук:

```ts
app.accountHook('metric-event-event://getcourse/conversation/addedMessage', async (ctx, params) => {
  const event = transformGcEventParams(ctx, params.event)
  // перекачиваешь в свою внешнюю систему, логируешь, триггеришь бота и т.д.
})
```

### Контакты, сделки и оплаты

Из чата есть явный список событий, на которые можно подписаться через `app.accountHook('metric-event-*')`:

```text
event://getcourse/conversation/addedMessage
event://getcourse/teach/lesson/answerCreated
event://getcourse/teach/lesson/answerUpdated
event://getcourse/teach/lesson/answerDeleted
event://getcourse/contact/created
event://getcourse/contact/updated
event://getcourse/dealCreated
event://getcourse/dealStatusChanged
event://getcourse/dealPaymentAccepted
event://getcourse/dealPaid
```

Это де-факто перечень основных «бизнес-ивентов» (CRM-часть: лиды, сделки, оплаты).

### Подключение чат-ботов (VK / Telegram)

В логах и переписке фигурируют события:

```text
event://getcourse/user/chatbot/vk_enabled
event://getcourse/user/chatbot/telegram_enabled
```

На них можно подписаться через `subscribeToMetricEvents` + `metric-event`:

```ts
await subscribeToMetricEvents(ctx, [
  'event://getcourse/user/chatbot/vk_enabled',
  'event://getcourse/user/chatbot/telegram_enabled'
])
```

Это удобно для автоматической привязки внешних инструментов, когда в GetCourse кто-то активирует/подключает бота.

### Анкеты и формы

В чате есть кейс:

```ts
app.accountHook('event://getcourse/survey/answerCreated', async (ctx, params) => {
  const event = transformGcEventParams(ctx, params.event)
  ctx.account.log('Анкета отправлена', { json: { event } })
})

app.pluginHook('metric-event-event://getcourse/survey/answerCreated', async (ctx, params) => {
  const event = 'user_id' in params.event ? transformGcEventParams(ctx, params.event) : params.event
  ctx.account.log('Анкета отправлена metric', { json: { event } })
})
```

**Важно:** Пока не сделаешь `subscribeToMetricEvents` для `'event://getcourse/form/sent'`, в `metric-event` и логах ничего не будет. После подписки «в логи стало падать событие», но собственный accountHook всё ещё нужно поправить.

**Короче:**

- События для анкет/форм существуют.
- Чтобы реально их ловить, нужно **и** корректный хук, **и** подписку через `subscribeToMetricEvents`.

### Вебинары

Есть событие:

```text
event://getcourse/webinar/commentCreated
```

Но из чата:

> «UPD: ответили в личке, на event://getcourse/webinar/commentCreated пока что нельзя подписаться»

То есть:

- событие видно в трафике/логах;
- официального API-хука для него пока нет.

### Изменение баланса пользователя

Прямого события нет, был вопрос:

> «А можно ли подписаться на событие изменения баланса пользователя? (я так понимаю, его нет…)»

Ответа «да» нигде не прозвучало → по текущему чату **события изменения баланса нет**.

---

## transformGcEventParams: нормализация события

Почти во всех примерах Chatium-разрабы используют вспомогалку:

```ts
import { transformGcEventParams } from '@getcourse/sdk'

/**
 * Унифицированная обработка GetCourse-событий.
 */
app.accountHook(
  'metric-event-event://getcourse/teach/lesson/answerCreated',
  async (ctx, params) => {
    const event = transformGcEventParams(ctx, params.event)
    // event уже нормализован под LessonAnswerEvent
  }
)
```

Или в metric-стриме:

```ts
app.accountHook('metric-event', async (ctx, { event }) => {
  const parsedEvent = transformGcEventParams(ctx, event)
  ctx.console.log('parsed event', { json: parsedEvent })
})
```

**Идея простая:**

- на входе `params.event` / `event` — «сырая» структура;
- `transformGcEventParams` делает тебе типизированный объект (`LessonAnswerEvent`, `ConversationAddedMessageEvent`, и т.п.), где уже есть `user`, `ts`, `action`, доменные поля.

Для своих сервисов можно поверх этого сделать обёртку-класс, если хочется ООП:

```ts
/**
 * Сервис маршрутизации событий GetCourse.
 */
class GcEventRouter {
  public static handleLessonAnswer(ctx: Ctx, event: LessonAnswerEvent): Promise<void> {
    // сюда выносишь бизнес-логику: обновить внешнюю LMS, синкнуть статистику и т.п.
    return Promise.resolve()
  }

  public static handleConversationMessage(
    ctx: Ctx,
    event: ConversationAddedMessageEvent
  ): Promise<void> {
    // логика по чатам поддержки
    return Promise.resolve()
  }
}
```

---

## Разница между event:// и metric-event-event://

**Критически важно понимать разницу:**

- **`event://getcourse/...`** — это **тип события внутри полезной нагрузки** (значение в `event.eventType` и то, что передаётся в `subscribeToMetricEvents`).
- **`metric-event-event://getcourse/...`** — это **адрес серверного хука в Chatium**, через который прилетает это событие.

Это не два разных события, а две "проекции" одного и того же.

### Когда писать `event://getcourse/...`

Используешь **внутри логики и при подписке**:

1. В `subscribeToMetricEvents`:

```ts
await subscribeToMetricEvents(ctx, ['event://getcourse/conversation/addedMessage'])
```

2. В коде, который работает через общий хук `metric-event`:

```ts
app.accountHook('metric-event', async (ctx, { event }) => {
  if (event.eventType === 'event://getcourse/conversation/addedMessage') {
    // твоя логика
  }
})
```

3. В типах/интерфейсах (TS):

```ts
eventType: 'event://getcourse/conversation/addedMessage'
```

### Когда писать `metric-event-event://getcourse/...`

Используешь **только как первый аргумент хука**:

1. В плагинах:

```ts
app.pluginHook(
  'metric-event-event://getcourse/conversation/addedMessage',
  async (ctx, params) => { ... },
)
```

2. В коде аккаунта:

```ts
app.accountHook(
  'metric-event-event://getcourse/teach/lesson/answerUpdated',
  async (ctx, params) => { ... },
)
```

### Альтернатива: общий `metric-event` без спец-адреса

Если не хочешь плодить десяток отдельных хуков:

```ts
app.accountHook('metric-event', async (ctx, { event }) => {
  const parsed = transformGcEventParams(ctx, event)

  switch (parsed.eventType) {
    case 'event://getcourse/conversation/addedMessage':
      // логика по входящим
      break
    case 'event://getcourse/teach/lesson/answerCreated':
      // логика по ответам на уроки
      break
  }
})
```

---

## Частые вопросы и типичные грабли

### «Вижу событие в логах, но хук не срабатывает»

Классический случай с вебинар-комментами и ботами:

- Наличие события в логах **не гарантирует**, что на него можно повеситься:

  > «Не обязательно. Есть событие комментирование вебинаров, но его нельзя отследить»

- Для некоторых event-типов нет поддерживаемых хуков, даже если они мелькают в общем лог-стриме.

**Вывод:** Ориентируешься на:

- список явно опубликованных event-типов (см. раздел "Прямые событийные хуки"),
- примеры от команды GC (lesson answers, inbox, контакты, сделки и т.д.).

### «В логах пусто»

Из переписки:

> «В логах пусто… в логах перестанет быть пусто, как только подпишетесь на эти ивенты (по умолчанию не подписано)»

**Проверки по чек-листу:**

1. Есть ли `subscribeToMetricEvents` для нужных `event://getcourse/...`.
2. Вызывается ли код, где ты его дергаешь (endpoints `enable-subscription` / `/sub` и т.п.).
3. Точно ли смотришь `metric-event`-хук, а не другой.

### «Можно ли подписаться на изменение баланса?»

- Был прямой вопрос в чате — ответ по контексту: пока нет события из коробки.
- Обходной путь — ловить события по оплатам/сделкам (`dealPaid`, `dealPaymentAccepted`, etc.) и считать баланс самостоятельно.

### «Почему редактирование комментария к ответу не даёт event?»

- Это поведение подтверждено: комментирование даёт событие, редактирование — нет, даже в трафике.
- На уровне интеграций это значит: опирайся только на события создания/основных изменений, а не на каждую правку текста.

---

## Рекомендуемый паттерн интеграции

Если обобщить всё, что люди в чате уже делали, получается такой конвейер:

1. **Выбрать события**, которые реально нужны:

   - inbox (`conversation/addedMessage`);
   - ответы на уроки (`teach/lesson/answer*`);
   - контакты (`contact/created/updated`);
   - сделки и оплаты (`deal*`);
   - формы/анкеты (`form/sent`, `survey/answerCreated`);
   - техподключения (чат-боты).

2. **Инициировать подписку** (где требуется):

   - либо явно через `subscribeToMetricEvents` и ловить всё в `metric-event`;
   - либо положиться на автоматическую подписку для некоторых событий плагина (как с lesson answers, судя по тексту Ратмира).

3. **В хуках (`accountHook` / `pluginHook`)**:

   - прогонять `params.event` через `transformGcEventParams`;
   - маршрутизовать по типу (`event.eventType`) в методы сервиса;
   - выносить тяжёлую работу в джобы (`scheduleJobAfter`, `scheduleJobAsap`) — в чате это активно используют с lesson-ответами.

4. **Дальше — твоя инфраструктура**:
   - дернуть внешний API,
   - записать в свою БД,
   - посчитать аналитику и т.д.

Если смотреть на это сверху: Chatium тебе даёт «тонкий слой» над внутренними событиями GetCourse — без отдельного вебхука в GC, но с похожей семантикой. Ты подписываешься один раз, а дальше поднимаешь у себя normal event-bus и вешаешь интеграции сколько захочешь.

---

## Практические примеры

### Пример 1: Обработка ответов на уроки

```ts
import { transformGcEventParams } from '@getcourse/sdk'
import { scheduleJobAsap } from '@app/jobs'

app.accountHook(
  'metric-event-event://getcourse/teach/lesson/answerCreated',
  async (ctx, params) => {
    const event = transformGcEventParams(ctx, params.event)

    // Выносим тяжёлую работу в джоб
    await scheduleJobAsap(ctx, {
      type: 'processLessonAnswer',
      answerId: event.answer.id,
      userId: event.user.id,
      trainingId: event.answer.training_id
    })
  }
)

app.job('processLessonAnswer', async (ctx, { answerId, userId, trainingId }) => {
  // Синхронизация с внешней LMS, отправка уведомлений и т.д.
  ctx.account.log('Обработка ответа на урок', { answerId, userId, trainingId })
})
```

### Пример 2: Мониторинг входящих сообщений

```ts
import { transformGcEventParams } from '@getcourse/sdk'
import { sendMessageToChat } from '@sender/sdk'

app.accountHook('metric-event-event://getcourse/conversation/addedMessage', async (ctx, params) => {
  const event = transformGcEventParams(ctx, params.event)

  // Отправляем уведомление в Telegram админу
  if (event.conversation.comment_type === 'income') {
    await sendMessageToChat(ctx, {
      channel: 'telegram',
      chatId: 'admin_chat_id',
      text: `Новое входящее сообщение от пользователя ${event.user.email}`
    })
  }
})
```

### Пример 3: Подписка на несколько событий через metric-event

```ts
import { subscribeToMetricEvents } from '@app/metric'
import { transformGcEventParams } from '@getcourse/sdk'

// Инициализация подписки
app.post('events/subscribe', async (ctx) => {
  await subscribeToMetricEvents(ctx, [
    'event://getcourse/form/sent',
    'event://getcourse/survey/answerCreated',
    'event://getcourse/user/chatbot/vk_enabled'
  ])
  return { ok: true }
})

// Обработка всех подписанных событий
app.accountHook('metric-event', async (ctx, { event }) => {
  const parsed = transformGcEventParams(ctx, event)

  switch (parsed.eventType) {
    case 'event://getcourse/form/sent':
      // Обработка отправки формы
      break
    case 'event://getcourse/survey/answerCreated':
      // Обработка ответа на анкету
      break
    case 'event://getcourse/user/chatbot/vk_enabled':
      // Обработка подключения VK бота
      break
  }
})
```

### Пример 4: Сервис маршрутизации событий

```ts
import { transformGcEventParams } from '@getcourse/sdk'

class GcEventRouter {
  public static async handleLessonAnswer(ctx: Ctx, event: LessonAnswerEvent): Promise<void> {
    ctx.account.log('Ответ на урок', {
      answerId: event.answer.id,
      userId: event.user.id,
      action: event.action
    })
    // Дополнительная логика: синхронизация с внешней системой, аналитика и т.д.
  }

  public static async handleConversationMessage(
    ctx: Ctx,
    event: ConversationAddedMessageEvent
  ): Promise<void> {
    ctx.account.log('Сообщение в диалоге', {
      conversationId: event.conversation.id,
      userId: event.user.id,
      text: event.comment.comment_text
    })
  }

  public static async handleDealCreated(ctx: Ctx, event: any): Promise<void> {
    ctx.account.log('Создана сделка', {
      dealId: event.deal?.id,
      userId: event.user.id
    })
  }
}

// Использование
app.accountHook('metric-event', async (ctx, { event }) => {
  const parsed = transformGcEventParams(ctx, event)

  switch (parsed.eventType) {
    case 'event://getcourse/teach/lesson/answerCreated':
      await GcEventRouter.handleLessonAnswer(ctx, parsed as LessonAnswerEvent)
      break
    case 'event://getcourse/conversation/addedMessage':
      await GcEventRouter.handleConversationMessage(ctx, parsed as ConversationAddedMessageEvent)
      break
    case 'event://getcourse/dealCreated':
      await GcEventRouter.handleDealCreated(ctx, parsed)
      break
  }
})
```

---

## Итоговая памятка

### Что где писать

- **`event://getcourse/...`** — имя типа события (его значение в `event.eventType` и то, что передаётся в `subscribeToMetricEvents`).
- **`metric-event-event://getcourse/...`** — имя канала/хука в Chatium, на который прилетает событие именно этого типа.

### Чек-лист настройки подписки

1. ✅ Определить нужные события из списка поддерживаемых
2. ✅ Вызвать `subscribeToMetricEvents` для нужных событий (если используешь `metric-event` хук)
3. ✅ Создать хук (`app.accountHook` или `app.pluginHook`) с адресом `metric-event-event://getcourse/...`
4. ✅ Использовать `transformGcEventParams` для нормализации события
5. ✅ Реализовать бизнес-логику обработки события
6. ✅ Вынести тяжёлые операции в джобы при необходимости

### Список поддерживаемых событий

- ✅ `event://getcourse/conversation/addedMessage` — входящие сообщения
- ✅ `event://getcourse/teach/lesson/answerCreated` — создание ответа на урок
- ✅ `event://getcourse/teach/lesson/answerUpdated` — обновление ответа на урок
- ✅ `event://getcourse/teach/lesson/answerDeleted` — удаление ответа на урок
- ✅ `event://getcourse/contact/created` — создание контакта
- ✅ `event://getcourse/contact/updated` — обновление контакта
- ✅ `event://getcourse/dealCreated` — создание сделки
- ✅ `event://getcourse/dealStatusChanged` — изменение статуса сделки
- ✅ `event://getcourse/dealPaymentAccepted` — принятие оплаты по сделке
- ✅ `event://getcourse/dealPaid` — оплата сделки
- ✅ `event://getcourse/form/sent` — отправка формы (требует подписки)
- ✅ `event://getcourse/survey/answerCreated` — ответ на анкету (требует подписки)
- ✅ `event://getcourse/user/chatbot/vk_enabled` — подключение VK бота (требует подписки)
- ✅ `event://getcourse/user/chatbot/telegram_enabled` — подключение Telegram бота (требует подписки)
- ❌ `event://getcourse/webinar/commentCreated` — пока нельзя подписаться
- ❌ Изменение баланса пользователя — события нет

---

**Версия**: 1.0  
**Дата**: 2025-01-27  
**Важно**: Эта механика доступна ТОЛЬКО в CHATIUM на стороне GETCOURSE. Не используйте эту инструкцию без явной ссылки на неё с указанием, что её надо применить.

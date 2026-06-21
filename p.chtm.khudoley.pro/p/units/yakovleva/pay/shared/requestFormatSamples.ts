// @shared
/**
 * Атомарные сниппеты для вкладки «Формат запросов» (`HomeRequestFormatTab.vue`).
 *
 * Цель — показать магазинному JS контракты и точечные примеры (не готовые
 * скрипты от начала до конца) для трёх сценариев:
 *   1. Создание SBP-QR через LifePay (POST /api/gateways/invoke с gatewayId=lifepay).
 *   2. Создание ссылки на оплату через Lava.Top (gatewayId=lavatop).
 *   3. Подписка на socket-уведомление о свершившейся оплате — чтобы JS мог
 *      обновить страницу или сделать редирект, не опрашивая сервер.
 *
 * Модуль чистый: только структуры данных и шаблоны строк. Параметризация
 * выполняется через `buildRequestFormatSamples({ invokeUrl, paymentSocketUrl })`
 * — в подставляемых URL уже учтён `PROJECT_ROOT` (см. `index.tsx`).
 */

export type CodeSnippetLang = 'json' | 'http' | 'javascript' | 'text'

export type CodeSnippet = {
  /** Подзаголовок (можно опустить, если блок один в секции). */
  title?: string
  /** Краткое описание над блоком. */
  description?: string
  language: CodeSnippetLang
  code: string
}

export type RequestFormatSection = {
  id: string
  /** Иконка FontAwesome (без класса, например `fa-qrcode`). */
  icon: string
  title: string
  /** Подзаголовок секции (отображается мелким текстом справа от title). */
  subtitle?: string
  /** Произвольные параграфы текста перед первым сниппетом. */
  intro: string[]
  snippets: CodeSnippet[]
  /** Заметки после сниппетов (нумерованный или маркированный список из строк). */
  notes?: string[]
}

export type RequestFormatBuildOptions = {
  /** Абсолютный путь к `/api/gateways/invoke` от корня хоста (с учётом PROJECT_ROOT). */
  invokeUrl: string
  /** Абсолютный путь к `/api/gateways/payment-socket` от корня хоста. */
  paymentSocketUrl: string
}

const LIFEPAY_REQUEST = `{
  "gatewayId": "lifepay",
  "op": "createBill",
  "args": {
    "orderNumber": "order-001",
    "amount": 1.00,
    "customerEmail": "buyer@example.com",
    "description": "Тестовая оплата",
    "callbackUrl": "https://<host>/<project-root>/webhooks/lifepay?token=<lp_webhook_token>&correlationId=<uuid>",
    "correlationId": "<uuid>"
  }
}`

const LIFEPAY_RESPONSE = `{
  "ok": true,
  "requestId": "...",
  "data": {
    "billNumber": "lifepay-1234567890",
    "paymentUrl": "https://qr.nspk.ru/...",
    "status": "new"
  }
}`

const LAVATOP_REQUEST = `{
  "gatewayId": "lavatop",
  "op": "createInvoice",
  "args": {
    "email": "buyer@example.com",
    "offerId": "<uuid-оффера-в-lava.top>",
    "currency": "RUB",
    "clientOrderId": "<correlationId>",
    "callbackUrl": "https://<host>/<project-root>/webhooks/lavatop"
  }
}`

const LAVATOP_RESPONSE = `{
  "ok": true,
  "requestId": "...",
  "data": {
    "contractId": "...",
    "paymentUrl": "https://app.lava.top/...",
    "status": "new"
  }
}`

const CORRELATION_ID_SNIPPET = `// Любая стабильная строка, уникальная для платежа: UUID, ULID, номер заказа
// плюс случайный хвост. Длина 1–128 символов, допустимы [A-Za-z0-9._:-].
const correlationId = crypto.randomUUID()`

const PAYMENT_SOCKET_RESPONSE = `{
  "success": true,
  "channel": "pay-payment-<correlationId>",
  "encodedSocketId": "<строка для subscribeToData>"
}`

const SOCKET_MESSAGE = `{
  "type": "payment",
  "data": {
    "gatewayId": "lifepay",       // или "lavatop"
    "correlationId": "<тот же UUID, что и при создании платежа>",
    "status": "success",          // success / fail / иной строкой
    "eventType": "payment",       // payment / refund / eventType из Lava.Top
    "externalId": "<id транзакции upstream>",
    "orderNumber": "<orderNumber / clientOrderId, если есть>",
    "amount": "1.00",
    "timestamp": 1716985200000
  }
}`

function lifepayJsCallSnippet(invokeUrl: string): string {
  return `const correlationId = crypto.randomUUID()

const cbUrl = new URL('https://<host>/<project-root>/webhooks/lifepay')
cbUrl.searchParams.set('token', '<lp_webhook_token>')
cbUrl.searchParams.set('correlationId', correlationId)

const resp = await fetch('${invokeUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gatewayId: 'lifepay',
    op: 'createBill',
    args: {
      orderNumber: 'order-001',
      amount: 1.00,
      customerEmail: 'buyer@example.com',
      description: 'Тестовая оплата',
      callbackUrl: cbUrl.toString(),
      correlationId
    }
  })
})
const result = await resp.json()
// result.ok === true → result.data.paymentUrl содержит ссылку для QR.`
}

function lavatopJsCallSnippet(invokeUrl: string): string {
  return `const correlationId = crypto.randomUUID()

const resp = await fetch('${invokeUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    gatewayId: 'lavatop',
    op: 'createInvoice',
    args: {
      email: 'buyer@example.com',
      offerId: '<uuid-оффера>',
      currency: 'RUB',
      clientOrderId: correlationId,
      callbackUrl: 'https://<host>/<project-root>/webhooks/lavatop'
    }
  })
})
const result = await resp.json()
// result.ok === true → result.data.paymentUrl содержит ссылку для редиректа.`
}

function paymentSocketIssueSnippet(paymentSocketUrl: string): string {
  return `const resp = await fetch('${paymentSocketUrl}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ correlationId })
})
const { success, encodedSocketId } = await resp.json()
if (!success) throw new Error('Не удалось получить encodedSocketId')`
}

const SOCKET_SUBSCRIBE_SNIPPET = `import { getOrCreateBrowserSocketClient } from '@app/socket'

const socketClient = await getOrCreateBrowserSocketClient()
const subscription = socketClient.subscribeToData(encodedSocketId)

const unsubscribe = subscription.listen((msg) => {
  if (msg?.type !== 'payment') return
  if (msg.data?.status === 'success') {
    // 1) Обновить страницу:
    window.location.reload()
    // 2) Либо сделать редирект на «спасибо»:
    // window.location.assign('/thank-you?order=' + encodeURIComponent(correlationId))
  }
})

// При размонтировании компонента / уходе со страницы:
// unsubscribe?.()`

export function buildRequestFormatSamples(opts: RequestFormatBuildOptions): RequestFormatSection[] {
  const { invokeUrl, paymentSocketUrl } = opts
  return [
    {
      id: 'lifepay-sbp',
      icon: 'fa-qrcode',
      title: 'СБП-QR через LifePay',
      subtitle: 'POST /api/gateways/invoke · gatewayId: "lifepay"',
      intro: [
        'Магазинный JS вызывает прокладку, передавая тело запроса с обязательным полем gatewayId. Сервер маршрутизирует операцию в LifePay-gateway, возвращает paymentUrl, по которому строится QR.',
        'Поле correlationId — стабильный ключ магазинного платежа. Его одновременно кладём в args.correlationId (сервер сохранит в request_log) и в query callbackUrl (приёмник webhook прочитает из query). Тот же ключ используется ниже для подписки на socket.'
      ],
      snippets: [
        {
          title: 'Тело запроса',
          language: 'json',
          code: LIFEPAY_REQUEST
        },
        {
          title: 'Успешный ответ',
          language: 'json',
          code: LIFEPAY_RESPONSE
        },
        {
          title: 'Атомарный вызов из JS',
          language: 'javascript',
          code: lifepayJsCallSnippet(invokeUrl)
        }
      ],
      notes: [
        'amount — рубли с копейками (Number).',
        'callbackUrl должен указывать на /webhooks/lifepay этого проекта; token обязателен, correlationId опционален, но без него не работает socket-нотификация.',
        'Доступ к эндпоинту: requireRealUser + requireInternalAccess.'
      ]
    },
    {
      id: 'lavatop-invoice',
      icon: 'fa-link',
      title: 'Ссылка на оплату через Lava.Top',
      subtitle: 'POST /api/gateways/invoke · gatewayId: "lavatop"',
      intro: [
        'Для Lava.Top роль correlationId играет поле clientOrderId — Lava.Top возвращает его в payload вебхука как есть. Сюда же кладём свой UUID, и тот же UUID используем при подписке на socket.',
        'callbackUrl на Lava.Top не уходит — это локальный приёмник /webhooks/lavatop, его адрес показан на главной (вкладка «Обзор»).'
      ],
      snippets: [
        {
          title: 'Тело запроса',
          language: 'json',
          code: LAVATOP_REQUEST
        },
        {
          title: 'Успешный ответ',
          language: 'json',
          code: LAVATOP_RESPONSE
        },
        {
          title: 'Атомарный вызов из JS',
          language: 'javascript',
          code: lavatopJsCallSnippet(invokeUrl)
        }
      ],
      notes: [
        'offerId — UUID оффера в Lava.Top (берётся из listProducts).',
        'paymentMethod / paymentProvider / buyerLanguage / periodicity — опциональные.',
        'currency: RUB / USD / EUR.'
      ]
    },
    {
      id: 'payment-socket',
      icon: 'fa-tower-broadcast',
      title: 'Подписка на webhook через WebSocket',
      subtitle: 'POST /api/gateways/payment-socket + @app/socket',
      intro: [
        'Чтобы не опрашивать сервер опросом, магазинный JS получает encodedSocketId и слушает канал. Когда webhook соответствующего гейтвея приходит на наш приёмник, сервер публикует одно сообщение в канал — JS обновляет страницу или делает редирект.',
        'Имя сырого канала фиксированное: «pay-payment-<correlationId>». Магазин этим именем не пользуется — он получает уже подписанный encodedSocketId.'
      ],
      snippets: [
        {
          title: '1. Сгенерировать correlationId',
          language: 'javascript',
          code: CORRELATION_ID_SNIPPET
        },
        {
          title: '2. Получить encodedSocketId',
          description:
            'Тело: { correlationId }. Ответ — encodedSocketId, который нужен для subscribeToData.',
          language: 'javascript',
          code: paymentSocketIssueSnippet(paymentSocketUrl)
        },
        {
          title: 'Ответ /api/gateways/payment-socket',
          language: 'json',
          code: PAYMENT_SOCKET_RESPONSE
        },
        {
          title: '3. Подписаться и среагировать',
          language: 'javascript',
          code: SOCKET_SUBSCRIBE_SNIPPET
        },
        {
          title: 'Формат сообщения в канале',
          description:
            'Сообщение приходит один раз на каждое успешно обработанное событие webhook (дубли отфильтрованы по webhook_idempotency).',
          language: 'json',
          code: SOCKET_MESSAGE
        }
      ],
      notes: [
        'Один correlationId — один канал; могут подписываться несколько вкладок/устройств одновременно.',
        'Сообщение не публикуется для дубль-вебхуков (LifePay ретраит до 10 раз).',
        'Если correlationId пустой/невалидный (вне [A-Za-z0-9._:-], > 128 символов) — endpoint вернёт 400 PAYMENT_SOCKET_CORRELATION_ID_INVALID.'
      ]
    }
  ]
}

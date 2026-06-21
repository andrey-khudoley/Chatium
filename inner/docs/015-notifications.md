@chatium

# Уведомления администраторов в Chatium

Исчерпывающее руководство по отправке уведомлений владельцам аккаунта в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Основные концепции](#основные-концепции)
- [Отправка уведомлений](#отправка-уведомлений)
  - [sendNotificationToAccountOwners](#sendnotificationtoaccountowners)
  - [Форматы сообщений](#форматы-сообщений)
- [Практические примеры](#практические-примеры)
  - [Уведомление о новой заявке](#уведомление-о-новой-заявке)
  - [Уведомление о заказе](#уведомление-о-заказе)
  - [Уведомление об ошибке](#уведомление-об-ошибке)
- [Лучшие практики](#лучшие-практики)

---

## Основные концепции

**@user-notifier/sdk** — модуль для отправки уведомлений владельцам аккаунта (администраторам).

### Ключевые возможности

- Отправка уведомлений админам
- Поддержка HTML, Markdown и Plain text
- Автоматическая доставка всем владельцам аккаунта

### Когда использовать

- ✅ Новая заявка/форма от пользователя
- ✅ Новый заказ
- ✅ Критическая ошибка в системе
- ✅ Важное системное событие
- ✅ Контактные данные от посетителя
- ❌ Не используйте для обычных логов
- ❌ Не используйте для частых событий

---

## Отправка уведомлений

### sendNotificationToAccountOwners

Отправляет уведомление всем владельцам аккаунта.

```typescript
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'

await sendNotificationToAccountOwners(ctx, {
  title: 'Заголовок уведомления',
  html: '<h1>HTML версия</h1><p>Детали...</p>',
  plain: 'Plain text версия\nДетали...',
  md: '**Markdown версия**\nДетали...'
})
```

**Параметры**:

- `title` — заголовок уведомления (обязательно)
- `html` — HTML версия сообщения (опционально)
- `plain` — Plain text версия (опционально)
- `md` — Markdown версия (опционально)

**⚠️ Важно**:

- Импортируй `@user-notifier/sdk` **только в папке `/api/`**
- **НЕ** используй в Vue компонентах или shared файлах
- Укажи хотя бы один из форматов: html, plain или md

### Форматы сообщений

#### HTML

Поддерживает стандартные HTML теги.

```typescript
await sendNotificationToAccountOwners(ctx, {
  title: 'Новая заявка',
  html: `
    <h1>Новая заявка от пользователя</h1>
    <table>
      <tr>
        <td><strong>Имя:</strong></td>
        <td>Иван Петров</td>
      </tr>
      <tr>
        <td><strong>Email:</strong></td>
        <td>ivan@example.com</td>
      </tr>
      <tr>
        <td><strong>Телефон:</strong></td>
        <td>+7 999 123-45-67</td>
      </tr>
    </table>
    <p><a href="https://example.com/leads/123">Посмотреть заявку</a></p>
  `
})
```

#### Markdown

Поддерживает стандартный Markdown синтаксис.

```typescript
await sendNotificationToAccountOwners(ctx, {
  title: 'Новый заказ',
  md: `
## Новый заказ #12345

**Клиент:** Иван Петров  
**Email:** ivan@example.com  
**Телефон:** +7 999 123-45-67

### Товары:
- iPhone 15 Pro - 1 шт. - 99,990 ₽
- AirPods Pro - 1 шт. - 24,990 ₽

**Итого:** 124,980 ₽

[Посмотреть заказ](https://example.com/orders/12345)
  `
})
```

#### Plain Text

Простой текст без форматирования.

```typescript
await sendNotificationToAccountOwners(ctx, {
  title: 'Новое сообщение',
  plain: `
Новое сообщение от пользователя

Имя: Иван Петров
Email: ivan@example.com
Телефон: +7 999 123-45-67

Сообщение:
Здравствуйте, интересует ваш продукт...
  `
})
```

---

## Практические примеры

### Уведомление о новой заявке

**API роут обработки формы**:

```typescript
// api/leads.ts
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import LeadsTable from '../tables/leads.table'

// @shared-route
export const apiSubmitLeadRoute = app.post('/submit-lead', async (ctx, req) => {
  const { name, email, phone, message } = req.body

  // Валидация
  if (!name || !email) {
    return { success: false, error: 'Заполните обязательные поля' }
  }

  // Сохраняем заявку
  const lead = await LeadsTable.create(ctx, {
    name,
    email,
    phone,
    message,
    createdAt: new Date()
  })

  // Отправляем уведомление админам
  await sendNotificationToAccountOwners(ctx, {
    title: 'Новая заявка на сайте',
    html: `
      <h2>Новая заявка</h2>
      <table style="border-collapse: collapse; width: 100%;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Имя:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${name}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Email:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <a href="mailto:${email}">${email}</a>
          </td>
        </tr>
        ${
          phone
            ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Телефон:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">
            <a href="tel:${phone}">${phone}</a>
          </td>
        </tr>
        `
            : ''
        }
        ${
          message
            ? `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;"><strong>Сообщение:</strong></td>
          <td style="padding: 8px; border: 1px solid #ddd;">${message}</td>
        </tr>
        `
            : ''
        }
      </table>
      <p>
        <a href="${ctx.account.url(`/app/heap/leads/~${lead.id}`)}" 
           style="background: #3b82f6; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Посмотреть заявку
        </a>
      </p>
    `,
    plain: `
Новая заявка на сайте

Имя: ${name}
Email: ${email}
${phone ? `Телефон: ${phone}` : ''}
${message ? `\nСообщение:\n${message}` : ''}

Посмотреть: ${ctx.account.url(`/app/heap/leads/~${lead.id}`)}
    `
  })

  ctx.account.log('Новая заявка', {
    level: 'info',
    json: { leadId: lead.id, email }
  })

  return { success: true, leadId: lead.id }
})
```

### Уведомление о заказе

```typescript
// api/orders.ts
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import OrdersTable from '../tables/orders.table'
import { Money } from '@app/heap'

// @shared-route
export const apiCreateOrderRoute = app.post('/create-order', async (ctx, req) => {
  const { customerName, customerEmail, customerPhone, items } = req.body

  // Подсчет суммы
  let total = new Money(0, 'RUB')
  for (const item of items) {
    total = total.add(new Money(item.price * item.quantity, 'RUB'))
  }

  // Создаём заказ
  const order = await OrdersTable.create(ctx, {
    customerName,
    customerEmail,
    customerPhone,
    items,
    total,
    status: 'new',
    createdAt: new Date()
  })

  // Формируем список товаров для уведомления
  const itemsList = items
    .map(
      (item) =>
        `<li>${item.name} - ${item.quantity} шт. - ${new Money(item.price * item.quantity, 'RUB').format(ctx)}</li>`
    )
    .join('')

  // Уведомляем админов
  await sendNotificationToAccountOwners(ctx, {
    title: `Новый заказ #${order.id}`,
    html: `
      <h2>Новый заказ #${order.id}</h2>
      <h3>Клиент:</h3>
      <ul>
        <li><strong>Имя:</strong> ${customerName}</li>
        <li><strong>Email:</strong> <a href="mailto:${customerEmail}">${customerEmail}</a></li>
        <li><strong>Телефон:</strong> <a href="tel:${customerPhone}">${customerPhone}</a></li>
      </ul>
      <h3>Товары:</h3>
      <ul>
        ${itemsList}
      </ul>
      <p><strong>Итого:</strong> ${total.format(ctx)}</p>
      <p>
        <a href="${ctx.account.url(`/app/heap/orders/~${order.id}`)}" 
           style="background: #10b981; color: white; padding: 10px 20px; 
                  text-decoration: none; border-radius: 5px; display: inline-block;">
          Посмотреть заказ
        </a>
      </p>
    `,
    md: `
## Новый заказ #${order.id}

### Клиент:
- **Имя:** ${customerName}
- **Email:** ${customerEmail}
- **Телефон:** ${customerPhone}

### Товары:
${items.map((item) => `- ${item.name} - ${item.quantity} шт. - ${new Money(item.price * item.quantity, 'RUB').format(ctx)}`).join('\n')}

**Итого:** ${total.format(ctx)}

[Посмотреть заказ](${ctx.account.url(`/app/heap/orders/~${order.id}`)})
    `
  })

  return { success: true, orderId: order.id }
})
```

### Уведомление об ошибке

```typescript
// api/process.ts
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'

const processDataJob = app.job('/process-data', async (ctx, params) => {
  try {
    // Обработка данных
    await processData(ctx, params)
  } catch (error: any) {
    // Логируем ошибку
    ctx.account.log('Критическая ошибка обработки', {
      level: 'error',
      json: {
        error: error.message,
        stack: error.stack,
        params
      }
    })

    // Уведомляем админов
    await sendNotificationToAccountOwners(ctx, {
      title: '⚠️ Критическая ошибка в системе',
      html: `
        <h2 style="color: #dc2626;">⚠️ Критическая ошибка</h2>
        <p><strong>Задача:</strong> process-data</p>
        <p><strong>Время:</strong> ${new Date().toLocaleString('ru-RU')}</p>
        <h3>Ошибка:</h3>
        <pre style="background: #f3f4f6; padding: 10px; border-radius: 5px; overflow-x: auto;">
${error.message}
        </pre>
        <h3>Stack trace:</h3>
        <pre style="background: #f3f4f6; padding: 10px; border-radius: 5px; overflow-x: auto; font-size: 12px;">
${error.stack}
        </pre>
        <h3>Параметры:</h3>
        <pre style="background: #f3f4f6; padding: 10px; border-radius: 5px; overflow-x: auto;">
${JSON.stringify(params, null, 2)}
        </pre>
      `,
      plain: `
⚠️ Критическая ошибка в системе

Задача: process-data
Время: ${new Date().toLocaleString('ru-RU')}

Ошибка:
${error.message}

Stack trace:
${error.stack}

Параметры:
${JSON.stringify(params, null, 2)}
      `
    })

    throw error
  }
})
```

---

## Лучшие практики

### Когда отправлять уведомления

✅ **Отправляйте уведомления**:

- При получении контактных данных пользователя
- При создании заказа
- При заполнении формы
- При критических ошибках
- При важных системных событиях

❌ **НЕ отправляйте уведомления**:

- При каждом входе пользователя
- При обычных операциях
- При частых событиях (> 10 в минуту)
- Для отладочной информации

### Форматирование

✅ **Используйте структурированный формат**:

```typescript
await sendNotificationToAccountOwners(ctx, {
  title: 'Четкий заголовок',
  html: `
    <h2>Основная информация</h2>
    <ul>
      <li>Поле 1</li>
      <li>Поле 2</li>
    </ul>
    <a href="...">Ссылка на действие</a>
  `,
  plain: `
Основная информация

- Поле 1
- Поле 2

Ссылка: ...
  `
})
```

### Безопасность

✅ **Экранируйте пользовательский ввод**:

```typescript
// НЕ используйте напрямую без проверки
const dangerousHtml = `<h1>${userInput}</h1>` // Небезопасно!

// Используйте экранирование
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

const safeHtml = `<h1>${escapeHtml(userInput)}</h1>` // Безопасно
```

### Ссылки

✅ **Всегда добавляйте ссылки на действия**:

```typescript
await sendNotificationToAccountOwners(ctx, {
  title: 'Новая заявка',
  html: `
    <p>Информация...</p>
    <p>
      <a href="${ctx.account.url(`/app/heap/leads/~${lead.id}`)}">
        Посмотреть заявку
      </a>
    </p>
  `
})
```

### Логирование

✅ **Логируйте отправку уведомлений**:

```typescript
await sendNotificationToAccountOwners(ctx, {
  title: 'Новая заявка',
  html: '...'
})

ctx.account.log('Уведомление отправлено', {
  level: 'info',
  json: {
    type: 'new_lead',
    leadId: lead.id
  }
})
```

### Обработка ошибок

✅ **Оборачивайте в try/catch**:

```typescript
try {
  await sendNotificationToAccountOwners(ctx, {
    title: 'Уведомление',
    html: '...'
  })
} catch (error: any) {
  ctx.account.log('Ошибка отправки уведомления', {
    level: 'error',
    json: { error: error.message }
  })
  // Не бросаем ошибку дальше - основная логика не должна падать
}
```

### Частота

✅ **Контролируйте частоту**:

```typescript
// Плохо: уведомление при каждом событии
app.accountHook('@sender/message-received', async (ctx, params) => {
  await sendNotificationToAccountOwners(ctx, {
    title: 'Новое сообщение',
    html: '...'
  })
})

// Хорошо: уведомление только для важных событий
app.accountHook('@sender/message-received', async (ctx, params) => {
  if (params.message.text?.includes('СРОЧНО')) {
    await sendNotificationToAccountOwners(ctx, {
      title: 'Срочное сообщение',
      html: '...'
    })
  }
})
```

---

## Связанные документы

- **012-sender.md** — Отправка сообщений в мессенджеры
- **002-routing.md** — API роуты для обработки форм
- **008-heap.md** — Сохранение данных заявок
- **001-standards.md** — Стандарты кодирования

---

**Версия**: 1.0  
**Дата**: 2025-11-03  
**Последнее обновление**: Создание инструкции по уведомлениям

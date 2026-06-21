# GetCourse SDK

Исчерпывающее руководство по работе с GetCourse SDK в Chatium. Документ структурирован для удобства полнотекстового поиска и работы с эмбеддингами.

## Содержание

- [Введение](#введение)
- [Основные концепции](#основные-концепции)
- [Импорт SDK](#импорт-sdk)
- [Уроки и тренинги](#уроки-и-тренинги)
  - [getAvailableTrainings - доступные тренинги](#getavailabletrainings---доступные-тренинги)
  - [getRootAvailableTrainings - корневые тренинги](#getrootavailabletrainings---корневые-тренинги)
  - [getUserTrainings - тренинги пользователя](#getusertrainings---тренинги-пользователя)
  - [getLessonsByTraining - уроки тренинга](#getlessonsbytraining---уроки-тренинга)
  - [getLessonInfo - информация об уроке](#getlessoninfo---информация-об-уроке)
  - [addLessonAnswerComment - комментарий к уроку](#addlessonanswercomment---комментарий-к-уроку)
  - [getWebinars - список вебинаров](#getwebinars---список-вебинаров)
  - [getScheduleByEmail - расписание пользователя](#getschedulebyemail---расписание-пользователя)
- [Работа с пользователями](#работа-с-пользователями)
  - [getGcUserData - данные пользователя](#getgcuserdata---данные-пользователя)
  - [getUserFields - поля пользователя](#getuserfields---поля-пользователя)
  - [updateUserFields - обновление полей](#updateuserfields---обновление-полей)
  - [getUsersList - список пользователей](#getuserslist---список-пользователей)
  - [getOrCreateCtxUserByEmail - создание по email](#getorcreatectxuserbyemail---создание-по-email)
- [Заказы (Deals)](#заказы-deals)
  - [getDealInfo - информация о заказе](#getdealinfo---информация-о-заказе)
  - [getDealsByUserId - заказы пользователя](#getdealsbyuserid---заказы-пользователя)
  - [createDeal - создание заказа](#createdeal---создание-заказа)
  - [updateDealInfo - обновление заказа](#updatedealinfo---обновление-заказа)
  - [addDealComment - комментарий к заказу](#adddealcomment---комментарий-к-заказу)
  - [addDealPayment - добавление платежа](#adddeal payment---добавление-платежа)
- [Группы](#группы)
  - [getAllGroups - все группы](#getallgroups---все-группы)
  - [getUserGroups - группы пользователя](#getusergroups---группы-пользователя)
  - [addUserToGroup - добавить в группу](#addusertogroup---добавить-в-группу)
  - [removeUserFromGroup - удалить из группы](#removeuserfromgroup---удалить-из-группы)
- [Баланс и бонусы](#баланс-и-бонусы)
  - [getBalance - получить баланс](#getbalance---получить-баланс)
  - [addBalance - добавить баланс](#addbalance---добавить-баланс)
  - [dischargeBalance - списать баланс](#dischargebalance---списать-баланс)
- [Сегменты](#сегменты)
  - [getSegmentsForUsers - сегменты пользователей](#getsegmentsforusers---сегменты-пользователей)
  - [isUserInSegment - проверка в сегменте](#isuserinsegment---проверка-в-сегменте)
- [Предложения (Offers)](#предложения-offers)
- [Дипломы](#дипломы)
- [Лучшие практики](#лучшие-практики)

---

## Введение

**GetCourse SDK** — набор методов для работы с данными GetCourse напрямую из кода Chatium.

### Ключевые особенности

- ✅ Вызов методов **внутри аккаунта GetCourse**
- ✅ Автоматический контекст пользователя
- ✅ Нет необходимости во внешних серверах
- ✅ Полная типизация TypeScript
- ✅ Интеграция с Chatium роутами

### Отличие от публичного API

**GetCourse SDK**:

- Вызывается из кода внутри GetCourse аккаунта
- Автоматический контекст текущего пользователя
- Расширенные возможности (внутренние методы)

**Публичное API GetCourse**:

- Вызывается снаружи через HTTP
- Требует API ключи
- Ограниченный функционал

---

## Основные концепции

### Контекст пользователя

Все методы SDK работают в контексте текущего пользователя:

```typescript
// Для текущего пользователя (ctx)
const trainings = await getAvailableTrainings(ctx)
// Вернёт тренинги, доступные ЭТОМУ пользователю

// Для другого пользователя (по email)
const userData = await getGcUserData(ctx, { email: 'user@example.com' })
```

### Асинхронность

Все методы SDK — асинхронные:

```typescript
// ✅ Правильно
const trainings = await getAvailableTrainings(ctx)

// ❌ Неправильно
const trainings = getAvailableTrainings(ctx)
```

---

## Импорт SDK

```typescript
import {
  // Тренинги и уроки
  getAvailableTrainings,
  getRootAvailableTrainings,
  getUserTrainings,
  getLessonsByTraining,
  getLessonInfo,
  addLessonAnswerComment,
  getWebinars,
  getWebinarsByIds,
  getScheduleByEmail,

  // Пользователи
  getGcUserData,
  getUserFields,
  updateUserFields,
  getUsersList,
  getOrCreateCtxUserByEmail,
  getUserCustomFields,
  setUserCustomFields,
  addUserComment,

  // Заказы
  getDealInfo,
  getDealInfoWithParams,
  getDealsByUserId,
  getDealsByIds,
  createDeal,
  updateDealInfo,
  addDealComment,
  addDealCommentFromCurrentUser,
  addDealPayment,
  getDealComments,
  getDealCallsList,
  getDealCustomFieldsList,
  getDealCancelReasons,

  // Группы
  getAllGroups,
  getGroupsByIds,
  getUserGroups,
  addUserToGroup,
  removeUserFromGroup,

  // Баланс
  getBalance,
  addBalance,
  dischargeBalance,

  // Сегменты
  getSegmentsForUsers,
  getSegmentsForDeals,
  isUserInSegment,
  isDealInSegment,

  // Предложения
  getOffers,
  getOffersByIds,

  // Дипломы
  getDiplomasByEmail,
  issueDiploma,

  // Цели
  getGoalInfo,
  getGoalRecords,
  createGoalRecord,

  // Прочее
  getUserPurchases,
  getUserPurchasesByProduct,
  getMailings,
  getUserAnswers,
  getVideoInfo,
  getUserTelegramChats
} from '@gc-mcp-server/sdk'
```

---

## Уроки и тренинги

### getAvailableTrainings - доступные тренинги

Получить список тренингов, доступных текущему пользователю:

```typescript
import { getAvailableTrainings } from '@gc-mcp-server/sdk'

export const apiGetTrainingsRoute = app.get('/trainings', async (ctx) => {
  try {
    const trainings = await getAvailableTrainings(ctx)

    return {
      success: true,
      trainings: trainings.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        isAvailable: t.isAvailable
      }))
    }
  } catch (error) {
    ctx.account.log('Get trainings failed', {
      level: 'error',
      json: { error: error.message }
    })
    return { success: false, error: error.message }
  }
})
```

### getRootAvailableTrainings - корневые тренинги

Получить список корневых тренингов (без вложенных):

```typescript
import { getRootAvailableTrainings } from '@gc-mcp-server/sdk'

const rootTrainings = await getRootAvailableTrainings(ctx)
```

### getUserTrainings - тренинги пользователя

Получить тренинги конкретного пользователя:

```typescript
import { getUserTrainings } from '@gc-mcp-server/sdk'

export const apiUserTrainingsRoute = app.get('/user-trainings', async (ctx, req) => {
  const { userId } = req.query

  const trainings = await getUserTrainings(ctx, { userId })

  return { success: true, trainings }
})
```

### getLessonsByTraining - уроки тренинга

Получить все уроки конкретного тренинга:

```typescript
import { getLessonsByTraining } from '@gc-mcp-server/sdk'

export const apiLessonsRoute = app.get('/lessons/:trainingId', async (ctx, req) => {
  const { trainingId } = req.params

  const lessons = await getLessonsByTraining(ctx, { trainingId })

  return {
    success: true,
    lessons: lessons.map((l) => ({
      id: l.id,
      title: l.title,
      order: l.order,
      isCompleted: l.isCompleted,
      isAvailable: l.isAvailable
    }))
  }
})
```

### getLessonInfo - информация об уроке

```typescript
import { getLessonInfo } from '@gc-mcp-server/sdk'

const lessonInfo = await getLessonInfo(ctx, {
  lessonId: 'lesson_123'
})

// Доступная информация:
// lessonInfo.id, title, content, videoUrl, attachments, etc.
```

### addLessonAnswerComment - комментарий к уроку

```typescript
import { addLessonAnswerComment } from '@gc-mcp-server/sdk'

export const apiAddCommentRoute = app.post('/add-comment', async (ctx, req) => {
  const { lessonId, comment } = req.body

  await addLessonAnswerComment(ctx, {
    lessonId,
    comment
  })

  return { success: true }
})
```

### getWebinars - список вебинаров

```typescript
import { getWebinars } from '@gc-mcp-server/sdk'

const webinars = await getWebinars(ctx)

// Фильтрация вебинаров
const upcomingWebinars = await getWebinars(ctx, {
  dateFrom: new Date(),
  dateTo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
})
```

### getScheduleByEmail - расписание пользователя

```typescript
import { getScheduleByEmail } from '@gc-mcp-server/sdk'

export const apiScheduleRoute = app.get('/schedule', async (ctx, req) => {
  const { email } = req.query

  const schedule = await getScheduleByEmail(ctx, { email })

  return {
    success: true,
    events: schedule.map((event) => ({
      id: event.id,
      title: event.title,
      startDate: event.startDate,
      endDate: event.endDate,
      type: event.type
    }))
  }
})
```

---

## Работа с пользователями

### getGcUserData - данные пользователя

Получить информацию о пользователе GetCourse:

```typescript
import { getGcUserData } from '@gc-mcp-server/sdk'

// По email
const userData = await getGcUserData(ctx, {
  email: 'user@example.com'
})

// По ID
const userData = await getGcUserData(ctx, {
  userId: 'user_123'
})

// Структура ответа
interface GcUserData {
  id: string
  email: string
  phone: string
  firstName: string
  lastName: string
  createdAt: Date
  // ... другие поля
}
```

### getUserFields - поля пользователя

Получить значения системных и дополнительных полей:

```typescript
import { getUserFields } from '@gc-mcp-server/sdk'

export const apiUserFieldsRoute = app.get('/user-fields', async (ctx, req) => {
  const { userId } = req.query

  const fields = await getUserFields(ctx, { userId })

  return {
    success: true,
    fields: {
      email: fields.email,
      phone: fields.phone,
      firstName: fields.firstName,
      lastName: fields.lastName,
      customFields: fields.customFields
    }
  }
})
```

### updateUserFields - обновление полей

```typescript
import { updateUserFields } from '@gc-mcp-server/sdk'

export const apiUpdateUserRoute = app.post('/update-user', async (ctx, req) => {
  const { userId, fields } = req.body

  await updateUserFields(ctx, {
    userId,
    fields: {
      firstName: fields.firstName,
      lastName: fields.lastName,
      phone: fields.phone,
      // Дополнительные поля
      customField1: fields.customField1
    }
  })

  ctx.account.log('User updated', {
    level: 'info',
    json: { userId }
  })

  return { success: true }
})
```

### getUsersList - список пользователей

Получить массив пользователей с фильтрацией:

```typescript
import { getUsersList } from '@gc-mcp-server/sdk'

export const apiUsersListRoute = app.get('/users-list', async (ctx, req) => {
  const { limit = 100, offset = 0 } = req.query

  const users = await getUsersList(ctx, {
    limit: parseInt(limit as string),
    offset: parseInt(offset as string)
  })

  return {
    success: true,
    users,
    count: users.length
  }
})
```

### getOrCreateCtxUserByEmail - создание по email

Получить или создать Chatium-пользователя по GetCourse email:

```typescript
import { getOrCreateCtxUserByEmail } from '@gc-mcp-server/sdk'

export const apiGetUserRoute = app.get('/get-user', async (ctx, req) => {
  const { email } = req.query

  // Получит существующего или создаст нового
  const user = await getOrCreateCtxUserByEmail(ctx, { email })

  return {
    success: true,
    user: {
      id: user.id,
      displayName: user.displayName,
      email: user.confirmedEmail
    }
  }
})
```

---

## Заказы (Deals)

### getDealInfo - информация о заказе

```typescript
import { getDealInfo } from '@gc-mcp-server/sdk'

export const apiDealRoute = app.get('/deal/:dealId', async (ctx, req) => {
  const { dealId } = req.params

  const deal = await getDealInfo(ctx, { dealId })

  return {
    success: true,
    deal: {
      id: deal.id,
      number: deal.number,
      status: deal.status,
      amount: deal.amount,
      currency: deal.currency,
      createdAt: deal.createdAt,
      products: deal.products
    }
  }
})
```

### getDealsByUserId - заказы пользователя

```typescript
import { getDealsByUserId } from '@gc-mcp-server/sdk'

export const apiUserDealsRoute = app.get('/user-deals', async (ctx, req) => {
  const { userId } = req.query

  const deals = await getDealsByUserId(ctx, { userId })

  return {
    success: true,
    deals: deals.map((d) => ({
      id: d.id,
      number: d.number,
      status: d.status,
      amount: d.amount,
      createdAt: d.createdAt
    }))
  }
})
```

### createDeal - создание заказа

```typescript
import { createDeal } from '@gc-mcp-server/sdk'

export const apiCreateDealRoute = app.post('/create-deal', async (ctx, req) => {
  const { userId, offerId, amount } = req.body

  const deal = await createDeal(ctx, {
    userId,
    offerId,
    amount,
    currency: 'RUB',
    status: 'new'
  })

  ctx.account.log('Deal created', {
    level: 'info',
    json: { dealId: deal.id, userId }
  })

  return {
    success: true,
    deal: {
      id: deal.id,
      number: deal.number
    }
  }
})
```

### updateDealInfo - обновление заказа

```typescript
import { updateDealInfo } from '@gc-mcp-server/sdk'

export const apiUpdateDealRoute = app.post('/update-deal', async (ctx, req) => {
  const { dealId, status, amount } = req.body

  await updateDealInfo(ctx, {
    dealId,
    status,
    amount
  })

  return { success: true }
})
```

### addDealComment - комментарий к заказу

```typescript
import { addDealComment } from '@gc-mcp-server/sdk'

export const apiAddDealCommentRoute = app.post('/add-deal-comment', async (ctx, req) => {
  const { dealId, comment } = req.body

  await addDealComment(ctx, {
    dealId,
    text: comment
  })

  return { success: true }
})
```

### addDealPayment - добавление платежа

```typescript
import { addDealPayment } from '@gc-mcp-server/sdk'

export const apiAddPaymentRoute = app.post('/add-payment', async (ctx, req) => {
  const { dealId, amount, paymentMethod } = req.body

  await addDealPayment(ctx, {
    dealId,
    amount,
    currency: 'RUB',
    paymentMethod,
    paymentDate: new Date()
  })

  ctx.account.log('Payment added to deal', {
    level: 'info',
    json: { dealId, amount }
  })

  return { success: true }
})
```

---

## Группы

### getAllGroups - все группы

```typescript
import { getAllGroups } from '@gc-mcp-server/sdk'

export const apiGroupsRoute = app.get('/groups', async (ctx) => {
  const groups = await getAllGroups(ctx)

  return {
    success: true,
    groups: groups.map((g) => ({
      id: g.id,
      title: g.title,
      memberCount: g.memberCount
    }))
  }
})
```

### getUserGroups - группы пользователя

```typescript
import { getUserGroups } from '@gc-mcp-server/sdk'

export const apiUserGroupsRoute = app.get('/user-groups', async (ctx, req) => {
  const { userId } = req.query

  const groups = await getUserGroups(ctx, { userId })

  return { success: true, groups }
})
```

### addUserToGroup - добавить в группу

```typescript
import { addUserToGroup } from '@gc-mcp-server/sdk'

export const apiAddToGroupRoute = app.post('/add-to-group', async (ctx, req) => {
  const { userId, groupId } = req.body

  await addUserToGroup(ctx, {
    userId,
    groupId
  })

  ctx.account.log('User added to group', {
    level: 'info',
    json: { userId, groupId }
  })

  return { success: true }
})
```

### removeUserFromGroup - удалить из группы

```typescript
import { removeUserFromGroup } from '@gc-mcp-server/sdk'

export const apiRemoveFromGroupRoute = app.post('/remove-from-group', async (ctx, req) => {
  const { userId, groupId } = req.body

  await removeUserFromGroup(ctx, {
    userId,
    groupId
  })

  return { success: true }
})
```

---

## Баланс и бонусы

### getBalance - получить баланс

```typescript
import { getBalance } from '@gc-mcp-server/sdk'

export const apiGetBalanceRoute = app.get('/balance', async (ctx, req) => {
  const { userId } = req.query

  const balance = await getBalance(ctx, { userId })

  return {
    success: true,
    balance: {
      amount: balance.amount,
      currency: balance.currency || 'RUB'
    }
  }
})
```

### addBalance - добавить баланс

```typescript
import { addBalance } from '@gc-mcp-server/sdk'

export const apiAddBalanceRoute = app.post('/add-balance', async (ctx, req) => {
  const { userId, amount, reason } = req.body

  await addBalance(ctx, {
    userId,
    amount,
    reason
  })

  ctx.account.log('Balance added', {
    level: 'info',
    json: { userId, amount, reason }
  })

  return { success: true }
})
```

### dischargeBalance - списать баланс

```typescript
import { dischargeBalance } from '@gc-mcp-server/sdk'

export const apiDischargeBalanceRoute = app.post('/discharge-balance', async (ctx, req) => {
  const { userId, amount, reason } = req.body

  await dischargeBalance(ctx, {
    userId,
    amount,
    reason
  })

  return { success: true }
})
```

---

## Сегменты

### getSegmentsForUsers - сегменты пользователей

```typescript
import { getSegmentsForUsers } from '@gc-mcp-server/sdk'

export const apiUserSegmentsRoute = app.get('/user-segments', async (ctx) => {
  const segments = await getSegmentsForUsers(ctx)

  return {
    success: true,
    segments: segments.map((s) => ({
      id: s.id,
      title: s.title,
      userCount: s.userCount
    }))
  }
})
```

### isUserInSegment - проверка в сегменте

```typescript
import { isUserInSegment } from '@gc-mcp-server/sdk'

export const apiCheckSegmentRoute = app.get('/check-segment', async (ctx, req) => {
  const { userId, segmentId } = req.query

  const isInSegment = await isUserInSegment(ctx, {
    userId,
    segmentId
  })

  return {
    success: true,
    isInSegment
  }
})
```

---

## Предложения (Offers)

### getOffers - все предложения

```typescript
import { getOffers } from '@gc-mcp-server/sdk'

export const apiOffersRoute = app.get('/offers', async (ctx) => {
  const offers = await getOffers(ctx)

  return {
    success: true,
    offers: offers.map((o) => ({
      id: o.id,
      title: o.title,
      price: o.price,
      currency: o.currency,
      isActive: o.isActive
    }))
  }
})
```

### getOffersByIds - предложения по ID

```typescript
import { getOffersByIds } from '@gc-mcp-server/sdk'

const offers = await getOffersByIds(ctx, {
  offerIds: ['offer1', 'offer2', 'offer3']
})
```

---

## Дипломы

### getDiplomasByEmail - дипломы пользователя

```typescript
import { getDiplomasByEmail } from '@gc-mcp-server/sdk'

export const apiDiplomasRoute = app.get('/diplomas', async (ctx, req) => {
  const { email } = req.query

  const diplomas = await getDiplomasByEmail(ctx, { email })

  return {
    success: true,
    diplomas: diplomas.map((d) => ({
      id: d.id,
      title: d.title,
      issuedAt: d.issuedAt,
      downloadUrl: d.downloadUrl
    }))
  }
})
```

### issueDiploma - выдать диплом

```typescript
import { issueDiploma } from '@gc-mcp-server/sdk'

export const apiIssueDiplomaRoute = app.post('/issue-diploma', async (ctx, req) => {
  const { userId, templateId } = req.body

  const diploma = await issueDiploma(ctx, {
    userId,
    templateId
  })

  ctx.account.log('Diploma issued', {
    level: 'info',
    json: { userId, templateId, diplomaId: diploma.id }
  })

  return {
    success: true,
    diploma: {
      id: diploma.id,
      downloadUrl: diploma.downloadUrl
    }
  }
})
```

---

## Лучшие практики

### Обработка ошибок

✅ **Всегда используйте try/catch**:

```typescript
import { getAvailableTrainings } from '@gc-mcp-server/sdk'

export const apiRoute = app.get('/trainings', async (ctx) => {
  try {
    const trainings = await getAvailableTrainings(ctx)
    return { success: true, trainings }
  } catch (error) {
    ctx.account.log('SDK call failed', {
      level: 'error',
      json: {
        method: 'getAvailableTrainings',
        error: error.message
      }
    })
    return { success: false, error: error.message }
  }
})
```

### Кэширование

✅ **Кэшируйте редко меняющиеся данные**:

```typescript
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 минут

export const apiCachedRoute = app.get('/cached-data', async (ctx) => {
  const cacheKey = 'trainings'
  const cached = cache.get(cacheKey)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { success: true, trainings: cached.data }
  }

  const trainings = await getAvailableTrainings(ctx)

  cache.set(cacheKey, {
    data: trainings,
    timestamp: Date.now()
  })

  return { success: true, trainings }
})
```

### Валидация параметров

✅ **Проверяйте входные данные**:

```typescript
export const apiRoute = app.post('/action', async (ctx, req) => {
  const { userId, groupId } = req.body

  if (!userId) {
    return { success: false, error: 'userId is required' }
  }

  if (!groupId) {
    return { success: false, error: 'groupId is required' }
  }

  await addUserToGroup(ctx, { userId, groupId })

  return { success: true }
})
```

### Логирование

✅ **Логируйте важные операции**:

```typescript
import { createDeal } from '@gc-mcp-server/sdk'

export const apiRoute = app.post('/create-deal', async (ctx, req) => {
  const { userId, offerId, amount } = req.body

  ctx.account.log('Creating deal', {
    level: 'info',
    json: { userId, offerId, amount }
  })

  const deal = await createDeal(ctx, { userId, offerId, amount })

  ctx.account.log('Deal created successfully', {
    level: 'info',
    json: { dealId: deal.id, number: deal.number }
  })

  return { success: true, deal }
})
```

### Типизация

✅ **Используйте TypeScript интерфейсы**:

```typescript
interface Training {
  id: string
  title: string
  description: string
  isAvailable: boolean
}

export const apiRoute = app.get('/trainings', async (ctx) => {
  const trainings = (await getAvailableTrainings(ctx)) as Training[]

  return {
    success: true,
    trainings: trainings.filter((t) => t.isAvailable)
  }
})
```

---

## Связанные документы

- **E02-gc-analytics.md** — Аналитика GetCourse
- **002-routing.md** — Использование SDK в роутах
- **003-auth.md** — Авторизация
- [Официальная документация](https://getcourse.chatium.com/docs/sdk)

---

**Версия**: 1.0  
**Дата**: 2025-11-02  
**Последнее обновление**: Создание документации по GetCourse SDK

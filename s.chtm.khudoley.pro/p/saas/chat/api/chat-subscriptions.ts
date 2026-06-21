import { requireRealUser } from '@app/auth'
import { Money } from '@app/heap'
import { runAttemptPayment, attemptAutoCharge, getSavedCards, validateCaller } from '@pay/sdk'
import { sendDataToSocket } from '@app/socket'
import { captureCustomerEvent, ContactType } from '@crm/sdk'
import { sendNotificationToAccountOwners } from '@user-notifier/sdk'
import Subscriptions from '../tables/chat-subscriptions.table'
import SubscriptionPlans from '../tables/chat-subscription-plans.table'
import PlanChats from '../tables/chat-plan-chats.table'
import Chats from '../tables/chats.table'
import { createOrUpdateFeedParticipant, getFeedById, findFeedParticipants } from '@app/feed'

// Получить мою подписку на конкретный чат
export const apiChatSubscriptionGetRoute = app.get('/:feedId/subscription', async (ctx, req) => {
  requireRealUser(ctx)

  // Находим все тарифы, которые включают этот чат
  const planChatLinks = await PlanChats.findAll(ctx, {
    where: { feedId: req.params.feedId }
  })

  if (planChatLinks.length === 0) {
    return null
  }

  const planIds = planChatLinks.map((link) => link.planId.id)

  // Ищем активную подписку на любой из этих тарифов
  const subscription = await Subscriptions.findOneBy(ctx, {
    planId: planIds,
    userId: ctx.user.id,
    status: ['active', 'pending']
  })

  if (!subscription) {
    return null
  }

  // Получаем информацию о тарифе
  const plan = await SubscriptionPlans.findById(ctx, subscription.planId.id)

  // Получаем все чаты из тарифа
  const planChats = await PlanChats.findAll(ctx, {
    where: { planId: plan?.id }
  })

  const chatIds = planChats.map((pc) => pc.feedId)
  const chats =
    chatIds.length > 0 ? await Chats.findAll(ctx, { where: { feedId: chatIds }, limit: 100 }) : []

  return {
    ...subscription,
    plan: plan
      ? {
          ...plan,
          chats: chats.map((c) => ({
            feedId: c.feedId,
            title: c.title,
            type: c.type,
            avatarHash: c.avatarHash
          }))
        }
      : null,
    isExpiringSoon: isExpiringSoon(subscription)
  }
})

// Получить все мои подписки (для профиля)
export const apiChatSubscriptionsMyRoute = app.get('/my', async (ctx, req) => {
  requireRealUser(ctx)

  const subscriptions = await Subscriptions.findAll(ctx, {
    where: {
      userId: ctx.user.id,
      status: ['active', 'pending', 'expired']
    },
    order: [{ endDate: 'desc' }]
  })

  // Загружаем информацию о тарифах и чатах
  const result = []
  for (const sub of subscriptions) {
    const plan = await SubscriptionPlans.findById(ctx, sub.planId.id)

    // Получаем все чаты из тарифа
    let chats = []
    if (plan) {
      const planChats = await PlanChats.findAll(ctx, {
        where: { planId: plan.id }
      })

      const chatIds = planChats.map((pc) => pc.feedId)
      chats =
        chatIds.length > 0
          ? await Chats.findAll(ctx, { where: { feedId: chatIds }, limit: 100 })
          : []
    }

    result.push({
      ...sub,
      plan: plan
        ? {
            ...plan,
            chats: chats.map((c) => ({
              feedId: c.feedId,
              title: c.title,
              type: c.type,
              avatarHash: c.avatarHash
            }))
          }
        : null,
      isExpiringSoon: isExpiringSoon(sub)
    })
  }

  return result
})

// Оформить подписку на тариф
export const apiChatSubscriptionCreateRoute = app.post('/subscribe', async (ctx, req) => {
  requireRealUser(ctx)

  const { planId, periodValue, autoRenewal = false } = ctx.req.body

  if (!planId) {
    throw new Error('Не указан тариф')
  }

  // Проверяем, нет ли уже активной подписки на этот тариф
  const existingSub = await Subscriptions.findOneBy(ctx, {
    planId: planId,
    userId: ctx.user.id,
    status: ['active', 'pending']
  })

  if (existingSub) {
    throw new Error('У вас уже есть активная подписка на этот тариф')
  }

  // Получаем тариф
  const plan = await SubscriptionPlans.findById(ctx, planId)
  if (!plan || !plan.isActive) {
    throw new Error('Тариф не найден или неактивен')
  }

  // Получаем чаты тарифа
  const planChatLinks = await PlanChats.findAll(ctx, {
    where: { planId: plan.id }
  })

  const chatIds = planChatLinks.map((link) => link.feedId)

  // Определяем даты периода
  const { generatePeriodOptions } = await import('../shared/subscription-periods')
  const periodOptions = generatePeriodOptions(
    plan.durationType as any,
    plan.durationValue,
    plan.calendarPeriod as any,
    plan.specificPeriodStart || undefined
  )

  const selectedPeriod = periodOptions.find((p) => p.value === periodValue)
  if (!selectedPeriod) {
    throw new Error('Выбран неверный период')
  }

  const startDate = selectedPeriod.startDate
  const endDate = selectedPeriod.endDate

  // Если доступ начинается в будущем - создаем pending подписку
  const now = new Date()
  const isPending = startDate > now

  // Создаем запись о подписке
  const subscription = await Subscriptions.create(ctx, {
    userId: ctx.user.id,
    planId: plan.id,
    status: isPending ? 'pending' : 'active',
    startDate,
    endDate,
    autoRenewal: autoRenewal && plan.allowAutoRenewal,
    renewalPlanId: autoRenewal && plan.allowAutoRenewal ? plan.id : null,
    selectedPeriodStart: startDate,
    selectedPeriodEnd: endDate
  })

  // Получаем информацию о чатах для описания
  const chats =
    chatIds.length > 0 ? await Chats.findAll(ctx, { where: { feedId: chatIds }, limit: 100 }) : []

  const chatNames = chats.map((c) => c.title).join(', ')

  // Создаем платеж
  const paymentResult = await runAttemptPayment(ctx, {
    subject: subscription,
    amount: [plan.price.amount, plan.price.currency],
    description: `Подписка "${plan.name}" - доступ к ${chats.length} чатам (${formatPeriodLabel(startDate, endDate)})`,
    user: ctx.user,
    customer: {
      firstName: ctx.user.firstName,
      lastName: ctx.user.lastName,
      email: ctx.user.confirmedEmail,
      phone: ctx.user.confirmedPhone
    },
    items: [
      {
        id: plan.id,
        name: `Подписка "${plan.name}"`,
        quantity: 1,
        price: plan.price.amount
      }
    ],
    successUrl: `/projekt-chat#/subscriptions`,
    cancelUrl: `/projekt-chat#/subscriptions`,
    successCallbackRoute: subscriptionPaymentSuccessRoute,
    cancelCallbackRoute: subscriptionPaymentCancelRoute
  })

  if (!paymentResult.success) {
    // Удаляем подписку при неудаче
    await Subscriptions.delete(ctx, subscription.id)
    throw new Error(paymentResult.error || 'Ошибка при создании платежа')
  }

  // Обновляем подписку с ID платежа
  await Subscriptions.update(ctx, {
    id: subscription.id,
    lastPaymentId: paymentResult.result.paymentId || null
  })

  // Отправляем событие в CRM
  await captureCustomerEvent(ctx, {
    event: 'subscription_created',
    customer: {
      displayName: ctx.user.displayName
    },
    contacts: [
      { type: ContactType.Email, value: ctx.user.confirmedEmail },
      { type: ContactType.Phone, value: ctx.user.confirmedPhone }
    ].filter((c) => c.value),
    linkRecords: [subscription],
    payload: {
      planName: plan.name,
      chatCount: chats.length,
      chatIds: chatIds,
      amount: plan.price.amount,
      currency: plan.price.currency,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      autoRenewal: autoRenewal && plan.allowAutoRenewal
    }
  })

  return {
    subscription: {
      ...subscription,
      plan: {
        ...plan,
        chats: chats.map((c) => ({
          feedId: c.feedId,
          title: c.title,
          type: c.type
        }))
      }
    },
    paymentLink: paymentResult.result.paymentLink
  }
})

// Обработчик успешного платежа
const subscriptionPaymentSuccessRoute = app.function(
  '/payment-success',
  async (ctx, params, callerInfo) => {
    validateCaller(callerInfo)

    const { attempt, payment } = params

    // Получаем подписку
    const subscription = await Subscriptions.findById(ctx, attempt.subject[1])
    if (!subscription) {
      ctx.account.log('Subscription not found for payment', {
        level: 'error',
        json: { attemptId: attempt.id, subject: attempt.subject }
      })
      return { success: false, error: 'Subscription not found' }
    }

    // Обновляем подписку
    const now = new Date()
    const isPending = subscription.startDate > now

    await Subscriptions.update(ctx, {
      id: subscription.id,
      status: isPending ? 'pending' : 'active',
      lastPaymentId: payment.id,
      lastPaymentAt: new Date(),
      nextBillingDate: subscription.autoRenewal ? calculateNextBillingDate(subscription) : null
    })

    // Если подписка активна (не pending) - добавляем пользователя во все чаты тарифа
    if (!isPending) {
      const planChats = await PlanChats.findAll(ctx, {
        where: { planId: subscription.planId.id }
      })

      for (const planChat of planChats) {
        try {
          const feed = await getFeedById(ctx, planChat.feedId)
          if (feed) {
            await createOrUpdateFeedParticipant(ctx, feed, subscription.userId.id, {
              role: 'guest'
            })
          }
        } catch (e) {
          ctx.account.log('Failed to add user to chat', {
            level: 'warn',
            json: { subscriptionId: subscription.id, chatId: planChat.feedId, error: e.message }
          })
        }
      }
    }

    // Отправляем уведомление администраторам
    const plan = await SubscriptionPlans.findById(ctx, subscription.planId.id)
    if (plan) {
      await sendNotificationToAccountOwners(ctx, {
        title: 'Новая подписка',
        html: `<p>Пользователь ${attempt.customer?.firstName || ''} ${attempt.customer?.lastName || ''} оформил подписку "${plan.name}"</p>`,
        plain: `Новая подписка "${plan.name}"`,
        md: `Новая подписка "${plan.name}"`
      })
    }

    return { success: true }
  }
)

// Обработчик отмены платежа
const subscriptionPaymentCancelRoute = app.function(
  '/payment-cancel',
  async (ctx, params, callerInfo) => {
    validateCaller(callerInfo)

    const { attempt } = params

    // Получаем подписку
    const subscription = await Subscriptions.findById(ctx, attempt.subject[1])
    if (subscription) {
      // Удаляем неоплаченную подписку
      await Subscriptions.delete(ctx, subscription.id)
    }

    return { success: true }
  }
)

// Продлить подписку (до истечения или после)
export const apiChatSubscriptionExtendRoute = app.post(
  '/:subscriptionId/extend',
  async (ctx, req) => {
    requireRealUser(ctx)

    const { periodValue } = ctx.req.body

    const subscription = await Subscriptions.findOneBy(ctx, {
      id: req.params.subscriptionId,
      userId: ctx.user.id
    })

    if (!subscription) {
      throw new Error('Подписка не найдена')
    }

    // Получаем тариф
    const plan = await SubscriptionPlans.findById(ctx, subscription.planId.id)
    if (!plan || !plan.isActive) {
      throw new Error('Тариф не найден или неактивен')
    }

    // Определяем даты нового периода
    const { generatePeriodOptions } = await import('../shared/subscription-periods')
    const periodOptions = generatePeriodOptions(
      plan.durationType as any,
      plan.durationValue,
      plan.calendarPeriod as any,
      plan.specificPeriodStart || undefined
    )

    const selectedPeriod = periodOptions.find((p) => p.value === periodValue)
    if (!selectedPeriod) {
      throw new Error('Выбран неверный период')
    }

    // Определяем новые даты
    const now = new Date()
    let newStartDate: Date
    let newEndDate: Date
    const isExtension = subscription.endDate >= now // true = продление, false = возобновление

    if (isExtension) {
      // Подписка еще активна - продлеваем от текущей endDate
      const currentEnd = new Date(subscription.endDate)
      const periodDuration = selectedPeriod.endDate.getTime() - selectedPeriod.startDate.getTime()
      newStartDate = currentEnd
      newEndDate = new Date(currentEnd.getTime() + periodDuration)
    } else {
      // Подписка истекла - начинаем с выбранного периода
      newStartDate = selectedPeriod.startDate
      newEndDate = selectedPeriod.endDate
    }

    // Получаем чаты тарифа
    const planChats = await PlanChats.findAll(ctx, {
      where: { planId: plan.id }
    })
    const chatIds = planChats.map((link) => link.feedId)

    // Получаем информацию о чатах для описания
    const chats =
      chatIds.length > 0 ? await Chats.findAll(ctx, { where: { feedId: chatIds }, limit: 100 }) : []
    const chatNames = chats.map((c) => c.title).join(', ')

    // Создаем платеж за продление
    const paymentResult = await runAttemptPayment(ctx, {
      subject: subscription,
      amount: [plan.price.amount, plan.price.currency],
      description:
        subscription.endDate >= now
          ? `Продление подписки "${plan.name}" - ${chatNames || 'доступ к чатам'} (${formatPeriodLabel(newStartDate, newEndDate)})`
          : `Возобновление подписки "${plan.name}" - ${chatNames || 'доступ к чатам'} (${formatPeriodLabel(newStartDate, newEndDate)})`,
      user: ctx.user,
      customer: {
        firstName: ctx.user.firstName,
        lastName: ctx.user.lastName,
        email: ctx.user.confirmedEmail,
        phone: ctx.user.confirmedPhone
      },
      items: [
        {
          id: plan.id,
          name: `Подписка "${plan.name}" (${subscription.endDate >= now ? 'продление' : 'возобновление'})`,
          quantity: 1,
          price: plan.price.amount
        }
      ],
      successUrl: `/projekt-chat#/subscriptions`,
      cancelUrl: `/projekt-chat#/subscriptions`,
      successCallbackRoute: subscriptionExtensionSuccessRoute,
      cancelCallbackRoute: subscriptionExtensionCancelRoute
    })

    if (!paymentResult.success) {
      throw new Error(paymentResult.error || 'Ошибка при создании платежа')
    }

    // Сохраняем данные о продлении во временном поле
    await Subscriptions.update(ctx, {
      id: subscription.id,
      cancelReason: JSON.stringify({
        extensionPending: true,
        newStartDate: newStartDate.toISOString(),
        newEndDate: newEndDate.toISOString(),
        isExtension, // флаг: true = продление (не трогаем startDate), false = возобновление
        periodValue,
        paymentAttemptId: paymentResult.result.attemptId
      })
    })

    return {
      success: true,
      paymentLink: paymentResult.result.paymentLink,
      subscription: {
        ...subscription,
        newStartDate: newStartDate.toISOString(),
        newEndDate: newEndDate.toISOString()
      }
    }
  }
)

// Обработчик успешного продления
const subscriptionExtensionSuccessRoute = app.function(
  '/extension-success',
  async (ctx, params, callerInfo) => {
    validateCaller(callerInfo)

    const { attempt, payment } = params

    const subscription = await Subscriptions.findById(ctx, attempt.subject[1])
    if (!subscription) {
      ctx.account.log('Subscription extension: not found', {
        level: 'error',
        json: { attemptId: attempt.id, subject: attempt.subject }
      })
      return { success: false, error: 'Subscription not found' }
    }

    // Парсим сохраненные данные о продлении
    let extensionData: any = {}
    try {
      extensionData = JSON.parse(subscription.cancelReason || '{}')
    } catch (e) {
      // Если не JSON - игнорируем
    }

    // Обновляем подписку с новыми датами
    // При ПРОДЛЕНИИ (isExtension=true) - сохраняем оригинальный startDate, меняем только endDate
    // При ВОЗОБНОВЛЕНИИ (isExtension=false) - обновляем обе даты
    const updateData: any = {
      id: subscription.id,
      status: 'active',
      endDate: extensionData.newEndDate ? new Date(extensionData.newEndDate) : subscription.endDate,
      lastPaymentId: payment.id,
      lastPaymentAt: new Date(),
      nextBillingDate: subscription.autoRenewal
        ? calculateNextBillingDateForPeriod(
            extensionData.newEndDate ? new Date(extensionData.newEndDate) : subscription.endDate
          )
        : null,
      cancelReason: null // Очищаем временные данные
    }

    // При возобновлении обновляем startDate, при продлении - оставляем как было
    if (extensionData.isExtension === false) {
      updateData.startDate = extensionData.newStartDate
        ? new Date(extensionData.newStartDate)
        : subscription.startDate
    }

    await Subscriptions.update(ctx, updateData)

    // Добавляем пользователя во все чаты тарифа (если он там еще не состоит)
    const planChats = await PlanChats.findAll(ctx, {
      where: { planId: subscription.planId.id }
    })

    for (const planChat of planChats) {
      try {
        const feed = await getFeedById(ctx, planChat.feedId)
        if (feed) {
          await createOrUpdateFeedParticipant(ctx, feed, subscription.userId.id, {
            role: 'guest'
          })
        }
      } catch (e) {
        ctx.account.log('Failed to add user to chat during extension', {
          level: 'warn',
          json: { subscriptionId: subscription.id, chatId: planChat.feedId, error: e.message }
        })
      }
    }

    // Уведомляем пользователя через WebSocket
    await sendDataToSocket(ctx, `user-${subscription.userId.id}`, {
      type: 'subscription-event',
      event: 'extended',
      subscriptionId: subscription.id,
      newEndDate: extensionData.newEndDate
    })

    // Отправляем уведомление администраторам
    const plan = await SubscriptionPlans.findById(ctx, subscription.planId.id)
    if (plan) {
      await sendNotificationToAccountOwners(ctx, {
        title: 'Подписка продлена',
        html: `<p>Пользователь ${attempt.customer?.firstName || ''} ${attempt.customer?.lastName || ''} продлил подписку "${plan.name}"</p>`,
        plain: `Подписка "${plan.name}" продлена`,
        md: `Подписка "${plan.name}" продлена`
      })
    }

    return { success: true }
  }
)

// Обработчик отмены продления
const subscriptionExtensionCancelRoute = app.function(
  '/extension-cancel',
  async (ctx, params, callerInfo) => {
    validateCaller(callerInfo)

    const { attempt } = params

    const subscription = await Subscriptions.findById(ctx, attempt.subject[1])
    if (subscription) {
      // Очищаем временные данные о продлении
      let extensionData: any = {}
      try {
        extensionData = JSON.parse(subscription.cancelReason || '{}')
      } catch (e) {
        // Если не JSON - игнорируем
      }

      // Если подписка истекла и продление не удалось - оставляем как есть
      // Если подписка активна - просто очищаем временные данные
      if (subscription.status === 'active') {
        await Subscriptions.update(ctx, {
          id: subscription.id,
          cancelReason: null
        })
      }
    }

    return { success: true }
  }
)

// Отменить автопродление подписки
export const apiChatSubscriptionCancelRoute = app.post(
  '/:subscriptionId/cancel',
  async (ctx, req) => {
    requireRealUser(ctx)

    const subscription = await Subscriptions.findOneBy(ctx, {
      id: req.params.subscriptionId,
      userId: ctx.user.id,
      status: ['active', 'pending']
    })

    if (!subscription) {
      throw new Error('Активная подписка не найдена')
    }

    await Subscriptions.update(ctx, {
      id: subscription.id,
      autoRenewal: false,
      renewalPlanId: null,
      cancelledAt: new Date(),
      cancelReason: ctx.req.body.reason || 'По запросу пользователя'
    })

    return { success: true, message: 'Автопродление отменено' }
  }
)

// Проверить доступ к чату
export const apiChatSubscriptionCheckAccessRoute = app.post(
  '/:feedId/check-access',
  async (ctx, req) => {
    if (!ctx.user) {
      return {
        hasAccess: false,
        reason: 'not_auth',
        message: 'Необходимо авторизоваться'
      }
    }

    const chat = await Chats.findOneBy(ctx, { feedId: req.params.feedId })
    if (!chat) {
      return {
        hasAccess: false,
        reason: 'not_found',
        message: 'Чат не найден'
      }
    }

    // Получаем количество участников
    const participantsCount = await findFeedParticipants(ctx, req.params.feedId, { limit: 1 })
      .then((p) => p.length)
      .catch(() => 0)

    // Проверяем, является ли пользователь владельцем или админом чата
    const participants = await findFeedParticipants(ctx, req.params.feedId, { limit: 100 })
    const userParticipant = participants.find((p) => p.userId === ctx.user.id)

    if (userParticipant && (userParticipant.role === 'owner' || userParticipant.role === 'admin')) {
      return {
        hasAccess: true,
        isPaid: chat.isPaid || false,
        isOwnerOrAdmin: true
      }
    }

    // Проверяем, входит ли чат в какой-либо тариф
    const planChatLinks = await PlanChats.findAll(ctx, {
      where: { feedId: req.params.feedId }
    })

    // Если чат не входит ни в один тариф - проверяем старую логику (для обратной совместимости)
    if (planChatLinks.length === 0) {
      // Если чат не платный - доступ есть
      if (!chat.isPaid) {
        return {
          hasAccess: true,
          isPaid: false
        }
      }

      // Проверяем старую подписку (по chatId)
      const legacySubscription = await Subscriptions.findOneBy(ctx, {
        chatId: req.params.feedId,
        userId: ctx.user.id,
        status: ['active', 'pending']
      })

      if (!legacySubscription) {
        return {
          hasAccess: false,
          isPaid: true,
          reason: 'no_subscription',
          message: 'Требуется подписка для доступа к чату',
          chat: {
            title: chat.title,
            description: chat.description,
            type: chat.type,
            avatarHash: chat.avatarHash,
            isPaid: chat.isPaid,
            participantsCount
          }
        }
      }

      // Проверяем срок подписки
      const now = new Date()
      if (legacySubscription.status === 'pending' || legacySubscription.startDate > now) {
        return {
          hasAccess: false,
          isPaid: true,
          reason: 'pending',
          message: `Доступ откроется ${legacySubscription.startDate.toLocaleDateString('ru-RU')}`,
          subscription: {
            ...legacySubscription,
            startDate: legacySubscription.startDate.toISOString(),
            endDate: legacySubscription.endDate.toISOString()
          },
          chat: {
            title: chat.title,
            description: chat.description,
            type: chat.type,
            avatarHash: chat.avatarHash,
            isPaid: chat.isPaid,
            participantsCount
          }
        }
      }

      if (legacySubscription.endDate < now) {
        return {
          hasAccess: false,
          isPaid: true,
          reason: 'expired',
          message: 'Срок действия подписки истек',
          chat: {
            title: chat.title,
            description: chat.description,
            type: chat.type,
            avatarHash: chat.avatarHash,
            isPaid: chat.isPaid,
            participantsCount
          }
        }
      }

      return {
        hasAccess: true,
        isPaid: true,
        subscription: {
          ...legacySubscription,
          endDate: legacySubscription.endDate.toISOString()
        }
      }
    }

    // Чат входит в тарифы - проверяем подписку на любой из них
    const planIds = planChatLinks.map((link) => link.planId.id)

    const subscription = await Subscriptions.findOneBy(ctx, {
      planId: planIds,
      userId: ctx.user.id,
      status: ['active', 'pending']
    })

    if (!subscription) {
      // Получаем доступные тарифы
      const plans = await SubscriptionPlans.findAll(ctx, {
        where: {
          id: planIds,
          isActive: true
        },
        order: [{ sortOrder: 'asc' }]
      })

      // Подгружаем чаты для каждого тарифа
      const plansWithChats = await Promise.all(
        plans.map(async (plan) => {
          const pc = await PlanChats.findAll(ctx, { where: { planId: plan.id } })
          const cIds = pc.map((p) => p.feedId)
          const chts =
            cIds.length > 0 ? await Chats.findAll(ctx, { where: { feedId: cIds }, limit: 100 }) : []
          return {
            ...plan,
            chats: chts.map((c) => ({
              feedId: c.feedId,
              title: c.title,
              type: c.type,
              avatarHash: c.avatarHash
            }))
          }
        })
      )

      return {
        hasAccess: false,
        isPaid: true,
        reason: 'no_subscription',
        message: 'Требуется подписка для доступа к чату',
        plans: plansWithChats,
        chat: {
          title: chat.title,
          description: chat.description,
          type: chat.type,
          avatarHash: chat.avatarHash,
          isPaid: chat.isPaid,
          participantsCount
        }
      }
    }

    const now = new Date()

    // Проверяем, не pending ли подписка
    if (subscription.status === 'pending' || subscription.startDate > now) {
      return {
        hasAccess: false,
        isPaid: true,
        reason: 'pending',
        message: `Доступ откроется ${subscription.startDate.toLocaleDateString('ru-RU')}`,
        subscription: {
          ...subscription,
          startDate: subscription.startDate.toISOString(),
          endDate: subscription.endDate.toISOString()
        },
        chat: {
          title: chat.title,
          description: chat.description,
          type: chat.type,
          avatarHash: chat.avatarHash,
          isPaid: chat.isPaid,
          participantsCount
        }
      }
    }

    // Проверяем, не истекла ли подписка
    if (subscription.endDate < now) {
      // Обновляем статус
      await Subscriptions.update(ctx, {
        id: subscription.id,
        status: 'expired'
      })

      // Получаем тарифы для продления
      const plans = await SubscriptionPlans.findAll(ctx, {
        where: {
          id: planIds,
          isActive: true
        }
      })

      return {
        hasAccess: false,
        isPaid: true,
        reason: 'expired',
        message: 'Срок действия подписки истек',
        plans,
        chat: {
          title: chat.title,
          description: chat.description,
          type: chat.type,
          avatarHash: chat.avatarHash,
          isPaid: chat.isPaid,
          participantsCount
        }
      }
    }

    // Получаем информацию о тарифе
    const plan = await SubscriptionPlans.findById(ctx, subscription.planId.id)

    // Доступ есть
    return {
      hasAccess: true,
      isPaid: true,
      subscription: {
        ...subscription,
        endDate: subscription.endDate.toISOString(),
        isExpiringSoon: isExpiringSoon(subscription),
        plan: plan ? { name: plan.name } : null
      }
    }
  }
)

// Получить сохраненные карты пользователя
export const apiChatSubscriptionCardsRoute = app.get('/cards', async (ctx, req) => {
  requireRealUser(ctx)

  const result = await getSavedCards(ctx, {})

  if (result.success) {
    return {
      cards: result.cards.map((card) => ({
        id: card.id,
        displayName: `${card.provider.title} ${card.cardMask || '****'}`,
        cardType: card.cardType,
        provider: card.provider.title
      }))
    }
  }

  return { cards: [] }
})

// Job для автопродления подписок
const subscriptionRenewalJob = app.job('/renewal', async (ctx, params) => {
  const { subscriptionId } = params

  const subscription = await Subscriptions.findById(ctx, subscriptionId)
  if (!subscription || subscription.status !== 'active') {
    ctx.account.log('Subscription renewal: not found or not active', {
      level: 'warn',
      json: { subscriptionId }
    })
    return { success: false, error: 'Subscription not found or not active' }
  }

  if (!subscription.autoRenewal) {
    ctx.account.log('Subscription renewal: auto renewal disabled', {
      level: 'info',
      json: { subscriptionId }
    })
    return { success: false, error: 'Auto renewal disabled' }
  }

  // Получаем тариф для продления
  const planId = subscription.renewalPlanId?.id || subscription.planId?.id
  if (!planId) {
    ctx.account.log('Subscription renewal: no plan for renewal', {
      level: 'warn',
      json: { subscriptionId }
    })
    return { success: false, error: 'No plan for renewal' }
  }

  const plan = await SubscriptionPlans.findById(ctx, planId)
  if (!plan || !plan.isActive) {
    ctx.account.log('Subscription renewal: plan not found or inactive', {
      level: 'warn',
      json: { subscriptionId, planId }
    })
    return { success: false, error: 'Plan not found or inactive' }
  }

  // Получаем чаты тарифа
  const planChats = await PlanChats.findAll(ctx, { where: { planId: plan.id } })
  const chatCount = planChats.length

  // Выполняем автосписание
  const renewalResult = await attemptAutoCharge(ctx, {
    subject: subscription,
    amount: [plan.price.amount, plan.price.currency],
    description: `Продление подписки "${plan.name}" (${chatCount} чатов)`,
    userId: subscription.userId.id,
    initedBy: 'system',
    bySchedule: true,
    customer: {
      firstName: subscription.userId.firstName,
      lastName: subscription.userId.lastName
    },
    items: [
      {
        id: plan.id,
        name: `Подписка "${plan.name}" (продление)`,
        quantity: 1,
        price: plan.price.amount
      }
    ],
    successCallbackRoute: subscriptionRenewalSuccessRoute,
    cancelCallbackRoute: subscriptionRenewalCancelRoute
  })

  if (renewalResult.success) {
    ctx.account.log('Subscription renewal initiated', {
      level: 'info',
      json: { subscriptionId }
    })
  } else {
    ctx.account.log('Subscription renewal failed', {
      level: 'warn',
      json: { subscriptionId, error: renewalResult.error }
    })

    // Отправляем уведомление пользователю о неудаче автопродления
    await sendDataToSocket(ctx, `user-${subscription.userId.id}`, {
      type: 'subscription-event',
      event: 'renewal-failed',
      subscriptionId: subscription.id,
      reason: renewalResult.error
    })
  }

  return renewalResult
})

// Обработчик успешного автопродления
const subscriptionRenewalSuccessRoute = app.function(
  '/renewal-success',
  async (ctx, params, callerInfo) => {
    validateCaller(callerInfo)

    const { attempt, payment } = params

    const subscription = await Subscriptions.findById(ctx, attempt.subject[1])
    if (!subscription) {
      return { success: false, error: 'Subscription not found' }
    }

    // Получаем тариф
    const plan = await SubscriptionPlans.findById(ctx, subscription.planId.id)
    if (!plan) {
      return { success: false, error: 'Plan not found' }
    }

    // Вычисляем новые даты
    const { generatePeriodOptions } = await import('../shared/subscription-periods')
    const periodOptions = generatePeriodOptions(
      plan.durationType as any,
      plan.durationValue,
      plan.calendarPeriod as any,
      plan.specificPeriodStart || undefined
    )

    // Выбираем следующий период после текущего endDate
    const currentEndDate = new Date(subscription.endDate)
    let nextPeriod = periodOptions.find((p) => new Date(p.startDate) > currentEndDate)

    // Если не нашли - берем первый доступный
    if (!nextPeriod) {
      nextPeriod = periodOptions[0]
    }

    // Обновляем подписку
    await Subscriptions.update(ctx, {
      id: subscription.id,
      startDate: nextPeriod.startDate,
      endDate: nextPeriod.endDate,
      lastPaymentId: payment.id,
      lastPaymentAt: new Date(),
      nextBillingDate: subscription.autoRenewal
        ? calculateNextBillingDateForPeriod(nextPeriod.endDate)
        : null,
      selectedPeriodStart: nextPeriod.startDate,
      selectedPeriodEnd: nextPeriod.endDate
    })

    // Уведомляем пользователя
    await sendDataToSocket(ctx, `user-${subscription.userId.id}`, {
      type: 'subscription-event',
      event: 'renewed',
      subscriptionId: subscription.id,
      newEndDate: nextPeriod.endDate.toISOString()
    })

    return { success: true }
  }
)

// Обработчик неудачи автопродления
const subscriptionRenewalCancelRoute = app.function(
  '/renewal-failed',
  async (ctx, params, callerInfo) => {
    validateCaller(callerInfo)

    const { attempt, error } = params

    const subscription = await Subscriptions.findById(ctx, attempt.subject[1])
    if (subscription) {
      // Отключаем автопродление при неудаче
      await Subscriptions.update(ctx, {
        id: subscription.id,
        autoRenewal: false,
        renewalPlanId: null
      })

      // Уведомляем пользователя
      await sendDataToSocket(ctx, `user-${subscription.userId.id}`, {
        type: 'subscription-event',
        event: 'renewal-failed',
        subscriptionId: subscription.id,
        reason: error?.message || 'Payment failed'
      })
    }

    return { success: true }
  }
)

// Job для отправки уведомлений об истечении подписки
const subscriptionExpiryWarningJob = app.job('/expiry-warning', async (ctx, params) => {
  const { subscriptionId } = params

  const subscription = await Subscriptions.findById(ctx, subscriptionId)
  if (!subscription || subscription.status !== 'active') {
    return { success: false }
  }

  // Получаем чаты тарифа
  const planChats = await PlanChats.findAll(ctx, { where: { planId: subscription.planId.id } })

  // Отправляем уведомление
  await sendDataToSocket(ctx, `user-${subscription.userId.id}`, {
    type: 'subscription-event',
    event: 'expiring-soon',
    subscriptionId: subscription.id,
    endDate: subscription.endDate.toISOString(),
    chatCount: planChats.length
  })

  return { success: true }
})

// Вспомогательные функции
function isExpiringSoon(subscription: { endDate: Date }, days: number = 3): boolean {
  const now = new Date()
  const warningDate = new Date(now)
  warningDate.setDate(warningDate.getDate() + days)

  return subscription.endDate <= warningDate && subscription.endDate >= now
}

function calculateNextBillingDate(subscription: { endDate: Date }): Date {
  // За 1 день до окончания
  const date = new Date(subscription.endDate)
  date.setDate(date.getDate() - 1)
  return date
}

function calculateNextBillingDateForPeriod(endDate: Date): Date {
  const date = new Date(endDate)
  date.setDate(date.getDate() - 1)
  return date
}

function formatPeriodLabel(startDate: Date, endDate: Date): string {
  return `${startDate.toLocaleDateString('ru-RU')} - ${endDate.toLocaleDateString('ru-RU')}`
}

// Планировщик для проверки подписок (вызывается раз в день)
export const apiChatSubscriptionsCheckExpiryRoute = app.get('/check-expiry', async (ctx, req) => {
  const now = new Date()

  // Находим истекшие подписки
  const expiredSubscriptions = await Subscriptions.findAll(ctx, {
    where: {
      status: 'active',
      endDate: { $lt: now }
    }
  })

  for (const sub of expiredSubscriptions) {
    await Subscriptions.update(ctx, {
      id: sub.id,
      status: 'expired'
    })

    // Получаем чаты тарифа
    const planChats = await PlanChats.findAll(ctx, { where: { planId: sub.planId.id } })

    // Уведомляем пользователя
    await sendDataToSocket(ctx, `user-${sub.userId.id}`, {
      type: 'subscription-event',
      event: 'expired',
      subscriptionId: sub.id,
      chatCount: planChats.length
    })
  }

  // Находим подписки, требующие автопродления (за 1 день до окончания)
  const renewalDate = new Date(now)
  renewalDate.setDate(renewalDate.getDate() + 1)

  const subscriptionsForRenewal = await Subscriptions.findAll(ctx, {
    where: {
      status: 'active',
      autoRenewal: true,
      nextBillingDate: { $lte: renewalDate }
    }
  })

  for (const sub of subscriptionsForRenewal) {
    await subscriptionRenewalJob.scheduleJobAsap(ctx, {
      subscriptionId: sub.id
    })
  }

  // Находим подписки, требующие предупреждения (за 3 дня до окончания)
  const warningDate = new Date(now)
  warningDate.setDate(warningDate.getDate() + 3)

  const subscriptionsForWarning = await Subscriptions.findAll(ctx, {
    where: {
      status: 'active',
      endDate: { $lte: warningDate, $gt: now }
    }
  })

  for (const sub of subscriptionsForWarning) {
    await subscriptionExpiryWarningJob.scheduleJobAsap(ctx, {
      subscriptionId: sub.id
    })
  }

  return {
    expired: expiredSubscriptions.length,
    renewed: subscriptionsForRenewal.length,
    warnings: subscriptionsForWarning.length
  }
})

// Получить все чаты, доступные по подпискам пользователя
export const apiChatSubscriptionsAccessibleChatsRoute = app.get(
  '/accessible-chats',
  async (ctx, req) => {
    requireRealUser(ctx)

    const subscriptions = await Subscriptions.findAll(ctx, {
      where: {
        userId: ctx.user.id,
        status: ['active', 'pending']
      }
    })

    const accessibleChats = []

    for (const sub of subscriptions) {
      const planChats = await PlanChats.findAll(ctx, {
        where: { planId: sub.planId.id }
      })

      for (const pc of planChats) {
        const chat = await Chats.findOneBy(ctx, { feedId: pc.feedId })
        if (chat) {
          accessibleChats.push({
            feedId: chat.feedId,
            title: chat.title,
            type: chat.type,
            avatarHash: chat.avatarHash,
            subscriptionId: sub.id,
            subscriptionEndDate: sub.endDate,
            planName: (await SubscriptionPlans.findById(ctx, sub.planId.id))?.name
          })
        }
      }
    }

    return accessibleChats
  }
)

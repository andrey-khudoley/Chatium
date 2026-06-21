import { requireAccountRole, findUserById } from '@app/auth';
import { sendDataToSocket } from '@app/socket';
import { sendNotificationToAccountOwners } from '@user-notifier/sdk';
import { captureCustomerEvent, ContactType } from '@crm/sdk';
import Subscriptions from '../tables/chat-subscriptions.table';
import SubscriptionPlans from '../tables/chat-subscription-plans.table';
import PlanChats from '../tables/chat-plan-chats.table';
import Chats from '../tables/chats.table';
import { createOrUpdateFeedParticipant, getFeedById } from '@app/feed';

// Ручное предоставление подписки администратором (без оплаты)
export const apiAdminGrantSubscriptionRoute = app.post('/grant', async (ctx, req) => {
  // Только администраторы воркспейса могут предоставлять подписки вручную
  requireAccountRole(ctx, 'Admin');

  const { userId, planId, startDate, endDate, note } = ctx.req.body;

  if (!userId || !planId) {
    throw new Error('Не указан пользователь или тариф');
  }

  // Проверяем существование пользователя
  const user = await findUserById(ctx, userId);
  if (!user) {
    throw new Error('Пользователь не найден');
  }

  // Получаем тариф
  const plan = await SubscriptionPlans.findById(ctx, planId);
  if (!plan || !plan.isActive) {
    throw new Error('Тариф не найден или неактивен');
  }

  // Определяем даты подписки
  const now = new Date();
  const subscriptionStartDate = startDate ? new Date(startDate) : now;
  const subscriptionEndDate = endDate ? new Date(endDate) : calculateDefaultEndDate(plan);

  // Проверяем, нет ли уже активной подписки на этот тариф у пользователя
  const existingSub = await Subscriptions.findOneBy(ctx, {
    planId: planId,
    userId: userId,
    status: ['active', 'pending']
  });

  if (existingSub) {
    throw new Error('У пользователя уже есть активная подписка на этот тариф');
  }

  // Создаем подписку
  const isPending = subscriptionStartDate > now;
  const subscription = await Subscriptions.create(ctx, {
    userId: userId,
    planId: plan.id,
    status: isPending ? 'pending' : 'active',
    startDate: subscriptionStartDate,
    endDate: subscriptionEndDate,
    autoRenewal: false, // Ручные подписки не продлеваются автоматически
    renewalPlanId: null,
    selectedPeriodStart: subscriptionStartDate,
    selectedPeriodEnd: subscriptionEndDate,
    cancelReason: note ? `Предоставлено администратором: ${note}` : 'Предоставлено администратором вручную'
  });

  // Если подписка активна (не pending) - добавляем пользователя во все чаты тарифа
  if (!isPending) {
    const planChats = await PlanChats.findAll(ctx, {
      where: { planId: plan.id }
    });

    for (const planChat of planChats) {
      try {
        const feed = await getFeedById(ctx, planChat.feedId);
        if (feed) {
          await createOrUpdateFeedParticipant(ctx, feed, userId, {
            role: 'guest'
          });
        }
      } catch (e) {
        ctx.account.log('Admin grant subscription: failed to add user to chat', {
          level: 'warn',
          json: { subscriptionId: subscription.id, chatId: planChat.feedId, error: e.message }
        });
      }
    }
  }

  // Получаем чаты тарифа для уведомлений
  const planChats = await PlanChats.findAll(ctx, {
    where: { planId: plan.id }
  });

  const chatIds = planChats.map(pc => pc.feedId);
  const chats = chatIds.length > 0
    ? await Chats.findAll(ctx, { where: { feedId: chatIds }, limit: 100 })
    : [];

  // Отправляем уведомление пользователю через WebSocket
  await sendDataToSocket(ctx, `user-${userId}`, {
    type: 'subscription-event',
    event: 'granted-by-admin',
    subscription: {
      id: subscription.id,
      planName: plan.name,
      startDate: subscriptionStartDate.toISOString(),
      endDate: subscriptionEndDate.toISOString(),
      chats: chats.map(c => ({
        feedId: c.feedId,
        title: c.title,
        type: c.type
      }))
    }
  });

  // Отправляем уведомление администраторам
  await sendNotificationToAccountOwners(ctx, {
    title: 'Подписка предоставлена вручную',
    html: `<p>Администратор ${ctx.user.displayName} предоставил подписку "${plan.name}" пользователю ${user.displayName}</p>
           ${note ? `<p>Примечание: ${note}</p>` : ''}
           <p>Период: ${subscriptionStartDate.toLocaleDateString('ru-RU')} - ${subscriptionEndDate.toLocaleDateString('ru-RU')}</p>`,
    plain: `Подписка "${plan.name}" предоставлена ${user.displayName}`,
    md: `Подписка "${plan.name}" предоставлена ${user.displayName}`
  });

  // Отправляем событие в CRM
  await captureCustomerEvent(ctx, {
    event: 'subscription_granted_by_admin',
    customer: {
      displayName: user.displayName
    },
    contacts: [
      { type: ContactType.Email, value: user.confirmedEmail },
      { type: ContactType.Phone, value: user.confirmedPhone }
    ].filter(c => c.value),
    linkRecords: [subscription],
    payload: {
      planName: plan.name,
      chatCount: chats.length,
      chatIds: chatIds,
      grantedBy: ctx.user.id,
      grantedByName: ctx.user.displayName,
      startDate: subscriptionStartDate.toISOString(),
      endDate: subscriptionEndDate.toISOString(),
      note: note || null
    }
  });

  return {
    success: true,
    subscription: {
      ...subscription,
      plan: {
        ...plan,
        chats: chats.map(c => ({
          feedId: c.feedId,
          title: c.title,
          type: c.type
        }))
      }
    }
  };
});

// Получить тарифы для конкретного чата (для админского интерфейса)
export const apiAdminGetChatPlansRoute = app.get('/chat-plans/:feedId', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin');

  const planChats = await PlanChats.findAll(ctx, {
    where: { feedId: req.params.feedId }
  });

  if (planChats.length === 0) {
    return { plans: [] };
  }

  const planIds = planChats.map(pc => typeof pc.planId === 'string' ? pc.planId : pc.planId?.id);
  const plans = await SubscriptionPlans.findAll(ctx, {
    where: {
      id: planIds,
      isActive: true
    },
    order: [{ sortOrder: 'asc' }]
  });

  return {
    plans: plans.map(p => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      durationType: p.durationType,
      durationValue: p.durationValue,
      calendarPeriod: p.calendarPeriod
    }))
  };
});

// Вспомогательная функция для расчета даты окончания по умолчанию
function calculateDefaultEndDate(plan: any): Date {
  const now = new Date();
  const endDate = new Date(now);

  switch (plan.durationType) {
    case 'days':
      endDate.setDate(endDate.getDate() + (plan.durationValue || 30));
      break;
    case 'months':
      endDate.setMonth(endDate.getMonth() + (plan.durationValue || 1));
      break;
    case 'years':
      endDate.setFullYear(endDate.getFullYear() + (plan.durationValue || 1));
      break;
    default:
      // По умолчанию - месяц
      endDate.setMonth(endDate.getMonth() + 1);
  }

  return endDate;
}

import { requireRealUser, requireAccountRole } from '@app/auth';
import { Money } from '@app/heap';
import SubscriptionPlans from '../tables/chat-subscription-plans.table';
import PlanChats from '../tables/chat-plan-chats.table';
import Chats from '../tables/chats.table';

// Получить активные тарифы (для пользователей)
export const apiSubscriptionPlansListRoute = app.get('/plans', async (ctx, req) => {
  const plans = await SubscriptionPlans.findAll(ctx, {
    where: {
      isActive: true
    },
    order: [{ sortOrder: 'asc' }]
  });

  // Подгружаем чаты для каждого тарифа
  const plansWithChats = await Promise.all(
    plans.map(async (plan) => {
      const planChatLinks = await PlanChats.findAll(ctx, {
        where: { planId: plan.id },
        order: [{ sortOrder: 'asc' }]
      });

      const chatIds = planChatLinks.map(link => link.feedId);
      const chats = chatIds.length > 0
        ? await Chats.findAll(ctx, {
            where: { feedId: chatIds },
            limit: 100
          })
        : [];

      return {
        ...plan,
        chatIds: chatIds,
        chats: chats.map(c => ({
          feedId: c.feedId,
          title: c.title,
          type: c.type,
          avatarHash: c.avatarHash
        }))
      };
    })
  );

  return { plans: plansWithChats };
});

// Получить все тарифы включая неактивные (только Admin)
export const apiSubscriptionPlansAllRoute = app.get('/plans/all', async (ctx, req) => {
  requireAccountRole(ctx, 'Admin');

  const plans = await SubscriptionPlans.findAll(ctx, {
    order: [{ sortOrder: 'asc' }]
  });

  // Подгружаем чаты для каждого тарифа
  const plansWithChats = await Promise.all(
    plans.map(async (plan) => {
      const planChatLinks = await PlanChats.findAll(ctx, {
        where: { planId: plan.id },
        order: [{ sortOrder: 'asc' }]
      });

      const chatIds = planChatLinks.map(link => link.feedId);
      const chats = chatIds.length > 0
        ? await Chats.findAll(ctx, {
            where: { feedId: chatIds },
            limit: 100
          })
        : [];

      return {
        ...plan,
        chatIds: chatIds,
        chats: chats.map(c => ({
          feedId: c.feedId,
          title: c.title,
          type: c.type,
          avatarHash: c.avatarHash
        }))
      };
    })
  );

  return { plans: plansWithChats };
});

// Получить тарифы для конкретного чата
export const apiSubscriptionPlansByChatRoute = app.get('/by-chat/:feedId/plans', async (ctx, req) => {
  // Находим все тарифы, которые включают этот чат
  const planChatLinks = await PlanChats.findAll(ctx, {
    where: { feedId: req.params.feedId }
  });

  if (planChatLinks.length === 0) {
    return [];
  }

  const planIds = planChatLinks.map(link => link.planId.id);
  const plans = await SubscriptionPlans.findAll(ctx, {
    where: {
      id: planIds,
      isActive: true
    },
    order: [{ sortOrder: 'asc' }]
  });

  return plans;
});

// Создать новый тариф
export const apiSubscriptionPlansCreateRoute = app.post('/plans/create', async (ctx, req) => {
  requireRealUser(ctx);
  requireAccountRole(ctx, 'Admin');

  const body = ctx.req.body;

  // Валидация
  if (!body.name || !body.durationType || !body.price) {
    throw new Error('Не заполнены обязательные поля');
  }

  if (!['days', 'months', 'years'].includes(body.durationType)) {
    throw new Error('Неверный тип длительности');
  }

  // Для месяцев проверяем тип периода
  if (body.durationType === 'months' && body.calendarPeriod === 'specific') {
    if (!body.specificPeriodStart || body.specificPeriodStart < 1 || body.specificPeriodStart > 12) {
      throw new Error('Укажите корректный месяц начала периода (1-12)');
    }
  }

  // Получаем максимальный sortOrder
  const existingPlans = await SubscriptionPlans.findAll(ctx, { limit: 100 });
  const maxOrder = existingPlans.length > 0
    ? Math.max(...existingPlans.map(p => p.sortOrder || 0))
    : 0;

  const plan = await SubscriptionPlans.create(ctx, {
    name: body.name,
    description: body.description || '',
    durationType: body.durationType,
    durationValue: body.durationValue || 1,
    calendarPeriod: body.calendarPeriod || 'current',
    specificPeriodStart: body.specificPeriodStart || null,
    price: new Money(body.price.amount, body.price.currency || 'RUB'),
    isActive: body.isActive !== false,
    allowAutoRenewal: body.allowAutoRenewal !== false,
    sortOrder: maxOrder + 1
  });

  // Добавляем чаты к тарифу
  if (body.chatIds && Array.isArray(body.chatIds) && body.chatIds.length > 0) {
    for (let i = 0; i < body.chatIds.length; i++) {
      await PlanChats.create(ctx, {
        planId: plan.id,
        feedId: body.chatIds[i],
        sortOrder: i
      });
    }
  }

  return {
    ...plan,
    chatIds: body.chatIds || [],
    chats: []
  };
});

// Обновить тариф
export const apiSubscriptionPlansUpdateRoute = app.post('/plans/:id/update', async (ctx, req) => {
  requireRealUser(ctx);
  requireAccountRole(ctx, 'Admin');

  const plan = await SubscriptionPlans.findById(ctx, req.params.id);
  if (!plan) {
    throw new Error('Тариф не найден');
  }

  const body = ctx.req.body;
  const updateData: any = { id: req.params.id };

  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.durationType !== undefined) updateData.durationType = body.durationType;
  if (body.durationValue !== undefined) updateData.durationValue = body.durationValue;
  if (body.calendarPeriod !== undefined) updateData.calendarPeriod = body.calendarPeriod;
  if (body.specificPeriodStart !== undefined) updateData.specificPeriodStart = body.specificPeriodStart;
  if (body.price !== undefined) {
    updateData.price = new Money(body.price.amount, body.price.currency || 'RUB');
  }
  if (body.isActive !== undefined) updateData.isActive = body.isActive;
  if (body.allowAutoRenewal !== undefined) updateData.allowAutoRenewal = body.allowAutoRenewal;
  if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

  const updated = await SubscriptionPlans.update(ctx, updateData);

  // Обновляем список чатов если передан
  if (body.chatIds !== undefined && Array.isArray(body.chatIds)) {
    // Удаляем старые связи
    const existingLinks = await PlanChats.findAll(ctx, {
      where: { planId: plan.id }
    });
    for (const link of existingLinks) {
      await PlanChats.delete(ctx, link.id);
    }

    // Создаем новые связи
    for (let i = 0; i < body.chatIds.length; i++) {
      await PlanChats.create(ctx, {
        planId: plan.id,
        feedId: body.chatIds[i],
        sortOrder: i
      });
    }
  }

  // Получаем обновленный список чатов
  const planChatLinks = await PlanChats.findAll(ctx, {
    where: { planId: plan.id },
    order: [{ sortOrder: 'asc' }]
  });

  const chatIds = planChatLinks.map(link => link.feedId);
  const chats = chatIds.length > 0
    ? await Chats.findAll(ctx, {
        where: { feedId: chatIds },
        limit: 100
      })
    : [];

  return {
    ...updated,
    chatIds: chatIds,
    chats: chats.map(c => ({
      feedId: c.feedId,
      title: c.title,
      type: c.type,
      avatarHash: c.avatarHash
    }))
  };
});

// Удалить тариф
export const apiSubscriptionPlansDeleteRoute = app.post('/plans/:id/delete', async (ctx, req) => {
  requireRealUser(ctx);
  requireAccountRole(ctx, 'Admin');

  const plan = await SubscriptionPlans.findById(ctx, req.params.id);
  if (!plan) {
    throw new Error('Тариф не найден');
  }

  // Удаляем связи с чатами
  const planChatLinks = await PlanChats.findAll(ctx, {
    where: { planId: plan.id }
  });
  for (const link of planChatLinks) {
    await PlanChats.delete(ctx, link.id);
  }

  await SubscriptionPlans.delete(ctx, req.params.id);

  return { success: true };
});

// Изменить порядок тарифов
export const apiSubscriptionPlansReorderRoute = app.post('/plans/reorder', async (ctx, req) => {
  requireRealUser(ctx);
  requireAccountRole(ctx, 'Admin');

  const { planIds } = ctx.req.body;
  if (!Array.isArray(planIds)) {
    throw new Error('Неверный формат данных');
  }

  for (let i = 0; i < planIds.length; i++) {
    await SubscriptionPlans.update(ctx, {
      id: planIds[i],
      sortOrder: i
    });
  }

  return { success: true };
});

// Добавить чат в тариф
export const apiSubscriptionPlansAddChatRoute = app.post('/plans/:id/add-chat', async (ctx, req) => {
  requireRealUser(ctx);
  requireAccountRole(ctx, 'Admin');

  const plan = await SubscriptionPlans.findById(ctx, req.params.id);
  if (!plan) {
    throw new Error('Тариф не найден');
  }

  const { feedId } = ctx.req.body;
  if (!feedId) {
    throw new Error('Не указан ID чата');
  }

  // Проверяем, не добавлен ли уже этот чат
  const existing = await PlanChats.findOneBy(ctx, {
    planId: plan.id,
    feedId: feedId
  });

  if (existing) {
    throw new Error('Этот чат уже добавлен в тариф');
  }

  // Получаем максимальный sortOrder
  const existingLinks = await PlanChats.findAll(ctx, {
    where: { planId: plan.id }
  });
  const maxOrder = existingLinks.length > 0
    ? Math.max(...existingLinks.map(l => l.sortOrder || 0))
    : 0;

  const link = await PlanChats.create(ctx, {
    planId: plan.id,
    feedId: feedId,
    sortOrder: maxOrder + 1
  });

  return link;
});

// Удалить чат из тарифа
export const apiSubscriptionPlansRemoveChatRoute = app.post('/plans/:id/remove-chat', async (ctx, req) => {
  requireRealUser(ctx);
  requireAccountRole(ctx, 'Admin');

  const plan = await SubscriptionPlans.findById(ctx, req.params.id);
  if (!plan) {
    throw new Error('Тариф не найден');
  }

  const { feedId } = ctx.req.body;
  if (!feedId) {
    throw new Error('Не указан ID чата');
  }

  const existing = await PlanChats.findOneBy(ctx, {
    planId: plan.id,
    feedId: feedId
  });

  if (!existing) {
    throw new Error('Этот чат не найден в тарифе');
  }

  await PlanChats.delete(ctx, existing.id);

  return { success: true };
});

// Получение опций периодов для тарифа
export const apiSubscriptionPlansPeriodsRoute = app.get('/plans/:id/periods', async (ctx, req) => {
  const plan = await SubscriptionPlans.findById(ctx, req.params.id);
  if (!plan) {
    throw new Error('Тариф не найден');
  }

  if (!plan.isActive) {
    throw new Error('Тариф неактивен');
  }

  const { generatePeriodOptions } = await import('../shared/subscription-periods');

  const options = generatePeriodOptions(
    plan.durationType as any,
    plan.durationValue,
    plan.calendarPeriod as any,
    plan.specificPeriodStart || undefined
  );

  return options.map(opt => ({
    ...opt,
    startDate: opt.startDate.toISOString(),
    endDate: opt.endDate.toISOString()
  }));
});

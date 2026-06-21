# 06. API — подписки и платежи

Таблицы: `SubscriptionPlans` (тарифы), `PlanChats` (тариф↔чат M:N), `Subscriptions` (подписки). Периоды — `generatePeriodOptions` из `shared/subscription-periods` (см. [03](03-shared-and-lib.md)).

> Роль админа — `requireAccountRole(ctx, 'Admin')` (с заглавной — **корректно** по 003-auth) первой строкой. `successUrl`/`cancelUrl` и любые ссылки — через `withProjectRoot(...)` (не хардкод `/tg#/...`). Дедуп подписки и переходы статусов — внутри `runWithExclusiveLock` (ключ `subscription-<userId>-<planId>` / `subscription-<id>`).

## @pay/sdk — контракты

```ts
runAttemptPayment(ctx, {
  subject,                       // объект подписки (запись Heap) → @pay сохраняет [tableTag, recordId]
  amount: [amount, currency],    // из plan.price.amount / plan.price.currency
  description, user,
  customer: { firstName, lastName, email: confirmedEmail, phone: confirmedPhone },
  items: [{ id: plan.id, name, quantity: 1, price }],
  successUrl, cancelUrl,         // withProjectRoot('./') + '#/subscriptions' (не хардкод)
  successCallbackRoute, cancelCallbackRoute,   // app.function-роуты ниже
}): { success, error?, result: { paymentId, paymentLink, attemptId } }

attemptAutoCharge(ctx, { subject, amount, description, userId, initedBy:'system', bySchedule:true, customer, items, successCallbackRoute, cancelCallbackRoute })   // автосписание сохранённой картой

getSavedCards(ctx, {}): { success, cards: [{ id, provider:{title}, cardMask, cardType }] }

validateCaller(callerInfo)       // ПЕРВОЙ строкой каждого app.function pay-callback; attempt.subject = [tableTag, recordId], subject[1] = subscriptionId
```

Доп. интеграции: `@crm/sdk` (`captureCustomerEvent`, `ContactType`), `@user-notifier/sdk` (`sendNotificationToAccountOwners`).

---

## api/chat-subscription-plans.ts — тарифы (CRUD)

| Роут | Метод/путь | Авторизация | Описание |
| --- | --- | --- | --- |
| `apiSubscriptionPlansListRoute` | GET `/plans` | публично | `{plans:(plan & {chatIds, chats:[{feedId,title,type,avatarHash}]})[]}`; только `isActive`, order sortOrder asc |
| `apiSubscriptionPlansAllRoute` | GET `/plans/all` | `'Admin'` | как выше, все планы |
| `apiSubscriptionPlansByChatRoute` | GET `/by-chat/:feedId/plans` | публично | активные планы, куда входит чат (`planIds=link.planId.id`) |
| `apiSubscriptionPlansCreateRoute` | POST `/plans/create` | `'Admin'` | см. ниже |
| `apiSubscriptionPlansUpdateRoute` | POST `/plans/:id/update` | `'Admin'` | частичное обновление + `chatIds?` (пересоздать PlanChats) |
| `apiSubscriptionPlansDeleteRoute` | POST `/plans/:id/delete` | `'Admin'` | удалить PlanChats + план |
| `apiSubscriptionPlansReorderRoute` | POST `/plans/reorder` | `'Admin'` | `{planIds}` → update sortOrder=i |
| `apiSubscriptionPlansAddChatRoute` | POST `/plans/:id/add-chat` | `'Admin'` | `{feedId}` (дедуп, throw `'уже добавлен'`) |
| `apiSubscriptionPlansRemoveChatRoute` | POST `/plans/:id/remove-chat` | `'Admin'` | `{feedId}` |
| `apiSubscriptionPlansPeriodsRoute` | GET `/plans/:id/periods` | публично | массив `{...opt, startDate:ISO, endDate:ISO}` через `generatePeriodOptions` |

**Create body** (`ctx.req.body`): `{name, durationType('days'/'months'/'years'), durationValue?, calendarPeriod?('current'/'specific'), specificPeriodStart?(1–12), price:{amount,currency?}, description?, isActive?, allowAutoRenewal?, chatIds?:string[]}`. Валидация: обязательны name/durationType/price; durationType из списка; для `months`+`specific` — `specificPeriodStart` 1–12. `price=new Money(amount, currency||'RUB')`. Создать `PlanChats` для каждого chatId (sortOrder=i).

---

## api/chat-subscriptions.ts

Поля подписки: `userId, planId, status, startDate, endDate, autoRenewal, renewalPlanId, selectedPeriodStart/End, lastPaymentId, lastPaymentAt, nextBillingDate, cancelledAt, cancelReason, chatId(legacy)`. Хелперы: `isExpiringSoon(sub, days=3)`, `calculateNextBillingDate(endDate)` (endDate−1 день), `formatPeriodLabel`.

### `apiChatSubscriptionGetRoute` — `GET /:feedId/subscription` (`requireRealUser`)
Планы чата (`PlanChats by feedId`), `Subscriptions.findOneBy({planId:planIds[], userId, status:['active','pending','expired']})`. `actualStatus` (endDate<now → 'expired'). Выход `{...subscription, status, plan:{...plan, chats[]}|null, isExpiringSoon}` или `null`.

### `apiChatSubscriptionsMyRoute` — `GET /my` (`requireRealUser`)
Все подписки юзера (active/pending/expired, order endDate desc) + план + чаты + `isExpiringSoon`.

### `apiChatSubscriptionCreateRoute` — `POST /subscribe` (`requireRealUser`)
Body `{planId, periodValue, autoRenewal=false}`.
1. Дедуп активной подписки (`'уже есть активная подписка'`).
2. Plan по id, проверка `isActive`.
3. `generatePeriodOptions(...)` → `selectedPeriod` по `periodValue` (иначе `'неверный период'`).
4. `isPending = startDate > now`.
5. `Subscriptions.create({userId, planId, status: pending?'pending':'active', startDate, endDate, autoRenewal: autoRenewal && plan.allowAutoRenewal, renewalPlanId: ...?plan.id:null, selectedPeriodStart/End})`.
6. `runAttemptPayment(ctx, {subject:subscription, amount:[plan.price.amount, plan.price.currency], description, user, customer, items:[{id:plan.id, name, quantity:1, price}], successUrl/cancelUrl: withProjectRoot(...) + '#/subscriptions', successCallbackRoute: subscriptionPaymentSuccessRoute, cancelCallbackRoute: subscriptionPaymentCancelRoute})`. Шаги 1–8 (дедуп→create→оплата) — внутри `runWithExclusiveLock`.
7. Если `!success` — удалить подписку, throw.
8. update подписки `lastPaymentId = result.paymentId`.
9. `captureCustomerEvent('subscription_created', ...)`.
Выход: `{subscription:{...,plan:{...,chats[]}}, paymentLink: result.paymentLink}`.

### `apiChatSubscriptionExtendRoute` — `POST /:subscriptionId/extend` (`requireRealUser`)
Body `{periodValue}`. `isExtension = endDate>=now` (продление от endDate либо возобновление). Посчитать `newStartDate/newEndDate`. `runAttemptPayment(..., successCallbackRoute: subscriptionExtensionSuccessRoute, cancelCallbackRoute: subscriptionExtensionCancelRoute)`. **Сохранить данные продления как JSON в `cancelReason`:** `{extensionPending, newStartDate, newEndDate, isExtension, periodValue, paymentAttemptId}`. Выход `{success, paymentLink, subscription:{...,newStartDate,newEndDate}}`.

### `apiChatSubscriptionCancelRoute` — `POST /:subscriptionId/cancel` (`requireRealUser`)
Отключить автопродление: update `{autoRenewal:false, renewalPlanId:null, cancelledAt:now, cancelReason: body.reason||'По запросу пользователя'}`. Выход `{success, message}`.

### `apiChatSubscriptionCheckAccessRoute` — `POST /:feedId/check-access` (**без** requireRealUser)
- нет `ctx.user` → `{hasAccess:false, reason:'not_auth'}`.
- чат не найден → `{hasAccess:false, reason:'not_found'}`.
- участник owner/admin → `{hasAccess:true, isPaid, isOwnerOrAdmin:true}`.
- чат не в тарифах (`PlanChats.length===0`): если `!isPaid` — доступ; иначе legacy `Subscriptions.findOneBy({chatId:feedId,...})` (pending/expired/active → reason).
- чат в тарифах: `Subscriptions.findOneBy({planId:planIds[], userId, status:['active','pending']})`. Нет → `{hasAccess:false, reason:'no_subscription', plans: plansWithChats, chat}`. pending → reason `'pending'`. endDate<now → update 'expired' + reason `'expired'` + plans. Иначе `{hasAccess:true, isPaid:true, subscription:{...,isExpiringSoon, plan:{name}}}`.
- Ответ включает `chat:{title,description,type,avatarHash,isPaid,participantsCount}`.

### `apiChatSubscriptionCardsRoute` — `GET /cards` (`requireRealUser`)
`getSavedCards(ctx,{})` → `{cards:[{id, displayName:'<provider.title> <cardMask||****>', cardType, provider}]}` или `{cards:[]}`.

### `apiChatSubscriptionsCheckExpiryRoute` — `GET /check-expiry` (публично, планировщик)
- active с `endDate<now` → 'expired' + WS `subscription-event/expired`.
- autoRenewal=true с `nextBillingDate<=now+1d` → `subscriptionRenewalJob.scheduleJobAsap`.
- `endDate<=now+3d && >now` → `subscriptionExpiryWarningJob.scheduleJobAsap`.
Выход `{expired, renewed, warnings}`.

### `apiChatSubscriptionsAccessibleChatsRoute` — `GET /accessible-chats` (`requireRealUser`)
Чаты по active/pending подпискам: `{feedId,title,type,avatarHash,subscriptionId,subscriptionEndDate,planName}`.

### Pay-callbacks (`app.function`, не экспорт-роуты, `validateCaller` первой строкой, `subject[1]`=subscriptionId)
- `subscriptionPaymentSuccessRoute` `/payment-success`: статус pending/active, `lastPaymentId/At`, `nextBillingDate`; если active — `createOrUpdateFeedParticipant(ctx, feed, userId, {role:'guest'})` по всем чатам тарифа; `sendNotificationToAccountOwners` («Новая подписка»).
- `subscriptionPaymentCancelRoute` `/payment-cancel`: удалить неоплаченную подписку.
- `subscriptionExtensionSuccessRoute` `/extension-success`: распарсить `cancelReason` JSON; update endDate (+startDate при возобновлении), `status:'active'`, очистить `cancelReason`; добавить участника во все чаты; WS `user-<id> {type:'subscription-event', event:'extended', subscriptionId, newEndDate}`; уведомить владельцев.
- `subscriptionExtensionCancelRoute` `/extension-cancel`: при active — очистить `cancelReason`.
- `subscriptionRenewalSuccessRoute` `/renewal-success`: посчитать следующий период, обновить даты; WS `event:'renewed'`.
- `subscriptionRenewalCancelRoute` `/renewal-failed`: отключить автопродление; WS `event:'renewal-failed'`.

### Jobs (`app.job`)
- `subscriptionRenewalJob` `/renewal` (`{subscriptionId}`): проверки active/autoRenewal/plan; `attemptAutoCharge(...successCallbackRoute: subscriptionRenewalSuccessRoute, cancelCallbackRoute: subscriptionRenewalCancelRoute)`. При неудаче WS `renewal-failed`.
- `subscriptionExpiryWarningJob` `/expiry-warning`: WS `event:'expiring-soon'` `{endDate, chatCount}`.

WS-канал подписок: `user-<userId>`, `type:'subscription-event'`, события `expired, renewed, renewal-failed, extended, expiring-soon, granted-by-admin`.

---

## api/admin-subscriptions.ts — ручная выдача (Admin)

### `apiAdminGrantSubscriptionRoute` — `POST /grant` (`requireAccountRole('Admin')`)
Body `{userId, planId, startDate?, endDate?, note?}`.
1. Проверки userId/planId, существование пользователя, активность плана.
2. `start = startDate||now`, `end = endDate || calculateDefaultEndDate(plan)` (now + durationValue по durationType, дефолт месяц).
3. Дедуп активной подписки.
4. `Subscriptions.create({..., status: isPending?'pending':'active', autoRenewal:false, renewalPlanId:null, cancelReason:'Предоставлено администратором...'})`.
5. Если active — добавить во все чаты тарифа (`createOrUpdateFeedParticipant role:'guest'`).
6. WS `user-<userId> {type:'subscription-event', event:'granted-by-admin', subscription:{id,planName,startDate,endDate,chats[]}}`.
7. `sendNotificationToAccountOwners` + `captureCustomerEvent('subscription_granted_by_admin', {...,grantedBy, note})`.
Выход `{success, subscription:{...,plan:{...,chats[]}}}`.

### `apiAdminGetChatPlansRoute` — `GET /chat-plans/:feedId` (`requireAccountRole('Admin')`)
`{plans:[{id,name,description,price,durationType,durationValue,calendarPeriod}]}` (активные планы чата).

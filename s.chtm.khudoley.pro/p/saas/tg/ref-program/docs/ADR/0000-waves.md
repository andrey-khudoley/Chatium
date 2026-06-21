# Волны разработки: от прототипа до релиза

План по **фичам** (таблица + репо + либа + API), не по слоям. Цель: **сегодня вечером — прототип**, **завтра — MVP**, далее бета → RC → релиз. Детали по файлам: [0000-plan.md](./0000-plan.md).

---

## Прототип (сегодня к вечеру)

**Цель:** Партнёр в Telegram получает ссылку; рефералы учитываются за партнёром; стандартные действия (регистрация, заказ, оплата) пишутся в систему.

### Фича 1: Кампании

**Что делаем:** Умеем создавать и хранить кампанию; проверять доступ пользователя.

- **Таблицы:** `campaigns`, `campaign_members`
- **Репо:** `campaignRepo.ts`, `memberRepo.ts`
- **Либа:** `shared/types.ts`, `shared/constants.ts`, `lib/core/refGenerator.ts`
- **API:** минимально `api/campaigns.ts` (create + list) или создание кампании вручную в Heap для прототипа

---

### Фича 2: Страницы и партнёрские ссылки

**Что делаем:** Одна (или несколько) целевая страница с URL-шаблоном; у партнёра есть уникальная ссылка на эту страницу.

- **Таблицы:** `pages`, `partner_links`
- **Репо:** `pageRepo.ts`, `linkRepo.ts`
- **Либа:** `lib/core/urlBuilder.ts` (подстановка `{ref}` в urlTemplate)
- **API:** для прототипа не обязательно — бот при /start создаёт/берёт link сам

---

### Фича 3: Визиты и редирект по ссылке

**Что делаем:** Клик по `/r~:linkId` → создаётся визит (fingerprint, ref) → редирект на целевой URL с ref в query.

- **Таблицы:** `visits`
- **Репо:** `visitRepo.ts`
- **Либа:** `lib/core/fingerprint.ts`, ref из refGenerator
- **Роут:** `r.tsx` — GET `/r~:linkId` → visitRepo.createVisit() → redirect(urlTemplate с ref)

---

### Фича 4: Telegram-бот

**Что делаем:** Партнёр пишет боту /start → создаётся/находится партнёр → в ответ приходит ссылка (и при желании краткая статистика).

- **Таблицы:** `bots`, `bot_updates`, `partners`
- **Репо:** `botRepo.ts`, `partnerRepo.ts` (+ использование linkRepo для выдачи ссылки)
- **Либа:** `lib/telegram/botHandler.ts`, `messages.ts`, `keyboards.ts`
- **Hook:** `hook/telegram.ts` — принять webhook, сохранить update, вызвать handler; в handler при /start — getOrCreatePartner → взять/создать partner_link → отправить сообщение со ссылкой

---

### Фича 5: Рефералы и стандартные события

**Что делаем:** Внешняя система шлёт webhook с ref → создаётся/обновляется реферал, пишется событие (регистрация/заказ/оплата), обновляется статистика партнёра.

- **Таблицы:** `referrals`, `registrations`, `orders`, `payments`
- **Репо:** `referralRepo.ts`, `eventRepo.ts`
- **Либа:** `lib/core/attribution.ts` (по ref найти visit → partner)
- **Hooks:** `hook/register.ts`, `hook/order.ts`, `hook/payment.ts` — query `key` + `ref`, body — данные; идемпотентность по orderId/внешнему id

**Критерий прототипа:** Бот даёт ссылку → клик → редирект с ref → webhook’и с ref создают реферала и события за партнёром.

---

## MVP (завтра)

**Цель:** Веб-админка: кампании, приглашения, страницы, бот; просмотр партнёров и рефералов.

### Фича 6: Веб — кампании и приглашения

**Что делаем:** Список кампаний пользователя, создание кампании, приглашение по токену, принятие приглашения.

- **Таблицы:** `campaign_invites` (если ещё нет)
- **Репо:** расширение campaignRepo/memberRepo под приглашения
- **API:** `api/campaigns.ts` (полный CRUD), `api/members.ts`, `api/invites.ts`
- **Страницы:** `index.tsx`, `pages/IndexPage.vue`; `invite.tsx`, `pages/InvitePage.vue`
- **Компоненты:** Layout (Sidebar, Header, PageContainer), CampaignForm, ConfirmModal

---

### Фича 7: Веб — страницы и ссылки

**Что делаем:** Админ добавляет целевые страницы (URL-шаблон); просмотр партнёрских ссылок.

- **API:** `api/pages.ts`, `api/links.ts`
- **Страницы:** `pages/PagesPage.vue`, `components/Forms/PageForm.vue`

---

### Фича 8: Веб — бот

**Что делаем:** Подключение бота к кампании (токен, webhook URL).

- **API:** `api/bot.ts`
- **Страницы:** `pages/BotPage.vue`, `components/Forms/BotForm.vue`

---

### Фича 9: Админка — партнёры и рефералы

**Что делаем:** Дашборд кампании, список партнёров, профиль партнёра, список рефералов, лог событий реферала.

- **API:** `api/partners.ts`, `api/referrals.ts`, `api/analytics.ts`
- **Страницы:** `campaign.tsx`, `pages/CampaignPage.vue`, `pages/PartnersPage.vue`, `pages/PartnerProfilePage.vue`, `pages/ReferralsPage.vue`
- **Компоненты:** DataTable, Pagination, StatsCard, EventLogModal

**Критерий MVP:** Админ создаёт кампанию, подключает бота, добавляет страницы; в админке видны партнёры и рефералы.

---

## Бета

### Фича 10: Custom-события и настройки кампании

**Что делаем:** Типы custom-событий, webhook для custom; настройки кампании (webhook URL, лимиты, логи).

- **Таблицы:** `custom_event_types`
- **Репо:** customEventRepo (по плану)
- **API/Hooks:** `hook/custom.ts`, `api/events.ts`
- **Страницы:** `pages/EventsPage.vue`, `EventForm.vue`, `pages/SettingsPage.vue`

---

### Фича 11: Telegram Mini App

**Что делаем:** Партнёр из бота открывает Mini App — свои ссылки и аналитика.

- **Роуты:** `miniapp/index.tsx`, `links.tsx`, `analytics.tsx`
- **Страницы Mini App:** MiniAppHome, MyLinksPage, CreateLinkPage, LinkDetailsPage

---

### Фича 12: Существующие клиенты

**Что делаем:** Список «уже клиентов»; при регистрации по ref можно не считать рефералом, если он в списке (requireNewClient).

- **Таблицы:** `existing_clients`
- **Репо:** existingClientRepo; доработка логики в eventRepo/register
- **API:** `api/existing-clients.ts`
- **Страницы:** `pages/ExistingClientsPage.vue`

---

## RC (Release Candidate)

### Фича 13: Тесты и финализация

**Что делаем:** Unit (репо, attribution), интеграция (API, webhook’и), E2E-сценарий; ручной прогон полного цикла.

- **Файлы:** `tests/index.tsx`, `tests/ai.tsx`, `tests/api/run-tests.ts`, `tests/pages/TestsPage.vue`, `tests/shared/test-definitions.ts`

---

## Релиз

### Фича 14: Документация и чеклисты

**Что делаем:** `.CHATIUM-LLM.md`, описание API и webhook’ов; чеклисты деплой/мониторинг; релизный тег и описание изменений.

---

## Шпаргалка по дням

| День    | Фокус        | Фичи (номера)                                                    |
| ------- | ------------ | ---------------------------------------------------------------- |
| Сегодня | **Прототип** | 1–5 (кампании → ссылки → визиты → бот → рефералы и события)      |
| Завтра  | **MVP**      | 6–9 (веб: кампании, страницы, бот; админка: партнёры и рефералы) |
| Дальше  | **Бета**     | 10–12 (custom + настройки, Mini App, существующие клиенты)       |
| Потом   | **RC**       | 13 (тесты, финализация)                                          |
| Релиз   | **Release**  | 14 (документация, чеклисты)                                      |

Каждый шаг = одна фича (таблица + репо + либа + API/роут/hook). Детали по полям таблиц и сигнатурам — в [0000-plan.md](./0000-plan.md).

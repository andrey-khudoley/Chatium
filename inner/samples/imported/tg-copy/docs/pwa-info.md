# PWA-ликбез на примере `tg-copy`

Пошаговый разбор для джуна: как обычное веб-приложение превращается в **PWA** (Progressive Web App). Читаешь сверху вниз — и проходишь весь путь от «сайта в браузере» до «приложения с иконкой на телефоне и пушами».

Все примеры — из реального кода этого мессенджера. Файлы кликабельны.

---

## 0. Что такое PWA и зачем оно

**PWA** — это обычное веб-приложение, к которому добавили несколько технологий, чтобы оно вело себя как нативное (установленное) приложение:

1. **Устанавливается** на главный экран телефона / рабочий стол (своя иконка, запуск без браузерной строки).
2. **Работает в фоне** через *service worker* — может показывать уведомления, даже когда вкладка закрыта.
3. **Получает push-уведомления** о новых событиях.
4. (Опционально) **работает офлайн** за счёт кэша.

Важно сразу понять: **PWA — это не фреймворк и не «режим»**. Это набор из трёх кирпичиков, которые добавляются к существующему сайту:

| Кирпичик | Файл-носитель | За что отвечает |
| --- | --- | --- |
| **Web App Manifest** | [../manifest.json.ts](../manifest.json.ts) | «паспорт» приложения: имя, иконки, цвет, режим запуска → **установка** |
| **Service Worker** | [../firebase-messaging-sw.js](../firebase-messaging-sw.js) | фоновый скрипт-посредник → **push + кэш** |
| **Push (FCM)** | [../api/push/](../api/push/) + [../lib/jwt-rs256.ts](../lib/jwt-rs256.ts) | доставка уведомлений на устройство |

Дальше идём по шагам и добавляем их по одному.

---

## Шаг 0. Точка старта — обычное веб-приложение

До всякого PWA у нас уже есть рабочее SPA:

- [../index.tsx](../index.tsx) — серверный роут, который отдаёт одну HTML-страницу и монтирует Vue-приложение `<App>`.
- [../App.vue](../App.vue) — корневой компонент, рисует список чатов и переписку.

Если открыть это в браузере — работает как обычный сайт: вкладка с адресной строкой, при закрытии вкладки всё «умирает», уведомлений нет. Наша цель — превратить **это же самое** в устанавливаемое приложение, ничего не переписывая, только **добавляя** слои.

---

## Шаг 1. Делаем приложение «устанавливаемым» — Web App Manifest

**Проблема:** браузер не знает, что наш сайт — это «приложение». Он не предложит его установить, у него нет имени и иконки.

**Решение:** добавить **манифест** — JSON-файл с метаданными. Браузер его читает и понимает: «о, это можно установить».

В нашем проекте манифест отдаётся не статическим файлом, а **роутом** [../manifest.json.ts](../manifest.json.ts):

```ts
export const manifestRoute = app.get('/', async (ctx, req) => {
  const manifest = {
    name: 'Chatium Chat',          // полное имя (экран установки)
    short_name: 'Chat',            // короткое имя (под иконкой)
    description: 'Современный мессенджер...',
    start_url: '/tg/',             // что открыть при запуске с иконки
    scope: '/tg/',                 // какие URL «принадлежат» приложению
    display: 'standalone',         // ← КЛЮЧ: запуск БЕЗ браузерной строки
    orientation: 'portrait-primary',
    background_color: '#f0f2f5',   // фон splash-экрана
    theme_color: '#008069',        // цвет статус-бара
    lang: 'ru', dir: 'ltr',
    icons: [ /* 72→512 px, включая один с purpose: 'maskable' */ ],
    shortcuts: [ { name: 'Новый чат', url: '/tg/' } ], // быстрые действия
    categories: ['social', 'communication'],
  }
  return ctx.resp
    .status(200)
    .headers({ 'Content-Type': 'application/manifest+json; charset=utf-8' })
    .json(manifest)
})
```

Разберём **ключевые поля**, чтобы понять, что каждое даёт:

- **`display: 'standalone'`** — главное. Именно оно убирает адресную строку и кнопки браузера. Без него установка тоже возможна, но откроется просто вкладка.
- **`start_url` / `scope`** — `start_url` это «домашняя страница» приложения (что открыть с иконки), а `scope` — это «забор»: ссылки внутри `scope` открываются внутри приложения, ссылки наружу — в браузере.
- **`icons`** — массив иконок разных размеров. ОС берёт подходящий размер для иконки на экране, в шторке уведомлений и т.д. `purpose: 'maskable'` — иконка, которую система может обрезать под свою форму (круг/сквиркл) без потери смысла.
- **`theme_color` / `background_color`** — цвет статус-бара и splash-экрана при запуске.
- **`shortcuts`** — пункты меню по долгому нажатию на иконку (здесь — «Новый чат»).

**Чтобы браузер нашёл манифест**, его подключают в `<head>` страницы — это делает [../index.tsx](../index.tsx):

```html
<link rel="manifest" href="/tg/manifest.json" />
```

> 🔧 **По правилам платформы** этот путь нельзя хардкодить — нужно `withProjectRoot(manifestRoute.url())`. См. [diff.md](diff.md), пункт 1.3. Но идея та же: в `<head>` появляется `<link rel="manifest">`.

**Итог шага 1:** браузер теперь видит «приложение» и в меню появляется «Установить». После установки — иконка на экране и запуск в полноэкранном режиме.

---

## Шаг 2. Доводим «нативность» — meta-теги (особенно для iOS)

**Проблема:** манифест отлично понимает Android/Chrome, но **Safari на iOS** исторически читает не манифест, а свои `apple-`мета-теги.

**Решение:** добавить в `<head>` дублирующие meta-теги. В [../index.tsx](../index.tsx):

```html
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover" />
<meta name="theme-color" content="#008069" />
<meta name="apple-mobile-web-app-capable" content="yes" />            <!-- полноэкранный режим на iOS -->
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="Chatium Chat" />    <!-- имя под иконкой на iOS -->
<meta name="mobile-web-app-capable" content="yes" />
<meta name="application-name" content="Chatium Chat" />
<link rel="apple-touch-icon" sizes="180x180" href="https://fs.chatium.ru/get/image_msk_AaplkedAT7" />
<!-- ...и ещё несколько размеров apple-touch-icon и favicon -->
```

Что важно для джуна:

- **`viewport-fit=cover`** — растягивает приложение под «чёлку»/закруглённые углы экрана.
- **`apple-mobile-web-app-capable: yes`** + **`apple-touch-icon`** — без них на iPhone установленное приложение откроется как вкладка Safari, а не в полный экран.
- Эти теги **дублируют** часть манифеста, но это нормальная плата за совместимость с iOS.

**Итог шага 2:** приложение одинаково «по-нативному» устанавливается и на Android, и на iOS.

> На этом этапе у нас уже **«installable PWA»**: устанавливается, имеет иконку, запускается в полный экран. Но пока оно ещё не умеет работать в фоне. Для этого нужен service worker.

---

## Шаг 3. Service Worker — мозг PWA

**Что это такое (простыми словами):** service worker (SW) — это **отдельный JS-скрипт, который браузер запускает в фоне**, отдельно от вкладки. Он живёт, даже когда вкладка закрыта, и умеет:

- перехватывать сетевые запросы страницы (для кэша/офлайна);
- получать push-сообщения и показывать уведомления;
- реагировать на клик по уведомлению.

Аналогия: обычный JS в странице — это **официант** (работает, пока ты за столиком). Service worker — это **дежурный на ресепшене**, который остаётся на месте и принимает звонки, даже когда ты ушёл.

**Важные свойства SW (запомни сразу):**
- работает только по **HTTPS** (или `localhost`);
- у него **нет доступа к DOM** (он не может потрогать страницу напрямую — только через сообщения `postMessage`);
- у него есть **scope** — он контролирует только страницы «ниже» себя по пути.

### 3.1. Регистрация SW

Сначала страница должна **зарегистрировать** воркер. Это делает [../App.vue](../App.vue) в методе `registerServiceWorker()`:

```js
if ('serviceWorker' in navigator) {
  const registration = await navigator.serviceWorker.register(
    '/tg/firebase-messaging-sw.js',          // путь к файлу воркера
    { scope: getAppBasePath() }              // зона ответственности — '/tg/'
  )
}
```

Браузер скачивает файл [../firebase-messaging-sw.js](../firebase-messaging-sw.js) и запускает его в фоне.

### 3.2. Жизненный цикл SW

У воркера есть строгий жизненный цикл из событий. В нашем файле:

```js
// 1) INSTALL — воркер установился. Здесь кэшируют статику.
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)))
  self.skipWaiting()                          // не ждать — активироваться сразу
})

// 2) ACTIVATE — воркер активировался. Здесь чистят старые кэши.
self.addEventListener('activate', (event) => {
  event.waitUntil(/* удалить старые версии кэша */ Promise.resolve())
  self.clients.claim()                        // взять под контроль уже открытые вкладки
})

// 3) FETCH — воркер перехватывает каждый сетевой запрос страницы.
self.addEventListener('fetch', (event) => { /* см. шаг 4 */ })
```

Два важных приёма:
- **`skipWaiting()`** — по умолчанию новый воркер ждёт, пока закроются все старые вкладки. Этот вызов говорит «активируйся немедленно».
- **`clients.claim()`** — берёт под управление уже открытые вкладки, не дожидаясь перезагрузки.

`CACHE_NAME = 'tg-chat-v4'` — версия кэша. Когда меняешь логику кэширования, **меняешь номер** (`v4`→`v5`), и в `activate` старый кэш удаляется. Это стандартный способ «выкатить» новый воркер.

**Итог шага 3:** у приложения появился фоновый «дежурный», готовый кэшировать и принимать push.

---

## Шаг 4. Кэширование — как SW ускоряет загрузку (и где границы офлайна)

Событие **`fetch`** срабатывает на **каждый** запрос страницы (картинки, скрипты, API). Воркер может ответить из кэша вместо сети. В нашем файле — стратегия **cache-first** для статики:

```js
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return            // только GET
  const url = new URL(event.request.url)
  if (url.origin !== self.location.origin) return        // не трогаем чужие домены
  if (event.request.mode === 'navigate') return          // не кэшируем переходы
  if (url.pathname.includes('/api/')) return             // не кэшируем API

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached                          // ← есть в кэше → отдаём мгновенно
      return fetch(event.request).then((resp) => {       // ← нет → идём в сеть
        if (resp.status === 200) {
          const copy = resp.clone()
          caches.open(CACHE_NAME).then(c => c.put(event.request, copy)) // и кладём в кэш
        }
        return resp
      }).catch(() => undefined)                          // сеть упала → ничего
    })
  )
})
```

Как читать эту логику:
1. **Cache-first**: если ресурс уже в кэше — отдаём из кэша (быстро, без сети). Если нет — качаем и попутно кладём в кэш.
2. Намеренно **не кэшируются**: API-запросы (`/api/`), переходы между страницами (`navigate`), чужие домены.

> ⚠️ **Это НЕ полноценный офлайн.** Воркер кэширует только иконки/часть статики. Если сеть упала — `catch(() => undefined)` возвращает «ничего», а не офлайн-страницу. То есть **без интернета приложение не работает**: сообщения не читаются и не отправляются, история недоступна. Это сознательное ограничение этого проекта (см. [diff.md](diff.md), п. 12 и [07-subsystems.md](07-subsystems.md)).

**Итог шага 4:** повторные загрузки чуть быстрее, но офлайн-режима нет. Главная ценность воркера здесь — следующий шаг.

---

## Шаг 5. Push-уведомления — главная фишка этого PWA

Это самая ценная часть. Цель: **когда пользователю пришло сообщение, а приложение закрыто — показать уведомление на телефоне**.

Для этого используется **FCM (Firebase Cloud Messaging)** — сервис Google, который доставляет push на устройства. Схема в целом такая:

```
[Браузер] получает у Firebase персональный "адрес устройства" (FCM-токен)
   │
   ▼
[Наш сервер] сохраняет токен у себя в БД
   │  (когда есть новое сообщение)
   ▼
[Наш сервер] → [Серверы Google FCM] → [Устройство пользователя] → Service Worker показывает уведомление
```

Разберём по частям.

### 5.1. Получение FCM-токена и подписка

В [../App.vue](../App.vue):

```js
// 1. Инициализируем Firebase в браузере (ключи — в firebase-config.js)
const messaging = firebase.messaging()

// 2. Просим у Firebase токен этого устройства (привязан к нашему service worker)
const token = await messaging.getToken({ serviceWorkerRegistration: swRegistration })

// 3. Отправляем токен на наш сервер, чтобы он знал, куда слать push
await apiPushSubscribeFCMRoute.run(ctx, { token, deviceInfo })
```

**FCM-токен** — это уникальный «почтовый адрес» конкретного браузера на конкретном устройстве. Зная его, сервер сможет адресно доставить push.

### 5.2. Хранение токена на сервере

[../api/push/subscribe-fcm.ts](../api/push/subscribe-fcm.ts) сохраняет токен в Heap-таблицу `push_subscriptions`:

```ts
export const apiPushSubscribeFCMRoute = app.post('/').body(/* {token, deviceInfo?} */).handle(async (ctx, req) => {
  requireRealUser(ctx)
  // дедуп: один и тот же токен не плодим
  const existing = await PushSubscriptions.findOneBy(ctx, { $and: [{ userId: ctx.user.id }, { endpoint: req.body.token }] })
  if (existing) { /* update */ }
  else await PushSubscriptions.create(ctx, {
    endpoint: req.body.token,
    subscriptionData: { fcmToken: req.body.token, deviceInfo: req.body.deviceInfo },
    userId: ctx.user.id,
  })
  return { success: true }
})
```

Теперь у сервера есть связка **пользователь → токен(ы) его устройств**.

### 5.3. Отправка push при новом сообщении

Когда кто-то отправляет сообщение ([../api/messages.ts](../api/messages.ts)), сервер вызывает [../api/push/send-fcm.ts](../api/push/send-fcm.ts). Тот:

```ts
// 1. Берёт токены получателей из push_subscriptions
const subs = await PushSubscriptions.findAll(ctx, { userId: userIds })

// 2. Аутентифицируется в Google: подписывает JWT и меняет его на access_token
const jwt = await generateJWT(serviceAccount.client_email, serviceAccount.private_key) // lib/jwt-rs256.ts
const accessToken = await getAccessToken(jwt)

// 3. Для каждого токена шлёт запрос в FCM v1
await request({
  method: 'post',
  url: `https://fcm.googleapis.com/v1/projects/${project_id}/messages:send`,
  headers: { Authorization: `Bearer ${accessToken}` },
  body: {
    message: {
      token: fcmToken,
      data: {                       // ← ТОЛЬКО data, без notification!
        title: '...', body: '...', chatId: '...', url: '/tg', icon: '/tg/icons/icon-192.png',
      },
    },
  },
})
```

Два момента, которые надо понять джуну:

1. **Аутентификация через JWT** ([../lib/jwt-rs256.ts](../lib/jwt-rs256.ts)). Google не пустит слать push «просто так» — нужно доказать, что мы владеем проектом Firebase. Для этого берётся **сервис-аккаунт** (`client_email` + `private_key`), им подписывается JWT (алгоритм RS256), и Google меняет этот JWT на временный `access_token`. Дальше токен идёт в заголовке `Authorization: Bearer ...`.

2. **Payload только `data`, без `notification`** — это специально. Если в payload есть поле `notification`, то на iOS-PWA система может показать уведомление сама и **не разбудить наш service worker**. А «data-only» сообщение всегда передаётся воркеру, и он сам решает, как показать уведомление. Это ключ к работе push на iPhone.

> «Невалидные» токены (`UNREGISTERED`/`NOT_FOUND`) сервер сам удаляет из таблицы — пользователь переустановил приложение, старый токен больше не нужен.

### 5.4. Показ уведомления воркером

Когда push долетел до устройства, просыпается service worker [../firebase-messaging-sw.js](../firebase-messaging-sw.js):

```js
messaging.onBackgroundMessage((payload) => {
  const title = payload.data?.title || 'Новое сообщение'
  self.registration.showNotification(title, {
    body: payload.data?.body,
    icon: payload.data?.icon || '/tg/icons/icon-192.png',
    badge: '/tg/icons/icon-192.png',
    data: { url: payload.data?.url || '/tg', chatId: payload.data?.chatId },
    vibrate: [200, 100, 200],
    tag: payload.data?.chatId ? `chat-${payload.data.chatId}` : `push-${Date.now()}`,
    renotify: true,
  })
})
```

- **`showNotification`** — собственно вывод уведомления в системную шторку.
- **`tag`** — группировка: уведомления из одного чата схлопываются в одно (`chat-<id>`), а не засыпают экран.
- **`vibrate`** — вибро-паттерн.

**Итог шага 5:** пользователь получает пуш о новом сообщении, даже когда приложение полностью закрыто.

---

## Шаг 6. Клик по уведомлению → переход в нужный чат

Уведомление бесполезно, если по нему некуда нажать. Воркер ловит клик:

```js
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const urlToOpen = event.notification.data?.url || '/tg'
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // если приложение уже открыто — фокусируем и говорим ему, какой чат открыть
      for (const client of clients) {
        if (client.url.includes(urlToOpen)) {
          client.focus()
          return client.postMessage({ type: 'navigate-to-chat', chatId: event.notification.data.chatId })
        }
      }
      // иначе — открываем новое окно
      return self.clients.openWindow(urlToOpen)
    })
  )
})
```

Вот зачем нужен `postMessage`: у воркера **нет доступа к DOM**, он не может сам открыть чат. Он лишь **сообщает странице** (`{type:'navigate-to-chat', chatId}`), а уже Vue-приложение в [../App.vue](../App.vue) ловит это сообщение и переключает экран на нужный чат.

**Итог шага 6:** тап по пушу открывает приложение прямо на нужной переписке.

---

## Шаг 7. iOS-специфика и баннер «включить уведомления»

Последние штрихи, которые делает [../App.vue](../App.vue):

- **Баннер включения push** (`checkPushBanner` / `handleEnablePush` / `dismissPushBanner`). Браузер запрашивает разрешение на уведомления только по «жесту пользователя», поэтому показывается баннер с кнопкой. Отказ запоминается в `localStorage['push-banner-dismissed']`.
- **На iOS push работает только в установленном (standalone) PWA** — не в обычной вкладке Safari. Поэтому на iPhone сначала «установи на экран», потом включай уведомления. Код это учитывает.
- **`onMessage`** (не `onBackgroundMessage`) — когда приложение **открыто**, push приходит в саму страницу, и можно показать своё уведомление + обновить счётчики (`loadInboxBadges`). То есть «фоновое» уведомление рисует воркер, «активное» — сама страница.

---

## Полная картина потока

```
УСТАНОВКА
  manifest.json + apple-meta  ──►  браузер предлагает «Установить»  ──►  иконка на экране, standalone-запуск

ПОДПИСКА НА PUSH (при запуске)
  App.vue → firebase.messaging().getToken()  ──►  apiPushSubscribeFCMRoute  ──►  push_subscriptions (БД)

ДОСТАВКА PUSH (пришло сообщение)
  messages.ts → send-fcm.ts
     → generateJWT (сервис-аккаунт) → getAccessToken (Google OAuth2)
     → POST fcm.googleapis.com/.../messages:send  (payload: data-only)
        ──►  Google FCM  ──►  устройство

ПОКАЗ И КЛИК
  service worker: onBackgroundMessage → showNotification
                  notificationclick → focus + postMessage('navigate-to-chat') / openWindow
```

---

## Что PWA здесь даёт, а чего — нет

**Даёт:**
- ✅ Установку на телефон/десктоп, запуск в полный экран со своей иконкой (как нативный мессенджер).
- ✅ Push-уведомления о новых сообщениях при закрытом приложении (Android и iOS-standalone).
- ✅ Переход в нужный чат по клику на уведомление.
- ✅ Чуть быстрее повторные загрузки (кэш иконок/статики).

**Не даёт (важно для ожиданий):**
- ❌ **Офлайн-режим** — без сети приложение не работает; история недоступна.
- ❌ **Фоновую синхронизацию сообщений** — в фоне приходит только уведомление, сами сообщения подгружаются при открытии (через WebSocket/REST).
- ❌ Live-обновления в открытом приложении — это делает **WebSocket**, а не PWA; push нужен именно для «закрытого» состояния.

---

## Чек-лист «из веб-приложения в PWA»

Если будешь делать PWA с нуля — вот тот же путь списком:

1. [ ] Рабочее веб-приложение по HTTPS.
2. [ ] `manifest.json` с `name`, `icons`, `start_url`, `scope`, `display: 'standalone'`, `theme_color`.
3. [ ] `<link rel="manifest">` в `<head>` + `apple-`meta-теги и `apple-touch-icon` для iOS.
4. [ ] Иконки нужных размеров (минимум 192 и 512, желательно `maskable`).
5. [ ] `service-worker.js` + регистрация (`navigator.serviceWorker.register`).
6. [ ] В воркере: `install`/`activate` (+ `skipWaiting`/`clients.claim`), стратегия кэша в `fetch`.
7. [ ] Push: получить токен (`getToken`) → сохранить на сервере → уметь слать (FCM v1 + JWT сервис-аккаунта).
8. [ ] В воркере: `onBackgroundMessage` → `showNotification`, `notificationclick` → открыть/сфокусировать.
9. [ ] Запрос разрешения на уведомления по жесту пользователя.
10. [ ] (Опц.) офлайн-страница и более агрессивный кэш — **в этом проекте не сделано**.

---

## Мини-глоссарий

- **PWA** — веб-приложение + манифест + service worker, ведущее себя как нативное.
- **Manifest** — JSON-«паспорт» приложения (имя, иконки, режим запуска).
- **Service Worker (SW)** — фоновый скрипт-посредник; работает без открытой вкладки, перехватывает запросы и push; не имеет доступа к DOM.
- **Scope** — зона URL, которой управляет SW/приложение.
- **standalone** — режим запуска без браузерного интерфейса.
- **FCM** — Firebase Cloud Messaging, сервис доставки push от Google.
- **FCM-токен** — уникальный адрес конкретного устройства/браузера для push.
- **JWT / сервис-аккаунт** — способ серверу аутентифицироваться в Google, чтобы слать push.
- **data-only payload** — push без поля `notification`, чтобы уведомление всегда обрабатывал наш SW (нужно для iOS).
- **cache-first** — стратегия: сначала смотрим кэш, потом сеть.

---

## Как пощупать самому (DevTools)

В Chrome открой **DevTools → вкладка Application**:
- **Manifest** — видно поля манифеста и предупреждения (нет иконки нужного размера и т.п.).
- **Service Workers** — статус воркера, кнопки `Update`/`Unregister`, чекбокс `Offline` для теста.
- **Cache Storage** — что реально лежит в кэше (`tg-chat-v4`).
- **Application → Notifications** — отправить тестовое уведомление.

---

## Что нужно настроить, чтобы push заработал

В этом sample push-инфраструктура есть, но требует ключей (см. [09-api-push.md](spec/09-api-push.md)):
1. [../firebase-config.js](../firebase-config.js) — клиентский конфиг Firebase (сейчас плейсхолдеры `YOUR_*`).
2. [../api/push/send-fcm.ts](../api/push/send-fcm.ts) — `serviceAccount` (`project_id`, `private_key`, `client_email`).
3. Иконки `icons/icon-192.png` и `icons/icon-512.png`.

> Историческая путаница: старая `.CHATIUM-LLM.md` пишет «Service Worker удалён, push не используются» — это **устаревшая запись**. В коде и SW, и push присутствуют и описаны выше.

---
_Учебный документ. Сгенерирован 2026-06-06._

@chatium

# Сводный справочник по модулям @app

Оглавление по всем 30 пакетам `node_modules/@app/*`. Для каждого модуля указано назначение и ссылка на типизацию (index.d.ts); при наличии отдельного документа — ссылка на него. Источник истины API: типы в `node_modules/@app/<module>/index.d.ts`.

## Содержание

- [Таблица модулей](#таблица-модулей)
- [Краткое описание по модулям](#краткое-описание-по-модулям)

---

## Таблица модулей

| Модуль             | Назначение                                                                                   | Детальный документ                           |
| ------------------ | -------------------------------------------------------------------------------------------- | -------------------------------------------- |
| @app/account       | Настройки аккаунта, seats, баланс токенов, установка приложений                              | [029-account.md](029-account.md)             |
| @app/app           | Вызов функций приложения по пути, межприложенные вызовы                                      | [033-app.md](033-app.md)                     |
| @app/auth          | Авторизация, роли, requireAccountRole, requireRealUser, создание пользователей, идентичности | [003-auth.md](003-auth.md)                   |
| @app/errors        | NotFoundError, AccessDeniedError, ValidationError, CustomError                               | [030-errors.md](030-errors.md)               |
| @app/feed          | Фиды, чаты, сообщения, участники, getChat, inbox-хуки                                        | [019-feed.md](019-feed.md)                   |
| @app/form-storage  | Ключ-значение и множества для данных форм                                                    | [036-form-storage.md](036-form-storage.md)   |
| @app/heap          | Heap, таблицы, CRUD, Money, транзакции                                                       | [008-heap.md](008-heap.md)                   |
| @app/hooks         | runHook, execHook, кастомные хуки по имени                                                   | [034-hooks.md](034-hooks.md)                 |
| @app/html          | renderHtml, html\`...\`, portal, бандлы, htmlEscape, htmlResponse                            | [035-html-jsx.md](035-html-jsx.md)           |
| @app/html-jsx      | jsx, InitializerComponent, SolidComponent, createClientInitializer                           | [035-html-jsx.md](035-html-jsx.md)           |
| @app/i18n          | Переводы, ctx.t(), ctx.lang (часто через контекст)                                           | [011-i18n.md](011-i18n.md)                   |
| @app/iap           | In-App Purchases, hasPurchasedProduct, findAllIapsByUser                                     | [037-iap.md](037-iap.md)                     |
| @app/inbox         | getInboxData, updateInbox, resetInboxBadge                                                   | [025-inbox.md](025-inbox.md)                 |
| @app/isolated-eval | isolatedEval — выполнение кода в изоляции                                                    | [046-isolated-eval.md](046-isolated-eval.md) |
| @app/jobs          | app.job, scheduleJobAfter, scheduleJobAsap, scheduleJobAt                                    | [005-jobs.md](005-jobs.md)                   |
| @app/metric        | writeMetricEvent, writeAccessLog, subscribeToMetricEvents                                    | [038-metric.md](038-metric.md)               |
| @app/mobile-app    | getMobileAppLink, generateMobileAppRunActionUrlPath                                          | [039-mobile-app.md](039-mobile-app.md)       |
| @app/nanoid        | accountNanoid, nanoid — генерация уникальных ID                                              | [045-nanoid.md](045-nanoid.md)               |
| @app/request       | request — HTTP-клиент для внешних API                                                        | [004-request.md](004-request.md)             |
| @app/responsive    | responsiveState — состояние экрана для адаптивной вёрстки                                    | [040-responsive.md](040-responsive.md)       |
| @app/schema        | ZType, s — схемы и типы Heap                                                                 | [041-schema.md](041-schema.md)               |
| @app/security      | generateDynamicCsrfToken, verifyDynamicCsrfToken                                             | [031-security.md](031-security.md)           |
| @app/socket        | sendDataToSocket, WebSocket                                                                  | [014-socket.md](014-socket.md)               |
| @app/solid-js      | Solid.js — createSignal, createEffect, JSX, компоненты                                       | [042-solid-js.md](042-solid-js.md)           |
| @app/storage       | obtainStorageFilePutUrl, getThumbnailUrl, загрузка, превью, типы файлов                      | [027-storage.md](027-storage.md)             |
| @app/sync          | runWithExclusiveLock, tryRunWithExclusiveLock, LockAcquisitionError                          | [028-sync.md](028-sync.md)                   |
| @app/types         | RichUgcCtxDef, RouteApi, FunctionRouteRef, jsx, UgcRouteParsedRequest                        | [043-types.md](043-types.md)                 |
| @app/ugc           | UGC-файлы, findUgcFile, updateUgcFileSource, права на файлы                                  | [032-ugc.md](032-ugc.md)                     |
| @app/ui            | Блоки UI, jsx, Fragment, attachMedia                                                         | [044-ui.md](044-ui.md)                       |
| @app/users         | updateUser; getOrCreate*/find* (deprecated, использовать @app/auth)                          | [026-users.md](026-users.md)                 |

---

## Краткое описание по модулям

- **account** — getCurrentAccountSettings, updateCurrentAccountSettings, installApp, uninstallApp, listAccountSeats, createAccountSeat, dropAccountSeat, getBalance, debit/credit/transferBalanceToken, findBalanceTransactions.
- **app** — runAppFunction, runInterAppCall, runAppFunctionInCurrentAccount, runInterAppCallToCurrentAccount; InternalCallTarget.
- **auth** — requireAnyUser, requireRealUser, requireAccountRole, findUserById, findUsersByIds, createRealUser, createOrUpdateBotUser, идентичности, provideUser, checkFilePermissions.
- **errors** — NotFoundError, AccessDeniedError, ValidationError, CustomError.
- **feed** — getFeedById, createFeed, updateFeed, deleteFeed, getChat, участники, сообщения, HTTP-обработчики чата, getInboxInfo/getParticipantInboxInfo.
- **form-storage** — setItem, getItem, removeItem, addToSet, removeFromSet, listSet, formStorage.
- **heap** — Heap, create, findAll, update, delete, Money, RefLink, serializableTransaction.
- **hooks** — runHook, execHook, ExecHookResult, CustomHookRegistration.
- **html** — renderHtml, HtmlString, html\`...\`, portal, portalTarget, css/javascript/js и бандлы, htmlEscape, htmlResponse, getBundle.
- **html-jsx** — jsx, InitializerCtx, InitializerComponent, createClientInitializer, SolidComponent.
- **i18n** — используется через ctx.t(), ctx.lang; переводы в YAML.
- **iap** — hasPurchasedProduct, getIapExpirationDateByUser, findAllIapsByUser, findIapByOriginalTransactionId, IapPurchase.
- **inbox** — getInboxData, updateInbox, resetInboxBadge; UgcInboxData, UgcInboxOld.
- **isolated-eval** — isolatedEval(ctx, code, args).
- **jobs** — app.job(), scheduleJobAfter, scheduleJobAsap, scheduleJobAt, cancelScheduledJob.
- **metric** — prepareMetricEvent, writeMetricEvent, subscribeToMetricEvents, writeAccessLog, writeEventLog, MetricEventData.
- **mobile-app** — getMobileAppLink, generateMobileAppRunActionUrlPath.
- **nanoid** — accountNanoid(ctxOrName), nanoid (appNanoid).
- **request** — request() — GET/POST и др., headers, responseType, throwHttpErrors.
- **responsive** — responsiveState(ctx, options?) → ResponsiveState.
- **schema** — ZType, ZObject, ZString, ZNumber, ZBoolean, ZDate, ZEnum, ZMoney, ZStorageFile, s.
- **security** — generateDynamicCsrfToken, verifyDynamicCsrfToken, CsrfTokenValidationProps.
- **socket** — sendDataToSocket, getOrCreateBrowserSocketClient, subscribeToData.
- **solid-js** — createSignal, createMemo, createEffect, createResource, For, Show, Switch, Match, Suspense, ErrorBoundary, createContext, useContext, JSX.
- **storage** — obtainStorageFilePutUrl, createUploadPutUrl, getUploadGetPutUrl, getThumbnailUrl, getDownloadUrl, getOriginalUrl, createShared\*, getFileTypeFromHash, StorageFile, getVideoInfo, getAudioInfo, частичная загрузка, fetchUrlToStorage.
- **sync** — runWithExclusiveLock, tryRunWithExclusiveLock, LockAcquisitionError.
- **types** — FunctionRouteRef, UgcRouteParsedRequest, RichUgcCtxDef, SmartTextProps, UGCIntrinsicElements, jsx, RouteApi, app namespace.
- **ugc** — findUgcFile, findUgcFileById, updateUgcFileSource, updateUgcFile, listUgcFiles, ensureUgcDirectory, deleteUgcFile, deleteUgcDirectoryRecursive, listUgcFilePermissions, hasUgcFilePermission, createOrUpdateUgcFilePermission, deleteUgcFilePermission.
- **ui** — jsx, attachMedia, Fragment, реэкспорты блоков из lib/chatium-json.
- **users** — updateUser (актуально); getOrCreateUserByEmail, findUserById и др. (deprecated → @app/auth).

---

**Навигация:** [000-summ.md](000-summ.md) — общий навигатор по документации.

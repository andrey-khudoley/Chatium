---
title: 'Webhook-прокси на VDS — спецификация (ОТМЕНЕНО)'
project_hash: c7d5a1
type: specification
date: 2026-05-17
status: cancelled
cancelled_at: 2026-05-18
cancelled_reason: 'Chatium выкатил патч с поддержкой multipart/form-data — переезд на VDS больше не нужен'
tags:
  - project/olga-getcourse-payments
  - topic/webhook-proxy
  - topic/vds
  - topic/Payments Client
  - status/cancelled
related_plan: '[implementation-plan](./implementation-plan.md)'
related_root_project: '[Бриф проекта](../brief.md)'
---

> ⚠️ **ОТМЕНЕНО 2026-05-18.** Документ остаётся для истории и на случай, если придётся вернуться к VDS-сценарию (например, новый блокер платформы или решение увести `Payments Client` целиком с Chatium).
>
> Причина отмены: команда Chatium (Artur Eshenbrener, 18.05 11:48) выкатила патч, и платформа теперь нативно поддерживает `multipart/form-data` — поля доступны прямо в `req.body`. Пример: [play-mlncf.chatium.ru/s/ide/index.tsx?purl=/index](https://play-mlncf.chatium.ru/s/ide/index.tsx?purl=%2Findex). VDS `p.ru.khudoley.pro` остаётся арендованным, но в боевом сценарии не используется.

# Webhook-прокси на VDS — спецификация

Временный сервис, который принимает `multipart/form-data` webhook от LifePay, переупаковывает тело в `application/json` и форвардит в Chatium-роут `p/units/yakovleva/pay/web/webhook`. Существует ровно до того момента, пока всё решение (`Payments Client`) не переедет с Chatium на этот же VDS.

## 1. Контекст и мотивация

### 1.1. Что не работает на Chatium

Платформа Chatium (workspace `s.chtm.khudoley.pro`) при POST-роуте, описанном через `app.post()`, не отдаёт телу обработчика `multipart/form-data`. На объекте `req` доступны только ключи `body, method, path, query, headers, getSchema, params, url`; ни `req.body`, ни `req.files`, ни `req.fields`, ни `req.rawHttpBody`/`req.rawBody` не заполнены. `application/json` и `application/x-www-form-urlencoded` платформа парсит автоматически, `multipart/form-data` — нет. Подтверждено диагностическим логом с боевого трафика LifePay-пода 2026-05-17.

### 1.2. Что отправляет LifePay

Внешний сервис гарантированно шлёт `POST` с `Content-Type: multipart/form-data; boundary=...` и единственным текстовым полем `data`, содержащим JSON-строку транзакции (~600 байт). Содержание поля — то же, что Chatium умеет принимать как JSON.

### 1.3. Почему не ждём поддержку

Тикет в поддержку Chatium открыт, ответ может идти 1–5 рабочих дней. Бизнес-обещание — принять реальный платежный webhook в течение 12 часов. Решение: поставить тонкий прокси на собственном VDS, перенастроить `callback_url` в LifePay на этот прокси, а прокси будет дёргать Chatium-роут уже в формате, который Chatium принимает.

### 1.4. Жизненный цикл

Это **временное** решение. Конечная цель — перевезти `Payments Client` целиком на тот же VDS (когда — отдельный план вне этого документа). Поэтому спецификация намеренно не закладывает «продакшен-уровень» (нет ретраев, нет очередей, нет персистентности): прокси должен быть достаточно надёжным, чтобы не терять платежи в обычном режиме, и достаточно простым, чтобы выкатить за 12 часов и снести без сожаления.

## 2. Скоуп и не-цели

### 2.1. В скоупе MVP

Приём `multipart/form-data` от LifePay по одному публичному URL (`POST /webhook`). Извлечение текстового поля `data`. Парсинг JSON-строки в объект (валидация только «это валидный JSON»). Отправка тела в Chatium-роут `application/json`. Возврат HTTP-ответа Chatium (статус + тело) обратно LifePay без трансформаций. Health-эндпоинт `GET /health` для самопроверки и мониторинга. Логи в stdout → journald (читаются через `journalctl -u sbp-proxy`).

### 2.2. Не-цели (вне скоупа MVP)

Ретраи при недоступности Chatium, очередь с backoff, dead-letter — **нет**. Если Chatium ответил не 2xx — отдаём этот же статус LifePay, дальше провайдер сам ретраит по своим правилам. Персистентное хранение принятых webhook на диске — **нет** (стандартный Fastify-лог в journald достаточен для разбора первых инцидентов; при необходимости включается в Phase 7 плана). IP-allowlist для LifePay или проверка shared-secret — **нет** в MVP (только HTTPS + сложно угадываемый путь с токеном по образцу текущего Chatium-роута; полноценная проверка — в Phase 7). Аутентификация админ-эндпоинтов — не применимо, админки нет. Мониторинг через внешние пробы (uptime-checker) — нет в скоупе, но `/health` готов для подключения.

### 2.3. Допущения

LifePay шлёт не более ~10 запросов в минуту в моменты пиковой нагрузки школы Ольги (оценка на основе [payment-scheme](../../pay/docs/architecture/payment-scheme.md); реальный пик может быть выше, но даже 100 rps Node+Fastify обрабатывает без проблем). Запрос всегда содержит ровно одно поле `data` со строкой JSON. Размер тела — десятки килобайт максимум.

## 3. Архитектура

### 3.1. Поток данных

```
[LifePay back-end]
      │  POST multipart/form-data; data=<json-string>
      ▼
[Caddy на VDS, :443]
      │  TLS-терминация, reverse_proxy
      ▼
[Fastify на VDS, 127.0.0.1:3000]
      │  парсит multipart, достаёт data, JSON.parse
      │  POST application/json
      ▼
[Chatium app, p/units/yakovleva/pay/web/webhook?token=...]
      │  ответ 2xx | 4xx | 5xx
      ▼
[Fastify возвращает тот же статус и тело]
      │
      ▼
[LifePay принимает ответ]
```

### 3.2. Компоненты

**Caddy** — реверс-прокси с автоматическим Let's Encrypt-сертификатом. Слушает 80/443, форвардит на `127.0.0.1:3000`. Доступ к самому Fastify извне закрыт firewalld.

**Fastify-приложение `sbp-proxy`** — Node.js 20, TypeScript, единственный package `@fastify/multipart` для парсинга тела. Слушает только на `127.0.0.1:3000`. Запускается через systemd-unit `sbp-proxy.service` под не-root пользователем `sbp-proxy`. Код лежит в `/opt/sbp-proxy/`, рантайм-конфиг — в `/opt/sbp-proxy/.env` (chmod 600).

**Firewall (firewalld)** — открыты только 22 (SSH), 80 (HTTP, для Let's Encrypt-челленджа и редиректа), 443 (HTTPS). Всё остальное закрыто.

**SELinux** — `enforcing`. Caddy ставится из официального пакета (включает policy-модуль); Fastify слушает `127.0.0.1:3000`, что в стандартной политике разрешено.

### 3.3. Контракты эндпоинтов

#### `POST /webhook`

Вход.

- Заголовок `Content-Type: multipart/form-data; boundary=...`.
- Поле `data` (текстовое) с валидной JSON-строкой.
- При желании в URL можно нести query-токен (`?token=...`) — прокси прокидывает его в Chatium без изменений.

Поведение.

1. Если `Content-Type` не `multipart/form-data` — `415 Unsupported Media Type`.
2. Если поле `data` отсутствует или пустое — `400 Bad Request`, тело `{ "error": "missing field 'data'" }`.
3. Если `data` не разбирается как JSON — `400 Bad Request`, тело `{ "error": "field 'data' is not valid JSON" }`.
4. Иначе — `POST` в `CHATIUM_WEBHOOK_URL` с заголовком `Content-Type: application/json` и телом `JSON.stringify(parsed)`. Query-параметры URL Chatium-а — статичны, заданы в `.env`.
5. Возвращаем LifePay статус-код и тело Chatium-ответа (`Content-Type` — то, что прислал Chatium, либо `text/plain` если заголовок не определился).

Тайм-аут вызова в Chatium: 15 секунд (LifePay по своим правилам ждёт ответа около 30 с — у нас должен оставаться запас).

#### `GET /health`

Возвращает `200 { "ok": true, "uptime": <seconds>, "version": "<git-sha>" }`. Используется для ручной проверки после деплоя и любым внешним монитором, если подключится.

### 3.4. Имена и пути

| Что                    | Значение                                                                      | Где задаётся                                          |
| ---------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------- |
| Домен прокси           | `p.ru.khudoley.pro` (A → `81.177.174.183`)                                    | DNS-зона `khudoley.pro`, A-запись хоста `p.ru`        |
| Публичный URL вебхука  | `https://p.ru.khudoley.pro/webhook?token=<token>`                             | задаётся в LifePay                                    |
| Локальный bind Fastify | `127.0.0.1:3000`                                                              | `/opt/sbp-proxy/.env` (`PORT=3000`, `HOST=127.0.0.1`) |
| Каталог приложения     | `/opt/sbp-proxy/`                                                             | соглашение                                            |
| Системный пользователь | `sbp-proxy`                                                                   | systemd-unit `User=sbp-proxy`                         |
| systemd-сервис         | `sbp-proxy.service`                                                           | `/etc/systemd/system/sbp-proxy.service`               |
| Caddy-конфиг           | `/etc/caddy/Caddyfile`                                                        | стандарт пакета                                       |
| Логи                   | `journalctl -u sbp-proxy` и `journalctl -u caddy`                             | systemd                                               |
| Chatium-роут (апстрим) | `https://s.chtm.khudoley.pro/p/units/yakovleva/pay/web/webhook?token=<token>` | `CHATIUM_WEBHOOK_URL` в `.env`                        |

## 4. Стек

CentOS 9 Stream (как куплен). Node.js 20 LTS из NodeSource RPM-репозитория. Fastify 5.x, `@fastify/multipart` 9.x, `pino` (встроен в Fastify) для логов. TypeScript для исходников; собирается в `dist/` через `tsc`. Caddy 2.x из официального COPR-репозитория (`@caddy/caddy`). systemd для управления процессом.

## 5. Безопасность

### 5.1. Транспорт

Только HTTPS наружу. Caddy выпускает сертификат через Let's Encrypt-HTTP-01, поэтому 80-й порт обязан быть открыт и зарегулирован тем же Caddy. Внутри VDS Fastify слушает только `127.0.0.1`, наружу никак не выставлен.

### 5.2. Аутентификация запроса в MVP

В URL Chatium-роута используется query-токен (`?token=...`) — тот же приём переносится на прокси. Прокси не валидирует токен сам, он его просто прокидывает; реальная проверка — на стороне Chatium как сейчас. Усиление (явная проверка allowlist IP LifePay или подписи) — Phase 7 плана.

### 5.3. SSH и пользователь VDS

Сразу при заходе: создать не-root пользователя с sudo, скопировать ключ, выключить `PasswordAuthentication`, оставить только key-based, перезапустить sshd. Root по SSH запрещён (`PermitRootLogin no`).

### 5.4. Секреты

`CHATIUM_WEBHOOK_URL` хранится в `/opt/sbp-proxy/.env` с правами `600` и владельцем `sbp-proxy`. В git и в этот документ не попадает. Если в будущем добавится shared-secret для LifePay — туда же.

## 6. Observability и эксплуатация

### 6.1. Логи

Fastify пишет structured JSON в stdout. systemd собирает в journald. Просмотр:

```
journalctl -u sbp-proxy -f          # live
journalctl -u sbp-proxy --since "1 hour ago"
```

Каждый входящий вебхук логируется как одна строка с полями: `reqId`, `method`, `url`, `contentType`, `dataLength`, `chatiumStatus`, `latencyMs`. При ошибке — отдельная строка с `err.message` и stack.

### 6.2. Метрики

Не вводятся в MVP. Health-эндпоинт `GET /health` — единственная точка для внешнего пинга.

### 6.3. Перезапуск и автозапуск

`systemctl restart sbp-proxy` — рестарт. `Restart=on-failure`, `RestartSec=5` — автоперезапуск при крэше. `systemctl enable sbp-proxy` — автозапуск при ребуте.

### 6.4. Откат

Откат на старый Chatium-URL = смена `callback_url` обратно в LifePay при создании счёта через `createBill` (см. `[gateway/implementation-plan](../../../../saas/gw/lifepay/docs/gateway/implementation-plan.md)` §1.3). LifePay-вебхук сам по себе stateless, переключение в один шаг.

## 7. Критерии приёмки

Прокси считается готовым к боевой нагрузке, когда:

1. `dig +short p.ru.khudoley.pro` отдаёт IPv4 VDS из всех опрошенных резолверов (8.8.8.8, 1.1.1.1, локальный).
2. `curl -fsS https://p.ru.khudoley.pro/health` снаружи возвращает `200` с JSON `{"ok":true,...}` и валидным TLS-сертификатом.
3. `systemctl is-active sbp-proxy` → `active`, `systemctl is-active caddy` → `active`. Оба `is-enabled` → `enabled`.
4. На VDS `ss -tlnp | grep -E ':80|:443|:3000'` показывает Caddy на 80/443 и Node на `127.0.0.1:3000` (а не на `0.0.0.0:3000`).
5. `firewall-cmd --list-services` показывает `ssh http https` и ничего лишнего.
6. Smoke-тест: `curl` с `-F data='@sample-payload.json;type=text/plain'` на `https://p.ru.khudoley.pro/webhook?token=<test-token>` приводит к появлению лога в `journalctl -u sbp-proxy` с непустым `dataLength` и реалистичным `chatiumStatus` (200 для тестового токена, либо известный 4xx от Chatium при намеренно неверном токене — главное, что прокси дошёл до Chatium).
7. End-to-end: переключение `callback_url` в `createBill` на новый URL, проведение тестового платежа, появление записи в Heap клиент-приложения с теми же полями, что приходили раньше.

## 8. Известные риски и заметки

DNS-пропагация может занять до часа в худшем случае — поэтому DNS правится первым шагом плана. Если у регистратора TTL уже стоял маленький — пропагация займёт минуты.

Let's Encrypt-челлендж требует, чтобы 80-й порт был доступен снаружи к моменту получения сертификата; firewalld и провайдерская сеть обязаны его пропускать. Если порт закрыт на уровне облака — Caddy будет долбиться в челленджи и не получит сертификат.

SELinux в `enforcing` может неожиданно заблокировать Caddy, если ставить его не из COPR, а вручную бинарником. Чистый путь — `dnf copr enable @caddy/caddy && dnf install caddy`, у этого пакета свой SELinux-policy-модуль.

CentOS 9 Stream — rolling, поэтому `dnf update` может прилететь с обновлением ядра. Перед запуском боевого трафика — `reboot` сразу после первого обновления, иначе ядро и модули разойдутся и потом непредсказуемо упадёт что-нибудь.

Time-zone и NTP — `timedatectl set-timezone Europe/Moscow` и `systemctl enable --now chronyd`. Логи без правильного времени бесполезны при разборе инцидентов.

## 9. Открытые вопросы

Список IP LifePay для будущего allowlist — у поддержки LifePay не запрошен. Уточнить в Phase 7, либо оставить как есть, если миграция со Chatium произойдёт раньше.

Куда деть логи после миграции — пока никуда, journald-ротация по умолчанию (`/etc/systemd/journald.conf`, по объёму `SystemMaxUse`). После миграции — выкинуть прокси целиком вместе с логами.

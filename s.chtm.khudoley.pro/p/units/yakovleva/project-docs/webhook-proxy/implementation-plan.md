---
title: 'Webhook-прокси на VDS — пошаговый план развёртки (ОТМЕНЕНО)'
project_hash: c7d5a1
type: implementation-plan
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
related_spec: '[specification](./specification.md)'
related_root_project: '[Бриф проекта](../brief.md)'
---

> ⚠️ **ОТМЕНЕНО 2026-05-18.** План не выполняется. Документ остаётся для истории.
>
> Причина: команда Chatium (Artur Eshenbrener, 18.05) выкатила патч, поддержка `multipart/form-data` появилась прямо в `req.body` ([пример](https://play-mlncf.chatium.ru/s/ide/index.tsx?purl=%2Findex)). Серверная часть остаётся в `p/units/yakovleva/pay` на Chatium. VDS `81.177.174.183` / `p.ru.khudoley.pro` пока остаётся арендованным — можно либо высвободить, либо приберечь как резерв; решение зафиксировать отдельно.
>
> Что в этом плане уже сделано до отмены: §0 (фиксация переменных) и часть §1 (DNS A-запись на 17.05). Остальные шаги (SSH-bootstrap, Node, Caddy, код, деплой, e2e) не выполнялись.

# Webhook-прокси на VDS — пошаговый план развёртки

Конкретный чек-лист до боевого приёма webhook от LifePay через VDS-прокси за 12 часов. Документ исходит из контрактов и решений [specification](./specification.md): когда план говорит «эндпоинт `/webhook`», «домен прокси», «`CHATIUM_WEBHOOK_URL`» — это термины из спецификации.

**Кто читает.** Андрей-исполнитель и LLM-агент, ведущий деплой в Cowork-сессии.

## Условные обозначения

- `- [ ]` — пункт не выполнен.
- `- [x]` — пункт выполнен; ставить только при фактической верификации (не «на словах»).
- `- [~]` — пункт перенесён в более позднюю фазу или временно заблокирован; рядом — короткая причина.
- `- [-]` — пункт отменён (с пояснением: устарел, заменён, явно вынесен в backlog).
- Все команды на VDS — под пользователем `andrey` через `sudo`, кроме явно отмеченных как «root-only» или «как `sbp-proxy`».
- Все пути — абсолютные.
- `p.ru.khudoley.pro` — имя поддомена прокси, фиксируется в §0.
- `81.177.174.183` — публичный IPv4 VDS, фиксируется в §0.

## Принципы порядка

Сначала запускаются вещи, которые ждут сами по себе и не нужны прямо в эту минуту: **DNS A-запись** (пропагация до часа), **обновление пакетов VDS** (десятки мегабайт), **первоначальная установка зависимостей Node-приложения локально**. Параллельно с их асинхронным ожиданием идут активные шаги: ssh-bootstrap, написание кода, конфиги. TLS-сертификат Caddy выпускается **последним** действием подготовительной фазы — Let's Encrypt-челлендж требует уже прокинутого DNS и открытого 80 порта, поэтому ставить Caddy раньше, чем DNS пропагирован, бессмысленно (упрётся в челлендж и будет долбиться). End-to-end тест и переключение `callback_url` в LifePay — самый последний шаг, после которого пути назад уже на уровне платежей провайдера, а не SSH.

---

## §0. Фиксация переменных (зафиксировано)

Четыре константы, на которые ссылаются дальнейшие шаги:

- [x] **Публичный IPv4 VDS**: `81.177.174.183`.
- [x] **Поддомен прокси**: `p.ru.khudoley.pro` (A-запись в зоне `khudoley.pro`, имя хоста `p.ru`).
- [x] **Chatium-URL приёмника** (`CHATIUM_WEBHOOK_URL`): `https://s.chtm.khudoley.pro/p/units/yakovleva/pay/web/webhook?token=30250a4bf45e77b864acabacfe0209381607e37094343e16cb40a034a5a8459e`. Боевой токен, тот же, что прописан в `callback_url` сейчас. Используется в §7 при заполнении `/opt/sbp-proxy/.env`.
- [~] **Test-токен** для smoke-теста (`WEBHOOK_TEST_TOKEN`) — пока не создан. _План:_ добавить отдельный токен в Chatium-роуте `Payments Client` как валидный, чтобы прогон §8 не смешивался с боевым трафиком. Если к §8 тест-токена всё ещё нет — допустимо сделать smoke прямо боевым (один-два запроса), но это создаст ложные записи в Heap приёмника, помеченные как `test`.

---

## §1. DNS — первый шаг (5 минут активных + до часа пропагации)

DNS правится **первым**, потому что пока он расходится, всё остальное идёт параллельно.

- [x] **A-запись `<sub>` → `81.177.174.183`** добавлена у регистратора/DNS-провайдера. TTL — минимально допустимый (300 c, если разрешено). _Готово, когда:_ интерфейс регистратора показывает запись активной. — выполнено 2026-05-17.
- [ ] **Проверка пропагации** запущена в фоне отдельным терминалом: `watch -n 30 'dig +short p.ru.khudoley.pro @8.8.8.8; dig +short p.ru.khudoley.pro @1.1.1.1'`. _Готово, когда:_ оба резолвера отдают `81.177.174.183`; до этого момента к §7 (Caddy + TLS) не переходим.

---

## §2. SSH-bootstrap и безопасность доступа (15–20 минут)

- [ ] **Первый вход root по паролю** (один раз, потом отключим): `ssh root@81.177.174.183`. _Готово, когда:_ shell открылся.
- [ ] **Системное обновление**, фоном пока пишется код: `dnf -y update && dnf -y install epel-release && dnf -y install curl wget git vim-enhanced htop tar jq ca-certificates`. _Готово, когда:_ `dnf check-update` ничего не возвращает (или возвращает только то, что не критично).
- [ ] **Перезагрузка после обновления ядра** (CentOS 9 Stream — rolling; новое ядро без ребута приведёт к расхождению с модулями). `reboot`. _Готово, когда:_ `uname -r` после ребута соответствует последнему ядру из `rpm -q kernel --last | head -1`.
- [ ] **Создать админ-пользователя**, root-only: `useradd -m -G wheel andrey && passwd andrey`. _Готово, когда:_ `id andrey` показывает группу `wheel`.
- [ ] **Скопировать ssh-ключ**, с локальной машины: `ssh-copy-id andrey@81.177.174.183`. _Готово, когда:_ `ssh andrey@81.177.174.183` пускает без пароля.
- [ ] **Отключить парольный SSH и root-логин**. В `/etc/ssh/sshd_config` (либо в новом drop-in файле `/etc/ssh/sshd_config.d/10-hardening.conf`): `PasswordAuthentication no`, `PermitRootLogin no`, `PubkeyAuthentication yes`. Затем `systemctl reload sshd`. _Готово, когда:_ `ssh root@81.177.174.183` падает с `Permission denied (publickey)`, а `ssh andrey@81.177.174.183` работает.
- [ ] **sudo без пароля для админ-задач** (опционально, для удобства деплоя): `echo 'andrey ALL=(ALL) NOPASSWD: ALL' | sudo tee /etc/sudoers.d/andrey && sudo chmod 440 /etc/sudoers.d/andrey`. _Готово, когда:_ `sudo -n true` от имени `andrey` отрабатывает без запроса.

---

## §3. Системные сервисы и firewall (10 минут)

- [ ] **Тайм-зона и NTP**: `sudo timedatectl set-timezone Europe/Moscow && sudo dnf -y install chrony && sudo systemctl enable --now chronyd`. _Готово, когда:_ `timedatectl` показывает корректное время и `NTP service: active`.
- [ ] **firewalld открыт на ssh/http/https**, остальное закрыто: `sudo systemctl enable --now firewalld && sudo firewall-cmd --permanent --add-service=ssh --add-service=http --add-service=https && sudo firewall-cmd --reload`. _Готово, когда:_ `sudo firewall-cmd --list-services` показывает ровно `ssh http https`.
- [ ] **SELinux — не трогаем, проверяем**: `getenforce` → `Enforcing`. _Готово, когда:_ статус подтверждён; если что-то будет блокироваться у Caddy в §7 — разбираем точечно через `ausearch -m AVC -ts recent`.

---

## §4. Установить Node.js 20 (5 минут)

- [ ] **NodeSource RPM-репозиторий**: `curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -`. _Готово, когда:_ появилось `/etc/yum.repos.d/nodesource-nodejs.repo`.
- [ ] **Поставить nodejs**: `sudo dnf -y install nodejs`. _Готово, когда:_ `node -v` → `v20.*`, `npm -v` → `10.*` (или новее).

---

## §5. Установить Caddy (5 минут, конфиг — позже в §7)

- [ ] **COPR-репозиторий Caddy**: `sudo dnf -y install 'dnf-command(copr)' && sudo dnf -y copr enable @caddy/caddy`. _Готово, когда:_ `dnf repolist | grep caddy` показывает репозиторий.
- [ ] **Установить пакет**: `sudo dnf -y install caddy`. _Готово, когда:_ `caddy version` отрабатывает.
- [ ] **Включить, но пока не запускать с реальным конфигом** — дефолтный Caddyfile в `/etc/caddy/Caddyfile` отдаёт заглушку; настоящий конфиг подменим в §7. `sudo systemctl enable caddy`. _Готово, когда:_ `systemctl is-enabled caddy` → `enabled`.

Если COPR-репозиторий `@caddy/caddy` недоступен (бывает на свежем CentOS 9 Stream) — fallback: скачать статический бинарник с https://caddyserver.com/download (Linux amd64), положить в `/usr/local/bin/caddy`, создать systemd-unit вручную по [официальной инструкции](https://caddyserver.com/docs/running#manual-installation). В этом случае руками создать пользователя `caddy`, директории `/etc/caddy`, `/var/lib/caddy`, и протестировать `caddy run --config /etc/caddy/Caddyfile` перед оформлением как сервис.

---

## §6. Код прокси (можно делать параллельно §2–§5, локально на ноутбуке)

Структура каталога приложения (исходники + результат сборки; `node_modules/` и `.env` в архив **не** кладутся):

```
sbp-proxy/
├── package.json
├── package-lock.json
├── tsconfig.json
├── src/
│   └── index.ts
├── dist/                ← создаётся `npm run build`, попадает в архив
└── .env.example
```

- [ ] **Инициализировать проект**, локально: `mkdir -p ~/projects/sbp-proxy && cd ~/projects/sbp-proxy && npm init -y && npm pkg set type=module`. _Готово, когда:_ `package.json` создан с `"type": "module"`.
- [ ] **Поставить зависимости**: `npm i fastify @fastify/multipart` и `npm i -D typescript @types/node tsx`. _Готово, когда:_ `node_modules` существует, `package.json` содержит обе зависимости.
- [ ] **tsconfig.json** — минимальный, ESM, ES2022:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **package.json: scripts** добавить:

```json
{
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

- [ ] **`src/index.ts`** — обработчик webhook + health. _Готово, когда:_ собирается `npm run build` без ошибок и `node dist/index.js` поднимает сервер на `127.0.0.1:3000`. Эталон:

```ts
import Fastify from 'fastify'
import multipart from '@fastify/multipart'

const PORT = Number(process.env.PORT ?? 3000)
const HOST = process.env.HOST ?? '127.0.0.1'
const CHATIUM_WEBHOOK_URL = process.env.CHATIUM_WEBHOOK_URL
const CHATIUM_TIMEOUT_MS = Number(process.env.CHATIUM_TIMEOUT_MS ?? 15000)
const VERSION = process.env.APP_VERSION ?? 'dev'

if (!CHATIUM_WEBHOOK_URL) {
  console.error('CHATIUM_WEBHOOK_URL is required')
  process.exit(1)
}

const app = Fastify({
  logger: { level: process.env.LOG_LEVEL ?? 'info' },
  bodyLimit: 1_048_576
})

await app.register(multipart, { attachFieldsToBody: 'keyValues' })

const startedAt = Date.now()

app.get('/health', async () => ({
  ok: true,
  uptime: Math.round((Date.now() - startedAt) / 1000),
  version: VERSION
}))

app.post('/webhook', async (req, reply) => {
  const ct = req.headers['content-type'] ?? ''
  if (!ct.toString().toLowerCase().startsWith('multipart/form-data')) {
    return reply.code(415).send({ error: 'expected multipart/form-data' })
  }
  const body = req.body as Record<string, unknown> | undefined
  const dataField = body?.data
  if (typeof dataField !== 'string' || dataField.length === 0) {
    return reply.code(400).send({ error: "missing field 'data'" })
  }
  let parsed: unknown
  try {
    parsed = JSON.parse(dataField)
  } catch {
    return reply.code(400).send({ error: "field 'data' is not valid JSON" })
  }

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), CHATIUM_TIMEOUT_MS)
  let upstream: Response
  try {
    upstream = await fetch(CHATIUM_WEBHOOK_URL!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
      signal: ac.signal
    })
  } catch (err) {
    req.log.error({ err }, 'upstream fetch failed')
    return reply.code(502).send({ error: 'upstream unreachable' })
  } finally {
    clearTimeout(timer)
  }

  const text = await upstream.text()
  req.log.info(
    {
      dataLength: dataField.length,
      chatiumStatus: upstream.status
    },
    'forwarded'
  )
  reply.code(upstream.status)
  const upCt = upstream.headers.get('content-type')
  if (upCt) reply.header('content-type', upCt)
  return text
})

app
  .listen({ port: PORT, host: HOST })
  .then(() => app.log.info({ port: PORT, host: HOST }, 'sbp-proxy listening'))
  .catch((err) => {
    app.log.error(err)
    process.exit(1)
  })
```

- [ ] **`.env.example`** в репозитории (без реальных значений):

```
PORT=3000
HOST=127.0.0.1
CHATIUM_WEBHOOK_URL=https://s.chtm.khudoley.pro/p/units/yakovleva/pay/web/webhook?token=REPLACE
CHATIUM_TIMEOUT_MS=15000
LOG_LEVEL=info
APP_VERSION=0.1.0
```

- [ ] **Локальный smoke-тест**: в одном терминале `CHATIUM_WEBHOOK_URL=https://httpbin.org/post npm run build && CHATIUM_WEBHOOK_URL=https://httpbin.org/post node dist/index.js`, в другом:

```
curl -i -F 'data={"test":"payload"}' http://127.0.0.1:3000/webhook
```

_Готово, когда:_ возвращается JSON от `httpbin.org` (т.е. форвард сработал), а в логе сервера видна строка с `chatiumStatus: 200`.

- [ ] **Архив для деплоя**: `tar --exclude node_modules -czf ~/sbp-proxy.tgz -C ~/projects sbp-proxy`. _Готово, когда:_ `~/sbp-proxy.tgz` существует и весит < 1 МБ.

---

## §7. Деплой на VDS + Caddy + TLS (20 минут, **DNS должен быть пропагирован**)

Прежде чем переходить сюда — убедиться, что `dig +short p.ru.khudoley.pro @8.8.8.8` отдаёт `81.177.174.183`. Если нет — ждать.

- [ ] **Создать системного пользователя**: `sudo useradd --system --home-dir /opt/sbp-proxy --shell /sbin/nologin sbp-proxy && sudo mkdir -p /opt/sbp-proxy && sudo chown sbp-proxy:sbp-proxy /opt/sbp-proxy`. _Готово, когда:_ `id sbp-proxy` показывает `system: yes`, директория принадлежит ему.
- [ ] **Скопировать архив на VDS**: `scp ~/sbp-proxy.tgz andrey@81.177.174.183:/tmp/`. _Готово, когда:_ `ls -la /tmp/sbp-proxy.tgz` на VDS отрабатывает.
- [ ] **Распаковать и установить зависимости**, под пользователем сервиса:

```
# архив создан как `tar -C ~/projects sbp-proxy`, верхняя папка sbp-proxy/ внутри,
# поэтому --strip-components не нужен.
sudo tar -xzf /tmp/sbp-proxy.tgz -C /opt/
sudo chown -R sbp-proxy:sbp-proxy /opt/sbp-proxy
# -H выставляет HOME=/opt/sbp-proxy (home-dir у системного пользователя),
# чтобы npm мог писать кэш и не падал на ENOENT в /root/.npm
sudo -Hu sbp-proxy bash -c 'cd /opt/sbp-proxy && npm ci --omit=dev'
```

_Готово, когда:_ `ls /opt/sbp-proxy/dist/index.js` существует, `/opt/sbp-proxy/node_modules` существует, владелец всего дерева — `sbp-proxy`.

- [ ] **Создать `/opt/sbp-proxy/.env`** (с реальными значениями из §0). Права `600`, владелец `sbp-proxy`:

```
sudo install -m 600 -o sbp-proxy -g sbp-proxy /dev/stdin /opt/sbp-proxy/.env <<'EOF'
PORT=3000
HOST=127.0.0.1
CHATIUM_WEBHOOK_URL=https://s.chtm.khudoley.pro/p/units/yakovleva/pay/web/webhook?token=30250a4bf45e77b864acabacfe0209381607e37094343e16cb40a034a5a8459e
CHATIUM_TIMEOUT_MS=15000
LOG_LEVEL=info
APP_VERSION=0.1.0
EOF
```

_Готово, когда:_ `sudo -u sbp-proxy cat /opt/sbp-proxy/.env` читается, посторонним — нет.

- [ ] **systemd-unit `/etc/systemd/system/sbp-proxy.service`**:

```
[Unit]
Description=SBP Webhook Proxy (multipart -> JSON forwarder)
After=network.target

[Service]
Type=simple
User=sbp-proxy
Group=sbp-proxy
WorkingDirectory=/opt/sbp-proxy
EnvironmentFile=/opt/sbp-proxy/.env
ExecStart=/usr/bin/node /opt/sbp-proxy/dist/index.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=/opt/sbp-proxy

[Install]
WantedBy=multi-user.target
```

Далее: `sudo systemctl daemon-reload && sudo systemctl enable --now sbp-proxy`. _Готово, когда:_ `systemctl is-active sbp-proxy` → `active`, `curl -fsS http://127.0.0.1:3000/health` на VDS возвращает `200`.

- [ ] **Caddyfile** в `/etc/caddy/Caddyfile`:

```
p.ru.khudoley.pro {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
    log {
        output stderr
        format console
        level INFO
    }
}
```

(заменить `p.ru.khudoley.pro` на реальный поддомен). Затем `sudo systemctl reload caddy`. _Готово, когда:_ `journalctl -u caddy -n 50 --no-pager` показывает успешное получение сертификата от Let's Encrypt, `systemctl is-active caddy` → `active`.

- [ ] **Внешняя проверка `/health` через HTTPS**: с локальной машины (не с VDS!): `curl -i https://p.ru.khudoley.pro/health`. _Готово, когда:_ статус `200`, тело — `{"ok":true,...}`, и `curl` не ругается на сертификат.

- [ ] **Проверка `ss`/`firewall-cmd`** для уверенности: `sudo ss -tlnp | grep -E ':80|:443|:3000'` показывает Caddy на `0.0.0.0:80` / `0.0.0.0:443` и Node на `127.0.0.1:3000`; `sudo firewall-cmd --list-services` — `ssh http https`. _Готово, когда:_ всё соответствует.

---

## §8. End-to-end-проверка (15 минут)

- [ ] **Подготовить sample-payload** — взять реальный JSON из лога LifePay-вебхука (см. начальное обращение пользователя — `data` ~600 байт). Сохранить в `~/projects/sbp-proxy/sample-data.json`. _Готово, когда:_ файл существует и содержит валидный JSON.
- [ ] **Smoke-запрос на прокси без выхода в Chatium** — проверить, что прокси сам по себе принимает multipart и парсит `data`. Поскольку тест-токена в Chatium-приёмнике пока нет, шлём запрос с заведомо невалидным токеном, прокси должен довести до Chatium и получить от него 4xx:

```
curl -i -F "data=$(cat ~/projects/sbp-proxy/sample-data.json)" \
  "https://p.ru.khudoley.pro/webhook?token=__diag__"
```

_Готово, когда:_ `curl` отдаёт код 4xx (тело — то, что Chatium вернул на неизвестный токен); в `journalctl -u sbp-proxy` строка `forwarded` с непустым `dataLength` и `chatiumStatus` 4xx. Если же ответ — 415/400 от **прокси**, значит multipart парсится неправильно — разбираться, не идти дальше.

- [~] **Smoke с тест-токеном** (когда токен появится в `Payments Client`) — повторить тот же curl с `?token=<WEBHOOK_TEST_TOKEN>`. _Готово, когда:_ статус ответа `200`, в Heap приёмника появилась запись с реалистичным содержимым `data`. До появления тест-токена шаг заблокирован; можно сразу переходить к боевому платежу (`callback_url` в `createBill` ↓), но с осознанием, что первая запись в Heap будет от настоящего платежа.
- [ ] **Лог в journald**: `sudo journalctl -u sbp-proxy --since "5 minutes ago" --no-pager`. _Готово, когда:_ видна строка `forwarded` с непустым `dataLength` и адекватным `chatiumStatus`.
- [ ] **Лог в Chatium-приёмнике** (на стороне `Payments Client`) — диагностический лог, который текущая версия и так пишет, должен показать заполненное `req.body` с теми же полями, что были в `data` после JSON-парсинга. _Готово, когда:_ в Heap клиент-приложения появилась запись с реалистичным содержимым.
- [ ] **Переключить `callback_url` в LifePay** — то есть в коде gateway, который зовёт `createBill`, поставить новый URL прокси. См. `[gateway/implementation-plan](../../../../saas/gw/lifepay/docs/gateway/implementation-plan.md)` §1.3, поле `callback_url`. _Готово, когда:_ следующий тестовый счёт `createBill` уходит с `callback_url=https://p.ru.khudoley.pro/webhook?token=<боевой-токен>` (проверить в логе gateway или в ответе `createBill`).
- [ ] **Боевой тестовый платёж**: создать счёт через тестовый виджет, оплатить минимальную сумму СБП, дождаться webhook. _Готово, когда:_ в `journalctl -u sbp-proxy` появилась запись `forwarded` с `chatiumStatus: 200`, и в Heap приёмника — соответствующая транзакция.

---

## §9. Откат (готовится «на всякий», не нужно выполнять, если §8 зелёный)

- [ ] **План отката записан здесь же** — в случае проблем с прокси переключить `callback_url` в `createBill` обратно на старый Chatium-URL и подавать второй тикет в поддержку Chatium. Откат — одна правка в коде gateway, без правки на VDS. _Готово, когда:_ шаги отката осознаны и проверены мысленно; реально откатывать **не** нужно.

---

## §10. Hardening (только если осталось время в 12-часовом окне)

Не критично для боевого старта, но желательно до полной миграции:

- [ ] **journald-ротация** проверена: `journalctl --disk-usage`; в `/etc/systemd/journald.conf` при необходимости — `SystemMaxUse=500M`. _Готово, когда:_ `journalctl --vacuum-size=500M` отработал без ошибок.
- [ ] **IP-allowlist для LifePay** — запросить у поддержки LifePay список исходящих IP webhook-сервера (см. [lifepay-support-2026-05-12](../notes/lifepay-support-2026-05-12.md) как канал общения); добавить `@source` matcher в `Caddyfile` или firewalld-rich-rule. Без явного списка от LifePay — **не делать**, иначе риск порезать боевой трафик. [~] Заблокирован ожиданием ответа поддержки.
- [ ] **Shared-secret или подпись** — если LifePay поддерживает подпись webhook (узнать у поддержки), добавить валидацию в Fastify-обработчик до форварда. [~] Заблокирован ответом поддержки.
- [ ] **Внешний uptime-монитор** — настроить любую бесплатную пробу `/health` (UptimeRobot, BetterStack free). _Готово, когда:_ проба видит сервис как `up`.
- [ ] **Бэкап `.env` и `Caddyfile`** — скопировать в защищённое место (например, в KeePass или в зашифрованный архив у себя на ноутбуке). _Готово, когда:_ копия положена туда, где её можно найти после удаления VDS.

---

## §11. Когда план считается выполненным

Все пункты §0–§8 в статусе `[x]`. Критерии приёмки из [specification §7](./specification.md#7-критерии-приёмки) — все семь пунктов — отмечены пройденными. Боевой платежный webhook с СБП-оплаты долетел до Heap приёмника через прокси.

§9 — справочный, не требует выполнения.

§10 — желательный hardening, но не блокирует «зелёный» статус.

---

## §12. Что после плана (не входит в этот документ)

Полная миграция `Payments Client` с Chatium на VDS — отдельный план; этот прокси становится либо первой версией нового сервиса (если архитектура совпадёт), либо удаляется при переезде вместе с Caddy-конфигом и systemd-unit. Решение фиксируется отдельным ADR в `docs/decisions/`.

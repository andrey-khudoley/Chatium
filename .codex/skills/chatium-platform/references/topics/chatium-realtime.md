# chatium-realtime

> Migrated from `s.chtm.khudoley.pro/.cursor/skills/chatium-realtime/SKILL.md`.
> This is a Codex reference, not an auto-loaded standalone skill. Treat it as a quick topic guide.
> Authoritative documentation: `inner/docs/014-socket.md`. Before implementing, read the relevant `inner/docs/...` file(s) and use CodeGraph for live examples of symbols/routes.

# chatium-realtime

Настраивает real-time обновления через WebSocket в Chatium: sendDataToSocket на сервере, subscribeToData на клиенте. Использовать для live-обновлений UI.

## Когда использовать

- При необходимости обновлять UI без перезагрузки страницы (чат, уведомления, статусы)
- Когда сервер должен инициировать отправку данных клиенту (push-модель)

## Серверная сторона

Импорт и отправка данных в канал:

```ts
import { sendDataToSocket } from '@app/socket'

await sendDataToSocket(ctx, { channel: 'my-channel', data: { ... } })
```

- `channel` — имя канала, на который подписаны клиенты.
- `data` — произвольный объект (сериализуемый в JSON), который получит клиент.

Вызов выполняется в контексте запроса/джоба/хука; `ctx` должен быть валидным.

## Клиентская сторона (Vue / браузер)

Подключение к сокету и подписка на канал:

```ts
import { getOrCreateBrowserSocketClient } from '@app/socket/client'

const socket = getOrCreateBrowserSocketClient()
socket.subscribeToData('my-channel', (data) => {
  // обновить состояние, UI
})
```

- Один клиент на вкладку; каналы разделяют потоки данных.
- В Vue удобно вызывать `getOrCreateBrowserSocketClient()` в `onMounted` и отписываться в `onUnmounted`.

## Паттерны

- Именование каналов: осмысленные, уникальные для фичи (например, `chat:${chatId}`).
- На сервере: вызывать `sendDataToSocket` после изменения данных (создание/обновление записи, смена статуса).
- На клиенте: не держать тяжёлую логику в колбэке; обновлять реактивное состояние (ref/reactive).

## Чеклист

- [ ] Канал задан и согласован между сервером и клиентом
- [ ] Сервер вызывает sendDataToSocket в нужный момент (после изменения данных)
- [ ] Клиент подписывается в onMounted и при необходимости отписывается в onUnmounted
- [ ] Обработка ошибок/переподключения (по документации 014-socket.md)

## Ссылки

- **014-socket.md** — WebSocket API и ограничения платформы Chatium

## Примеры

- `tg/pa_sample/` — realtime в чате (обновление сообщений, статусов)

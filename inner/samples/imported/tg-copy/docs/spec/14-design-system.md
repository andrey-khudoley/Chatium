# 14. Дизайн-система и PWA

Стили задаются инлайн в `index.tsx` (`<style>`-блоки) + Tailwind (CDN) + FontAwesome 6. Темы — через CSS-переменные на `:root` и `[data-theme="dark"]` (переключает `useTheme`).

## Палитра (Telegram-подобная)

Светлая тема (`:root`):
```
--bg-primary:#ffffff  --bg-secondary:#f0f2f5  --bg-tertiary:#e5ddd5  --bg-hover:rgba(0,0,0,.05)
--text-primary:#111b21  --text-secondary:#667781  --text-muted:#8696a0  --text-inverse:#ffffff
--border-color:#d1d7db  --border-light:#e9edef
--bubble-own:#d9fdd3  --bubble-other:#ffffff  --bubble-shadow:0 1px .5px rgba(0,0,0,.13)
--primary-color:#008069  --primary-hover:#005c4b
--c-success:#25d366  --c-danger:#ef4444  --c-warning:#f59e0b  --c-info:#3b82f6
--accent-color:#008069  --accent-light:rgba(0,128,105,.15)
--danger-color:#ef4444  --warning-color:#f59e0b
--role-owner-bg:#fef3c7/text:#92400e  --role-admin-bg:#dbeafe/text:#1e40af  --role-guest-bg:#f3f4f6/text:#6b7280
--shadow-sm/md/lg, --reaction-active:rgba(0,128,105,.15)
```
Тёмная тема (`[data-theme="dark"]`) — аналогичный набор: `--bg-primary:#0E1621`, `--bg-secondary:#17212B`, `--bubble-own:#2B5278`, `--bubble-other:#182533`, `--primary-color:#5CB3F5`, `--text-primary:#e9edef` и т.д.

## Ключевые CSS-классы (воспроизвести из index.tsx)

- Layout: `.chat-view`, `.chat-header`, `.messages-area`, `.input-area`, `.participants-panel`.
- Сообщения: `.message`, `.message-own`, `.message-avatar`, `.message-bubble` (+`.has-files`, `.has-text`), `.message-text`, `.markdown-message` (h1-3/strong/em/code/pre/blockquote/ul/a), `.message-meta`, `.message-time`, `.message-actions`.
- Реакции: `.message-reactions-inline`, `.reaction-chip`(+`.active`), `.reaction-chip-emoji/count`.
- Контекст-меню/эмодзи: `.context-menu`, `.quick-reactions`, `.quick-reaction-btn`, `.emoji-picker-accordion`, `.emoji-categories-tabs`, `.emoji-cat-btn`, `.emoji-picker-grid`, `.emoji-picker-emoji`, `.emoji-picker-input-popup`.
- Модалки/кнопки: `.chat-modal-overlay`, `.chat-modal-content`, `.modal-title`, `.form-group`, `.btn-primary/.btn-secondary/.btn-danger/.btn-warning`, `.btn-send`(+`.active`), `.btn-attach/.btn-emoji/.btn-icon`.
- Файлы/загрузка: `.files-banner`, `.file-item`(+`.uploading`/`.image`), `.upload-overlay`, `.upload-progress-bar/fill`.
- Прочее: `.connection-status`(+`.reconnecting`), `.moderation-notice`, `.role-select`, `.date-divider`, `.system-message`, `.selection-header`/`.selection-btn`/`.message-checkbox`/`.checkbox-circle`, `.ban-screen-full`, `.scroll-to-bottom-btn`, `.chat-pattern-bg` (фоновый паттерн), `.paid-chat-icon`.
- Адаптив: брейкпоинты `1024 / 768 / 480 / 380 / 360` px; на мобильном `.message-actions{display:none}`, контекст-меню по центру, свайп-назад по `.messages-area`.

Размеры — в `rem` (масштабируется через `--ui-scale` + `html{font-size}`).

## Иконки/шрифты

- Иконки: FontAwesome 6.7.2 (`<i class="fas fa-...">`).
- Шрифт: системный `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ...`.
- Аватары без картинки: градиент по `id.charCodeAt(0) % colors.length` + первая буква.
- Единый logo/иконка: `https://fs.chatium.ru/get/image_msk_AaplkedAT7`.

## PWA-манифест (`manifest.json.ts`)

`manifest.json.ts` — отдельный роут-файл (`app.get('/')` → `ctx.resp.json(manifest)`) с заголовками `Content-Type: application/manifest+json; charset=utf-8`, `Cache-Control: public, max-age=3600`. **`start_url`/`scope`/иконки/shortcuts строить через `withProjectRoot(...)`, не хардкод `/tg/`.** Поля:
```json
{
  "name":"Chatium Chat", "short_name":"Chat", "description":"Современный мессенджер...",
  "start_url": withProjectRoot('./'), "scope": withProjectRoot('./'), "display":"standalone", "orientation":"portrait-primary",
  "background_color":"#f0f2f5", "theme_color":"#008069", "lang":"ru", "dir":"ltr",
  "icons":[ /* 72→512, все URL image_msk_AaplkedAT7, type image/png; 512 +purpose:maskable */ ],
  "screenshots":[ {"540x720","form_factor":"narrow"} ],
  "categories":["social","communication"],
  "shortcuts":[ {"name":"Новый чат","short_name":"Чат","url": withProjectRoot('./'),"icons":[192]} ]
}
```

## Подключаемые ресурсы (head index.tsx)

- `/s/static/lib/tailwind.3.4.16.min.js` + `tailwind.config` (colors primary `#008069`, secondary `#005c4b`).
- `/s/static/lib/fontawesome/6.7.2/css/all.min.css`.
- Cropper.js 1.6.1 (CDN, CSS+JS) — для `AvatarCropperModal`.
- Firebase 10.7.1 compat (app+messaging, defer) + `/tg/firebase-config.js`.
- `/s/metric/clarity.js` (аналитика).
- meta: `viewport ... maximum-scale=1, viewport-fit=cover`, `theme-color #008069`, apple-mobile-web-app-*, `<link rel="manifest" href={withProjectRoot(manifestRoute.url())}>` (не хардкод `/tg/manifest.json`).

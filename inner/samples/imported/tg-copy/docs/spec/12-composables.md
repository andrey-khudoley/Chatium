# 12. Composables

9 файлов `composables/*.ts`, все помечены `// @shared` (импортируемы в Vue). Singleton = модульное состояние вне функции.

## useChatSocket(userSocketId)
Надёжный WS с авто-реконнектом. Константы: `RECONNECT_DELAY=3000`, `MAX_RECONNECT_ATTEMPTS=10`, `HEARTBEAT=30000`.
Возвращает `{ socketData: ref, isConnected, isReconnecting, reconnectAttempts, lastError(computed), reconnect() }`.
Внутри: `connect()` — `subscribeToData(userSocketId).listen(data => socketData.value = data)` + heartbeat; `disconnect()`; `scheduleReconnect()` (экспоненциальная задержка, cap 30 c); `startHeartbeat()` (реконнект если >2×HEARTBEAT тишины); слушатели `visibilitychange`/`online`/`offline`. Авто-`connect` в `onMounted`, cleanup в `onUnmounted` (флаг `isDestroyed`).

## useChatAccess()
Проверка доступа к платному чату. `{ accessCheck: ref<{loading,hasAccess,isPaid,reason,plans[],subscription,chat}>, checkAccess(feedId), reset() }`. `checkAccess` → `apiChatSubscriptionCheckAccessRoute({feedId}).run(ctx,{})`; при отсутствии доступа догружает `apiChatPublicInfoRoute({feedId})`. Возвращает boolean.

## useMessageSync(feedIdRef, getCurrentMessages, loadMessagesFn, onNewMessages?)
Догрузка пропущенных сообщений при возврате на вкладку/online. `{ syncState, forceSync(), isPageVisible }`. Сохраняет id последнего при скрытии; при visible/online (через 500ms) и периодически (30 c) → `performSync(afterId)` → `loadMessagesFn({afterId, limit:20})`, фильтрует существующие, `onNewMessages(newMessages, 'sync')`.

## useGlobalAudioPlayer() / useGlobalAudioPlayerSingleton()
Singleton-плеер (модульные refs). `AudioTrack = {id,url,duration,currentTime,messageId,feedId,chatTitle?,senderName?,isOwn?}`; скорости `[1,1.25,1.5,2]`. Возвращает readonly `currentTrack,isPlaying,playbackSpeed,progressPercent,playbackProgress` + `play(track),pause(),togglePlay(),stop(),seekTo(percent),seekRelative(sec),cycleSpeed(),setSpeed(s),close(),updateTrackInfo(partial)`. Один `<audio>` (`initAudioElement`, события timeupdate/ended/error). Использовать через `useGlobalAudioPlayerSingleton()`.

## useFaviconBadge()
Динамический favicon + мигание. Рисует на offscreen canvas 64×64 (иконка + красный кружок с числом, `99+` при >99), пишет в `<link rel=icon>` и `document.title` (`(N) title`). `{ unreadCount, hasUnread, setUnreadCount(n), startBlinking(), stopBlinking(), isBlinking }`. Мигание — интервал 800ms (чередует нормальный/`globalAlpha 0.4`). Восстановление в `onUnmounted`.

## useTheme()
Тема light/dark (singleton, localStorage `chat-theme`, атрибут `data-theme` на `documentElement`). `{ theme, toggleTheme(), setTheme(t), isDark }`. Загрузка в `onMounted`.

## useScale()
Масштаб UI + ширина сайдбара (singleton, localStorage `chat-ui-scale`/`chat-sidebar-width`). Масштаб 50–300%, шаг 25, применяется немедленно при импорте через CSS-переменную `--ui-scale` + `fontSize`. `{ scale, scaleDisplay, sidebarWidth, minScale, maxScale, scaleStep, scaleValues, setScale(n), increaseScale(), decreaseScale(), resetScale(), setSidebarWidth(w) }`. **`setScale` делает `window.location.reload()`**. `setSidebarWidth` clamp 280–600.

## useSmartPosition()
Позиционирование поповеров/меню в пределах viewport. `{ position: ref<Position>, calculatePosition(triggerRect, popupRect, options), calculatePositionFromPoint(x,y,popupRect,offset), updatePosition(triggerEl, popupEl, options) }`. `PositionOptions = {placement:'top'|'bottom'|'left'|'right'|'auto', alignment:'start'|'center'|'end', offset, fallbackPlacements[]}`. Перебор placements → помещающийся, иначе clamp к границам.

## useClientLogger()
Буферизованная отправка логов. Глобальный `pendingLogs[]`, debounce-flush 1 c через `apiClientLogRoute.run(window.ctx, log)`. `{ log(type,message,details), error, info, warn, flush }` (details JSON.stringify, обрезка message 1000/details 5000). Доп. `setupGlobalErrorHandler()` — вешает `window` `error`/`unhandledrejection`.

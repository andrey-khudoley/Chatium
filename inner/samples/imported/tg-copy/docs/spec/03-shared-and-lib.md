# 03. shared / lib / tools

## shared/mentions.ts (`// @shared`, чистые функции)

Формат упоминания в тексте: `@[Имя](userId)`.

```ts
cleanMentionsForPreview(text: string): string
// '' если !text. Заменяет @[Имя](userId) → @Имя:
//   text.replace(/@\[([^\]]+)\]\([^)]+\)/g, '@$1')

extractMentions(text: string): Array<{ name: string; userId: string }>
// [] если !text. regex /@\[([^\]]+)\]\(([^)]+)\)/g, цикл exec →
//   push({ name: m[1], userId: m[2] }). Порядок появления.
```

## shared/permissions.ts (НЕ `// @shared` — импортирует `@app/feed`, серверный)

```ts
type ChatRole = 'owner' | 'admin' | 'guest'
interface PermissionCheckResult { hasPermission, participantRole: ChatRole|null, isOwner, isWorkspaceAdmin }

checkChatPermission(ctx, feedId, userId, requiredRole: ChatRole = 'guest'): Promise<PermissionCheckResult>
// 1. participants = findFeedParticipants(ctx, feedId)
// 2. participant = participants.find(p => p.userId === userId)
// 3. isWorkspaceAdmin = ctx.user?.is('Admin') || ctx.user?.is('Owner') || false
// 4. нет участника → { hasPermission:false, participantRole:null, isOwner:false, isWorkspaceAdmin }
// 5. role = participant.role || 'guest'; isOwner = role==='owner'
// 6. hierarchy = { owner:3, admin:2, guest:1 }
// 7. hasPermission = hierarchy[role] >= hierarchy[requiredRole]

canManageChat(ctx, feedId, userId, isPublic = false): Promise<boolean>
// checkChatPermission(..., 'admin'); если (isPublic && isWorkspaceAdmin) → true; иначе hasPermission

isChatOwner(ctx, feedId, userId, isPublic = false): Promise<boolean>
// checkChatPermission(..., 'owner'); если (isPublic && isWorkspaceAdmin) → true; иначе isOwner
```

## shared/subscription-periods.ts (`// @shared`, чистые функции дат)

```ts
type DurationType = 'days' | 'months' | 'years'
type CalendarPeriodType = 'current' | 'next' | 'specific'
interface PeriodOption { label: string; startDate: Date; endDate: Date; value: string }
```

### Приватные хелперы
- `getLastDayOfMonth(year, month)` → `new Date(year, month+1, 0).getDate()`.
- `generateQuarters(startMonth, durationMonths)` → периоды для `currentYear-1…currentYear+1`. Цикл `for (m=0; m<12; m+=durationMonths)`; включение: `m+1===startMonth || (startMonth-1)%durationMonths === m%durationMonths`. Названия: durationMonths=3 → `{0:'I квартал',1:'II квартал',2:'III квартал',3:'IV квартал'}` по `Math.floor(m/3)`; =6 → `{0:'Первое полугодие',1:'Второе полугодие'}`; fallback `Период <n>`. `endMonth = m + durationMonths - 1`.
- `formatPeriodLabel(startDate, endDate, isCurrent)` — массив месяцев нижним регистром `['январь'…'декабрь']`. Один месяц → `«месяц год»`; один год → `«месяцA - месяцB год»`; иначе `«месяцA годA - месяцB годB»`. `isCurrent` → ` (текущий)`.
- `formatDate(date)` → `toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' })`.

### Экспорты
```ts
generatePeriodOptions(durationType, durationValue, calendarPeriod='current', specificPeriodStart?): PeriodOption[]
```
- **days**: один вариант. `startDate=now`, `endDate=now+durationValue дней`. `label='С DD.MM.YYYY по DD.MM.YYYY'`, `value='immediate'`.
- **months / specific + specificPeriodStart**: `generateQuarters(specificPeriodStart, durationValue)`; `startDate=new Date(y, startMonth, 1)`, `endDate=new Date(y, endMonth+1, 0)` + `setHours(23,59,59,999)`; пропуск прошедших (`endDate<now`); `label='<name> <year> (DD.MM.YYYY - DD.MM.YYYY)[ — текущий]'`, `value='<year>-<startMonth>'`.
- **months обычные**:
  - текущий: `new Date(y, curMonth, 1)` … `new Date(y, curMonth+durationValue, 0)`+endOfDay; добавить, если `end>=now`; `value='current'`, label `formatPeriodLabel(...,true)`.
  - следующий: `new Date(y, curMonth+1, 1)` … `new Date(y, curMonth+1+durationValue, 0)`+endOfDay; всегда; `value='next'`.
- **years**: текущий год `new Date(y,0,1)`…`new Date(y,11,31,23,59,59,999)` (если `end>=now`, `value='current'`, label `'<год> год (текущий)'`); следующий год `value='next'`, `'<год+1> год'`.

```ts
isSubscriptionActive(sub: {status,startDate,endDate}|null): boolean
// false если !sub || status!=='active'; иначе startDate<=now && endDate>=now

isExpiringSoon(sub: {endDate}|null, days=3): boolean
// false если !sub; warningDate=now+days; endDate<=warningDate && endDate>=now

calculatePeriodEnd(durationType, durationValue, startDate): Date
// копия startDate; days→setDate(+v), months→setMonth(+v), years→setFullYear(+v); затем setHours(23,59,59,999)
```

## lib/jwt-rs256.ts (server-only, FCM v1 OAuth2)

При отсутствии `globalThis.navigator` подставляет mock `{ userAgent:'Chatium-Node', platform:'Chatium-Server' }`.
`loadJsrsasign()` — кэширует `KJUR`; качает `jsrsasign-all-min.js` (v10.5.25) c cdnjs через `request({method:'get', responseType:'text'})`, исполняет `new Function(code + '; return KJUR;')()`.

```ts
generateJWT(clientEmail, privateKey): Promise<string>
// header { alg:'RS256', typ:'JWT' }
// payload { iss: clientEmail, scope:'https://www.googleapis.com/auth/firebase.messaging',
//           aud:'https://oauth2.googleapis.com/token', exp: now+3600, iat: now }
// KJUR.jws.JWS.sign('RS256', JSON.stringify(header), JSON.stringify(payload), privateKey)

getAccessToken(jwt): Promise<string>
// POST https://oauth2.googleapis.com/token (x-www-form-urlencoded)
//   grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer & assertion=<jwt>
// statusCode!==200 → throw; иначе response.body.access_token
```

## agent-tools.ts — регистрация тулов

```ts
app.accountHook('@start/agent/tools', async (ctx, params) => {
  return [replyInGroupChat, sendImageToGroupChat]
})
```

## tools/replyInGroupChat.ts

Объявление:
```ts
export const replyInGroupChat = app
  .function('/reply-in-group-chat')
  .meta({ name: 'reply-in-group-chat', description: '...', llmDescription: '<инструкция: использовать только один тул за раз>' })
  .body(s => s.object({
    context: s.object({}),
    input: s.object({
      chatId: s.string().describe('ID чата (feedId)'),
      text: s.string().describe('Текст сообщения'),
      replyToMessageId: s.string().optional(),
    }),
  }))
  .handle(async (ctx, body) => { ... })   // → { ok: boolean, result: string }
```
Алгоритм handle:
1. `{ chatId, text, replyToMessageId } = body.input || {}`; нет chatId/text → `{ ok:false, result:'Необходимо указать chatId и text' }`.
2. `chat = Chats.findOneBy(ctx, { feedId: chatId })`; нет → ошибка «Чат не найден».
3. `chatTableId = typeof chat.id==='object' ? chat.id.id : chat.id`.
4. `agentConfig = ChatAgents.findOneBy(ctx, { chat: chatTableId, isActive: true })`; нет → «Нет активного агента».
5. Если `chat.type==='channel'` — `findFeedParticipants`, найти участника `p.userId===agentConfig.botUserId`; роль не owner/admin → «Агент не имеет прав на публикацию в канале».
6. `createFeedMessage(ctx, chatId, { id: botUserId }, { text, type:'Message', reply_to: replyToMessageId, data: { isAgentMessage:true, agentName, agentId } })`.
7. `botUser = findUserById(ctx, botUserId)`; нормализовать camel/snake поля; добавить `author { id, displayName, firstName, lastName, username, avatar: botUser.imageUrl }`.
8. `broadcastMessageEvent(ctx, chatId, 'new-message', enrichedMessage)` — `findFeedParticipants`, по каждому `sendDataToSocket(ctx, 'user-'+userId, { type:'chat-event', event, feedId, message })`.
9. `{ ok:true, result:'Сообщение успешно отправлено. ID сообщения: <id>' }`; catch → `{ ok:false, result:'Ошибка...: <msg>' }`.

## tools/sendImageToGroupChat.ts

Структура идентична; URL `/send-image-to-group-chat`, name `send-image-to-group-chat`.
```ts
input: s.object({ chatId: s.string(), imageUrl: s.string(), caption: s.string().optional(), replyToMessageId: s.string().optional() })
```
Отличия handle:
- MIME из URL: `fileName = последний сегмент || 'image.webp'`; ext → jpg/jpeg→`image/jpeg`, png→`image/png`, gif→`image/gif`, webp→`image/webp`, default→`image/webp`.
- `createFeedMessage(ctx, chatId, { id: botUserId }, { text: caption||'', type:'Message', reply_to, files:[{ url: imageUrl, name: fileName, mimeType }], data:{ isAgentMessage:true, agentName, agentId, isGeneratedImage:true } })`.
- llmDescription: использовать после `generate-image`, подпись через `caption`, не вызывать дополнительно `replyInGroupChat`.

## sample-usage.ts (необязательный, демонстрация Feed API)

Роут `app.get('/')`, последовательно дёргает `createFeed → getFeedById → getChat → createOrUpdateFeedParticipant → findFeedParticipants → createFeedMessage → findFeedMessages(tail,20) → updateFeedMessage → setFeedPinnedMessage → deleteFeedMessage → deleteFeed`. Можно опустить при воссоздании.

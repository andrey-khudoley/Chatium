import { Heap } from '@app/heap'

/** Персональные настройки пользователя (одна строка на userId). */
export const UserSettings = Heap.Table('t__assistant__user_settings__9Wp2kL', {
  userId: Heap.String({
    customMeta: { title: 'Пользователь' },
    searchable: { langs: ['ru', 'en'], embeddings: false },
  }),
  /** Смещение от UTC в целых часах (например 3 для UTC+3). */
  timezoneOffsetHours: Heap.Number({
    customMeta: { title: 'Часовой пояс (UTC+N часов)' },
  }),
})

export default UserSettings

export type UserSettingsRow = typeof UserSettings.T
export type UserSettingsRowJson = typeof UserSettings.JsonT

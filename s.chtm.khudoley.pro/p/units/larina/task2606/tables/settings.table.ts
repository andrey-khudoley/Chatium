import { Heap } from '@app/heap'

export const Settings = Heap.Table('t__larina__task2606__setting__k4mNpQ', {
  key: Heap.String({
    customMeta: { title: 'Ключ настройки' },
    searchable: { langs: ['ru', 'en'], embeddings: false }
  }),
  value: Heap.Any({
    customMeta: { title: 'Значение' }
  })
})

export default Settings

export type SettingsRow = typeof Settings.T
export type SettingsRowJson = typeof Settings.JsonT

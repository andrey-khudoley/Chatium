import { Heap } from '@app/heap'

// Rebuild Heap registry after project path migration to p/units/yakovleva/pay.
export const Settings = Heap.Table('t__yakovleva-pay__setting__a9Hk2P', {
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

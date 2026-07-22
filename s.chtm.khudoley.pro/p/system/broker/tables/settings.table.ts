import { Heap } from '@app/heap'

/*
  BrokerSettings — операционные настройки брокера, generic key-value (§3.6),
  по образцу p/template_metaproject/core/tables/settings.table.ts. Сейчас
  единственная настройка — log_level (§5.10.8); форма строки заморожена
  тривиально (новая настройка = новая строка, не новое поле).

  Окружение — в сегменте id (`__prod_` здесь): id объявляется ровно в одном
  файле аккаунта; перенос d/→p/ трансформирует сегмент в `__prod_`
  (§3 «Окружения», подробности — modules.table.ts).
*/
const fields = {
  key: Heap.String({ customMeta: { title: 'Имя настройки' } }),
  value: Heap.Any({ customMeta: { title: 'Значение настройки (любая форма)' } })
}

export const BrokerSettings = Heap.Table('t__broker__settings__prod_I7Ozm8', fields, {
  customMeta: {
    title: 'Broker Settings (prod)',
    description: 'Операционные настройки брокера — §3.6'
  }
})

export type BrokerSettingsRow = typeof BrokerSettings.T
export type BrokerSettingsRowJson = typeof BrokerSettings.JsonT

import { Heap } from '@app/heap'
import { IS_PROD } from '../config/env'

/*
  BrokerSettings — операционные настройки брокера, generic key-value (§3.6),
  по образцу p/template_metaproject/core/tables/settings.table.ts. Сейчас
  единственная настройка — log_level (§5.10.8); форма строки заморожена
  тривиально (новая настройка = новая строка, не новое поле).
*/
const fields = {
  key: Heap.String({ customMeta: { title: 'Имя настройки' } }),
  value: Heap.Any({ customMeta: { title: 'Значение настройки (любая форма)' } })
}

const BrokerSettingsStage = Heap.Table('t__broker__settings__stage_I7Ozm8', fields, {
  customMeta: {
    title: 'Broker Settings (stage)',
    description: 'Операционные настройки брокера — §3.6'
  }
})
const BrokerSettingsProd = Heap.Table('t__broker__settings__prod_I7Ozm8', fields, {
  customMeta: {
    title: 'Broker Settings (prod)',
    description: 'Операционные настройки брокера — §3.6'
  }
})

export const BrokerSettings = IS_PROD ? BrokerSettingsProd : BrokerSettingsStage

export type BrokerSettingsRow = typeof BrokerSettingsStage.T
export type BrokerSettingsRowJson = typeof BrokerSettingsStage.JsonT

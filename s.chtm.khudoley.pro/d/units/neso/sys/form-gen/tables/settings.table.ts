import { Heap } from '@app/heap'

/*
  FormGenSettings — key-value настройки подключения GC (§3.2 спеки), по образцу
  BrokerSettings (d/system/broker/tables/settings.table.ts). Волна 1: три записи —
  gc_school_url / gc_school_key / gc_developer_key (config/constants.ts →
  GC_SETTINGS_KEYS). developerKey только сохраняется, кодом волны 1 не читается.

  Окружение — в сегменте id (`__stage_` здесь): id объявляется ровно в одном
  файле аккаунта; перенос d/→p/ трансформирует сегмент в `__prod_`
  (§3.2 спеки «Разделение по окружениям» — записи настроек НЕ переносятся кодом,
  каждое окружение заполняет свою таблицу отдельно через свою админку).
*/
const fields = {
  key: Heap.String({ customMeta: { title: 'Имя настройки' } }),
  value: Heap.Any({ customMeta: { title: 'Значение настройки (любая форма)' } })
}

export const FormGenSettings = Heap.Table('t__form-gen__settings__stage_x2plui', fields, {
  customMeta: {
    title: 'form-gen Settings (stage)',
    description: 'Настройки подключения GC (волна 1) — §3.2 спеки'
  }
})

export type FormGenSettingsRow = typeof FormGenSettings.T
export type FormGenSettingsRowJson = typeof FormGenSettings.JsonT

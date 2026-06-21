// Fork проекта half: уникальные Heap ID отдельно от liveahalf (не делить таблицы между копиями).
import { Heap } from '@app/heap'

export const TPUnitsGoncharovLpHalfSettingsK2r = Heap.Table(
  't_p_units_goncharov_lp_half_settings_k2r',
  {
    key: Heap.Optional(
      Heap.String({ customMeta: { title: 'Ключ' }, searchable: { langs: ['ru', 'en'] } })
    ),
    value: Heap.Optional(Heap.String({ customMeta: { title: 'Значение' } }))
  },
  { customMeta: { title: 'Настройки', description: '' } }
)

export default TPUnitsGoncharovLpHalfSettingsK2r

export type TPUnitsGoncharovLpHalfSettingsK2rRow = typeof TPUnitsGoncharovLpHalfSettingsK2r.T
export type TPUnitsGoncharovLpHalfSettingsK2rRowJson =
  typeof TPUnitsGoncharovLpHalfSettingsK2r.JsonT

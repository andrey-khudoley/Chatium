// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TPUnitsGoncharovLpLiveahalfTPUnitsGoncharovLpLiveahalfSettingsDpR = Heap.Table(
  't_p_units_goncharov_lp_liveahalf_t_p_units_goncharov_lp_liveahalf_settings_DpR',
  {
    key: Heap.Optional(
      Heap.String({ customMeta: { title: 'Ключ' }, searchable: { langs: ['ru', 'en'] } })
    ),
    value: Heap.Optional(Heap.String({ customMeta: { title: 'Значение' } }))
  },
  { customMeta: { title: 'Настройки', description: '' } }
)

export default TPUnitsGoncharovLpLiveahalfTPUnitsGoncharovLpLiveahalfSettingsDpR

export type TPUnitsGoncharovLpLiveahalfTPUnitsGoncharovLpLiveahalfSettingsDpRRow =
  typeof TPUnitsGoncharovLpLiveahalfTPUnitsGoncharovLpLiveahalfSettingsDpR.T
export type TPUnitsGoncharovLpLiveahalfTPUnitsGoncharovLpLiveahalfSettingsDpRRowJson =
  typeof TPUnitsGoncharovLpLiveahalfTPUnitsGoncharovLpLiveahalfSettingsDpR.JsonT

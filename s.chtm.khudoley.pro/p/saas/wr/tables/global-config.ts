// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const GlobalConfig = Heap.Table(
  't_webinar_room_webinar_room_global_config_b1F',
  {
    kinescopeAutowebinarPlayerId: Heap.Optional(Heap.String())
  },
  { customMeta: { title: 'Конфиг вебинарной комнаты' } }
)

export default GlobalConfig

export type GlobalConfigRow = typeof GlobalConfig.T
export type GlobalConfigRowJson = typeof GlobalConfig.JsonT

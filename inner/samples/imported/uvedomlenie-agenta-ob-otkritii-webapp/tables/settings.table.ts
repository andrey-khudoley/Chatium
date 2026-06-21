// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TTemplatesWebappOpenedWebappOpenedSettingsVfU = Heap.Table(
  't_templates_webapp_opened_webapp_opened_settings_mpn',
  {
    agentId: Heap.Optional(Heap.String({ customMeta: { title: 'ID агента' } })),
    agentTitle: Heap.Optional(Heap.String({ customMeta: { title: 'Название агента' } })),
    onlyFirstVisit: Heap.Optional(
      Heap.Boolean({ customMeta: { title: 'Только первое посещение' } })
    ),
    messageTemplate: Heap.Optional(Heap.String({ customMeta: { title: 'Шаблон сообщения' } })),
    wakeAgent: Heap.Optional(Heap.Boolean({ customMeta: { title: 'Разбудить агента' } })),
    channelId: Heap.Optional(Heap.String({ customMeta: { title: 'ID канала сендера' } })),
    channelTitle: Heap.Optional(Heap.String({ customMeta: { title: 'Название канала' } }))
  },
  { customMeta: { title: 'Настройки WebApp Opened', description: 'Настройки WebApp Opened' } }
)

export default TTemplatesWebappOpenedWebappOpenedSettingsVfU

export type TTemplatesWebappOpenedWebappOpenedSettingsVfURow =
  typeof TTemplatesWebappOpenedWebappOpenedSettingsVfU.T
export type TTemplatesWebappOpenedWebappOpenedSettingsVfURowJson =
  typeof TTemplatesWebappOpenedWebappOpenedSettingsVfU.JsonT

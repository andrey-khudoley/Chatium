// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TZoomAgentToolZoomSettingsLDx = Heap.Table(
  't_zoom_agent_tool_zoom_settings_rMv',
  {
    account_id: Heap.Optional(Heap.String({ customMeta: { title: 'Account ID' } })),
    client_id: Heap.Optional(Heap.String({ customMeta: { title: 'Client ID' } })),
    client_secret: Heap.Optional(Heap.String({ customMeta: { title: 'Client Secret' } })),
    secret_token: Heap.Optional(Heap.String({ customMeta: { title: 'Secret Token' } })),
    default_topic: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Тема встречи по умолчанию' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    default_agenda: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Повестка по умолчанию' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    default_auto_recording: Heap.Optional(
      Heap.Enum(
        { enumKey1: 'none', enumKey2: 'local', enumKey3: 'cloud' },
        { customMeta: { title: 'Запись по умолчанию' } }
      )
    ),
    default_timezone: Heap.Optional(
      Heap.String({ customMeta: { title: 'Часовой пояс по умолчанию' } })
    )
  },
  { customMeta: { title: 'Настройки Zoom', description: 'Настройки интеграции с Zoom API' } }
)

// declaration merging: allows using table-related types via default import
export declare namespace TZoomAgentToolZoomSettingsLDx {
  export type T = typeof TZoomAgentToolZoomSettingsLDx.T
  export type JsonT = typeof TZoomAgentToolZoomSettingsLDx.JsonT
  export type PropsT = typeof TZoomAgentToolZoomSettingsLDx.PropsT
  export type PatchT = typeof TZoomAgentToolZoomSettingsLDx.PatchT
  export type CreateInputT = typeof TZoomAgentToolZoomSettingsLDx.CreateInputT
}

export default TZoomAgentToolZoomSettingsLDx

export type TZoomAgentToolZoomSettingsLDxRow = TZoomAgentToolZoomSettingsLDx.T
export type TZoomAgentToolZoomSettingsLDxRowJson = TZoomAgentToolZoomSettingsLDx.JsonT

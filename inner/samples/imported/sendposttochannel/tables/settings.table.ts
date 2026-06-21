// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const SendposttotelegramSettingsPbg = Heap.Table(
  'sendposttotelegram_settings_ZiF_ZiF',
  {
    tgManagerId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID Telegram менеджера', multiline: false } })
    ),
    groupOrChannelId: Heap.Optional(
      Heap.String({ customMeta: { title: 'ID группы или канала', multiline: false } })
    ),
    messageWrapper: Heap.Optional(
      Heap.String({ customMeta: { title: 'Обертка для сообщений', multiline: false } })
    ),
    buttons: Heap.Optional(Heap.Any()),
    disableLinkPreview: Heap.Optional(
      Heap.Boolean({ customMeta: { title: 'Отключить превью ссылок' } })
    )
  },
  { customMeta: { title: 'Настройки тула отправки в Telegram' } }
)

export default SendposttotelegramSettingsPbg

export type SendposttotelegramSettingsPbgRow = typeof SendposttotelegramSettingsPbg.T
export type SendposttotelegramSettingsPbgRowJson = typeof SendposttotelegramSettingsPbg.JsonT

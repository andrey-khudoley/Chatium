// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatVoiceTranscriptionsArQ = Heap.Table(
  't_projekt_chat_voice_transcriptions_Noi',
  {
    fileHash: Heap.Optional(Heap.String({ customMeta: { title: 'Хеш аудиофайла' } })),
    messageId: Heap.Optional(Heap.String({ customMeta: { title: 'ID сообщения' } })),
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    transcription: Heap.Optional(Heap.String({ customMeta: { title: 'Текст транскрибации' } })),
    language: Heap.Optional(Heap.String({ customMeta: { title: 'Язык распознавания' } })),
    status: Heap.Optional(Heap.String({ customMeta: { title: 'Статус' } })),
    errorMessage: Heap.Optional(Heap.String({ customMeta: { title: 'Сообщение об ошибке' } })),
    requestedBy: Heap.Optional(
      Heap.UserRefLink({ customMeta: { title: 'Кто запросил транскрибацию' } })
    )
  },
  { customMeta: { title: 'Транскрибации голосовых сообщений', description: '' } }
)

export default TProjektChatVoiceTranscriptionsArQ

export type TProjektChatVoiceTranscriptionsArQRow = typeof TProjektChatVoiceTranscriptionsArQ.T
export type TProjektChatVoiceTranscriptionsArQRowJson =
  typeof TProjektChatVoiceTranscriptionsArQ.JsonT

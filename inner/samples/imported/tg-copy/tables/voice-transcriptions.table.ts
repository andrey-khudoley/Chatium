// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TProjektChatVoiceTranscriptionsW1K = Heap.Table(
  't_projekt_chat_voice_transcriptions_5IL',
  {
    fileHash: Heap.Optional(Heap.String({ customMeta: { title: 'Хеш аудиофайла' } })),
    messageId: Heap.Optional(Heap.String({ customMeta: { title: 'ID сообщения' } })),
    feedId: Heap.Optional(Heap.String({ customMeta: { title: 'ID чата (feedId)' } })),
    transcription: Heap.Optional(Heap.String({ customMeta: { title: 'Текст транскрибации' } })),
    language: Heap.Optional(Heap.String({ customMeta: { title: 'Язык распознавания' } })),
    status: Heap.Optional(Heap.String({ customMeta: { title: 'Статус' } })),
    errorMessage: Heap.Optional(Heap.String({ customMeta: { title: 'Сообщение об ошибке' } })),
    requestedBy: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Кто запросил транскрибацию' } })),
  },
  { customMeta: { title: 'voice-transcriptions.table.ts', description: '' } },
)

export default TProjektChatVoiceTranscriptionsW1K

export type TProjektChatVoiceTranscriptionsW1KRow = typeof TProjektChatVoiceTranscriptionsW1K.T
export type TProjektChatVoiceTranscriptionsW1KRowJson = typeof TProjektChatVoiceTranscriptionsW1K.JsonT

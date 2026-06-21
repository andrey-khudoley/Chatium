// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TImageVideoGeneratorGenerationsDzg = Heap.Table(
  't_imageVideoGenerator_generations_6yJ',
  {
    userId: Heap.Optional(Heap.UserRefLink({ customMeta: { title: 'Пользователь' } })),
    type: Heap.Optional(Heap.String({ customMeta: { title: 'Тип генерации' } })),
    mode: Heap.Optional(Heap.String({ customMeta: { title: 'Режим генерации' } })),
    model: Heap.Optional(Heap.String({ customMeta: { title: 'Модель генерации' } })),
    prompt: Heap.Optional(Heap.String({ customMeta: { title: 'Промпт для генерации' } })),
    uploadedImageHash: Heap.Optional(
      Heap.String({ customMeta: { title: 'Загруженное изображение (хеш)' } })
    ),
    generatedImageHash: Heap.Optional(
      Heap.String({ customMeta: { title: 'Сгенерированное изображение (хеш)' } })
    ),
    generatedVideoHash: Heap.Optional(
      Heap.String({ customMeta: { title: 'Сгенерированное видео (хеш)' } })
    ),
    status: Heap.Optional(Heap.String({ customMeta: { title: 'Статус' } })),
    error: Heap.Optional(Heap.String({ customMeta: { title: 'Ошибка' } }))
  },
  { customMeta: { title: 'Генерации', description: 'Генерации' } }
)

export default TImageVideoGeneratorGenerationsDzg

export type TImageVideoGeneratorGenerationsDzgRow = typeof TImageVideoGeneratorGenerationsDzg.T
export type TImageVideoGeneratorGenerationsDzgRowJson =
  typeof TImageVideoGeneratorGenerationsDzg.JsonT

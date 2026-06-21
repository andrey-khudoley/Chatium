// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TTestPedikyurQuizLeadsDoG = Heap.Table(
  't_test-pedikyur_quiz_leads_R0q',
  {
    name: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Имя' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    email: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Email' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    phone: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Телефон' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    answers: Heap.Optional(Heap.Any()),
    completedAt: Heap.Optional(
      Heap.DateTime({
        customMeta: { title: 'Дата прохождения' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Лиды с квиза педикюра', description: 'Лиды с квиза педикюра' } }
)

export default TTestPedikyurQuizLeadsDoG

export type TTestPedikyurQuizLeadsDoGRow = typeof TTestPedikyurQuizLeadsDoG.T
export type TTestPedikyurQuizLeadsDoGRowJson = typeof TTestPedikyurQuizLeadsDoG.JsonT

// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TSaasRefProgramPage4Bc8De = Heap.Table(
  't__tg-ref-program__page__4Bc8De',
  {
    campaignId: Heap.Optional(
      Heap.RefLink('t__tg-ref-program__campaign__8Hn4Lx', {
        customMeta: { title: 'Кампания' },
        onDelete: 'none'
      })
    ),
    title: Heap.Optional(Heap.String({ customMeta: { title: 'Название' } })),
    urlTemplate: Heap.Optional(
      Heap.String({
        customMeta: {
          title: 'URL-шаблон',
          description: 'Целевой URL с плейсхолдером {ref}'
        }
      })
    ),
    webhookSecret: Heap.Optional(Heap.String({ customMeta: { title: 'Секрет webhook' } }))
  },
  { customMeta: { title: 'Страницы', description: 'Целевые страницы для трафика' } }
)

export default TSaasRefProgramPage4Bc8De

export type TSaasRefProgramPage4Bc8DeRow = typeof TSaasRefProgramPage4Bc8De.T
export type TSaasRefProgramPage4Bc8DeRowJson = typeof TSaasRefProgramPage4Bc8De.JsonT

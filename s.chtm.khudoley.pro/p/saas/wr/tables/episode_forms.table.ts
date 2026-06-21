import { Heap } from '@app/heap'
import { FormFieldType } from '../shared/enum'

export const EpisodeForms = Heap.Table(
  'webinar-room-episode-forms_nQ2',
  {
    title: Heap.String({ customMeta: { title: 'Заголовок формы' } }),
    subtitle: Heap.Optional(Heap.String({ customMeta: { title: 'Подзаголовок формы' } })),
    buttonText: Heap.String({ customMeta: { title: 'Текст кнопки' } }),
    buttonColor: Heap.Optional(Heap.String({ customMeta: { title: 'Цвет кнопки' } })),
    fields: Heap.Any({ customMeta: { title: 'Поля формы (JSON)' } }),
    submitAction: Heap.String({ customMeta: { title: 'Действие после отправки' } }),
    thankYouTitle: Heap.Optional(Heap.String({ customMeta: { title: 'Заголовок стр. спасибо' } })),
    thankYouText: Heap.Optional(Heap.String({ customMeta: { title: 'Текст стр. спасибо' } })),
    redirectUrl: Heap.Optional(Heap.String({ customMeta: { title: 'URL редиректа' } })),
    paymentAmount: Heap.Optional(Heap.Number({ customMeta: { title: 'Сумма оплаты' } })),
    paymentCurrency: Heap.Optional(Heap.String({ customMeta: { title: 'Валюта оплаты' } })),
    paymentDescription: Heap.Optional(Heap.String({ customMeta: { title: 'Описание оплаты' } })),
    paymentOldPrice: Heap.Optional(
      Heap.Number({ customMeta: { title: 'Старая цена (зачёркнутая)' } })
    ),
    paymentOptions: Heap.Optional(
      Heap.Any({ customMeta: { title: 'Варианты оплаты (массив тарифов)' } })
    ),
    bonuses: Heap.Optional(Heap.Any({ customMeta: { title: 'Бонусы при оплате (массив)' } })),
    legalText: Heap.Optional(Heap.String({ customMeta: { title: 'Юридический текст' } })),
    hintText: Heap.Optional(Heap.String({ customMeta: { title: 'Подсказка под кнопкой' } })),
    paymentProviders: Heap.Optional(
      Heap.Any({ customMeta: { title: 'Доступные платёжные провайдеры (массив slug)' } })
    ),
    sortOrder: Heap.NonRequired(Heap.Number({ customMeta: { title: 'Порядок сортировки' } }), 0)
  },
  {
    customMeta: {
      title: 'Формы эфиров',
      description: 'Переиспользуемые формы, показываемые зрителям во время эфиров'
    }
  }
)

export default EpisodeForms

export type EpisodeFormsRow = typeof EpisodeForms.T

export interface FormField {
  id: string
  type: FormFieldType
  label: string
  placeholder?: string
  required: boolean
}

export interface PaymentOption {
  id: string
  title: string
  description: string
  price: number
  oldPrice?: number
  badge?: string
  badgeColor?: string
}

export interface Bonus {
  icon?: string
  text: string
}

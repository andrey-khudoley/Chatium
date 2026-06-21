// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TAnalitikaLendovTAnalitikaLendovPaymentsPayB79 = Heap.Table(
  't_analitika-lendov_t_analitika-lendov_payments_Pay_1d4',
  {
    lend: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Лендинг (путь без слеша)' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    paymentDate: Heap.Optional(
      Heap.String({ customMeta: { title: 'Дата оплаты' }, searchable: { langs: ['ru', 'en'] } })
    ),
    date: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Дата (для совместимости)' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    amount: Heap.Optional(Heap.Number({ customMeta: { title: 'Сумма оплаты' } })),
    status: Heap.Optional(
      Heap.String({ customMeta: { title: 'Статус оплаты' }, searchable: { langs: ['ru', 'en'] } })
    ),
    utm_source: Heap.Optional(
      Heap.String({ customMeta: { title: 'UTM Source' }, searchable: { langs: ['ru', 'en'] } })
    ),
    utm_medium: Heap.Optional(
      Heap.String({ customMeta: { title: 'UTM Medium' }, searchable: { langs: ['ru', 'en'] } })
    ),
    utm_campaign: Heap.Optional(
      Heap.String({ customMeta: { title: 'UTM Campaign' }, searchable: { langs: ['ru', 'en'] } })
    ),
    utm_term: Heap.Optional(
      Heap.String({ customMeta: { title: 'UTM Term' }, searchable: { langs: ['ru', 'en'] } })
    ),
    utm_content: Heap.Optional(
      Heap.String({ customMeta: { title: 'UTM Content' }, searchable: { langs: ['ru', 'en'] } })
    )
  },
  { customMeta: { title: 'Оплаты', description: 'Оплаты' } }
)

export default TAnalitikaLendovTAnalitikaLendovPaymentsPayB79

export type TAnalitikaLendovTAnalitikaLendovPaymentsPayB79Row =
  typeof TAnalitikaLendovTAnalitikaLendovPaymentsPayB79.T
export type TAnalitikaLendovTAnalitikaLendovPaymentsPayB79RowJson =
  typeof TAnalitikaLendovTAnalitikaLendovPaymentsPayB79.JsonT

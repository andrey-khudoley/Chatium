// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TAnalitikaLendovTAnalitikaLendovOrdersOrdBiO = Heap.Table(
  't_analitika-lendov_t_analitika-lendov_orders_Ord_mr5',
  {
    lend: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Лендинг (путь без слеша)' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    date: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Дата заказа (для совместимости)' },
        searchable: { langs: ['ru', 'en'] }
      })
    ),
    status: Heap.Optional(
      Heap.String({ customMeta: { title: 'Статус заказа' }, searchable: { langs: ['ru', 'en'] } })
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
  { customMeta: { title: 'Заказы', description: 'Заказы' } }
)

export default TAnalitikaLendovTAnalitikaLendovOrdersOrdBiO

export type TAnalitikaLendovTAnalitikaLendovOrdersOrdBiORow =
  typeof TAnalitikaLendovTAnalitikaLendovOrdersOrdBiO.T
export type TAnalitikaLendovTAnalitikaLendovOrdersOrdBiORowJson =
  typeof TAnalitikaLendovTAnalitikaLendovOrdersOrdBiO.JsonT

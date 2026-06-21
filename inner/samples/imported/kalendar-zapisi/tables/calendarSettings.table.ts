// This file is auto-generated via createOrUpdateHeapTableFile API and should not be edited manually
import { Heap } from '@app/heap'

export const TKalendarZapisiTKalendarZapisiCalendarSettingsCjkYcS = Heap.Table(
  't_kalendar-zapisi_t_kalendar-zapisi_calendarSettings_cjk_gr5',
  {
    title: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Название' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    workDaysOfWeek: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Рабочие дни недели (1-7, через запятую)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    workStartTime: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Время начала рабочего дня (HH:MM)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    workEndTime: Heap.Optional(
      Heap.String({
        customMeta: { title: 'Время конца рабочего дня (HH:MM)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    slotDurationMinutes: Heap.Optional(
      Heap.Number({
        customMeta: { title: 'Длительность одного слота (минуты)' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    noticeBeforeMinutes: Heap.Optional(
      Heap.Number({
        customMeta: { title: 'Минимум минут до записи' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    maxDaysAhead: Heap.Optional(
      Heap.Number({
        customMeta: { title: 'Максимум дней вперед для записи' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    ),
    isActive: Heap.Optional(
      Heap.Boolean({
        customMeta: { title: 'Активен' },
        searchable: { langs: ['ru', 'en'], embeddings: true }
      })
    )
  },
  { customMeta: { title: 'Настройки календаря', description: 'Настройки календаря' } }
)

export default TKalendarZapisiTKalendarZapisiCalendarSettingsCjkYcS

export type TKalendarZapisiTKalendarZapisiCalendarSettingsCjkYcSRow =
  typeof TKalendarZapisiTKalendarZapisiCalendarSettingsCjkYcS.T
export type TKalendarZapisiTKalendarZapisiCalendarSettingsCjkYcSRowJson =
  typeof TKalendarZapisiTKalendarZapisiCalendarSettingsCjkYcS.JsonT

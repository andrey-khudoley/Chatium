import { Heap } from '@app/heap'

/**
 * Таблица для хранения конфигурации дашбордов
 * Дашборд - это набор визуальных компонентов поверх датасетов
 * Примечание: поля createdAt и updatedAt добавляются автоматически Heap
 *
 * Структура поля config (JSON):
 * {
 *   "timePeriod"?: string, // опциональный общий период анализа
 *   "components": [
 *     {
 *       "id": string,            // уникальный ID компонента дашборда
 *       "title": string,         // название компонента
 *       "viewType": "counter" | "simple-table", // тип визуализации (счётчик или простая таблица)
 *       "datasetId": string,     // ID датасета, из которого берутся данные
 *       "metric": "UNIQ",        // тип метрики, пока только UNIQ (сумма уникальных значений)
 *       "columns"?: string[],    // (для simple-table) список колонок в порядке отображения
 *       "layout": {              // позиция и размер на сетке дашборда
 *         "x": number,           // координата по горизонтали (в шагах сетки)
 *         "y": number,           // координата по вертикали (в шагах сетки)
 *         "w": number,           // ширина в шагах сетки
 *         "h": number            // высота в шагах сетки
 *       }
 *     }
 *   ]
 * }
 */
export const AnalyticsDashboards = Heap.Table('analytics_dashboards_c9d3e4f5', {
  name: Heap.String({
    customMeta: { title: 'Название дашборда' }
  }),
  description: Heap.String({
    customMeta: { title: 'Описание дашборда' }
  }),
  config: Heap.String({
    customMeta: { title: 'JSON конфигурация компонентов дашборда' }
  })
})

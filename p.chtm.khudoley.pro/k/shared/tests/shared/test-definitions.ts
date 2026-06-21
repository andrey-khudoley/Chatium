// @shared
// Единый источник истины для всех тестов проекта

export const TEST_CATEGORIES = [
  {
    name: 'routing',
    title: 'Тесты маршрутизации',
    icon: 'fa-route',
    tests: [
      { name: 'index_route', description: 'Проверка URL страницы списка документов (/list)' },
      { name: 'view_route', description: 'Проверка URL страницы просмотра' },
      { name: 'edit_route', description: 'Проверка URL страницы редактирования' },
      { name: 'create_route', description: 'Проверка URL страницы создания' },
      { name: 'query_params', description: 'Проверка query параметров в URL' },
    ]
  },
  {
    name: 'api',
    title: 'Тесты API endpoints',
    icon: 'fa-code',
    tests: [
      { name: 'list_docs', description: 'GET /api/docs/list - получение списка документов' },
      { name: 'get_doc', description: 'GET /api/docs/get - получение документа' },
      { name: 'put_doc', description: 'POST /api/docs/put - создание/обновление документа' },
      { name: 'delete_doc', description: 'POST /api/docs/delete - удаление документа' },
      { name: 'http_list_docs', description: 'HTTP GET /api/docs/list - доступность endpoint' },
    ]
  },
  {
    name: 'functional',
    title: 'Функциональные тесты',
    icon: 'fa-cogs',
    tests: [
      { name: 'filename_transformation', description: 'Трансформация filename ↔ fullKey' },
      { name: 'prefix_handling', description: 'Автоматическое добавление префикса' },
      { name: 'document_filtering', description: 'Фильтрация пустых документов' },
    ]
  },
  {
    name: 'selection',
    title: 'Тесты множественного выбора',
    icon: 'fa-check-square',
    tests: [
      { name: 'select_single', description: 'Выбор одного документа через checkbox' },
      { name: 'select_all', description: 'Выбор всех документов' },
      { name: 'select_range', description: 'Выбор диапазона через Shift' },
      { name: 'deselect', description: 'Снятие выбора' },
      { name: 'delete_selected', description: 'Удаление выбранных документов' },
    ]
  },
  {
    name: 'integration',
    title: 'Интеграционные тесты',
    icon: 'fa-network-wired',
    tests: [
      { name: 'full_document_flow', description: 'Полный цикл: создание → просмотр → удаление' },
      { name: 'multiple_docs_operations', description: 'Операции с несколькими документами' },
      { name: 'upload_and_list', description: 'Загрузка файла и проверка в списке' },
    ]
  },
  {
    name: 'ui',
    title: 'Тесты UI и взаимодействия',
    icon: 'fa-desktop',
    tests: [
      { name: 'table_header_visibility', description: 'Шапка таблицы скрыта когда нет документов' },
      { name: 'selection_on_link_click', description: 'Клик на ссылку не вызывает выделение' },
    ]
  },
  {
    name: 'instructions',
    title: 'Тесты парсинга инструкций',
    icon: 'fa-at',
    tests: [
      { name: 'parse_single', description: 'Парсинг одной инструкции @shared' },
      { name: 'parse_multiple', description: 'Парсинг нескольких инструкций' },
      { name: 'no_instructions', description: 'Документ без инструкций' },
      { name: 'strip_instructions', description: 'Удаление строки инструкций' },
      { name: 'list_shared_only', description: 'API возвращает только @shared документы' },
    ]
  }
]


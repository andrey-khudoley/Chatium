// @shared
// Единый источник истины для всех тестов проекта Storage

export const TEST_CATEGORIES = [
  {
    name: 'database',
    title: 'Тесты базы данных (Heap Table)',
    icon: 'fa-database',
    tests: [
      { name: 'table_exists', description: 'Проверка существования таблицы ScriptsTable' },
      { name: 'create_script', description: 'Создание нового скрипта' },
      { name: 'create_style', description: 'Создание нового стиля' },
      { name: 'find_by_name', description: 'Поиск скрипта по имени' },
      { name: 'update_script', description: 'Обновление скрипта' },
      { name: 'delete_script', description: 'Удаление скрипта' }
    ]
  },
  {
    name: 'api',
    title: 'Тесты API endpoints',
    icon: 'fa-code',
    tests: [
      { name: 'get_scripts_list', description: 'GET /api/scripts/list' },
      { name: 'create_script_api', description: 'POST /api/scripts/create' },
      { name: 'update_script_api', description: 'POST /api/scripts/update' },
      { name: 'delete_script_api', description: 'POST /api/scripts/delete' },
      { name: 'get_by_id', description: 'GET /api/scripts/get/:id' },
      { name: 'upload_js_file', description: 'POST /api/scripts/upload (загрузка .js)' },
      { name: 'upload_css_file', description: 'POST /api/scripts/upload (загрузка .css)' },
      { name: 'upload_invalid_file', description: 'POST /api/scripts/upload (неподдерживаемый формат)' }
    ]
  },
  {
    name: 'serve',
    title: 'Тесты отдачи контента',
    icon: 'fa-globe',
    tests: [
      { name: 'serve_js', description: 'Отдача JavaScript файла' },
      { name: 'serve_css', description: 'Отдача CSS файла' },
      { name: 'serve_not_found', description: 'Проверка текста для несуществующего файла' }
    ]
  },
  {
    name: 'functional',
    title: 'Функциональные тесты',
    icon: 'fa-cogs',
    tests: [
      { name: 'unique_name', description: 'Проверка уникальности имени' },
      { name: 'url_generation', description: 'Генерация URL для скрипта' }
    ]
  },
  {
    name: 'integration',
    title: 'Интеграционные тесты',
    icon: 'fa-network-wired',
    tests: [
      { name: 'full_flow_script', description: 'Полный цикл: создание → отдача → удаление (JS)' },
      { name: 'full_flow_style', description: 'Полный цикл: создание → отдача → удаление (CSS)' },
      { name: 'update_flow', description: 'Цикл обновления: создание → обновление → проверка' }
    ]
  },
  {
    name: 'cleanup',
    title: 'Тесты очистки',
    icon: 'fa-broom',
    tests: [
      { name: 'cleanup_test_records', description: 'Удаление test- записей после тестов' }
    ]
  }
]


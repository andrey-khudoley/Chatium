// @shared

export const TEST_CATEGORIES = [
  {
    name: 'database',
    title: 'Тесты базы данных (Heap Tables)',
    icon: 'fa-database',
    tests: [
      {
        name: 'settings_table_exists',
        description: 'Проверка существования таблицы AnalyticsSettings'
      },
      { name: 'create_setting', description: 'Создание настройки' },
      { name: 'find_settings', description: 'Поиск настроек' },
      { name: 'update_setting', description: 'Обновление настройки через createOrUpdateBy' },
      {
        name: 'active_jobs_table_exists',
        description: 'Проверка существования таблицы ActiveJobs'
      },
      { name: 'active_jobs_crud', description: 'CRUD операции для таблицы ActiveJobs' }
    ]
  },
  {
    name: 'api',
    title: 'Тесты API endpoints',
    icon: 'fa-code',
    tests: [
      { name: 'get_settings_list', description: 'GET /api/settings/list' },
      { name: 'update_setting', description: 'POST /api/settings/update' },
      { name: 'delete_setting', description: 'POST /api/settings/delete' },
      { name: 'get_event_filter', description: 'GET /api/settings/event-filter' },
      { name: 'save_event_filter', description: 'POST /api/settings/event-filter' },
      {
        name: 'stop_all_jobs',
        description: 'POST /api/settings/stop-all-jobs - остановка всех джобов'
      },
      { name: 'get_events_list', description: 'GET /api/events/list с пагинацией' },
      {
        name: 'get_event_details',
        description: 'POST /api/events/details - получение деталей события'
      },
      {
        name: 'search_events',
        description: 'POST /api/events/search - поиск событий по всем полям'
      },
      { name: 'utm_params_in_events', description: 'Проверка наличия UTM-меток в HTTP событиях' },
      { name: 'password_hash', description: 'POST /api/password-hash - хеширование пароля' },
      {
        name: 'telegram_oauth_url',
        description: 'GET /api/telegram/oauth-url - получение URL авторизации Telegram'
      },
      {
        name: 'monitoring_api_direct',
        description: 'Прямое тестирование API мониторинга: start/stop/status'
      }
    ]
  },
  {
    name: 'functional',
    title: 'Функциональные тесты',
    icon: 'fa-cogs',
    tests: [
      {
        name: 'settings_crud_flow',
        description: 'Полный цикл: создание, чтение, обновление настройки'
      },
      {
        name: 'monitoring_start_stop',
        description: 'Запуск и остановка мониторинга с отменой jobs'
      },
      {
        name: 'event_filter_flow',
        description: 'Фильтрация событий: сохранение, загрузка, применение фильтра'
      },
      {
        name: 'events_deduplication',
        description: 'Дедупликация событий с одинаковым URL и временем'
      },
      { name: 'event_filter_autosave', description: 'Автосохранение фильтра событий при выборе' },
      { name: 'parse_url_params', description: 'Парсинг параметров из URL (между ? и #)' },
      {
        name: 'verify_build_filter_conditions',
        description: 'Тестирование buildEventFilterConditions: различные типы фильтров'
      },
      {
        name: 'verify_deduplicate_events_edge_cases',
        description: 'Edge cases для deduplicateEvents: пустой массив, дубликаты, уникальные'
      }
    ]
  },
  {
    name: 'integration',
    title: 'Интеграционные тесты',
    icon: 'fa-network-wired',
    tests: [
      { name: 'full_flow', description: 'Полный цикл работы системы' },
      {
        name: 'page_content_check',
        description: 'Проверка содержимого страниц (заголовки, описания)'
      },
      {
        name: 'events_page_modal_functionality',
        description: 'Проверка функциональности модального окна на странице событий'
      },
      {
        name: 'events_page_filter_button',
        description: 'Проверка наличия кнопки "настроить" на странице событий'
      },
      {
        name: 'events_page_filter_modal',
        description: 'Проверка модального окна с фильтром событий на странице /events'
      },
      {
        name: 'settings_page_no_filter_block',
        description: 'Проверка отсутствия блока "Фильтр событий" на странице /settings'
      },
      {
        name: 'header_events_link',
        description: 'Проверка наличия ссылки на /events в Header между темой и настройками'
      },
      { name: 'header_component_exists', description: 'Проверка существования компонента Header' },
      { name: 'footer_component_exists', description: 'Проверка существования компонента Footer' },
      { name: 'license_page_exists', description: 'Проверка существования страницы лицензии' },
      {
        name: 'project_name_setting',
        description: 'Проверка функции получения названия проекта из настроек'
      }
    ]
  },
  {
    name: 'getcourse',
    title: 'Тесты аналитики событий GetCourse',
    icon: 'fa-graduation-cap',
    tests: [
      {
        name: 'install_plugin',
        description: 'POST /api/install-plugin - установка плагина GetCourse MCP Server'
      },
      {
        name: 'get_orders',
        description: 'GET /api/getcourse/orders - получение событий заказов из ClickHouse'
      },
      {
        name: 'get_orders_stats',
        description: 'GET /api/getcourse/orders-stats - статистика заказов из событий ClickHouse'
      },
      {
        name: 'get_users',
        description: 'GET /api/getcourse/users - регистрация пользователей из событий ClickHouse'
      },
      {
        name: 'get_telegram_users',
        description: 'GET /api/getcourse/telegram-users - статистика Telegram из событий ClickHouse'
      },
      {
        name: 'get_payments_by_date',
        description: 'GET /api/getcourse/payments-by-date - оплаты по дням из событий ClickHouse'
      },
      {
        name: 'get_groups',
        description: 'GET /api/getcourse/groups - группы пользователей из событий ClickHouse'
      }
    ]
  },
  {
    name: 'authorization',
    title: 'Тесты авторизации',
    icon: 'fa-shield-alt',
    tests: [
      {
        name: 'pages_require_admin',
        description: 'Проверка требования роли Admin на всех страницах'
      },
      {
        name: 'api_require_admin',
        description: 'Проверка требования роли Admin на всех API endpoints'
      },
      { name: 'login_page_exists', description: 'Проверка существования кастомной страницы входа' },
      {
        name: 'auth_components_exist',
        description: 'Проверка существования компонентов авторизации'
      },
      { name: 'auth_sdk_exists', description: 'Проверка существования SDK авторизации' }
    ]
  },
  {
    name: 'datasets',
    title: 'Тесты датасетов',
    icon: 'fa-database',
    tests: [
      {
        name: 'datasets_table_exists',
        description: 'Проверка существования таблицы AnalyticsDatasets'
      },
      { name: 'create_dataset', description: 'Создание нового датасета' },
      { name: 'get_dataset', description: 'GET /api/datasets/:id - получение датасета по ID' },
      {
        name: 'get_datasets_list',
        description: 'GET /api/datasets/list - получение списка датасетов'
      },
      {
        name: 'update_dataset',
        description: 'POST /api/datasets/update/:id - обновление датасета'
      },
      {
        name: 'update_dataset_by_id',
        description: 'POST /api/datasets/update - обновление датасета (клиентский вариант)'
      },
      { name: 'delete_dataset', description: 'POST /api/datasets/delete/:id - удаление датасета' },
      {
        name: 'delete_dataset_ready',
        description: 'POST /api/datasets/delete-ready - подтверждение готовности клиента'
      },
      {
        name: 'dataset_config_page_exists',
        description: 'Проверка существования страницы конфигурации датасета'
      },
      {
        name: 'dataset_config_page_url_prop',
        description: 'Проверка передачи URL страницы конфигурации в компонент'
      },
      {
        name: 'dataset_component_structure',
        description: 'Проверка структуры компонента датасета'
      },
      { name: 'dataset_row_layout', description: 'Название датасета не ломает таблицу' },
      {
        name: 'dataset_cache_table_exists',
        description: 'Проверка существования таблицы AnalyticsDatasetCache'
      },
      {
        name: 'dataset_cache_delete_on_component_removal',
        description: 'Удаление кэша при удалении компонента'
      },
      {
        name: 'dataset_cache_delete_on_dataset_deletion',
        description: 'Удаление кэша при удалении датасета'
      },
      {
        name: 'dataset_component_counts',
        description:
          'GET /api/datasets/component-counts/:datasetId - получение количества записей по компонентам'
      },
      {
        name: 'dataset_utm_filters',
        description: 'Проверка фильтров по UTM параметрам в компонентах датасета'
      },
      {
        name: 'dataset_cache_params_field',
        description: 'Проверка сохранения всех параметров из URL в поле params'
      },
      {
        name: 'dataset_cascading_conditions',
        description:
          'Проверка каскадных условий: каждый следующий компонент включает условия предыдущих'
      }
    ]
  },
  {
    name: 'dashboards',
    title: 'Тесты дашбордов',
    icon: 'fa-th-large',
    tests: [
      {
        name: 'dashboards_table_exists',
        description: 'Проверка существования таблицы AnalyticsDashboards'
      },
      { name: 'create_dashboard', description: 'Создание нового дашборда' },
      { name: 'get_dashboard', description: 'Получение дашборда по ID' },
      { name: 'get_dashboards_list', description: 'Получение списка дашбордов' },
      { name: 'update_dashboard', description: 'Обновление дашборда' },
      {
        name: 'update_dashboard_by_id',
        description: 'POST /api/dashboards/update - обновление дашборда (клиентский вариант)'
      },
      { name: 'delete_dashboard', description: 'Удаление дашборда' },
      {
        name: 'delete_dashboard_by_id',
        description: 'POST /api/dashboards/delete - удаление дашборда (клиентский вариант)'
      },
      {
        name: 'dashboard_config_page_exists',
        description: 'Проверка существования страницы конфигурации дашборда'
      },
      {
        name: 'dashboard_component_structure',
        description: 'Проверка структуры компонента дашборда'
      },
      {
        name: 'dashboard_row_layout',
        description: 'Список дашбордов отображается на главной странице'
      },
      {
        name: 'dashboard_view_page_exists',
        description: 'Проверка существования страницы просмотра дашборда'
      },
      {
        name: 'dashboard_data_query_builder',
        description: 'Проверка существования типов для дашбордов (логика обработки данных удалена)'
      },
      {
        name: 'dashboard_simple_table_component',
        description:
          'Проверка структуры конфигурации компонента \"Простая таблица\" (сериализация JSON)'
      },
      {
        name: 'dashboard_pivot_table_component',
        description:
          'Проверка структуры конфигурации компонента \"Сводная таблица\" (сериализация JSON)'
      },
      {
        name: 'dashboard_pivot_table_api',
        description: 'Проверка констант PIVOT_ATTRIBUTION_FIELDS (API endpoint удалён)'
      }
    ]
  }
]

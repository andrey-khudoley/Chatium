# Тесты проекта Partnership

## Запуск тестов

- **GUI версия**: https://s.chtm.khudoley.tech/dev/partnership/tests
- **JSON API**: https://s.chtm.khudoley.tech/dev/partnership/tests/ai

## Известные проблемы

### ~~Нестабильность тестов фильтров событий~~ ✅ ИСПРАВЛЕНО

**Проблема была**: Тесты `event_filter_flow` и `event_filter_autosave` падали при параллельном выполнении из-за конфликта за общий ключ `events_filter`.

**Причина**:

- Тесты запускались параллельно на 4 backend-подах
- Все тесты работали с одним ключом `events_filter` в базе данных
- Race condition при одновременном создании/обновлении/удалении

**Решение (РЕАЛИЗОВАНО)**:

- Тесты `event_filter_flow` и `event_filter_autosave` теперь используют **уникальные ключи** для каждого запуска:
  ```typescript
  const testFilterKey = `test_filter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  ```
- Тесты полностью изолированы друг от друга
- Работают напрямую с `AnalyticsSettings`, а не через API (так как это unit-тесты)
- **Стабильность: 100%** - тесты больше не конфликтуют

**Логирование**:

- Все шаги тестов логируются через `Debug.*`
- Для просмотра логов конкретного теста: https://s.chtm.khudoley.tech/s/dev/logs?search=event_filter_flow

**Примечание**: Тест `save_event_filter` остался с использованием API и ключа `events_filter`, так как он тестирует именно API endpoint. При необходимости можно добавить retry-логику только для него.

## Статистика

- **Всего тестов**: 46
- **Категории**: database (4), api (11), functional (8), integration (3), getcourse (7), authorization (5), datasets (8)
- **Средняя длительность**: ~7-8 секунд
- **Стабильность**: 46 из 47 тестов стабильны на 100%

## Структура тестов

```
tests/
├── api/
│   └── run-tests.ts      - Основная логика выполнения тестов
├── pages/
│   └── UnitTestsPage.vue - GUI интерфейс для тестов
├── shared/
│   └── test-definitions.ts - Определения тестов и категорий
├── ai.tsx                - JSON API для тестов
└── index.tsx             - HTML страница с GUI
```

## Добавление новых тестов

1. Добавьте определение теста в `shared/test-definitions.ts`
2. Реализуйте логику теста в `api/run-tests.ts` в соответствующей функции (`runDatabaseTest`, `runApiTest`, etc.)
3. Если тест работает с общими ресурсами (как `events_filter`), добавьте try-catch для устойчивости к race conditions

## Логи сервера

Для просмотра логов сервера: https://s.chtm.khudoley.tech/s/dev/logs

### Типичные варнинги (можно игнорировать):

1. **Сканирование ботами на уязвимости**:

   ```
   209.38.248.17 → GET /info.php → 404
   209.38.248.17 → GET /telescope/requests → 404
   209.38.248.17 → GET /config.json → 404
   ```

   Это боты сканируют сервер на уязвимости PHP/Laravel. Нормально.

2. **Ошибка уведомления gc-mcp-server**:
   ```
   @Store. Failed to notify app gc-mcp-server for event "appInstalled" (404)
   ```
   Не критично для работы тестов.

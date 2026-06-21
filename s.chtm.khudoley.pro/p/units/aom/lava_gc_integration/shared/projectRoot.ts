// @shared
/**
 * Корень проекта в workspace (сегмент пути URL).
 * Вынесено из `config/routes.tsx`, чтобы страницы Vue импортировали только эту константу —
 * иначе при импорте всего `routes` сборщик может подтянуть серверные API-файлы (например `payment-link` с `.body`).
 */
export const PROJECT_ROOT = 'p/units/aom/lava_gc_integration' as const

# Workspace s.chtm.khudoley.pro

Синхронизированное дерево приложений Chatium и вспомогательных каталогов (`p/`, `inner/` и др.).

Корневой `tsconfig.json` проверяет только выбранные каталоги (`inner/` без `inner/samples/`, `zoom-agent-tool/`, общие `types/*.d.ts`, `vue-global.d.ts`); каталоги `p/`, `.deprecated/`, `.cursor/` и сэмплы исключены, чтобы не подтягивать дублирующие Vue/JSX-shim из множества приложений. Для отдельного приложения в `p/` используйте его собственный `tsconfig.json`.

## Скрипты в корневом `package.json`

- **`npm run typings`** — генерация деклараций в `.typings` (см. скрипт в `package.json`).
- **`npm run ts-lint:touched -- <пути>`** — проверка типов только для `tsconfig.json`, которые соответствуют переданным файлам/каталогам (ближайший конфиг при подъёме к корню репозитория). Скрипт: `scripts/lint-types-touched.sh`. Это основной режим для агентов при работе в одном приложении; см. `.cursor/rules/ts-lint.mdc`.
- **`npm run ts-lint`** — полная последовательная проверка для всех `tsconfig.json` из git-индекса с учётом `.gitignore`, за исключением `node_modules/` и `.typings/`. Скрипт: `scripts/lint-types-workspace.sh`. Использовать при явном запросе полного прогона или см. правило `ts-lint.mdc`.

Подробнее о тестах и проверках: `inner/docs/020-testing.md`. Требования к обязательному прогону TypeScript для агентов: `.cursor/rules/ts-lint.mdc`.

## Cursor: команды чата для этого воркспэйса

Файлы в `.cursor/commands/` (имя файла без `.md` = команда с `/`) подхватываются Cursor в списке slash-команд при открытом этом репозитории. Сейчас: `/pipeline`, `/check`, `/toprod-assistant`, `/pp` (параллельный пайплайн в Multitask — см. текст в `pp.md`).
